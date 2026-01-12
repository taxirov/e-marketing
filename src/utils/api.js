import { useCallback, useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'

// React hook for a fetch wrapper that injects Authorization header
export function useApi() {
  const { token } = useAuth()
  const authHeader = useMemo(() => {
    const trimmed = token?.trim()
    if (!trimmed) return {}
    return { Authorization: trimmed.startsWith('Bearer ') ? trimmed : `Bearer ${trimmed}` }
  }, [token])

  const apiFetch = useCallback(async (input, init = {}) => {
    const headers = { ...(init.headers || {}), ...authHeader }
    const res = await fetch(input, { ...init, headers })
    return res
  }, [authHeader])

  return { apiFetch, isAuthorized: !!token?.trim() }
}

