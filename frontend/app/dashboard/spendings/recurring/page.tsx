"use client"

import { useEffect, useState } from "react"
import { 
  Plus, 
  Search, 
  Calendar, 
  CreditCard, 
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
  expenseCategories,
  formatCurrency,
  convertToUSD,
  getPaymentStatusColor,
  getSourceIcon,
  calculateMonthlyTotal,
  getNextBigPayment,
} from "@/lib/types/spendings"
import { mockTeams } from "@/lib/types/teams"
import { mockProjects } from "@/lib/types/projects"
import { workforceApi, type ApiRecurringExpense } from "@/lib/api/workforce"

export default function RecurringExpensesPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  const mapApiExpense = (expense: ApiRecurringExpense): RecurringExpense => ({
    id: expense.id.toString(),
    name: expense.name,
    amount: Number(expense.amount || 0),
    currency: expense.currency,
    amountUSD: convertToUSD(Number(expense.amount || 0), expense.currency),
    cycle: expense.cycle,
    category: expense.category,
    source: expense.source,
    allocation: {
      type: expense.allocation_type,
      teamId: expense.team ? expense.team.toString() : undefined,
      teamName: expense.team_name || undefined,
      projectId: expense.project ? expense.project.toString() : undefined,
      projectName: expense.project_name || undefined,
    },
    status: expense.status,
    nextPaymentDate: expense.next_payment_date,
    lastPaidDate: expense.last_paid_date || undefined,
    description: expense.description || undefined,
    createdAt: expense.created_at,
  })

  const loadExpenses = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await workforceApi.listRecurringExpenses()
      setExpenses(data.map(mapApiExpense))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не вдалося завантажити регулярні витрати")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadExpenses()
  }, [])

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

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.amount || !formData.category || !formData.nextPaymentDate) return
    
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) return
    
    const payload = {
      name: formData.name.trim(),
      amount,
      currency: formData.currency,
      cycle: formData.cycle,
      category: formData.category,
      source: formData.source,
      allocation_type: formData.allocationType,
      team: formData.allocationType === "team" && formData.teamId ? Number(formData.teamId) : null,
      project: formData.allocationType === "project" && formData.projectId ? Number(formData.projectId) : null,
      status: editingExpense?.status || "pending",
      next_payment_date: formData.nextPaymentDate,
      description: formData.description?.trim() || "",
    }
    try {
      if (editingExpense) {
        await workforceApi.updateRecurringExpense(editingExpense.id, payload)
      } else {
        await workforceApi.createRecurringExpense(payload)
      }
      await loadExpenses()
      setIsAddDialogOpen(false)
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не вдалося зберегти регулярну витрату")
    }
  }

  const handleDelete = async () => {
    if (deleteExpense) {
      try {
        await workforceApi.deleteRecurringExpense(deleteExpense.id)
        await loadExpenses()
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Не вдалося видалити регулярну витрату")
      }
      setDeleteExpense(null)
    }
  }

  const handleMarkPaid = async (expense: RecurringExpense) => {
    const today = new Date().toISOString().split("T")[0]
    const nextDate = new Date()
    if (expense.cycle === "monthly") nextDate.setMonth(nextDate.getMonth() + 1)
    if (expense.cycle === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1)
    if (expense.cycle === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3)

    try {
      await workforceApi.updateRecurringExpense(expense.id, {
        status: "paid",
        last_paid_date: today,
        next_payment_date: nextDate.toISOString().split("T")[0],
      })
      await loadExpenses()
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Не вдалося позначити витрату як сплачену")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle2 className="size-4 text-emerald-600" />
      case "pending": return <Clock className="size-4 text-amber-600" />
      case "overdue": return <AlertCircle className="size-4 text-red-600" />
      default: return null
    }
  }

  const getCycleLabelUa = (cycle: PaymentCycle) => {
    if (cycle === "monthly") return "Щомісяця"
    if (cycle === "quarterly") return "Щокварталу"
    return "Щороку"
  }

  const getSourceLabelUa = (source: PaymentSource) => {
    switch (source) {
      case "monobank":
        return "Monobank"
      case "privat24":
        return "Privat24"
      case "wise":
        return "Wise"
      case "payoneer":
        return "Payoneer"
      case "cash":
        return "Готівка"
      default:
        return source
    }
  }

  const getAllocationBadge = (expense: RecurringExpense) => {
    switch (expense.allocation.type) {
      case "all":
        return <Badge variant="outline" className="gap-1"><Users className="size-3" /> Усі учасники</Badge>
      case "team":
        return <Badge variant="secondary" className="gap-1"><Building2 className="size-3" /> {expense.allocation.teamName}</Badge>
      case "project":
        return <Badge className="gap-1"><FolderKanban className="size-3" /> {expense.allocation.projectName}</Badge>
      case "none":
        return <Badge variant="outline" className="text-muted-foreground">Без розподілу</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Регулярні витрати</h1>
          <p className="text-sm text-muted-foreground">
            Керуйте щомісячними підписками та повторюваними платежами
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Додати витрату
        </Button>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Завантажуємо регулярні витрати…</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Щомісячне навантаження</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Загальна сума регулярних витрат за місяць</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активні підписки</CardTitle>
            <RefreshCw className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Усього підписок: {expenses.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Найближчий великий платіж</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextBigPayment ? (
              <>
                <div className="text-2xl font-bold">${nextBigPayment.amountUSD.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {nextBigPayment.name} — {new Date(nextBigPayment.nextPaymentDate).toLocaleDateString("uk-UA")}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">Немає запланованих платежів</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук підписок…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Категорія" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі категорії</SelectItem>
            {expenseCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі статуси</SelectItem>
            <SelectItem value="paid">Сплачено</SelectItem>
            <SelectItem value="pending">Очікується</SelectItem>
            <SelectItem value="overdue">Прострочено</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Назва</TableHead>
                <TableHead>Сума</TableHead>
                <TableHead>Цикл</TableHead>
                <TableHead>Категорія</TableHead>
                <TableHead>Розподіл</TableHead>
                <TableHead>Джерело</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Дії</TableHead>
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
                      <Badge variant="outline">{getCycleLabelUa(expense.cycle)}</Badge>
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
                        <span className="text-sm">{getSourceLabelUa(expense.source)}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(expense.status)}`}>
                        {getStatusIcon(expense.status)}
                        <span>
                          {expense.status === "paid"
                            ? "Сплачено"
                            : expense.status === "pending"
                              ? "Очікується"
                              : "Прострочено"}
                        </span>
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
                              Позначити як сплачену
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleOpenEdit(expense)}>
                            <Pencil className="size-4 mr-2" />
                            Редагувати
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => setDeleteExpense(expense)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Видалити
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
                    Регулярні витрати не знайдено
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
              {editingExpense ? "Редагувати регулярну витрату" : "Додати регулярну витрату"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Оновіть параметри підписки або регулярного платежу"
                : "Додайте нову регулярну підписку або платіж"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Назва</Label>
                <Input
                  id="name"
                  placeholder="Наприклад: AWS Cloud Services"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="amount">Сума</Label>
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
                <Label htmlFor="currency">Валюта</Label>
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
                <Label htmlFor="cycle">Періодичність</Label>
                <Select 
                  value={formData.cycle} 
                  onValueChange={(v) => setFormData({ ...formData, cycle: v as PaymentCycle })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Щомісяця</SelectItem>
                    <SelectItem value="quarterly">Щокварталу</SelectItem>
                    <SelectItem value="yearly">Щороку</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="source">Джерело оплати</Label>
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
                    <SelectItem value="cash">💵 Готівка</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Категорія</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть категорію" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nextPaymentDate">Дата наступного платежу</Label>
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
              <Label>Логіка розподілу</Label>
              <RadioGroup 
                value={formData.allocationType}
                onValueChange={(v) => setFormData({ ...formData, allocationType: v as AllocationTarget })}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer flex-1">
                    <div className="font-medium">Розподілити між усіма учасниками</div>
                    <div className="text-xs text-muted-foreground">Рівномірно між усіма членами команди</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="cursor-pointer flex-1">
                    <div className="font-medium">Розподілити на команду</div>
                    <div className="text-xs text-muted-foreground">Призначити витрату конкретній команді</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="project" id="project" />
                  <Label htmlFor="project" className="cursor-pointer flex-1">
                    <div className="font-medium">Віднести на проєкт</div>
                    <div className="text-xs text-muted-foreground">Зарахувати як пряму витрату проєкту</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="cursor-pointer flex-1">
                    <div className="font-medium">Без розподілу</div>
                    <div className="text-xs text-muted-foreground">Загальна витрата компанії</div>
                  </Label>
                </div>
              </RadioGroup>

              {formData.allocationType === "team" && (
                <Select 
                  value={formData.teamId} 
                  onValueChange={(v) => setFormData({ ...formData, teamId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть команду" />
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
                    <SelectValue placeholder="Оберіть проєкт" />
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
              <Label htmlFor="description">Опис (за бажанням)</Label>
              <Textarea
                id="description"
                placeholder="Додаткові примітки…"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Скасувати
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
              {editingExpense ? "Зберегти зміни" : "Додати витрату"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteExpense} onOpenChange={() => setDeleteExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити регулярну витрату</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити &quot;{deleteExpense?.name}&quot;? Цю дію неможливо скасувати.
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
