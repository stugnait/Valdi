"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Camera,
  Lock,
  Bell,
  Shield,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Globe,
  Linkedin,
  Github,
  Zap,
  ArrowRight,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { workforceApi } from "@/lib/api/workforce"

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  location: string
  timezone: string
  bio: string
  avatarUrl?: string
  joinedAt: string
  lastLoginAt: string
  
  // Social links
  linkedIn?: string
  github?: string
  website?: string
  
  // Notification preferences
  notifications: {
    email: boolean
    push: boolean
    projectUpdates: boolean
    invoiceAlerts: boolean
    weeklyReports: boolean
    teamMentions: boolean
  }
  
  // Security
  twoFactorEnabled: boolean
  lastPasswordChange: string
}

const emptyUserProfile: UserProfile = {
  id: "u1",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  department: "",
  location: "",
  timezone: "Europe/Kyiv",
  bio: "",
  joinedAt: "",
  lastLoginAt: "",
  
  linkedIn: "",
  github: "",
  website: "",
  
  notifications: {
    email: true,
    push: true,
    projectUpdates: true,
    invoiceAlerts: true,
    weeklyReports: true,
    teamMentions: true,
  },
  
  twoFactorEnabled: true,
  lastPasswordChange: "",
}

const departments = [
  "Executive",
  "Development",
  "Design",
  "Marketing",
  "Sales",
  "Finance",
  "Operations",
  "HR",
]

