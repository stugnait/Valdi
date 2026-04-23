"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  Pause,
  XCircle,
  Filter,
  Download,
  Eye,
  FileText,
  ExternalLink,
  RefreshCcw,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
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
import { Separator } from "@/components/ui/separator"
import {
  ClientSubscription,
  SubscriptionStatus,
  getSubscriptionStatusColor,
  getSubscriptionStatusLabel,
  getPaymentStatusColor,
  getPaymentStatusLabel,
  getBillingCycleLabel,
  calculateSubscriptionMetrics,
} from "@/lib/types/projects"
import { ApiClient, ApiProject, ApiSubscription, workforceApi } from "@/lib/api/workforce"

const statusFilters: SubscriptionStatus[] = ["active", "pending", "paused", "cancelled", "expired"]

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<ClientSubscription[]>([])
  const [clients, setClients] = useState<ApiClient[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus[]>(["active", "pending"])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<ClientSubscription | null>(null)
  const [viewSubscription, setViewSubscription] = useState<ClientSubscription | null>(null)
  const [deleteSubscription, setDeleteSubscription] = useState<ClientSubscription | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    clientId: "",
    projectId: "",
    planName: "",
    description: "",
    amount: "",
    currency: "USD" as "USD" | "EUR" | "UAH",
    billingCycle: "monthly" as "monthly" | "quarterly" | "semi-annual" | "yearly",
    startDate: "",
    features: "",
    hoursIncluded: "",
  })

  // Metrics
  const metrics = calculateSubscriptionMetrics(subscriptions)

  // Filtered subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch =
      sub.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(sub.status)
    return matchesSearch && matchesStatus
  })

  const availableProjects = useMemo(
    () => projects.filter((project) => !formData.clientId || project.client.toString() === formData.clientId),
    [projects, formData.clientId]
  )

  const mapApiSubscription = (subscription: ApiSubscription): ClientSubscription => ({
    id: subscription.id.toString(),
    clientId: subscription.client.toString(),
    clientName: subscription.client_name,
    projectId: subscription.project ? subscription.project.toString() : undefined,
    projectName: subscription.project_name || undefined,
    planName: subscription.plan_name,
    description: subscription.description || undefined,
    status: subscription.status,
    amount: Number(subscription.amount || 0),
    currency: subscription.currency,
    billingCycle: subscription.billing_cycle,
    startDate: subscription.start_date,
    nextBillingDate: subscription.next_billing_date,
    endDate: subscription.end_date || undefined,
    features: subscription.features || [],
    hoursIncluded: subscription.hours_included || undefined,
    totalPaid: Number(subscription.total_paid || 0),
    payments: [],
    confirmedAt: subscription.confirmed_at || undefined,
    confirmedBy: subscription.confirmed_by || undefined,
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,
  })

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const [subscriptionsResponse, clientsResponse, projectsResponse] = await Promise.all([
        workforceApi.listSubscriptions(),
        workforceApi.listClients(),
        workforceApi.listProjects(),
      ])
      setSubscriptions(subscriptionsResponse.map(mapApiSubscription))
      setClients(clientsResponse)
      setProjects(projectsResponse)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load subscriptions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const toggleStatusFilter = (status: SubscriptionStatus) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  const resetForm = () => {
    setFormData({
      clientId: "",
      projectId: "",
      planName: "",
      description: "",
      amount: "",
      currency: "USD",
      billingCycle: "monthly",
      startDate: "",
      features: "",
      hoursIncluded: "",
    })
    setEditingSubscription(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (subscription: ClientSubscription) => {
    setFormData({
      clientId: subscription.clientId,
      projectId: subscription.projectId || "",
      planName: subscription.planName,
      description: subscription.description || "",
      amount: subscription.amount.toString(),
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      startDate: subscription.startDate,
      features: subscription.features?.join("\n") || "",
      hoursIncluded: subscription.hoursIncluded?.toString() || "",
    })
    setEditingSubscription(subscription)
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.clientId || !formData.planName || !formData.amount) return
    try {
      setError(null)
      const payload = {
        client: Number(formData.clientId),
        project: formData.projectId ? Number(formData.projectId) : null,
        plan_name: formData.planName,
        description: formData.description,
        status: editingSubscription?.status || "pending",
        amount: formData.amount,
        currency: formData.currency,
        billing_cycle: formData.billingCycle,
        start_date: formData.startDate || new Date().toISOString().split("T")[0],
        next_billing_date: formData.startDate || new Date().toISOString().split("T")[0],
        features: formData.features ? formData.features.split("\n").map((item) => item.trim()).filter(Boolean) : [],
        hours_included: formData.hoursIncluded ? Number(formData.hoursIncluded) : null,
      }

      if (editingSubscription) {
        await workforceApi.updateSubscription(editingSubscription.id, payload)
      } else {
        await workforceApi.createSubscription(payload)
      }

      await loadData()
      setIsAddDialogOpen(false)
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save subscription")
    }
  }

  const handleDelete = async () => {
    if (deleteSubscription) {
      try {
        setError(null)
        await workforceApi.deleteSubscription(deleteSubscription.id)
        await loadData()
        setDeleteSubscription(null)
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete subscription")
      }
    }
  }

  const handleConfirmSubscription = async (subscription: ClientSubscription) => {
    try {
      setError(null)
      await workforceApi.updateSubscription(subscription.id, {
        status: "active",
        confirmed_at: new Date().toISOString().split("T")[0],
        confirmed_by: "Admin",
      })
      await loadData()
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Failed to confirm subscription")
    }
  }

  const handlePauseSubscription = async (subscription: ClientSubscription) => {
    try {
      setError(null)
      await workforceApi.updateSubscription(subscription.id, {
        status: subscription.status === "paused" ? "active" : "paused",
      })
      await loadData()
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : "Failed to update subscription status")
    }
  }

  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
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

  const getStatusIcon = (status: SubscriptionStatus) => {
    switch (status) {
      case "active": return <CheckCircle2 className="size-4 text-emerald-500" />
      case "pending": return <Clock className="size-4 text-amber-500" />
      case "paused": return <Pause className="size-4 text-muted-foreground" />
      case "cancelled": return <XCircle className="size-4 text-destructive" />
      case "expired": return <XCircle className="size-4 text-destructive" />
      default: return null
    }
  }

  // Get upcoming payments (next 30 days)
  const upcomingPayments = subscriptions
    .filter(s => s.status === "active" || s.status === "pending")
    .filter(s => {
      const nextDate = new Date(s.nextBillingDate)
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      return nextDate >= now && nextDate <= thirtyDaysFromNow
    })
    .sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime())

  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading subscriptions...</CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Управління підписками клієнтів та відстеження платежів
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Нова підписка
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.monthlyRecurringRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Щомісячний регулярний дохід
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активні підписки</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              з {metrics.totalSubscriptions} загалом
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всього отримано</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(metrics.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              за весь час
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Очікує оплати</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(metrics.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingPayments} платежів
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Огляд</TabsTrigger>
          <TabsTrigger value="payments">Платежі</TabsTrigger>
          <TabsTrigger value="upcoming">Майбутні</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Пошук за клієнтом або планом..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 size-4" />
                  Статус
                  {statusFilter.length > 0 && (
                    <Badge variant="secondary" className="ml-2 px-1.5">
                      {statusFilter.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Фільтр за статусом</DropdownMenuLabel>
                {statusFilters.map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter.includes(status)}
                    onCheckedChange={() => toggleStatusFilter(status)}
                  >
                    {getSubscriptionStatusLabel(status)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Subscriptions Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Клієнт / План</TableHead>
                  <TableHead>Проект</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Цикл</TableHead>
                  <TableHead className="text-right">Сума</TableHead>
                  <TableHead>Наступний платіж</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((subscription) => (
                  <TableRow
                    key={subscription.id}
                    className="cursor-pointer"
                    onClick={() => setViewSubscription(subscription)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {subscription.clientName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{subscription.clientName}</div>
                          <div className="text-sm text-muted-foreground">{subscription.planName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscription.projectName ? (
                        <Badge variant="outline">{subscription.projectName}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(subscription.status)}
                        <Badge variant={getSubscriptionStatusColor(subscription.status) as "default" | "secondary" | "outline" | "destructive"}>
                          {getSubscriptionStatusLabel(subscription.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getBillingCycleLabel(subscription.billingCycle)}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(subscription.amount, subscription.currency)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(subscription.nextBillingDate)}</span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewSubscription(subscription)}>
                            <Eye className="size-4 mr-2" />
                            Переглянути
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenEdit(subscription)}>
                            <Pencil className="size-4 mr-2" />
                            Редагувати
                          </DropdownMenuItem>
                          {subscription.status === "pending" && (
                            <DropdownMenuItem onClick={() => handleConfirmSubscription(subscription)}>
                              <CheckCircle2 className="size-4 mr-2" />
                              Підтвердити
                            </DropdownMenuItem>
                          )}
                          {(subscription.status === "active" || subscription.status === "paused") && (
                            <DropdownMenuItem onClick={() => handlePauseSubscription(subscription)}>
                              {subscription.status === "paused" ? (
                                <>
                                  <RefreshCcw className="size-4 mr-2" />
                                  Відновити
                                </>
                              ) : (
                                <>
                                  <Pause className="size-4 mr-2" />
                                  Призупинити
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteSubscription(subscription)}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSubscriptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Підписок не знайдено
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Історія платежів</CardTitle>
              <CardDescription>Всі платежі за підписками</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Інвойс</TableHead>
                    <TableHead>Клієнт</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Сума</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions
                    .flatMap(sub => sub.payments.map(p => ({ ...p, clientName: sub.clientName, planName: sub.planName })))
                    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                    .map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-muted-foreground" />
                            <span className="font-medium">{payment.invoiceNumber || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.clientName}</div>
                            <div className="text-sm text-muted-foreground">{payment.planName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentStatusColor(payment.status) as "default" | "secondary" | "outline" | "destructive"}>
                            {getPaymentStatusLabel(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(payment.dueDate)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Майбутні платежі</CardTitle>
              <CardDescription>Платежі протягом наступних 30 днів</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="size-12 mx-auto mb-4 opacity-50" />
                  <p>Немає запланованих платежів на найближчі 30 днів</p>
                </div>
              ) : (
                upcomingPayments.map((subscription) => {
                  const daysUntil = Math.ceil(
                    (new Date(subscription.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <div
                      key={subscription.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setViewSubscription(subscription)}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="size-12">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {subscription.clientName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{subscription.clientName}</div>
                          <div className="text-sm text-muted-foreground">{subscription.planName}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="size-3.5 text-muted-foreground" />
                            <span className="text-sm">{formatDate(subscription.nextBillingDate)}</span>
                            <Badge variant={daysUntil <= 7 ? "destructive" : daysUntil <= 14 ? "secondary" : "outline"} className="text-xs">
                              {daysUntil === 0 ? "Сьогодні" : daysUntil === 1 ? "Завтра" : `Через ${daysUntil} дн.`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(subscription.amount, subscription.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getBillingCycleLabel(subscription.billingCycle)}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Subscription Dialog */}
      <Dialog open={!!viewSubscription} onOpenChange={() => setViewSubscription(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {viewSubscription?.clientName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  {viewSubscription?.clientName}
                  <Badge variant={getSubscriptionStatusColor(viewSubscription?.status || "pending") as "default" | "secondary" | "outline" | "destructive"}>
                    {getSubscriptionStatusLabel(viewSubscription?.status || "pending")}
                  </Badge>
                </div>
                <div className="text-sm font-normal text-muted-foreground">
                  {viewSubscription?.planName}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {viewSubscription && (
            <div className="space-y-6 py-4">
              {/* Subscription Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Сума</span>
                  <div className="text-2xl font-bold">
                    {formatCurrency(viewSubscription.amount, viewSubscription.currency)}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      / {getBillingCycleLabel(viewSubscription.billingCycle).toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Всього сплачено</span>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(viewSubscription.totalPaid, viewSubscription.currency)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Початок: </span>
                    {formatDate(viewSubscription.startDate)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Наступний платіж: </span>
                    {formatDate(viewSubscription.nextBillingDate)}
                  </div>
                </div>
              </div>

              {/* Confirmation Status */}
              {viewSubscription.confirmedAt ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <div>
                    <div className="font-medium text-emerald-700 dark:text-emerald-400">Підтверджено</div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-500">
                      {formatDate(viewSubscription.confirmedAt)} by {viewSubscription.confirmedBy}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg">
                  <AlertCircle className="size-5 text-amber-600" />
                  <div>
                    <div className="font-medium text-amber-700 dark:text-amber-400">Очікує підтвердження</div>
                    <div className="text-sm text-amber-600 dark:text-amber-500">
                      Підписка ще не підтверджена клієнтом
                    </div>
                  </div>
                </div>
              )}

              {/* Project */}
              {viewSubscription.projectName && (
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <FileText className="size-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Проект: </span>
                    <span className="font-medium">{viewSubscription.projectName}</span>
                  </div>
                </div>
              )}

              {/* Features */}
              {viewSubscription.features && viewSubscription.features.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Включено в план:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {viewSubscription.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {viewSubscription.description && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Опис</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {viewSubscription.description}
                  </p>
                </div>
              )}

              {/* Payment History */}
              {viewSubscription.payments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <CreditCard className="size-4" />
                    Історія платежів
                  </h4>
                  <div className="space-y-2">
                    {viewSubscription.payments.slice(0, 5).map(payment => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={getPaymentStatusColor(payment.status) as "default" | "secondary" | "outline" | "destructive"}>
                            {getPaymentStatusLabel(payment.status)}
                          </Badge>
                          <span className="text-sm">{payment.invoiceNumber}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {payment.paymentDate ? formatDate(payment.paymentDate) : `До ${formatDate(payment.dueDate)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contract Link */}
              {viewSubscription.contractUrl && (
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm">Контракт:</span>
                  <a
                    href={viewSubscription.contractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Переглянути
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewSubscription(null)}>
              Закрити
            </Button>
            {viewSubscription?.status === "pending" && (
              <Button
                onClick={() => {
                  if (viewSubscription) {
                    handleConfirmSubscription(viewSubscription)
                    setViewSubscription(null)
                  }
                }}
              >
                <CheckCircle2 className="size-4 mr-2" />
                Підтвердити
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (viewSubscription) {
                  handleOpenEdit(viewSubscription)
                  setViewSubscription(null)
                }
              }}
            >
              <Pencil className="size-4 mr-2" />
              Редагувати
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? "Редагувати підписку" : "Нова підписка"}
            </DialogTitle>
            <DialogDescription>
              {editingSubscription ? "Оновіть інформацію про підписку" : "Створіть нову підписку для клієнта"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Клієнт *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть клієнта" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id.toString()}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project">Проект (опційно)</Label>
                <Select
                  value={formData.projectId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, projectId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть проект" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без проекту</SelectItem>
                    {availableProjects.map(project => (
                      <SelectItem key={project.id} value={project.id.toString()}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="planName">Назва плану *</Label>
              <Input
                id="planName"
                placeholder="напр., Enterprise Support"
                value={formData.planName}
                onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="amount">Сума *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="currency">Валюта</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value: "USD" | "EUR" | "UAH") => setFormData({ ...formData, currency: value })}
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
                <Label htmlFor="billingCycle">Цикл</Label>
                <Select
                  value={formData.billingCycle}
                  onValueChange={(value: "monthly" | "quarterly" | "semi-annual" | "yearly") => setFormData({ ...formData, billingCycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Щомісяця</SelectItem>
                    <SelectItem value="quarterly">Щоквартально</SelectItem>
                    <SelectItem value="semi-annual">Раз на півроку</SelectItem>
                    <SelectItem value="yearly">Щороку</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Дата початку</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hoursIncluded">Години включено</Label>
                <Input
                  id="hoursIncluded"
                  type="number"
                  placeholder="0"
                  value={formData.hoursIncluded}
                  onChange={(e) => setFormData({ ...formData, hoursIncluded: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="features">Особливості (по одній на рядок)</Label>
              <Textarea
                id="features"
                placeholder="Bug fixes&#10;Security updates&#10;Email support"
                rows={4}
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                placeholder="Опис підписки..."
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSave} disabled={!formData.clientId || !formData.planName || !formData.amount}>
              {editingSubscription ? "Зберегти" : "Створити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSubscription} onOpenChange={() => setDeleteSubscription(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити підписку?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити підписку &quot;{deleteSubscription?.planName}&quot; для клієнта {deleteSubscription?.clientName}?
              Ця дія незворотна.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
