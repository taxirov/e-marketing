<<<<<<< ours
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateAudioText, generateAudioFile, generateCaptionFile, generateVideo, saveCaptionText, fetchFilesForProduct, saveAudioText, generateVideoCaptionText, saveVideoCaptionText } from '../services/api';
import { getAudioDurationFromUrl } from '../utils/audio';
import { useApi } from '../utils/api';

const UPLOAD_SERVER_URL = 'https://e-content.webpack.uz/api/files';

=======
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
>>>>>>> theirs

export default function EditModal({ item, open, onClose }) {
  const { apiFetch } = useApi();
  const [audioText, setAudioText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioTextUrl, setAudioTextUrl] = useState('');
  const [audioTextLoading, setAudioTextLoading] = useState(false);
  const [audioFileLoading, setAudioFileLoading] = useState(false);
  const [audioTextSaveLoading, setAudioTextSaveLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [audioDuration, setAudioDuration] = useState(null);

  const [captionUrl, setCaptionUrl] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState('');
  const [captionSaveLoading, setCaptionSaveLoading] = useState(false);

  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoCaptionUrl, setVideoCaptionUrl] = useState('');
  const [videoCaptionText, setVideoCaptionText] = useState('');
  const [videoCaptionSaveLoading, setVideoCaptionSaveLoading] = useState(false);
  const [videoCaptionError, setVideoCaptionError] = useState('');

  // Photos fetched per item from API
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState('');
  const photoMap = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const [selectedImages, setSelectedImages] = useState([]); // stores photo ids
  const selectedImageEntries = useMemo(() => selectedImages.map((id) => photoMap.get(id)).filter(Boolean), [selectedImages, photoMap]);
  const allImageIds = useMemo(() => photos.map((p) => p.id), [photos]);
  const totalImages = photos.length;

  // Reset state on open/close; actual values come from GET /api/files/:id
  useEffect(() => {
<<<<<<< ours
    if (!open || !item) {
      setAudioText('');
      setAudioUrl('');
      setAudioTextUrl('');
      setCaptionUrl('');
      setCaptionText('');
      setVideoUrl('');
      setSelectedImages([]);
      setPhotos([]);
      setPhotosError('');
      setPhotosLoading(false);
      setVideoCaptionUrl('');
      setVideoCaptionText('');
      setVideoCaptionError('');
=======
    if (!open || !hasItemId) {
      setAudioText('')
      resetAudioUrl()
      setCaptionSrt('')
      setSelectedImages([])
      selectedImagesRef.current = []
      setAudioDuration(null)
      return
>>>>>>> theirs
    }
  }, [open, item]);

<<<<<<< ours
  // Fetch real photos for the item when modal opens
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open || !item?.id) return;
      setPhotosLoading(true);
      setPhotosError('');
      try {
        const res = await apiFetch(`/api/product/${item.id}`, { method: 'GET' });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `Rasmlar API xatosi: ${res.status}`);
        }
        const data = await res.json();
        const list = Array.isArray(data?.photos) ? data.photos : [];
        const mapped = list
          .map((p, idx) => {
            const url = p?.url || p?.imageUrl || p?.src || '';
            const id = p?.id || url || String(idx);
            return url ? { id: String(id), url: String(url) } : null;
          })
          .filter(Boolean);
        if (!cancelled) {
          setPhotos(mapped);
          // Filter selected images to existing ones
          setSelectedImages((cur) => cur.filter((id) => mapped.find((m) => m.id === id)));
=======
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
>>>>>>> theirs
        }
      } catch (err) {
        console.error('Rasmlarni yuklashda xatolik:', err);
        if (!cancelled) setPhotosError(err.message || 'Rasmlarni yuklashda xatolik');
      } finally {
        if (!cancelled) setPhotosLoading(false);
      }
    }
    run();
    return () => { cancelled = true };
  }, [open, item?.id]);

