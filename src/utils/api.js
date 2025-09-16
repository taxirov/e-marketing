import { useAuth } from '../auth/AuthContext'

// React hook for a fetch wrapper that injects Authorization header
export function useApi() {
  const { token } = useAuth()
  const authHeader = token?.trim()
    ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` }
    : {}

  async function apiFetch(input, init = {}) {
    const headers = { ...(init.headers || {}), ...authHeader }
    const res = await fetch(input, { ...init, headers })
    return res
  }

  return { apiFetch, isAuthorized: !!token?.trim() }
}

