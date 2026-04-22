"use client"

import { useState } from "react"
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
import { Client, mockClients, mockProjects } from "@/lib/types/projects"

const countries = [
  "USA", "Ukraine", "Germany", "UK", "Canada", "Sweden", "Netherlands",
  "Poland", "Hong Kong", "Singapore", "Australia", "France", "Spain", "Italy"
]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(mockClients)
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

  const handleSave = () => {
    if (!formData.name.trim()) return

    const clientData: Client = {
      id: editingClient?.id || `c${Date.now()}`,
      name: formData.name.trim(),
      company: formData.company.trim() || undefined,
      email: formData.email.trim() || undefined,
      contactPerson: formData.contactPerson.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      country: formData.country || undefined,
      notes: formData.notes.trim() || undefined,
      createdAt: editingClient?.createdAt || new Date().toISOString().split("T")[0],
      totalRevenue: editingClient?.totalRevenue || 0,
      activeProjects: editingClient?.activeProjects || 0,
    }

    if (editingClient) {
      setClients(prev => prev.map(c => c.id === editingClient.id ? clientData : c))
    } else {
      setClients(prev => [...prev, clientData])
    }

    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleDelete = () => {
    if (deleteClient) {
      setClients(prev => prev.filter(c => c.id !== deleteClient.id))
      setDeleteClient(null)
    }
  }

  // Get projects for a client
  const getClientProjects = (clientId: string) => {
    return mockProjects.filter(p => p.client.id === clientId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">
            Manage your client relationships and contacts
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">{activeClients} with active projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time from all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
            <Globe className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(clients.map(c => c.country).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Client locations worldwide</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[180px]">
            <Globe className="size-4 mr-2" />
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {Array.from(new Set(clients.map(c => c.country).filter(Boolean))).map(country => (
              <SelectItem key={country} value={country!}>{country}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clients Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-center">Projects</TableHead>
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
                    <Badge variant="outline">{client.country}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${client.totalRevenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {client.activeProjects > 0 ? (
                    <Badge>{client.activeProjects} active</Badge>
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
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(client)}>
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteClient(client)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No clients found
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
                    <span>{viewClient.country}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">${viewClient.totalRevenue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Revenue</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{getClientProjects(viewClient.id).length}</div>
                    <div className="text-xs text-muted-foreground">Total Projects</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">
                      {new Date(viewClient.createdAt).toLocaleDateString("uk", { month: "short", year: "numeric" })}
                    </div>
                    <div className="text-xs text-muted-foreground">Client Since</div>
                  </CardContent>
                </Card>
              </div>

              {/* Projects */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FolderKanban className="size-4" />
                  Projects
                </h4>
                <div className="space-y-2">
                  {getClientProjects(viewClient.id).map(project => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {project.startDate} - {project.endDate}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={project.status === "active" ? "default" : project.status === "finished" ? "outline" : "secondary"}>
                          {project.status}
                        </Badge>
                        <div className="text-sm font-medium mt-1">
                          ${project.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {getClientProjects(viewClient.id).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No projects yet
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {viewClient.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {viewClient.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewClient(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (viewClient) {
                handleOpenEdit(viewClient)
                setViewClient(null)
              }
            }}>
              <Pencil className="size-4 mr-2" />
              Edit Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient ? "Update client information" : "Add a new client to your portfolio"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Acme Inc"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Legal company name"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  placeholder="John Smith"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 555 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Select 
                  value={formData.country || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, country: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {countries.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional information..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name.trim()}
            >
              {editingClient ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteClient?.name}&quot;? This action cannot be undone.
              {deleteClient && getClientProjects(deleteClient.id).length > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This client has {getClientProjects(deleteClient.id).length} associated projects.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
