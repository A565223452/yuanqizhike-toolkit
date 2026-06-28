export default async function onRequestPost({ request }) {
  // 全局跨域头，解决请求拦截
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // 处理预检OPTIONS请求
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 接收前端表单提交的数据
    const formData = await request.formData();

    // 读取客户填写的全部表单信息
    const customerName = formData.get("name") || "未填写姓名";
    const customerEmail = formData.get("email") || "未填写客户邮箱";
    const projectType = formData.get("projectType") || "未选择项目类型";
    const projectDesc = formData.get("description") || "无需求描述";

    // 组装推送到你邮箱的内容
    const mailContent = `
===== 新定制咨询线索 =====
客户姓名：${customerName}
客户联系邮箱：${customerEmail}
项目类型：${projectType}
需求详情：
${projectDesc}
    `;

    // MailChannels免费发信通道
    const mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: "260330663@qq.com" }] }],
        from: { email: "noreply@yuanqizhike-toolkit.pages.dev", name: "元启智科定制咨询" },
        subject: "网站收到新客户定制需求",
        content: [{ type: "text/plain", value: mailContent }]
      })
    });

    // 打印MailChannels返回错误信息
    const mailResult = await mailRes.json();
    if (!mailRes.ok) throw new Error(`发信接口报错：${JSON.stringify(mailResult)}`);

    // 提交成功反馈
    return new Response(JSON.stringify({ success: true, msg: "咨询提交成功，我们会24小时内联系你！" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("表单提交完整报错：", error);
    // 提交失败反馈（对应页面红色提示文字）
    return new Response(JSON.stringify({ success: false, msg: "Submission failed. Please try again later." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
