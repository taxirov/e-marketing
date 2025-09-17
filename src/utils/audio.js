const API_ENDPOINT = '/api/tts'

let audioContext = null

function getAudioContext() {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext mavjud emas')
  }
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) throw new Error('Brauzer AudioContext ni qo\'llab-quvvatlamaydi')
    audioContext = new Ctx()
  }
  return audioContext
}

export async function generateAudioFromText(text, options = {}) {
  const script = (text || '').trim()
  if (!script) throw new Error('Audio uchun matn mavjud emas')

  const payload = { text: script }
  if (options.voice) payload.voice = options.voice
  if (options.format) payload.format = options.format
  if (options.contentType) payload.contentType = options.contentType

  const res = await fetch(options.endpoint || API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const message = await res.text().catch(() => '')
    const detail = message?.trim() ? `: ${message.trim()}` : ''
    throw new Error(`Audio servisi xatosi ${res.status}${detail}`)
  }

  const data = await res.json()
  if (!data?.base64) throw new Error('Audio servisi noto\'gri javob qaytardi')

  return {
    base64: data.base64,
    duration: Number.isFinite(data.duration) ? data.duration : undefined,
    contentType: data.contentType || 'audio/m4a',
  }
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

export function base64ToBlob(base64, type = 'audio/m4a') {
  const bytes = base64ToUint8(base64)
  return new Blob([bytes], { type })
}

export function base64ToUrl(base64, type = 'audio/m4a') {
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

// Decode audio from a remote URL and return duration (seconds)
export async function getAudioDurationFromUrl(url) {
  const target = String(url || '').trim();
  if (!target) throw new Error('Audio URL topilmadi');
  const res = await fetch(target, { cache: 'no-store' });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    const detail = msg?.trim() ? `: ${msg.trim()}` : '';
    throw new Error(`Audio URL ni yuklashda xato ${res.status}${detail}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const ctx = getAudioContext();
  const copy = arrayBuffer.slice(0);
  if (ctx.decodeAudioData.length === 1) {
    const buffer = await ctx.decodeAudioData(copy);
    return buffer.duration;
  }
  return new Promise((resolve, reject) => {
    ctx.decodeAudioData(copy, (buffer) => resolve(buffer.duration), reject);
  });
}

export async function convertToLatin(text) {
  const payload = { text: text || '' }
  const res = await fetch('/api/latin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const message = await res.text().catch(() => '')
    const detail = message?.trim() ? `: ${message.trim()}` : ''
    throw new Error(`Matnni lotinga o'girishda xatolik${detail}`)
  }

  const data = await res.json().catch(() => null)
  return data?.text || payload.text
}
