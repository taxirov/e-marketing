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

  const { text, uploadUrl, productId } = body || {}
  if (!text) return res.status(400).json({ error: 'Matn topilmadi' })
  if (!uploadUrl) return res.status(400).json({ error: 'Yuklash uchun server manzili topilmadi (uploadUrl)' })
  if (!productId) return res.status(400).json({ error: 'productId talab qilinadi' })

  try {
    const latin = await toLatinServer(String(text || ''))
    const textBlob = new Blob([latin], { type: 'text/plain; charset=utf-8' })
    const formData = new FormData()
    formData.append('file', textBlob, `${productId}.txt`)

    const uploadBase = ensureFilesBase(uploadUrl)
    const uploadResp = await fetch(`${uploadBase}/audioText/${productId}`, { method: 'POST', body: formData })
    if (!uploadResp.ok) {
      const message = await uploadResp.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(uploadResp.status).json({ error: `Serverga yuklashda xatolik ${uploadResp.status}${detail}` })
    }

    const uploadData = await uploadResp.json().catch(() => null)
    if (!uploadData?.fileUrl) return res.status(500).json({ error: 'Serverdan fayl manzili qaytarilmadi' })

    // Verify the uploaded file is actually reachable (defensive) with retries
    const fileUrl = uploadData.fileUrl
    const abs = toAbsolute(uploadUrl, fileUrl)
    try {
      const ok = await waitUntilReachable(abs, 8, 500)
      if (!ok) return res.status(502).json({ error: 'Yuklangan faylga kira olmadik' })
    } catch (e) {
      return res.status(502).json({ error: 'Yuklangan faylni tekshirishda xato' })
    }

    return res.status(200).json({ url: uploadData.fileUrl, text: latin })
  } catch (err) {
    console.error('audioText error:', err)
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

function ensureFilesBase(value) {
  const s = String(value || '').trim()
  if (!s) return '/api/files'
  try {
    const u = new URL(s)
    let p = u.pathname || ''
    p = p.replace(/\/$/, '')
    if (!/\/files$/i.test(p)) p = `${p}/files`
    u.pathname = p
    return u.toString().replace(/\/$/, '')
  } catch {
    const b = s.replace(/\/$/, '')
    return /\/files$/i.test(b) ? b : `${b}/files`
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
