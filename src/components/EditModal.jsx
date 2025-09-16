import React, { useEffect, useRef, useState } from 'react'
import { generateAudioFromText, base64ToUrl, getAudioDuration } from '../utils/audio'

export default function EditModal({ item, open, onClose }) {
  const [audioText, setAudioText] = useState('')
  const [audioBase64, setAudioBase64] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [audioDuration, setAudioDuration] = useState(null)
  const [audioContentType, setAudioContentType] = useState('audio/m4a')
  const [captionSrt, setCaptionSrt] = useState('')
  const [captionLoading, setCaptionLoading] = useState(false)
  const [captionError, setCaptionError] = useState('')
  const audioUrlRef = useRef('')

  const revokeAudioUrl = () => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = ''
    }
  }

  const resetAudioUrl = () => {
    revokeAudioUrl()
    setAudioUrl('')
    setAudioBase64('')
    setAudioDuration(null)
    setAudioContentType('audio/m4a')
  }

  const applyAudioBase64 = (value, meta = {}) => {
    revokeAudioUrl()
    if (!value) return
    try {
      const { url } = base64ToUrl(value, meta.contentType)
      audioUrlRef.current = url
      setAudioUrl(url)
      setAudioBase64(value)
      setAudioDuration(meta.duration ?? null)
      setAudioContentType(meta.contentType || 'audio/m4a')
    } catch (err) {
      console.error("Audio data ni o'qishda xato:", err)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !item) {
      setAudioText('')
      resetAudioUrl()
      setCaptionSrt('')
      return
    }
    try {
      const textKey = `audioText-${item.id}`
      const audioKey = `audioData-${item.id}`
      const captionKey = `captions-${item.id}`
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(textKey) : null
      setAudioText(stored || '')
      if (typeof window !== 'undefined') {
        const audioStored = window.localStorage.getItem(audioKey)
        let meta = {}
        const metaRaw = window.localStorage.getItem(`audioMeta-${item.id}`)
        if (metaRaw) {
          try {
            meta = JSON.parse(metaRaw)
          } catch (err) {
            meta = {}
          }
        }
        applyAudioBase64(audioStored || '', meta)
        const captionStored = window.localStorage.getItem(captionKey)
        setCaptionSrt(captionStored || '')
      }
    } catch (err) {
      setAudioText('')
      resetAudioUrl()
      setCaptionSrt('')
      setAudioDuration(null)
    }
    setAudioError('')
    setCaptionError('')
  }, [open, item])

  useEffect(() => () => revokeAudioUrl(), [])

  const handleGenerateAudio = () => {
    if (!item) return
    setAudioText(buildAudioTemplate(item))
  }

  const handleSaveAudio = () => {
    if (!item) return
    const key = `audioText-${item.id}`
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, audioText || '')
      }
    } catch (err) {
      console.error('Audio matnni saqlashda xatolik:', err)
    }
  }

  const handleGenerateAudioFile = async () => {
    if (!item) return
    const currentText = (audioText && audioText.trim()) || buildAudioTemplate(item)
    if (!audioText.trim()) setAudioText(currentText)
    setAudioLoading(true)
    setAudioError('')
    try {
      const { base64, duration, contentType } = await generateAudioFromText(currentText)
      applyAudioBase64(base64, { duration, contentType })
      if (duration) setAudioDuration(duration)
    } catch (err) {
      console.error('Audio yaratishda xatolik:', err)
      setAudioError(err.message || 'Audio yaratishda xatolik yuz berdi')
    } finally {
      setAudioLoading(false)
    }
  }

  const handleSaveAudioFile = () => {
    if (!item || !audioBase64) return
    const key = `audioData-${item.id}`
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, audioBase64)
        const metaKey = `audioMeta-${item.id}`
        if (audioDuration || audioContentType) {
          const metaPayload = {
            duration: Number.isFinite(audioDuration) ? audioDuration : undefined,
            contentType: audioContentType || 'audio/m4a',
          }
          window.localStorage.setItem(metaKey, JSON.stringify(metaPayload))
        } else {
          window.localStorage.removeItem(metaKey)
        }
      }
    } catch (err) {
      console.error('Audio ni saqlashda xatolik:', err)
      setAudioError('Audio ni saqlashda xatolik yuz berdi')
    }
  }

  const handleSaveCaptions = () => {
    if (!item) return
    const key = `captions-${item.id}`
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, captionSrt || '')
      }
    } catch (err) {
      console.error('SRT ni saqlashda xatolik:', err)
      setCaptionError('Video matnni saqlashda xatolik yuz berdi')
    }
  }

  const handleGenerateCaptions = async () => {
    if (!item) return
    if (!audioBase64) {
      setCaptionError('Avval audio yarating')
      return
    }
    const sourceText = (audioText && audioText.trim()) || buildAudioTemplate(item)
    if (!sourceText.trim()) {
      setCaptionError('Matn topilmadi')
      return
    }
    setCaptionLoading(true)
    setCaptionError('')
    try {
      let duration = audioDuration
      if (!duration) {
        duration = await getAudioDuration(audioBase64)
        setAudioDuration(duration)
        const metaKey = `audioMeta-${item.id}`
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            metaKey,
            JSON.stringify({
              duration: Number.isFinite(duration) ? duration : undefined,
              contentType: audioContentType || 'audio/m4a',
            })
          )
        }
      }
      const srt = buildSrtFromText(sourceText, duration)
      setCaptionSrt(srt)
    } catch (err) {
      console.error('Captions yaratishda xatolik:', err)
      setCaptionError(err.message || 'Video matn yaratishda xatolik yuz berdi')
    } finally {
      setCaptionLoading(false)
    }
  }

  if (!open || !item) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="edit-header">
          <button className="back-btn" onClick={onClose} title="Ortga">-</button>
          <div className="title">{item.id} | {item.name}</div>
          <button className="btn publish">Reklamaga chiqarish</button>
        </div>

        <div className="edit-body">
          <Section title="Audio matni:">
            {audioText ? (
              <textarea
                className="text-area"
                rows={8}
                value={audioText}
                onChange={(e) => setAudioText(e.target.value)}
              />
            ) : (
              <Placeholder text="Audio matn hali yaratilmagan..."/>
            )}
            <div className="row">
              <button className="btn" onClick={handleSaveAudio} disabled={!audioText.trim()}>
                Saqlash
              </button>
              <button className="btn ghost" onClick={handleGenerateAudio}>
                Audio matn yaratish
              </button>
            </div>
          </Section>

          <Section title="Audio:">
            {audioUrl ? (
              <audio controls src={audioUrl} />
            ) : (
              <Placeholder text="Audio hali yaratilmagan..."/>
            )}
            {audioError && <div className="error-text">{audioError}</div>}
            <div className="row">
              <button className="btn" onClick={handleSaveAudioFile} disabled={!audioBase64}>
                Saqlash
              </button>
              <button className="btn ghost" onClick={handleGenerateAudioFile} disabled={audioLoading}>
                {audioLoading ? 'Yaratilmoqda...' : 'Audioni yaratish'}
              </button>
            </div>
          </Section>

          <Section title="Video matni (Captions):">
            {captionSrt ? (
              <textarea
                className="text-area"
                rows={8}
                value={captionSrt}
                onChange={(e) => setCaptionSrt(e.target.value)}
              />
            ) : (
              <Placeholder text="Video matni hali yaratilmagan..."/>
            )}
            {captionError && <div className="error-text">{captionError}</div>}
            <div className="row">
              <button className="btn" onClick={handleSaveCaptions} disabled={!captionSrt.trim()}>
                Saqlash
              </button>
              <button className="btn ghost" onClick={handleGenerateCaptions} disabled={captionLoading}>
                {captionLoading ? 'Yaratilmoqda...' : 'Video matn yaratish'}
              </button>
            </div>
          </Section>

          <Section title="Obyekt rasmlari:">
            <div className="image-grid">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="img-card">
                  <div className="img-check" />
                  <div className="img-ph" />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Video:">
            <Placeholder text="Video hali yaratilmagan..."/>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      <div className="section-body">{children}</div>
    </div>
  )
}

