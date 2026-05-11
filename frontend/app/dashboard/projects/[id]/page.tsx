"use client"

import { useEffect, useMemo, useState, use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
  Calculator,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  CreditCard,
  FileText,
  Building2,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  type Project, 
  type Invoice,
  type ResourceAllocation,
  type ProjectExpense,
  type InvoiceStatus,
  getStatusBadgeVariant,
  getStatusLabel,
} from "@/lib/types/projects"
import { ApiInvoice, ApiProject, ApiRecurringExpense, ApiTeam, ApiDeveloper, workforceApi } from "@/lib/api/workforce"
import { convertToBaseCurrency, getNbuRates, toMonthlyRecurringAmount } from "@/lib/utils/currency"
import { getExpenseCategoryLabel, normalizeExpenseCategoryValue, sharedExpenseCategories } from "@/lib/constants/expense-categories"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [developers, setDevelopers] = useState<ApiDeveloper[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getProjectAllocationsStorageKey = (projectId: string) => `project_allocations_${projectId}`

  const calculateRuntimeFinancials = (currentProject: Project) => {
    const totalRevenue = currentProject.invoices
      .filter(i => i.status === "paid")
      .reduce((sum, i) => sum + i.amount, 0)

    // Фактична праця має рахуватись лише з recorded actuals (payroll/worklogs/time tracking).
    // Прив'язка команди та allocation — це план, а не факт.
    const totalLaborCost = 0

    // Фактичні витрати: лише реально зафіксовані витрати проєкту.
    const totalExpenses = currentProject.expenses
      .filter((expense) => expense.impactProjectProfitability ?? true)
      .reduce((sum, e) => sum + (e.amountUsd ?? e.amount), 0)

    const netProfit = totalRevenue - totalLaborCost - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    return { totalRevenue, totalLaborCost, totalExpenses, netProfit, profitMargin }
  }

  const toRecurringMonthlyAmountInUsd = (expense: ApiRecurringExpense, rates: Awaited<ReturnType<typeof getNbuRates>>["rates"]) => {
    const monthKey = new Date().toISOString().slice(0, 7)
    const baseAmount = expense.amount_type === "variable"
      ? Number(expense.monthly_actual_amounts?.[monthKey] ?? expense.estimated_amount ?? expense.amount ?? 0)
      : Number(expense.amount ?? 0)
    return convertToBaseCurrency(toMonthlyRecurringAmount(baseAmount, expense.cycle), expense.currency, rates)
  }

  const mapApiProject = (apiProject: ApiProject): Project => {
    const revenue = Number(apiProject.revenue || 0)
    const laborCost = Number(apiProject.labor_cost || 0)
    const directOverheads = Number(apiProject.direct_overheads || 0)
    const netProfit = revenue - laborCost - directOverheads
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0
    const totalContractValue = apiProject.total_contract_value ? Number(apiProject.total_contract_value) : undefined
    const budgetUsedPercent = totalContractValue && totalContractValue > 0
      ? ((laborCost + directOverheads) / totalContractValue) * 100
      : 0

    return {
      id: apiProject.id.toString(),
      name: apiProject.name,
      client: {
        id: apiProject.client.toString(),
        name: apiProject.client_name,
        createdAt: apiProject.created_at,
        totalRevenue: 0,
        activeProjects: 0,
      },
      status: apiProject.status,
      startDate: apiProject.start_date,
      endDate: apiProject.end_date,
      tags: [],
      billingModel: apiProject.billing_model,
      currency: apiProject.currency,
      totalContractValue,
      clientHourlyRate: apiProject.client_hourly_rate ? Number(apiProject.client_hourly_rate) : undefined,
      monthlyCap: apiProject.monthly_cap ?? undefined,
      billingCycle: apiProject.billing_cycle ?? undefined,
      taxReservePercent: apiProject.tax_reserve_percent ? Number(apiProject.tax_reserve_percent) : undefined,
      revenue,
      laborCost,
      directOverheads,
      bufferPercent: Number(apiProject.buffer_percent || 0),
      allocations: [],
      teamId: apiProject.team ? apiProject.team.toString() : undefined,
      teamName: apiProject.team_name || undefined,
      invoices: [],
      expenses: [],
      budgetUsedPercent,
      netProfit,
      profitMargin,
    }
  }

  const mapApiInvoice = (apiInvoice: ApiInvoice): Invoice => ({
    id: String(apiInvoice.id),
    name: apiInvoice.description?.trim() || apiInvoice.number,
    amount: Number(apiInvoice.amount),
    status: apiInvoice.status,
    dueDate: apiInvoice.due_date,
    paidDate: apiInvoice.paid_date ?? undefined,
    description: apiInvoice.description || undefined,
  })

  const buildDefaultAllocationsFromTeams = (
    availableTeams: ApiTeam[],
    availableDevelopers: ApiDeveloper[]
  ): ResourceAllocation[] => {
    const developerRateById = availableDevelopers.reduce<Record<number, number>>((acc, developer) => {
      acc[developer.id] = Number(developer.hourly_rate || 0)
      return acc
    }, {})

    return availableTeams.flatMap((team) =>
      team.memberships.map((membership) => {
        const hourlyRate = developerRateById[membership.developer] || 0
        const memberRole = availableDevelopers.find((developer) => developer.id === membership.developer)?.role || "Розробник"
        const defaultAllocation = membership.allocation || 100
        const monthlyCost = hourlyRate * 160 * (defaultAllocation / 100)

        return {
          id: `alloc-${team.id}-${membership.developer}`,
          memberId: `${team.id}-${membership.developer}`,
          memberName: membership.developer_name || `Розробник #${membership.developer}`,
          memberRole,
          teamId: String(team.id),
          teamName: team.name,
          allocation: defaultAllocation,
          monthlyCost,
        }
      })
    )
  }

  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [apiProject, allInvoices, teamsResponse, developersResponse, variableExpenses, recurringExpenses, { rates: loadedRates }] = await Promise.all([
          workforceApi.getProject(id),
          workforceApi.listInvoices(),
          workforceApi.listTeams(),
          workforceApi.listDevelopers(),
          workforceApi.listVariableExpenses(),
          workforceApi.listRecurringExpenses(),
          getNbuRates(),
        ])

        setTeams(teamsResponse)
        setDevelopers(developersResponse)

        const mappedProject = mapApiProject(apiProject)
        const projectInvoices = allInvoices
          .filter(invoice => String(invoice.project) === id)
          .map(mapApiInvoice)

        let persistedAllocations: ResourceAllocation[] = []
        if (typeof window !== "undefined") {
          const rawAllocations = localStorage.getItem(getProjectAllocationsStorageKey(id))
          if (rawAllocations) {
            try {
              persistedAllocations = JSON.parse(rawAllocations) as ResourceAllocation[]
            } catch {
              persistedAllocations = []
            }
          }
        }

        const fallbackAllocations = buildDefaultAllocationsFromTeams(teamsResponse, developersResponse)
        const initialAllocations = persistedAllocations.length > 0 ? persistedAllocations : fallbackAllocations

        const projectIrregularExpenses: ProjectExpense[] = variableExpenses
          .filter((expense) => expense.allocation_type === "project" && String(expense.project) === id)
          .map((expense) => ({
            id: String(expense.id),
            sourceId: expense.id,
            expenseType: "irregular" as const,
            name: expense.name,
            amount: Number(expense.amount ?? 0),
            currency: expense.currency,
            amountUsd: convertToBaseCurrency(Number(expense.amount ?? 0), expense.currency, loadedRates),
            category: expense.category,
            date: expense.expense_date,
            description: expense.description || undefined,
            impactProjectProfitability: expense.impact_flags?.projectProfitability ?? true,
          }))
        const projectRecurringExpenses: ProjectExpense[] = recurringExpenses
          .filter((expense) => expense.allocation_type === "project" && String(expense.project) === id)
          .map((expense) => ({
            id: `recurring-${expense.id}`,
            sourceId: expense.id,
            expenseType: "recurring" as const,
            name: expense.name,
            amount: Number(expense.amount ?? 0),
            currency: expense.currency,
            amountUsd: toRecurringMonthlyAmountInUsd(expense, loadedRates),
            category: expense.category,
            date: expense.next_payment_date,
            description: expense.description || undefined,
            impactProjectProfitability: true,
            recurringCycle: expense.cycle,
          }))
        const projectDirectExpenses = [...projectIrregularExpenses, ...projectRecurringExpenses]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        setProject({ ...mappedProject, invoices: projectInvoices, allocations: initialAllocations, expenses: projectDirectExpenses })
      } catch (loadError) {
        setProject(null)
        setError(loadError instanceof Error ? loadError.message : "Не вдалося завантажити проєкт")
      } finally {
        setIsLoading(false)
      }
    }

    void loadProject()
  }, [id])

  useEffect(() => {
    if (!project || typeof window === "undefined") return
    localStorage.setItem(getProjectAllocationsStorageKey(project.id), JSON.stringify(project.allocations))
  }, [project?.id, project?.allocations])

  useEffect(() => {
    if (!project) return

    const { totalRevenue, totalLaborCost, totalExpenses, netProfit, profitMargin } = calculateRuntimeFinancials(project)

    const shouldUpdateLocalProject = (
      Math.abs(totalRevenue - project.revenue) > 0.01 ||
      Math.abs(netProfit - project.netProfit) > 0.01 ||
      Math.abs(profitMargin - project.profitMargin) > 0.01
    )

    if (shouldUpdateLocalProject) {
      setProject(prev => prev ? {
        ...prev,
        revenue: totalRevenue,
        netProfit,
        profitMargin,
      } : prev)
    }

    if (project.invoices.length === 0 && project.allocations.length === 0 && project.expenses.length === 0) {
      return
    }

    void workforceApi.updateProject(project.id, {
      revenue: totalRevenue.toFixed(2),
    }).catch(() => {
      setError("Дані змінено локально, але не вдалося зберегти на сервері.")
    })
  }, [project?.id, project?.invoices, project?.allocations, project?.expenses])
  
  // Invoice CRUD
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)
  const [isDeleteInvoiceOpen, setIsDeleteInvoiceOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceForm, setInvoiceForm] = useState({
    name: "",
    amount: "",
    status: "draft" as InvoiceStatus,
    dueDate: "",
    description: "",
  })

  // Розподіл ресурсів CRUD
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false)
  const [isDeleteAllocationOpen, setIsDeleteAllocationOpen] = useState(false)
  const [selectedAllocation, setSelectedAllocation] = useState<ResourceAllocation | null>(null)
  const [allocationForm, setAllocationForm] = useState({
    memberId: "",
    allocation: 100,
  })

  // Expense CRUD
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isDeleteExpenseOpen, setIsDeleteExpenseOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<ProjectExpense | null>(null)
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  })

  // Get all team members for allocation
  const developerRateById = useMemo(
    () =>
      developers.reduce<Record<number, number>>((acc, developer) => {
        acc[developer.id] = Number(developer.hourly_rate || 0)
        return acc
      }, {}),
    [developers]
  )

  const allMembers = useMemo(
    () =>
      teams.flatMap((team) =>
        team.memberships.map((membership) => {
          const hourlyRate = developerRateById[membership.developer] || 0
          const developerRole = developers.find((developer) => developer.id === membership.developer)?.role || "Розробник"
          return {
            id: `${team.id}-${membership.developer}`,
            developerId: membership.developer,
            name: membership.developer_name || `Розробник #${membership.developer}`,
            role: developerRole,
            teamId: team.id.toString(),
            teamName: team.name,
            baseRate: hourlyRate * 160,
          }
        })
      ),
    [teams, developers, developerRateById]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Завантаження проєкту...</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">{error || "Проєкт не знайдено"}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/projects">Повернутися до портфеля проєктів</Link>
        </Button>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: project.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  // Invoice handlers
  const handleSaveInvoice = async () => {
    if (!project) return

    const parsedAmount = parseFloat(invoiceForm.amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Вкажіть коректну суму інвойсу")
      return
    }

    const payload = {
      project: Number(project.id),
      client: Number(project.client.id),
      amount: parsedAmount,
      currency: project.currency,
      status: invoiceForm.status,
      due_date: invoiceForm.dueDate,
      description: invoiceForm.description || invoiceForm.name,
      paid_date: invoiceForm.status === "paid" ? new Date().toISOString().split("T")[0] : null,
    }

    try {
      if (selectedInvoice) {
        await workforceApi.updateInvoice(selectedInvoice.id, payload)
      } else {
        await workforceApi.createInvoice({
          ...payload,
          issue_date: new Date().toISOString().split("T")[0],
          number: `INV-${new Date().getFullYear()}-${Date.now()}`,
        })
      }

      const refreshedInvoices = await workforceApi.listInvoices()
      const projectInvoices = refreshedInvoices
        .filter(invoice => String(invoice.project) === project.id)
        .map(mapApiInvoice)

      setProject(prev => (prev ? { ...prev, invoices: projectInvoices } : prev))
      closeInvoiceDialog()
    } catch (invoiceError) {
      setError(invoiceError instanceof Error ? invoiceError.message : "Не вдалося зберегти інвойс")
    }
  }

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return

    try {
      await workforceApi.deleteInvoice(selectedInvoice.id)
      setProject(prev => prev
        ? { ...prev, invoices: prev.invoices.filter(i => i.id !== selectedInvoice.id) }
        : prev)
      setIsDeleteInvoiceOpen(false)
      setSelectedInvoice(null)
    } catch (invoiceError) {
      setError(invoiceError instanceof Error ? invoiceError.message : "Не вдалося видалити інвойс")
    }
  }

  const openEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setInvoiceForm({
      name: invoice.name,
      amount: invoice.amount.toString(),
      status: invoice.status,
      dueDate: invoice.dueDate,
      description: invoice.description || "",
    })
    setIsInvoiceDialogOpen(true)
  }

  const closeInvoiceDialog = () => {
    setIsInvoiceDialogOpen(false)
    setSelectedInvoice(null)
    setInvoiceForm({ name: "", amount: "", status: "draft", dueDate: "", description: "" })
  }

  const markInvoiceAsPaid = async (invoice: Invoice) => {
    const paidDate = new Date().toISOString().split("T")[0]

    try {
      await workforceApi.updateInvoice(invoice.id, { status: "paid", paid_date: paidDate })
      setProject(prev => prev
        ? {
            ...prev,
            invoices: prev.invoices.map(i =>
              i.id === invoice.id
                ? { ...i, status: "paid" as InvoiceStatus, paidDate }
                : i
            ),
          }
        : prev)
    } catch (invoiceError) {
      setError(invoiceError instanceof Error ? invoiceError.message : "Не вдалося оновити статус інвойсу")
    }
  }

  // Allocation handlers
  const handleSaveAllocation = () => {
    const member = allMembers.find(m => m.id === allocationForm.memberId)
    if (!member) return

    const monthlyCost = member.baseRate * (allocationForm.allocation / 100)
    
    const newAllocation: ResourceAllocation = {
      id: selectedAllocation?.id || `alloc-${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      memberRole: member.role,
      teamId: member.teamId,
      teamName: member.teamName,
      allocation: allocationForm.allocation,
      monthlyCost,
    }

    if (selectedAllocation) {
      setProject({
        ...project,
        allocations: project.allocations.map(a => a.id === selectedAllocation.id ? newAllocation : a),
      })
    } else {
      setProject({
        ...project,
        allocations: [...project.allocations, newAllocation],
      })
    }

    closeAllocationDialog()
  }

  const handleDeleteAllocation = () => {
    if (!selectedAllocation) return
    setProject({
      ...project,
      allocations: project.allocations.filter(a => a.id !== selectedAllocation.id),
    })
    setIsDeleteAllocationOpen(false)
    setSelectedAllocation(null)
  }

  const openEditAllocation = (allocation: ResourceAllocation) => {
    setSelectedAllocation(allocation)
    setAllocationForm({
      memberId: allocation.memberId,
      allocation: allocation.allocation,
    })
    setIsAllocationDialogOpen(true)
  }

  const closeAllocationDialog = () => {
    setIsAllocationDialogOpen(false)
    setSelectedAllocation(null)
    setAllocationForm({ memberId: "", allocation: 100 })
  }

  // Expense handlers
  const handleSaveExpense = () => {
    const newExpense: ProjectExpense = {
      id: selectedExpense?.id || `exp-${Date.now()}`,
      name: expenseForm.name,
      amount: parseFloat(expenseForm.amount) || 0,
      currency: selectedExpense?.currency ?? "USD",
      amountUsd: parseFloat(expenseForm.amount) || 0,
      category: expenseForm.category,
      date: expenseForm.date,
      description: expenseForm.description,
      impactProjectProfitability: selectedExpense?.impactProjectProfitability ?? true,
    }

    if (selectedExpense) {
      setProject({
        ...project,
        expenses: project.expenses.map(e => e.id === selectedExpense.id ? newExpense : e),
      })
    } else {
      setProject({
        ...project,
        expenses: [...project.expenses, newExpense],
      })
    }

    closeExpenseDialog()
  }

  const handleDeleteExpense = async () => {
    if (!selectedExpense?.sourceId || !project) return
    try {
      if (selectedExpense.expenseType === "recurring") {
        await workforceApi.deleteRecurringExpense(selectedExpense.sourceId)
      } else {
        await workforceApi.deleteVariableExpense(selectedExpense.sourceId)
      }
      const [apiProject, allInvoices, teamsResponse, developersResponse, variableExpenses, recurringExpenses, { rates: loadedRates }] = await Promise.all([
        workforceApi.getProject(id),
        workforceApi.listInvoices(),
        workforceApi.listTeams(),
        workforceApi.listDevelopers(),
        workforceApi.listVariableExpenses(),
        workforceApi.listRecurringExpenses(),
        getNbuRates(),
      ])
      const mappedProject = mapApiProject(apiProject)
      const projectInvoices = allInvoices.filter(invoice => String(invoice.project) === id).map(mapApiInvoice)
      const fallbackAllocations = buildDefaultAllocationsFromTeams(teamsResponse, developersResponse)
      const irregular = variableExpenses
        .filter((expense) => expense.allocation_type === "project" && String(expense.project) === id)
        .map((expense) => ({
          id: String(expense.id),
          sourceId: expense.id,
          expenseType: "irregular" as const,
          name: expense.name,
          amount: Number(expense.amount ?? 0),
          currency: expense.currency,
          amountUsd: convertToBaseCurrency(Number(expense.amount ?? 0), expense.currency, loadedRates),
          category: expense.category,
          date: expense.expense_date,
          description: expense.description || undefined,
          impactProjectProfitability: expense.impact_flags?.projectProfitability ?? true,
        }))
      const recurring = recurringExpenses
        .filter((expense) => expense.allocation_type === "project" && String(expense.project) === id)
        .map((expense) => ({
          id: `recurring-${expense.id}`,
          sourceId: expense.id,
          expenseType: "recurring" as const,
          name: expense.name,
          amount: Number(expense.amount ?? 0),
          currency: expense.currency,
          amountUsd: toRecurringMonthlyAmountInUsd(expense, loadedRates),
          category: expense.category,
          date: expense.next_payment_date,
          description: expense.description || undefined,
          impactProjectProfitability: true,
          recurringCycle: expense.cycle,
        }))
      setProject({ ...mappedProject, invoices: projectInvoices, allocations: project.allocations.length > 0 ? project.allocations : fallbackAllocations, expenses: [...irregular, ...recurring].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()) })
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не вдалося видалити витрату")
    } finally {
      setIsDeleteExpenseOpen(false)
      setSelectedExpense(null)
    }
  }

  const openEditExpense = (expense: ProjectExpense) => {
    setSelectedExpense(expense)
    setExpenseForm({
      name: expense.name,
      amount: expense.amount.toString(),
      category: normalizeExpenseCategoryValue(expense.category),
      date: expense.date,
      description: expense.description || "",
    })
    setIsExpenseDialogOpen(true)
  }

  const closeExpenseDialog = () => {
    setIsExpenseDialogOpen(false)
    setSelectedExpense(null)
    setExpenseForm({ name: "", amount: "", category: "", date: new Date().toISOString().split("T")[0], description: "" })
  }

  // Calculations
  const { totalRevenue, totalLaborCost, totalExpenses, netProfit, profitMargin } = calculateRuntimeFinancials(project)
  const plannedRevenue = project.totalContractValue || 0
  const plannedBuffer = plannedRevenue * ((project.bufferPercent || 0) / 100)
  const plannedCost = project.laborCost + project.directOverheads + plannedBuffer
  const plannedProfit = plannedRevenue - plannedCost
  const plannedMargin = plannedRevenue > 0 ? (plannedProfit / plannedRevenue) * 100 : 0

  // Cost estimator
  const estimatedMonthlyCost = project.allocations.reduce((sum, a) => sum + a.monthlyCost, 0)
  const breakEvenRevenue = estimatedMonthlyCost * 1.3 // 30% margin minimum

  const getInvoiceStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case "paid": return <CheckCircle2 className="size-4 text-emerald-500" />
      case "sent": return <Send className="size-4 text-blue-500" />
      case "overdue": return <AlertCircle className="size-4 text-destructive" />
      default: return <Clock className="size-4 text-muted-foreground" />
    }
  }

  const getInvoiceStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "paid": return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Оплачено</Badge>
      case "sent": return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Відправлено</Badge>
      case "overdue": return <Badge variant="destructive">Прострочено</Badge>
      default: return <Badge variant="secondary">Чернетка</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <Badge variant={getStatusBadgeVariant(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Building2 className="size-4" />
              {project.client.name}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {formatDate(project.startDate)} — {formatDate(project.endDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Плановий дохід</CardTitle>
            <DollarSign className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(plannedRevenue)}</div>
            <p className="text-xs text-muted-foreground">вартість контракту</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Фактичний дохід</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">оплачені інвойси</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Планові витрати</CardTitle>
            <Receipt className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(plannedCost)}</div>
            <p className="text-xs text-muted-foreground">команда + прямі + резерв</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Очікуваний прибуток</CardTitle>
            {plannedProfit >= 0 ? (
              <TrendingUp className="size-4 text-emerald-500" />
            ) : (
              <TrendingDown className="size-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${plannedProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {formatCurrency(plannedProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              очікувана маржинальність {plannedMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="financials" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financials">Фінанси проєкту</TabsTrigger>
          <TabsTrigger value="resources">Розподіл ресурсів</TabsTrigger>
          <TabsTrigger value="invoices">Інвойси та оплати</TabsTrigger>
        </TabsList>

        {/* Tab A: Фінанси проєкту */}
        <TabsContent value="financials" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* P&L Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>План vs Факт</CardTitle>
                <CardDescription>Планові та фактичні фінансові показники проєкту</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Плановий дохід</span>
                    <span className="font-semibold text-emerald-600">+{formatCurrency(plannedRevenue)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Планові витрати</span>
                    <span className="font-semibold text-destructive">-{formatCurrency(plannedCost)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Фактичні витрати</span>
                    <span className="font-semibold text-destructive">-{formatCurrency(totalLaborCost + totalExpenses)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-3 -mx-3">
                    <span className="font-semibold">Очікуваний прибуток</span>
                    <span className={`text-xl font-bold ${plannedProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {formatCurrency(plannedProfit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-3 -mx-3">
                    <span className="font-semibold">Фактичний прибуток</span>
                    <span className={`text-xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>{formatCurrency(netProfit)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Формула:</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 p-2 rounded">
                    Чистий прибуток = Дохід - (Вартість команди + Прямі витрати)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Прямі витрати */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
              <CardTitle>Прямі витрати проєкту</CardTitle>
              <CardDescription>Нерегулярні витрати, прив&apos;язані до цього проєкту</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsExpenseDialogOpen(true)}>
                  <Plus className="mr-1 size-4" />
                  Додати
                </Button>
              </CardHeader>
              <CardContent>
                {project.expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="size-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Немає прямих витрат</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {project.expenses.map(expense => (
                      <div 
                        key={expense.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm">{expense.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">{getExpenseCategoryLabel(expense.category)}</Badge>
                            <Badge variant={expense.expenseType === "recurring" ? "secondary" : "default"} className="text-xs">
                              {expense.expenseType === "recurring" ? "Регулярні" : "Разові"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(expense.date)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="font-semibold">
                              {new Intl.NumberFormat("uk-UA", {
                                style: "currency",
                                currency: expense.currency ?? "USD",
                                maximumFractionDigits: 0,
                              }).format(expense.amount)}
                            </span>
                            {(expense.currency ?? "USD") !== "USD" && (
                              <p className="text-xs text-muted-foreground">
                                ≈ {formatCurrency(expense.amountUsd ?? expense.amount)}
                              </p>
                            )}
                            {expense.expenseType === "recurring" && expense.recurringCycle && (
                              <p className="text-xs text-muted-foreground">{expense.recurringCycle}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditExpense(expense)}>
                                <Pencil className="mr-2 size-4" />
                                Редагувати
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedExpense(expense)
                                  setIsDeleteExpenseOpen(true)
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Видалити
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contract Info */}
          {project.billingModel === "fixed" && project.milestones && (
            <Card>
              <CardHeader>
                <CardTitle>Contract Етапи оплати</CardTitle>
                <CardDescription>
                  Загальна вартість контракту: {formatCurrency(project.totalContractValue || 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.milestones.map((milestone, idx) => {
                    const invoice = project.invoices.find(i => i.name.includes(milestone.name))
                    const isPaid = invoice?.status === "paid"
                    
                    return (
                      <div key={milestone.id} className="flex items-center gap-4">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                          isPaid ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                        }`}>
                          {isPaid ? <CheckCircle2 className="size-4" /> : idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{milestone.name}</p>
                          <p className="text-sm text-muted-foreground">{milestone.percentage}%</p>
                        </div>
                        <span className={`font-semibold ${isPaid ? "text-emerald-600" : ""}`}>
                          {formatCurrency(milestone.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab B: Розподіл ресурсів */}
        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Team Selector */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Привʼязана команда</CardTitle>
                  <CardDescription>Залученість учасників редагується на сторінці Команди.</CardDescription>
                </CardHeader>
                <CardContent>
                  {project.allocations.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="size-12 mx-auto mb-3 opacity-50" />
                      <p>Команду ще не призначено</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {project.allocations.map(allocation => (
                        <div 
                          key={allocation.id}
                          className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {allocation.memberName.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{allocation.memberName}</p>
                              <Badge variant="outline" className="text-xs">{allocation.teamName}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{allocation.memberRole}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-sm font-medium">{allocation.allocation}%</p>
                                <p className="text-xs text-muted-foreground">залучення</p>
                              </div>
                              <Separator orientation="vertical" className="h-8" />
                              <div>
                                <p className="font-semibold">{formatCurrency(allocation.monthlyCost)}</p>
                                <p className="text-xs text-muted-foreground">/місяць</p>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">З Команди</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cost Estimator */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="size-5" />
                  Cost Estimator
                </CardTitle>
                <CardDescription>Розрахунок вартості команди</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Місячна вартість:</span>
                    <span className="font-semibold">{formatCurrency(estimatedMonthlyCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Членів команди:</span>
                    <span className="font-semibold">{project.allocations.length}</span>
                  </div>
                </div>

                <Separator />

                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Щоб бути в плюсі:</p>
                  <p className="text-lg font-bold text-primary">
                    мін. {formatCurrency(breakEvenRevenue)}/міс
                  </p>
                  <p className="text-xs text-muted-foreground">
                    При маржі 30%
                  </p>
                </div>

                {profitMargin < 20 && profitMargin !== 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-600 font-medium">
                      Увага: занизька маржа ({profitMargin.toFixed(1)}%)
                    </p>
                    <p className="text-xs text-amber-600/80 mt-1">
                      Рекомендована маржа: мінімум 20%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab C: Інвойси та оплати */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Invoices & Payments</CardTitle>
                <CardDescription>Керування рахунками та оплатами</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <CreditCard className="mr-2 size-4" />
                  Sync with Bank
                </Button>
                <Button size="sm" onClick={() => setIsInvoiceDialogOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Новий інвойс
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {project.invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="size-12 mx-auto mb-3 opacity-50" />
                  <p>Ще немає інвойсів</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsInvoiceDialogOpen(true)}
                  >
                    <Plus className="mr-2 size-4" />
                    Створити перший інвойс
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {project.invoices.map(invoice => (
                    <div 
                      key={invoice.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {getInvoiceStatusIcon(invoice.status)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{invoice.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            Due: {formatDate(invoice.dueDate)}
                          </span>
                          {invoice.paidDate && (
                            <span className="text-xs text-emerald-600">
                              Paid: {formatDate(invoice.paidDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getInvoiceStatusBadge(invoice.status)}
                        <span className="font-semibold text-lg">{formatCurrency(invoice.amount)}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.status !== "paid" && (
                              <DropdownMenuItem onClick={() => markInvoiceAsPaid(invoice)}>
                                <CheckCircle2 className="mr-2 size-4" />
                                Позначити оплаченим
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditInvoice(invoice)}>
                              <Pencil className="mr-2 size-4" />
                              Редагувати
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setIsDeleteInvoiceOpen(true)
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Видалити
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {project.invoices.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(project.invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">Оплачено</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(project.invoices.filter(i => i.status === "sent").reduce((s, i) => s + i.amount, 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">Очікується</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-muted-foreground">
                        {formatCurrency(project.invoices.filter(i => i.status === "draft").reduce((s, i) => s + i.amount, 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">Чернетки</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedInvoice ? "Редагувати інвойс" : "Новий інвойс"}</DialogTitle>
            <DialogDescription>Заповніть дані рахунку</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Назва</Label>
              <Input 
                placeholder="напр. Передоплата 50%" 
                value={invoiceForm.name}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Сума</Label>
                <Input 
                  type="number" 
                  placeholder="0"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select 
                  value={invoiceForm.status}
                  onValueChange={(v) => setInvoiceForm({ ...invoiceForm, status: v as InvoiceStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Чернетка</SelectItem>
                    <SelectItem value="sent">Відправлено</SelectItem>
                    <SelectItem value="paid">Оплачено</SelectItem>
                    <SelectItem value="overdue">Прострочено</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Дата оплати</Label>
              <Input 
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeInvoiceDialog}>Скасувати</Button>
            <Button onClick={handleSaveInvoice} disabled={!invoiceForm.name || !invoiceForm.amount}>
              {selectedInvoice ? "Зберегти" : "Створити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocation Dialog */}
      <Dialog open={isAllocationDialogOpen} onOpenChange={setIsAllocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAllocation ? "Редагувати залучення" : "Додати члена команди"}</DialogTitle>
            <DialogDescription>Виберіть члена команди та вкажіть відсоток часу</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Член команди</Label>
              <Select 
                value={allocationForm.memberId}
                onValueChange={(v) => setAllocationForm({ ...allocationForm, memberId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть..." />
                </SelectTrigger>
                <SelectContent>
                  {allMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.teamName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Allocation %</Label>
                <span className="text-sm font-medium">{allocationForm.allocation}%</span>
              </div>
              <Slider
                value={[allocationForm.allocation]}
                onValueChange={([v]) => setAllocationForm({ ...allocationForm, allocation: v })}
                max={100}
                min={10}
                step={10}
              />
              <p className="text-xs text-muted-foreground">
                Скільки часу цей спеціаліст витрачатиме на проєкт
              </p>
            </div>
            {allocationForm.memberId && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Орієнтовна вартість:</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    (allMembers.find(m => m.id === allocationForm.memberId)?.baseRate || 0) * 
                    (allocationForm.allocation / 100)
                  )}/міс
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAllocationDialog}>Скасувати</Button>
            <Button onClick={handleSaveAllocation} disabled={!allocationForm.memberId}>
              {selectedAllocation ? "Зберегти" : "Додати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedExpense ? "Редагувати витрату" : "Нова витрата"}</DialogTitle>
            <DialogDescription>Додайте пряму витрату проєкту</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Назва</Label>
              <Input 
                placeholder="напр. AWS Infrastructure"
                value={expenseForm.name}
                onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Сума</Label>
                <Input 
                  type="number"
                  placeholder="0"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Категорія</Label>
                <Select 
                  value={expenseForm.category}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sharedExpenseCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input 
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeExpenseDialog}>Скасувати</Button>
            <Button onClick={handleSaveExpense} disabled={!expenseForm.name || !expenseForm.amount}>
              {selectedExpense ? "Зберегти" : "Додати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmations */}
      <AlertDialog open={isDeleteInvoiceOpen} onOpenChange={setIsDeleteInvoiceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити інвойс?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити інвойс &quot;{selectedInvoice?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvoice} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAllocationOpen} onOpenChange={setIsDeleteAllocationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити з проєкту?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити {selectedAllocation?.memberName} з проєкту?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllocation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteExpenseOpen} onOpenChange={setIsDeleteExpenseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити витрату?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити витрату &quot;{selectedExpense?.name}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
