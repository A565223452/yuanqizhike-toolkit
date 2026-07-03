export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const referer = request.headers.get("referer") ?? "";
    // 放行googlesyndication广告流量
    if (referer.includes("googlesyndication.com") || url.href.includes("googlesyndication")) {
      return fetch(request);
    }
    return fetch(request);
  }
};