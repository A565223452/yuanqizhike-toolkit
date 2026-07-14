/**
 * YuanqiZhiKe Toolkit - Pages _worker.js 统一入口
 *
 * 路由：
 *   /api/*                                →  API 路由（见下方）
 *   其他所有路径                           →  env.ASSETS.fetch 静态托管兜底
 *                                          → 若静态返回 404，自动写入 not_found_log
 *
 * API 路由：
 *   POST /api/contact              定制咨询表单（Turnstile + 限流）
 *   GET  /api/guestbook            公开已审核留言（分页）
 *   POST /api/guestbook            公开提交留言（待审核）
 *   POST /api/stat/download        下载统计写入
 *   POST /api/stat/pv              PV 统计写入
 *   POST /api/stat/language        语言切换统计写入
 *
 *   管理接口（Authorization: Bearer ADMIN_TOKEN）：
 *   GET  /api/admin/stats          顶部 Guestbook/Messages 汇总
 *   GET  /api/admin/guestbook      留言列表 + 分页 / POST 动作
 *   GET  /api/admin/messages       定制咨询列表 + 分页 / POST 标记已读
 *   GET  /api/admin/downloads      下载统计详情
 *   GET  /api/admin/pageviews      PV 统计详情
 *   GET  /api/admin/language-stats 语言切换统计详情
 *   GET  /api/admin/ops            运维看板：Rate Limit 状态 + 404 日志
 *   POST /api/admin/ops            运维动作：清理 rate_limit / 清理 404 历史
 *   GET  /api/health               健康检查
 *
 * 环境变量（Cloudflare Pages Secrets / vars）：
 *   DB                    D1 数据库 binding（名字 = DB）
 *   TURNSTILE_SECRET_KEY  Turnstile 密钥（secret）
 *   RESEND_API_KEY        Resend API 密钥（secret，可选）
 *   ADMIN_TOKEN           后台 Bearer Token（secret）
 *   ALLOWED_ORIGIN        逗号分隔的允许来源（可选）
 *   CONTACT_FROM_EMAIL    Resend 发件邮箱（可选）
 *   CONTACT_TO_EMAIL      收件邮箱（可选）
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') return handleCORS(request, env);

    try {
      // ============ API 路由 ============
      if (path.startsWith('/api/')) {
        if (path === '/api/health' && method === 'GET') {
          return json({ ok: true, time: Date.now() });
        }
        if (path === '/api/contact' && method === 'POST') {
          return handleContact(request, env, ctx);
        }
        if (path === '/api/admin/messages' && method === 'GET') return handleListMessages(request, env, url);
        if (path === '/api/admin/messages' && method === 'POST') return handleMarkRead(request, env, url);

        if (path === '/api/guestbook' && method === 'GET') return handleListGuestbook(request, env, url);
        if (path === '/api/guestbook' && method === 'POST') return handlePostGuestbook(request, env, ctx);

        if (path === '/api/admin/guestbook' && method === 'GET') return handleAdminListGuestbook(request, env, url);
        if (path === '/api/admin/guestbook' && method === 'POST') return handleAdminActionGuestbook(request, env, url);

        if (path === '/api/stat/download' && method === 'POST') return handleDownloadStat(request, env);
        if (path === '/api/stat/language' && method === 'POST') return handleLanguageSwitchStat(request, env);
        if (path === '/api/stat/pv' && method === 'POST') return handlePageViewStat(request, env);

        if (path === '/api/admin/stats' && method === 'GET') return handleAdminStats(request, env);
        if (path === '/api/admin/downloads' && method === 'GET') return handleAdminDownloads(request, env, url);
        if (path === '/api/admin/language-stats' && method === 'GET') return handleAdminLanguageStats(request, env, url);
        if (path === '/api/admin/pageviews' && method === 'GET') return handleAdminPageViews(request, env, url);

        // 本次新增：运维看板接口
        if (path === '/api/admin/ops' && method === 'GET') return handleAdminOps(request, env, url);
        if (path === '/api/admin/ops' && method === 'POST') return handleAdminOpsAction(request, env, ctx);

        return json({ error: 'API Not Found' }, 404);
      }

      // ============ 静态托管兜底（404 自动入库）============
      const staticResp = await env.ASSETS.fetch(request);
      if (staticResp && staticResp.status === 404) {
        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
        const ua = (request.headers.get('user-agent') || '').slice(0, 500);
        const referer = (request.headers.get('referer') || '').slice(0, 500);
        // 异步写，不阻塞响应
        ctx.waitUntil(insertNotFound(env, {
          path: (path + url.search).slice(0, 500),
          method,
          ip: anonymizeIP(ip),
          ua,
          referer
        }).catch(err => console.error('not_found insert failed:', err)));
      }

      // 保留原响应头 + 安全头
      const headers = new Headers(staticResp?.headers || {});
      headers.set('X-Frame-Options', 'DENY');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      headers.set('Access-Control-Allow-Origin', '*');

      return new Response(staticResp.body, {
        status: staticResp?.status || 200,
        statusText: staticResp?.statusText,
        headers
      });
    } catch (err) {
      console.error('_worker.js fatal error:', err);
      return json({ error: 'Internal Server Error' }, 500);
    }
  },
};

// ============ 新增：404 日志写入 ============
async function insertNotFound(env, { path, method, ip, ua, referer }) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      `INSERT INTO not_found_log (path, method, ip, user_agent, referer) VALUES (?, ?, ?, ?, ?)`
    ).bind(path.slice(0, 500), String(method || 'GET').slice(0, 10), ip, ua.slice(0, 500), referer.slice(0, 500)).run();
  } catch (_) { /* schema 不存在就静默失败 */ }
}

