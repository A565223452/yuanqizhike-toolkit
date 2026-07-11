export default async function onRequest({ request }) {
    if (request.method !== "POST") {
        return new Response(JSON.stringify({
            code: 405,
            message: "Only POST requests are allowed"
        }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    try {
        const formData = await request.formData();
        
        // Turnstile token verification
        const turnstileToken = formData.get("cf-turnstile-response");
        if (!turnstileToken) {
            return new Response(JSON.stringify({
                code: 400,
                success: false,
                msg: "CAPTCHA required"
            }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret: "0x4AAAAAADxZ2faDF6_AjI-K",
                response: turnstileToken
            })
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
            return new Response(JSON.stringify({
                code: 400,
                success: false,
                msg: "CAPTCHA verification failed"
            }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const customerName = formData.get("name") || "Anonymous";
        const customerEmail = formData.get("email") || "No email";
        const projectType = formData.get("projectType") || "General inquiry";
        const projectDesc = formData.get("description") || "No description";

        const mailContent = `
===== New Lead =====
Name: ${customerName}
Email: ${customerEmail}
Type: ${projectType}
Description:
${projectDesc}
        `;

        await fetch("https://api.mailchannels.net/tx/v1/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: "260330663@qq.com" }] }],
                from: { email: "noreply@yuanqizhike-toolkit.pages.dev", name: "YuanqiZhiKe" },
                subject: "New Lead Received",
                content: [{ type: "text/plain", value: mailContent }]
            })
        });

        return new Response(JSON.stringify({
            code: 200,
            success: true,
            msg: "Submitted successfully!"
        }), { headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error("Form error:", error);
        return new Response(JSON.stringify({
            code: 500,
            success: false,
            msg: "Submission failed"
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}