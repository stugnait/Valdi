"use client"

import { useEffect, useState } from "react"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Building2, Mail, Phone, Globe, User, DollarSign, FolderKanban, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Client } from "@/lib/types/projects"
import { ApiClient, ApiProject, workforceApi } from "@/lib/api/workforce"

const countries = ["USA", "Ukraine", "Germany", "UK", "Canada"]
const countryLabels: Record<string, string> = { USA: "США", Ukraine: "Україна", Germany: "Німеччина", UK: "Велика Британія", Canada: "Канада" }
const statusLabels: Record<Client["status"], string> = { lead: "Потенційний", active: "Активний", paused: "Призупинений", completed: "Завершений", archived: "Архівний" }
const normalizeStatus = (status?: string | null): Client["status"] => (status && ["lead","active","paused","completed","archived"].includes(status) ? status : "lead") as Client["status"]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [countryFilter, setCountryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("active_only")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)

  const [formData, setFormData] = useState({ name: "", companyName: "", contactPerson: "", email: "", phone: "", country: "", website: "", notes: "", status: "lead" as Client["status"] })

  const totalRevenue = clients.reduce((sum, c) => sum + c.totalRevenue, 0)
  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || client.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCountry = countryFilter === "all" || client.country === countryFilter
    const matchesStatus = statusFilter === "active_only" ? normalizeStatus(client.status) !== "archived" : normalizeStatus(client.status) === "archived"
    return matchesSearch && matchesCountry && matchesStatus
  })

  const mapApiClient = (apiClient: ApiClient): Client => ({
    id: apiClient.id.toString(), name: apiClient.name, companyName: apiClient.company_name || apiClient.company || undefined, contactPerson: apiClient.contact_person || undefined,
    email: apiClient.email || undefined, phone: apiClient.phone || undefined, country: apiClient.country || undefined, website: apiClient.website || undefined,
    notes: apiClient.notes || undefined, status: normalizeStatus(apiClient.status), createdAt: apiClient.created_at, totalRevenue: Number(apiClient.total_revenue || 0), activeProjects: apiClient.active_projects ?? 0,
  })

  const loadData = async () => { const [c, p] = await Promise.all([workforceApi.listClients(), workforceApi.listProjects()]); setClients(c.map(mapApiClient)); setProjects(p); setIsLoading(false) }
  useEffect(() => { void loadData().catch((e) => { setError(e instanceof Error ? e.message : "Не вдалося завантажити клієнтів"); setIsLoading(false) }) }, [])

  const handleSave = async () => {
    if (!formData.name.trim()) return setError("Поле «Ім’я клієнта» є обов’язковим")
    if (!formData.email.trim() && !formData.phone.trim()) return setError("Заповніть email або телефон")
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return setError("Некоректний email")
    if (formData.website.trim() && !/^https?:\/\//.test(formData.website.trim())) return setError("URL сайту має починатися з http:// або https://")
    const payload = { name: formData.name.trim(), company_name: formData.companyName.trim(), contact_person: formData.contactPerson.trim(), email: formData.email.trim(), phone: formData.phone.trim(), country: formData.country.trim(), website: formData.website.trim(), notes: formData.notes.trim(), status: formData.status }
    editingClient ? await workforceApi.updateClient(editingClient.id, payload) : await workforceApi.createClient(payload)
    setIsAddDialogOpen(false); setEditingClient(null); setFormData({ name: "", companyName: "", contactPerson: "", email: "", phone: "", country: "", website: "", notes: "", status: "lead" }); setError(null); await loadData()
  }

  return <div className="space-y-6">{/* UI скорочено */}
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold tracking-tight">Клієнти</h1><Button onClick={() => setIsAddDialogOpen(true)}><Plus className="size-4 mr-2" />Додати клієнта</Button></div>
    {error && <Card><CardContent className="pt-6 text-sm text-destructive">{error}</CardContent></Card>}
    <div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>Усього клієнтів</CardTitle></CardHeader><CardContent>{clients.length}</CardContent></Card><Card><CardHeader><CardTitle>Загальний дохід</CardTitle></CardHeader><CardContent>${totalRevenue.toLocaleString()}</CardContent></Card></div>
    <div className="flex gap-3"><Input placeholder="Пошук замовників…" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} /><Select value={countryFilter} onValueChange={setCountryFilter}><SelectTrigger><SelectValue placeholder="Країна"/></SelectTrigger><SelectContent><SelectItem value="all">Усі країни</SelectItem>{countries.map(c=><SelectItem key={c} value={c}>{countryLabels[c] ?? c}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="active_only">Стандартний список</SelectItem><SelectItem value="archived">Архівні</SelectItem></SelectContent></Select></div>
    <Card><Table><TableHeader><TableRow><TableHead>Клієнт</TableHead><TableHead>Статус</TableHead><TableHead>Контакт</TableHead><TableHead>Країна</TableHead></TableRow></TableHeader><TableBody>{filteredClients.map(client=><TableRow key={client.id}><TableCell>{client.name}</TableCell><TableCell><Badge>{statusLabels[normalizeStatus(client.status)]}</Badge></TableCell><TableCell>{client.email || client.phone || "—"}</TableCell><TableCell>{client.country ? (countryLabels[client.country] ?? client.country) : "—"}</TableCell></TableRow>)}</TableBody></Table></Card>
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingClient ? "Редагувати клієнта" : "Додати клієнта"}</DialogTitle><DialogDescription>Заповніть дані замовника</DialogDescription></DialogHeader><div className="grid gap-3"><Label>Ім’я клієнта *</Label><Input value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} placeholder="Наприклад: Acme"/><Label>Назва компанії</Label><Input value={formData.companyName} onChange={(e)=>setFormData({...formData,companyName:e.target.value})}/><Label>Email</Label><Input type="email" value={formData.email} onChange={(e)=>setFormData({...formData,email:e.target.value})}/><Label>Телефон</Label><Input value={formData.phone} onChange={(e)=>setFormData({...formData,phone:e.target.value})}/><Label>Країна</Label><Select value={formData.country || "none"} onValueChange={(v)=>setFormData({...formData,country:v==="none"?"":v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Не вказано</SelectItem>{countries.map(c=><SelectItem key={c} value={c}>{countryLabels[c] ?? c}</SelectItem>)}</SelectContent></Select><Label>Вебсайт</Label><Input type="url" placeholder="https://example.com" value={formData.website} onChange={(e)=>setFormData({...formData,website:e.target.value})}/><Label>Статус</Label><Select value={formData.status} onValueChange={(v)=>setFormData({...formData,status:v as Client["status"]})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="lead">Потенційний</SelectItem><SelectItem value="active">Активний</SelectItem><SelectItem value="paused">Призупинений</SelectItem><SelectItem value="completed">Завершений</SelectItem><SelectItem value="archived">Архівний</SelectItem></SelectContent></Select><Label>Нотатки</Label><Textarea value={formData.notes} onChange={(e)=>setFormData({...formData,notes:e.target.value})} /></div><DialogFooter><Button variant="outline" onClick={()=>setIsAddDialogOpen(false)}>Скасувати</Button><Button onClick={handleSave}>Зберегти</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
