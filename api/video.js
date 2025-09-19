// This API endpoint renders a video and uploads it to a user-provided server.
// It fetches the necessary assets (audio, captions, images) and uses Remotion to render the video.
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import FormData from 'form-data';
import { bundle, renderMedia, getCompositions } from '@remotion/renderer'

export const config = { runtime: 'nodejs', maxDuration: 300 }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')
const remotionRoot = path.join(projectRoot, 'remotion')
const imagesDir = path.join(projectRoot, 'src', 'images', 'obyekt')
const backgroundPng = path.join(projectRoot, 'src', 'images', 'background.png')

const FPS = 30
const COMPOSITION_ID = 'property-video'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  let raw = ''
  for await (const chunk of req) raw += chunk
  let body
  try { body = raw ? JSON.parse(raw) : {} } catch { return res.status(400).json({ error: 'Invalid JSON' }) }

  const {
    audioUrl, // Changed from audioBase64 to audioUrl
    captionsUrl, // New parameter for caption file URL
    images = [],
    durationSeconds,
    title = '',
    subtitle = '',
    uploadUrl, // New parameter for server upload URL
    productId,
  } = body || {};

  if (!audioUrl) return res.status(400).json({ error: 'Audio fayli manzili topilmadi' })
  if (!captionsUrl) return res.status(400).json({ error: 'Sarlavha fayli manzili topilmadi' });
  if (!Array.isArray(images) || !images.length) return res.status(400).json({ error: 'Kamida bitta rasm tanlang' })
  if (!uploadUrl) return res.status(400).json({ error: 'Video yuklash uchun server manzili topilmadi' });
  if (!productId) return res.status(400).json({ error: "productId talab qilinadi" });

  try {
    // Fetch audio and captions from the provided URLs
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Audio faylini yuklashda xatolik: ${audioRes.statusText}`);
    const audioBuffer = await audioRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioSrc = `data:${audioRes.headers.get('content-type')};base64,${audioBase64}`;

    const captionsRes = await fetch(captionsUrl);
    if (!captionsRes.ok) throw new Error(`Sarlavha faylini yuklashda xatolik: ${captionsRes.statusText}`);
    const captionsSrt = await captionsRes.text();

    const backgroundSrc = await fileToDataUrl(backgroundPng)
    const slides = await resolveSlides(images)

    const parsedCaptions = parseSrt(captionsSrt)
    const endFromCaptions = parsedCaptions.length ? Math.max(...parsedCaptions.map((c) => c.endSeconds)) : 0
    const estFromSlides = slides.length * 3.2
    const seconds = resolveDuration(durationSeconds, endFromCaptions, estFromSlides)
    const durationInFrames = Math.max(Math.ceil(seconds * FPS), FPS * 6)

    const formatted = parsedCaptions.map((c) => ({
      text: c.text,
      startFrame: Math.max(0, Math.round(c.startSeconds * FPS)),
      endFrame: Math.round(Math.min(seconds, c.endSeconds) * FPS),
    }))

    const inputProps = {
      audioSrc,
      backgroundSrc,
      slides: slides.length ? slides : [{ src: backgroundSrc }],
      captions: formatted,
      title,
      subtitle,
      durationInFrames,
    }

    const bundleLocation = await bundle({
      entryPoint: path.join(remotionRoot, 'index.jsx'),
      outDir: path.join(os.tmpdir(), `remotion-bundle-${rand()}`),
    })
    const compositions = await getCompositions(bundleLocation, { inputProps })
    const composition = compositions.find((c) => c.id === COMPOSITION_ID)
    if (!composition) throw new Error(`Composition ${COMPOSITION_ID} topilmadi`)

    const outputLocation = path.join(os.tmpdir(), `remotion-${rand()}.mp4`)
    await renderMedia({ serveUrl: bundleLocation, composition, codec: 'h264', inputProps, outputLocation, audioCodec: 'aac', videoBitrate: '8M' })

    const buffer = await fs.readFile(outputLocation)

    const formData = new FormData();
    formData.append('file', buffer, {
      filename: `${productId}.mp4`,
      contentType: 'video/mp4',
    });

    const uploadResp = await fetch(`${ensureFilesBase(uploadUrl)}/video/${productId}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
      },
    });

    if (!uploadResp.ok) {
        const message = await uploadResp.text().catch(() => '');
        const detail = message?.trim() ? `: ${message.trim()}` : '';
        throw new Error(`Serverga yuklashda xatolik ${uploadResp.status}${detail}`);
    }

    const uploadData = await uploadResp.json().catch(() => null);
    const url = uploadData?.fileUrl || uploadData?.url || null;

    res.setHeader('Content-Type', 'application/json')
    // Normalize shape to include `url`, like other endpoints
    res.status(200).json({ url, ...(uploadData || {}) });
    await safeRm(bundleLocation); await safeRm(outputLocation)
  } catch (err) {
    console.error('Video rendering failed:', err)
    res.status(500).json({ error: err?.message || 'Video yaratishda xatolik' })
  }
}

