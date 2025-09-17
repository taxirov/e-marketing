import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { bundle, renderMedia, getCompositions } from '@remotion/renderer'

export const config = {
  runtime: 'nodejs',
  maxDuration: 300,
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.join(__dirname, '..')
const remotionRoot = path.join(projectRoot, 'remotion')
const objectImagesDir = path.join(projectRoot, 'src', 'images', 'obyekt')
const backgroundPath = path.join(projectRoot, 'src', 'images', 'background.png')

const FPS = 30
const COMPOSITION_ID = 'property-video'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  let raw = ''
  for await (const chunk of req) {
    raw += chunk
  }

  let payload
  try {
    payload = raw ? JSON.parse(raw) : {}
  } catch (err) {
    res.status(400).json({ error: 'Invalid JSON' })
    return
  }

  const {
    audioBase64,
    audioContentType = 'audio/m4a',
    captions: srtText = '',
    images = [],
    durationSeconds,
    title = '',
    subtitle = '',
  } = payload || {}

  if (!audioBase64 || typeof audioBase64 !== 'string') {
    res.status(400).json({ error: 'Audio topilmadi' })
    return
  }
  if (!Array.isArray(images) || !images.length) {
    res.status(400).json({ error: 'Kamida bitta rasm tanlang' })
    return
  }

  try {
    const audioSrc = `data:${audioContentType};base64,${audioBase64}`
    const backgroundSrc = await safeReadDataUrl(backgroundPath)
    const slides = await loadSlideImages(images)
    const effectiveSlides = slides.length ? slides : [{ src: backgroundSrc }]

    const parsedCaptions = parseSrt(srtText, FPS)
    const estimatedFromCaptions = parsedCaptions.length
      ? Math.max(...parsedCaptions.map((c) => c.endSeconds))
      : 0
    const estimatedFromSlides = effectiveSlides.length * 3.2
    const durationSec = resolveDuration(durationSeconds, estimatedFromCaptions, estimatedFromSlides)
    const durationInFrames = Math.max(Math.ceil(durationSec * FPS), FPS * 6)

    const captions = parsedCaptions.map((entry) => ({
      text: entry.text,
      startFrame: Math.max(0, Math.round(entry.startSeconds * FPS)),
      endFrame: Math.min(durationInFrames, Math.round(entry.endSeconds * FPS)),
    }))

    const inputProps = {
      audioSrc,
      backgroundSrc,
      slides: effectiveSlides,
      captions,
      title,
      subtitle,
      durationInFrames,
    }

    const bundleLocation = await bundle({
      entryPoint: path.join(remotionRoot, 'index.jsx'),
      outDir: path.join(os.tmpdir(), `remotion-bundle-${randomId()}`),
    })

    const compositions = await getCompositions(bundleLocation, {
      inputProps,
    })
    const composition = compositions.find((c) => c.id === COMPOSITION_ID)
    if (!composition) {
      throw new Error(`Composition ${COMPOSITION_ID} topilmadi`)
    }

    const outputLocation = path.join(os.tmpdir(), `remotion-${randomId()}.mp4`)

    await renderMedia({
      serveUrl: bundleLocation,
      composition,
      codec: 'h264',
      inputProps,
      outputLocation,
      audioCodec: 'aac',
      videoBitrate: '8M',
    })

    const buffer = await fs.readFile(outputLocation)
    res.setHeader('Content-Type', 'video/mp4')
    res.setHeader('Content-Disposition', 'attachment; filename="property-video.mp4"')
    res.status(200).end(buffer)

    await cleanup([bundleLocation, outputLocation])
  } catch (err) {
    console.error('Video rendering failed:', err)
    res.status(500).json({ error: err?.message || 'Video yaratishda xatolik' })
  }
}

function randomId() {
  return crypto.randomBytes(6).toString('hex')
}

async function cleanup(paths) {
  await Promise.all(paths.map(async (p) => {
    if (!p) return
    try {
      await fs.rm(p, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }))
}

async function safeReadDataUrl(filePath) {
  try {
    const data = await fs.readFile(filePath)
    return `data:${mimeForExtension(path.extname(filePath))};base64,${data.toString('base64')}`
  } catch {
    return null
  }
}

async function loadSlideImages(ids) {
  const available = await indexObjectImages()
  const result = []
  ids.forEach((id) => {
    const key = String(id || '').trim()
    if (!key) return
    const match = available.get(key)
    if (match) {
      result.push(match)
    }
  })
  return result
}

async function indexObjectImages() {
  const cache = new Map()
  let entries = []
  try {
    entries = await fs.readdir(objectImagesDir)
  } catch {
    return cache
  }
  await Promise.all(entries.map(async (name) => {
    const base = name.replace(/\.[^.]+$/, '')
    const filePath = path.join(objectImagesDir, name)
    try {
      const data = await fs.readFile(filePath)
      cache.set(base, { src: `data:${mimeForExtension(path.extname(name))};base64,${data.toString('base64')}` })
    } catch {
      // ignore individual failures
    }
  }))
  return cache
}

function mimeForExtension(ext) {
  const normalized = ext.toLowerCase()
  if (normalized === '.png') return 'image/png'
  if (normalized === '.jpg' || normalized === '.jpeg') return 'image/jpeg'
  if (normalized === '.webp') return 'image/webp'
  if (normalized === '.m4a') return 'audio/mp4'
  if (normalized === '.mp3') return 'audio/mpeg'
  return 'application/octet-stream'
}

function resolveDuration(explicit, fromCaptions, fromSlides) {
  const candidates = [explicit, fromCaptions, fromSlides].filter((value) => Number.isFinite(value) && value > 0)
  if (!candidates.length) return 30
  return Math.max(...candidates)
}

function parseSrt(input, fps) {
  if (!input || typeof input !== 'string') return []
  const text = input.replace(/\r/g, '')
  const chunks = text.split(/\n\n+/)
  const result = []
  for (const chunk of chunks) {
    const lines = chunk.trim().split('\n')
    if (lines.length < 2) continue
    let timeLine = lines[0]
    let contentLines = lines.slice(1)
    if (/^\d+$/.test(lines[0])) {
      timeLine = lines[1]
      contentLines = lines.slice(2)
    }
    const match = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/)
    if (!match) continue
    const startSeconds = timecodeToSeconds(match[1])
    const endSeconds = timecodeToSeconds(match[2])
    if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) continue
    const textLine = contentLines.join(' ').trim()
    if (!textLine) continue
    result.push({ startSeconds, endSeconds, text: textLine })
  }
  return result
}

function timecodeToSeconds(code) {
  const match = code.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/)
  if (!match) return NaN
  const [, hh, mm, ss, ms] = match
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000
}
