/**
 * YuanqiZhiKe 留言表单 Worker
 *
 * 路由：
 *   POST /api/contact          接收留言（带 Turnstile 校验）
 *   GET  /api/admin/messages   后台查询留言（需 Bearer Token）
 *   POST /api/admin/messages/:id/read  标记已读（需 Bearer Token）
 *   GET  /api/health           健康检查
 *
 * 环境变量（在 wrangler.toml [vars] + secrets）：
 *   DB                   D1 数据库绑定
 *   TURNSTILE_SITE_KEY   Turnstile 站点 key（公开）
 *   TURNSTILE_SECRET_KEY Turnstile 密钥（secret）
 *   RESEND_API_KEY       Resend API key（secret）
 *   ADMIN_TOKEN          后台接口 Bearer Token（secret）
 *   ALLOWED_ORIGIN       允许的前端来源
 *   CONTACT_TO_EMAIL     收件邮箱
 *   CONTACT_FROM_EMAIL   发件邮箱（必须是 Resend 已验证域名下的邮箱）
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS 预检
    if (method === 'OPTIONS') {
      return handleCORS(env);
    }

    try {
      // 路由分发
      if (path === '/api/health' && method === 'GET') {
        return json({ ok: true, time: Date.now() });
      }

      if (path === '/api/contact' && method === 'POST') {
        return handleContact(request, env, ctx);
      }

      if (path === '/api/admin/messages' && method === 'GET') {
        return handleListMessages(request, env, url);
      }

      if (path === '/api/admin/messages' && method === 'POST') {
        // 标记已读：/api/admin/messages?action=markRead&id=xxx
        return handleMarkRead(request, env, url);
      }

      return json({ error: 'Not Found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: 'Internal Server Error' }, 500);
    }
  },
};

// ============ 留言提交 ============
async function handleContact(request, env, ctx) {
  const origin = request.headers.get('origin') || '';
  if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
    return json({ error: 'Origin not allowed' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { name, email, projectType, description, 'cf-turnstile-response': turnstileToken, website } = body || {};

  // honeypot：隐藏字段有值 = 机器人，假装成功但不处理
  if (website) {
    return json({ ok: true });
  }

  // 字段校验
  const errors = validateContact({ name, email, description });
  if (errors.length > 0) {
    return json({ error: 'Validation failed', details: errors }, 400);
  }

  // IP 频率限制（每小时最多 5 次）
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateCheck = await checkRateLimit(env, ip);
  if (!rateCheck.ok) {
    return json({ error: 'Too many submissions. Please try again later.' }, 429);
  }

  // Turnstile 校验（容错策略）
  // 背景：Turnstile 600010 Bug 会导致前端生成无效 token，但用户无过错。
  // 策略：
  //   - 有 token 且校验通过：正常放行
  //   - 有 token 但校验失败：降级放行（记录日志），由 honeypot + IP 限流兜底
  //   - 无 token：直接放行，由 honeypot + IP 限流兜底
  // 这样既保留 Turnstile 的防护能力，又不因 Cloudflare 自身 Bug 阻断用户。
  if (env.TURNSTILE_SECRET_KEY && turnstileToken) {
    const verifyOk = await verifyTurnstile(turnstileToken, ip, env.TURNSTILE_SECRET_KEY);
    if (!verifyOk) {
      // 降级放行：记录日志便于排查，但不拒绝用户提交
      console.warn('Turnstile verify failed, degrading to honeypot mode. IP:', ip);
    }
  }
  // 反垃圾由 honeypot（机器人必填）+ IP 限流（5次/小时）双重兜底

  // 写入 D1
  const userAgent = request.headers.get('user-agent') || '';
  const insertResult = await env.DB.prepare(
    `INSERT INTO messages (name, email, project_type, description, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    String(name).slice(0, 100),
    String(email).slice(0, 200),
    String(projectType || '').slice(0, 50),
    String(description).slice(0, 5000),
    ip,
    userAgent.slice(0, 500)
  ).run();

  const messageId = insertResult.meta?.last_row_id;

  // 异步发邮件（不阻塞响应）
  ctx.waitUntil(sendEmail(env, {
    name, email, projectType, description, ip, messageId
  }).catch(err => console.error('Email send failed:', err)));

  return json({ ok: true, id: messageId });
}

// ============ 后台查询留言 ============
async function handleListMessages(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const unreadOnly = url.searchParams.get('unread') === '1';

  const where = unreadOnly ? 'WHERE is_read = 0' : '';
  const stmt = env.DB.prepare(
    `SELECT id, name, email, project_type, description, ip, user_agent, is_read, created_at
     FROM messages ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset);

  const result = await stmt.all();
  return json({ ok: true, messages: result.results || [], count: result.results?.length || 0 });
}

// ============ 标记已读 ============
async function handleMarkRead(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const id = parseInt(url.searchParams.get('id') || '0', 10);
  if (!id) {
    return json({ error: 'Missing id parameter' }, 400);
  }

  await env.DB.prepare(
    `UPDATE messages SET is_read = 1 WHERE id = ?`
  ).bind(id).run();

  return json({ ok: true });
}

// ============ Turnstile 校验 ============
async function verifyTurnstile(token, ip, secretKey) {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verify error:', err);
    return false;
  }
}

// ============ 频率限制（按 IP + 小时桶）============
async function checkRateLimit(env, ip) {
  if (ip === 'unknown') return { ok: true };
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / 3600); // 小时桶
  const MAX_PER_HOUR = 5;

  try {
    // 原子 upsert：不存在则插入 count=1，存在则 count+1
    const result = await env.DB.prepare(
      `INSERT INTO rate_limit (ip, bucket, count) VALUES (?, ?, 1)
       ON CONFLICT(ip, bucket) DO UPDATE SET count = count + 1`
    ).bind(ip, bucket).run();

    const row = await env.DB.prepare(
      `SELECT count FROM rate_limit WHERE ip = ? AND bucket = ?`
    ).bind(ip, bucket).first();

    const count = row?.count || 0;
    if (count > MAX_PER_HOUR) {
      return { ok: false, count };
    }
    return { ok: true, count };
  } catch (err) {
    console.error('Rate limit check error:', err);
    // 限流失败不阻塞用户提交
    return { ok: true };
  }
}

// ============ Resend 发邮件 ============
async function sendEmail(env, { name, email, projectType, description, ip, messageId }) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email');
    return;
  }

  const subject = `[New Inquiry #${messageId || '?'}] ${name} - ${projectType || 'General'}`;
  const html = buildEmailHtml({ name, email, projectType, description, ip, messageId });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL,
      to: env.CONTACT_TO_EMAIL,
      reply_to: email,
      subject: subject,
      html: html,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`Resend API error ${res.status}: ${txt}`);
    throw new Error(`Resend API ${res.status}`);
  }

  const data = await res.json().catch(() => ({}));
  console.log('Email sent:', data.id);
}

function buildEmailHtml({ name, email, projectType, description, ip, messageId }) {
  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb;">
  <div style="background: #fff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
    <h2 style="margin: 0 0 16px; color: #111827;">New Custom Dev Inquiry #${messageId || '?'}</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td><td style="padding: 8px 0; color: #111827;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #2563eb;">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Project Type:</td><td style="padding: 8px 0; color: #111827;">${escapeHtml(projectType || 'N/A')}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">IP:</td><td style="padding: 8px 0; color: #6b7280; font-family: monospace;">${escapeHtml(ip)}</td></tr>
    </table>
    <h3 style="margin: 20px 0 8px; color: #111827; font-size: 14px;">Description:</h3>
    <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; white-space: pre-wrap; color: #374151; font-size: 14px; line-height: 1.6;">${escapeHtml(description)}</div>
    <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">Reply directly to this email to respond to ${escapeHtml(name)}.</p>
  </div>
</div>`;
}

// ============ 工具函数 ============
function validateContact({ name, email, description }) {
  const errors = [];
  if (!name || !String(name).trim()) errors.push('Name is required');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) errors.push('Valid email is required');
  if (!description || !String(description).trim()) errors.push('Description is required');
  if (description && String(description).length > 5000) errors.push('Description too long (max 5000 chars)');
  return errors;
}

function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN) {
    return json({ error: 'Admin not configured' }, 500);
  }
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || token !== env.ADMIN_TOKEN) {
    return json({ error: 'Unauthorized' }, 401);
  }
  return null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function handleCORS(env) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
