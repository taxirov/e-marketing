import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateAudioText, generateAudioFile, generateCaptionFile, generateVideo } from '../services/api';
import { getAudioDurationFromUrl } from '../utils/audio';
import { useApi } from '../utils/api';

const UPLOAD_SERVER_URL = 'http://46.173.26.14:3000/api/files';


export default function EditModal({ item, open, onClose }) {
  const { apiFetch } = useApi();
  const [audioText, setAudioText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioTextUrl, setAudioTextUrl] = useState('');
  const [audioTextLoading, setAudioTextLoading] = useState(false);
  const [audioFileLoading, setAudioFileLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [audioDuration, setAudioDuration] = useState(null);

  const [captionUrl, setCaptionUrl] = useState('');
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState('');

  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');

  // Photos fetched per item from API
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState('');
  const photoMap = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const [selectedImages, setSelectedImages] = useState([]); // stores photo ids
  const selectedImageEntries = useMemo(() => selectedImages.map((id) => photoMap.get(id)).filter(Boolean), [selectedImages, photoMap]);
  const allImageIds = useMemo(() => photos.map((p) => p.id), [photos]);
  const totalImages = photos.length;

  // Load data from localStorage on modal open
  useEffect(() => {
    if (!open || !item) {
      setAudioText('');
      setAudioUrl('');
      setAudioTextUrl('');
      setCaptionUrl('');
      setVideoUrl('');
      setSelectedImages([]);
      setPhotos([]);
      setPhotosError('');
      setPhotosLoading(false);
      return;
    }

    try {
      const audioTextStored = localStorage.getItem(`audioText-${item.id}`);
      const audioUrlStored = localStorage.getItem(`audioUrl-${item.id}`);
      const audioTextUrlStored = localStorage.getItem(`audioTextUrl-${item.id}`);
      const captionUrlStored = localStorage.getItem(`captionUrl-${item.id}`);
      const videoUrlStored = localStorage.getItem(`videoUrl-${item.id}`);
      const imagesStored = JSON.parse(localStorage.getItem(`videoImages-${item.id}`) || '[]');

      setAudioText(audioTextStored || '');
      setAudioUrl(audioUrlStored || '');
      setAudioTextUrl(audioTextUrlStored || '');
      setCaptionUrl(captionUrlStored || '');
      setVideoUrl(videoUrlStored || '');
      setSelectedImages(Array.isArray(imagesStored) ? imagesStored : []);

    } catch (err) {
      console.error("Local storage ma'lumotlarini yuklashda xato:", err);
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

  // Save audioText to localStorage on change
  useEffect(() => {
    if (item && audioText) {
      try {
        localStorage.setItem(`audioText-${item.id}`, audioText);
      } catch (err) {
        console.error("Audio matnni saqlashda xato:", err);
      }
    }
  }, [audioText, item]);
  
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

  const handleGenerateAudioText = async () => {
    if (!item) return;
    setAudioTextLoading(true);
    setAudioError('');
    try {
      const { text, url } = await generateAudioText(item.id, item, UPLOAD_SERVER_URL);
      setAudioText(text);
      setAudioTextUrl(url);
      // Save to local storage
      localStorage.setItem(`audioText-${item.id}`, text);
      localStorage.setItem(`audioTextUrl-${item.id}`, url);
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
      // Save to local storage
      localStorage.setItem(`audioUrl-${item.id}`, url);
    } catch (err) {
      console.error('Audio fayl yaratishda xatolik:', err);
      setAudioError(err.message || 'Audio fayl yaratishda xatolik yuz berdi');
    } finally {
      setAudioFileLoading(false);
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
        // Save to local storage
        localStorage.setItem(`captionUrl-${item.id}`, url);
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
      // Save to local storage
      localStorage.setItem(`videoUrl-${item.id}`, url);
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
      try {
        localStorage.setItem(`videoImages-${item.id}`, JSON.stringify(newSelection));
      } catch (err) {
        console.error('Rasmlarni saqlashda xatolik:', err);
      }
      return newSelection;
    });
  };

  const handleSelectAllImages = () => {
    setSelectedImages(allImageIds);
    try {
      localStorage.setItem(`videoImages-${item.id}`, JSON.stringify(allImageIds));
    } catch (err) {
      console.error('Rasmlarni saqlashda xatolik:', err);
    }
  };

  const handleClearImageSelection = () => {
    setSelectedImages([]);
    try {
      localStorage.removeItem(`videoImages-${item.id}`);
    } catch (err) {
      console.error('Rasmlarni tozalashda xatolik:', err);
    }
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
              <button className="btn" onClick={handleGenerateAudioText} disabled={audioTextLoading}>
                {audioTextLoading ? 'Yaratilmoqda...' : 'Audio matn yaratish'}
              </button>
              {audioTextUrl && <div className="hint">Fayl manzili: <a href={audioTextUrl} target="_blank" rel="noopener noreferrer">{audioTextUrl}</a></div>}
            </div>
            {audioError && <div className="error-text">{audioError}</div>}
          </Section>

          <Section title="Audio:">
            {audioUrl ? (
              <>
                <audio controls src={toPlayableUrl(audioUrl)} />
                <div className="hint">Fayl manzili: <a href={toPlayableUrl(audioUrl)} target="_blank" rel="noopener noreferrer">{audioUrl}</a></div>
              </>
            ) : (
              <Placeholder text="Audio hali yaratilmagan..."/>
            )}
            <div className="row">
              <button className="btn" onClick={handleGenerateAudioFile} disabled={audioFileLoading || !audioText.trim()}>
                {audioFileLoading ? 'Yaratilmoqda...' : 'Audioni yaratish'}
              </button>
              {audioUrl && <button className="btn ghost" onClick={() => handleDownloadFile(audioUrl, `audio-${item.id}.m4a`)}>Yuklab olish</button>}
            </div>
          </Section>

          <Section title="Video matni (Captions):">
            {captionUrl ? (
                <div className="hint">Fayl manzili: <a href={toPlayableUrl(captionUrl)} target="_blank" rel="noopener noreferrer">{captionUrl}</a></div>
            ) : (
              <Placeholder text="Video matni hali yaratilmagan..."/>
            )}
            {captionError && <div className="error-text">{captionError}</div>}
            <div className="row">
              <button className="btn" onClick={handleGenerateCaptions} disabled={captionLoading || !audioUrl}>
                {captionLoading ? 'Yaratilmoqda...' : 'Video matn yaratish'}
              </button>
              {captionUrl && <button className="btn ghost" onClick={() => handleDownloadFile(captionUrl, `captions-${item.id}.srt`)}>Yuklab olish</button>}
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
                <div className="hint">Fayl manzili: <a href={toPlayableUrl(videoUrl)} target="_blank" rel="noopener noreferrer">{videoUrl}</a></div>
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
              {videoUrl && <button className="btn ghost" onClick={() => handleDownloadFile(videoUrl, `video-${item.id}.mp4`)}>Yuklab olish</button>}
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
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && v.startsWith('http://')) {
    return `/api/proxy?url=${encodeURIComponent(v)}`
  }
  return v
}

