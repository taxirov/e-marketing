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

  const { text, duration, uploadUrl, productId } = body || {}
  if (!text) return res.status(400).json({ error: 'Matn topilmadi' })
  if (!duration) return res.status(400).json({ error: 'Audio davomiyligi topilmadi' })
  if (!uploadUrl) return res.status(400).json({ error: 'Yuklash uchun server manzili topilmadi (uploadUrl)' })
  if (!productId) return res.status(400).json({ error: 'productId talab qilinadi' })

  try {
    const srtContent = buildSrtFromText(text, duration)
    const srtBlob = new Blob([srtContent], { type: 'text/plain; charset=utf-8' })
    const formData = new FormData()
    formData.append('file', srtBlob, `${productId}.srt`)

    const uploadResp = await fetch(`${uploadUrl}/caption/${productId}`, { method: 'POST', body: formData })
    if (!uploadResp.ok) {
      const message = await uploadResp.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(uploadResp.status).json({ error: `Serverga yuklashda xatolik ${uploadResp.status}${detail}` })
    }

    const uploadData = await uploadResp.json().catch(() => null)
    if (!uploadData?.fileUrl) return res.status(500).json({ error: 'Serverdan fayl manzili qaytarilmadi' })

    // Verify SRT reachable (small file)
    const abs = toAbsolute(uploadUrl, uploadData.fileUrl)
    try {
      const check = await fetch(abs)
      if (!check.ok) return res.status(502).json({ error: 'SRT fayliga kira olmadik' })
      const txt = await check.text()
      if (!txt || !txt.trim()) return res.status(502).json({ error: 'SRT fayli bo\'sh ko\'rinadi' })
    } catch {
      return res.status(502).json({ error: 'SRT faylni tekshirishda xato' })
    }

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
