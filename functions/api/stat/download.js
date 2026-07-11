export async function onRequest(context) {
  const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
  const anonIp = ip.split('.').slice(0, 3).join('.') + '.0';

  try {
    let data;
    if (context.request.method === 'POST') {
      data = await context.request.json();
    } else {
      const url = new URL(context.request.url);
      data = {
        toolName: url.searchParams.get('toolName') || 'unknown',
        toolZipUrl: url.searchParams.get('toolZipUrl') || '',
        timestamp: Date.now()
      };
    }
    console.log('[Stats] Download tracked:', {
      toolName: data.toolName,
      toolZipUrl: data.toolZipUrl,
      anonIp: anonIp,
      timestamp: data.timestamp
    });
    return new Response(JSON.stringify({ code: 200, msg: 'OK' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ code: 400, msg: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}