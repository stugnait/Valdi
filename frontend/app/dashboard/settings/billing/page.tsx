"use client"

import { useState } from "react"
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

// Mock current subscription
const mockSubscription = {
  plan: "professional" as PlanType,
  status: "active" as "active" | "cancelled" | "past_due" | "trialing",
  billingCycle: "monthly" as BillingCycle,
  currentPeriodStart: "2024-04-01",
  currentPeriodEnd: "2024-05-01",
  cancelAtPeriodEnd: false,
  
  // Usage
  usage: {
    users: 8,
    projects: 24,
    storage: 18.5, // GB used
    apiCalls: 45000,
  },
}

// Mock invoices
const mockInvoices: Invoice[] = [
  { id: "inv-001", date: "2024-04-01", amount: 79, status: "paid", downloadUrl: "#" },
  { id: "inv-002", date: "2024-03-01", amount: 79, status: "paid", downloadUrl: "#" },
  { id: "inv-003", date: "2024-02-01", amount: 79, status: "paid", downloadUrl: "#" },
  { id: "inv-004", date: "2024-01-01", amount: 79, status: "paid", downloadUrl: "#" },
  { id: "inv-005", date: "2023-12-01", amount: 79, status: "paid", downloadUrl: "#" },
]

// Mock payment methods
const mockPaymentMethods: PaymentMethod[] = [
  { id: "pm-1", type: "card", last4: "4242", brand: "Visa", expiry: "12/26", isDefault: true },
  { id: "pm-2", type: "card", last4: "5555", brand: "Mastercard", expiry: "08/25", isDefault: false },
]

