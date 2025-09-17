// This API endpoint generates audio from text and uploads it to a user-provided server.
// It's a serverless function that acts as a middleware between the frontend and a third-party TTS API.
import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = { runtime: 'edge' };

const ENDPOINTS = {
  m4a: 'https://api.narakeet.com/text-to-speech/m4a',
  mp3: 'https://api.narakeet.com/text-to-speech/mp3',
  wav: 'https://api.narakeet.com/text-to-speech/wav',
};

export default async function handler(req) {
  // CORS headers for preflight OPTIONS requests and the main POST request.
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Credentials': 'true',
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
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

  const apiKey = process.env.NARAKEET_API_KEY || 'd9oq53OreB7PVhOTzX2zV9sNALxL2HrwJ4AvwzK0';
  if (!apiKey) {
    return jsonError('Narakeet API kaliti topilmadi', 500, req);
  }

  const format = normalizeFormat(body?.format);
  const endpoint = ENDPOINTS[format] || ENDPOINTS.m4a;
  const requestContentType = normalizeContentType(body?.contentType);

  const params = new URLSearchParams();
  const voice = (body?.voice || 'gulnora').trim();
  if (voice) params.set('voice', voice);

  const voiceSpeed = (body?.voiceSpeed || '').trim();
  if (voiceSpeed) params.set('voice-speed', voiceSpeed);

  const voiceVolume = (body?.voiceVolume || '').trim();
  if (voiceVolume) params.set('voice-volume', voiceVolume);

  const narakeetUrl = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

  // Generate audio from Narakeet API
  const narakeetResp = await fetch(narakeetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': requestContentType,
      'x-api-key': apiKey,
    },
    body: text,
  });

  if (!narakeetResp.ok) {
    const message = await narakeetResp.text().catch(() => '');
    const detail = message?.trim() ? `: ${message.trim()}` : '';
    return jsonError(`Narakeet xatosi ${narakeetResp.status}${detail}`, narakeetResp.status, req);
  }
  
  const audioBuffer = await narakeetResp.arrayBuffer();

  const formData = new FormData();
  formData.append('file', Buffer.from(audioBuffer), {
      filename: `${productId}.m4a`, // Fayl nomi sifatida productId va kengaytmani ishlatamiz
      contentType: narakeetResp.headers.get('content-type'),
  });

  // Upload the audio stream directly to the user's server
  const uploadResp = await fetch(`${uploadUrl}/audio/${productId}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...formData.getHeaders(),
    },
  });

  if (!uploadResp.ok) {
    const message = await uploadResp.text().catch(() => '');
    const detail = message?.trim() ? `: ${message.trim()}` : '';
    return jsonError(`Serverga yuklashda xatolik ${uploadResp.status}${detail}`, uploadResp.status, req);
  }

  // Return the response from the user's server, which should contain the file URL
  const uploadData = await uploadResp.json().catch(() => null);
  const headers = new Headers({
    ...corsHeaders,
    'Content-Type': 'application/json',
  });

  if (!uploadData?.fileUrl) {
      return jsonError("Serverdan fayl manzili qaytarilmadi", 500, req);
  }

  return new Response(JSON.stringify({ url: uploadData.fileUrl }), { status: 200, headers });
}

function normalizeFormat(value) {
  const v = (value || '').toLowerCase();
  if (v === 'mp3') return 'mp3';
  if (v === 'wav') return 'wav';
  return 'm4a';
}

function normalizeContentType(value) {
  const v = (value || '').toLowerCase().trim();
  if (v.includes('x-subrip')) return 'application/x-subrip';
  if (v.includes('text/srt')) return 'text/srt';
  return 'text/plain; charset=utf-8';
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