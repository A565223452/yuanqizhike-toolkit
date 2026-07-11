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
        fromLang: url.searchParams.get('fromLang') || 'en',
        toLang: url.searchParams.get('toLang') || 'en',
        timestamp: Date.now()
      };
    }
    console.log('[Stats] Language switch tracked:', {
      fromLang: data.fromLang,
      toLang: data.toLang,
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