function Placeholder({ text }) {
  return <div className="placeholder">{text}</div>
}

function buildAudioTemplate(item) {
  const region = (item?.region && `${item.region} viloyati`) || 'Xorazm viloyati'
  const district = (item?.district && `${item.district} tumani`) || 'Shovot tumani'
  const addressBase = item?.address?.trim() || `Yangi yo'l mahallasida`
  const address = `${addressBase} joylashgan`
  const categoryBase = item?.category || 'Noturar'
  const normalizedCategory = String(categoryBase).toLowerCase()
  const category = normalizedCategory.includes('bino')
    ? normalizedCategory
    : `${normalizedCategory} bino`
  const areaAll = formatMetric(item?.areaAll ?? item?.area, '399')
  const buildingArea = formatMetric(item?.buildingArea ?? item?.areaAll ?? item?.area, '399')
  const effective = formatMetric(item?.effectiveArea, '313')

  return (
    `${region}, ${district}, ${address} ${category} taklif qilamiz. ` +
    `Umumiy yer maydoni ${areaAll} metr kvadrat. ` +
    `Qurilish osti maydoni ${buildingArea} metr kvadrat. ` +
    `Foydali maydon ${effective} metr kvadrat. ` +
    `Bir qavatli, xom g'ishtdan qurilgan bino bo'lib. ` +
    `Suv va elektr ta'minoti mavjud. ` +
    `Joylashuvi qulay, yo'l bo'yida joylashgan. ` +
    `Batafsil ma'lumot uchun 55-517-22-20 raqamiga bog'laning! `
  )
}

