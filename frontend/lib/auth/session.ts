const INACTIVITY_LIMIT_MS = 30 * 60 * 1000
const LAST_ACTIVITY_KEY = "last_activity_at"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
}

function decodeJwtPayload(token: string | null) {
  if (!token) return null

  try {
    const payloadPart = token.split(".")[1]
    if (!payloadPart) return null

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)

    return JSON.parse(atob(padded)) as { exp?: number }
  } catch {
    return null
  }
}

function isTokenValid(token: string | null) {
  const payload = decodeJwtPayload(token)
  const exp = Number(payload?.exp ?? 0)
  return exp * 1000 > Date.now()
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; samesite=lax`
}

export function markUserActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
}

export function hasSessionExpiredByInactivity(now = Date.now()) {
  const lastActivityRaw = localStorage.getItem(LAST_ACTIVITY_KEY)

  if (!lastActivityRaw) return false

  const lastActivityAt = Number(lastActivityRaw)
  if (!Number.isFinite(lastActivityAt)) return false

  return now - lastActivityAt > INACTIVITY_LIMIT_MS
}

export function clearSession() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user_email")
  localStorage.removeItem(LAST_ACTIVITY_KEY)

  clearCookie("access_token")
  clearCookie("refresh_token")
}

export function persistSessionTokens({
  access,
  refresh,
  userEmail,
}: {
  access: string
  refresh: string
  userEmail?: string
}) {
  localStorage.setItem("access_token", access)
  localStorage.setItem("refresh_token", refresh)

  if (userEmail) {
    localStorage.setItem("user_email", userEmail)
  }

  setCookie("access_token", access)
  setCookie("refresh_token", refresh)

  markUserActivity()
}

export async function ensureActiveAccessToken() {
  const accessToken = localStorage.getItem("access_token")
  if (isTokenValid(accessToken)) {
    setCookie("access_token", accessToken)
    return true
  }

  const refreshToken = localStorage.getItem("refresh_token")
  if (!isTokenValid(refreshToken)) {
    return false
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (!response.ok) {
      return false
    }

    const data = (await response.json()) as { access?: string; refresh?: string }
    if (!data.access) {
      return false
    }

    localStorage.setItem("access_token", data.access)
    setCookie("access_token", data.access)

    if (data.refresh) {
      localStorage.setItem("refresh_token", data.refresh)
      setCookie("refresh_token", data.refresh)
    }

    markUserActivity()
    return true
  } catch {
    return false
  }
}

export { INACTIVITY_LIMIT_MS }
