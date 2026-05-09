"use client"

import { useEffect, useMemo, useState } from "react"
import { Eye, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Client } from "@/lib/types/projects"
import { ApiClient, ApiProject, workforceApi } from "@/lib/api/workforce"

const countries = ["Україна", "Польща", "Німеччина", "Велика Британія", "США", "Канада", "Франція", "Іспанія", "Італія"]
const statusLabels: Record<Client["status"], string> = { lead: "Потенційний", active: "Активний", paused: "Призупинений", completed: "Завершений", archived: "Архівний" }
const normalizeStatus = (status?: string | null): Client["status"] => (status && ["lead", "active", "paused", "completed", "archived"].includes(status) ? status : "lead") as Client["status"]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("default")
  const [countryFilter, setCountryFilter] = useState<string>("all")
  const [profitFilter, setProfitFilter] = useState<string>("all")

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
    totalRevenue: Number(apiClient.total_revenue_computed ?? apiClient.total_revenue ?? 0),
    activeProjects: apiClient.active_projects ?? 0,
    totalProjects: apiClient.total_projects ?? 0,
    totalCost: Number(apiClient.total_cost ?? 0),
    profit: Number(apiClient.profit ?? 0),
    marginPercent: Number(apiClient.margin_percent ?? 0),
  })

  const loadData = async () => {
    const [c, p] = await Promise.all([workforceApi.listClients(), workforceApi.listProjects()])
    setClients(c.map(mapApiClient))
    setProjects(p)
  }

  useEffect(() => { void loadData().catch((e) => setError(e instanceof Error ? e.message : "Не вдалося завантажити клієнтів")) }, [])

  const filteredClients = useMemo(() => clients.filter((c) => {
    const q = search.toLowerCase().trim()
    const text = [c.companyName, c.contactPerson, c.email, c.phone, c.country].join(" ").toLowerCase()
    const searchMatch = !q || text.includes(q)
    const statusMatch = statusFilter === "default" ? c.status !== "archived" : statusFilter === "all" ? true : c.status === statusFilter
    const countryMatch = countryFilter === "all" ? true : c.country === countryFilter
    const p = c.profit || 0
    const profitMatch = profitFilter === "all" ? true : profitFilter === "profit" ? p > 0 : profitFilter === "break" ? p === 0 : p < 0
    return searchMatch && statusMatch && countryMatch && profitMatch
  }), [clients, search, statusFilter, countryFilter, profitFilter])

  const totalClients = filteredClients.length
  const activeClients = filteredClients.filter((c) => (c.activeProjects || 0) > 0).length
  const totalRevenue = filteredClients.reduce((s, c) => s + (c.totalRevenue || 0), 0)
  const totalCost = filteredClients.reduce((s, c) => s + (c.totalCost || 0), 0)
  const totalProfit = filteredClients.reduce((s, c) => s + (c.profit || 0), 0)
  const avgMargin = filteredClients.length ? filteredClients.reduce((s, c) => s + (c.marginPercent || 0), 0) / filteredClients.length : 0
  const money = (n: number) => new Intl.NumberFormat("uk-UA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

  const onSave = async () => {
    const payload = { name: formData.companyName.trim(), company_name: formData.companyName.trim(), contact_person: formData.contactPerson.trim(), email: formData.email.trim(), phone: formData.phone.trim(), country: formData.country.trim(), website: formData.website.trim(), notes: formData.notes.trim(), status: formData.status }
    if (editingClient) await workforceApi.updateClient(editingClient.id, payload)
    else await workforceApi.createClient(payload)
    setIsAddDialogOpen(false); setEditingClient(null)
    setFormData({ companyName: "", contactPerson: "", email: "", phone: "", country: "Україна", website: "", notes: "", status: "lead" })
    await loadData()
  }

  return <div className="space-y-5">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Клієнти</h1><Button onClick={() => setIsAddDialogOpen(true)}><Plus className="size-4 mr-2"/>Додати клієнта</Button></div>

    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Усього клієнтів</div><div className="text-xl font-semibold">{totalClients}</div></CardContent></Card>
      <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Активні клієнти</div><div className="text-xl font-semibold">{activeClients}</div></CardContent></Card>
      <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Загальний дохід</div><div className="text-xl font-semibold">{money(totalRevenue)}</div></CardContent></Card>
      <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Загальні витрати</div><div className="text-xl font-semibold">{money(totalCost)}</div></CardContent></Card>
      <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Загальний прибуток</div><div className={`text-xl font-semibold ${totalProfit<0?"text-destructive":"text-emerald-600"}`}>{money(totalProfit)}</div></CardContent></Card>
      <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Середня маржинальність</div><div className={`text-xl font-semibold ${avgMargin<0?"text-destructive":"text-emerald-600"}`}>{avgMargin.toFixed(1)}%</div></CardContent></Card>
    </div>

    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Портфель замовників</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="Пошук за назвою, контактом, email, телефоном, країною" value={search} onChange={(e)=>setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue placeholder="Статус"/></SelectTrigger><SelectContent><SelectItem value="default">Стандартний список</SelectItem><SelectItem value="all">Усі</SelectItem><SelectItem value="lead">Потенційні</SelectItem><SelectItem value="active">Активні</SelectItem><SelectItem value="paused">Призупинені</SelectItem><SelectItem value="completed">Завершені</SelectItem><SelectItem value="archived">Архівні</SelectItem></SelectContent></Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}><SelectTrigger><SelectValue placeholder="Країна"/></SelectTrigger><SelectContent><SelectItem value="all">Усі країни</SelectItem>{countries.map((c)=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
          <Select value={profitFilter} onValueChange={setProfitFilter}><SelectTrigger><SelectValue placeholder="Прибутковість"/></SelectTrigger><SelectContent><SelectItem value="all">Усі</SelectItem><SelectItem value="profit">Прибуткові</SelectItem><SelectItem value="break">Беззбиткові</SelectItem><SelectItem value="loss">Збиткові</SelectItem></SelectContent></Select>
        </div>

        <Table>
          <TableHeader><TableRow><TableHead>Клієнт</TableHead><TableHead>Статус</TableHead><TableHead>Контакти</TableHead><TableHead>Країна</TableHead><TableHead>Проєкти</TableHead><TableHead className="text-right">Дохід</TableHead><TableHead className="text-right">Витрати</TableHead><TableHead className="text-right">Прибуток</TableHead><TableHead className="text-right">Маржинальність</TableHead><TableHead className="text-right">Дії</TableHead></TableRow></TableHeader>
          <TableBody>{filteredClients.map((c)=>{ const margin=c.marginPercent||0; const profit=c.profit||0; return <TableRow key={c.id} className="hover:bg-muted/40"><TableCell><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback>{(c.companyName||c.name||"C").slice(0,2).toUpperCase()}</AvatarFallback></Avatar><div><div className="font-medium">{c.companyName || c.name}</div><div className="text-xs text-muted-foreground">{c.contactPerson || "Контакт не вказано"}</div></div></div></TableCell><TableCell><Badge variant="outline">{statusLabels[normalizeStatus(c.status)]}</Badge></TableCell><TableCell><div className="text-sm">{c.email || "—"}</div><div className="text-xs text-muted-foreground">{c.phone || "—"}</div></TableCell><TableCell>{c.country || "—"}</TableCell><TableCell><div className="text-sm">Усього: {c.totalProjects || 0}</div><div className="text-xs text-muted-foreground">Активні: {c.activeProjects || 0}</div></TableCell><TableCell className="text-right">{money(c.totalRevenue || 0)}</TableCell><TableCell className="text-right">{money(c.totalCost || 0)}</TableCell><TableCell className={`text-right font-medium ${profit<0?"text-destructive":"text-emerald-600"}`}>{money(profit)}</TableCell><TableCell className="text-right"><Badge variant={margin<0?"destructive":margin>30?"default":"secondary"}>{margin.toFixed(1)}%</Badge></TableCell><TableCell className="text-right"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="size-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>setViewClient(c)}><Eye className="size-4 mr-2"/>Деталі</DropdownMenuItem><DropdownMenuItem onClick={()=>{setEditingClient(c); setFormData({ companyName:c.companyName||"", contactPerson:c.contactPerson||"", email:c.email||"", phone:c.phone||"", country:c.country||"Україна", website:c.website||"", notes:c.notes||"", status:normalizeStatus(c.status) }); setIsAddDialogOpen(true)}}><Pencil className="size-4 mr-2"/>Редагувати</DropdownMenuItem><DropdownMenuItem onClick={async()=>{await workforceApi.updateClient(c.id,{status:"archived"}); await loadData()}}>Архівувати</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={async()=>{await workforceApi.deleteClient(c.id); await loadData()}}><Trash2 className="size-4 mr-2"/>Видалити</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>})}</TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={!!viewClient} onOpenChange={()=>setViewClient(null)}><DialogContent><DialogHeader><DialogTitle>{viewClient?.companyName || viewClient?.name}</DialogTitle><DialogDescription>Деталі клієнта та проєкти</DialogDescription></DialogHeader><div className="space-y-2 text-sm">{viewClient && projects.filter((p)=>p.client.toString()===viewClient.id).map((p)=><div key={p.id} className="border rounded p-2"><div className="font-medium">{p.name}</div><div>Статус: {p.status}</div><div>Бюджет: {p.total_contract_value || "—"} {p.currency}</div><div>Дати: {p.start_date} — {p.end_date}</div><div>Команда: Немає даних</div></div>)}</div></DialogContent></Dialog>

    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingClient?"Редагувати клієнта":"Додати клієнта"}</DialogTitle><DialogDescription>Заповніть дані клієнта</DialogDescription></DialogHeader><div className="grid gap-3"><Label>Назва компанії *</Label><Input value={formData.companyName} onChange={(e)=>setFormData({...formData, companyName:e.target.value})}/><Label>Контактна особа</Label><Input value={formData.contactPerson} onChange={(e)=>setFormData({...formData, contactPerson:e.target.value})}/><Label>Email *</Label><Input type="email" value={formData.email} onChange={(e)=>setFormData({...formData, email:e.target.value})}/><Label>Телефон *</Label><Input value={formData.phone} onChange={(e)=>setFormData({...formData, phone:e.target.value})}/><Label>Країна *</Label><Select value={formData.country} onValueChange={(v)=>setFormData({...formData,country:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{countries.map((c)=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Label>Вебсайт *</Label><Input value={formData.website} onChange={(e)=>setFormData({...formData, website:e.target.value})}/><Label>Статус *</Label><Select value={formData.status} onValueChange={(v)=>setFormData({...formData,status:v as Client["status"]})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="lead">Потенційний</SelectItem><SelectItem value="active">Активний</SelectItem><SelectItem value="paused">Призупинений</SelectItem><SelectItem value="completed">Завершений</SelectItem><SelectItem value="archived">Архівний</SelectItem></SelectContent></Select><Label>Нотатки</Label><Textarea value={formData.notes} onChange={(e)=>setFormData({...formData,notes:e.target.value})}/></div><DialogFooter><Button variant="outline" onClick={()=>setIsAddDialogOpen(false)}>Скасувати</Button><Button onClick={onSave}>Зберегти</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
