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
    const textBlob = new Blob([text], { type: 'text/plain; charset=utf-8' })
    const formData = new FormData()
    formData.append('file', textBlob, `${productId}.txt`)

    const uploadResp = await fetch(`${uploadUrl}/audioText/${productId}`, { method: 'POST', body: formData })
    if (!uploadResp.ok) {
      const message = await uploadResp.text().catch(() => '')
      const detail = message?.trim() ? `: ${message.trim()}` : ''
      return res.status(uploadResp.status).json({ error: `Serverga yuklashda xatolik ${uploadResp.status}${detail}` })
    }

    const uploadData = await uploadResp.json().catch(() => null)
    if (!uploadData?.fileUrl) return res.status(500).json({ error: 'Serverdan fayl manzili qaytarilmadi' })
    return res.status(200).json({ url: uploadData.fileUrl })
  } catch (err) {
    console.error('audioText error:', err)
    return res.status(500).json({ error: err?.message || 'Server xatosi' })
  }
}
