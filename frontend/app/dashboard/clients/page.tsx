"use client"

import { useEffect, useState } from "react"
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  Mail,
  Phone,
  Globe,
  User,
  DollarSign,
  FolderKanban,
  Calendar,
  ExternalLink
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Client } from "@/lib/types/projects"
import { ApiClient, ApiProject, workforceApi } from "@/lib/api/workforce"

const countries = [
  "USA", "Ukraine", "Germany", "UK", "Canada", "Sweden", "Netherlands",
  "Poland", "Hong Kong", "Singapore", "Australia", "France", "Spain", "Italy"
]

const countryLabels: Record<string, string> = {
  USA: "США",
  Ukraine: "Україна",
  Germany: "Німеччина",
  UK: "Велика Британія",
  Canada: "Канада",
  Sweden: "Швеція",
  Netherlands: "Нідерланди",
  Poland: "Польща",
  "Hong Kong": "Гонконг",
  Singapore: "Сінгапур",
  Australia: "Австралія",
  France: "Франція",
  Spain: "Іспанія",
  Italy: "Італія",
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [countryFilter, setCountryFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [viewClient, setViewClient] = useState<Client | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    contactPerson: "",
    phone: "",
    country: "",
    notes: "",
  })

  // Stats
  const totalRevenue = clients.reduce((sum, c) => sum + c.totalRevenue, 0)
  const activeClients = clients.filter(c => c.activeProjects > 0).length

  // Filtered clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCountry = countryFilter === "all" || client.country === countryFilter
    return matchesSearch && matchesCountry
  })

  const mapApiClient = (apiClient: ApiClient): Client => ({
    id: apiClient.id.toString(),
    name: apiClient.name,
    company: apiClient.company || undefined,
    email: apiClient.email || undefined,
    contactPerson: apiClient.contact_person || undefined,
    phone: apiClient.phone || undefined,
    country: apiClient.country || undefined,
    notes: apiClient.notes || undefined,
    createdAt: apiClient.created_at,
    totalRevenue: Number(apiClient.total_revenue || 0),
    activeProjects: apiClient.active_projects ?? 0,
  })

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [clientsResponse, projectsResponse] = await Promise.all([
        workforceApi.listClients(),
        workforceApi.listProjects(),
      ])
      setClients(clientsResponse.map(mapApiClient))
      setProjects(projectsResponse)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не вдалося завантажити клієнтів")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const resetForm = () => {
    setFormData({
      name: "",
      company: "",
      email: "",
      contactPerson: "",
      phone: "",
      country: "",
      notes: "",
    })
    setEditingClient(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (client: Client) => {
    setFormData({
      name: client.name,
      company: client.company || "",
      email: client.email || "",
      contactPerson: client.contactPerson || "",
      phone: client.phone || "",
      country: client.country || "",
      notes: client.notes || "",
    })
    setEditingClient(client)
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    try {
      setError(null)
      const payload = {
        name: formData.name.trim(),
        company: formData.company.trim(),
        email: formData.email.trim(),
        contact_person: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        country: formData.country.trim(),
        notes: formData.notes.trim(),
      }

      if (editingClient) {
        await workforceApi.updateClient(editingClient.id, payload)
      } else {
        await workforceApi.createClient(payload)
      }

      await loadData()
      setIsAddDialogOpen(false)
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не вдалося зберегти клієнта")
    }
  }

  const handleDelete = async () => {
    if (deleteClient) {
      try {
        setError(null)
        await workforceApi.deleteClient(deleteClient.id)
        await loadData()
        setDeleteClient(null)
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Не вдалося видалити клієнта")
      }
    }
  }

  // Get projects for a client
  const getClientProjects = (clientId: string) => {
    return projects.filter((project) => project.client.toString() === clientId)
  }

  const getCountryLabel = (country?: string) => {
    if (!country) return ""
    return countryLabels[country] || country
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Клієнти</h1>
          <p className="text-sm text-muted-foreground">
            Керуйте клієнтськими контактами та взаємовідносинами
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Додати клієнта
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Завантажуємо клієнтів…</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Усього клієнтів</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">З активними проєктами: {activeClients}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Загальний дохід</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">За весь час від усіх клієнтів</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Країни</CardTitle>
            <Globe className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(clients.map(c => c.country).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Географія клієнтів</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук клієнтів…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[180px]">
            <Globe className="size-4 mr-2" />
            <SelectValue placeholder="Країна" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі країни</SelectItem>
            {Array.from(new Set(clients.map(c => c.country).filter(Boolean))).map(country => (
              <SelectItem key={country} value={country!}>{getCountryLabel(country || "")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clients Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клієнт</TableHead>
              <TableHead>Контакт</TableHead>
              <TableHead>Країна</TableHead>
              <TableHead className="text-right">Дохід</TableHead>
              <TableHead className="text-center">Проєкти</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id} className="cursor-pointer" onClick={() => setViewClient(client)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {client.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{client.name}</div>
                      {client.company && (
                        <div className="text-sm text-muted-foreground">{client.company}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {client.contactPerson && (
                    <div className="text-sm">{client.contactPerson}</div>
                  )}
                  {client.email && (
                    <div className="text-sm text-muted-foreground">{client.email}</div>
                  )}
                </TableCell>
                <TableCell>
                  {client.country && (
                    <Badge variant="outline">{getCountryLabel(client.country)}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${client.totalRevenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {client.activeProjects > 0 ? (
                    <Badge>{client.activeProjects} активних</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewClient(client)}>
                        <ExternalLink className="size-4 mr-2" />
                        Деталі
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(client)}>
                        <Pencil className="size-4 mr-2" />
                        Редагувати
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteClient(client)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        Видалити
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Клієнтів не знайдено
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* View Client Dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {viewClient?.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{viewClient?.name}</div>
                {viewClient?.company && (
                  <div className="text-sm font-normal text-muted-foreground">{viewClient.company}</div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewClient && (
            <div className="space-y-6 py-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {viewClient.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="size-4 text-muted-foreground" />
                    <span>{viewClient.contactPerson}</span>
                  </div>
                )}
                {viewClient.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground" />
                    <a href={`mailto:${viewClient.email}`} className="text-primary hover:underline">
                      {viewClient.email}
                    </a>
                  </div>
                )}
                {viewClient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground" />
                    <span>{viewClient.phone}</span>
                  </div>
                )}
                {viewClient.country && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="size-4 text-muted-foreground" />
                    <span>{getCountryLabel(viewClient.country)}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">${viewClient.totalRevenue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Загальний дохід</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{getClientProjects(viewClient.id).length}</div>
                    <div className="text-xs text-muted-foreground">Усього проєктів</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">
                      {new Date(viewClient.createdAt).toLocaleDateString("uk-UA", { month: "short", year: "numeric" })}
                    </div>
                    <div className="text-xs text-muted-foreground">Клієнт з</div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FolderKanban className="size-4" />
                  Проєкти
                </h4>
                <div className="space-y-2">
                  {getClientProjects(viewClient.id).map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {project.start_date} - {project.end_date}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={project.status === "active" ? "default" : project.status === "finished" ? "outline" : "secondary"}>
                          {project.status === "active"
                            ? "Активний"
                            : project.status === "finished"
                              ? "Завершений"
                              : project.status === "lead"
                                ? "Лід"
                                : "Призупинений"}
                        </Badge>
                        <div className="text-sm font-medium mt-1">
                          ${Number(project.revenue || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {getClientProjects(viewClient.id).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Проєктів поки немає
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {viewClient.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Нотатки</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {viewClient.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewClient(null)}>
              Закрити
            </Button>
            <Button onClick={() => {
              if (viewClient) {
                handleOpenEdit(viewClient)
                setViewClient(null)
              }
            }}>
              <Pencil className="size-4 mr-2" />
              Редагувати клієнта
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Редагувати клієнта" : "Додати нового клієнта"}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? "Оновіть інформацію про клієнта" : "Додайте нового клієнта до портфоліо"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Ім’я клієнта *</Label>
                <Input
                  id="name"
                  placeholder="Наприклад: Acme Inc"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="company">Компанія</Label>
                <Input
                  id="company"
                  placeholder="Юридична назва компанії"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="contactPerson">Контактна особа</Label>
                <Input
                  id="contactPerson"
                  placeholder="Імʼя та прізвище"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email">Електронна пошта</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  placeholder="+1 555 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="country">Країна</Label>
                <Select 
                  value={formData.country || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, country: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть країну" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не вказано</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{getCountryLabel(country)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Нотатки</Label>
                <Textarea
                  id="notes"
                  placeholder="Додаткова інформація…"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Скасувати
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name.trim()}
            >
              {editingClient ? "Зберегти зміни" : "Додати клієнта"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити клієнта</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити &quot;{deleteClient?.name}&quot;? Цю дію неможливо скасувати.
              {deleteClient && getClientProjects(deleteClient.id).length > 0 && (
                <span className="block mt-2 text-destructive">
                  Увага: у цього клієнта є повʼязані проєкти ({getClientProjects(deleteClient.id).length}).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
