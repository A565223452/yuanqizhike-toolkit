// 异常捕获中间件
async function errorHandler(context) {
  try {
    return await context.next();
  } catch (err) {
    return new Response(`${err.message}\n${err.stack}`, { status: 500 });
  }
}

// 全局附加CORS头部中间件 + CSP安全策略（允许AdSense加载）
async function setCorsHeader(context) {
  const response = await context.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Max-Age", "86400");
// CSP安全策略：允许谷歌广告脚本加载 + Giscus评论 + Turnstile
    response.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://giscus.app https://challenges.cloudflare.com 'unsafe-inline'; " +
        "connect-src 'self' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://fonts.googleapis.com; " +
        "img-src 'self' https://googleads.g.doubleclick.net https://www.google.com https://www.gstatic.com data:; " +
        "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "frame-src 'self' https://pagead2.googlesyndication.com https://giscus.app https://challenges.cloudflare.com;"
    );
  return response;
}

// 处理OPTIONS预检请求，解决预检405
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400"
    }
  });
}

// 中间件链式执行：先捕获异常，再配置CORS
export const onRequest = [errorHandler, setCorsHeader];