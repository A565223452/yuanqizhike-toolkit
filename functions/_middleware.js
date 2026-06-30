// 异常捕获中间件
async function errorHandler(context) {
  try {
    return await context.next();
  } catch (err) {
    return new Response(`${err.message}\n${err.stack}`, { status: 500 });
  }
}

// 全局附加CORS头部中间件
async function setCorsHeader(context) {
  const response = await context.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Max-Age", "86400");
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