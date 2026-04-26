"use client"

import { useEffect, useState } from "react"
import { 
  CreditCard,
  Calendar,
  AlertTriangle,
  Check,
  X,
  Download,
  ChevronRight,
  Zap,
  Shield,
  Users,
  HardDrive,
  Clock,
  ArrowRight,
  Sparkles,
  Building2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { workforceApi } from "@/lib/api/workforce"

type PlanType = "starter" | "professional" | "enterprise"
type BillingCycle = "monthly" | "yearly"

interface Plan {
  id: PlanType
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: string[]
  limits: {
    users: number
    projects: number
    storage: number // GB
    apiCalls: number
  }
  popular?: boolean
}

interface Invoice {
  id: string
  date: string
  amount: number
  status: "paid" | "pending" | "failed"
  downloadUrl: string
}

interface PaymentMethod {
  id: string
  type: "card" | "bank"
  last4: string
  brand?: string
  expiry?: string
  isDefault: boolean
}

// Plans data
const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Для невеликих команд та стартапів",
    priceMonthly: 29,
    priceYearly: 290,
    features: [
      "До 5 користувачів",
      "10 активних проектів",
      "5 GB сховища",
      "Email підтримка",
      "Базова аналітика",
    ],
    limits: {
      users: 5,
      projects: 10,
      storage: 5,
      apiCalls: 10000,
    },
  },
  {
    id: "professional",
    name: "Professional",
    description: "Для зростаючих агенцій та компаній",
    priceMonthly: 79,
    priceYearly: 790,
    features: [
      "До 20 користувачів",
      "Необмежені проекти",
      "50 GB сховища",
      "Пріоритетна підтримка",
      "Розширена аналітика",
      "API доступ",
      "Інтеграції",
    ],
    limits: {
      users: 20,
      projects: -1, // unlimited
      storage: 50,
      apiCalls: 100000,
    },
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Для великих організацій з особливими потребами",
    priceMonthly: 199,
    priceYearly: 1990,
    features: [
      "Необмежені користувачі",
      "Необмежені проекти",
      "500 GB сховища",
      "24/7 підтримка",
      "Власний менеджер",
      "SLA гарантії",
      "Кастомні інтеграції",
      "On-premise варіант",
    ],
    limits: {
      users: -1,
      projects: -1,
      storage: 500,
      apiCalls: -1,
    },
  },
]

const defaultSubscription = {
  plan: "professional" as PlanType,
  status: "trialing" as "active" | "cancelled" | "past_due" | "trialing",
  billingCycle: "monthly" as BillingCycle,
  currentPeriodStart: new Date().toISOString().slice(0, 10),
  currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  cancelAtPeriodEnd: false,
  
  // Usage
  usage: {
    users: 0,
    projects: 0,
    storage: 0,
    apiCalls: 0,
  },
}

// Mock payment methods
const mockPaymentMethods: PaymentMethod[] = []

export default function BillingPage() {
  const [subscription, setSubscription] = useState(defaultSubscription)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [paymentMethods, setPaymentMethods] = useState(mockPaymentMethods)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false)
  const [isChangeCycleDialogOpen, setIsChangeCycleDialogOpen] = useState(false)
  
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(subscription.billingCycle)
  
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [subscriptions, apiInvoices] = await Promise.all([
          workforceApi.listSubscriptions(),
          workforceApi.listInvoices(),
        ])
        if (!isMounted) return

        const activeSubscription = subscriptions.find((item) => item.status === "active") ?? subscriptions[0]
        if (activeSubscription) {
          const planFromApi = String(activeSubscription.plan_name || "").toLowerCase()
          const mappedPlan: PlanType = planFromApi.includes("enterprise")
            ? "enterprise"
            : planFromApi.includes("starter")
              ? "starter"
              : "professional"
          setSubscription((prev) => ({
            ...prev,
            plan: mappedPlan,
            status: activeSubscription.status === "pending" ? "trialing" : (activeSubscription.status as typeof prev.status),
            billingCycle: activeSubscription.billing_cycle === "yearly" ? "yearly" : "monthly",
            currentPeriodStart: activeSubscription.start_date,
            currentPeriodEnd: activeSubscription.next_billing_date,
            cancelAtPeriodEnd: activeSubscription.status === "cancelled",
          }))
        }

        setInvoices(
          apiInvoices.map((invoice) => ({
            id: invoice.number,
            date: invoice.issue_date,
            amount: Number.parseFloat(invoice.amount),
            status: invoice.status === "paid" ? "paid" : invoice.status === "overdue" ? "failed" : "pending",
            downloadUrl: "#",
          }))
        )
        setLoadError(null)
      } catch (error) {
        if (!isMounted) return
        setLoadError(error instanceof Error ? error.message : "Unable to load billing data")
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [])

  const currentPlan = plans.find(p => p.id === subscription.plan)!
  
  // Calculate days until subscription ends
  const endDate = new Date(subscription.currentPeriodEnd)
  const today = new Date()
  const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("uk-UA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getUsagePercent = (used: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min((used / limit) * 100, 100)
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "text-red-500"
    if (percent >= 70) return "text-amber-500"
    return "text-green-500"
  }

  const handleUpgradePlan = () => {
    if (selectedPlan) {
      setSubscription(prev => ({ ...prev, plan: selectedPlan }))
      setIsUpgradeDialogOpen(false)
      setSelectedPlan(null)
      showSuccess("План успішно змінено!")
    }
  }

  const handleCancelSubscription = () => {
    setSubscription(prev => ({ ...prev, cancelAtPeriodEnd: true }))
    setIsCancelDialogOpen(false)
    showSuccess("Підписку буде скасовано після закінчення поточного періоду")
  }

  const handleReactivateSubscription = () => {
    setSubscription(prev => ({ ...prev, cancelAtPeriodEnd: false }))
    showSuccess("Підписку поновлено!")
  }

  const handleChangeBillingCycle = () => {
    setSubscription(prev => ({ ...prev, billingCycle: selectedCycle }))
    setIsChangeCycleDialogOpen(false)
    showSuccess("Цикл оплати буде змінено з наступного періоду")
  }

  const handleSetDefaultCard = (cardId: string) => {
    setPaymentMethods(prev => prev.map(pm => ({
      ...pm,
      isDefault: pm.id === cardId,
    })))
    showSuccess("Метод оплати за замовчуванням змінено")
  }

  const handleRemoveCard = (cardId: string) => {
    setPaymentMethods(prev => prev.filter(pm => pm.id !== cardId))
    showSuccess("Картку видалено")
  }

  const showSuccess = (message: string) => {
    setSuccessMessage(message)
    setShowSuccessMessage(true)
    setTimeout(() => setShowSuccessMessage(false), 3000)
  }

  const isExpiringSoon = daysUntilEnd <= 7 && !subscription.cancelAtPeriodEnd

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccessMessage && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="size-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}
      {loadError && (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Оплата та підписка</h1>
        <p className="text-sm text-muted-foreground">Сторінку тимчасово приховано до підключення реальних billing endpoint-ів.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing temporarily unavailable</CardTitle>
          <CardDescription>Mock-state видалено з ключового екрана.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Номер</TableHead>
                <TableHead>Сума</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(invoice => (
                <TableRow key={invoice.id}>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell className="font-mono text-sm">{invoice.id.toUpperCase()}</TableCell>
                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      invoice.status === "paid" ? "default" :
                      invoice.status === "pending" ? "secondary" : "destructive"
                    }>
                      {invoice.status === "paid" ? "Оплачено" :
                       invoice.status === "pending" ? "Очікує" : "Помилка"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Download className="size-4 mr-2" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Немає інвойсів з backend.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
