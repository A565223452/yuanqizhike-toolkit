export default async function onRequestPost({ request }) {
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

    if (!mailRes.ok) throw new Error("邮件发送接口请求失败");

    // 提交成功反馈
    return new Response(JSON.stringify({ success: true, msg: "咨询提交成功，我们会24小时内联系你！" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("表单提交报错：", error);
    // 提交失败反馈（对应页面红色提示文字）
    return new Response(JSON.stringify({ success: false, msg: "Submission failed. Please try again later." }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
