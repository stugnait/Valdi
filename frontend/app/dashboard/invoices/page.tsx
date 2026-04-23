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
  ExternalLink
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

interface BankTransaction {
  id: string
  date: string
  amount: number
  currency: string
  description: string
  source: string
}

const mockTransactions: BankTransaction[] = [
  { id: "tx10", date: "2024-06-18", amount: 25500, currency: "USD", description: "Nike Inc - Wire Transfer", source: "wise" },
  { id: "tx11", date: "2024-06-15", amount: 12000, currency: "USD", description: "Spotify AB - Payment", source: "wise" },
  { id: "tx12", date: "2024-06-10", amount: 8500, currency: "USD", description: "CryptoEx Ltd - Deposit", source: "monobank" },
]

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800", icon: Send },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800", icon: AlertCircle },
}

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
  
  const [formData, setFormData] = useState({
    projectId: "",
    amount: "",
    currency: "USD" as "USD" | "EUR" | "UAH",
    dueDate: "",
    description: "",
  })



  const activeProjects = useMemo(() => projects.filter(project => project.status === "active"), [projects])

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

  const handleLinkTransaction = async (transactionId: string) => {
    if (linkingInvoice) {
      const paidDate = new Date().toISOString().split("T")[0]
      await workforceApi.updateInvoice(linkingInvoice.id, {
        status: "paid",
        paid_date: paidDate,
        linked_transaction_id: transactionId,
      })
      setInvoices(prev => prev.map(i => i.id === linkingInvoice.id ? { ...i, status: "paid", paidDate, linkedTransactionId: transactionId } : i))
      setIsLinkDialogOpen(false)
      setLinkingInvoice(null)
    }
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
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage invoices and track accounts receivable
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Create Invoice
        </Button>
      </div>

      {/* Accounts Receivable Widget */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-800">
                <DollarSign className="size-5" />
                <span className="text-sm font-medium">Accounts Receivable</span>
              </div>
              <div className="text-3xl font-bold text-amber-900 mt-2">
                ${totalReceivable.toLocaleString()}
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Money clients owe you
              </p>
            </div>
            <div className="text-right space-y-2">
              {overdueAmount > 0 && (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="size-4" />
                  <span className="text-sm font-medium">${overdueAmount.toLocaleString()} overdue</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-emerald-700">
                <TrendingUp className="size-4" />
                <span className="text-sm">${paidThisMonth.toLocaleString()} received this month</span>
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
                  <span className="text-sm font-medium capitalize">{status}</span>
                  <p className="text-xs text-muted-foreground">${total.toLocaleString()}</p>
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
            placeholder="Search invoices, clients, projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
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
                          Linked
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
                    <div className="text-muted-foreground">Due: {new Date(invoice.dueDate).toLocaleDateString("uk-UA")}</div>
                    {invoice.paidDate && (
                      <div className="text-emerald-600">Paid: {new Date(invoice.paidDate).toLocaleDateString("uk-UA")}</div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="text-right min-w-[100px]">
                    <div className="text-lg font-semibold">
                      ${invoice.amount.toLocaleString()}
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
                          Mark as Sent
                        </DropdownMenuItem>
                      )}
                      {(invoice.status === "sent" || invoice.status === "overdue") && (
                        <>
                          <DropdownMenuItem onClick={() => {
                            setLinkingInvoice(invoice)
                            setIsLinkDialogOpen(true)
                          }}>
                            <Link2 className="size-4 mr-2" />
                            Link Transaction
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(invoice, "paid")}>
                            <CheckCircle2 className="size-4 mr-2" />
                            Mark as Paid
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleOpenEdit(invoice)}>
                        <Pencil className="size-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteInvoice(invoice)}
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

        {filteredInvoices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No invoices found
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingInvoice ? "Edit Invoice" : "Create Invoice"}
            </DialogTitle>
            <DialogDescription>
              {editingInvoice ? "Update invoice details" : "Quick create a new invoice"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select 
                value={formData.projectId} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, projectId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map(project => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name} - {project.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
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
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Milestone 1 payment"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.projectId || !formData.amount || !formData.dueDate}
            >
              {editingInvoice ? "Save Changes" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Transaction Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Transaction</DialogTitle>
            <DialogDescription>
              Select a bank transaction to link with invoice {linkingInvoice?.number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {mockTransactions.map(tx => (
              <div 
                key={tx.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => handleLinkTransaction(tx.id)}
              >
                <div>
                  <div className="font-medium">{tx.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("uk-UA")} - {tx.source}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${tx.amount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{tx.currency}</div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteInvoice} onOpenChange={() => setDeleteInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {deleteInvoice?.number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
