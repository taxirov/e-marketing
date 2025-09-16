const DEFAULT_ENDPOINT = 'https://api.narakeet.com/text-to-speech/wav'

let audioContext = null

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function getAudioContext() {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext mavjud emas')
  }
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) throw new Error(`Brauzer AudioContext ni qo'llab-quvvatlamaydi`)
    audioContext = new Ctx()
  }
  return audioContext
}

function resolveEnv(name, fallback = '') {
  const value = import.meta?.env?.[name]
  return value !== undefined && value !== null && value !== '' ? value : fallback
}

function buildEndpoint(options = {}) {
  const base = options.endpoint || resolveEnv('VITE_NARAKEET_ENDPOINT', DEFAULT_ENDPOINT)
  const params = new URLSearchParams()
  const voice = options.voice || resolveEnv('VITE_NARAKEET_VOICE', '')
  if (voice) params.set('voice', voice)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export async function generateAudioFromText(text, options = {}) {
  const script = (text || '').trim()
  if (!script) throw new Error('Audio uchun matn mavjud emas')

  const apiKey = `d9oq53OreB7PVhOTzX2zV9sNALxL2HrwJ4AvwzK0`

  const endpoint = buildEndpoint(options)

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      accept: 'application/octet-stream',
      'x-api-key': apiKey,
    },
    body: script,
  })

  if (!res.ok) {
    const message = await res.text().catch(() => '')
    const detail = message?.trim() ? `: ${message.trim()}` : ''
    throw new Error(`Narakeet API xatosi ${res.status}${detail}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const base64 = arrayBufferToBase64(arrayBuffer)
  const durationHeader = res.headers.get('x-duration-seconds')
  const duration = durationHeader ? Number(durationHeader) : undefined
  const contentType = res.headers.get('content-type') || 'audio/wav'

  return { base64, duration: Number.isFinite(duration) ? duration : undefined, contentType }
}

function base64ToUint8(base64) {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function base64ToBlob(base64, type = 'audio/wav') {
  const bytes = base64ToUint8(base64)
  return new Blob([bytes], { type })
}

export function base64ToUrl(base64, type = 'audio/wav') {
  const blob = base64ToBlob(base64, type)
  return { blob, url: URL.createObjectURL(blob) }
}

export async function base64ToArrayBuffer(base64) {
  const blob = base64ToBlob(base64)
  return blob.arrayBuffer()
}

export async function getAudioDuration(base64) {
  const arrayBuffer = await base64ToArrayBuffer(base64)
  const ctx = getAudioContext()
  const copy = arrayBuffer.slice(0)
  if (ctx.decodeAudioData.length === 1) {
    const buffer = await ctx.decodeAudioData(copy)
    return buffer.duration
  }
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(copy, (buffer) => resolve(buffer.duration), reject)
  })
}

