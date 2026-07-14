// Cloudflare Pages 高级模式 Worker（_worker.js 存在时，functions/ 目录会被整体忽略）
// 因此本文件负责：安全响应头（含 CSP）、CORS 预检、静态资源转发
// 注意：functions/_middleware.js 的 CSP 在本文件存在时不会生效，安全策略必须在此维护

// 已知允许的前端来源（含 pages.dev 预览域名与正式域名）
const ALLOWED_ORIGINS = [
  'https://yuanqizhike.com',
  'https://www.yuanqizhike.com',
  'https://yuanqizhike-toolkit.pages.dev'
];

// 内容安全策略：允许谷歌广告 + Giscus 评论 + Turnstile
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://giscus.app https://challenges.cloudflare.com 'unsafe-inline'",
  "connect-src 'self' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://fonts.googleapis.com",
  "img-src 'self' https://googleads.g.doubleclick.net https://www.google.com https://www.gstatic.com data:",
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src 'self' https://pagead2.googlesyndication.com https://giscus.app https://challenges.cloudflare.com"
].join('; ') + ';';

function pickOrigin(req) {
  const origin = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : '';
}

export default {
  async fetch(request, env, ctx) {
    const req = new Request(request);
    const url = new URL(req.url);
    const method = req.method;

    // CORS 预检
    if (method === 'OPTIONS') {
      const origin = pickOrigin(req);
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    const res = await fetch(req);
    const headers = new Headers(res.headers);

    // CORS：仅对已知来源回显 Origin，避免无条件 *
    const origin = pickOrigin(req);
    if (origin) headers.set('Access-Control-Allow-Origin', origin);

    // 安全响应头
    headers.set('Content-Security-Policy', CSP);
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-XSS-Protection', '1; mode=block');

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers
    });
  }
};