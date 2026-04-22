"use client"

import { useState } from "react"
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Pause,
  Play,
  DollarSign,
  Clock,
  Calendar,
  Building2,
  FolderKanban,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Progress } from "@/components/ui/progress"
import {
  SupportContract,
  SupportContractStatus,
  SupportContractCycle,
  mockSupportContracts,
  mockClients,
  mockProjects,
} from "@/lib/types/projects"
import { formatCurrency } from "@/lib/types/spendings"

export default function SupportContractsPage() {
  const [contracts, setContracts] = useState<SupportContract[]>(mockSupportContracts)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingContract, setEditingContract] = useState<SupportContract | null>(null)
  const [deleteContract, setDeleteContract] = useState<SupportContract | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    projectId: "",
    amount: "",
    currency: "USD" as "USD" | "EUR" | "UAH",
    cycle: "monthly" as SupportContractCycle,
    hoursIncluded: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
  })

  // Stats
  const activeContracts = contracts.filter(c => c.status === "active")
  const monthlyRecurring = activeContracts.reduce((sum, c) => {
    let monthlyAmount = c.amount
    if (c.cycle === "quarterly") monthlyAmount = c.amount / 3
    if (c.cycle === "yearly") monthlyAmount = c.amount / 12
    // Convert to USD for consistency
    if (c.currency === "EUR") monthlyAmount *= 1.1
    if (c.currency === "UAH") monthlyAmount *= 0.027
    return sum + monthlyAmount
  }, 0)
  const totalPaid = contracts.reduce((sum, c) => sum + c.totalPaid, 0)

  // Filtered contracts
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || contract.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Get upcoming payments (next 30 days)
  const upcomingPayments = contracts
    .filter(c => c.status === "active")
    .filter(c => {
      const nextDate = new Date(c.nextPaymentDate)
      const today = new Date()
      const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      return nextDate <= thirtyDays
    })
    .sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime())

  const resetForm = () => {
    setFormData({
      projectId: "",
      amount: "",
      currency: "USD",
      cycle: "monthly",
      hoursIncluded: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
    })
    setEditingContract(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (contract: SupportContract) => {
    setFormData({
      projectId: contract.projectId,
      amount: contract.amount.toString(),
      currency: contract.currency,
      cycle: contract.cycle,
      hoursIncluded: contract.hoursIncluded?.toString() || "",
      description: contract.description || "",
      startDate: contract.startDate,
    })
    setEditingContract(contract)
    setIsAddDialogOpen(true)
  }

  const calculateNextPaymentDate = (startDate: string, cycle: SupportContractCycle): string => {
    const start = new Date(startDate)
    const today = new Date()
    let next = new Date(start)
    
    while (next <= today) {
      if (cycle === "monthly") next.setMonth(next.getMonth() + 1)
      else if (cycle === "quarterly") next.setMonth(next.getMonth() + 3)
      else if (cycle === "yearly") next.setFullYear(next.getFullYear() + 1)
    }
    
    return next.toISOString().split("T")[0]
  }

  const handleSave = () => {
    if (!formData.projectId || !formData.amount) return

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) return

    const project = mockProjects.find(p => p.id === formData.projectId)
    if (!project) return

    const contractData: SupportContract = {
      id: editingContract?.id || `sc${Date.now()}`,
      projectId: formData.projectId,
      projectName: project.name,
      clientId: project.client.id,
      clientName: project.client.name,
      amount,
      currency: formData.currency,
      cycle: formData.cycle,
      status: editingContract?.status || "active",
      startDate: formData.startDate,
      hoursIncluded: formData.hoursIncluded ? parseInt(formData.hoursIncluded) : undefined,
      description: formData.description.trim() || undefined,
      lastPaymentDate: editingContract?.lastPaymentDate,
      nextPaymentDate: calculateNextPaymentDate(formData.startDate, formData.cycle),
      totalPaid: editingContract?.totalPaid || 0,
    }

    if (editingContract) {
      setContracts(prev => prev.map(c => c.id === editingContract.id ? contractData : c))
    } else {
      setContracts(prev => [...prev, contractData])
    }

    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleDelete = () => {
    if (deleteContract) {
      setContracts(prev => prev.filter(c => c.id !== deleteContract.id))
      setDeleteContract(null)
    }
  }

  const handleToggleStatus = (contract: SupportContract) => {
    const newStatus: SupportContractStatus = contract.status === "active" ? "paused" : "active"
    setContracts(prev => prev.map(c => 
      c.id === contract.id ? { ...c, status: newStatus } : c
    ))
  }

  const handleRecordPayment = (contract: SupportContract) => {
    const today = new Date().toISOString().split("T")[0]
    const nextPayment = calculateNextPaymentDate(today, contract.cycle)
    
    setContracts(prev => prev.map(c => 
      c.id === contract.id 
        ? { 
            ...c, 
            lastPaymentDate: today,
            nextPaymentDate: nextPayment,
            totalPaid: c.totalPaid + c.amount 
          } 
        : c
    ))
  }

  const getStatusIcon = (status: SupportContractStatus) => {
    switch (status) {
      case "active": return <CheckCircle2 className="size-4 text-emerald-500" />
      case "paused": return <AlertCircle className="size-4 text-amber-500" />
      case "ended": return <XCircle className="size-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: SupportContractStatus) => {
    switch (status) {
      case "active": return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
      case "paused": return <Badge variant="outline" className="text-amber-500 border-amber-500/20">Paused</Badge>
      case "ended": return <Badge variant="secondary">Ended</Badge>
    }
  }

  const getCycleLabel = (cycle: SupportContractCycle) => {
    switch (cycle) {
      case "monthly": return "/mo"
      case "quarterly": return "/qtr"
      case "yearly": return "/yr"
    }
  }

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  // Get finished projects for support contracts
  const finishedProjects = mockProjects.filter(p => 
    p.status === "finished" || p.status === "active"
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Manage recurring support and maintenance agreements
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Add Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts.length}</div>
            <p className="text-xs text-muted-foreground">{contracts.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${Math.round(monthlyRecurring).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Estimated MRR from support</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time support revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming (30 days)</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              ${upcomingPayments.reduce((sum, c) => sum + c.amount, 0).toLocaleString()} expected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments Alert */}
      {upcomingPayments.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="size-4 text-amber-500" />
              Upcoming Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingPayments.slice(0, 3).map(contract => {
                const days = getDaysUntil(contract.nextPaymentDate)
                return (
                  <div key={contract.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contract.projectName}</span>
                      <span className="text-muted-foreground">({contract.clientName})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatCurrency(contract.amount, contract.currency)}
                      </span>
                      <Badge variant={days <= 7 ? "destructive" : "outline"} className="text-xs">
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRecordPayment(contract)}
                      >
                        Mark Paid
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contracts List */}
      <div className="grid gap-4">
        {filteredContracts.map((contract) => (
          <Card key={contract.id} className={contract.status !== "active" ? "opacity-60" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(contract.status)}
                    <div>
                      <h3 className="font-semibold text-lg">{contract.projectName}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="size-3" />
                        {contract.clientName}
                      </p>
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>

                  {contract.description && (
                    <p className="text-sm text-muted-foreground max-w-lg">
                      {contract.description}
                    </p>
                  )}

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span>Started {new Date(contract.startDate).toLocaleDateString()}</span>
                    </div>
                    {contract.hoursIncluded && (
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-muted-foreground" />
                        <span>{contract.hoursIncluded} hours/cycle</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="size-4 text-muted-foreground" />
                      <span>${contract.totalPaid.toLocaleString()} collected</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {formatCurrency(contract.amount, contract.currency)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {getCycleLabel(contract.cycle)}
                      </span>
                    </div>
                    {contract.status === "active" && (
                      <div className="text-sm text-muted-foreground mt-1">
                        Next: {new Date(contract.nextPaymentDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {contract.status === "active" && (
                        <DropdownMenuItem onClick={() => handleRecordPayment(contract)}>
                          <CheckCircle2 className="size-4 mr-2" />
                          Record Payment
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleToggleStatus(contract)}>
                        {contract.status === "active" ? (
                          <><Pause className="size-4 mr-2" /> Pause Contract</>
                        ) : (
                          <><Play className="size-4 mr-2" /> Resume Contract</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(contract)}>
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteContract(contract)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredContracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No support contracts found
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingContract ? "Edit Support Contract" : "Add Support Contract"}
            </DialogTitle>
            <DialogDescription>
              {editingContract ? "Update contract details" : "Create a new recurring support agreement"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="project">Project *</Label>
              <Select 
                value={formData.projectId || "none"} 
                onValueChange={(v) => setFormData({ ...formData, projectId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a project</SelectItem>
                  {finishedProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.client.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData({ ...formData, currency: v as "USD" | "EUR" | "UAH" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="UAH">UAH (₴)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cycle">Billing Cycle</Label>
                <Select 
                  value={formData.cycle} 
                  onValueChange={(v) => setFormData({ ...formData, cycle: v as SupportContractCycle })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="hoursIncluded">Hours Included (optional)</Label>
                <Input
                  id="hoursIncluded"
                  type="number"
                  placeholder="e.g., 10"
                  value={formData.hoursIncluded}
                  onChange={(e) => setFormData({ ...formData, hoursIncluded: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What's included in this support contract..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.projectId || !formData.amount || parseFloat(formData.amount) <= 0}
            >
              {editingContract ? "Save Changes" : "Create Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContract} onOpenChange={() => setDeleteContract(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Support Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the support contract for &quot;{deleteContract?.projectName}&quot;? 
              This action cannot be undone.
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
