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
    const blob = new Blob([String(text || '')], { type: 'text/plain; charset=utf-8' })
    const form = new FormData()
    form.append('file', blob, `${productId}.txt`)

    const uploadBase = ensureFilesBase(uploadUrl)
    const uploadResp = await fetch(`${uploadBase}/videoCaption/${productId}`, { method: 'POST', body: form })
    if (!uploadResp.ok) {
      const message = await uploadResp.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(uploadResp.status).json({ error: `Serverga yuklashda xatolik ${uploadResp.status}${detail}` })
    }

    const data = await uploadResp.json().catch(() => null)
    if (!data?.fileUrl) return res.status(500).json({ error: 'Serverdan fayl manzili qaytarilmadi' })

    const publicUrl = toAbsolute(uploadUrl, data.fileUrl)
    let ok = false
    try { ok = await waitUntilReachable(publicUrl, 10, 600, 'text') } catch {}
    if (!ok) { try { res.setHeader('X-File-Unverified', '1') } catch {} }

    return res.status(200).json({ url: data.fileUrl })
  } catch (err) {
    console.error('videoCaption error:', err)
    return res.status(500).json({ error: err?.message || 'Server xatosi' })
  }
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

async function waitUntilReachable(url, attempts = 6, delayMs = 400, expect = 'text') {
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

