export const config = { runtime: 'nodejs' };

const ENDPOINTS = {
  m4a: 'https://api.narakeet.com/text-to-speech/m4a',
  mp3: 'https://api.narakeet.com/text-to-speech/mp3',
  wav: 'https://api.narakeet.com/text-to-speech/wav',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  let raw = ''
  for await (const chunk of req) raw += chunk
  let body
  try { body = raw ? JSON.parse(raw) : {} } catch { return res.status(400).json({ error: "Noto'g'ri JSON" }) }

  const { text, uploadUrl, productId } = body || {};
  if (!text) {
    return res.status(400).json({ error: 'Matn topilmadi' });
  }
  if (!uploadUrl) {
    return res.status(400).json({ error: "Yuklash uchun server manzili topilmadi (uploadUrl)" });
  }
  if (!productId) {
    return res.status(400).json({ error: "productId talab qilinadi" });
  }

  const apiKey = process.env.NARAKEET_API_KEY || 'd9oq53OreB7PVhOTzX2zV9sNALxL2HrwJ4AvwzK0';
  if (!apiKey) {
    return res.status(500).json({ error: 'Narakeet API kaliti topilmadi' });
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
  try {
    const narakeetResp = await fetch(narakeetUrl, {
      method: 'POST',
      headers: { 'Content-Type': requestContentType, 'x-api-key': apiKey },
      body: text,
    })
    if (!narakeetResp.ok) {
      const message = await narakeetResp.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(narakeetResp.status).json({ error: `Narakeet xatosi ${narakeetResp.status}${detail}` })
    }

    const audioBuffer = await narakeetResp.arrayBuffer()
    const contentType = narakeetResp.headers.get('content-type') || 'audio/mp4'
    const formData = new FormData()
    const fileBlob = new Blob([audioBuffer], { type: contentType })
    formData.append('file', fileBlob, `${productId}.m4a`)

    const uploadResp = await fetch(`${uploadUrl}/audio/${productId}`, { method: 'POST', body: formData })
    if (!uploadResp.ok) {
      const message = await uploadResp.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(uploadResp.status).json({ error: `Serverga yuklashda xatolik ${uploadResp.status}${detail}` })
    }

    const uploadData = await uploadResp.json().catch(() => null)
    if (!uploadData?.fileUrl) return res.status(500).json({ error: 'Serverdan fayl manzili qaytarilmadi' })

    // Verify audio is reachable and not empty using HEAD/GET
    const abs = toAbsolute(uploadUrl, uploadData.fileUrl)
    try {
      let ok = false
      const head = await fetch(abs, { method: 'HEAD' }).catch(() => null)
      if (head && head.ok) {
        const len = Number(head.headers.get('content-length') || '0')
        ok = Number.isFinite(len) && len > 0
      }
      if (!ok) {
        const resp = await fetch(abs, { method: 'GET' })
        if (!resp.ok) return res.status(502).json({ error: 'Audio fayliga kira olmadik' })
        const buf = await resp.arrayBuffer()
        if ((buf?.byteLength ?? 0) <= 0) return res.status(502).json({ error: 'Audio fayli bo\'sh ko\'rinadi' })
      }
    } catch {
      return res.status(502).json({ error: 'Audio faylni tekshirishda xato' })
    }

    return res.status(200).json({ url: uploadData.fileUrl })
  } catch (err) {
    console.error('audio error:', err)
    return res.status(500).json({ error: err?.message || 'Server xatosi' })
  }
}

function toAbsolute(base, maybe) {
  const p = String(maybe || '')
  if (/^https?:\/\//i.test(p)) return p
  try {
    const u = new URL(String(base || ''))
    const origin = `${u.protocol}//${u.host}`
    if (p.startsWith('/')) return `${origin}${p}`
    const basePath = u.pathname.replace(/\/$/, '')
    return `${origin}${basePath ? `${basePath}/${p}` : `/${p}`}`
  } catch {
    const b = String(base || '').replace(/\/$/, '')
    return `${b}${p.startsWith('/') ? '' : '/'}${p}`
  }
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

// Node function uses res.status(...).json(...) above; helpers not needed.
