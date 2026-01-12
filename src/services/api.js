// Note: Template helpers are defined in this file.

const DEFAULT_BACKEND_BASE = 'http://avto-video2.webpack.uz';

function getBackendBase() {
  const envBase = import.meta.env?.VITE_BACKEND_BASE;
  if (typeof envBase === 'string' && envBase.trim()) {
    return envBase.trim().replace(/\/$/, '');
  }
  return DEFAULT_BACKEND_BASE;
}

function withBackendBase(path) {
  const base = getBackendBase();
  const suffix = String(path || '').trim();
  if (!suffix) return base;
  if (/^https?:\/\//i.test(suffix)) return suffix;
  return `${base}${suffix.startsWith('/') ? '' : '/'}${suffix}`;
}

function toAbsoluteUrl(base, maybeRelative) {
  const v = String(maybeRelative || '').trim();
  if (!v) return v;
  if (/^(https?:)?\/\//i.test(v)) return v;
  if (v.startsWith('data:') || v.startsWith('blob:')) return v;
  try {
    const u = new URL(String(base || ''));
    const origin = `${u.protocol}//${u.host}`;
    if (v.startsWith('/')) return `${origin}${v}`;
    const basePath = u.pathname.replace(/\/$/, '');
    const abs = `${origin}${basePath ? `${basePath}/${v}` : `/${v}`}`;
    // If current page is HTTPS and target is HTTP, route via proxy to avoid mixed-content
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' && abs.startsWith('http://')) {
      return `/api/proxy?url=${encodeURIComponent(abs)}`;
    }
    return abs;
  } catch {
    const b = String(base || '').trim().replace(/\/$/, '');
    const p = v.replace(/^\//, '');
    const abs = b ? `${b}/${p}` : `/${p}`;
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:' && abs.startsWith('http://')) {
      return `/api/proxy?url=${encodeURIComponent(abs)}`;
    }
    return abs;
  }
}

export async function generateAudioText(productId, item, uploadUrl) {
  const text = buildAudioTemplate(item);
  const payload = { text, uploadUrl, productId };
  const res = await fetch(withBackendBase('/api/generate/audio/text'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
  });
  if (!res.ok) {
      const errorText = await res.text().catch(() => 'Nomaʼlum xatolik');
      throw new Error(`Audio matn yaratishda xato: ${res.status} - ${errorText}`);
  }
  const data = await res.json();
  const url = toAbsoluteUrl(uploadUrl, data?.url || data?.fileUrl);
  const latinText = typeof data?.text === 'string' && data.text.trim() ? data.text : text;
  return { text: latinText, url };
}

export async function saveAudioText(text, uploadUrl, productId) {
  const script = (text || '').trim();
  if (!script) throw new Error('Audio matni bo\'sh');
  if (!uploadUrl) throw new Error('Yuklash uchun server manzili topilmadi');
  if (!productId) throw new Error('Mahsulot identifikatori topilmadi');

  const payload = { text: script, uploadUrl, productId };
  const res = await fetch(withBackendBase('/api/generate/audio/text'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    const detail = errorText?.trim() ? ` - ${errorText.trim()}` : '';
    throw new Error(`Audio matnni saqlashda xato: ${res.status}${detail}`);
  }
  const data = await res.json().catch(() => null);
  const url = toAbsoluteUrl(uploadUrl, data?.url || data?.fileUrl);
  const latinText = (data && typeof data.text === 'string') ? data.text : script;
  return { text: latinText, url };
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

    const res = await fetch(withBackendBase('/api/generate/audio'), {
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
    return toAbsoluteUrl(uploadUrl, data?.url || data?.fileUrl);
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
    return toAbsoluteUrl(uploadUrl, data?.url || data?.fileUrl);
}

export async function saveCaptionText(srtText, uploadUrl, productId) {
    const srt = String(srtText || '').trim();
    if (!srt) throw new Error('SRT matni bo\'sh');
    if (!uploadUrl) throw new Error('Yuklash uchun server manzili topilmadi');
    if (!productId) throw new Error('Mahsulot identifikatori topilmadi');

    const payload = { srt, uploadUrl, productId };
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
    return toAbsoluteUrl(uploadUrl, data?.url || data?.fileUrl);
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
    return toAbsoluteUrl(uploadUrl, data?.url || data?.fileUrl);
}

export async function fetchFilesForProduct(uploadUrl, productId) {
  if (!uploadUrl) throw new Error('Yuklash uchun server manzili topilmadi');
  if (!productId) throw new Error('Mahsulot identifikatori topilmadi');
  // Build https://e-content.webpack.uz/api/files/:id (do NOT start with a leading slash
  // to preserve the `/api/files` base path)
  const rawAbs = toAbsoluteUrl(ensureFilesBase(uploadUrl), String(productId));
  // Use proxy to avoid CORS, even for HTTPS
  let urlToFetch = rawAbs;
  try {
    if (typeof window !== 'undefined') {
      const u = new URL(rawAbs, window.location.origin);
      if (u.origin !== window.location.origin) {
        urlToFetch = `/api/proxy?url=${encodeURIComponent(u.toString())}`;
      }
    }
  } catch {}
  const res = await fetch(urlToFetch, { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(t || `Fayllarni olishda xato: ${res.status}`);
  }
  const json = await res.json().catch(() => ({}));
  const rewriteHost = (p) => {
    const s = String(p || '').trim();
    if (!s) return s;
    try {
      const u = new URL(s, 'http://x');
      const host = u.hostname + (u.port ? `:${u.port}` : '');
      if (host.startsWith('46.173.26.14')) {
        u.protocol = 'https:';
        u.host = 'e-content.webpack.uz';
        return u.toString();
      }
    } catch {}
    return s;
  };
  const makeAbs = (p) => (p ? toAbsoluteUrl(uploadUrl, rewriteHost(p)) : '');
  return {
    id: json?.id || null,
    productId: json?.productId || null,
    audioTextUrl: makeAbs(json?.audioTextUrl),
    audioUrl: makeAbs(json?.audioUrl),
    captionUrl: makeAbs(json?.captionUrl),
    videoCaptionUrl: makeAbs(json?.videoCaptionUrl),
    videoUrl: makeAbs(json?.videoUrl),
    raw: json,
  };
}

export function buildVideoCaptionTemplate(item) {
  const id = item?.id || item?.productId || ''
  const name = item?.name || 'Obyekt'
  const region = item?.region || item?.raw?.region || ''
  const district = item?.district || ''
  const mfy = item?.productMfy?.name || item?.mfy || ''
  const addrParts = [region, district, mfy && `${mfy} MFY`].filter(Boolean).join(', ')
  const floors = normalizeValue(item?.floors)
  const floorsBuilding = normalizeValue(item?.floorsBuilding)
  const isApartment = Number(item?.categoryId) === 8 || String(item?.category || '').toLowerCase().includes('kvartir')
  const areaAll = formatRounded(item?.areaAll ?? item?.area)
  const effectiveArea = formatRounded(item?.effectiveArea || item?.area_living)
  const commList = formatCommunications(item?.engineerCommunications)
  const price = formatSom(item?.price || item?.raw?.price || item?.productPrice)
  const link = `https://e-riletor.uz/products/product/${id}`

  const lines = []
  if (id) lines.push(`ID ${id}`)
  lines.push(`\n🏤 ${name} ✅`)
  if (addrParts) lines.push(`⛳️ ${addrParts}.`)
  if (isApartment) {
    lines.push(`📝 Qavati ${floors}/${floorsBuilding}`)
    lines.push(`🌏 Umumiy maydoni ${areaAll} m²`)
  } else {
    lines.push(`📝 Qavatliligi ${floorsBuilding}`)
    lines.push(`🌏 Umumiy maydoni ${areaAll} m²`)
    lines.push(`🌏 Foydali maydoni ${effectiveArea} m²`)
  }
  if (commList) lines.push(`🔥⚡️💦 ${commList}`)
  if (price) lines.push(`\n💰 ${price} so'm`)
  lines.push(`\n📞 +998 55 517-22-20`)
  lines.push(`To'liq ma'lumot uchun 👉 ${link} shu havolaga kiring.`)
  return lines.join('\n')
}

export async function saveVideoCaptionText(text, uploadUrl, productId) {
  const script = (text || '').trim()
  if (!script) throw new Error('Video tasnif matni bo\'sh')
  if (!uploadUrl) throw new Error('Yuklash uchun server manzili topilmadi')
  if (!productId) throw new Error('Mahsulot identifikatori topilmadi')
  const payload = { text: script, uploadUrl, productId }
  const res = await fetch('/api/videoCaption', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    const detail = t?.trim() ? `: ${t.trim()}` : ''
    throw new Error(`Video tasnifni saqlashda xato ${res.status}${detail}`)
  }
  const data = await res.json().catch(() => null)
  return toAbsoluteUrl(uploadUrl, data?.url || data?.fileUrl)
}

function ensureFilesBase(value) {
  const s = String(value || '').trim();
  if (!s) return '/api/files';
  try {
    const u = new URL(s);
    let p = (u.pathname || '').replace(/\/$/, '');
    if (!/\/files$/i.test(p)) p = `${p}/files`;
    u.pathname = p;
    return u.toString().replace(/\/$/, '');
  } catch {
    const b = s.replace(/\/$/, '');
    return /\/files$/i.test(b) ? b : `${b}/files`;
  }
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
    communications ? `${communications} taʻminoti mavjud.` : ``,
    'Joylashuvi qulay.',
    `Batafsil maʻlumot uchun 55 517 22 20 raqamiga bogʻlaning!`,
  ]

  const isApartment = Number(item?.categoryId) === 8 || String(item?.category || '').toLowerCase().includes('kvartir')
  if (isApartment) {
    const filtered = sentences.filter((line) => {
      const v = String(line || '')
      return !/^Umumiy yer maydoni\s+/i.test(v) && !/^Qurilish osti maydoni\s+/i.test(v)
    })
    return filtered.join(' ')
  }
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
