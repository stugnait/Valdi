import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function isJwtActive(token: string | undefined) {
  if (!token) return false

  try {
    const payloadPart = token.split(".")[1]
    if (!payloadPart) return false

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/")
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4)
    const payloadRaw = atob(padded)
    const payload = JSON.parse(payloadRaw) as { exp?: number }

    return Boolean(payload.exp && payload.exp * 1000 > Date.now())
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value

  if (!isJwtActive(accessToken)) {
    const loginUrl = new URL("/auth", request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
}