<<<<<<< ours
  // Do not persist anything to localStorage
  
  // Set audio duration
  useEffect(() => {
    const playable = toPlayableUrl(audioUrl)
    if (playable) {
      getAudioDurationFromUrl(playable)
        .then(duration => setAudioDuration(duration))
        .catch(err => console.error("Audio davomiyligini aniqlashda xato:", err));
    } else {
      setAudioDuration(null);
=======
    setSelectedImages(parsedSelection)
    selectedImagesRef.current = parsedSelection
    setAudioError('')
    setCaptionError('')
  }, [open, currentItemId, imageMap, hasItemId])

  useEffect(() => {
    if (!open || !hasItemId) {
      selectedImagesRef.current = []
      return
>>>>>>> theirs
    }
  }, [audioUrl]);

<<<<<<< ours
  // When modal opens, GET already generated files from upload server
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open || !item?.id) return;
      try {
        const meta = await fetchFilesForProduct(UPLOAD_SERVER_URL, item.id);
        if (cancelled) return;
        if (meta.audioTextUrl) setAudioTextUrl(meta.audioTextUrl);
        if (meta.audioUrl) setAudioUrl(meta.audioUrl);
        if (meta.captionUrl) setCaptionUrl(meta.captionUrl);
        if (meta.videoUrl) setVideoUrl(meta.videoUrl);
        if (meta.videoCaptionUrl) setVideoCaptionUrl(meta.videoCaptionUrl);
      } catch (err) {
        // Keep silent, just log for debugging; UI should not break
        console.error('Fayllarni olishda xato:', err);
=======
    selectedImagesRef.current = selectedImages
    try {
      if (typeof window !== 'undefined') {
        const key = `videoImages-${currentItemId}`
        window.localStorage.setItem(key, JSON.stringify(selectedImages))
>>>>>>> theirs
      }
    }
<<<<<<< ours
    run();
    return () => { cancelled = true };
  }, [open, item?.id]);

  // Load caption text from URL (GET like audio verification)
  useEffect(() => {
    let cancelled = false;
    async function fetchCaption() {
      if (!open || !item) return;
      if (!captionUrl) return;
      try {
        const resp = await fetch(toPlayableUrl(captionUrl));
        if (!resp.ok) throw new Error('Video matnini olishda xato');
        const txt = await resp.text();
        if (!cancelled) {
          setCaptionText(txt || '');
        }
      } catch (err) {
        // Do not surface noisy errors; keep UI usable
        console.error('Caption GET xato:', err);
      }
=======
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
>>>>>>> theirs
    }
    fetchCaption();
    return () => { cancelled = true };
  }, [open, item, captionUrl]);

<<<<<<< ours
  // Load audio text from URL if present and no local text yet
  useEffect(() => {
    let cancelled = false;
    async function loadAudioText() {
      if (!open || !item) return;
      if (!audioTextUrl) return;
      if (audioText && audioText.trim()) return; // already loaded
      try {
        const resp = await fetch(toPlayableUrl(audioTextUrl));
        if (!resp.ok) throw new Error('Audio matnini olishda xato');
        const txt = await resp.text();
        if (!cancelled) {
          setAudioText(txt || '');
        }
      } catch (err) {
        console.error('Audio matn GET xato:', err);
=======
  const handleSaveAudio = () => {
    if (!hasItemId) return
    const key = `audioText-${currentItemId}`
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, audioText || '')
>>>>>>> theirs
      }
    }
    loadAudioText();
    return () => { cancelled = true };
  }, [open, item, audioTextUrl]);