// ============ 新增：/api/admin/ops GET ============
async function handleAdminOps(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  const todayStart = Math.floor(Date.now() / 1000) - 86400;

  let rlCount = { total: 0 }, rlTop = [];
  let nfToday = 0, nfTotal = 0, nfTop = [], nfRecent = [];

  try {
    rlCount = (await env.DB.prepare(`SELECT COUNT(*) as total FROM rate_limit`).first()) || { total: 0 };
    rlTop = (await env.DB.prepare(
      `SELECT ip, bucket, count FROM rate_limit ORDER BY count DESC LIMIT 20`
    ).all()).results || [];
  } catch (_) {}

  try {
    const nfTotRow = await env.DB.prepare(`SELECT COUNT(*) as total FROM not_found_log`).first();
    nfTotal = nfTotRow?.total || 0;
    const nfTdyRow = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM not_found_log WHERE created_at >= ?`
    ).bind(todayStart).first();
    nfToday = nfTdyRow?.cnt || 0;
    nfTop = (await env.DB.prepare(
      `SELECT path, COUNT(*) as cnt FROM not_found_log GROUP BY path ORDER BY cnt DESC LIMIT 30`
    ).all()).results || [];
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    nfRecent = (await env.DB.prepare(
      `SELECT id, path, method, ip, user_agent, referer, created_at
       FROM not_found_log ORDER BY created_at DESC LIMIT ?`
    ).bind(limit).all()).results || [];
  } catch (_) {}

  return json({
    ok: true,
    rateLimit: {
      total: rlCount.total || 0,
      top: rlTop.map(r => {
        const [ns, realIp] = String(r.ip).includes(':') ? r.ip.split(/^([^:]+):(.*)$/).slice(1) : ['', r.ip];
        return {
          namespace: ns || 'default',
          ip: realIp || r.ip,
          bucket: r.bucket,
          bucket_time: new Date(r.bucket * 3600 * 1000).toISOString().slice(0, 16),
          count: r.count
        };
      })
    },
    notFound: {
      today: nfToday,
      total: nfTotal,
      topPaths: nfTop,
      recent: nfRecent
    }
  });
}

// ============ 新增：/api/admin/ops POST（清理动作）============
async function handleAdminOpsAction(request, env, ctx) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;

  let body;
  try { body = await request.json(); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
  const action = body?.action;
  if (!action) return json({ error: 'Missing action' }, 400);

  let result = {};
  try {
    if (action === 'clear_rate_limit') {
      const r = await env.DB.prepare(`DELETE FROM rate_limit`).run();
      result = { deleted: r.meta?.rows_written || 0 };
    } else if (action === 'clear_404_old') {
      const cutoff = Math.floor(Date.now() / 1000) - 7 * 86400;
      const r = await env.DB.prepare(`DELETE FROM not_found_log WHERE created_at < ?`).bind(cutoff).run();
      result = { deleted_old_7d: r.meta?.rows_written || 0 };
    } else if (action === 'clear_404_all') {
      const r = await env.DB.prepare(`DELETE FROM not_found_log`).run();
      result = { deleted_all: r.meta?.rows_written || 0 };
    } else if (action === 'cleanup_all') {
      const rlR = await env.DB.prepare(`DELETE FROM rate_limit`).run();
      const cutoff = Math.floor(Date.now() / 1000) - 7 * 86400;
      const nfR = await env.DB.prepare(`DELETE FROM not_found_log WHERE created_at < ?`).bind(cutoff).run();
      const pvR = await env.DB.prepare(`DELETE FROM page_views WHERE created_at < ?`).bind(Math.floor(Date.now() / 1000) - 90 * 86400).run();
      const dlR = await env.DB.prepare(`DELETE FROM downloads WHERE created_at < ?`).bind(Math.floor(Date.now() / 1000) - 90 * 86400).run();
      result = {
        rate_limit: rlR.meta?.rows_written || 0,
        not_found_old_7d: nfR.meta?.rows_written || 0,
        pv_older_90d: pvR.meta?.rows_written || 0,
        downloads_older_90d: dlR.meta?.rows_written || 0,
      };
    } else {
      return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    console.error('ops action failed:', err);
    return json({ error: 'DB error: ' + err.message }, 500);
  }

  ctx.waitUntil(cleanupRateLimit(env));
  return json({ ok: true, action, result });
}

// ============ 来源校验 ============
const DEFAULT_ALLOWED_ORIGINS = [
  'https://yuanqizhike.com',
  'https://www.yuanqizhike.com',
  'https://yuanqizhike-toolkit.pages.dev'
];
function isOriginAllowed(env, origin) {
  if (!origin) return false;
  let list = DEFAULT_ALLOWED_ORIGINS;
  if (env.ALLOWED_ORIGIN) {
    list = env.ALLOWED_ORIGIN.split(',').map(s => s.trim()).filter(Boolean);
  }
  // 允许本地开发 localhost + 任意 pages.dev 预览
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /\.pages\.dev$/.test(new URL(origin).hostname)) return true;
  return list.includes(origin);
}

// ============ 定制咨询提交 ============
async function handleContact(request, env, ctx) {
  const origin = request.headers.get('origin') || '';
  if (!isOriginAllowed(env, origin)) return json({ error: 'Origin not allowed' }, 403);

  let body;
  try { body = await request.json(); } catch (_) { return json({ error: 'Invalid JSON body' }, 400); }

  const { name, email, projectType, description, 'cf-turnstile-response': turnstileToken, website } = body || {};
  if (website) return json({ ok: true }); // honeypot

  const errors = validateContact({ name, email, description });
  if (errors.length > 0) return json({ error: 'Validation failed', details: errors }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateCheck = await checkRateLimit(env, ip);
  if (!rateCheck.ok) return json({ error: 'Too many submissions. Please try again later.' }, 429);

  if (env.TURNSTILE_SECRET_KEY && turnstileToken) {
    const verifyOk = await verifyTurnstile(turnstileToken, ip, env.TURNSTILE_SECRET_KEY);
    if (!verifyOk) console.warn('Turnstile verify failed, degrading. IP:', ip);
  }

  const userAgent = request.headers.get('user-agent') || '';
  const insertResult = await env.DB.prepare(
    `INSERT INTO messages (name, email, project_type, description, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    String(name).slice(0, 100),
    String(email).slice(0, 200),
    String(projectType || '').slice(0, 50),
    String(description).slice(0, 5000),
    ip,
    userAgent.slice(0, 500)
  ).run();

  const messageId = insertResult.meta?.last_row_id;
  ctx.waitUntil(sendEmail(env, { name, email, projectType, description, ip, messageId }).catch(err => console.error('Email fail:', err)));
  ctx.waitUntil(cleanupRateLimit(env));
  return json({ ok: true, id: messageId });
}

// ============ 定制咨询列表 + 标记已读 ============
async function handleListMessages(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const unreadOnly = url.searchParams.get('unread') === '1';
  const where = unreadOnly ? 'WHERE is_read = 0' : '';
  const result = await env.DB.prepare(
    `SELECT id, name, email, project_type, description, ip, user_agent, is_read, created_at
     FROM messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();
  return json({ ok: true, messages: result.results || [] });
}
async function handleMarkRead(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  const id = parseInt(url.searchParams.get('id') || '0', 10);
  if (!id) return json({ error: 'Missing id' }, 400);
  await env.DB.prepare(`UPDATE messages SET is_read = 1 WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

// ============ Turnstile ============
async function verifyTurnstile(token, ip, secretKey) {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token, remoteip: ip })
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) { console.error('Turnstile err:', err); return false; }
}

