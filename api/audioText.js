export const config = { runtime: 'nodejs' };

export default async function handler(req) {
  const baseCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Credentials': 'true',
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: baseCorsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: baseCorsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    return jsonError("Noto'g'ri JSON", 400, req);
  }

  const { text, uploadUrl, productId } = body || {};
  if (!text) {
    return jsonError('Matn topilmadi', 400, req);
  }
  if (!uploadUrl) {
    return jsonError("Yuklash uchun server manzili topilmadi (uploadUrl)", 400, req);
  }
  if (!productId) {
    return jsonError("productId talab qilinadi", 400, req);
  }

  const textBlob = new Blob([text], { type: 'text/plain; charset=utf-8' });

  const formData = new FormData();
  formData.append('file', textBlob, `${productId}.txt`);

  const uploadResp = await fetch(`${uploadUrl}/audioText/${productId}`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadResp.ok) {
    const message = await uploadResp.text().catch(() => '');
    const detail = message?.trim() ? `: ${message.trim()}` : '';
    return jsonError(`Serverga yuklashda xatolik ${uploadResp.status}${detail}`, uploadResp.status, req);
  }

  const uploadData = await uploadResp.json().catch(() => null);
  const headers = new Headers({ ...baseCorsHeaders, 'Content-Type': 'application/json' });

  if (!uploadData?.fileUrl) {
      return jsonError("Serverdan fayl manzili qaytarilmadi", 500, req);
  }

  return new Response(JSON.stringify({ url: uploadData.fileUrl }), { status: 200, headers });
}

function jsonError(message, status, req) {
  const headers = new Headers({
    ...corsHeaders(req),
    'Content-Type': 'application/json',
  });
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

function corsHeaders(req) {
  const origin = req.headers.get('origin') || '*';
  return new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
  });
}
