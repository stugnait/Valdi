"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  Plus, 
  Search, 
  FileText,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Link2,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Filter,
  Calendar,
  Building2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { ApiProject, workforceApi } from "@/lib/api/workforce"

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue"

interface Invoice {
  id: string
  number: string
  projectId: string
  projectName: string
  clientId: string
  clientName: string
  amount: number
  currency: "USD" | "EUR" | "UAH"
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  paidDate?: string
  description?: string
  linkedTransactionId?: string
}


const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Чернетка", color: "bg-gray-100 text-gray-800", icon: FileText },
  sent: { label: "Надіслано", color: "bg-blue-100 text-blue-800", icon: Send },
  paid: { label: "Оплачено", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  overdue: { label: "Прострочено", color: "bg-red-100 text-red-800", icon: AlertCircle },
}

const statusFilterLabels: Record<InvoiceStatus | "all", string> = {
  all: "Усі статуси",
  draft: "Чернетка",
  sent: "Надіслано",
  overdue: "Прострочено",
  paid: "Оплачено",
}

const formatCurrency = (amount: number, currency: "USD" | "EUR" | "UAH") =>
  new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount)

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [deleteInvoice, setDeleteInvoice] = useState<Invoice | null>(null)
  const [linkingInvoice, setLinkingInvoice] = useState<Invoice | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [paymentConfirmation, setPaymentConfirmation] = useState({
    paidDate: "",
    amount: "",
    reference: "",
  })
  
  const [formData, setFormData] = useState({
    projectId: "",
    amount: "",
    currency: "USD" as "USD" | "EUR" | "UAH",
    dueDate: "",
    description: "",
  })

  const invoiceableProjects = useMemo(() => projects, [projects])

  useEffect(() => {
    const load = async () => {
      try {
        const [invoicesResponse, projectsResponse] = await Promise.all([
          workforceApi.listInvoices(),
          workforceApi.listProjects(),
        ])
        setProjects(projectsResponse)
        setInvoices(
          invoicesResponse.map(invoice => ({
            id: String(invoice.id),
            number: invoice.number,
            projectId: String(invoice.project),
            projectName: invoice.project_name,
            clientId: String(invoice.client),
            clientName: invoice.client_name,
            amount: Number(invoice.amount),
            currency: invoice.currency,
            status: invoice.status,
            issueDate: invoice.issue_date,
            dueDate: invoice.due_date,
            paidDate: invoice.paid_date ?? undefined,
            description: invoice.description || undefined,
            linkedTransactionId: invoice.linked_transaction_id || undefined,
          }))
        )
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])
  // Stats
  const totalReceivable = invoices
    .filter(i => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0)
  const overdueAmount = invoices
    .filter(i => i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0)
  const paidThisMonth = invoices
    .filter(i => i.status === "paid" && i.paidDate?.startsWith("2024-06"))
    .reduce((sum, i) => sum + i.amount, 0)

  // Filtered invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.projectName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Group by status for kanban view
  const invoicesByStatus = {
    draft: filteredInvoices.filter(i => i.status === "draft"),
    sent: filteredInvoices.filter(i => i.status === "sent"),
    overdue: filteredInvoices.filter(i => i.status === "overdue"),
    paid: filteredInvoices.filter(i => i.status === "paid"),
  }

  const resetForm = () => {
    setFormData({
      projectId: "",
      amount: "",
      currency: "USD",
      dueDate: "",
      description: "",
    })
    setEditingInvoice(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (invoice: Invoice) => {
    setFormData({
      projectId: invoice.projectId,
      amount: invoice.amount.toString(),
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      description: invoice.description || "",
    })
    setEditingInvoice(invoice)
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.projectId || !formData.amount || !formData.dueDate) return

    const project = projects.find(p => String(p.id) === formData.projectId)
    if (!project) return

    if (editingInvoice) {
      await workforceApi.updateInvoice(editingInvoice.id, {
        project: Number(formData.projectId),
        client: project.client,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        due_date: formData.dueDate,
        description: formData.description,
      })
    } else {
      await workforceApi.createInvoice({
        number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, "0")}`,
        project: Number(formData.projectId),
        client: project.client,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        status: "draft",
        issue_date: new Date().toISOString().split("T")[0],
        due_date: formData.dueDate,
        description: formData.description,
      })
    }

    const refreshed = await workforceApi.listInvoices()
    setInvoices(refreshed.map(invoice => ({
      id: String(invoice.id),
      number: invoice.number,
      projectId: String(invoice.project),
      projectName: invoice.project_name,
      clientId: String(invoice.client),
      clientName: invoice.client_name,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      paidDate: invoice.paid_date ?? undefined,
      description: invoice.description || undefined,
      linkedTransactionId: invoice.linked_transaction_id || undefined,
    })))

    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleDelete = async () => {
    if (deleteInvoice) {
      await workforceApi.deleteInvoice(deleteInvoice.id)
      setInvoices(prev => prev.filter(i => i.id !== deleteInvoice.id))
      setDeleteInvoice(null)
    }
  }

  const handleStatusChange = async (invoice: Invoice, newStatus: InvoiceStatus) => {
    const paidDate = newStatus === "paid" ? new Date().toISOString().split("T")[0] : null
    await workforceApi.updateInvoice(invoice.id, { status: newStatus, paid_date: paidDate })
    setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: newStatus, paidDate: paidDate ?? undefined } : i))
  }


  const handleOpenPaymentConfirmation = (invoice: Invoice) => {
    setLinkingInvoice(invoice)
    setPaymentConfirmation({
      paidDate: new Date().toISOString().split("T")[0],
      amount: invoice.amount.toString(),
      reference: "",
    })
    setIsLinkDialogOpen(true)
  }

  const handleLinkTransaction = async () => {
    if (!linkingInvoice) return

    const confirmedAmount = Number(paymentConfirmation.amount)
    if (!paymentConfirmation.paidDate || Number.isNaN(confirmedAmount) || confirmedAmount <= 0) return

    await workforceApi.updateInvoice(linkingInvoice.id, {
      status: "paid",
      paid_date: paymentConfirmation.paidDate,
      linked_transaction_id: paymentConfirmation.reference || undefined,
    })

    setInvoices(prev =>
      prev.map(i =>
        i.id === linkingInvoice.id
          ? {
              ...i,
              status: "paid",
              paidDate: paymentConfirmation.paidDate,
              linkedTransactionId: paymentConfirmation.reference || undefined,
            }
          : i
      )
    )

    setIsLinkDialogOpen(false)
    setLinkingInvoice(null)
    setPaymentConfirmation({ paidDate: "", amount: "", reference: "" })
  }

  const getStatusIcon = (status: InvoiceStatus) => {
    const Icon = statusConfig[status].icon
    return <Icon className="size-3" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Інвойси</h1>
          <p className="text-sm text-muted-foreground">
            Керуйте інвойсами та відстежуйте дебіторську заборгованість
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Створити інвойс
        </Button>
      </div>

      {/* Accounts Receivable Widget */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-800">
                <DollarSign className="size-5" />
                <span className="text-sm font-medium">Дебіторська заборгованість</span>
              </div>
              <div className="text-3xl font-bold text-amber-900 mt-2">
                {formatCurrency(totalReceivable, "USD")}
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Сума, яку клієнти вам винні
              </p>
            </div>
            <div className="text-right space-y-2">
              {overdueAmount > 0 && (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="size-4" />
                  <span className="text-sm font-medium">{formatCurrency(overdueAmount, "USD")} прострочено</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-emerald-700">
                <TrendingUp className="size-4" />
                <span className="text-sm">{formatCurrency(paidThisMonth, "USD")} отримано цього місяця</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {(["draft", "sent", "overdue", "paid"] as InvoiceStatus[]).map(status => {
          const count = invoicesByStatus[status].length
          const total = invoicesByStatus[status].reduce((sum, i) => sum + i.amount, 0)
          const config = statusConfig[status]
          const Icon = config.icon
          
          return (
            <Card key={status} className="cursor-pointer hover:border-primary/50" onClick={() => setStatusFilter(status)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="size-4" />
                  </div>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-medium">{statusFilterLabels[status]}</span>
                  <p className="text-xs text-muted-foreground">{formatCurrency(total, "USD")}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук інвойсів, клієнтів, проєктів..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Усі статуси</SelectItem>
            <SelectItem value="draft">Чернетка</SelectItem>
            <SelectItem value="sent">Надіслано</SelectItem>
            <SelectItem value="overdue">Прострочено</SelectItem>
            <SelectItem value="paid">Оплачено</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice List */}
      <div className="space-y-3">
        {filteredInvoices.map(invoice => {
          const config = statusConfig[invoice.status]
          
          return (
            <Card key={invoice.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    {getStatusIcon(invoice.status)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invoice.number}</span>
                      <Badge className={config.color}>
                        {config.label}
                      </Badge>
                      {invoice.linkedTransactionId && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Link2 className="size-3" />
                          Прив’язано
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {invoice.clientName}
                      </span>
                      <span>{invoice.projectName}</span>
                      {invoice.description && (
                        <span className="truncate max-w-[200px]">{invoice.description}</span>
                      )}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="hidden md:block text-right text-sm">
                    <div className="text-muted-foreground">До: {new Date(invoice.dueDate).toLocaleDateString("uk-UA")}</div>
                    {invoice.paidDate && (
                      <div className="text-emerald-600">Оплачено: {new Date(invoice.paidDate).toLocaleDateString("uk-UA")}</div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right min-w-[100px]">
                    <div className="text-lg font-semibold">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">{invoice.currency}</div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {invoice.status === "draft" && (
                        <DropdownMenuItem onClick={() => handleStatusChange(invoice, "sent")}>
                          <Send className="size-4 mr-2" />
                          Позначити як надісланий
                        </DropdownMenuItem>
                      )}
                      {(invoice.status === "sent" || invoice.status === "overdue") && (
                        <>
                          <DropdownMenuItem onClick={() => handleOpenPaymentConfirmation(invoice)}>
                            <CheckCircle2 className="size-4 mr-2" />
                            Підтвердити оплату
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleOpenEdit(invoice)}>
                        <Pencil className="size-4 mr-2" />
                        Редагувати
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteInvoice(invoice)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        Видалити
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filteredInvoices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Інвойсів не знайдено
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? "Редагувати інвойс" : "Створити інвойс"}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice ? "Оновіть дані інвойсу" : "Швидко створіть новий інвойс"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Проєкт</Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, projectId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть проєкт" />
                </SelectTrigger>
                <SelectContent>
                  {invoiceableProjects.map(project => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name} - {project.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Сума</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Валюта</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v as "USD" | "EUR" | "UAH" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (&euro;)</SelectItem>
                    <SelectItem value="UAH">UAH (&#8372;)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Дата оплати</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Опис (необов’язково)</Label>
              <Input
                id="description"
                placeholder="напр., Оплата етапу 1"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Скасувати
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.projectId || !formData.amount || !formData.dueDate}
            >
              {editingInvoice ? "Зберегти зміни" : "Створити інвойс"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Transaction Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підтвердження оплати інвойсу</DialogTitle>
            <DialogDescription>
              Вкажіть дані оплати для інвойсу {linkingInvoice?.number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Дата оплати</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentConfirmation.paidDate}
                onChange={(e) =>
                  setPaymentConfirmation((prev) => ({ ...prev, paidDate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Оплачена сума</Label>
              <Input
                id="paymentAmount"
                type="number"
                min="0"
                step="0.01"
                value={paymentConfirmation.amount}
                onChange={(e) =>
                  setPaymentConfirmation((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentReference">Референс платежу</Label>
              <Input
                id="paymentReference"
                placeholder="напр., WIRE-2026-000123"
                value={paymentConfirmation.reference}
                onChange={(e) =>
                  setPaymentConfirmation((prev) => ({ ...prev, reference: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Скасувати
            </Button>
            <Button
              onClick={handleLinkTransaction}
              disabled={!paymentConfirmation.paidDate || !paymentConfirmation.amount || !paymentConfirmation.reference}
            >
              Підтвердити оплату
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteInvoice} onOpenChange={() => setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити інвойс</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити інвойс {deleteInvoice?.number}? Цю дію неможливо скасувати.
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