// ============ 限流（IP + 小时桶 + namespace）============
async function checkRateLimit(env, ip, namespace = 'contact', maxPerHour = 5) {
  if (ip === 'unknown') return { ok: true };
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / 3600);
  const ipKey = `${namespace}:${ip}`;
  try {
    await env.DB.prepare(
      `INSERT INTO rate_limit (ip, bucket, count) VALUES (?, ?, 1)
       ON CONFLICT(ip, bucket) DO UPDATE SET count = count + 1`
    ).bind(ipKey, bucket).run();
    const row = await env.DB.prepare(
      `SELECT count FROM rate_limit WHERE ip = ? AND bucket = ?`
    ).bind(ipKey, bucket).first();
    const count = row?.count || 0;
    if (count > maxPerHour) return { ok: false, count };
    return { ok: true, count };
  } catch (err) { console.error('rate_limit err:', err); return { ok: true }; }
}

// 清理 >2h 旧桶（防止 D1 膨胀，由多个 waitUntil 触发）
async function cleanupRateLimit(env) {
  try {
    const cutoffBucket = Math.floor((Math.floor(Date.now() / 1000) - 7200) / 3600);
    await env.DB.prepare(`DELETE FROM rate_limit WHERE bucket < ?`).bind(cutoffBucket).run();
  } catch (_) {}
}

