// Cloudflare Pages 高级模式 Worker（_worker.js 存在时，functions/ 目录会被整体忽略）
// 本文件负责：路由重写 / 伪静态转发 / 404 兜底 / 缓存策略 / CSP 安全头 / CORS 预检
// 注意：functions/_middleware.js 的逻辑在本文件存在时不会生效，所有策略必须在此维护

// ---------- 配置 ----------

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
  "connect-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagmanager.com https://fonts.googleapis.com https://giscus.app",
  "img-src 'self' https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://www.google.com https://www.gstatic.com data:",
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://giscus.app https://challenges.cloudflare.com"
].join('; ') + ';';

// 缓存策略：按路径模式匹配 Cache-Control
const CACHE_RULES = [
  { match: /^\/assets\/.*\.(js|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot)$/i, ttl: 'public, max-age=31536000, immutable' },
  { match: /^\/assets\/icons\/.*$/i, ttl: 'public, max-age=31536000, immutable' },
  { match: /\.zip$/i, ttl: 'public, max-age=86400' },
  { match: /\.(json)$/i, ttl: 'public, max-age=300, must-revalidate' },
  { match: /\.(html|htm)$/i, ttl: 'public, max-age=0, must-revalidate' }
];

// 无需伪静态补 .html 的路径（有扩展名或以 / 结尾或含 .）
const STATIC_EXT_RE = /\.[a-zA-Z0-9]+$/;

// ---------- 工具函数 ----------

function pickOrigin(req) {
  const origin = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : '';
}

function getCacheControl(pathname, status) {
  if (status !== 200) return 'public, max-age=0, must-revalidate';
  for (const rule of CACHE_RULES) {
    if (rule.match.test(pathname)) return rule.ttl;
  }
  return 'public, max-age=0, must-revalidate';
}

// 路径归一化：去掉末尾斜杠（根路径除外），处理 / → /index.html
function normalizePath(pathname) {
  if (pathname === '/' || pathname === '') return '/index.html';
  // 去掉末尾斜杠（如果不是根路径）
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

// 尝试获取静态资源，失败返回 null
async function tryFetch(pathname, req) {
  const url = new URL(req.url);
  url.pathname = pathname;
  url.search = '';
  const newReq = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined
  });
  const res = await fetch(newReq);
  if (res.status === 200) return res;
  return null;
}

// 404 兜底响应
async function get404Response(req) {
  // 先尝试 404.html
  const custom404 = await tryFetch('/404.html', req);
  if (custom404) {
    return new Response(custom404.body, {
      status: 404,
      statusText: 'Not Found',
      headers: custom404.headers
    });
  }
  // 纯文本兜底
  return new Response('404 - Page Not Found', {
    status: 404,
    statusText: 'Not Found',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

// ---------- 主入口 ----------

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

    // 仅对 GET/HEAD 做路由重写
    if (method !== 'GET' && method !== 'HEAD') {
      const res = await fetch(req);
      return addSecurityHeaders(res, req);
    }

    // 路径归一化
    let pathname = normalizePath(url.pathname);

    // 1. 直接尝试原路径
    let response = await tryFetch(pathname, req);

    // 2. 伪静态补 .html（无扩展名的路径）
    if (!response && !STATIC_EXT_RE.test(pathname)) {
      const htmlPath = pathname + '.html';
      response = await tryFetch(htmlPath, req);
      if (response) pathname = htmlPath;
    }

    // 3. 404 兜底
    if (!response) {
      response = await get404Response(req);
      pathname = url.pathname;
    }

    // 4. 附加缓存头、安全头、CORS
    return addSecurityHeaders(response, req, pathname);
  }
};

// ---------- 响应头处理 ----------

function addSecurityHeaders(res, req, finalPathname) {
  const headers = new Headers(res.headers);
  const url = new URL(req.url);
  const pathname = finalPathname || url.pathname;

  // CORS：仅对已知来源回显 Origin，避免无条件 *
  const origin = pickOrigin(req);
  if (origin) headers.set('Access-Control-Allow-Origin', origin);

  // 安全响应头（仅对 HTML 页面加 CSP，避免干扰静态资源）
  if (pathname.endsWith('.html') || pathname.endsWith('.htm') || pathname === '/' ||
      headers.get('content-type')?.includes('text/html')) {
    headers.set('Content-Security-Policy', CSP);
  }
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-XSS-Protection', '1; mode=block');

  // 缓存策略
  const cacheControl = getCacheControl(pathname, res.status);
  if (cacheControl) headers.set('Cache-Control', cacheControl);

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers
  });
}
