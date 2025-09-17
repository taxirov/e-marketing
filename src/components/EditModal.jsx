import React, { useEffect, useMemo, useRef, useState } from 'react'
import { generateAudioFromText, base64ToUrl, getAudioDuration, convertToLatin } from '../utils/audio'
import { useProductApi } from '../api/product'

export default function EditModal({ item, open, onClose }) {
  const { fetchProductById } = useProductApi()
  const [productDetails, setProductDetails] = useState(null)
  const [productLoading, setProductLoading] = useState(false)
  const [productError, setProductError] = useState('')
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
  const [videoUrl, setVideoUrl] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState('')
  const [selectedImages, setSelectedImages] = useState([])
  const audioUrlRef = useRef('')
  const videoUrlRef = useRef('')
  const selectedImagesRef = useRef([])
  const currentItem = useMemo(() => {
    if (productDetails?.normalized) {
      const normalized = productDetails.normalized
      const merged = item ? { ...item, ...normalized } : { ...normalized }
      return { ...merged, raw: productDetails.raw || normalized.raw }
    }
    return item || null
  }, [productDetails, item])
  const currentItemId = useMemo(() => {
    if (currentItem && currentItem.id !== undefined && currentItem.id !== null) return currentItem.id
    if (item && item.id !== undefined && item.id !== null) return item.id
    return null
  }, [currentItem, item])
  const hasItemId = currentItemId !== null && currentItemId !== undefined
  const availableImages = useMemo(() => {
    if (Array.isArray(productDetails?.raw?.photos) && productDetails.raw.photos.length) {
      return productDetails.raw.photos
        .map((photo, index) => {
          const url = photo?.url || ''
          if (!url) return null
          const id = photo?.id ?? photo?.uuid ?? `photo-${index}`
          return {
            id: String(id),
            url,
            name: photo?.name || '',
            original: photo,
          }
        })
        .filter(Boolean)
    }
    if (productDetails?.raw?.photo?.url) {
      const photo = productDetails.raw.photo
      const id = photo?.id ?? photo?.uuid ?? 'main'
      return [
        {
          id: String(id),
          url: photo.url,
          name: photo?.name || '',
          original: photo,
        },
      ]
    }
    return []
  }, [productDetails])
  const imageMap = useMemo(() => {
    return availableImages.reduce((acc, image) => {
      acc[image.id] = image
      return acc
    }, {})
  }, [availableImages])
  const allImageIds = useMemo(() => availableImages.map((img) => img.id), [availableImages])
  const selectedImageEntries = useMemo(
    () => selectedImages.map((id) => imageMap[id]).filter(Boolean),
    [selectedImages, imageMap]
  )

  const totalImages = availableImages.length

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
    if (!open || !item?.id) {
      setProductDetails(null)
      setProductError('')
      setProductLoading(false)
      return
    }

    let cancelled = false
    setProductLoading(true)
    setProductError('')

    fetchProductById(item.id)
      .then((data) => {
        if (cancelled) return
        setProductDetails(data)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Obyekt maʼlumotlarini yuklashda xatolik:', err)
        setProductError(err.message || 'Obyekt maʼlumotlarini yuklab boʼlmadi')
        setProductDetails(null)
      })
      .finally(() => {
        if (cancelled) return
        setProductLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, item?.id, fetchProductById])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !hasItemId) {
      setAudioText('')
      resetAudioUrl()
      setCaptionSrt('')
      setSelectedImages([])
      selectedImagesRef.current = []
      setAudioDuration(null)
      return
    }

    let parsedSelection = []
    try {
      const textKey = `audioText-${currentItemId}`
      const audioKey = `audioData-${currentItemId}`
      const captionKey = `captions-${currentItemId}`
      const stored = typeof window !== 'undefined' ? window.localStorage.getItem(textKey) : null
      setAudioText(stored || '')
      if (typeof window !== 'undefined') {
        const audioStored = window.localStorage.getItem(audioKey)
        let meta = {}
        const metaRaw = window.localStorage.getItem(`audioMeta-${currentItemId}`)
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

        const imageKey = `videoImages-${currentItemId}`
        const selectionRaw = window.localStorage.getItem(imageKey)
        if (selectionRaw) {
          try {
            const parsed = JSON.parse(selectionRaw)
            const arr = Array.isArray(parsed) ? parsed : []
            const filtered = arr.filter((id) => imageMap[id])
            parsedSelection = filtered
            const hasImages = Object.keys(imageMap).length > 0
            if (
              typeof window !== 'undefined' &&
              hasImages &&
              filtered.length !== arr.length
            ) {
              window.localStorage.setItem(imageKey, JSON.stringify(filtered))
            }
          } catch (err) {
            parsedSelection = []
          }
        }
      }
    } catch (err) {
      setAudioText('')
      resetAudioUrl()
      setCaptionSrt('')
      setAudioDuration(null)
      parsedSelection = []
    }

    setSelectedImages(parsedSelection)
    selectedImagesRef.current = parsedSelection
    setAudioError('')
    setCaptionError('')
  }, [open, currentItemId, imageMap, hasItemId])

  useEffect(() => {
    if (!open || !hasItemId) {
      selectedImagesRef.current = []
      return
    }

    selectedImagesRef.current = selectedImages
    try {
      if (typeof window !== 'undefined') {
        const key = `videoImages-${currentItemId}`
        window.localStorage.setItem(key, JSON.stringify(selectedImages))
      }
    } catch (err) {
      console.error('Video rasmlarini saqlashda xatolik:', err)
    }
  }, [selectedImages, open, currentItemId, hasItemId])

  useEffect(() => () => {
    revokeAudioUrl()
    revokeVideoUrl()
  }, [])

  const handleGenerateAudio = async () => {
    if (!currentItem) return
    const baseText = buildAudioTemplate(currentItem)
    try {
      const converted = await convertToLatin(baseText)
      const finalText = converted && typeof converted === 'string' && converted.trim() ? converted.trim() : baseText
      setAudioText(finalText)
      setAudioError('')
    } catch (err) {
      console.error("Matnni lotinga o'girishda xatolik:", err)
      setAudioText(baseText)
      setAudioError("Matnni lotinga o'girishda xatolik yuz berdi")
    }
  }

  const handleSaveAudio = () => {
    if (!hasItemId) return
    const key = `audioText-${currentItemId}`
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, audioText || '')
      }
    } catch (err) {
      console.error('Audio matnni saqlashda xatolik:', err)
    }
  }

  const handleGenerateAudioFile = async () => {
    if (!currentItem) return
    const baseText = (audioText && audioText.trim()) || buildAudioTemplate(currentItem)
    let currentText = baseText

    try {
      const converted = await convertToLatin(baseText)
      if (converted && typeof converted === 'string' && converted.trim()) {
        currentText = converted.trim()
      }
    } catch (err) {
      console.error("Matnni lotinga o'girishda xatolik:", err)
      setAudioError("Matnni lotinga o'girishda xatolik yuz berdi")
    }

    if (!audioText.trim()) setAudioText(currentText)
    setAudioLoading(true)
    setAudioError('')
    try {
      const { base64, duration, contentType } = await generateAudioFromText(currentText)
      applyAudioBase64(base64, { duration, contentType })

      let effectiveDuration = duration
      if (!Number.isFinite(effectiveDuration)) {
        try {
          effectiveDuration = await getAudioDuration(base64)
        } catch (durErr) {
          console.error('Audio davomiyligini aniqlashda xatolik:', durErr)
        }
      }
      if (Number.isFinite(effectiveDuration)) {
        setAudioDuration(effectiveDuration)
      }

      const srt = buildSrtFromText(currentText, effectiveDuration ?? audioDuration ?? 0)
      setCaptionSrt(srt)
      setCaptionError('')

      if (typeof window !== 'undefined' && hasItemId) {
        const metaKey = `audioMeta-${currentItemId}`
        const payload = {
          duration: Number.isFinite(effectiveDuration) ? effectiveDuration : undefined,
          contentType: contentType || 'audio/m4a',
        }
        window.localStorage.setItem(metaKey, JSON.stringify(payload))
        window.localStorage.setItem(`captions-${currentItemId}`, srt)
        window.localStorage.setItem(`audioText-${currentItemId}`, currentText)
      }
    } catch (err) {
      console.error('Audio yaratishda xatolik:', err)
      setAudioError(err.message || 'Audio yaratishda xatolik yuz berdi')
    } finally {
      setAudioLoading(false)
    }
  }

  const handleSaveAudioFile = () => {
    if (!hasItemId || !audioBase64) return
    const key = `audioData-${currentItemId}`
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, audioBase64)
        const metaKey = `audioMeta-${currentItemId}`
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
    if (!hasItemId) return
    const key = `captions-${currentItemId}`
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
    if (!currentItem) return
    if (!audioBase64) {
      setCaptionError('Avval audio yarating')
      return
    }
    const sourceText = (audioText && audioText.trim()) || buildAudioTemplate(currentItem)
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
        if (typeof window !== 'undefined' && hasItemId) {
          const metaKey = `audioMeta-${currentItemId}`
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

  const handleToggleImageSelect = (imageId) => {
    setSelectedImages((prev) => {
      const next = new Set(prev)
      if (next.has(imageId)) {
        next.delete(imageId)
      } else if (imageMap[imageId]) {
        next.add(imageId)
      }
      return Array.from(next)
    })
  }

  const handleSelectAllImages = () => {
    setSelectedImages((prev) => {
      if (prev.length === totalImages && totalImages) {
        return prev
      }
      return Array.from(allImageIds)
    })
  }

  const handleClearImageSelection = () => {
    setSelectedImages((prev) => (prev.length ? [] : prev))
  }

  if (!open || !currentItem) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="edit-header">
          <button className="back-btn" onClick={onClose} title="Ortga">x</button>
          <div className="title">{currentItemId} | {currentItem?.name}</div>
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
            {productLoading ? (
              <Placeholder text="Obyekt ma'lumotlari yuklanmoqda..." />
            ) : totalImages ? (
              <>
                <div className="image-toolbar">
                  <div className="image-toolbar-status">
                    Tanlangan: {selectedImageEntries.length} / {totalImages}
                  </div>
                  <div className="image-toolbar-actions">
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={handleSelectAllImages}
                      disabled={!totalImages || selectedImageEntries.length === totalImages}
                    >
                      Hammasini tanlash
                    </button>
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={handleClearImageSelection}
                      disabled={!selectedImageEntries.length}
                    >
                      Tanlovni tozalash
                    </button>
                  </div>
                </div>
                <div className="image-grid">
                  {availableImages.map((image, index) => {
                    const isSelected = selectedImages.includes(image.id)
                    const altLabel = `Obyekt rasm ${index + 1}`
                    return (
                      <button
                        type="button"
                        key={image.id}
                        className={`img-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleImageSelect(image.id)}
                        aria-pressed={isSelected}
                        title={isSelected ? 'Rasm tanlangan' : 'Rasmni tanlash'}
                      >
                        <span className="img-check" aria-hidden="true">
                          {isSelected && (
                            <svg viewBox="0 0 16 16" width="16" height="16">
                              <path
                                d="M3 8.5 6.5 12 13 4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <img src={image.url} alt={altLabel} loading="lazy" />
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <Placeholder text="Obyekt rasmlari topilmadi" />
            )}
            {productError && <div className="error-text">{productError}</div>}
          </Section>

          <Section title="Video:">
            {videoUrl ? (
              <video controls src={videoUrl} className="video-player" />
            ) : (
              <Placeholder
                text={
                  videoLoading
                    ? 'Video yaratilmoqda...'
                    : selectedImageEntries.length
                      ? `Video hali yaratilmagan. Tanlangan rasmlar: ${selectedImageEntries.length} ta.`
                      : 'Video hali yaratilmagan. Kamida bitta rasm tanlang.'
                }
              />
            )}
            {videoError && <div className="error-text">{videoError}</div>}
            <div className="row">
              <button className="btn" onClick={handleDownloadVideo} disabled={!videoUrl || videoLoading}>
                Yuklab olish
              </button>
              <button
                className="btn ghost"
                onClick={handleGenerateVideo}
                disabled={videoLoading || !audioBase64 || !selectedImages.length}
              >
                {videoLoading ? 'Yaratilmoqda...' : 'Videoni yaratish'}
              </button>
            </div>
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
  const rawRegion = item?.productRegion || item?.raw?.productOrder?.region || item?.raw?.region || null
  const parentName = rawRegion?.parent?.name || rawRegion?.parent?.parent?.name || item?.region || ''
  const regionName = rawRegion?.name || item?.district || ''
  const mfyName = item?.productMfy?.name || item?.raw?.productOrder?.mfy?.name || ''
  const mfyWord = mfyName.trim().split(/\s+/)[0] || ''
  const categoryText = (() => {
    const map = { 19: 'noturar binoni', 8: 'kvartirani', 12: 'xususiy uyni' }
    if (map[item?.categoryId]) return map[item.categoryId]
    if (item?.category) return `${String(item.category).toLowerCase()}ni`
    return 'obyektni'
  })()
  const areaAll = formatRounded(item?.areaAll ?? item?.area)
  const buildingArea = formatRounded(item?.buildingArea ?? item?.areaAll ?? item?.area)
  const effectiveArea = formatRounded(item?.effectiveArea || item?.area_living)
  const typeOfBuilding = (() => {
    const base = item?.typeOfBuildingLabel || item?.typeOfBuilding
    if (!base || !String(base).trim()) return "maʻlumot koʻrsatilmagan"
    return String(base).trim().toLowerCase()
  })()
  const floorsBuilding = normalizeValue(item?.floorsBuilding)
  const floors = normalizeValue(item?.floors)
  const floorsSentence = item?.separateBuilding
    ? `Uy qavatliligi ${floorsBuilding}.`
    : `Uy qavatliligi ${floorsBuilding}, qavati ${floors}.`
  const communications = formatCommunications(item?.engineerCommunications)

  const sentences = [
    normalizeSpaces(`${parentName || ''} ${regionName || ''} ${mfyWord ? `${mfyWord} mahallasida` : ''} joylashgan ${categoryText} taklif qilamiz.`),
    `Umumiy yer maydoni ${areaAll} metr kvadrat.`,
    `Qurilish osti maydoni ${buildingArea} metr kvadrat.`,
    `Foydali maydoni ${effectiveArea} metr kvadrat.`,
    normalizeSpaces(`Qurilish turi ${typeOfBuilding}.`),
    normalizeSpaces(floorsSentence),
    communications ? `${communications} taʻminoti mavjud.` : `Taʻminot bo'yicha maʻlumot mavjud emas.`,
    'Joylashuvi qulay.',
    `Batafsil maʻlumot uchun 55 517 22 20 raqamiga bogʻlaning!`,
  ]

  return sentences.join(' ')
}

function formatRounded(value, fallback = "maʻlumot koʻrsatilmagan") {
  if (value === null || value === undefined || value === '') return fallback
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return String(Math.round(num))
}

function normalizeValue(value, fallback = "maʻlumot ko'rsatilmagan") {
  if (value === null || value === undefined) return fallback
  const str = String(value).trim()
  return str ? str : fallback
}

function formatCommunications(values) {
  if (!Array.isArray(values) || !values.length) return ''
  const titles = {
    water_supply: 'Suv',
    electric_lighting: 'Elektr',
    gas_supply: 'Gaz',
    sewage: 'Kanalizatsiya',
  }
  return values
    .map((code) => titles[code] || code)
    .filter(Boolean)
    .join(', ')
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



















