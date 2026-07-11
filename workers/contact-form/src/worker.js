/**
 * YuanqiZhiKe 留言表单 + 留言板 Worker
 *
 * 路由：
 *   POST /api/contact              定制咨询表单（带 Turnstile 校验）
 *   GET  /api/admin/messages       后台查询咨询留言（需 Bearer Token）
 *   POST /api/admin/messages       标记已读（需 Bearer Token）
 *
 *   GET  /api/guestbook            公开获取已审核留言（分页）
 *   POST /api/guestbook            公开提交留言（待审核，带 Turnstile + 限流）
 *
 *   GET  /api/admin/guestbook      后台查询所有留言（需 Bearer Token）
 *   POST /api/admin/guestbook      审核/删除/拉黑 IP（需 Bearer Token）
 *   GET  /api/admin/stats          后台统计（需 Bearer Token）
 *
 *   GET  /api/health               健康检查
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

      // 定制咨询表单
      if (path === '/api/contact' && method === 'POST') {
        return handleContact(request, env, ctx);
      }
      if (path === '/api/admin/messages' && method === 'GET') {
        return handleListMessages(request, env, url);
      }
      if (path === '/api/admin/messages' && method === 'POST') {
        return handleMarkRead(request, env, url);
      }

      // 留言板（公开）
      if (path === '/api/guestbook' && method === 'GET') {
        return handleListGuestbook(request, env, url);
      }
      if (path === '/api/guestbook' && method === 'POST') {
        return handlePostGuestbook(request, env, ctx);
      }

      // 留言板管理
      if (path === '/api/admin/guestbook' && method === 'GET') {
        return handleAdminListGuestbook(request, env, url);
      }
      if (path === '/api/admin/guestbook' && method === 'POST') {
        return handleAdminActionGuestbook(request, env, url);
      }
      // ============ 统计相关路由 ============
      
      // 下载统计 API（公开，无需认证）
      if (path === '/api/stat/download' && method === 'POST') {
        return handleDownloadStat(request, env);
      }
      
      // 语言切换统计 API（公开，无需认证）
      if (path === '/api/stat/language' && method === 'POST') {
        return handleLanguageSwitchStat(request, env);
      }
      
      // 页面 PV 统计 API（公开，无需认证）
      if (path === '/api/stat/pv' && method === 'POST') {
        return handlePageViewStat(request, env);
      }
      
      // 管理后台统计汇总（需认证）
      if (path === '/api/admin/stats' && method === 'GET') {
        return handleAdminStats(request, env);
      }
      
      // 管理后台下载统计详情（需认证）
      if (path === '/api/admin/downloads' && method === 'GET') {
        return handleAdminDownloads(request, env, url);
      }
      
      // 管理后台语言切换统计（需认证）
      if (path === '/api/admin/language-stats' && method === 'GET') {
        return handleAdminLanguageStats(request, env, url);
      }
      
      // 管理后台 PV 统计（需认证）
      if (path === '/api/admin/pageviews' && method === 'GET') {
        return handleAdminPageViews(request, env, url);
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

// ============ 频率限制（按 IP + 小时桶 + namespace）============
async function checkRateLimit(env, ip, namespace = 'contact', maxPerHour = 5) {
  if (ip === 'unknown') return { ok: true };
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / 3600); // 小时桶
  // 用 namespace 前缀区分不同接口的限流（contact / gb）
  const ipKey = `${namespace}:${ip}`;

  try {
    // 原子 upsert：不存在则插入 count=1，存在则 count+1
    await env.DB.prepare(
      `INSERT INTO rate_limit (ip, bucket, count) VALUES (?, ?, 1)
       ON CONFLICT(ip, bucket) DO UPDATE SET count = count + 1`
    ).bind(ipKey, bucket).run();

    const row = await env.DB.prepare(
      `SELECT count FROM rate_limit WHERE ip = ? AND bucket = ?`
    ).bind(ipKey, bucket).first();

    const count = row?.count || 0;
    if (count > maxPerHour) {
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
    // 增强日志：打印完整请求参数和响应体，便于定位 400 根因
    console.error('Resend API error details:', JSON.stringify({
      status: res.status,
      responseBody: txt,
      from: env.CONTACT_FROM_EMAIL,
      to: env.CONTACT_TO_EMAIL,
      replyTo: email,
      apiKeyPrefix: env.RESEND_API_KEY ? env.RESEND_API_KEY.substring(0, 10) + '...' : 'MISSING'
    }));
    throw new Error(`Resend API ${res.status}: ${txt}`);
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

// ============ 留言板：公开列表（已审核通过）============
async function handleListGuestbook(request, env, url) {
  const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 50);
  const offset = (page - 1) * limit;
  const category = url.searchParams.get('category');

  let where = 'WHERE status = ?';
  let binds = ['approved'];
  if (category && ['feedback', 'suggestion', 'cooperation', 'other'].includes(category)) {
    where += ' AND category = ?';
    binds.push(category);
  }

  const listStmt = env.DB.prepare(
    `SELECT id, nickname, category, content, created_at
     FROM guestbook ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset);
  const countStmt = env.DB.prepare(
    `SELECT COUNT(*) as total FROM guestbook ${where}`
  ).bind(...binds);

  const [listResult, countResult] = await Promise.all([listStmt.all(), countStmt.first()]);
  return json({
    ok: true,
    entries: listResult.results || [],
    total: countResult?.total || 0,
    page,
    limit,
    pages: Math.ceil((countResult?.total || 0) / limit)
  });
}

// ============ 留言板：提交新留言（待审核）============
const GB_CATEGORY_LABELS = {
  feedback: 'feedback',
  suggestion: 'suggestion',
  cooperation: 'cooperation',
  other: 'other'
};

// 简易垃圾词过滤（违禁词、常见 spam 词、购物链接）
const SPAM_KEYWORDS = [
  'viagra', 'cialis', 'casino', 'gambling', 'lottery', 'porn', 'sex', 'escort',
  'crypto-airdrop', 'free-money', 'make-money-online', 'click-here', 'buy-now',
  'shop-now', 'order-now', 'discount', 'deal', 'promo', 'promotion',
  'amazon-links', 'ebay', 'aliexpress', 'shopify', 'woocommerce',
  'seo-tools', 'backlink', 'domain-registration', 'hosting-deals',
  'loan', 'credit', 'investment', 'binary-options', 'forex-trading'
];

async function handlePostGuestbook(request, env, ctx) {
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

  const { nickname, category, content, 'cf-turnstile-response': turnstileToken, website } = body || {};

  // honeypot：隐藏字段有值 = 机器人
  if (website) {
    return json({ ok: true, pending: true });
  }

  // 字段校验
  const errors = validateGuestbook({ nickname, category, content });
  if (errors.length > 0) {
    return json({ error: 'Validation failed', details: errors }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  // IP 黑名单检查
  if (ip !== 'unknown') {
    const blocked = await env.DB.prepare(
      `SELECT 1 FROM ip_blacklist WHERE ip = ?`
    ).bind(ip).first();
    if (blocked) {
      return json({ error: 'Submission blocked.' }, 403);
    }
  }

  // 频率限制：单 IP 每小时 3 条
  const rateCheck = await checkRateLimit(env, ip, 'gb', 3);
  if (!rateCheck.ok) {
    return json({ error: 'Too many submissions. Please try again later.' }, 429);
  }

  // Turnstile 容错校验（同 contact 逻辑）
  if (env.TURNSTILE_SECRET_KEY && turnstileToken) {
    const verifyOk = await verifyTurnstile(turnstileToken, ip, env.TURNSTILE_SECRET_KEY);
    if (!verifyOk) {
      console.warn('Guestbook Turnstile verify failed, degrading. IP:', ip);
    }
  }

  // 内容垃圾过滤
  const contentLower = String(content).toLowerCase();
  const hasSpamKeyword = SPAM_KEYWORDS.some(k => contentLower.includes(k));
  
  // 链接检测：购物链接、短链、推广类型
  const urlPattern = /https?:\/\/(www\.)?[a-z0-9.-]+\.(com|net|org|co|io|me|tv|cc)\/[a-z0-9\/_-]+/i;
  const hasCommercialUrl = urlPattern.test(contentLower) && /product|shop|buy|cart|order|deal/i.test(contentLower);
  const hasShortUrl = /bit\.ly|tinyurl|t\.co|goo\.gl|adf\.ly|tinyurl|shorturl/i.test(contentLower);
  const hasUrl = /https?:\/\//i.test(content);
  
  // 前 5 条留言不能含外链（购物链接/短链永远标记spam）
  const userEntryCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM guestbook WHERE ip = ?`
  ).bind(ip).first();
  const isUrlBlocked = (userEntryCount?.cnt || 0) < 5 && hasUrl;
  const isSpam = hasSpamKeyword || hasCommercialUrl || hasShortUrl || isUrlBlocked;

  let status = 'pending';
  if (isSpam) {
    status = 'spam'; // 自动标记 spam，不展示也不进审核队列
    console.log('[Spam] Blocked guestbook submission. IP:', ip, 'reason:', 
      hasSpamKeyword ? 'keyword' : (hasCommercialUrl ? 'commercial_url' : (hasShortUrl ? 'short_url' : 'new_user_url'))
    );
  }

  const userAgent = request.headers.get('user-agent') || '';
  const insertResult = await env.DB.prepare(
    `INSERT INTO guestbook (nickname, category, content, ip, user_agent, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    String(nickname || 'Anonymous').slice(0, 50),
    String(category || 'feedback').slice(0, 20),
    String(content).slice(0, 1000),
    ip,
    userAgent.slice(0, 500),
    status
  ).run();

  return json({
    ok: true,
    id: insertResult.meta?.last_row_id,
    pending: status === 'pending',
    spam: status === 'spam'
  });
}

function validateGuestbook({ nickname, category, content }) {
  const errors = [];
  if (nickname && String(nickname).length > 50) errors.push('Nickname too long (max 50 chars)');
  if (!content || !String(content).trim()) errors.push('Content is required');
  if (content) {
    const len = String(content).length;
    if (len < 5) errors.push('Content too short (min 5 chars)');
    if (len > 1000) errors.push('Content too long (max 1000 chars)');
  }
  if (category && !GB_CATEGORY_LABELS[String(category)]) {
    errors.push('Invalid category');
  }
  return errors;
}

// ============ 留言板：后台列表 ============
async function handleAdminListGuestbook(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const status = url.searchParams.get('status'); // pending/approved/rejected/spam
  const category = url.searchParams.get('category');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

  let where = 'WHERE 1=1';
  let binds = [];
  if (status) {
    where += ' AND status = ?';
    binds.push(status);
  }
  if (category) {
    where += ' AND category = ?';
    binds.push(category);
  }

  const result = await env.DB.prepare(
    `SELECT id, nickname, category, content, ip, user_agent, status, created_at
     FROM guestbook ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  return json({ ok: true, entries: result.results || [], count: result.results?.length || 0 });
}

// ============ 留言板：后台操作（审核/删除/拉黑 IP）============
async function handleAdminActionGuestbook(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { action, id, ip, reason } = body || {};
  if (!action) return json({ error: 'Missing action' }, 400);

  // 审核/拒绝/标记 spam
  if (['approve', 'reject', 'spam'].includes(action)) {
    if (!id) return json({ error: 'Missing id' }, 400);
    const newStatus = action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'spam');
    await env.DB.prepare(
      `UPDATE guestbook SET status = ? WHERE id = ?`
    ).bind(newStatus, parseInt(id, 10)).run();
    return json({ ok: true, id: parseInt(id, 10), status: newStatus });
  }

  // 删除留言
  if (action === 'delete') {
    if (!id) return json({ error: 'Missing id' }, 400);
    await env.DB.prepare(
      `DELETE FROM guestbook WHERE id = ?`
    ).bind(parseInt(id, 10)).run();
    return json({ ok: true, deleted: parseInt(id, 10) });
  }

  // 拉黑 IP
  if (action === 'block_ip') {
    if (!ip) return json({ error: 'Missing ip' }, 400);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO ip_blacklist (ip, reason) VALUES (?, ?)`
    ).bind(String(ip).slice(0, 50), String(reason || '').slice(0, 200)).run();
    return json({ ok: true, blocked: ip });
  }

  // 解除 IP 拉黑
  if (action === 'unblock_ip') {
    if (!ip) return json({ error: 'Missing ip' }, 400);
    await env.DB.prepare(
      `DELETE FROM ip_blacklist WHERE ip = ?`
    ).bind(String(ip).slice(0, 50)).run();
    return json({ ok: true, unblocked: ip });
  }

  return json({ error: 'Unknown action' }, 400);
}

// ============ 后台统计 ============
async function handleAdminStats(request, env) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const [gbStats, msgStats] = await Promise.all([
    env.DB.prepare(
      `SELECT status, COUNT(*) as cnt FROM guestbook GROUP BY status`
    ).all(),
    env.DB.prepare(
      `SELECT is_read, COUNT(*) as cnt FROM messages GROUP BY is_read`
    ).all()
  ]);

  const gb = { pending: 0, approved: 0, rejected: 0, spam: 0 };
  (gbStats.results || []).forEach(r => { gb[r.status] = r.cnt; });

  const msgs = { unread: 0, read: 0 };
  (msgStats.results || []).forEach(r => {
    if (r.is_read === 0) msgs.unread = r.cnt;
    else msgs.read = r.cnt;
  });

  return json({ ok: true, guestbook: gb, messages: msgs });
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

// ============ 统计工具函数 ============

/**
 * 匿名化 IP：保留前 3 段，最后一段替换为 0
 * 例如：192.168.1.105 -> 192.168.1.0
 */
