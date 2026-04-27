"use client"

import { useEffect, useMemo, useState } from "react"
import { Save, Globe, Calendar, Users, Mail, Crown, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { workforceApi, type ApiCurrentUser, type ApiDeveloper, type ApiTeam } from "@/lib/api/workforce"

type Currency = "USD" | "UAH" | "EUR"

const fiscalYearMonths = [
  { value: "1", label: "Січень" },
  { value: "2", label: "Лютий" },
  { value: "3", label: "Березень" },
  { value: "4", label: "Квітень" },
  { value: "5", label: "Травень" },
  { value: "6", label: "Червень" },
  { value: "7", label: "Липень" },
  { value: "8", label: "Серпень" },
  { value: "9", label: "Вересень" },
  { value: "10", label: "Жовтень" },
  { value: "11", label: "Листопад" },
  { value: "12", label: "Грудень" },
]

export default function GeneralSettingsPage() {
  const [currentUser, setCurrentUser] = useState<ApiCurrentUser | null>(null)
  const [developers, setDevelopers] = useState<ApiDeveloper[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingDevId, setDeletingDevId] = useState<number | null>(null)

  const [settings, setSettings] = useState({
    baseCurrency: "USD" as Currency,
    fiscalYearStart: "1",
    companyName: "",
    timezone: "Europe/Kyiv",
  })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const savedCompanyName = localStorage.getItem("company_name")
    const savedCurrency = localStorage.getItem("base_currency") as Currency | null
    const savedTimezone = localStorage.getItem("timezone")
    const savedFiscalStart = localStorage.getItem("fiscal_year_start")

    setSettings((prev) => ({
      ...prev,
      companyName: savedCompanyName?.trim() || prev.companyName,
      baseCurrency: savedCurrency || prev.baseCurrency,
      timezone: savedTimezone || prev.timezone,
      fiscalYearStart: savedFiscalStart || prev.fiscalYearStart,
    }))

    let mounted = true
    const load = async () => {
      try {
        const [me, devs, teamsPayload] = await Promise.all([
          workforceApi.getCurrentUser(),
          workforceApi.listDevelopers(),
          workforceApi.listTeams(),
        ])
        if (!mounted) return
        setCurrentUser(me)
        setDevelopers(devs)
        setTeams(teamsPayload)
        if (!savedCompanyName?.trim()) {
          setSettings((prev) => ({ ...prev, companyName: me.username || "Моя компанія" }))
        }
        setLoadError(null)
      } catch (error) {
        if (!mounted) return
        setLoadError(error instanceof Error ? error.message : "Не вдалося завантажити користувачів")
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const teamMemberIds = useMemo(() => {
    const ids = new Set<number>()
    teams.forEach((team) => team.memberships.forEach((membership) => ids.add(membership.developer)))
    return ids
  }, [teams])

  const users = useMemo(() => {
    const owner = currentUser
      ? [{ id: `owner-${currentUser.id}`, name: currentUser.username, email: currentUser.email, role: "owner", isActive: true }]
      : []

    const members = developers
      .filter((dev) => teamMemberIds.has(dev.id))
      .map((dev) => ({
        id: `dev-${dev.id}`,
        name: dev.full_name,
        email: dev.email,
        role: "member",
        isActive: dev.is_active,
      }))

    return [...owner, ...members]
  }, [currentUser, developers, teamMemberIds])

  const orphanDevelopers = useMemo(
    () => developers.filter((dev) => !teamMemberIds.has(dev.id)),
    [developers, teamMemberIds]
  )

  const handleDeleteDeveloper = async (developerId: number) => {
    setDeletingDevId(developerId)
    setActionError(null)
    try {
      await workforceApi.deleteDeveloper(developerId)
      setDevelopers((prev) => prev.filter((dev) => dev.id !== developerId))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Не вдалося видалити учасника")
    } finally {
      setDeletingDevId(null)
    }
  }

  const handleSettingChange = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSaveSettings = () => {
    localStorage.setItem("company_name", settings.companyName.trim())
    localStorage.setItem("base_currency", settings.baseCurrency)
    localStorage.setItem("timezone", settings.timezone)
    localStorage.setItem("fiscal_year_start", settings.fiscalYearStart)
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Загальні налаштування</h1>
          <p className="text-sm text-muted-foreground">Налаштуйте організацію та системні параметри</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={!hasChanges} className="gap-2"><Save className="size-4" />Зберегти зміни</Button>
      </div>

      {loadError ? <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert> : null}
      {actionError ? <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert> : null}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="size-5" />Основні налаштування</CardTitle><CardDescription>Базова конфігурація вашої фінансової системи</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="companyName">Назва компанії</Label><Input id="companyName" value={settings.companyName} onChange={(e) => handleSettingChange("companyName", e.target.value)} placeholder="Назва вашої компанії" /></div>
            <div className="space-y-2"><Label htmlFor="timezone">Часовий пояс</Label><Select value={settings.timezone} onValueChange={(v) => handleSettingChange("timezone", v)}><SelectTrigger id="timezone"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Europe/Kyiv">Europe/Kyiv (UTC+2)</SelectItem><SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem><SelectItem value="America/New_York">America/New York (UTC-5)</SelectItem><SelectItem value="America/Los_Angeles">America/Los Angeles (UTC-8)</SelectItem></SelectContent></Select></div>
          </div>
          <Separator />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="baseCurrency">Базова валюта</Label><Select value={settings.baseCurrency} onValueChange={(v) => handleSettingChange("baseCurrency", v as Currency)}><SelectTrigger id="baseCurrency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD - Долар США ($)</SelectItem><SelectItem value="UAH">UAH - Українська гривня (₴)</SelectItem><SelectItem value="EUR">EUR - Євро (€)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="fiscalYear">Початок фінансового року</Label><Select value={settings.fiscalYearStart} onValueChange={(v) => handleSettingChange("fiscalYearStart", v)}><SelectTrigger id="fiscalYear"><Calendar className="size-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent>{fiscalYearMonths.map((month) => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" />Доступ команди (актуальні дані)</CardTitle><CardDescription>Власник + учасники, які зараз входять щонайменше в одну команду</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="size-10"><AvatarFallback className="bg-primary/10 text-primary">{user.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                  <div><div className="flex items-center gap-2"><span className="font-medium">{user.name}</span>{user.role === "owner" ? <Crown className="size-4 text-amber-500" /> : null}</div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-3" />{user.email}</div></div>
                </div>
                <Badge variant={user.role === "owner" ? "default" : "secondary"}>{user.role === "owner" ? "Власник" : user.isActive ? "Учасник" : "Неактивний"}</Badge>
              </div>
            ))}
            {users.length === 0 ? <p className="text-sm text-muted-foreground">Користувачів із бекенда не знайдено.</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Розробники без команди</CardTitle><CardDescription>Ці користувачі зараз не входять до жодної команди; їх можна повністю видалити.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {orphanDevelopers.map((dev) => (
            <div key={dev.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{dev.full_name}</p>
                <p className="text-sm text-muted-foreground">{dev.email}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteDeveloper(dev.id)}
                disabled={deletingDevId === dev.id}
              >
                <Trash2 className="mr-2 size-4" />
                {deletingDevId === dev.id ? "Видалення..." : "Видалити"}
              </Button>
            </div>
          ))}
          {orphanDevelopers.length === 0 ? <p className="text-sm text-muted-foreground">Немає розробників без команди.</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
