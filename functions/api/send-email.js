export default async function onRequest({ request }) {
    // Handle all requests uniformly to avoid 405 errors from unstable onRequestPost detection
    if (request.method !== "POST") {
        return new Response(JSON.stringify({
            code: 405,
            message: "Only POST requests are allowed for form submission"
        }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        // Receive form data from frontend
        const formData = await request.formData();

        // Strictly match frontend input/select/textarea name attributes
        const customerName = formData.get("name") || "Name not provided";
        const customerEmail = formData.get("email") || "Email not provided";
        const projectType = formData.get("projectType") || "Project type not selected";
        const projectDesc = formData.get("description") || "No description provided";

        // Assemble email content
        const mailContent = `
===== New Custom Consultation Lead =====
Customer Name: ${customerName}
Customer Email: ${customerEmail}
Project Type: ${projectType}
Requirements:
${projectDesc}
        `;

        // MailChannels free email sending channel
        const mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: "260330663@qq.com" }] }],
                from: { email: "noreply@yuanqizhike-toolkit.pages.dev", name: "YuanqiZhiKe Custom Dev" },
                subject: "New Custom Consultation Received",
                content: [{ type: "text/plain", value: mailContent }]
            })
        });

        // Log MailChannels error response
        const mailResult = await mailRes.json();
        if (!mailRes.ok) throw new Error(`Email API error: ${JSON.stringify(mailResult)}`);

        // Return success response
        return new Response(JSON.stringify({
            code: 200,
            success: true,
            msg: "Consultation submitted successfully! We will contact you within 24 hours."
        }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("Form submission error:", error);
        // Return failure response
        return new Response(JSON.stringify({
            code: 500,
            success: false,
            msg: "Submission failed. Please try again later."
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}