// ============ Resend 邮件 ============
async function sendEmail(env, { name, email, projectType, description, ip, messageId }) {
  if (!env.RESEND_API_KEY) return;
  const subject = `[New Inquiry #${messageId || '?'}] ${name} - ${projectType || 'General'}`;
  const html = buildEmailHtml({ name, email, projectType, description, ip, messageId });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL || 'no-reply@yuanqizhike.com',
      to: env.CONTACT_TO_EMAIL || 'contact@yuanqizhike.com',
      reply_to: email,
      subject, html
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${txt}`);
  }
}
function buildEmailHtml({ name, email, projectType, description, ip, messageId }) {
  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  return `<div style="max-width:600px;margin:0 auto;padding:24px;background:#f9fafb;font-family:-apple-system,sans-serif;">
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">
    <h2 style="margin:0 0 16px;">New Custom Dev Inquiry #${messageId || '?'}</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;width:120px;color:#6b7280;">Name:</td><td>${esc(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Email:</td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Project:</td><td>${esc(projectType || 'N/A')}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">IP:</td><td style="font-family:monospace;color:#6b7280;">${esc(ip)}</td></tr>
    </table>
    <h3 style="margin:20px 0 8px;font-size:14px;">Description:</h3>
    <div style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap;line-height:1.6;">${esc(description)}</div>
  </div></div>`;
}

// ============ 公开 Guestbook 列表 ============
async function handleListGuestbook(request, env, url) {
  const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10), 1), 50);
  const offset = (page - 1) * limit;
  const category = url.searchParams.get('category');
  let where = 'WHERE status = ?';
  let binds = ['approved'];
  if (category && ['feedback', 'suggestion', 'cooperation', 'other'].includes(category)) {
    where += ' AND category = ?'; binds.push(category);
  }
  const listStmt = env.DB.prepare(
    `SELECT id, nickname, category, content, created_at FROM guestbook ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset);
  const countStmt = env.DB.prepare(`SELECT COUNT(*) as total FROM guestbook ${where}`).bind(...binds);
  let listResult, countResult;
  try {
    [listResult, countResult] = await Promise.all([listStmt.all(), countStmt.first()]);
  } catch (err) {
    console.error('Guestbook query err:', err.message);
    return json({ ok: true, entries: [], total: 0, page, limit, pages: 0 });
  }
  return json({
    ok: true, entries: listResult.results || [], total: countResult?.total || 0,
    page, limit, pages: Math.ceil((countResult?.total || 0) / limit)
  });
}

