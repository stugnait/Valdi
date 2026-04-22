"use client"

import { useState } from "react"
import { 
  Plus, 
  Search, 
  Calendar, 
  TrendingUp, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Paperclip,
  Upload,
  User,
  Receipt,
  Filter,
  DollarSign
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
  VariableExpense,
  Currency,
  PaymentSource,
  AllocationTarget,
  mockVariableExpenses,
  expenseCategories,
  formatCurrency,
  convertToUSD,
  getSourceIcon,
} from "@/lib/types/spendings"
import { mockTeams, TeamMember } from "@/lib/types/teams"
import { mockProjects } from "@/lib/types/projects"

export default function VariableExpensesPage() {
  const [expenses, setExpenses] = useState<VariableExpense[]>(mockVariableExpenses)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<VariableExpense | null>(null)
  const [deleteExpense, setDeleteExpense] = useState<VariableExpense | null>(null)
  
  // Get all members from all teams
  const allMembers = mockTeams.flatMap(team => team.members)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    currency: "USD" as Currency,
    category: "",
    source: "monobank" as PaymentSource,
    date: new Date().toISOString().split("T")[0],
    assigneeId: "",
    description: "",
    allocationType: "all" as AllocationTarget,
    teamId: "",
    projectId: "",
    receiptUrl: "",
  })

  // Stats
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyExpenses = expenses.filter(e => {
    const date = new Date(e.date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })
  const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + e.amountUSD, 0)
  
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amountUSD
    return acc
  }, {} as Record<string, number>)
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

  // Filtered expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.assigneeName?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    return matchesSearch && matchesCategory
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      currency: "USD",
      category: "",
      source: "monobank",
      date: new Date().toISOString().split("T")[0],
      assigneeId: "",
      description: "",
      allocationType: "all",
      teamId: "",
      projectId: "",
      receiptUrl: "",
    })
    setEditingExpense(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (expense: VariableExpense) => {
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      currency: expense.currency,
      category: expense.category,
      source: expense.source,
      date: expense.date,
      assigneeId: expense.assigneeId || "",
      description: expense.description || "",
      allocationType: expense.allocation.type,
      teamId: expense.allocation.teamId || "",
      projectId: expense.allocation.projectId || "",
      receiptUrl: expense.receiptUrl || "",
    })
    setEditingExpense(expense)
    setIsAddDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name.trim() || !formData.amount || !formData.category) return
    
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) return
    
    const amountUSD = convertToUSD(amount, formData.currency)
    
    const assignee = allMembers.find(m => m.id === formData.assigneeId)
    const selectedTeam = mockTeams.find(t => t.id === formData.teamId)
    const selectedProject = mockProjects.find(p => p.id === formData.projectId)

    const expenseData: VariableExpense = {
      id: editingExpense?.id || `v${Date.now()}`,
      name: formData.name.trim(),
      amount,
      currency: formData.currency,
      amountUSD,
      category: formData.category,
      source: formData.source,
      date: formData.date || new Date().toISOString().split("T")[0],
      assigneeId: formData.assigneeId || undefined,
      assigneeName: assignee?.name,
      receiptUrl: formData.receiptUrl || undefined,
      description: formData.description?.trim() || undefined,
      allocation: {
        type: formData.allocationType,
        teamId: formData.allocationType === "team" ? formData.teamId : undefined,
        teamName: formData.allocationType === "team" ? selectedTeam?.name : undefined,
        projectId: formData.allocationType === "project" ? formData.projectId : undefined,
        projectName: formData.allocationType === "project" ? selectedProject?.name : undefined,
      },
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Variable Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Track one-time purchases and unexpected costs
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Record Expense
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent (This Month)</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{monthlyExpenses.length} expenses recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {topCategory ? (
              <>
                <div className="text-2xl font-bold capitalize">{topCategory[0]}</div>
                <p className="text-xs text-muted-foreground">${topCategory[1].toLocaleString()} total</p>
              </>
            ) : (
              <div className="text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expenses or assignees..."
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
      </div>

      {/* Expense Log */}
      <div className="space-y-3">
        {filteredExpenses.map((expense) => {
          const category = expenseCategories.find(c => c.id === expense.category)
          return (
            <Card key={expense.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Date */}
                  <div className="text-center min-w-[60px]">
                    <div className="text-lg font-bold">{new Date(expense.date).getDate()}</div>
                    <div className="text-xs text-muted-foreground uppercase">
                      {new Date(expense.date).toLocaleDateString("uk", { month: "short" })}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{expense.name}</span>
                      {expense.receiptUrl && (
                        <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {category && (
                        <Badge 
                          variant="secondary"
                          className="text-xs"
                          style={{ 
                            backgroundColor: `${category.color}20`, 
                            color: category.color,
                          }}
                        >
                          {category.name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {getSourceIcon(expense.source)} {expense.source}
                      </span>
                    </div>
                  </div>

                  {/* Assignee */}
                  {expense.assigneeName && (
                    <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-xs">
                          {expense.assigneeName.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate max-w-[120px]">{expense.assigneeName}</span>
                    </div>
                  )}

                  {/* Amount */}
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(expense.amount, expense.currency)}</div>
                    {expense.currency !== "USD" && (
                      <div className="text-xs text-muted-foreground">${expense.amountUSD}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(expense)}>
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {expense.receiptUrl && (
                        <DropdownMenuItem>
                          <Receipt className="size-4 mr-2" />
                          View Receipt
                        </DropdownMenuItem>
                      )}
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
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredExpenses.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No variable expenses found
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Edit Expense" : "Record Expense"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense ? "Update expense details" : "Log a one-time expense or purchase"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Item / Description</Label>
                <Input
                  id="name"
                  placeholder="e.g., MacBook Pro M3"
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
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
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
                <Label htmlFor="assignee">Assignee (Optional)</Label>
                <Select 
                  value={formData.assigneeId || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, assigneeId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {allMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <div className="font-medium">Split by All</div>
                    <div className="text-xs text-muted-foreground">Company-wide expense</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="cursor-pointer flex-1">
                    <div className="font-medium">Team Expense</div>
                    <div className="text-xs text-muted-foreground">Allocate to team</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="project" id="project" />
                  <Label htmlFor="project" className="cursor-pointer flex-1">
                    <div className="font-medium">Project Expense</div>
                    <div className="text-xs text-muted-foreground">Direct project cost</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="cursor-pointer flex-1">
                    <div className="font-medium">No Allocation</div>
                    <div className="text-xs text-muted-foreground">Personal equipment</div>
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

            {/* Receipt Upload */}
            <div>
              <Label>Receipt (Optional)</Label>
              <div className="mt-2 border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer">
                <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG or PDF up to 10MB
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Notes (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional details..."
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
                (formData.allocationType === "team" && !formData.teamId) ||
                (formData.allocationType === "project" && !formData.projectId)
              }
            >
              {editingExpense ? "Save Changes" : "Record Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
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
