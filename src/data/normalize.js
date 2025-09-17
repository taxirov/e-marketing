export function parseDateToMs(s) {
  if (!s || typeof s !== 'string') return Date.now()
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/)
  if (!m) return Date.now()
  const [, dd, MM, yyyy, hh, mm] = m
  const d = new Date(Number(yyyy), Number(MM) - 1, Number(dd), Number(hh), Number(mm))
  return d.getTime()
}

export function pickRegionNames(region) {
  const province = region?.parent?.parent?.name || region?.parent?.name || region?.name || ''
  const district = region?.parent?.name || region?.name || ''
  return { province, district }
}

export function mapCategory(code) {
  if (!code) return ''
  if (code.includes('NotResidential')) return 'Noturar'
  if (code.includes('Residential')) return 'Turar joy'
  if (code.toLowerCase().includes('agricult')) return "Qishloq xo'jaligi"
  return code
}

export function mapTradeType(code) {
  switch (code) {
    case 'RENT':
      return 'Ijaraga'
    case 'AUCTION':
      return 'Auksion'
    case 'TRADE_PLATFORM':
    case 'SALE':
      return 'Savdo'
    default:
      return code || ''
  }
}

export function toNumber(value) {
  if (value === null || value === undefined) return undefined
  const normalized = String(value).replace(/\s/g, '').replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : undefined
}

function extractList(input) {
  if (Array.isArray(input)) return input
  if (Array.isArray(input?.content)) return input.content
  if (Array.isArray(input?.items)) return input.items
  if (Array.isArray(input?.data)) return input.data
  if (Array.isArray(input?.results)) return input.results
  return []
}

export function normalizeObject(raw) {
  if (!raw) return null
  const variations = Array.isArray(raw?.variations) ? raw.variations : []
  const pickVariation = (code) => variations.find((v) => v?.code === code)?.value
  const areaAll = toNumber(pickVariation('area_all'))
  const buildingArea = toNumber(pickVariation('building_width_area'))
  const effectiveArea = toNumber(pickVariation('area_effective'))
  const { province, district } = pickRegionNames(raw?.region)
  const engineerEntry = variations.find((v) => v?.code === 'engineer_communications')
  const engineerValues = Array.isArray(engineerEntry?.values)
    ? engineerEntry.values
    : typeof engineerEntry?.value === 'string'
      ? engineerEntry.value.split(',').map((x) => x.trim()).filter(Boolean)
      : []
  const typeVariation = variations.find((v) => v?.code === 'type_of_building')

  return {
    id: raw?.id,
    name: raw?.name || '',
    region: province,
    district,
    address: raw?.address || raw?.productOrder?.address || '',
    area: areaAll,
    areaAll,
    buildingArea,
    effectiveArea,
    typeOfBuilding: typeVariation?.value || '',
    typeOfBuildingLabel: typeVariation?.valueLabel || '',
    floorsBuilding: pickVariation('floors_building'),
    floors: pickVariation('floors'),
    engineerCommunications: engineerValues,
    separateBuilding: Boolean(raw?.separateBuilding),
    category: mapCategory(raw?.category?.code || raw?.categoryData?.code),
    categoryId: raw?.category?.id || raw?.categoryData?.id,
    cadastral: raw?.docNumber || raw?.productOrder?.docNumber || '',
    crm: '',
    crmNew: '',
    source: '',
    client: raw?.productOrder?.client?.fullName || '',
    status: '',
    productProcessType: raw?.productOrder?.productProcessType || '',
    tradeType: mapTradeType(raw?.productOrder?.tradeType),
    createdAt: parseDateToMs(raw?.createdDate || raw?.productOrder?.createdDate),
    productRegion: raw?.productOrder?.region || raw?.region || null,
    productMfy: raw?.productOrder?.mfy || raw?.mfy || null,
    raw,
  }
}

export function normalizeObjects(input) {
  return extractList(input)
    .map((item) => normalizeObject(item))
    .filter(Boolean)
}
