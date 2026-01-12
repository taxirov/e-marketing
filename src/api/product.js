import { useCallback } from 'react'
import { useApi } from '../utils/api'
import { normalizeObject } from '../data/normalize'

const DEFAULT_BASE = '/api/public'

function pickBaseUrl() {
  const envBase = import.meta.env?.VITE_PRODUCT_API_BASE || import.meta.env?.VITE_API_BASE
  if (typeof envBase === 'string' && envBase.trim()) {
    const trimmed = envBase.trim().replace(/\/$/, '')
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
  }
  return DEFAULT_BASE
}

function buildProductUrl(id) {
  const base = pickBaseUrl()
  const normalized = base.replace(/\/$/, '')
  if (/\/api\/public$/i.test(normalized) || /\/public$/i.test(normalized)) {
    return `${normalized}/product/${id}`
  }
  if (/\/api$/i.test(normalized)) {
    return `${normalized}/product/${id}`
  }
  return `${normalized}/api/product/${id}`
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
