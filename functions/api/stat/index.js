export async function onRequest(context) {
  const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
  const anonIp = ip.split('.').slice(0, 3).join('.') + '.0';

  try {
    const endpoint = new URL(context.request.url).pathname.split('/').pop();
    console.log('[Stats] Received request to:', endpoint, 'from IP:', anonIp);
    return new Response(JSON.stringify({ code: 200, msg: 'OK', endpoint }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ code: 400, msg: 'Invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}