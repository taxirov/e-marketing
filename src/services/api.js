// This file contains API-related utility functions without any Firebase dependencies.
import { buildAudioTemplate, normalizeSpaces } from '../utils/audio';

export async function generateAudioText(productId, item, uploadUrl) {
  const text = buildAudioTemplate(item);
  const payload = { text, uploadUrl, productId };
  const res = await fetch('/api/audioText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
  });
  if (!res.ok) {
      const errorText = await res.text().catch(() => 'Nomaʼlum xatolik');
      throw new Error(`Audio matn yaratishda xato: ${res.status} - ${errorText}`);
  }
  const data = await res.json();
  return { text, url: data.url };
}

export async function generateAudioFile(text, uploadUrl, productId, options = {}) {
    const script = (text || '').trim();
    if (!script) throw new Error("Audio uchun matn mavjud emas");
    if (!uploadUrl) throw new Error("Yuklash uchun server manzili topilmadi");
    if (!productId) throw new Error("Mahsulot identifikatori topilmadi");

    const payload = { text: script, uploadUrl, productId };
    if (options.voice) payload.voice = options.voice;
    if (options.format) payload.format = options.format;
    if (options.contentType) payload.contentType = options.contentType;

    const res = await fetch('/api/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const message = await res.text().catch(() => '');
        const detail = message?.trim() ? `: ${message.trim()}` : '';
        throw new Error(`Audio servisi xatosi ${res.status}${detail}`);
    }

    const data = await res.json();
    return data.url;
}

export async function generateCaptionFile(text, duration, uploadUrl, productId) {
    if (!text) throw new Error("Sarlavha uchun matn mavjud emas");
    if (!duration) throw new Error("Audio davomiyligi topilmadi");
    if (!uploadUrl) throw new Error("Yuklash uchun server manzili topilmadi");
    if (!productId) throw new Error("Mahsulot identifikatori topilmadi");

    const payload = { text, duration, uploadUrl, productId };
    const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const message = await res.text().catch(() => '');
        const detail = message?.trim() ? `: ${message.trim()}` : '';
        throw new Error(`Sarlavha servisi xatosi ${res.status}${detail}`);
    }

    const data = await res.json();
    return data.url;
}

export async function generateVideo(item, audioUrl, captionsUrl, images, uploadUrl) {
    if (!audioUrl) throw new Error('Avval audio faylni yarating');
    if (!captionsUrl) throw new Error('Avval sarlavha faylini yarating');
    if (!images?.length) throw new Error('Kamida bitta rasm tanlang');

    const payload = {
        audioUrl,
        captionsUrl,
        images,
        title: item?.name || '',
        subtitle: [item?.region, item?.district].map((x) => (x || '').trim()).filter(Boolean).join(' • '),
        durationSeconds: null,
        uploadUrl,
        productId: item.id
    };

    const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        const detail = text?.trim() ? `: ${text.trim()}` : '';
        throw new Error(`Video servisi xatosi ${res.status}${detail}`);
    }
    const data = await res.json();
    return data.url;
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
    if (!base || !String(base).trim()) return ""
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

function normalizeSpaces(text) {
  return text.replace(/\s+/g, ' ').trim()
}