// Local data adapter: map binolar.json -> table-friendly rows
import raw from './binolar.json'

function parseDateToMs(s) {
  if (!s || typeof s !== 'string') return Date.now()
  // Expect format like '16.09.2025 16:15'
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/)
  if (!m) return Date.now()
  const [_, dd, MM, yyyy, hh, mm] = m
  const d = new Date(Number(yyyy), Number(MM) - 1, Number(dd), Number(hh), Number(mm))
  return d.getTime()
}

function pickRegionNames(region) {
  // Try to infer province (viloyat) and district (tuman)
  const province = region?.parent?.parent?.name || region?.parent?.name || region?.name || ''
  const district = region?.parent?.name || region?.name || ''
  return { province, district }
}

function mapCategory(code) {
  if (!code) return ''
  if (code.includes('NotResidential')) return 'Noturar'
  if (code.includes('Residential')) return 'Turar joy'
  if (code.toLowerCase().includes('agricult')) return "Qishloq xo'jaligi"
  return code
}

function mapTradeType(code) {
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

function toNumber(value) {
  if (value === null || value === undefined) return undefined
  const normalized = String(value).replace(/\s/g, '').replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : undefined
}

function toRows(input) {
  const list = Array.isArray(input?.data) ? input.data : Array.isArray(input) ? input : []
  return list.map((it) => {
    const variations = Array.isArray(it?.variations) ? it.variations : []
    const pickVariation = (code) => variations.find((v) => v?.code === code)?.value
    const areaAll = toNumber(pickVariation('area_all'))
    const buildingArea = toNumber(pickVariation('building_width_area'))
    const effectiveArea = toNumber(pickVariation('area_effective'))
    const { province, district } = pickRegionNames(it?.region)
    const engineerEntry = variations.find((v) => v?.code === 'engineer_communications')
    const engineerValues = Array.isArray(engineerEntry?.values)
      ? engineerEntry.values
      : typeof engineerEntry?.value === 'string'
        ? engineerEntry.value.split(',').map((x) => x.trim()).filter(Boolean)
        : []
    const typeVariation = variations.find((v) => v?.code === 'type_of_building')

    return {
      id: it?.id,
      name: it?.name || '',
      region: province,
      district,
      address: it?.address || it?.productOrder?.address || '',
      area: areaAll,
      areaAll,
      buildingArea,
      effectiveArea,
      typeOfBuilding: typeVariation?.value || '',
      typeOfBuildingLabel: typeVariation?.valueLabel || '',
      floorsBuilding: pickVariation('floors_building'),
      floors: pickVariation('floors'),
      engineerCommunications: engineerValues,
      separateBuilding: Boolean(it?.separateBuilding),
      category: mapCategory(it?.category?.code || it?.categoryData?.code),
      categoryId: it?.category?.id || it?.categoryData?.id,
      cadastral: it?.docNumber || it?.productOrder?.docNumber || '',
      crm: '',
      crmNew: '',
      source: '',
      client: it?.productOrder?.client?.fullName || '',
      status: '',
      productProcessType: it?.productOrder?.productProcessType || '',
      tradeType: mapTradeType(it?.productOrder?.tradeType),
      createdAt: parseDateToMs(it?.createdDate || it?.productOrder?.createdDate),
      productRegion: it?.productOrder?.region || it?.region || null,
      productMfy: it?.productOrder?.mfy || it?.mfy || null,
      raw: it,
    }
  })
}

const rows = toRows(raw)

export default rows

