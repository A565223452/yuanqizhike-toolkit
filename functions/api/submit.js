export async function onRequestPost(context) {
  // 打印请求信息，用于日志排查，参照Debugging文档自定义日志规范
  const reqUrl = context.request.url;
  console.log("表单POST请求地址：", reqUrl);
  const formData = await context.request.formData();
  const data = Object.fromEntries(formData);

  return new Response(JSON.stringify({ code: 200, msg: "提交成功", data }), {
    headers: { "Content-Type": "application/json" }
  });
}