// ============ Guestbook 提交 ============
const GB_CATEGORY_LABELS = { feedback: 1, suggestion: 1, cooperation: 1, other: 1 };
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
  if (!isOriginAllowed(env, origin)) return json({ error: 'Origin not allowed' }, 403);

  let body;
  try { body = await request.json(); } catch (_) { return json({ error: 'Invalid JSON body' }, 400); }
  const { nickname, category, content, 'cf-turnstile-response': turnstileToken, website } = body || {};
  if (website) return json({ ok: true, pending: true }); // honeypot

  const errors = validateGuestbook({ nickname, category, content });
  if (errors.length > 0) return json({ error: 'Validation failed', details: errors }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (ip !== 'unknown') {
    const blocked = await env.DB.prepare(`SELECT 1 FROM ip_blacklist WHERE ip = ?`).bind(ip).first();
    if (blocked) return json({ error: 'Submission blocked.' }, 403);
  }

  const rateCheck = await checkRateLimit(env, ip, 'gb', 3);
  if (!rateCheck.ok) return json({ error: 'Too many submissions. Please try again later.' }, 429);

  if (env.TURNSTILE_SECRET_KEY && turnstileToken) {
    const ok = await verifyTurnstile(turnstileToken, ip, env.TURNSTILE_SECRET_KEY);
    if (!ok) console.warn('GB Turnstile degrading. IP:', ip);
  }

  const contentLower = String(content).toLowerCase();
  const hasSpamKeyword = SPAM_KEYWORDS.some(k => contentLower.includes(k));
  const urlPattern = /https?:\/\/(www\.)?[a-z0-9.-]+\.(com|net|org|co|io|me|tv|cc)\/[a-z0-9\/_-]+/i;
  const hasCommercialUrl = urlPattern.test(contentLower) && /product|shop|buy|cart|order|deal/i.test(contentLower);
  const hasShortUrl = /bit\.ly|tinyurl|t\.co|goo\.gl|adf\.ly|shorturl/i.test(contentLower);
  const hasUrl = /https?:\/\//i.test(content);
  const userCntRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM guestbook WHERE ip = ?`).bind(ip).first();
  const isUrlBlocked = (userCntRow?.cnt || 0) < 5 && hasUrl;
  const isSpam = hasSpamKeyword || hasCommercialUrl || hasShortUrl || isUrlBlocked;
  const status = isSpam ? 'spam' : 'pending';

  const ua = request.headers.get('user-agent') || '';
  let insertResult;
  try {
    insertResult = await env.DB.prepare(
      `INSERT INTO guestbook (nickname, category, content, ip, user_agent, status) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      String(nickname || 'Anonymous').slice(0, 50),
      String(category || 'feedback').slice(0, 20),
      String(content).slice(0, 1000),
      ip, ua.slice(0, 500), status
    ).run();
  } catch (err) {
    console.error('GB insert err:', err.message);
    return json({ error: 'Database error' }, 500);
  }

  ctx.waitUntil(cleanupRateLimit(env));
  return json({
    ok: true, id: insertResult.meta?.last_row_id,
    pending: status === 'pending', spam: status === 'spam'
  });
}
function validateGuestbook({ nickname, category, content }) {
  const e = [];
  if (nickname && String(nickname).length > 50) e.push('Nickname too long');
  if (!content || !String(content).trim()) e.push('Content required');
  const l = String(content || '').length;
  if (l && l < 5) e.push('Content too short (min 5)');
  if (l > 1000) e.push('Content too long (max 1000)');
  if (category && !GB_CATEGORY_LABELS[String(category)]) e.push('Invalid category');
  return e;
}

