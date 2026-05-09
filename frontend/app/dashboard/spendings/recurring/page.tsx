"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  Plus, 
  Search, 
  Calendar, 
  CreditCard, 
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Building2,
  Users,
  FolderKanban,
  CircleSlash
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
  getPaymentStatusColor,
  getSourceIcon,
} from "@/lib/types/spendings"
import { workforceApi, type ApiRecurringExpense, type ApiTeam, type ApiProject } from "@/lib/api/workforce"
import { convertToBaseCurrency, formatCurrency as formatMoney, getNbuRates, toMonthlyRecurringAmount, type NbuRates } from "@/lib/utils/currency"

export default function RecurringExpensesPage() {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [rates, setRates] = useState<NbuRates | null>(null)
  const [ratesWarning, setRatesWarning] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [deleteExpense, setDeleteExpense] = useState<RecurringExpense | null>(null)
  
  // Form state
  const currentMonthKey = new Date().toISOString().slice(0, 7)

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    amountType: "fixed" as "fixed" | "variable",
    estimatedAmount: "",
    actualAmountForMonth: "",
    actualAmountMonth: currentMonthKey,
    currency: "USD" as Currency,
    cycle: "monthly" as PaymentCycle,
    category: "",
    source: "monobank" as PaymentSource,
    allocationType: "all" as AllocationTarget,
    teamId: "",
    projectId: "",
    description: "",
    paymentDate: "",
  })

  const mapApiExpense = (expense: ApiRecurringExpense): RecurringExpense => ({
    id: expense.id.toString(),
    name: expense.name,
    amount: Number(expense.amount || 0),
    currency: expense.currency,
    amountUSD: Number(expense.amount || 0),
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
    amountType: expense.amount_type || "fixed",
    estimatedAmount: expense.estimated_amount ? Number(expense.estimated_amount) : undefined,
    monthlyActualAmounts: expense.monthly_actual_amounts || {},
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

  const loadAllocationEntities = async () => {
    try {
      const [teamsPayload, projectsPayload] = await Promise.all([
        workforceApi.listTeams(),
        workforceApi.listProjects(),
      ])
      setTeams(teamsPayload)
      setProjects(projectsPayload)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не вдалося завантажити команди та проєкти")
    }
  }

  useEffect(() => {
    void Promise.all([loadExpenses(), loadAllocationEntities()])
    void (async () => {
      const { rates: fetchedRates, warning } = await getNbuRates()
      setRates(fetchedRates)
      setRatesWarning(warning)
    })()
  }, [])

  // Stats
  const toMonthlyAmountInUsd = (expense: RecurringExpense) => {
    if (!rates) return null
    const monthlyOriginalAmount = getMonthlyEquivalentAmount(expense)
    return convertToBaseCurrency(monthlyOriginalAmount, expense.currency, rates)
  }

  const monthlyTotal = useMemo(() => {
    if (!rates) return 0
    return expenses.reduce((sum, expense) => sum + (toMonthlyAmountInUsd(expense) ?? 0), 0)
  }, [expenses, rates])
  const activeCount = expenses.filter(e => e.status !== "overdue").length
  const upcomingExpenses = expenses
    .filter((expense) => {
      const nextDate = new Date(expense.nextPaymentDate)
      if (Number.isNaN(nextDate.getTime())) return false
      return expense.status !== "overdue"
    })
    .sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime())

  const nearestUpcomingPayment = upcomingExpenses[0]
  const nextThirtyDaysTotal = upcomingExpenses.reduce((sum, expense) => {
    const paymentDate = new Date(expense.nextPaymentDate)
    const now = new Date()
    const inThirtyDays = new Date()
    inThirtyDays.setDate(now.getDate() + 30)
    if (paymentDate >= now && paymentDate <= inThirtyDays) {
      return sum + (toMonthlyAmountInUsd(expense) ?? 0)
    }
    return sum
  }, 0)

  // Filtered expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const calculateNextPaymentDate = (paymentDate: string, cycle: PaymentCycle) => {
    const nextDate = new Date(paymentDate)
    if (Number.isNaN(nextDate.getTime())) return ""
    if (cycle === "monthly") nextDate.setMonth(nextDate.getMonth() + 1)
    if (cycle === "quarterly") nextDate.setMonth(nextDate.getMonth() + 3)
    if (cycle === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1)
    return nextDate.toISOString().split("T")[0]
  }

  const derivePaymentDateFromExpense = (expense: RecurringExpense) => {
    if (expense.lastPaidDate) return expense.lastPaidDate
    const nextDate = new Date(expense.nextPaymentDate)
    if (Number.isNaN(nextDate.getTime())) return ""
    if (expense.cycle === "monthly") nextDate.setMonth(nextDate.getMonth() - 1)
    if (expense.cycle === "quarterly") nextDate.setMonth(nextDate.getMonth() - 3)
    if (expense.cycle === "yearly") nextDate.setFullYear(nextDate.getFullYear() - 1)
    return nextDate.toISOString().split("T")[0]
  }

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      amountType: "fixed",
      estimatedAmount: "",
      actualAmountForMonth: "",
      actualAmountMonth: currentMonthKey,
      currency: "USD",
      cycle: "monthly",
      category: "",
      source: "monobank",
      allocationType: "all",
      teamId: "",
      projectId: "",
      description: "",
      paymentDate: "",
    })
    setEditingExpense(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (expense: RecurringExpense) => {
    const monthlyActualAmounts = ((expense as RecurringExpense & { monthlyActualAmounts?: Record<string, number | string> }).monthlyActualAmounts || {})
    const actualForCurrentMonth = monthlyActualAmounts[currentMonthKey]
    setFormData({
      name: expense.name,
      amount: expense.amount.toString(),
      amountType: ((expense as RecurringExpense & { amountType?: "fixed" | "variable" }).amountType || "fixed"),
      estimatedAmount: ((expense as RecurringExpense & { estimatedAmount?: number }).estimatedAmount?.toString() || ""),
      actualAmountForMonth: actualForCurrentMonth !== undefined ? String(actualForCurrentMonth) : "",
      actualAmountMonth: currentMonthKey,
      currency: expense.currency,
      cycle: expense.cycle,
      category: expense.category,
      source: expense.source,
      allocationType: expense.allocation.type,
      teamId: expense.allocation.teamId || "",
      projectId: expense.allocation.projectId || "",
      description: expense.description || "",
      paymentDate: derivePaymentDateFromExpense(expense),
    })
    setEditingExpense(expense)
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    const effectiveAmountValue = formData.amountType === "variable"
      ? formData.estimatedAmount
      : formData.amount
    if (!formData.name.trim() || !effectiveAmountValue || !formData.category || !formData.paymentDate) return

    const amount = parseFloat(effectiveAmountValue)
    if (isNaN(amount) || amount <= 0) return
    
    const existingMonthlyActuals = editingExpense?.monthlyActualAmounts || {}
    const monthlyActualAmounts = { ...existingMonthlyActuals }
    const hasActualInput = formData.amountType === "variable" && formData.actualAmountForMonth.trim() !== ""

    if (formData.amountType === "variable" && hasActualInput) {
      monthlyActualAmounts[formData.actualAmountMonth] = Number(formData.actualAmountForMonth)
    }

    const payload = {
      name: formData.name.trim(),
      amount,
      amount_type: formData.amountType,
      estimated_amount: formData.amountType === "variable" ? Number(formData.estimatedAmount || formData.amount || 0) : null,
      monthly_actual_amounts: formData.amountType === "variable" ? monthlyActualAmounts : {},
      currency: formData.currency,
      cycle: formData.cycle,
      category: formData.category,
      source: formData.source,
      allocation_type: formData.allocationType,
      team: formData.allocationType === "team" && formData.teamId ? Number(formData.teamId) : null,
      project: formData.allocationType === "project" && formData.projectId ? Number(formData.projectId) : null,
      status: editingExpense?.status || "pending",
      last_paid_date: formData.paymentDate,
      next_payment_date: calculateNextPaymentDate(formData.paymentDate, formData.cycle),
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

  const getNbuRateLabel = (currency: "USD" | "EUR") => {
    if (!rates) return "—"
    const value = currency === "USD" ? rates.USD : rates.EUR
    return `${value.toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`
  }

  const getAllocationBadge = (expense: RecurringExpense) => {
    const resolvedTeamName =
      expense.allocation.teamName ||
      teams.find((team) => team.id.toString() === expense.allocation.teamId)?.name
    const resolvedProjectName =
      expense.allocation.projectName ||
      projects.find((project) => project.id.toString() === expense.allocation.projectId)?.name

    switch (expense.allocation.type) {
      case "all":
        return (
          <div className="space-y-1">
            <Badge className="inline-flex items-center gap-1 bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100">
              <span>Company</span>
            </Badge>
            <div className="truncate text-[11px] text-muted-foreground">Вся компанія</div>
          </div>
        )
      case "team":
        return (
          <div className="space-y-1">
            <Badge className="inline-flex items-center gap-1 bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100">
              <span>Team</span>
            </Badge>
            <div className="truncate text-[11px] text-muted-foreground">{resolvedTeamName || "—"}</div>
          </div>
        )
      case "project":
        return (
          <div className="space-y-1">
            <Badge className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
              <span>Project</span>
            </Badge>
            <div className="truncate text-[11px] text-muted-foreground">{resolvedProjectName || "—"}</div>
          </div>
        )
      case "none":
        return (
          <div className="space-y-1">
            <Badge variant="outline" className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-muted-foreground">
              <span>Unallocated</span>
            </Badge>
            <div className="truncate text-[11px] text-muted-foreground">Без розподілу</div>
          </div>
        )
      default:
        return null
    }
  }

  function getMonthlyEquivalentAmount(expense: RecurringExpense) {
    const baseAmount = getMonthlyAmount(expense)
    return toMonthlyRecurringAmount(baseAmount, expense.cycle)
  }

  function getMonthlyAmount(expense: RecurringExpense) {
    const extended = expense as RecurringExpense & {
      amountType?: "fixed" | "variable"
      estimatedAmount?: number
      monthlyActualAmounts?: Record<string, number | string>
    }
    if (extended.amountType !== "variable") return expense.amount
    const monthKey = new Date().toISOString().slice(0, 7)
    const actual = Number(extended.monthlyActualAmounts?.[monthKey] ?? 0)
    if (actual > 0) return actual
    return Number(extended.estimatedAmount ?? expense.amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Регулярні витрати</h1>
          <p className="text-sm text-muted-foreground">
            Керуйте щомісячними підписками та повторюваними платежами
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
            <div className="mb-1 font-medium text-foreground/80">Офіційний курс НБУ</div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>$: {getNbuRateLabel("USD")}</span>
              <span>€: {getNbuRateLabel("EUR")}</span>
            </div>
          </div>
          <Button onClick={handleOpenAdd} className="gap-2">
            <Plus className="size-4" />
            Додати витрату
          </Button>
        </div>
      </div>

      {(error || ratesWarning) && (
        <Card className="border-red-200">
          <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {ratesWarning && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="pt-6 text-sm text-amber-800">
            Курс НБУ тимчасово недоступний. Використовується кешований курс валют.
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Завантажуємо регулярні витрати…</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Щомісячне навантаження</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{rates ? formatMoney(monthlyTotal, "USD") : "—"}</div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {rates ? "Актуальна сума регулярних витрат за місяць" : "Очікуємо курс НБУ для коректного USD-розрахунку"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активні регулярні витрати</CardTitle>
            <RefreshCw className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs leading-relaxed text-muted-foreground">Активні регулярні витрати компанії</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 xl:col-span-1">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Найближчі платежі</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nearestUpcomingPayment ? (
              <div className="space-y-1">
                <div className="text-2xl font-bold leading-tight">
                  {formatMoney(toMonthlyAmountInUsd(nearestUpcomingPayment) ?? 0, "USD")}
                </div>
                <div className="text-sm font-medium leading-snug">{nearestUpcomingPayment.name}</div>
                <div className="text-xs leading-relaxed text-muted-foreground">
                  {new Date(nearestUpcomingPayment.nextPaymentDate).toLocaleDateString("uk-UA")}
                </div>
              </div>
            ) : (
              <div className="py-2 text-sm text-muted-foreground">Немає запланованих платежів</div>
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
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>Назва</TableHead>
                <TableHead className="min-w-[180px]">Щомісячний еквівалент</TableHead>
                <TableHead>Цикл</TableHead>
                <TableHead>Категорія</TableHead>
                <TableHead>Розподіл</TableHead>
                <TableHead>Джерело</TableHead>
                <TableHead>Наступний платіж</TableHead>
                <TableHead>Статус оплати</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const category = expenseCategories.find(c => c.id === expense.category)
                const displayedAmount = getMonthlyEquivalentAmount(expense)
                const isVariable = expense.amountType === "variable"
                const forecastAmount = Number(expense.estimatedAmount ?? expense.amount)
                const showForecast = isVariable && forecastAmount !== displayedAmount
                const fixedCycleBaseAmount = !isVariable && expense.cycle !== "monthly" ? Number(expense.amount) : null
                const cycleUnitLabel = expense.cycle === "yearly" ? "рік" : expense.cycle === "quarterly" ? "квартал" : null
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{expense.name}</div>
                        <div>
                          <Badge variant="outline">
                            {isVariable ? "Variable" : "Fixed"}
                          </Badge>
                        </div>
                        {isVariable && (
                          <div className="text-[11px] font-normal text-muted-foreground/70">Фактична сума за місяць</div>
                        )}
                        {expense.description && !expense.description.startsWith("Team overhead:") && (
                          <div className="text-xs text-muted-foreground">{expense.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium leading-tight">{formatCurrency(displayedAmount, expense.currency, "uk-UA")}/місяць</div>
                        {fixedCycleBaseAmount !== null && cycleUnitLabel && (
                          <div className="text-[11px] text-muted-foreground/80">
                            {formatCurrency(fixedCycleBaseAmount, expense.currency, "uk-UA")}/{cycleUnitLabel}
                          </div>
                        )}
                        {showForecast && (
                          <div className="text-[11px] text-muted-foreground/80">
                            Прогноз: {formatCurrency(forecastAmount, expense.currency, "uk-UA")}
                          </div>
                        )}
                        {expense.currency !== "USD" && (
                          <div className="text-[11px] text-muted-foreground/80">≈ {formatMoney(toMonthlyAmountInUsd(expense) ?? 0, "USD")}/місяць</div>
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
                    <TableCell>
                      <div className="max-w-[180px] sm:max-w-[220px]">{getAllocationBadge(expense)}</div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <span>{getSourceIcon(expense.source)}</span>
                        <span className="text-sm">{getSourceLabelUa(expense.source)}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div>{new Date(expense.nextPaymentDate).toLocaleDateString("uk-UA")}</div>
                        {expense.lastPaidDate ? (
                          <div className="text-[11px] text-muted-foreground">
                            Остання оплата: {new Date(expense.lastPaidDate).toLocaleDateString("uk-UA")}
                          </div>
                        ) : null}
                      </div>
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
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Регулярні витрати не знайдено
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
          <DialogHeader className="px-6 pt-8">
            <DialogTitle>
              {editingExpense ? "Редагувати регулярну витрату" : "Додати регулярну витрату"}
            </DialogTitle>
            <DialogDescription>
              {editingExpense
                ? "Оновіть параметри підписки або регулярного платежу"
                : "Додайте нову регулярну підписку або платіж"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 p-6">
            {/* Basic Info */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Basic info</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="col-span-2">
                <Label htmlFor="name">Назва</Label>
                <Input
                  id="name"
                  placeholder="Наприклад: AWS Cloud Services"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              {formData.amountType === "fixed" && (
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
              )}
              <div>
                <Label htmlFor="amountType">Тип суми</Label>
                <Select
                  value={formData.amountType}
                  onValueChange={(v) => setFormData({ ...formData, amountType: v as "fixed" | "variable" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Фіксована сума</SelectItem>
                    <SelectItem value="variable">Змінна сума</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label htmlFor="paymentDate">Дата останньої оплати</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                />
                {formData.paymentDate && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Наступний платіж: {new Date(calculateNextPaymentDate(formData.paymentDate, formData.cycle)).toLocaleDateString("uk-UA")}
                  </p>
                )}
              </div>
              </div>
            </section>

            {formData.amountType === "variable" && (
              <section className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Налаштування змінної суми</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="estimatedAmount">Прогнозна сума за місяць</Label>
                    <Input
                      id="estimatedAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.estimatedAmount}
                      onChange={(e) => setFormData({ ...formData, estimatedAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="actualAmountMonth">Місяць фактичної суми</Label>
                    <Input
                      id="actualAmountMonth"
                      type="month"
                      value={formData.actualAmountMonth}
                      onChange={(e) => {
                        const month = e.target.value
                        const monthlyActualAmounts = editingExpense?.monthlyActualAmounts || {}
                        setFormData({
                          ...formData,
                          actualAmountMonth: month,
                          actualAmountForMonth: monthlyActualAmounts[month] !== undefined ? String(monthlyActualAmounts[month]) : "",
                        })
                      }}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="actualAmountForMonth">Фактична сума за вибраний місяць</Label>
                    <Input
                      id="actualAmountForMonth"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.actualAmountForMonth}
                      onChange={(e) => setFormData({ ...formData, actualAmountForMonth: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Якщо не вказано — використовується прогнозна сума</p>
                  </div>
                </div>
              </section>
            )}

            {/* Allocation Logic */}
            <section className="space-y-3">
              <Label>Фінансова прив’язка витрати</Label>
              <RadioGroup 
                value={formData.allocationType}
                onValueChange={(v) => setFormData({ ...formData, allocationType: v as AllocationTarget })}
                className="grid grid-cols-1 gap-2 md:grid-cols-2"
              >
                <div className="flex min-h-[76px] items-center gap-2 rounded-lg border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="cursor-pointer flex-1">
                    <div className="font-medium">Company Overhead</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Для всієї компанії</div>
                  </Label>
                </div>
                <div className="flex min-h-[76px] items-center gap-2 rounded-lg border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="cursor-pointer flex-1">
                    <div className="font-medium">Team Expense</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Для конкретної команди</div>
                  </Label>
                </div>
                <div className="flex min-h-[76px] items-center gap-2 rounded-lg border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="project" id="project" />
                  <Label htmlFor="project" className="cursor-pointer flex-1">
                    <div className="font-medium">Project Expense</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Для конкретного проєкту</div>
                  </Label>
                </div>
                <div className="flex min-h-[76px] items-center gap-2 rounded-lg border p-3 hover:bg-muted/50">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="cursor-pointer flex-1">
                    <div className="font-medium">Unallocated</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Без прив’язки</div>
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
                    {teams.length > 0 ? (
                      teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Наразі команд немає</div>
                    )}
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
                    {projects.length > 0 ? (
                      projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name} — {project.client_name || "Без клієнта"}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Наразі проєктів немає</div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </section>

            {/* Description */}
            <section>
              <Label htmlFor="description">Опис (за бажанням)</Label>
              <Textarea
                id="description"
                placeholder="Додаткові примітки…"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Скасувати
            </Button>
            <Button 
              onClick={handleSave}
              disabled={
                !formData.name.trim() || 
                !(formData.amountType === "variable" ? formData.estimatedAmount : formData.amount) || 
                parseFloat(formData.amountType === "variable" ? formData.estimatedAmount : formData.amount) <= 0 ||
                !formData.category ||
                !formData.paymentDate ||
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
