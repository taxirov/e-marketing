import { useCallback } from 'react'
import { useApi } from '../utils/api'
import { normalizeObject } from '../data/normalize'

const DEV_BASE = '/uyjoy'
const PROD_BASE = 'https://api.uy-joy.uz'

function buildProductUrl(id) {
  const base = import.meta.env?.DEV ? DEV_BASE : PROD_BASE
  return `${base}/api/product/${id}`
}

export function useProductApi() {
  const { apiFetch } = useApi()

  const fetchProductById = useCallback(async (id) => {
    if (!id && id !== 0) {
      throw new Error('Product ID is required')
    }
    const url = buildProductUrl(id)
    const res = await apiFetch(url)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text || res.statusText}`)
    }
    const json = await res.json()
    const normalized = normalizeObject(json)
    return { raw: json, normalized }
  }, [apiFetch])

  return { fetchProductById }
}
