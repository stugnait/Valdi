const INACTIVITY_LIMIT_MS = 30 * 60 * 1000
const LAST_ACTIVITY_KEY = "last_activity_at"

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`
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

export function persistSessionTokens({ access, refresh, userEmail }: { access: string; refresh: string; userEmail?: string }) {
  localStorage.setItem("access_token", access)
  localStorage.setItem("refresh_token", refresh)

  if (userEmail) {
    localStorage.setItem("user_email", userEmail)
  }

  document.cookie = `access_token=${access}; path=/; samesite=lax`
  document.cookie = `refresh_token=${refresh}; path=/; samesite=lax`

  markUserActivity()
}

export { INACTIVITY_LIMIT_MS }