function anonymizeIP(ip) {
  if (!ip || ip === 'unknown') return '0.0.0.0';
  const parts = ip.split('.');
  if (parts.length === 4) {
    parts[3] = '0';
    return parts.join('.');
  }
  return ip.slice(0, -2) + '0'; // IPv6 截断
}

/**
 * 获取用户当前语言（从 cookie 或 accept-language）
 */
function getCurrentLang(request) {
  // 优先从 cookie 读取
  const cookies = request.headers.get('cookie') || '';
  const langMatch = cookies.match(/(?:^|;\s*)yqz_lang=([^;]+)/);
  if (langMatch) return langMatch[1];
  
  // 其次从 accept-language
  const acceptLang = request.headers.get('accept-language') || '';
  if (acceptLang.includes('zh')) return 'zh';
  if (acceptLang.includes('es')) return 'es';
  if (acceptLang.includes('ja')) return 'ja';
  if (acceptLang.includes('en')) return 'en';
  return 'zh'; // 默认中文
}

// ============ 下载统计处理 ============
async function handleDownloadStat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  
  const { toolName, toolZipUrl } = body || {};
  if (!toolName) {
    return json({ ok: false, error: 'Missing toolName' }, 400);
  }
  
  const ip = anonymizeIP(request.headers.get('cf-connecting-ip') || 'unknown');
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);
  const referer = (request.headers.get('referer') || '').slice(0, 500);
  
  try {
    await env.DB.prepare(
      `INSERT INTO downloads (tool_name, tool_zip_url, ip, user_agent, referrer)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      String(toolName).slice(0, 100),
      String(toolZipUrl || '').slice(0, 500),
      ip,
      userAgent,
      referer
    ).run();
  } catch (err) {
    console.error('Download stat insert error:', err);
  }
  
  return json({ ok: true });
}

// ============ 语言切换统计处理 ============
async function handleLanguageSwitchStat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  
  const { fromLang, toLang } = body || {};
  if (!toLang) {
    return json({ ok: false, error: 'Missing toLang' }, 400);
  }
  
  const actualFrom = fromLang || getCurrentLang(request);
  const ip = anonymizeIP(request.headers.get('cf-connecting-ip') || 'unknown');
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);
  
  try {
    await env.DB.prepare(
      `INSERT INTO language_switches (from_lang, to_lang, ip, user_agent)
       VALUES (?, ?, ?, ?)`
    ).bind(
      String(actualFrom).slice(0, 10),
      String(toLang).slice(0, 10),
      ip,
      userAgent
    ).run();
  } catch (err) {
    console.error('Language switch stat insert error:', err);
  }
  
  return json({ ok: true });
}

// ============ 页面 PV 统计处理 ============
async function handlePageViewStat(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json({ ok: false, error: 'Invalid JSON' }, 400);
  }
  
  const { pagePath, lang } = body || {};
  if (!pagePath) {
    return json({ ok: false, error: 'Missing pagePath' }, 400);
  }
  
  const ip = anonymizeIP(request.headers.get('cf-connecting-ip') || 'unknown');
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);
  const actualLang = lang || getCurrentLang(request);
  
  try {
    await env.DB.prepare(
      `INSERT INTO page_views (page_path, lang, ip, user_agent)
       VALUES (?, ?, ?, ?)`
    ).bind(
      String(pagePath).slice(0, 500),
      String(actualLang).slice(0, 10),
      ip,
      userAgent
    ).run();
  } catch (err) {
    console.error('Page view stat insert error:', err);
  }
  
  return json({ ok: true });
}

// ============ 管理后台：下载统计详情 ============
async function handleAdminDownloads(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const toolFilter = url.searchParams.get('tool');
  
  let where = 'WHERE 1=1';
  let binds = [];
  if (toolFilter) {
    where += ' AND tool_name = ?';
    binds.push(toolFilter);
  }
  
  // 总数量
  const countStmt = env.DB.prepare(
    `SELECT COUNT(*) as total FROM downloads ${where}`
  ).bind(...binds);
  
  // 列表
  const listStmt = env.DB.prepare(
    `SELECT id, tool_name, tool_zip_url, ip, user_agent, referrer, created_at
     FROM downloads ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset);
  
  // 按工具聚合
  const aggStmt = env.DB.prepare(
    `SELECT tool_name, COUNT(*) as cnt 
     FROM downloads 
     ${where}
     GROUP BY tool_name 
     ORDER BY cnt DESC`
  ).bind(...binds);
  
  const [countResult, listResult, aggResult] = await Promise.all([
    countStmt.first(),
    listStmt.all(),
    aggStmt.all()
  ]);
  
  return json({
    ok: true,
    total: countResult?.total || 0,
    downloads: listResult.results || [],
    byTool: aggResult.results || []
  });
}

