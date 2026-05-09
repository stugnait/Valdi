"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const countries = ["USA", "Ukraine", "Germany", "UK", "Canada"]
const countryLabels: Record<string, string> = { USA: "США", Ukraine: "Україна", Germany: "Німеччина", UK: "Велика Британія", Canada: "Канада" }
const statusLabels: Record<Client["status"], string> = { lead: "Потенційний", active: "Активний", paused: "Призупинений", completed: "Завершений", archived: "Архівний" }
const normalizeStatus = (status?: string | null): Client["status"] => (status && ["lead", "active", "paused", "completed", "archived"].includes(status) ? status : "lead") as Client["status"]
const phoneRegex = /^\+?[1-9]\d{7,14}$/

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const [formData, setFormData] = useState({ name: "", companyName: "", contactPerson: "", email: "", phone: "", country: "", website: "", notes: "", status: "lead" as Client["status"] })

  const mapApiClient = (apiClient: ApiClient): Client => ({
    id: apiClient.id.toString(),
    name: apiClient.name,
    companyName: apiClient.company_name || apiClient.company || undefined,
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

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Введіть ім’я клієнта"
    if (!formData.companyName.trim()) return "Введіть назву компанії"
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) return "Введіть коректний Email"
    if (!formData.phone.trim()) return "Введіть номер телефону"
    if (!phoneRegex.test(formData.phone.trim().replace(/[\s()-]/g, ""))) return "Введіть коректний номер телефону"
    if (!formData.country.trim()) return "Оберіть країну"
    if (!formData.website.trim()) return "Введіть вебсайт"
    try {
      const url = new URL(formData.website.trim())
      if (!["http:", "https:"].includes(url.protocol)) return "Введіть коректний URL"
    } catch {
      return "Введіть коректний URL"
    }
    if (!formData.status) return "Оберіть статус"
    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const payload = {
      name: formData.name.trim(),
      company_name: formData.companyName.trim(),
      contact_person: formData.contactPerson.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      country: formData.country.trim(),
      website: formData.website.trim(),
      notes: formData.notes.trim(),
      status: formData.status,
    }

    await workforceApi.createClient(payload)
    setError(null)
    setIsAddDialogOpen(false)
    setFormData({ name: "", companyName: "", contactPerson: "", email: "", phone: "", country: "", website: "", notes: "", status: "lead" })
    await loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Клієнти</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="size-4 mr-2" />Додати клієнта</Button>
      </div>

      {error && <Card><CardContent className="pt-6 text-sm text-destructive">{error}</CardContent></Card>}

      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Клієнт</TableHead><TableHead>Статус</TableHead><TableHead>Проєкти</TableHead></TableRow></TableHeader>
          <TableBody>{clients.map((c) => <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell><Badge>{statusLabels[normalizeStatus(c.status)]}</Badge></TableCell><TableCell>{projects.filter((p) => p.client.toString() === c.id).length}</TableCell></TableRow>)}</TableBody>
        </Table>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Додати клієнта</DialogTitle>
            <DialogDescription>Заповніть усі обов’язкові поля</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Label>Ім’я клієнта *</Label>
            <Input placeholder="Наприклад: Acme" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

            <Label>Назва компанії *</Label>
            <Input placeholder="Наприклад: Acme Inc." value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} />

            <Label>Контактна особа</Label>
            <Input placeholder="Наприклад: Іван Петренко" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />

            <Label>Email *</Label>
            <Input type="email" placeholder="Наприклад: contact@acme.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />

            <Label>Телефон *</Label>
            <Input placeholder="Наприклад: +380 67 123 45 67" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />

            <Label>Країна *</Label>
            <Select value={formData.country || "none"} onValueChange={(v) => setFormData({ ...formData, country: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Оберіть країну" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Оберіть країну</SelectItem>{countries.map((c) => <SelectItem key={c} value={c}>{countryLabels[c] ?? c}</SelectItem>)}</SelectContent>
            </Select>

            <Label>Вебсайт *</Label>
            <Input type="url" placeholder="Наприклад: https://acme.com" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} />

            <Label>Статус *</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as Client["status"] })}>
              <SelectTrigger><SelectValue placeholder="Оберіть статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Потенційний</SelectItem>
                <SelectItem value="active">Активний</SelectItem>
                <SelectItem value="paused">Призупинений</SelectItem>
                <SelectItem value="completed">Завершений</SelectItem>
                <SelectItem value="archived">Архівний</SelectItem>
              </SelectContent>
            </Select>

            <Label>Нотатки</Label>
            <Textarea placeholder="Додайте внутрішні нотатки про клієнта…" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Скасувати</Button>
            <Button onClick={handleSave} disabled={!!validateForm()}>Зберегти</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