<<<<<<< ours
  // Load video caption text from URL
  useEffect(() => {
    let cancelled = false;
    async function loadVideoCaption() {
      if (!open || !item) return;
      if (!videoCaptionUrl) return;
      try {
        const resp = await fetch(toPlayableUrl(videoCaptionUrl));
        if (!resp.ok) throw new Error('Video tasnifini olishda xato');
        const txt = await resp.text();
        if (!cancelled) {
        setVideoCaptionText(txt || '');
        setVideoCaptionError('');
      }
      } catch (err) {
        console.error('Video tasnif GET xato:', err);
        if (!cancelled) {
          setVideoCaptionError(err.message || 'Video tasnifini yuklab bo\'lmadi');
        }
=======
  const handleGenerateAudioFile = async () => {
    if (!currentItem) return
    const baseText = (audioText && audioText.trim()) || buildAudioTemplate(currentItem)
    let currentText = baseText

    try {
      const converted = await convertToLatin(baseText)
      if (converted && typeof converted === 'string' && converted.trim()) {
        currentText = converted.trim()
>>>>>>> theirs
      }
    }
    loadVideoCaption();
    return () => { cancelled = true };
  }, [open, item, videoCaptionUrl]);

  const handleSaveVideoCaption = async () => {
    if (!item) return;
    const text = String(videoCaptionText || '').trim();
    if (!text) return;
    setVideoCaptionSaveLoading(true);
    setVideoCaptionError('');
    try {
      const url = await saveVideoCaptionText(text, UPLOAD_SERVER_URL, item.id);
      setVideoCaptionUrl(url);
    } catch (err) {
      console.error('Video tasnifni saqlashda xato:', err);
      setVideoCaptionError(err.message || 'Video tasnifni saqlashda xatolik yuz berdi');
    } finally {
      setVideoCaptionSaveLoading(false);
    }
  };

  const handleGenerateVideoCaption = () => {
    if (!item) {
      setVideoCaptionError('Obyekt tanlanmagan');
      return;
    }
    try {
      const generated = generateVideoCaptionText(item);
      setVideoCaptionText(generated);
      setVideoCaptionError('');
    } catch (err) {
      console.error('Video tasnifni yaratishda xatolik:', err);
      setVideoCaptionError(err.message || 'Video tasnifini yaratishda xatolik yuz berdi');
    }
  };

  const handleGenerateAudioText = async () => {
    if (!item) return;
    setAudioTextLoading(true);
    setAudioError('');
    try {
<<<<<<< ours
      const { text, url } = await generateAudioText(item.id, item, UPLOAD_SERVER_URL);
      setAudioText(text);
      setAudioTextUrl(url);
=======
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
>>>>>>> theirs
    } catch (err) {
      console.error("Audio matnni yaratishda xatolik:", err);
      setAudioError(err.message || "Audio matnni yaratishda xatolik yuz berdi");
    } finally {
      setAudioTextLoading(false);
    }
  };

<<<<<<< ours
  const handleGenerateAudioFile = async () => {
    if (!item || !audioText.trim()) {
      setAudioError("Avval audio matnini yaratish kerak");
      return;
    }
    setAudioFileLoading(true);
    setAudioError('');
    try {
      const url = await generateAudioFile(audioText, UPLOAD_SERVER_URL, item.id);
      setAudioUrl(url);
      try {
        const dur = await getAudioDurationFromUrl(toPlayableUrl(url));
        setAudioDuration(dur);
      } catch {}
=======
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
>>>>>>> theirs
    } catch (err) {
      console.error('Audio fayl yaratishda xatolik:', err);
      setAudioError(err.message || 'Audio fayl yaratishda xatolik yuz berdi');
    } finally {
      setAudioFileLoading(false);
    }
<<<<<<< ours
  };

  const handleSaveAudioText = async () => {
    if (!item) return;
    const script = String(audioText || '').trim();
    if (!script) { setAudioError('Audio matni bo\'sh'); return; }
    setAudioTextSaveLoading(true);
    setAudioError('');
=======
  }

  const handleSaveCaptions = () => {
    if (!hasItemId) return
    const key = `captions-${currentItemId}`
>>>>>>> theirs
    try {
      const { text, url } = await saveAudioText(script, UPLOAD_SERVER_URL, item.id);
      // Update with Latin from server
      setAudioText(text || script);
      setAudioTextUrl(url);
    } catch (err) {
      console.error('Audio matnni saqlashda xato:', err);
      setAudioError(err.message || 'Audio matnni saqlashda xatolik');
    } finally {
      setAudioTextSaveLoading(false);
    }
  };

  const handleGenerateCaptions = async () => {
<<<<<<< ours
    if (!item || !audioUrl) {
      setCaptionError("Avval audio faylni yaratish kerak");
      return;
    }
    setCaptionLoading(true);
    setCaptionError('');
    try {
        const audioDur = audioDuration || await getAudioDurationFromUrl(audioUrl);
        setAudioDuration(audioDur);
        const url = await generateCaptionFile(audioText, audioDur, UPLOAD_SERVER_URL, item.id);
        setCaptionUrl(url);
        // Refresh caption text after generating
        try {
          const resp = await fetch(toPlayableUrl(url));
          if (resp.ok) {
            const txt = await resp.text();
            setCaptionText(txt || '');
          }
        } catch {}
        // no persistence
    } catch (err) {
      console.error('Sarlavha yaratishda xatolik:', err);
      setCaptionError(err.message || 'Sarlavha yaratishda xatolik yuz berdi');
    } finally {
      setCaptionLoading(false);
    }
  };
  
  const handleGenerateVideo = async () => {
    if (!item || !audioUrl || !captionUrl || !selectedImages.length) {
      setVideoError("Video yaratish uchun audio, sarlavha va rasmlar kerak");
      return;
=======
    if (!currentItem) return
    if (!audioBase64) {
      setCaptionError('Avval audio yarating')
      return
    }
    const sourceText = (audioText && audioText.trim()) || buildAudioTemplate(currentItem)
    if (!sourceText.trim()) {
      setCaptionError('Matn topilmadi')
      return
>>>>>>> theirs
    }
    setVideoLoading(true);
    setVideoError('');
    try {
<<<<<<< ours
      // Pass image URLs to video renderer (supports http/https/data URLs)
      const imageUrls = selectedImageEntries.map((e) => e.url);
      const url = await generateVideo(item, audioUrl, captionUrl, imageUrls, UPLOAD_SERVER_URL);
      setVideoUrl(url);
=======
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
>>>>>>> theirs
    } catch (err) {
      console.error('Video yaratishda xatolik:', err);
      setVideoError(err.message || 'Video yaratishda xatolik yuz berdi');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleToggleImageSelect = (imageId) => {
    setSelectedImages((prev) => {
<<<<<<< ours
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else if (photoMap.has(imageId)) next.add(imageId);
      const newSelection = Array.from(next);
      return newSelection;
    });
  };

  const handleSaveCaptions = async () => {
    if (!item) return;
    const srt = String(captionText || '').trim();
    if (!srt) { setCaptionError('Video matni bo\'sh'); return; }
    setCaptionSaveLoading(true);
    setCaptionError('');
    try {
      const url = await saveCaptionText(srt, UPLOAD_SERVER_URL, item.id);
      setCaptionUrl(url);
    } catch (err) {
      console.error('Sarlavhani saqlashda xatolik:', err);
      setCaptionError(err.message || 'Sarlavhani saqlashda xatolik');
    } finally {
      setCaptionSaveLoading(false);
    }
  };
=======
      const next = new Set(prev)
      if (next.has(imageId)) {
        next.delete(imageId)
      } else if (imageMap[imageId]) {
        next.add(imageId)
      }
      return Array.from(next)
    })
  }
>>>>>>> theirs

  const handleSelectAllImages = () => {
    setSelectedImages(allImageIds);
  };

  const handleClearImageSelection = () => {
    setSelectedImages([]);
  };

  const handleDownloadFile = (url, filename) => {
    if (!url) return;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Faylni yuklab olishda xatolik:', err);
    }
  };
  
  const getAudioContext = () => {
    if (typeof window === 'undefined') {
        throw new Error("AudioContext mavjud emas");
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error("Brauzer AudioContext ni qo'llab-quvvatlamaydi");
    return new Ctx();
  };

<<<<<<< ours
  if (!open || !item) return null;
=======
  if (!open || !currentItem) return null
>>>>>>> theirs

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
            <textarea
              className="text-area"
              rows={8}
              placeholder="Audio matn hali yaratilmagan..."
              value={audioText}
              onChange={(e) => setAudioText(e.target.value)}
            />
            <div className="row">
              <button className="btn" onClick={handleGenerateAudioText} disabled={audioTextLoading}>
                {audioTextLoading ? 'Yaratilmoqda...' : 'Audio matn yaratish'}
              </button>
              {audioTextUrl && <CopyButton url={audioTextUrl} />}
              <button className="btn ghost" onClick={handleSaveAudioText} disabled={audioTextSaveLoading || !audioText.trim()} title="Saqlash">
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14V7l-4-4z"/>
                    <path fill="currentColor" d="M12 4h3l2 2v3h-5V4z"/>
                  </svg>
                  {audioTextSaveLoading ? 'Saqlanmoqda...' : 'Saqlash'}
                </span>
              </button>
            </div>
            {audioError && <div className="error-text">{audioError}</div>}
          </Section>

          <Section title="Audio:">
            {audioUrl ? (
              <>
                <audio controls src={toPlayableUrl(audioUrl)} className="audio-player" />
            </>
          ) : (
            <Placeholder text="Audio hali yaratilmagan..."/>
          )}
          <div className="row">
            <button className="btn" onClick={handleGenerateAudioFile} disabled={audioFileLoading || !audioText.trim()}>
              {audioFileLoading ? 'Yaratilmoqda...' : 'Audioni yaratish'}
            </button>
            {audioUrl && <CopyButton url={audioUrl} />}
            {audioUrl && <button className="btn ghost" onClick={() => handleDownloadFile(audioUrl, `audio-${item.id}.m4a`)}>Yuklab olish</button>}
          </div>
        </Section>

        <Section title="Video matni (Captions):">
            <textarea
              className="text-area"
              placeholder="Video matni hali yaratilmagan..."
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              spellCheck={false}
            />
            {captionError && <div className="error-text">{captionError}</div>}
            <div className="row">
              <button className="btn" onClick={handleGenerateCaptions} disabled={captionLoading || !audioUrl}>
                {captionLoading ? 'Yaratilmoqda...' : 'Video matn yaratish'}
              </button>
              {captionUrl && <CopyButton url={captionUrl} />}
              <button className="btn ghost" onClick={handleSaveCaptions} disabled={captionSaveLoading || !captionText.trim()} title="Saqlash">
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14V7l-4-4z"/>
                    <path fill="currentColor" d="M12 4h3l2 2v3h-5V4z"/>
                  </svg>
                  {captionSaveLoading ? 'Saqlanmoqda...' : 'Saqlash'}
                </span>
              </button>
            </div>
          </Section>

          <Section title="Obyekt rasmlari:">
<<<<<<< ours
            {photosLoading ? (
              <Placeholder text="Rasmlar yuklanmoqda..." />
=======
            {productLoading ? (
              <Placeholder text="Obyekt ma'lumotlari yuklanmoqda..." />
>>>>>>> theirs
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
<<<<<<< ours
                  {photos.map((image, index) => {
                    const isSelected = selectedImages.includes(image.id);
                    const altLabel = `Obyekt rasm ${index + 1}`;
=======
                  {availableImages.map((image, index) => {
                    const isSelected = selectedImages.includes(image.id)
                    const altLabel = `Obyekt rasm ${index + 1}`
>>>>>>> theirs
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
                    );
                  })}
                </div>
              </>
            ) : photosError ? (
              <div className="error-text">{photosError}</div>
            ) : (
              <Placeholder text="Obyekt rasmlari topilmadi" />
            )}
            {productError && <div className="error-text">{productError}</div>}
          </Section>

          <Section title="Video:">
            {videoUrl ? (
              <>
                <video controls src={toPlayableUrl(videoUrl)} className="video-player" />
              </>
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
              <button className="btn" onClick={handleGenerateVideo} disabled={videoLoading || !audioUrl || !captionUrl || !selectedImages.length}>
                {videoLoading ? 'Yaratilmoqda...' : 'Videoni yaratish'}
              </button>
              {videoUrl && <CopyButton url={videoUrl} />}
              {videoUrl && <button className="btn ghost" onClick={() => handleDownloadFile(videoUrl, `video-${item.id}.mp4`)}>Yuklab olish</button>}
            </div>
          </Section>

          <Section title="Video tasnif:">
            <textarea
              className="text-area"
              placeholder="Video tasnifi hali yaratilmagan..."
              value={videoCaptionText}
              onChange={(e) => setVideoCaptionText(e.target.value)}
              spellCheck={false}
            />
            {videoCaptionError && <div className="error-text">{videoCaptionError}</div>}
            <div className="row">
              <button className="btn" onClick={handleGenerateVideoCaption}>
                Video tasnif yaratish
              </button>
              {videoCaptionUrl && <CopyButton url={videoCaptionUrl} />}
              <button className="btn ghost" onClick={handleSaveVideoCaption} disabled={videoCaptionSaveLoading || !videoCaptionText.trim()} title="Saqlash">
                <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14V7l-4-4z"/>
                    <path fill="currentColor" d="M12 4h3l2 2v3h-5V4z"/>
                  </svg>
                  {videoCaptionSaveLoading ? 'Saqlanmoqda...' : 'Saqlash'}
                </span>
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

function toPlayableUrl(url) {
  const v = String(url || '').trim()
  if (!v) return ''
  if (v.startsWith('data:') || v.startsWith('blob:')) return v
  try {
    if (typeof window !== 'undefined') {
      const u = new URL(v, window.location.origin)
      if (u.origin !== window.location.origin) {
        return `/api/proxy?url=${encodeURIComponent(u.toString())}`
      }
    }
  } catch {}
  return v
}

function CopyButton({ url, label = 'Havolani nusxalash' }) {
  const [copied, setCopied] = React.useState(false)
  const canCopy = typeof navigator !== 'undefined' && navigator.clipboard && url
  const handle = async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(String(url))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error('Copy failed:', e)
    }
  }
  return (
    <button type="button" className="btn ghost small" onClick={handle} disabled={!canCopy} title={label}>
      <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H10V7h9v14z"/>
        </svg>
        {copied ? 'Nusxalandi!' : label}
      </span>
    </button>
  )
}

