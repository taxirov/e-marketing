import { useApi } from '../utils/api'

// Base URL for API. In production on Vercel, we want '/api'.
// Normalize to avoid trailing slashes to prevent paths like '/api/api/...'
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '')

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

  // Combine a few simple search terms (id, cadastral, client text)
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
    // Resolve to '/api/product/analysis' by default, or '<BASE>/product/analysis' if VITE_API_BASE is set
    const res = await apiFetch(`${API_BASE}/product/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text || res.statusText}`)
    }
    const json = await res.json()

    // Try to be resilient to different paging structures
    const rows = Array.isArray(json) ? json : json?.content || json?.items || json?.data || []
    const total = json?.totalElements || json?.total || rows.length
    return { rows, total, raw: json }
  }

  return { fetchAnalysis, isAuthorized }
}
