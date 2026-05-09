"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Client } from "@/lib/types/projects"
import { ApiClient, ApiProject, workforceApi } from "@/lib/api/workforce"

const countries = ["Україна", "Австралія", "Австрія", "Аргентина", "Бельгія", "Болгарія", "Бразилія", "Велика Британія", "Вірменія", "Греція", "Грузія", "Данія", "Естонія", "Ізраїль", "Індія", "Ірландія", "Іспанія", "Італія", "Казахстан", "Канада", "Катар", "Китай", "Латвія", "Литва", "Люксембург", "Мексика", "Нідерланди", "Німеччина", "Нова Зеландія", "Норвегія", "ОАЕ", "Південна Корея", "Польща", "Португалія", "Румунія", "Саудівська Аравія", "Сингапур", "Словаччина", "Словенія", "США", "Туреччина", "Угорщина", "Фінляндія", "Франція", "Хорватія", "Чехія", "Швейцарія", "Швеція", "Японія"]
const sortedCountries = ["Україна", ...countries.filter((c) => c !== "Україна").sort((a, b) => a.localeCompare(b, "uk"))]
const statusLabels: Record<Client["status"], string> = { lead: "Потенційний", active: "Активний", paused: "Призупинений", completed: "Завершений", archived: "Архівний" }
const projectStatusLabels: Record<ApiProject["status"], string> = { lead: "Лід", active: "Активний", finished: "Завершений", paused: "Призупинений" }
const normalizeStatus = (status?: string | null): Client["status"] => (status && ["lead", "active", "paused", "completed", "archived"].includes(status) ? status : "lead") as Client["status"]
const phoneRegex = /^\+?[1-9]\d{7,14}$/

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [error, setError] = useState<string | null>(null)
  const [countrySearch, setCountrySearch] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [viewClient, setViewClient] = useState<Client | null>(null)

  const [formData, setFormData] = useState({ companyName: "", contactPerson: "", email: "", phone: "", country: "Україна", website: "", notes: "", status: "lead" as Client["status"] })

  const mapApiClient = (apiClient: ApiClient): Client => ({
    id: apiClient.id.toString(),
    name: apiClient.company_name || apiClient.name,
    companyName: apiClient.company_name || apiClient.company || apiClient.name || undefined,
    contactPerson: apiClient.contact_person || undefined,
    email: apiClient.email || undefined,
    phone: apiClient.phone || undefined,
    country: apiClient.country || undefined,
    website: apiClient.website || undefined,
    notes: apiClient.notes || undefined,
    status: normalizeStatus(apiClient.status),
    createdAt: apiClient.created_at,
    totalRevenue: Number(apiClient.total_revenue || 0),
    activeProjects: apiClient.active_projects ?? 0,
  })

  const loadData = async () => {
    const [c, p] = await Promise.all([workforceApi.listClients(), workforceApi.listProjects()])
    setClients(c.map(mapApiClient))
    setProjects(p)
  }

  useEffect(() => {
    void loadData().catch((e) => setError(e instanceof Error ? e.message : "Не вдалося завантажити клієнтів"))
  }, [])

  const getClientProjects = (clientId: string) => projects.filter((p) => p.client.toString() === clientId)
  const getProjectStats = (clientId: string) => {
    const p = getClientProjects(clientId)
    return {
      total: p.length,
      active: p.filter((x) => x.status === "active").length,
      completed: p.filter((x) => x.status === "finished").length,
    }

  const validateForm = (): string | null => {
    if (!formData.companyName.trim()) return "Введіть назву компанії"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return "Введіть коректний Email"
    if (!formData.phone.trim()) return "Введіть номер телефону"
    if (!phoneRegex.test(formData.phone.trim().replace(/[\s()-]/g, ""))) return "Введіть коректний номер телефону"
    if (!formData.country.trim()) return "Оберіть країну"
    if (!formData.website.trim()) return "Введіть вебсайт"
    try { const url = new URL(formData.website.trim()); if (!["http:", "https:"].includes(url.protocol)) return "Введіть коректний URL" } catch { return "Введіть коректний URL" }
    if (!formData.status) return "Оберіть статус"
    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) return setError(validationError)
    const payload = { name: formData.companyName.trim(), company_name: formData.companyName.trim(), contact_person: formData.contactPerson.trim(), email: formData.email.trim(), phone: formData.phone.trim(), country: formData.country.trim(), website: formData.website.trim(), notes: formData.notes.trim(), status: formData.status }
    await workforceApi.createClient(payload)
    setError(null)
    setIsAddDialogOpen(false)
    setFormData({ companyName: "", contactPerson: "", email: "", phone: "", country: "Україна", website: "", notes: "", status: "lead" })
    await loadData()
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold tracking-tight">Клієнти</h1><Button onClick={() => setIsAddDialogOpen(true)}><Plus className="size-4 mr-2" />Додати клієнта</Button></div>
    {error && <Card><CardContent className="pt-6 text-sm text-destructive">{error}</CardContent></Card>}

    <Card><Table><TableHeader><TableRow><TableHead>Клієнт</TableHead><TableHead>Статус</TableHead><TableHead className="text-center">Усього проєктів</TableHead><TableHead className="text-center">Активні</TableHead><TableHead className="text-center">Завершені</TableHead></TableRow></TableHeader>
      <TableBody>{clients.map((c) => { const stats = getProjectStats(c.id); return <TableRow key={c.id} className="cursor-pointer" onClick={() => setViewClient(c)}><TableCell>{c.companyName || c.name}</TableCell><TableCell><Badge>{statusLabels[normalizeStatus(c.status)]}</Badge></TableCell><TableCell className="text-center">{stats.total}</TableCell><TableCell className="text-center">{stats.active}</TableCell><TableCell className="text-center">{stats.completed}</TableCell></TableRow>})}</TableBody>
    </Table></Card>

    <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{viewClient?.companyName || viewClient?.name}</DialogTitle><DialogDescription>Проєкти клієнта</DialogDescription></DialogHeader>
        <div className="space-y-3">{viewClient && getClientProjects(viewClient.id).map((p) => <div key={p.id} className="border rounded-lg p-3"><div className="flex items-center justify-between"><div className="font-medium">{p.name}</div><Badge>{projectStatusLabels[p.status]}</Badge></div><div className="text-sm text-muted-foreground mt-1">Дати: {p.start_date} — {p.end_date}</div><div className="text-sm text-muted-foreground">Бюджет: {p.total_contract_value ? `${p.total_contract_value} ${p.currency}` : "Не вказано"}</div><div className="text-sm text-muted-foreground">Команда: {p.client_name ? p.client_name : "Не вказано"}</div></div>)}{viewClient && getClientProjects(viewClient.id).length===0 && <div className="text-sm text-muted-foreground">У клієнта поки немає проєктів.</div>}</div>
      </DialogContent>
    </Dialog>

    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogContent><DialogHeader><DialogTitle>Додати клієнта</DialogTitle><DialogDescription>Заповніть усі обов’язкові поля</DialogDescription></DialogHeader><div className="grid gap-3"><Label>Назва компанії *</Label><Input placeholder="Наприклад: Acme Inc." value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} /><Label>Контактна особа</Label><Input placeholder="Наприклад: Іван Петренко" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} /><Label>Email *</Label><Input type="email" placeholder="Наприклад: contact@acme.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /><Label>Телефон *</Label><Input placeholder="Наприклад: +380 67 123 45 67" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /><Label>Країна *</Label><Select value={formData.country || "none"} onValueChange={(v) => setFormData({ ...formData, country: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Оберіть країну" /></SelectTrigger><SelectContent className="max-h-80 overflow-hidden p-0"><div className="sticky top-0 z-10 bg-popover px-2 pt-2 pb-1 border-b"><Input className="h-8" placeholder="Пошук країни…" value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} /></div><div className="max-h-64 overflow-y-auto py-1"><SelectItem value="none">Оберіть країну</SelectItem>{sortedCountries.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase())).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</div></SelectContent></Select><Label>Вебсайт *</Label><Input type="url" placeholder="Наприклад: https://acme.com" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} /><Label>Статус *</Label><Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Client["status"] })}><SelectTrigger><SelectValue placeholder="Оберіть статус" /></SelectTrigger><SelectContent><SelectItem value="lead">Потенційний</SelectItem><SelectItem value="active">Активний</SelectItem><SelectItem value="paused">Призупинений</SelectItem><SelectItem value="completed">Завершений</SelectItem><SelectItem value="archived">Архівний</SelectItem></SelectContent></Select><Label>Нотатки</Label><Textarea placeholder="Додайте внутрішні нотатки про клієнта…" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div><DialogFooter><Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Скасувати</Button><Button onClick={handleSave} disabled={!!validateForm()}>Зберегти</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