export default function BillingPage() {
  const [subscription, setSubscription] = useState(mockSubscription)
  const [paymentMethods, setPaymentMethods] = useState(mockPaymentMethods)
  
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false)
  const [isChangeCycleDialogOpen, setIsChangeCycleDialogOpen] = useState(false)
  
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(subscription.billingCycle)
  
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

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

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Оплата та підписка</h1>
        <p className="text-sm text-muted-foreground">
          Керуйте вашою підпискою, переглядайте рахунки та методи оплати
        </p>
      </div>

      {/* Subscription Warning */}
      {subscription.cancelAtPeriodEnd && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Підписку скасовано</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Ваша підписка завершиться {formatDate(subscription.currentPeriodEnd)}. 
              Після цього ви втратите доступ до функцій плану {currentPlan.name}.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReactivateSubscription}
              className="ml-4 shrink-0"
            >
              Поновити підписку
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isExpiringSoon && !subscription.cancelAtPeriodEnd && (
        <Alert className="border-amber-200 bg-amber-50">
          <Clock className="size-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Підписка скоро закінчується</AlertTitle>
          <AlertDescription className="text-amber-700">
            Ваша підписка автоматично поновиться через {daysUntilEnd} {daysUntilEnd === 1 ? "день" : daysUntilEnd < 5 ? "дні" : "днів"}.
            Переконайтеся, що ваш метод оплати актуальний.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="size-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {currentPlan.name}
                  <Badge variant={subscription.status === "active" ? "default" : "destructive"}>
                    {subscription.status === "active" ? "Активна" : 
                     subscription.status === "cancelled" ? "Скасована" :
                     subscription.status === "past_due" ? "Прострочена" : "Пробний період"}
                  </Badge>
                </CardTitle>
                <CardDescription>{currentPlan.description}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {formatCurrency(subscription.billingCycle === "monthly" ? currentPlan.priceMonthly : currentPlan.priceYearly)}
              </div>
              <div className="text-sm text-muted-foreground">
                {subscription.billingCycle === "monthly" ? "на місяць" : "на рік"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing Period */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Calendar className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Поточний період</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={daysUntilEnd <= 7 ? "border-amber-500 text-amber-600" : ""}>
                {daysUntilEnd} {daysUntilEnd === 1 ? "день" : daysUntilEnd < 5 ? "дні" : "днів"} залишилось
              </Badge>
            </div>
          </div>

          {/* Usage */}
          <div>
            <h4 className="text-sm font-medium mb-4">Використання ресурсів</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    Користувачі
                  </span>
                  <span className={getUsageColor(getUsagePercent(subscription.usage.users, currentPlan.limits.users))}>
                    {subscription.usage.users} / {currentPlan.limits.users === -1 ? "∞" : currentPlan.limits.users}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercent(subscription.usage.users, currentPlan.limits.users)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    Проекти
                  </span>
                  <span className={getUsageColor(getUsagePercent(subscription.usage.projects, currentPlan.limits.projects))}>
                    {subscription.usage.projects} / {currentPlan.limits.projects === -1 ? "∞" : currentPlan.limits.projects}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercent(subscription.usage.projects, currentPlan.limits.projects)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <HardDrive className="size-4 text-muted-foreground" />
                    Сховище
                  </span>
                  <span className={getUsageColor(getUsagePercent(subscription.usage.storage, currentPlan.limits.storage))}>
                    {subscription.usage.storage} GB / {currentPlan.limits.storage} GB
                  </span>
                </div>
                <Progress 
                  value={getUsagePercent(subscription.usage.storage, currentPlan.limits.storage)} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Zap className="size-4 text-muted-foreground" />
                    API запити
                  </span>
                  <span className={getUsageColor(getUsagePercent(subscription.usage.apiCalls, currentPlan.limits.apiCalls))}>
                    {(subscription.usage.apiCalls / 1000).toFixed(0)}k / {currentPlan.limits.apiCalls === -1 ? "∞" : `${(currentPlan.limits.apiCalls / 1000).toFixed(0)}k`}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercent(subscription.usage.apiCalls, currentPlan.limits.apiCalls)} 
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          <Button onClick={() => setIsUpgradeDialogOpen(true)}>
            <Sparkles className="size-4 mr-2" />
            Змінити план
          </Button>
          <Button variant="outline" onClick={() => setIsChangeCycleDialogOpen(true)}>
            Змінити цикл оплати
          </Button>
          {!subscription.cancelAtPeriodEnd && (
            <Button 
              variant="ghost" 
              className="text-destructive hover:text-destructive"
              onClick={() => setIsCancelDialogOpen(true)}
            >
              Скасувати підписку
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                Методи оплати
              </CardTitle>
              <CardDescription>
                Керуйте вашими картками та банківськими рахунками
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddCardDialogOpen(true)}>
              Додати картку
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentMethods.map(method => (
              <div 
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {method.brand} •••• {method.last4}
                      </span>
                      {method.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          За замовчуванням
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Дійсна до {method.expiry}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSetDefaultCard(method.id)}
                    >
                      Зробити основною
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveCard(method.id)}
                    disabled={method.isDefault && paymentMethods.length > 1}
                  >
                    Видалити
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Історія платежів
          </CardTitle>
          <CardDescription>
            Перегляньте та завантажте ваші рахунки
          </CardDescription>
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
              {mockInvoices.map(invoice => (
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upgrade/Change Plan Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Обрати план</DialogTitle>
            <DialogDescription>
              Оберіть план, який найкраще відповідає вашим потребам
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 md:grid-cols-3 py-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`relative flex flex-col p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedPlan === plan.id 
                    ? "border-primary ring-2 ring-primary/20" 
                    : "hover:border-muted-foreground/50"
                } ${plan.id === subscription.plan ? "bg-muted/50" : ""}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Популярний
                  </Badge>
                )}
                {plan.id === subscription.plan && (
                  <Badge variant="outline" className="absolute -top-2 right-2">
                    Поточний
                  </Badge>
                )}
                
                <div className="mb-4">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
                
                <div className="mb-4">
                  <span className="text-2xl font-bold">
                    ${selectedCycle === "monthly" ? plan.priceMonthly : plan.priceYearly}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{selectedCycle === "monthly" ? "міс" : "рік"}
                  </span>
                </div>
                
                <ul className="space-y-2 text-sm flex-1">
                  {plan.features.slice(0, 5).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="size-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {selectedPlan === plan.id && (
                  <div className="absolute top-2 right-2">
                    <Check className="size-5 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Цикл оплати:</span>
            <RadioGroup
              value={selectedCycle}
              onValueChange={(v) => setSelectedCycle(v as BillingCycle)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly">Щомісяця</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="yearly" />
                <Label htmlFor="yearly" className="flex items-center gap-2">
                  Щороку
                  <Badge variant="secondary" className="text-xs">-17%</Badge>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpgradeDialogOpen(false)}>
              Скасувати
            </Button>
            <Button 
              onClick={handleUpgradePlan}
              disabled={!selectedPlan || selectedPlan === subscription.plan}
            >
              {selectedPlan && plans.find(p => p.id === selectedPlan)!.priceMonthly > currentPlan.priceMonthly
                ? "Оновити план"
                : "Змінити план"}
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Скасувати підписку?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Ви впевнені, що хочете скасувати підписку? Ви збережете доступ до функцій 
                плану {currentPlan.name} до {formatDate(subscription.currentPeriodEnd)}.
              </p>
              <p className="font-medium text-foreground">
                Після цієї дати ви втратите:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {currentPlan.features.slice(0, 4).map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Залишитися</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Скасувати підписку
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Billing Cycle Dialog */}
      <Dialog open={isChangeCycleDialogOpen} onOpenChange={setIsChangeCycleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Змінити цикл оплати</DialogTitle>
            <DialogDescription>
              Оберіть новий цикл оплати для вашої підписки
            </DialogDescription>
          </DialogHeader>
          
          <RadioGroup
            value={selectedCycle}
            onValueChange={(v) => setSelectedCycle(v as BillingCycle)}
            className="space-y-4 py-4"
          >
            <div className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
              selectedCycle === "monthly" ? "border-primary bg-primary/5" : ""
            }`}>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="monthly" id="cycle-monthly" />
                <div>
                  <Label htmlFor="cycle-monthly" className="font-medium">Щомісячна оплата</Label>
                  <p className="text-sm text-muted-foreground">
                    Оплачуйте кожен місяць, скасуйте будь-коли
                  </p>
                </div>
              </div>
              <span className="font-semibold">${currentPlan.priceMonthly}/міс</span>
            </div>
            
            <div className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${
              selectedCycle === "yearly" ? "border-primary bg-primary/5" : ""
            }`}>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="yearly" id="cycle-yearly" />
                <div>
                  <Label htmlFor="cycle-yearly" className="font-medium flex items-center gap-2">
                    Річна оплата
                    <Badge variant="secondary">Економія 17%</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Оплачуйте раз на рік та заощаджуйте
                  </p>
                </div>
              </div>
              <span className="font-semibold">${currentPlan.priceYearly}/рік</span>
            </div>
          </RadioGroup>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeCycleDialogOpen(false)}>
              Скасувати
            </Button>
            <Button 
              onClick={handleChangeBillingCycle}
              disabled={selectedCycle === subscription.billingCycle}
            >
              Підтвердити зміну
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Card Dialog */}
      <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Додати картку</DialogTitle>
            <DialogDescription>
              Введіть дані вашої банківської картки
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="card-number">Номер картки</Label>
              <Input id="card-number" placeholder="1234 5678 9012 3456" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Термін дії</Label>
                <Input id="expiry" placeholder="MM/YY" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" placeholder="123" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Ім&apos;я на картці</Label>
              <Input id="name" placeholder="John Doe" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={() => {
              setIsAddCardDialogOpen(false)
              showSuccess("Картку успішно додано")
            }}>
              Додати картку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