function rand() { return crypto.randomBytes(6).toString('hex') }
async function safeRm(p) { try { await fs.rm(p, { recursive: true, force: true }) } catch {} }

async function fileToDataUrl(p) {
  try { const data = await fs.readFile(p); return `data:${mime(path.extname(p))};base64,${data.toString('base64')}` } catch { return null }
}
async function resolveSlides(ids) {
  const map = await indexLocalImages()
  const out = []
  await Promise.all((ids || []).map(async (val) => {
    const k = String(val || '').trim()
    if (!k) return
    if (map.has(k)) { out.push(map.get(k)); return }
    if (/^https?:\/\//i.test(k)) {
      const d = await httpImageToDataUrl(k).catch(() => null)
      if (d) out.push({ src: d })
      return
    }
    if (k.startsWith('data:')) { out.push({ src: k }); return }
  }))
  return out
}
async function indexLocalImages() {
  const m = new Map()
  let list = []
  try { list = await fs.readdir(imagesDir) } catch { return m }
  await Promise.all(list.map(async (name) => {
    const id = name.replace(/\.[^.]+$/, '')
    const p = path.join(imagesDir, name)
    try { const data = await fs.readFile(p); m.set(id, { src: `data:${mime(path.extname(name))};base64,${data.toString('base64')}` }) } catch {}
  }))
  return m
}
function mime(ext) {
  const e = ext.toLowerCase();
  if (e === '.png') return 'image/png'; if (e === '.jpg' || e === '.jpeg') return 'image/jpeg'; if (e === '.webp') return 'image/webp'; if (e === '.m4a') return 'audio/mp4'; if (e === '.mp3') return 'audio/mpeg'; return 'application/octet-stream'
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
async function httpImageToDataUrl(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Rasmni yuklab bo'lmadi: ${resp.status}`)
  const ct = resp.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await resp.arrayBuffer())
  const b64 = buf.toString('base64')
  return `data:${ct};base64,${b64}`
}
function resolveDuration(explicit, a, b) { const c = [explicit, a, b].filter((x) => Number.isFinite(x) && x > 0); return c.length ? Math.max(...c) : 30 }
function parseSrt(s) {
  if (!s || typeof s !== 'string') return []
  const text = s.replace(/\r/g, ''); const blocks = text.split(/\n\n+/); const out = []
  for (const b of blocks) {
    const lines = b.trim().split('\n'); if (lines.length < 2) continue
    let t = lines[0]; let content = lines.slice(1)
    if (/^\d+$/.test(lines[0])) { t = lines[1]; content = lines.slice(2) }
    const m = t.match(/(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/); if (!m) continue
    const start = tc(m[1]); const end = tc(m[2]); const line = content.join(' ').trim(); if (!Number.isFinite(start) || !Number.isFinite(end) || !line) continue
    out.push({ startSeconds: start, endSeconds: end, text: line })
  }
  return out
}
function tc(code) { const m = code.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/); if (!m) return NaN; const [,h,mi,s,ms] = m; return Number(h)*3600 + Number(mi)*60 + Number(s) + Number(ms)/1000 }
