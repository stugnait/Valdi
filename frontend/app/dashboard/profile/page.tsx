"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, Mail, Save, Trash2, User } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface CurrentUser {
  id: number | string
  username: string
  email: string
}

export default function ProfilePage() {
  const router = useRouter()

  const [user, setUser] = useState<CurrentUser | null>(null)
  const [editedUser, setEditedUser] = useState({ username: "", email: "" })
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRequestingCode, setIsRequestingCode] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    verificationCode: "",
    newPassword: "",
    confirmPassword: "",
  })

  useEffect(() => {
    let isMounted = true

    const loadUser = async () => {
      try {
        setError(null)
        const response = await workforceApi.getCurrentUser()
        if (!isMounted) return

        const nextUser: CurrentUser = {
          id: response.id,
          username: response.username,
          email: response.email,
        }

        setUser(nextUser)
        setEditedUser({ username: nextUser.username, email: nextUser.email })
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

  const hasProfileChanges = useMemo(() => {
    if (!user) return false
    return editedUser.username !== user.username || editedUser.email !== user.email
  }, [editedUser, user])

  const handleProfileSave = async () => {
    if (!hasProfileChanges || !user) return
    try {
      setIsSavingProfile(true)
      setError(null)
      setSuccess(null)

      const updated = await workforceApi.updateCurrentUser({
        username: editedUser.username,
        email: editedUser.email,
      })

      const nextUser: CurrentUser = {
        id: updated.id,
        username: updated.username,
        email: updated.email,
      }
      setUser(nextUser)
      setEditedUser({ username: nextUser.username, email: nextUser.email })
      setSuccess("Дані профілю успішно оновлено.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося оновити профіль")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const requestPasswordCode = async () => {
    if (!passwordData.currentPassword) {
      setError("Введіть поточний пароль, щоб отримати код підтвердження.")
      return
    }

    try {
      setIsRequestingCode(true)
      setError(null)
      setSuccess(null)
      const response = await workforceApi.requestPasswordChangeCode({
        current_password: passwordData.currentPassword,
      })
      setSuccess(response.detail)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося надіслати код")
    } finally {
      setIsRequestingCode(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword.length < 8) {
      setError("Новий пароль має містити мінімум 8 символів.")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Новий пароль і підтвердження не співпадають.")
      return
    }

    if (!/^\d{4}$/.test(passwordData.verificationCode)) {
      setError("Код підтвердження має містити 4 цифри.")
      return
    }

    try {
      setIsChangingPassword(true)
      setError(null)
      setSuccess(null)

      const response = await workforceApi.confirmPasswordChange({
        code: passwordData.verificationCode,
        new_password: passwordData.newPassword,
      })

      setSuccess(response.detail)
      setPasswordData({ currentPassword: "", verificationCode: "", newPassword: "", confirmPassword: "" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося змінити пароль")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      setError(null)
      await workforceApi.deleteCurrentUser()
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      router.push("/auth")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося видалити акаунт")
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

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
        <p className="text-sm text-muted-foreground">Керуйте персональними даними, паролем і акаунтом.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Основна інформація</CardTitle>
          <CardDescription>Ви можете переглядати та редагувати свої дані профілю.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Завантаження...
            </div>
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
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center gap-2">
                    <User className="size-4" />
                    Ім&apos;я користувача
                  </Label>
                  <Input
                    id="username"
                    value={editedUser.username}
                    onChange={(e) => setEditedUser((prev) => ({ ...prev, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="size-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Профіль недоступний.</p>
          )}
        </CardContent>
      </Card>

              <div className="flex justify-end">
                <Button onClick={handleProfileSave} disabled={!hasProfileChanges || isSavingProfile}>
                  {isSavingProfile ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                  Зберегти зміни
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Профіль недоступний.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Зміна пароля</CardTitle>
          <CardDescription>
            1) Введіть поточний пароль і отримайте код на email. 2) Введіть код з 4 цифр і новий пароль.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Поточний пароль</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={requestPasswordCode} disabled={isRequestingCode}>
                {isRequestingCode ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Отримати код на пошту
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Код підтвердження (4 цифри)</Label>
              <Input
                id="verification-code"
                maxLength={4}
                value={passwordData.verificationCode}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, verificationCode: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Новий пароль</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Підтвердіть новий пароль</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Змінити пароль
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Небезпечна зона</CardTitle>
          <CardDescription>Видалення профілю є незворотним.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Після видалення акаунту вхід у систему стане неможливим.</p>
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
              Підтвердьте видалення акаунту
            </DialogTitle>
            <DialogDescription>
              Ви дійсно хочете видалити акаунт? Цю дію неможливо скасувати.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Скасувати
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Підтвердити видалення
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