const timezones = [
  { value: "Europe/Kyiv", label: "Europe/Kyiv (UTC+2)" },
  { value: "Europe/London", label: "Europe/London (UTC+0)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+1)" },
  { value: "America/New_York", label: "America/New York (UTC-5)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (UTC-8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9)" },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(emptyUserProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<UserProfile>(emptyUserProfile)
  const [hasChanges, setHasChanges] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      try {
        const user = await workforceApi.getCurrentUser()
        if (!isMounted) return
        const [firstName, ...rest] = user.username.split(" ")
        const nextProfile: UserProfile = {
          ...emptyUserProfile,
          id: String(user.id),
          email: user.email,
          firstName: firstName || "",
          lastName: rest.join(" "),
        }
        setProfile(nextProfile)
        setEditedProfile(nextProfile)
        setLoadError(null)
      } catch (error) {
        if (!isMounted) return
        setLoadError(error instanceof Error ? error.message : "Не вдалося завантажити профіль")
      }
    }
    void loadProfile()
    return () => {
      isMounted = false
    }
  }, [])

  const handleEditChange = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setEditedProfile(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleNotificationChange = (key: keyof UserProfile["notifications"], value: boolean) => {
    setEditedProfile(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
    setHasChanges(true)
  }

  const handleSaveProfile = () => {
    setShowSuccessAlert(true)
    setTimeout(() => setShowSuccessAlert(false), 3000)
  }

  const handleCancelEdit = () => {
    setEditedProfile(profile)
    setIsEditing(false)
    setHasChanges(false)
  }

  const handleChangePassword = () => {
    // In production, this would call an API
    if (passwordData.new === passwordData.confirm && passwordData.new.length >= 8) {
      setShowPasswordDialog(false)
      setPasswordData({ current: "", new: "", confirm: "" })
      setShowSuccessAlert(true)
      setTimeout(() => setShowSuccessAlert(false), 3000)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""

    return new Date(dateString).toLocaleDateString("uk-UA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return ""

    return new Date(dateString).toLocaleString("uk-UA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase()
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim()
  const fallbackName = profile.email.split("@")[0] || "Користувач"
  const displayName = fullName || fallbackName
  const avatarInitials = getInitials(profile.firstName, profile.lastName) || displayName[0]?.toUpperCase() || "U"

  const isPasswordValid = passwordData.new.length >= 8 && passwordData.new === passwordData.confirm

  return (
    <div className="space-y-6">
      {/* Success Alert */}
      {showSuccessAlert && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="size-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Зміни успішно збережено
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Профіль</h1>
          <p className="text-sm text-muted-foreground">
            Керуйте своїми персональними даними та налаштуваннями
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                Скасувати
              </Button>
              <Button onClick={handleSaveProfile} disabled={!hasChanges} className="gap-2">
                <Save className="size-4" />
                Зберегти
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
              <User className="size-4" />
              Редагувати профіль
            </Button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="size-24">
                  <AvatarImage src={profile.avatarUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {avatarInitials}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button 
                    size="icon" 
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 size-8 rounded-full"
                  >
                    <Camera className="size-4" />
                  </Button>
                )}
              </div>
              <Badge variant="secondary" className="text-xs">
                Owner
              </Badge>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {displayName}
                </h2>
                {profile.position && (
                  <p className="text-muted-foreground">{profile.position}</p>
                )}
              </div>

              <div className="grid gap-3 text-sm">
                {profile.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="size-4" />
                    <span>{profile.email}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="size-4" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="size-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="size-4" />
                    <span>{profile.department}</span>
                  </div>
                )}
              </div>

              {(profile.joinedAt || profile.lastLoginAt) && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {profile.joinedAt && (
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      <span>Приєднався: {formatDate(profile.joinedAt)}</span>
                    </div>
                  )}
                  {profile.lastLoginAt && (
                    <div className="flex items-center gap-1">
                      <Shield className="size-3" />
                      <span>Останній вхід: {formatDateTime(profile.lastLoginAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="size-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">План та білінг</h3>
                  <Badge variant="secondary">Очікує API</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Clock className="size-3.5" />
                  <span>Дані підписки тимчасово недоступні — немає backend endpoint-ів.</span>
                </div>
              </div>
            </div>
            
            <Button variant="outline" asChild>
              <Link href="/dashboard/settings/billing">
                Керувати підпискою
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">Персональні дані</TabsTrigger>
          <TabsTrigger value="notifications">Сповіщення</TabsTrigger>
          <TabsTrigger value="security">Безпека</TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Основна інформація</CardTitle>
              <CardDescription>
                Ваші персональні та контактні дані
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ім&apos;я</Label>
                  {isEditing ? (
                    <Input
                      id="firstName"
                      value={editedProfile.firstName}
                      onChange={(e) => handleEditChange("firstName", e.target.value)}
                    />
                  ) : (
                    profile.firstName && <p className="text-sm py-2">{profile.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Прізвище</Label>
                  {isEditing ? (
                    <Input
                      id="lastName"
                      value={editedProfile.lastName}
                      onChange={(e) => handleEditChange("lastName", e.target.value)}
                    />
                  ) : (
                    profile.lastName && <p className="text-sm py-2">{profile.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => handleEditChange("email", e.target.value)}
                    />
                  ) : (
                    profile.email && <p className="text-sm py-2">{profile.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Телефон</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={editedProfile.phone}
                      onChange={(e) => handleEditChange("phone", e.target.value)}
                    />
                  ) : (
                    profile.phone && <p className="text-sm py-2">{profile.phone}</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position">Посада</Label>
                  {isEditing ? (
                    <Input
                      id="position"
                      value={editedProfile.position}
                      onChange={(e) => handleEditChange("position", e.target.value)}
                    />
                  ) : (
                    profile.position && <p className="text-sm py-2">{profile.position}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Відділ</Label>
                  {isEditing ? (
                    <Select
                      value={editedProfile.department}
                      onValueChange={(v) => handleEditChange("department", v)}
                    >
                      <SelectTrigger id="department">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dep => (
                          <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    profile.department && <p className="text-sm py-2">{profile.department}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="location">Локація</Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={editedProfile.location}
                      onChange={(e) => handleEditChange("location", e.target.value)}
                    />
                  ) : (
                    profile.location && <p className="text-sm py-2">{profile.location}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Часовий пояс</Label>
                  {isEditing ? (
                    <Select
                      value={editedProfile.timezone}
                      onValueChange={(v) => handleEditChange("timezone", v)}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezones.map(tz => (
                          <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    profile.timezone && <p className="text-sm py-2">{timezones.find(tz => tz.value === profile.timezone)?.label}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Про себе</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={editedProfile.bio}
                    onChange={(e) => handleEditChange("bio", e.target.value)}
                    rows={3}
                    placeholder="Розкажіть трохи про себе..."
                  />
                ) : (
                  profile.bio && <p className="text-sm py-2 text-muted-foreground">{profile.bio}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Соціальні посилання</CardTitle>
              <CardDescription>
                Ваші профілі в соціальних мережах та на інших платформах
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="linkedIn" className="flex items-center gap-2">
                    <Linkedin className="size-4" />
                    LinkedIn
                  </Label>
                  {isEditing ? (
                    <Input
                      id="linkedIn"
                      value={editedProfile.linkedIn || ""}
                      onChange={(e) => handleEditChange("linkedIn", e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                    />
                  ) : (
                    profile.linkedIn && <p className="text-sm py-2 text-muted-foreground">{profile.linkedIn}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="github" className="flex items-center gap-2">
                    <Github className="size-4" />
                    GitHub
                  </Label>
                  {isEditing ? (
                    <Input
                      id="github"
                      value={editedProfile.github || ""}
                      onChange={(e) => handleEditChange("github", e.target.value)}
                      placeholder="https://github.com/username"
                    />
                  ) : (
                    profile.github && <p className="text-sm py-2 text-muted-foreground">{profile.github}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="size-4" />
                  Веб-сайт
                </Label>
                {isEditing ? (
                  <Input
                    id="website"
                    value={editedProfile.website || ""}
                    onChange={(e) => handleEditChange("website", e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                ) : (
                  profile.website && <p className="text-sm py-2 text-muted-foreground">{profile.website}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="size-5" />
                Налаштування сповіщень
              </CardTitle>
              <CardDescription>
                Оберіть, які сповіщення ви хочете отримувати
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Канали сповіщень</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email сповіщення</Label>
                      <p className="text-xs text-muted-foreground">
                        Отримувати сповіщення на електронну пошту
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={editedProfile.notifications.email}
                      onCheckedChange={(v) => handleNotificationChange("email", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">Push-сповіщення</Label>
                      <p className="text-xs text-muted-foreground">
                        Отримувати сповіщення в браузері
                      </p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={editedProfile.notifications.push}
                      onCheckedChange={(v) => handleNotificationChange("push", v)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Типи сповіщень</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="project-updates">Оновлення проектів</Label>
                      <p className="text-xs text-muted-foreground">
                        Зміни статусу, бюджету та дедлайнів
                      </p>
                    </div>
                    <Switch
                      id="project-updates"
                      checked={editedProfile.notifications.projectUpdates}
                      onCheckedChange={(v) => handleNotificationChange("projectUpdates", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="invoice-alerts">Сповіщення про рахунки</Label>
                      <p className="text-xs text-muted-foreground">
                        Нові рахунки та терміни оплати
                      </p>
                    </div>
                    <Switch
                      id="invoice-alerts"
                      checked={editedProfile.notifications.invoiceAlerts}
                      onCheckedChange={(v) => handleNotificationChange("invoiceAlerts", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="weekly-reports">Щотижневі звіти</Label>
                      <p className="text-xs text-muted-foreground">
                        Зведення за тиждень кожного понеділка
                      </p>
                    </div>
                    <Switch
                      id="weekly-reports"
                      checked={editedProfile.notifications.weeklyReports}
                      onCheckedChange={(v) => handleNotificationChange("weeklyReports", v)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="team-mentions">Згадки в команді</Label>
                      <p className="text-xs text-muted-foreground">
                        Коли вас згадують у коментарях
                      </p>
                    </div>
                    <Switch
                      id="team-mentions"
                      checked={editedProfile.notifications.teamMentions}
                      onCheckedChange={(v) => handleNotificationChange("teamMentions", v)}
                    />
                  </div>
                </div>
              </div>

              {hasChanges && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} className="gap-2">
                    <Save className="size-4" />
                    Зберегти налаштування
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="size-5" />
                Безпека акаунту
              </CardTitle>
              <CardDescription>
                Керуйте паролем та двофакторною автентифікацією
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Password Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Пароль</h4>
                    <p className="text-xs text-muted-foreground">
                      Останній раз змінено: {formatDate(profile.lastPasswordChange)}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                    <Lock className="size-4 mr-2" />
                    Змінити пароль
                  </Button>
                </div>
              </div>

              <Separator />

              {/* 2FA Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Двофакторна автентифікація</h4>
                    <p className="text-xs text-muted-foreground">
                      Додатковий рівень захисту для вашого акаунту
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {profile.twoFactorEnabled ? (
                      <Badge variant="default" className="gap-1">
                        <Check className="size-3" />
                        Увімкнено
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="size-3" />
                        Вимкнено
                      </Badge>
                    )}
                    <Switch
                      checked={editedProfile.twoFactorEnabled}
                      onCheckedChange={(v) => handleEditChange("twoFactorEnabled", v)}
                    />
                  </div>
                </div>
                {editedProfile.twoFactorEnabled && (
                  <Alert>
                    <Shield className="size-4" />
                    <AlertDescription>
                      Двофакторна автентифікація захищає ваш акаунт. Ви отримуватимете код підтвердження 
                      при кожному вході з нового пристрою.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              {/* Active Sessions */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Активні сесії</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Globe className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Поточний пристрій</p>
                        <p className="text-xs text-muted-foreground">
                          Chrome на MacOS - Київ, Україна
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Активна зараз</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                        <Globe className="size-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">iPhone 15 Pro</p>
                        <p className="text-xs text-muted-foreground">
                          Safari на iOS - 2 дні тому
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Вийти
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Змінити пароль</DialogTitle>
            <DialogDescription>
              Введіть поточний пароль та новий пароль для зміни
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Поточний пароль</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                  placeholder="Введіть поточний пароль"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                >
                  {showPasswords.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">Новий пароль</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.new}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                  placeholder="Мінімум 8 символів"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                >
                  {showPasswords.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {passwordData.new && passwordData.new.length < 8 && (
                <p className="text-xs text-destructive">Пароль має містити мінімум 8 символів</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Підтвердіть новий пароль</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                  placeholder="Повторіть новий пароль"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                >
                  {showPasswords.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {passwordData.confirm && passwordData.new !== passwordData.confirm && (
                <p className="text-xs text-destructive">Паролі не співпадають</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Скасувати
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={!isPasswordValid || !passwordData.current}
            >
              Змінити пароль
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
