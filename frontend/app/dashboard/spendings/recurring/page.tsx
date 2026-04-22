"use client"

import { useState } from "react"
import { 
  Plus, 
  Search, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Building2,
  Users,
  FolderKanban,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogTrigger 
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  RecurringExpense,
  Currency,
  PaymentCycle,
  PaymentSource,
  AllocationTarget,
  mockRecurringExpenses,
  expenseCategories,
  formatCurrency,
  convertToUSD,
  getPaymentStatusColor,
  getSourceIcon,
  getCycleLabel,
  calculateMonthlyTotal,
  getNextBigPayment,
} from "@/lib/types/spendings"
import { mockTeams } from "@/lib/types/teams"
import { mockProjects } from "@/lib/types/projects"

export default function RecurringExpensesPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>(mockRecurringExpenses)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [deleteExpense, setDeleteExpense] = useState<RecurringExpense | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    currency: "USD" as Currency,
    cycle: "monthly" as PaymentCycle,
    category: "",
    source: "monobank" as PaymentSource,
    allocationType: "all" as AllocationTarget,
    teamId: "",
    projectId: "",
    description: "",
    nextPaymentDate: "",
  })

  // Stats
  const monthlyTotal = calculateMonthlyTotal(expenses)
  const activeCount = expenses.filter(e => e.status !== "overdue").length
  const nextBigPayment = getNextBigPayment(expenses)

  // Filtered expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      currency: "USD",
      cycle: "monthly",
      category: "",
      source: "monobank",
      allocationType: "all",
      teamId: "",
      projectId: "",
      description: "",
      nextPaymentDate: "",
    })
    setEditingExpense(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (expense: RecurringExpense) => {
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      currency: expense.currency,
      cycle: expense.cycle,
      category: expense.category,
      source: expense.source,
      allocationType: expense.allocation.type,
      teamId: expense.allocation.teamId || "",
      projectId: expense.allocation.projectId || "",
      description: expense.description || "",
      nextPaymentDate: expense.nextPaymentDate,
    })
    setEditingExpense(expense)
    setIsAddDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name.trim() || !formData.amount || !formData.category || !formData.nextPaymentDate) return
    
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) return
    
    const amountUSD = convertToUSD(amount, formData.currency)
    
    const selectedTeam = mockTeams.find(t => t.id === formData.teamId)
    const selectedProject = mockProjects.find(p => p.id === formData.projectId)

    const expenseData: RecurringExpense = {
      id: editingExpense?.id || `r${Date.now()}`,
      name: formData.name.trim(),
      amount,
      currency: formData.currency,
      amountUSD,
      cycle: formData.cycle,
      category: formData.category,
      source: formData.source,
      allocation: {
        type: formData.allocationType,
        teamId: formData.allocationType === "team" ? formData.teamId : undefined,
        teamName: formData.allocationType === "team" ? selectedTeam?.name : undefined,
        projectId: formData.allocationType === "project" ? formData.projectId : undefined,
        projectName: formData.allocationType === "project" ? selectedProject?.name : undefined,
      },
      status: editingExpense?.status || "pending",
      nextPaymentDate: formData.nextPaymentDate,
      lastPaidDate: editingExpense?.lastPaidDate,
      description: formData.description?.trim() || undefined,
      createdAt: editingExpense?.createdAt || new Date().toISOString().split("T")[0],
    }

    if (editingExpense) {
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? expenseData : e))
    } else {
      setExpenses(prev => [...prev, expenseData])
    }

    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleDelete = () => {
    if (deleteExpense) {
      setExpenses(prev => prev.filter(e => e.id !== deleteExpense.id))
      setDeleteExpense(null)
    }
  }

  const handleMarkPaid = (expense: RecurringExpense) => {
    setExpenses(prev => prev.map(e => {
      if (e.id === expense.id) {
        const today = new Date().toISOString().split("T")[0]
        const nextDate = new Date()
        if (e.cycle === "monthly") nextDate.setMonth(nextDate.getMonth() + 1)
        if (e.cycle === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1)
        if (e.cycle === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3)
        
        return {
          ...e,
          status: "paid" as const,
          lastPaidDate: today,
          nextPaymentDate: nextDate.toISOString().split("T")[0],
        }
      }
      return e
    }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle2 className="size-4 text-emerald-600" />
      case "pending": return <Clock className="size-4 text-amber-600" />
      case "overdue": return <AlertCircle className="size-4 text-red-600" />
      default: return null
    }
  }

  const getAllocationBadge = (expense: RecurringExpense) => {
    switch (expense.allocation.type) {
      case "all":
        return <Badge variant="outline" className="gap-1"><Users className="size-3" /> All Members</Badge>
      case "team":
        return <Badge variant="secondary" className="gap-1"><Building2 className="size-3" /> {expense.allocation.teamName}</Badge>
      case "project":
        return <Badge className="gap-1"><FolderKanban className="size-3" /> {expense.allocation.projectName}</Badge>
      case "none":
        return <Badge variant="outline" className="text-muted-foreground">Not Allocated</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurring Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Manage your monthly subscriptions and recurring payments
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Add Recurring
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Commitment</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total recurring per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <RefreshCw className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">{expenses.length} total subscriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Big Payment</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextBigPayment ? (
              <>
                <div className="text-2xl font-bold">${nextBigPayment.amountUSD.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {nextBigPayment.name} on {new Date(nextBigPayment.nextPaymentDate).toLocaleDateString()}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">No pending payments</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {expenseCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const category = expenseCategories.find(c => c.id === expense.category)
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{expense.name}</div>
                        {expense.description && (
                          <div className="text-xs text-muted-foreground">{expense.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatCurrency(expense.amount, expense.currency)}</div>
                        {expense.currency !== "USD" && (
                          <div className="text-xs text-muted-foreground">${expense.amountUSD}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCycleLabel(expense.cycle)}</Badge>
                    </TableCell>
                    <TableCell>
                      {category && (
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: `${category.color}20`, 
                            color: category.color,
                          }}
                        >
                          {category.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{getAllocationBadge(expense)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <span>{getSourceIcon(expense.source)}</span>
                        <span className="capitalize text-sm">{expense.source}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(expense.status)}`}>
                        {getStatusIcon(expense.status)}
                        <span className="capitalize">{expense.status}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {expense.status !== "paid" && (
                            <DropdownMenuItem onClick={() => handleMarkPaid(expense)}>
                              <CheckCircle2 className="size-4 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOpenEdit(expense)}>
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteExpense(expense)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No recurring expenses found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Recurring Expense" : "Add Recurring Expense"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense ? "Update the subscription details" : "Create a new recurring subscription or payment"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., AWS Cloud Services"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="amount">Amount</Label>
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
                  onValueChange={(v) => setFormData({ ...formData, currency: v as Currency })}
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
                <Label htmlFor="cycle">Payment Cycle</Label>
                <Select 
                  value={formData.cycle} 
                  onValueChange={(v) => setFormData({ ...formData, cycle: v as PaymentCycle })}
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

              <div>
                <Label htmlFor="source">Payment Source</Label>
                <Select 
                  value={formData.source} 
                  onValueChange={(v) => setFormData({ ...formData, source: v as PaymentSource })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monobank">🏦 Monobank</SelectItem>
                    <SelectItem value="privat24">💳 Privat24</SelectItem>
                    <SelectItem value="wise">🌐 Wise</SelectItem>
                    <SelectItem value="payoneer">💱 Payoneer</SelectItem>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nextPaymentDate">Next Payment Date</Label>
                <Input
                  id="nextPaymentDate"
                  type="date"
                  value={formData.nextPaymentDate}
                  onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                />
              </div>
            </div>

            {/* Allocation Logic */}
            <div className="space-y-4">
              <Label>Allocation Logic</Label>
              <RadioGroup 
                value={formData.allocationType}
                onValueChange={(v) => setFormData({ ...formData, allocationType: v as AllocationTarget })}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer flex-1">
                    <div className="font-medium">Split by All Members</div>
                    <div className="text-xs text-muted-foreground">Divide equally among all team members</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="cursor-pointer flex-1">
                    <div className="font-medium">Split by Team</div>
                    <div className="text-xs text-muted-foreground">Allocate to a specific team</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="project" id="project" />
                  <Label htmlFor="project" className="cursor-pointer flex-1">
                    <div className="font-medium">Apply to Project</div>
                    <div className="text-xs text-muted-foreground">Direct cost to a project</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="cursor-pointer flex-1">
                    <div className="font-medium">No Allocation</div>
                    <div className="text-xs text-muted-foreground">General company expense</div>
                  </Label>
                </div>
              </RadioGroup>

              {formData.allocationType === "team" && (
                <Select 
                  value={formData.teamId} 
                  onValueChange={(v) => setFormData({ ...formData, teamId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTeams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {formData.allocationType === "project" && (
                <Select 
                  value={formData.projectId} 
                  onValueChange={(v) => setFormData({ ...formData, projectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProjects.filter(p => p.status === "active").map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} — {project.client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional notes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={
                !formData.name.trim() || 
                !formData.amount || 
                parseFloat(formData.amount) <= 0 ||
                !formData.category ||
                !formData.nextPaymentDate ||
                (formData.allocationType === "team" && !formData.teamId) ||
                (formData.allocationType === "project" && !formData.projectId)
              }
            >
              {editingExpense ? "Save Changes" : "Add Recurring"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteExpense?.name}&quot;? This action cannot be undone.
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
