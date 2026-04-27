"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Mail, Trash2, User } from "lucide-react"
import { workforceApi } from "@/lib/api/workforce"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface CurrentUser {
  id: number | string
  username: string
  email: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      try {
        setError(null)
        const response = await workforceApi.getCurrentUser()
        if (!isMounted) return
        setUser(response)
      } catch (e) {
        if (!isMounted) return
        setError(e instanceof Error ? e.message : "Не вдалося завантажити профіль")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadUser()

    return () => {
      isMounted = false
    }
  }, [])

  const displayName = useMemo(() => {
    if (!user) return ""
    return user.username || user.email.split("@")[0] || "User"
  }, [user])

  const initials = useMemo(() => {
    if (!displayName) return "U"
    return displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")
  }, [displayName])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Профіль</h1>
        <p className="text-sm text-muted-foreground">Ваші дані акаунту.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Основна інформація</CardTitle>
          <CardDescription>Дані завантажуються з endpoint `/api/auth/me/`.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Завантаження...</p>
          ) : user ? (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{displayName}</h2>
                    <Badge variant="secondary">Активний</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">ID: {String(user.id)}</p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <User className="size-4" />
                    Ім&apos;я користувача
                  </div>
                  <p className="text-sm text-muted-foreground break-all">{user.username || "—"}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Mail className="size-4" />
                    Email
                  </div>
                  <p className="text-sm text-muted-foreground break-all">{user.email || "—"}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Профіль недоступний.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Небезпечна зона</CardTitle>
          <CardDescription>Видалення акаунту наразі не підключене на backend.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Щоб уникнути помилок, кнопка видалення показує інформаційне вікно.</p>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 size-4" />
            Видалити акаунт
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Видалення акаунту тимчасово недоступне
            </DialogTitle>
            <DialogDescription>
              Backend endpoint для видалення акаунту ще не реалізовано. Зверніться до адміністратора або спробуйте пізніше.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsDeleteDialogOpen(false)}>Зрозуміло</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
