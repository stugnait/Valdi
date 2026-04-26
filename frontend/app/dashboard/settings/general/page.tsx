"use client"

import { useEffect, useMemo, useState } from "react"
import { Save, Globe, Calendar, Users, Mail, Crown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { workforceApi, type ApiCurrentUser, type ApiDeveloper } from "@/lib/api/workforce"

type Currency = "USD" | "UAH" | "EUR"

const fiscalYearMonths = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

export default function GeneralSettingsPage() {
  const [currentUser, setCurrentUser] = useState<ApiCurrentUser | null>(null)
  const [developers, setDevelopers] = useState<ApiDeveloper[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

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
        const [me, devs] = await Promise.all([workforceApi.getCurrentUser(), workforceApi.listDevelopers()])
        if (!mounted) return
        setCurrentUser(me)
        setDevelopers(devs)
        if (!savedCompanyName?.trim()) {
          setSettings((prev) => ({ ...prev, companyName: me.username || "My Company" }))
        }
        setLoadError(null)
      } catch (error) {
        if (!mounted) return
        setLoadError(error instanceof Error ? error.message : "Unable to load users")
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const users = useMemo(() => {
    const owner = currentUser
      ? [{ id: `owner-${currentUser.id}`, name: currentUser.username, email: currentUser.email, role: "owner", isActive: true }]
      : []

    const members = developers.map((dev) => ({
      id: `dev-${dev.id}`,
      name: dev.full_name,
      email: dev.email,
      role: "member",
      isActive: dev.is_active,
    }))

    return [...owner, ...members]
  }, [currentUser, developers])

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
          <h1 className="text-2xl font-semibold tracking-tight">General Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your organization and system preferences</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={!hasChanges} className="gap-2"><Save className="size-4" />Save Changes</Button>
      </div>

      {loadError ? <Card className="border-destructive/50"><CardContent className="pt-6 text-destructive text-sm">{loadError}</CardContent></Card> : null}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="size-5" />Core Settings</CardTitle><CardDescription>Base configuration for your financial system</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="companyName">Company Name</Label><Input id="companyName" value={settings.companyName} onChange={(e) => handleSettingChange("companyName", e.target.value)} placeholder="Your company name" /></div>
            <div className="space-y-2"><Label htmlFor="timezone">Timezone</Label><Select value={settings.timezone} onValueChange={(v) => handleSettingChange("timezone", v)}><SelectTrigger id="timezone"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Europe/Kyiv">Europe/Kyiv (UTC+2)</SelectItem><SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem><SelectItem value="America/New_York">America/New York (UTC-5)</SelectItem><SelectItem value="America/Los_Angeles">America/Los Angeles (UTC-8)</SelectItem></SelectContent></Select></div>
          </div>
          <Separator />
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="baseCurrency">Base Currency</Label><Select value={settings.baseCurrency} onValueChange={(v) => handleSettingChange("baseCurrency", v as Currency)}><SelectTrigger id="baseCurrency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD - US Dollar ($)</SelectItem><SelectItem value="UAH">UAH - Ukrainian Hryvnia (₴)</SelectItem><SelectItem value="EUR">EUR - Euro (€)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="fiscalYear">Fiscal Year Start</Label><Select value={settings.fiscalYearStart} onValueChange={(v) => handleSettingChange("fiscalYearStart", v)}><SelectTrigger id="fiscalYear"><Calendar className="size-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger><SelectContent>{fiscalYearMonths.map((month) => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" />Team access (live)</CardTitle><CardDescription>Owner from auth + members from developers endpoint</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Avatar className="size-10"><AvatarFallback className="bg-primary/10 text-primary">{user.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                  <div><div className="flex items-center gap-2"><span className="font-medium">{user.name}</span>{user.role === "owner" ? <Crown className="size-4 text-amber-500" /> : null}</div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="size-3" />{user.email}</div></div>
                </div>
                <Badge variant={user.role === "owner" ? "default" : "secondary"}>{user.role === "owner" ? "Owner" : user.isActive ? "Member" : "Inactive"}</Badge>
              </div>
            ))}
            {users.length === 0 ? <p className="text-sm text-muted-foreground">No users found from backend.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