// ============ Guestbook 管理 ============
async function handleAdminListGuestbook(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  let where = 'WHERE 1=1', binds = [];
  if (status) { where += ' AND status = ?'; binds.push(status); }
  if (category) { where += ' AND category = ?'; binds.push(category); }
  const result = await env.DB.prepare(
    `SELECT id, nickname, category, content, ip, user_agent, status, created_at
     FROM guestbook ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ ok: true, entries: result.results || [] });
}
async function handleAdminActionGuestbook(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  let body;
  try { body = await request.json(); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
  const { action, id, ip, reason } = body || {};
  if (!action) return json({ error: 'Missing action' }, 400);

  if (['approve', 'reject', 'spam'].includes(action)) {
    if (!id) return json({ error: 'Missing id' }, 400);
    const s = action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'spam');
    await env.DB.prepare(`UPDATE guestbook SET status = ? WHERE id = ?`).bind(s, parseInt(id, 10)).run();
    return json({ ok: true, id: parseInt(id, 10), status: s });
  }
  if (action === 'delete') {
    if (!id) return json({ error: 'Missing id' }, 400);
    await env.DB.prepare(`DELETE FROM guestbook WHERE id = ?`).bind(parseInt(id, 10)).run();
    return json({ ok: true, deleted: parseInt(id, 10) });
  }
  if (action === 'block_ip') {
    if (!ip) return json({ error: 'Missing ip' }, 400);
    await env.DB.prepare(`INSERT OR IGNORE INTO ip_blacklist (ip, reason) VALUES (?, ?)`).bind(String(ip).slice(0, 50), String(reason || '').slice(0, 200)).run();
    return json({ ok: true, blocked: ip });
  }
  if (action === 'unblock_ip') {
    if (!ip) return json({ error: 'Missing ip' }, 400);
    await env.DB.prepare(`DELETE FROM ip_blacklist WHERE ip = ?`).bind(String(ip).slice(0, 50)).run();
    return json({ ok: true, unblocked: ip });
  }
  return json({ error: 'Unknown action' }, 400);
}

// ============ 管理端汇总 Stats ============
async function handleAdminStats(request, env) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  const [gbStats, msgStats] = await Promise.all([
    env.DB.prepare(`SELECT status, COUNT(*) as cnt FROM guestbook GROUP BY status`).all(),
    env.DB.prepare(`SELECT is_read, COUNT(*) as cnt FROM messages GROUP BY is_read`).all()
  ]);
  const gb = { pending: 0, approved: 0, rejected: 0, spam: 0 };
  (gbStats.results || []).forEach(r => { gb[r.status] = r.cnt; });
  const msgs = { unread: 0, read: 0 };
  (msgStats.results || []).forEach(r => {
    if (r.is_read === 0) msgs.unread = r.cnt; else msgs.read = r.cnt;
  });
  return json({ ok: true, guestbook: gb, messages: msgs });
}

// ============ 工具函数 ============
function validateContact({ name, email, description }) {
  const e = [];
  if (!name || !String(name).trim()) e.push('Name is required');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) e.push('Valid email is required');
  if (!description || !String(description).trim()) e.push('Description is required');
  if (description && String(description).length > 5000) e.push('Description too long');
  return e;
}
function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN) return json({ error: 'Admin not configured' }, 500);
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token || !timingSafeEqual(token, env.ADMIN_TOKEN)) return json({ error: 'Unauthorized' }, 401);
  return null;
}
function timingSafeEqual(a, b) {
  const sa = String(a), sb = String(b);
  if (sa.length !== sb.length) return false;
  let r = 0;
  for (let i = 0; i < sa.length; i++) r |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return r === 0;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
function handleCORS(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = isOriginAllowed(env, origin) ? origin : '*';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
function anonymizeIP(ip) {
  if (!ip || ip === 'unknown') return '0.0.0.0';
  const p = ip.split('.');
  if (p.length === 4) { p[3] = '0'; return p.join('.'); }
  return ip.slice(0, -2) + '0';
}
function getCurrentLang(request) {
  const cookies = request.headers.get('cookie') || '';
  const m = cookies.match(/(?:^|;\s*)yqz_lang=([^;]+)/);
  if (m) return m[1];
  const al = request.headers.get('accept-language') || '';
  if (al.includes('zh')) return 'zh';
  if (al.includes('es')) return 'es';
  if (al.includes('ja')) return 'ja';
  if (al.includes('en')) return 'en';
  return 'zh';
}

// ============ 统计：下载/PV/语言 ============
async function handleDownloadStat(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  const { toolName, toolZipUrl } = body || {};
  if (!toolName) return json({ ok: false, error: 'Missing toolName' }, 400);
  const ip = anonymizeIP(request.headers.get('cf-connecting-ip') || 'unknown');
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  const referer = (request.headers.get('referer') || '').slice(0, 500);
  try {
    await env.DB.prepare(
      `INSERT INTO downloads (tool_name, tool_zip_url, ip, user_agent, referrer) VALUES (?, ?, ?, ?, ?)`
    ).bind(String(toolName).slice(0, 100), String(toolZipUrl || '').slice(0, 500), ip, ua, referer).run();
  } catch (_) {}
  return json({ ok: true });
}
async function handleLanguageSwitchStat(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  const { fromLang, toLang } = body || {};
  if (!toLang) return json({ ok: false, error: 'Missing toLang' }, 400);
  const actualFrom = fromLang || getCurrentLang(request);
  const ip = anonymizeIP(request.headers.get('cf-connecting-ip') || 'unknown');
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  try {
    await env.DB.prepare(
      `INSERT INTO language_switches (from_lang, to_lang, ip, user_agent) VALUES (?, ?, ?, ?)`
    ).bind(String(actualFrom).slice(0, 10), String(toLang).slice(0, 10), ip, ua).run();
  } catch (_) {}
  return json({ ok: true });
}
async function handlePageViewStat(request, env) {
  let body;
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: 'Invalid JSON' }, 400); }
  const { pagePath, lang } = body || {};
  if (!pagePath) return json({ ok: false, error: 'Missing pagePath' }, 400);
  const ip = anonymizeIP(request.headers.get('cf-connecting-ip') || 'unknown');
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  const actualLang = lang || getCurrentLang(request);
  try {
    await env.DB.prepare(
      `INSERT INTO page_views (page_path, lang, ip, user_agent) VALUES (?, ?, ?, ?)`
    ).bind(String(pagePath).slice(0, 500), String(actualLang).slice(0, 10), ip, ua).run();
  } catch (_) {}
  return json({ ok: true });
}

// ============ 管理统计：下载/语言/PV ============
async function handleAdminDownloads(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const tool = url.searchParams.get('tool');
  let where = 'WHERE 1=1', binds = [];
  if (tool) { where += ' AND tool_name = ?'; binds.push(tool); }
  const [count, list, agg] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as total FROM downloads ${where}`).bind(...binds).first(),
    env.DB.prepare(
      `SELECT id, tool_name, tool_zip_url, ip, user_agent, referrer, created_at
       FROM downloads ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all(),
    env.DB.prepare(
      `SELECT tool_name, COUNT(*) as cnt FROM downloads ${where} GROUP BY tool_name ORDER BY cnt DESC`
    ).bind(...binds).all()
  ]);
  return json({ ok: true, total: count?.total || 0, downloads: list.results || [], byTool: agg.results || [] });
}
async function handleAdminLanguageStats(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const [count, list, byLang, flows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as total FROM language_switches`).first(),
    env.DB.prepare(
      `SELECT id, from_lang, to_lang, ip, user_agent, created_at FROM language_switches
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all(),
    env.DB.prepare(`SELECT to_lang, COUNT(*) as cnt FROM language_switches GROUP BY to_lang ORDER BY cnt DESC`).all(),
    env.DB.prepare(`SELECT from_lang, to_lang, COUNT(*) as cnt FROM language_switches GROUP BY from_lang, to_lang ORDER BY cnt DESC`).all()
  ]);
  return json({
    ok: true, total: count?.total || 0, switches: list.results || [],
    byLanguage: byLang.results || [], flows: flows.results || []
  });
}
async function handleAdminPageViews(request, env, url) {
  const authErr = requireAdmin(request, env);
  if (authErr) return authErr;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);
  const lang = url.searchParams.get('lang');
  const pathFilter = url.searchParams.get('path');
  let where = 'WHERE 1=1', binds = [];
  if (lang) { where += ' AND lang = ?'; binds.push(lang); }
  if (pathFilter) { where += ' AND page_path LIKE ?'; binds.push('%' + pathFilter + '%'); }
  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - 86400;
  const yStart = now - 86400 * 2;
  const [total, list, byPage, today, yday, byLang] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as total FROM page_views ${where}`).bind(...binds).first(),
    env.DB.prepare(
      `SELECT id, page_path, lang, ip, user_agent, created_at FROM page_views ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all(),
    env.DB.prepare(
      `SELECT page_path, lang, COUNT(*) as cnt FROM page_views ${where}
       GROUP BY page_path, lang ORDER BY cnt DESC LIMIT 50`
    ).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= ?`).bind(todayStart).first(),
    env.DB.prepare(`SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= ? AND created_at < ?`).bind(yStart, todayStart).first(),
    env.DB.prepare(`SELECT lang, COUNT(*) as cnt FROM page_views GROUP BY lang ORDER BY cnt DESC`).all()
  ]);
  return json({
    ok: true, total: total?.total || 0, views: list.results || [], byPage: byPage.results || [],
    today: today?.cnt || 0, yesterday: yday?.cnt || 0, byLanguage: byLang.results || []
  });
}
