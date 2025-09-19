import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateAudioText, generateAudioFile, generateCaptionFile, generateVideo, saveCaptionText, fetchFilesForProduct, saveAudioText, buildVideoCaptionTemplate, saveVideoCaptionText } from '../services/api';
import { getAudioDurationFromUrl } from '../utils/audio';
import { useApi } from '../utils/api';

const UPLOAD_SERVER_URL = 'https://e-content.webpack.uz/api/files';


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
    }
  }, [open, item]);

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
    }
  }, [audioUrl]);

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
      }
    }
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
    }
    fetchCaption();
    return () => { cancelled = true };
  }, [open, item, captionUrl]);

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
      }
    }
    loadAudioText();
    return () => { cancelled = true };
  }, [open, item, audioTextUrl]);

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
        if (!cancelled) setVideoCaptionText(txt || '');
      } catch (err) {
        console.error('Video tasnif GET xato:', err);
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
    try {
      const url = await saveVideoCaptionText(text, UPLOAD_SERVER_URL, item.id);
      setVideoCaptionUrl(url);
    } catch (err) {
      console.error('Video tasnifni saqlashda xato:', err);
    } finally {
      setVideoCaptionSaveLoading(false);
    }
  };

  const handleGenerateAudioText = async () => {
    if (!item) return;
    setAudioTextLoading(true);
    setAudioError('');
    try {
      const { text, url } = await generateAudioText(item.id, item, UPLOAD_SERVER_URL);
      setAudioText(text);
      setAudioTextUrl(url);
    } catch (err) {
      console.error("Audio matnni yaratishda xatolik:", err);
      setAudioError(err.message || "Audio matnni yaratishda xatolik yuz berdi");
    } finally {
      setAudioTextLoading(false);
    }
  };

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
    } catch (err) {
      console.error('Audio fayl yaratishda xatolik:', err);
      setAudioError(err.message || 'Audio fayl yaratishda xatolik yuz berdi');
    } finally {
      setAudioFileLoading(false);
    }
  };

  const handleSaveAudioText = async () => {
    if (!item) return;
    const script = String(audioText || '').trim();
    if (!script) { setAudioError('Audio matni bo\'sh'); return; }
    setAudioTextSaveLoading(true);
    setAudioError('');
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
    }
    setVideoLoading(true);
    setVideoError('');
    try {
      // Pass image URLs to video renderer (supports http/https/data URLs)
      const imageUrls = selectedImageEntries.map((e) => e.url);
      const url = await generateVideo(item, audioUrl, captionUrl, imageUrls, UPLOAD_SERVER_URL);
      setVideoUrl(url);
    } catch (err) {
      console.error('Video yaratishda xatolik:', err);
      setVideoError(err.message || 'Video yaratishda xatolik yuz berdi');
    } finally {
      setVideoLoading(false);
    }
  };

  const handleToggleImageSelect = (imageId) => {
    setSelectedImages((prev) => {
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

  if (!open || !item) return null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="edit-header">
          <button className="back-btn" onClick={onClose} title="Ortga">x</button>
          <div className="title">{item.id} | {item.name}</div>
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
            {photosLoading ? (
              <Placeholder text="Rasmlar yuklanmoqda..." />
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
                  {photos.map((image, index) => {
                    const isSelected = selectedImages.includes(image.id);
                    const altLabel = `Obyekt rasm ${index + 1}`;
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
            <div className="row">
              <button className="btn" onClick={() => setVideoCaptionText(buildVideoCaptionTemplate(item))}>
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