function formatMetric(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(String(value).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(num)) return String(value)
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.0+$/, '')
}

function buildSrtFromText(text, durationSeconds) {
  const source = normalizeSpaces(text)
  const segments = splitTextSegments(source)
  const joined = normalizeSpaces(segments.join(' '))
  const useSegments = joined === source ? segments : [source]
  const totalWords = countWords(source)
  const total = durationSeconds > 0 ? durationSeconds : useSegments.length
  let accumulatedWords = 0

  const timed = useSegments.map((segment, idx) => {
    if (!totalWords) {
      const equalChunk = total / useSegments.length
      const start = equalChunk * idx
      const end = idx === useSegments.length - 1 ? total : equalChunk * (idx + 1)
      return { index: idx + 1, start, end, text: segment }
    }
    const words = Math.max(countWords(segment), 1)
    const startFraction = accumulatedWords / totalWords
    accumulatedWords += words
    const endFraction = idx === useSegments.length - 1 ? 1 : Math.min(1, accumulatedWords / totalWords)
    const start = total * startFraction
    const end = total * endFraction
    return { index: idx + 1, start, end, text: segment }
  })

  return timed
    .map((entry) => [
      String(entry.index),
      `${formatTimestamp(entry.start)} --> ${formatTimestamp(entry.end)}`,
      entry.text,
      '',
    ].join('\n'))
    .join('\n')
    .trim()
}

function normalizeSpaces(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function splitTextSegments(text) {
  const matches = text.match(/[^.!?]+[.!?]?/g) || []
  const trimmed = matches.map((segment) => segment.trim()).filter(Boolean)
  if (trimmed.length) return trimmed
  return [text]
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length
}

function formatTimestamp(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000))
  const ms = totalMs % 1000
  const totalSeconds = (totalMs - ms) / 1000
  const s = totalSeconds % 60
  const totalMinutes = (totalSeconds - s) / 60
  const m = totalMinutes % 60
  const h = (totalMinutes - m) / 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, '0')}`
}
