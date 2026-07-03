export default {
  async fetch(request, env, ctx) {
    const req = new Request(request);
    const url = new URL(req.url);
    const referer = req.headers.get("referer") ?? "";

    // 全覆盖谷歌广告相关域名/路径
    const isAdResource = referer.includes("googlesyndication.com")
        || url.hostname.includes("googlesyndication")
        || url.pathname.includes("adsbygoogle");

    const res = await fetch(req);
    const headers = new Headers(res.headers);
    // 解除跨域、拦截限制头
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-Frame-Options", "ALLOWALL");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "unsafe-url");

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers
    });
  }
};