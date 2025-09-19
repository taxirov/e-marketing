export const config = { runtime: 'nodejs' };

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

  // Accept either raw SRT content via `srt` OR generate from `text` + `duration`.
  const { text, duration, uploadUrl, productId, srt } = body || {}
  if (!text && !srt) return res.status(400).json({ error: 'Matn yoki SRT topilmadi' })
  if (!srt && !duration) return res.status(400).json({ error: 'Audio davomiyligi topilmadi' })
  if (!uploadUrl) return res.status(400).json({ error: 'Yuklash uchun server manzili topilmadi (uploadUrl)' })
  if (!productId) return res.status(400).json({ error: 'productId talab qilinadi' })

  try {
    // If `srt` is provided, use it directly; otherwise generate from text+duration
    const srtContent = String(srt || '')?.trim() ? String(srt) : buildSrtFromText(String(text || ''), duration)
    const srtBlob = new Blob([srtContent], { type: 'text/plain; charset=utf-8' })
    const formData = new FormData()
    formData.append('file', srtBlob, `${productId}.srt`)

    const uploadBase = ensureFilesBase(uploadUrl)
    const uploadResp = await fetch(`${uploadBase}/caption/${productId}`, { method: 'POST', body: formData })
    if (!uploadResp.ok) {
      const message = await uploadResp.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(uploadResp.status).json({ error: `Serverga yuklashda xatolik ${uploadResp.status}${detail}` })
    }

    const uploadData = await uploadResp.json().catch(() => null)
    if (!uploadData?.fileUrl) return res.status(500).json({ error: 'Serverdan fayl manzili qaytarilmadi' })

    // Verify SRT reachable (best-effort) on both primary and public origins
    const primary = toAbsolute(uploadUrl, uploadData.fileUrl)
    const alt = toPublicAbsolute(uploadUrl, uploadData.fileUrl)
    let ok = false
    try { ok = await waitUntilReachable(primary, 10, 600, 'text') } catch {}
    if (!ok && alt && alt !== primary) {
      try { ok = await waitUntilReachable(alt, 10, 600, 'text') } catch {}
    }
    if (!ok) { try { res.setHeader('X-File-Unverified', '1') } catch {} }

    return res.status(200).json({ url: uploadData.fileUrl })
  } catch (err) {
    console.error('caption error:', err)
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

// Node function uses res.status(...).json(...) above; helpers not needed.

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

async function waitUntilReachable(url, attempts = 6, delayMs = 400, expect = 'array') {
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
        if (expect === 'text') {
          const txt = await resp.text()
          if (txt && txt.trim()) return true
        } else {
          const ab = await resp.arrayBuffer()
          if ((ab?.byteLength ?? 0) > 0) return true
        }
      }
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}