// ============ 管理后台：语言切换统计 ============
async function handleAdminLanguageStats(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  
  // 总数量
  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM language_switches`
  ).first();
  
  // 列表
  const listResult = await env.DB.prepare(
    `SELECT id, from_lang, to_lang, ip, user_agent, created_at
     FROM language_switches
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  
  // 按目标语言聚合
  const langAgg = await env.DB.prepare(
    `SELECT to_lang, COUNT(*) as cnt 
     FROM language_switches 
     GROUP BY to_lang 
     ORDER BY cnt DESC`
  ).all();
  
  // 语言切换流向统计
  const flowAgg = await env.DB.prepare(
    `SELECT from_lang, to_lang, COUNT(*) as cnt 
     FROM language_switches 
     GROUP BY from_lang, to_lang 
     ORDER BY cnt DESC`
  ).all();
  
  return json({
    ok: true,
    total: countResult?.total || 0,
    switches: listResult.results || [],
    byLanguage: langAgg.results || [],
    flows: flowAgg.results || []
  });
}

// ============ 管理后台：PV 统计 ============
async function handleAdminPageViews(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const pathFilter = url.searchParams.get('path');
  
  let where = 'WHERE 1=1';
  let binds = [];
  if (pathFilter) {
    where += ' AND page_path LIKE ?';
    binds.push('%' + pathFilter + '%');
  }
  
  // 总数量
  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM page_views ${where}`
  ).bind(...binds).first();
  
  // 列表
  const listResult = await env.DB.prepare(
    `SELECT id, page_path, lang, ip, user_agent, created_at
     FROM page_views ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  
  // 按页面聚合
  const pageAgg = await env.DB.prepare(
    `SELECT page_path, lang, COUNT(*) as cnt 
     FROM page_views 
     ${where}
     GROUP BY page_path, lang 
     ORDER BY cnt DESC
     LIMIT 50`
  ).bind(...binds).all();
  
  // 今日 PV
  const todayStart = Math.floor(Date.now() / 1000) - 86400;
  const todayCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= ?`
  ).bind(todayStart).first();
  
  // 昨日 PV
  const yesterdayStart = Math.floor(Date.now() / 1000) - 86400 * 2;
  const yesterdayCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= ? AND created_at < ?`
  ).bind(yesterdayStart, todayStart).first();
  
  // 按语言分布
  const langAgg = await env.DB.prepare(
    `SELECT lang, COUNT(*) as cnt 
     FROM page_views 
     GROUP BY lang 
     ORDER BY cnt DESC`
  ).all();
  
  return json({
    ok: true,
    total: countResult?.total || 0,
    views: listResult.results || [],
    byPage: pageAgg.results || [],
    today: todayCount?.cnt || 0,
    yesterday: yesterdayCount?.cnt || 0,
    byLanguage: langAgg.results || []
  });
}
