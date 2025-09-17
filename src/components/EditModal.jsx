import React, { useEffect, useMemo, useRef, useState } from 'react';
import { generateAudioText, generateAudioFile, generateCaptionFile, generateVideo } from '../services/api';
import { getAudioDurationFromUrl } from '../utils/audio';
import { OBJECT_IMAGES, OBJECT_IMAGE_MAP } from '../utils/objectImages';

const UPLOAD_SERVER_URL = 'http://46.173.26.14:3000/api/files';


export default function EditModal({ item, open, onClose }) {
  const [audioText, setAudioText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioTextUrl, setAudioTextUrl] = useState('');
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [audioDuration, setAudioDuration] = useState(null);

  const [captionUrl, setCaptionUrl] = useState('');
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionError, setCaptionError] = useState('');

  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');

  const [selectedImages, setSelectedImages] = useState([]);
  const allImageIds = useMemo(() => OBJECT_IMAGES.map((img) => img.id), []);
  const selectedImageEntries = useMemo(() => selectedImages.map((id) => OBJECT_IMAGE_MAP[id]).filter(Boolean), [selectedImages]);

  const totalImages = OBJECT_IMAGES.length;

  // Load data from localStorage on modal open
  useEffect(() => {
    if (!open || !item) {
      setAudioText('');
      setAudioUrl('');
      setAudioTextUrl('');
      setCaptionUrl('');
      setVideoUrl('');
      setSelectedImages([]);
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
      setSelectedImages(imagesStored.filter((id) => OBJECT_IMAGE_MAP[id]));

    } catch (err) {
      console.error("Local storage ma'lumotlarini yuklashda xato:", err);
    }
  }, [open, item]);

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
    if (audioUrl) {
      getAudioDurationFromUrl(audioUrl)
        .then(duration => setAudioDuration(duration))
        .catch(err => console.error("Audio davomiyligini aniqlashda xato:", err));
    } else {
      setAudioDuration(null);
    }
  }, [audioUrl]);

  const handleGenerateAudioText = async () => {
    if (!item) return;
    setAudioLoading(true);
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
      setAudioLoading(false);
    }
  };

  const handleGenerateAudioFile = async () => {
    if (!item || !audioText.trim()) {
      setAudioError("Avval audio matnini yaratish kerak");
      return;
    }
    setAudioLoading(true);
    setAudioError('');
    try {
      const url = await generateAudioFile(audioText, UPLOAD_SERVER_URL, item.id);
      setAudioUrl(url);
      // Save to local storage
      localStorage.setItem(`audioUrl-${item.id}`, url);
    } catch (err) {
      console.error('Audio fayl yaratishda xatolik:', err);
      setAudioError(err.message || 'Audio fayl yaratishda xatolik yuz berdi');
    } finally {
      setAudioLoading(false);
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
      const url = await generateVideo(item, audioUrl, captionUrl, selectedImages, UPLOAD_SERVER_URL);
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
      if (next.has(imageId)) {
        next.delete(imageId);
      } else if (OBJECT_IMAGE_MAP[imageId]) {
        next.add(imageId);
      }
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
              <button className="btn" onClick={handleGenerateAudioText} disabled={audioLoading}>
                {audioLoading ? 'Yaratilmoqda...' : 'Audio matn yaratish'}
              </button>
              {audioTextUrl && <div className="hint">Fayl manzili: <a href={audioTextUrl} target="_blank" rel="noopener noreferrer">{audioTextUrl}</a></div>}
            </div>
            {audioError && <div className="error-text">{audioError}</div>}
          </Section>

          <Section title="Audio:">
            {audioUrl ? (
              <>
                <audio controls src={audioUrl} />
                <div className="hint">Fayl manzili: <a href={audioUrl} target="_blank" rel="noopener noreferrer">{audioUrl}</a></div>
              </>
            ) : (
              <Placeholder text="Audio hali yaratilmagan..."/>
            )}
            <div className="row">
              <button className="btn" onClick={handleGenerateAudioFile} disabled={audioLoading || !audioText.trim()}>
                {audioLoading ? 'Yaratilmoqda...' : 'Audioni yaratish'}
              </button>
              {audioUrl && <button className="btn ghost" onClick={() => handleDownloadFile(audioUrl, `audio-${item.id}.m4a`)}>Yuklab olish</button>}
            </div>
          </Section>

          <Section title="Video matni (Captions):">
            {captionUrl ? (
              <div className="hint">Fayl manzili: <a href={captionUrl} target="_blank" rel="noopener noreferrer">{captionUrl}</a></div>
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
            {totalImages ? (
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
                  {OBJECT_IMAGES.map((image, index) => {
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
          </Section>

          <Section title="Video:">
            {videoUrl ? (
              <>
                <video controls src={videoUrl} className="video-player" />
                <div className="hint">Fayl manzili: <a href={videoUrl} target="_blank" rel="noopener noreferrer">{videoUrl}</a></div>
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