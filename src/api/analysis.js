import { useApi } from '../utils/api'
import { normalizeObjects } from '../data/normalize'

const API_BASE = 'https://api.uy-joy.uz'

const DEFAULT_PAYLOAD = {
  action: '',
  search: '',
  pageFilter: {
    page: 1,
    size: 10,
    sort: { col: 'updated_date', dir: 'desc' },
  },
  area: true,
  regions: [],
  cadastreType: '',
  userId: null,
  actionType: null,
  startDate: null,
  endDate: null,
  category: null,
  publish: false,
  objectAnalysisFilter: {
    clientData: null,
    source: null,
    status: null,
    parentData: null,
    isChild: false,
  },
  sellProcess: { code: 'sell_process', value: null },
  sellType: { code: 'sell_type', value: null },
  purchaseType: { code: 'purchase_type', value: null },
  findBuyer: { code: 'find_buyer', value: null },
  pledgePaymentType: null,
  productProcessType: 'IDENTIFICATION',
  tradeType: null,
}

function mapFiltersToPayload(filters, page = 1, size = 10) {
  const sortMap = {
    createdAt: 'updated_date',
    id: 'id',
    name: 'name',
    region: 'region',
  }

  const payload = JSON.parse(JSON.stringify(DEFAULT_PAYLOAD))
  payload.pageFilter.page = page
  payload.pageFilter.size = size
  payload.pageFilter.sort.col = sortMap[filters.sortBy] || 'updated_date'
  payload.pageFilter.sort.dir = filters.sortDir || 'desc'

  const terms = [filters.id, filters.cadastral, filters.client].filter(Boolean)
  payload.search = terms.join(' ').trim()
  payload.category = filters.category || null
  payload.productProcessType = filters.productProcessType || 'IDENTIFICATION'
  payload.tradeType = filters.tradeType || null
  payload.regions = filters.region ? [filters.region] : []
  payload.objectAnalysisFilter.clientData = filters.client || null
  payload.objectAnalysisFilter.source = filters.source || null
  payload.objectAnalysisFilter.status = filters.status || null
  payload.cadastreType = filters.cadastreType || ''

  return payload
}

export function useAnalysisApi() {
  const { apiFetch, isAuthorized } = useApi()

  async function fetchAnalysis(filters, page = 1, size = 10) {
    const payload = mapFiltersToPayload(filters, page, size)
    const res = await apiFetch(`${API_BASE}/api/product/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text || res.statusText}`)
    }

    const json = await res.json()
    const rawList = Array.isArray(json?.content)
      ? json.content
      : Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : []

    const rows = normalizeObjects(rawList.length ? rawList : json)
    const total = json?.totalElements || json?.total || rawList.length || rows.length

    return { rows, total, raw: json }
  }

  return { fetchAnalysis, isAuthorized }
}
