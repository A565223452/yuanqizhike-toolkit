warning: in the working copy of 'functions/api/send-email.js', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/functions/api/send-email.js b/functions/api/send-email.js[m
[1mindex 76fa8ff..ce55326 100644[m
[1m--- a/functions/api/send-email.js[m
[1m+++ b/functions/api/send-email.js[m
[36m@@ -1,9 +1,9 @@[m
 export default async function onRequest({ request }) {[m
[31m-    // 统一处理所有请求，彻底规避onRequestPost识别不稳定导致的405报错[m
[32m+[m[32m    // 缁熶竴澶勭悊鎵€鏈夎姹傦紝褰诲簳瑙勯伩onRequestPost璇嗗埆涓嶇ǔ瀹氬鑷寸殑405鎶ラ敊[m
     if (request.method !== "POST") {[m
         return new Response(JSON.stringify({[m
             code: 405,[m
[31m-            message: "仅允许POST表单提交"[m
[32m+[m[32m            message: "浠呭厑璁窹OST琛ㄥ崟鎻愪氦"[m
         }), {[m
             status: 405,[m
             headers: { "Content-Type": "application/json" }[m
[36m@@ -11,52 +11,52 @@[m [mexport default async function onRequest({ request }) {[m
     }[m
 [m
     try {[m
[31m-        // 接收前端表单提交的数据[m
[32m+[m[32m        // 鎺ユ敹鍓嶇琛ㄥ崟鎻愪氦鐨勬暟鎹?[m
         const formData = await request.formData();[m
 [m
[31m-        // 严格匹配前端input/select/textarea的name属性[m
[31m-        const customerName = formData.get("name") || "未填写姓名";[m
[31m-        const customerEmail = formData.get("email") || "未填写客户邮箱";[m
[31m-        const projectType = formData.get("projectType") || "未选择项目类型";[m
[31m-        const projectDesc = formData.get("description") || "无需求描述";[m
[32m+[m[32m        // 涓ユ牸鍖归厤鍓嶇input/select/textarea鐨刵ame灞炴€?[m
[32m+[m[32m        const customerName = formData.get("name") || "鏈～鍐欏鍚?;[m
[32m+[m[32m        const customerEmail = formData.get("email") || "鏈～鍐欏鎴烽偖绠?;[m
[32m+[m[32m        const projectType = formData.get("projectType") || "鏈€夋嫨椤圭洰绫诲瀷";[m
[32m+[m[32m        const projectDesc = formData.get("description") || "鏃犻渶姹傛弿杩?;[m
 [m
[31m-        // 组装推送到你邮箱的内容[m
[32m+[m[32m        // 缁勮鎺ㄩ€佸埌浣犻偖绠辩殑鍐呭[m
         const mailContent = `[m
[31m-===== 新定制咨询线索 =====[m
[31m-客户姓名：${customerName}[m
[31m-客户联系邮箱：${customerEmail}[m
[31m-项目类型：${projectType}[m
[31m-需求详情：[m
[32m+[m[32m===== 鏂板畾鍒跺挩璇㈢嚎绱?=====[m
[32m+[m[32m瀹㈡埛濮撳悕锛?{customerName}[m
[32m+[m[32m瀹㈡埛鑱旂郴閭锛?{customerEmail}[m
[32m+[m[32m椤圭洰绫诲瀷锛?{projectType}[m
[32m+[m[32m闇€姹傝鎯咃細[m
 ${projectDesc}[m
         `;[m
 [m
[31m-        // MailChannels免费发信通道[m
[32m+[m[32m        // MailChannels鍏嶈垂鍙戜俊閫氶亾[m
         const mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {[m
             method: "POST",[m
             headers: { "Content-Type": "application/json" },[m
             body: JSON.stringify({[m
                 personalizations: [{ to: [{ email: "260330663@qq.com" }] }],[m
[31m-                from: { email: "noreply@yuanqizhike-toolkit.pages.dev", name: "元启智科定制咨询" },[m
[31m-                subject: "网站收到新客户定制需求",[m
[32m+[m[32m                from: { email: "noreply@yuanqizhike-toolkit.pages.dev", name: "鍏冨惎鏅虹瀹氬埗鍜ㄨ" },[m
[32m+[m[32m                subject: "缃戠珯鏀跺埌鏂板鎴峰畾鍒堕渶姹?,[m
                 content: [{ type: "text/plain", value: mailContent }][m
             })[m
         });[m
 [m
[31m-        // 打印MailChannels返回错误信息[m
[32m+[m[32m        // 鎵撳嵃MailChannels杩斿洖閿欒淇℃伅[m
         const mailResult = await mailRes.json();[m
[31m-        if (!mailRes.ok) throw new Error(`发信接口报错：${JSON.stringify(mailResult)}`);[m
[32m+[m[32m        if (!mailRes.ok) throw new Error(`鍙戜俊鎺ュ彛鎶ラ敊锛?{JSON.stringify(mailResult)}`);[m
 [m
[31m-        // 提交成功反馈[m
[32m+[m[32m        // 鎻愪氦鎴愬姛鍙嶉[m
         return new Response(JSON.stringify({[m
             code: 200,[m
             success: true,[m
[31m-            msg: "咨询提交成功，我们会24小时内联系你！"[m
[32m+[m[32m            msg: "鍜ㄨ鎻愪氦鎴愬姛锛屾垜浠細24灏忔椂鍐呰仈绯讳綘锛?[m
         }), {[m
             headers: { "Content-Type": "application/json" }[m
         });[m
     } catch (error) {[m
[31m-        console.error("表单提交完整报错：", error);[m
[31m-        // 提交失败反馈[m
[32m+[m[32m        console.error("琛ㄥ崟鎻愪氦瀹屾暣鎶ラ敊锛?, error);[m
[32m+[m[32m        // 鎻愪氦澶辫触鍙嶉[m
         return new Response(JSON.stringify({[m
             code: 500,[m
             success: false,[m
