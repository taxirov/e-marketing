export const config = { runtime: 'nodejs' };

const ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech/1bPXrtOTOTW6dae9i0K9';

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

  const apiKey = process.env.ELEVENLABS_API || `sk_eb736eb54bb49683c91fead56ae08c7797cecbe9ed754c92`;
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API kaliti topilmadi' });
  }

  const format = normalizeFormat(body?.format);
  const requestContentType = normalizeContentType(body?.contentType);

  const params = new URLSearchParams();
  const voice = 'gulnora';
  if (voice) params.set('voice', voice);

  // Convert to Latin (server-side) to ensure correct TTS pronunciation
  let sourceText = String(text || '')
  try {
    sourceText = await toLatinServer(sourceText)
  } catch {}

  // Generate audio from ElevenLabs API
  try {
    const elevenlabsResponse = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': application/json, 'x-api-key': apiKey},
      body: {
        "text": sourceText,
        "model_id": "eleven_v3"
      },
    })
    if (!elevenlabsResponse.ok) {
      const message = await elevenlabsResponse.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(elevenlabsResponse.status).json({ error: `Narakeet xatosi ${elevenlabsResponse.status}${detail}` })
    }

    // Narakeet returns an async job envelope (JSON) with `statusUrl`.
    // Poll the status until the `result` URL is available, then download audio.
    let audioBuffer
    let contentType
    try {
      const meta = await elevenlabsResponse.json()
      if (!meta?.statusUrl) throw new Error('statusUrl topilmadi')
      const resultInfo = await pollNarakeetStatus(meta.statusUrl)
      if (!resultInfo?.result) throw new Error('result topilmadi')
      const resultResp = await fetch(resultInfo.result)
      if (!resultResp.ok) throw new Error(`Natija faylini olishda xato: ${resultResp.status}`)
      audioBuffer = await resultResp.arrayBuffer()
      contentType = resultResp.headers.get('content-type') || accept
    } catch (_) {
      // Fallback: if parsing as JSON failed, assume body already has audio
      if (!audioBuffer) {
        const ctHeader = (elevenlabsResponse.headers.get('content-type') || '').toLowerCase()
        if (ctHeader && !ctHeader.includes('json')) {
          audioBuffer = await elevenlabsResponse.arrayBuffer()
          contentType = elevenlabsResponse.headers.get('content-type') || accept
        } else {
          return res.status(502).json({ error: 'Narakeet javobini qayta ishlashda xatolik' })
        }
      }
    }
    const formData = new FormData()
    const fileBlob = new Blob([audioBuffer], { type: contentType })
    formData.append('file', fileBlob, `${productId}.m4a`)

    const uploadBase = ensureFilesBase(uploadUrl)
    const uploadResp = await fetch(`${uploadBase}/audio/${productId}`, { method: 'POST', body: formData })
    if (!uploadResp.ok) {
      const message = await uploadResp.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(uploadResp.status).json({ error: `Serverga yuklashda xatolik ${uploadResp.status}${detail}` })
    }

    const uploadData = await uploadResp.json().catch(() => null)
    if (!uploadData?.fileUrl) return res.status(500).json({ error: 'Serverdan fayl manzili qaytarilmadi' })

    // Verify audio is reachable (best-effort) on both primary and public origins
    const primary = toAbsolute(uploadUrl, uploadData.fileUrl)
    const alt = toPublicAbsolute(uploadUrl, uploadData.fileUrl)
    let ok = false
    try { ok = await waitUntilReachable(primary, 12, 600) } catch {}
    if (!ok && alt && alt !== primary) {
      try { ok = await waitUntilReachable(alt, 12, 600) } catch {}
    }
    if (!ok) { try { res.setHeader('X-File-Unverified', '1') } catch {} }

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

function toPublicAbsolute(base, p) {
  try {
    const u = new URL(String(base || ''))
    const origin = `${u.protocol}//${u.host}`
    const pub = mapPublicOrigin(origin)
    const path = String(p || '')
    if (!/^https?:\/\//i.test(path)) return `${pub}${path.startsWith('/') ? '' : '/'}${path}`
    return path
  } catch { return '' }
}

function ensureFilesBase(value) {
  const s = String(value || '').trim()
  if (!s) return '/api/files'
  try {
    const u = new URL(s)
    let p = (u.pathname || '').replace(/\/$/, '')
    const idx = p.toLowerCase().indexOf('/files')
    if (idx >= 0) p = p.slice(0, idx + 6)
    else p = `${p}/files`
    u.pathname = p
    return u.toString().replace(/\/$/, '')
  } catch {
    let b = s.replace(/\/$/, '')
    const idx = b.toLowerCase().indexOf('/files')
    if (idx >= 0) b = b.slice(0, idx + 6)
    else b = `${b}/files`
    return b
  }
}

async function waitUntilReachable(url, attempts = 6, delayMs = 400) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const head = await fetch(url, { method: 'HEAD' })
      if (head && head.ok) {
        const len = Number(head.headers.get('content-length') || '0')
        if (Number.isFinite(len) && len > 0) return true
      }
    } catch {}
    try {
      const resp = await fetch(url, { method: 'GET', cache: 'no-store' })
      if (resp && resp.ok) {
        const ab = await resp.arrayBuffer()
        if ((ab?.byteLength ?? 0) > 0) return true
      }
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

function mapPublicOrigin(origin) {
  try {
    const u = new URL(origin)
    const h = u.hostname
    if (h.includes('e-kontent.vercel.app') || h.startsWith('46.173.26.14')) {
      return 'https://e-content.webpack.uz'
    }
    return `${u.protocol}//${u.host}`
  } catch { return origin }
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

async function pollNarakeetStatus(statusUrl, { timeoutMs = 120000, intervalMs = 1000 } = {}) {
  const start = Date.now()
  let last = null
  while (Date.now() - start < timeoutMs) {
    const resp = await fetch(statusUrl).catch(() => null)
    if (resp && resp.ok) {
      const json = await resp.json().catch(() => null)
      last = json
      if (json && (json.finished || json.succeeded || json.result)) {
        if (json.succeeded === false) throw new Error(json?.message || 'Vazifa bajarilmadi')
        const result = json.result || json.audioUrl || json.output || json.url
        if (result) return { result, duration: json.durationInSeconds || json.duration || null, meta: json }
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error((last && last.message) ? `Tayyor bo'lishi kutilmoqda: ${last.message}` : 'Narakeet vazifa tayyor bo\'lmadi')
}

async function toLatinServer(text) {
  const t = (text || '').trim()
  if (!t) return t
  const token = process.env.MATN_API_TOKEN || "vmTYSQIIyB8kUDAaNy33Asu4jjnQ5qXbsJcIehi7SOmoUmhvmdogxsTlKmM8c6W46AFweVlvflEs0VdK"
  if (!token) return t
  try {
    const resp = await fetch('https://matn.uz/api/v1/latin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t }),
    })
    if (!resp.ok) return t
    const raw = await resp.text()
    const decoded = decodeLatinResponse(raw)
    return normalizeApostrophes(decoded || t)
  } catch {
    return t
  }
}

function decodeLatinResponse(value) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  try {
    const parsed = JSON.parse(trimmed)
    if (typeof parsed === 'string') return parsed
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.text === 'string') return parsed.text
      if (typeof parsed.data === 'string') return parsed.data
    }
  } catch {}
  return value
}

function normalizeApostrophes(value) {
  if (typeof value !== 'string') return value
  return value.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"')
}
