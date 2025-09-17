import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = { runtime: 'edge' };

export default async function handler(req) {
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

  const { text, duration, uploadUrl, productId } = body || {};
  if (!text) {
    return jsonError('Matn topilmadi', 400, req);
  }
  if (!duration) {
    return jsonError("Audio davomiyligi topilmadi", 400, req);
  }
  if (!uploadUrl) {
    return jsonError("Yuklash uchun server manzili topilmadi (uploadUrl)", 400, req);
  }
  if (!productId) {
    return jsonError("productId talab qilinadi", 400, req);
  }

  // A simple function to build SRT from text and duration
  const srtContent = buildSrtFromText(text, duration);
  const srtBlob = new Blob([srtContent], { type: 'text/plain; charset=utf-8' });

  const formData = new FormData();
  formData.append('file', srtBlob, {
    filename: `${productId}.srt`,
    contentType: 'text/plain',
  });

  // Upload the SRT blob to the user's server
  const uploadResp = await fetch(`${uploadUrl}/caption/${productId}`, {
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

function buildSrtFromText(text, durationSeconds) {
    const source = text.replace(/\s+/g, ' ').trim();
    const sentences = source.match(/[^.!?]+[.!?]?/g) || [source];
    const totalWords = source.split(/\s+/).filter(Boolean).length;
    const totalTime = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : sentences.length * 3;
    let accumulatedWords = 0;
    
    const timed = sentences.map((sentence, idx) => {
        const words = Math.max(sentence.split(/\s+/).filter(Boolean).length, 1);
        const startFraction = accumulatedWords / totalWords;
        accumulatedWords += words;
        const endFraction = idx === sentences.length - 1 ? 1 : Math.min(1, accumulatedWords / totalWords);
        const start = totalTime * startFraction;
        const end = totalTime * endFraction;
        return { index: idx + 1, start, end, text: sentence.trim() };
    });

    return timed.map(entry => {
        return `${entry.index}\n${formatTimestamp(entry.start)} --> ${formatTimestamp(entry.end)}\n${entry.text}\n`;
    }).join('\n').trim();
}

function formatTimestamp(seconds) {
    const totalMs = Math.max(0, Math.round(seconds * 1000));
    const ms = totalMs % 1000;
    const totalSeconds = Math.floor((totalMs - ms) / 1000);
    const s = totalSeconds % 60;
    const totalMinutes = Math.floor((totalSeconds - s) / 60);
    const m = totalMinutes % 60;
    const h = Math.floor((totalMinutes - m) / 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`;
}