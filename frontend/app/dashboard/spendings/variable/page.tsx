"use client"

import { useEffect, useState } from "react"
import { 
  Plus, 
  Search, 
  Calendar, 
  TrendingUp, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Filter,
  DollarSign,
  Paperclip,
  Receipt,
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
  expenseCategories,
  formatCurrency,
  convertToUSD,
  getSourceIcon,
} from "@/lib/types/spendings"
import { workforceApi, type ApiProject, type ApiTeam, type ApiVariableExpense } from "@/lib/api/workforce"
import { getNbuRates, type NbuRates } from "@/lib/utils/currency"

export default function VariableExpensesPage() {
  const formatAmountWithCode = (amount: number, currency: Currency) =>
    `${amount.toLocaleString("uk-UA", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`
  const getDefaultImpactFlags = (allocationType: AllocationTarget) => ({
    actualMonthlySpend: true,
    cashFlow: true,
    projectProfitability: allocationType === "project",
    budgetDeviation: true,
    teamCost: allocationType === "team",
    companyBurnRate: false,
  })
  const [expenses, setExpenses] = useState<VariableExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [allocationFilter, setAllocationFilter] = useState<"all" | "company" | AllocationTarget>("all")
  const [impactFilter, setImpactFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<VariableExpense | null>(null)
  const [deleteExpense, setDeleteExpense] = useState<VariableExpense | null>(null)
  
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [rates, setRates] = useState<NbuRates | null>(null)
  const allMembers = teams.flatMap((team) =>
    team.memberships.map((membership) => ({
      id: membership.developer.toString(),
      name: membership.developer_name || "Розробник",
    }))
  )
  
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
    impactFlags: getDefaultImpactFlags("all"),
  })

  const mapApiExpense = (expense: ApiVariableExpense): VariableExpense => ({
    id: expense.id.toString(),
    name: expense.name,
    amount: Number(expense.amount || 0),
    currency: expense.currency,
    amountUSD: convertToUSD(Number(expense.amount || 0), expense.currency),
    category: expense.category,
    source: expense.source,
    date: expense.expense_date,
    assigneeId: expense.assignee ? expense.assignee.toString() : undefined,
    assigneeName: expense.assignee_name || undefined,
    receiptUrl: expense.receipt_url || undefined,
    description: expense.description || undefined,
    allocation: {
      type: expense.allocation_type,
      teamId: expense.team ? expense.team.toString() : undefined,
      teamName: expense.team_name || undefined,
      projectId: expense.project ? expense.project.toString() : undefined,
      projectName: expense.project_name || undefined,
    },
    createdAt: expense.created_at,
    impactFlags: expense.impact_flags || undefined,
  })

  const loadExpenses = async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, teamsPayload, projectsPayload] = await Promise.all([
        workforceApi.listVariableExpenses(),
        workforceApi.listTeams(),
        workforceApi.listProjects(),
      ])
      setTeams(teamsPayload)
      setProjects(projectsPayload)
      setExpenses(data.map(mapApiExpense))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не вдалося завантажити змінні витрати")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadExpenses()
  }, [])

  useEffect(() => {
    void getNbuRates().then(({ rates: loadedRates }) => setRates(loadedRates)).catch(() => undefined)
  }, [])

  // Stats
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyExpenses = expenses.filter(e => {
    const date = new Date(e.date)
    return (
      date.getMonth() === currentMonth
      && date.getFullYear() === currentYear
      && (e.impactFlags?.actualMonthlySpend ?? true)
    )
  })
  const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + e.amountUSD, 0)
  
  const largestExpenseInPeriod = monthlyExpenses
    .slice()
    .sort((a, b) => b.amountUSD - a.amountUSD)[0]

  const getNbuRateLabel = (currency: "USD" | "EUR") => {
    if (!rates) return "—"
    const value = currency === "USD" ? rates.USD : rates.EUR
    return `${value.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
  }

  // Filtered expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.assigneeName?.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    const matchesAllocation =
      allocationFilter === "all"
      || (allocationFilter === "company" && expense.allocation.type === "all")
      || expense.allocation.type === allocationFilter
    const matchesImpact =
      impactFilter === "all"
      || Boolean((expense.impactFlags as Record<string, boolean> | undefined)?.[impactFilter])
    return matchesSearch && matchesCategory && matchesAllocation && matchesImpact
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
      impactFlags: getDefaultImpactFlags("all"),
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
      impactFlags: expense.impactFlags || getDefaultImpactFlags(expense.allocation.type),
    })
    setEditingExpense(expense)
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.amount || !formData.category) return
    
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) return
    
    const payload = {
      name: formData.name.trim(),
      amount,
      currency: formData.currency,
      category: formData.category,
      source: formData.source,
      expense_date: formData.date || new Date().toISOString().split("T")[0],
      assignee: formData.assigneeId ? Number(formData.assigneeId) : null,
      receipt_url: formData.receiptUrl || "",
      description: formData.description?.trim() || "",
      allocation_type: formData.allocationType,
      team: formData.allocationType === "team" && formData.teamId ? Number(formData.teamId) : null,
      project: formData.allocationType === "project" && formData.projectId ? Number(formData.projectId) : null,
      impact_flags: formData.impactFlags,
    }
    try {
      if (editingExpense) {
        await workforceApi.updateVariableExpense(editingExpense.id, payload)
      } else {
        await workforceApi.createVariableExpense(payload)
      }
      await loadExpenses()
      setIsAddDialogOpen(false)
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не вдалося зберегти змінну витрату")
    }
  }

  const handleDelete = async () => {
    if (deleteExpense) {
      try {
        await workforceApi.deleteVariableExpense(deleteExpense.id)
        await loadExpenses()
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Не вдалося видалити змінну витрату")
      }
      setDeleteExpense(null)
    }
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
        return String(source).split("·")[0].trim()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Нерегулярні витрати</h1>
          <p className="text-sm text-muted-foreground">
            Тут фіксуються разові, непередбачувані або нерегулярні витрати: обладнання, ремонти, разові покупки, emergency costs, тимчасові підрядники, team events.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <div className="mb-1 font-medium text-foreground/80">Офіційний курс НБУ</div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>USD: {getNbuRateLabel("USD")}</span>
              <span>EUR: {getNbuRateLabel("EUR")}</span>
            </div>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="size-4" />
            Додати витрату
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Завантажуємо змінні витрати…</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Витрачено за місяць</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Нерегулярні витрати за поточний період</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Найбільша одноразова витрата</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {largestExpenseInPeriod ? (
              <>
                <div className="text-base font-bold leading-tight">{largestExpenseInPeriod.name}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(largestExpenseInPeriod.amount, largestExpenseInPeriod.currency, "uk-UA")}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">Дані відсутні</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Витрати цього місяця</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyExpenses.length}</div>
            <p className="text-xs text-muted-foreground">за поточний місяць</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук витрат або відповідальних…"
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
        <Select value={allocationFilter} onValueChange={(v) => setAllocationFilter(v as "all" | "company" | AllocationTarget)}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Allocation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All allocations</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="project">Project</SelectItem>
            <SelectItem value="none">Unallocated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={impactFilter} onValueChange={setImpactFilter}>
          <SelectTrigger className="w-full md:w-[220px]">
            <SelectValue placeholder="Impact flag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All impact flags</SelectItem>
            <SelectItem value="actualMonthlySpend">Actual Spend</SelectItem>
            <SelectItem value="teamCost">Team Cost</SelectItem>
            <SelectItem value="projectProfitability">Project Profitability</SelectItem>
            <SelectItem value="cashFlow">Cash Flow</SelectItem>
            <SelectItem value="budgetDeviation">Budget Deviation</SelectItem>
            <SelectItem value="companyBurnRate">Burn Rate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Журнал витрат */}
      <div className="space-y-3">
        {filteredExpenses.map((expense) => {
          const category = expenseCategories.find(c => c.id === expense.category)
          const allocationLabel = (() => {
            if (expense.allocation.type === "all") return { title: "Company", subtitle: "Вся компанія" }
            if (expense.allocation.type === "team") {
              const teamName = expense.allocation.teamName
                || teams.find((team) => team.id.toString() === expense.allocation.teamId)?.name
              return { title: "Team", subtitle: teamName || "Без розподілу" }
            }
            if (expense.allocation.type === "project") {
              const projectName = expense.allocation.projectName
                || projects.find((project) => project.id.toString() === expense.allocation.projectId)?.name
              return { title: "Project", subtitle: projectName || "Без розподілу" }
            }
            return { title: "Unallocated", subtitle: "Без розподілу" }
          })()
          const activeImpactBadges = [
            ["actualMonthlySpend", "Actual Spend"],
            ["cashFlow", "Cash Flow"],
            ["teamCost", "Team Cost"],
            ["projectProfitability", "Project Profitability"],
            ["budgetDeviation", "Budget Deviation"],
            ["companyBurnRate", "Burn Rate"],
          ].filter(([key]) => Boolean((expense.impactFlags as Record<string, boolean> | undefined)?.[key]))
          const allocationBadgeClass = (() => {
            if (allocationLabel.title === "Company") return "bg-violet-100 text-violet-700 hover:bg-violet-100"
            if (allocationLabel.title === "Team") return "bg-blue-100 text-blue-700 hover:bg-blue-100"
            if (allocationLabel.title === "Project") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
            return "border-muted-foreground/30 text-muted-foreground"
          })()
          return (
            <Card key={expense.id} className="overflow-hidden">
              <CardContent className="p-2.5 sm:px-3.5 sm:py-3">
                <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.8fr)_minmax(220px,260px)_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="text-center min-w-[50px]">
                      <div className="text-base font-semibold">{new Date(expense.date).getDate()}</div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {new Date(expense.date).toLocaleDateString("uk-UA", { month: "short" })}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-foreground">{expense.name}</span>
                        {expense.receiptUrl && <Paperclip className="size-3 text-muted-foreground shrink-0" />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {category && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-2 py-0.5"
                            style={{ backgroundColor: `${category.color}20`, color: category.color }}
                          >
                            {category.name}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          {getSourceIcon(expense.source)} {getSourceLabelUa(expense.source)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 w-full md:min-w-[220px] md:max-w-[260px] md:border-l md:border-border/60 md:pl-3 md:pr-1 py-0.5">
                    <Badge
                      variant={allocationLabel.title === "Unallocated" ? "outline" : "secondary"}
                      className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${allocationBadgeClass}`}
                    >
                      {allocationLabel.title}
                    </Badge>
                    <p className="mt-1 truncate text-sm text-muted-foreground/90">{allocationLabel.subtitle}</p>
                    {activeImpactBadges.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {activeImpactBadges.map(([key, label]) => (
                          <Badge key={`${expense.id}-${key}`} variant="secondary" className="text-[11px] px-1.5 py-0.5 font-normal text-muted-foreground">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">{formatAmountWithCode(expense.amount, expense.currency)}</div>
                      {expense.currency !== "USD" && (
                        <div className="text-sm text-muted-foreground">≈ {formatAmountWithCode(expense.amountUSD, "USD")}</div>
                      )}
                    </div>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(expense)}>
                        <Pencil className="size-4 mr-2" />
                        Редагувати
                      </DropdownMenuItem>
                      {expense.receiptUrl && (
                        <DropdownMenuItem>
                          <Receipt className="size-4 mr-2" />
                          Переглянути чек
                        </DropdownMenuItem>
                      )}
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
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredExpenses.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Змінні витрати не знайдено
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? "Редагувати витрату" : "Додати витрату"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense ? "Оновіть деталі витрати" : "Додайте разову витрату або покупку"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Назва / опис</Label>
                <Input
                  id="name"
                  placeholder="Наприклад: MacBook Pro M3"
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
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="UAH">UAH</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Дата</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
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
                <Label htmlFor="assignee">Відповідальний (за бажанням)</Label>
                <Select 
                  value={formData.assigneeId || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, assigneeId: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть людину" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не вказано</SelectItem>
                    {allMembers.map(member => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Allocation Logic */}
            <div className="space-y-4">
              <Label>Фінансова прив’язка витрати</Label>
              <RadioGroup 
                value={formData.allocationType}
                onValueChange={(v) => setFormData({
                  ...formData,
                  allocationType: v as AllocationTarget,
                  impactFlags: getDefaultImpactFlags(v as AllocationTarget),
                })}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer flex-1">
                    <div className="font-medium">Company Overhead</div>
                    <div className="text-xs text-muted-foreground">Загальна витрата компанії</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="cursor-pointer flex-1">
                    <div className="font-medium">Team Expense</div>
                    <div className="text-xs text-muted-foreground">Витрата конкретної команди</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="project" id="project" />
                  <Label htmlFor="project" className="cursor-pointer flex-1">
                    <div className="font-medium">Project Expense</div>
                    <div className="text-xs text-muted-foreground">Пряма витрата на проект</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="cursor-pointer flex-1">
                    <div className="font-medium">Unallocated</div>
                    <div className="text-xs text-muted-foreground">Окрема витрата без прив’язки</div>
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
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id.toString()}>{team.name}</SelectItem>
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
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name} — {project.client_name || "Без клієнта"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Примітки (за бажанням)</Label>
              <Textarea
                id="description"
                placeholder="Додаткові деталі…"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">Додаткові налаштування аналітики</summary>
              <div className="mt-3 space-y-2">
              <Label>Вплив на аналітику</Label>
              {[
                ["actualMonthlySpend", "Actual Monthly Spend", "Враховувати у фактичних витратах за місяць"],
                ["cashFlow", "Cash Flow", "Враховувати у русі коштів"],
                ["projectProfitability", "Project Profitability", "Враховувати у рентабельності проекту"],
                ["budgetDeviation", "Budget Deviation", "Враховувати у відхиленні від планового бюджету"],
                ["teamCost", "Team Cost", "Додавати до вартості конкретної команди"],
                ["companyBurnRate", "Company Burn Rate", "Включати у стабільні витрати компанії"],
              ].map(([key, label, helper]) => (
                <label key={key} className="block text-sm">
                  <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean((formData.impactFlags as Record<string, boolean>)?.[key])}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        impactFlags: {
                          ...(formData.impactFlags as Record<string, boolean>),
                          [key]: e.target.checked,
                        },
                      })
                    }
                  />
                  {label}
                  </span>
                  <span className="ml-6 text-xs text-muted-foreground">{helper}</span>
                </label>
              ))}
              </div>
            </details>
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
            <AlertDialogTitle>Видалити витрату</AlertDialogTitle>
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
