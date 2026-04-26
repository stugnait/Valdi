"use client"

import { useEffect, useMemo, useState } from "react"
import { Mail, User } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { workforceApi, type ApiCurrentUser } from "@/lib/api/workforce"

export default function ProfilePage() {
  const [user, setUser] = useState<ApiCurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setIsLoading(true)
        const payload = await workforceApi.getCurrentUser()
        if (!isMounted) return
        setUser(payload)
        setError(null)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "Не вдалося завантажити профіль")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [])

  const displayName = useMemo(() => {
    if (!user) return ""
    return user.username || user.email.split("@")[0] || "User"
  }, [user])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Профіль</h1>
        <p className="text-sm text-muted-foreground">Дані завантажуються з backend endpoint `/api/auth/me/`.</p>
      </div>

      {isLoading && <Alert><AlertDescription>Завантаження профілю…</AlertDescription></Alert>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{displayName}</CardTitle>
            <CardDescription>Акаунт синхронізовано з backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{user.email}</div>
            <div className="text-sm text-muted-foreground">User ID: {user.id}</div>
            <Badge variant="outline">Live backend data</Badge>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertDescription>
          Редагування профілю та налаштувань безпеки тимчасово приховано, доки не будуть готові відповідні backend endpoint-и для update/change-password.
        </AlertDescription>
      </Alert>
    </div>
  )
}
