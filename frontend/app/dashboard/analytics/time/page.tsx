"use client"

import { useState, useMemo, useEffect } from "react"
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Info,
  Play,
  RotateCcw,
  Calendar,
  DollarSign,
  ArrowRight,
  Zap
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { workforceApi } from "@/lib/api/workforce"

const formatUsd = (value: number) =>
  new Intl.NumberFormat("uk-UA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

const toNumber = (value: string | number | null | undefined) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

type BaseFinancials = {
  totalLaborCost: number
  monthlyRecurring: number
  expectedMonthlyRevenue: number
  leadMonthlyRevenue: number
  pendingInvoices: Array<{
    id: number
    name: string
    dueDate: string
    amount: number
    status: "sent" | "draft"
  }>
  currentCash: number
}

// Base financial data calculation
function useBaseFinancials() {
  const [baseData, setBaseData] = useState<BaseFinancials | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setIsLoading(true)
        const [overview, projects, invoices, recurring] = await Promise.all([
          workforceApi.getAnalyticsOverview(),
          workforceApi.listProjects(),
          workforceApi.listInvoices(),
          workforceApi.listRecurringExpenses(),
        ])
        if (!isMounted) return

        const expectedMonthlyRevenue = projects
          .filter((project) => project.status === "active")
          .reduce((sum, project) => {
            if (project.billing_model === "time-materials") {
              return sum + toNumber(project.client_hourly_rate) * (project.monthly_cap ?? 160)
            }
            return sum + toNumber(project.total_contract_value)
          }, 0)

        const leadMonthlyRevenue = projects
          .filter((project) => project.status === "lead")
          .reduce((sum, project) => sum + toNumber(project.total_contract_value) / 6, 0)

        const monthlyRecurring = recurring.reduce((sum, expense) => {
          const amount = toNumber(expense.amount)
          if (expense.cycle === "monthly") return sum + amount
          if (expense.cycle === "quarterly") return sum + amount / 3
          if (expense.cycle === "yearly") return sum + amount / 12
          return sum
        }, 0)

        const pendingInvoices = invoices
          .filter((invoice) => invoice.status === "sent" || invoice.status === "draft")
          .map((invoice) => ({
            id: invoice.id,
            name: invoice.number || invoice.project_name,
            dueDate: invoice.due_date,
            amount: toNumber(invoice.amount),
            status: invoice.status as "sent" | "draft",
          }))

        setBaseData({
          totalLaborCost: overview.health.total_labor_cost,
          monthlyRecurring,
          expectedMonthlyRevenue,
          leadMonthlyRevenue,
          pendingInvoices,
          currentCash: overview.health.current_cash,
        })
        setError(null)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "Не вдалося завантажити дані прогнозу")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [])

  return { baseData, isLoading, error }
}

// Generate 60-day forward forecast
function useForecastData(
  baseData: BaseFinancials | null,
  salaryAdjustment: number,
  newHires: number,
  includeLeads: boolean
) {
  return useMemo(() => {
    if (!baseData) {
      return {
        data: [] as Array<{
          day: number
          date: string
          fullDate: string
          income: number
          expense: number
          balance: number
          isToday: boolean
          isFuture: boolean
          hasInvoice: boolean
          invoiceName?: string
        }>,
        minBalance: 0,
        daysUntilZero: null as number | null,
        riskZoneStart: null as number | null,
        projectedEndBalance: 0,
      }
    }

    const today = new Date()
    const data: Array<Record<string, number | string | boolean>> = []
    let runningBalance = baseData.currentCash

    const adjustedLaborCost = baseData.totalLaborCost * (1 + salaryAdjustment / 100)
    const newHireCost = newHires * 4000
    const totalMonthlyCost = adjustedLaborCost + baseData.monthlyRecurring + newHireCost
    const dailyCost = totalMonthlyCost / 30

    // Expected daily revenue
    const baseMonthlyRevenue = baseData.expectedMonthlyRevenue
    const leadRevenue = includeLeads ? baseData.leadMonthlyRevenue : 0
    const totalExpectedMonthly = baseMonthlyRevenue + leadRevenue
    const dailyRevenue = totalExpectedMonthly / 30

    for (let i = 0; i < 60; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)

      const invoiceDue = baseData.pendingInvoices.find((invoice) => {
        const dueDate = new Date(invoice.dueDate)
        return dueDate.toDateString() === date.toDateString()
      })

      const income = invoiceDue ? invoiceDue.amount : i % 7 === 0 ? dailyRevenue * 7 : 0
      const expense = dailyCost
      runningBalance = runningBalance + income - expense

      data.push({
        day: i,
        date: date.toLocaleDateString("uk-UA", { month: "short", day: "numeric" }),
        income,
        expense,
        balance: Math.round(runningBalance),
        hasInvoice: Boolean(invoiceDue),
        invoiceName: invoiceDue?.name ?? "",
      })
    }

    const balances = data.map((item) => Number(item.balance))
    const minBalance = Math.min(...balances)
    const daysUntilZero = balances.findIndex((balance) => balance <= 0)
    const riskZoneStart = balances.findIndex((balance) => balance < baseData.currentCash * 0.3)

    return {
      data,
      minBalance,
      daysUntilZero: daysUntilZero === -1 ? null : daysUntilZero,
      riskZoneStart: riskZoneStart === -1 ? null : riskZoneStart,
      projectedEndBalance: Number(data[data.length - 1]?.balance ?? 0),
    }
  }, [baseData, salaryAdjustment, newHires, includeLeads])
}

// Gap Probability Calculator
function GapProbabilityCard({ forecast }: { forecast: ReturnType<typeof useForecastData> }) {
  const probability = useMemo(() => {
    if (forecast.daysUntilZero !== null) return 95
    if (forecast.minBalance < 10000) return 75
    if (forecast.minBalance < 20000) return 50
    if (forecast.riskZoneStart !== null && forecast.riskZoneStart < 30) return 35
    return 10
  }, [forecast])

  const riskLevel = probability > 70 ? "high" : probability > 40 ? "medium" : "low"
  
  return (
    <Card className={`border-2 ${
      riskLevel === "high" ? "border-red-500/50 bg-red-500/5" :
      riskLevel === "medium" ? "border-amber-500/50 bg-amber-500/5" :
      "border-emerald-500/50 bg-emerald-500/5"
    }`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className={`h-5 w-5 ${
            riskLevel === "high" ? "text-red-500" :
            riskLevel === "medium" ? "text-amber-500" :
            "text-emerald-500"
          }`} />
          Ймовірність касового розриву
        </CardTitle>
        <CardDescription>Імовірність порушення грошового потоку</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className={`text-5xl font-bold ${
            riskLevel === "high" ? "text-red-500" :
            riskLevel === "medium" ? "text-amber-500" :
            "text-emerald-500"
          }`}>
            {probability}%
          </div>
          <div className="text-sm text-muted-foreground pb-2">
            {riskLevel === "high" ? "Потрібні дії вже зараз" :
             riskLevel === "medium" ? "Пильний моніторинг" :
             "Ситуація стабільна"}
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          {forecast.daysUntilZero !== null && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Баланс стане нульовим через {forecast.daysUntilZero} дн.
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Мінімальний баланс: {formatUsd(forecast.minBalance)}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Прогноз на 60 днів: {formatUsd(forecast.projectedEndBalance)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// What-If Simulator
function WhatIfSimulator({
  salaryAdjustment,
  setSalaryAdjustment,
  newHires,
  setNewHires,
  includeLeads,
  setIncludeLeads,
  totalLaborCost,
  leadMonthlyRevenue,
  onReset,
}: {
  salaryAdjustment: number
  setSalaryAdjustment: (v: number) => void
  newHires: number
  setNewHires: (v: number) => void
  includeLeads: boolean
  setIncludeLeads: (v: boolean) => void
  totalLaborCost: number
  leadMonthlyRevenue: number
  onReset: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Симулятор сценаріїв
            </CardTitle>
            <CardDescription>Змінюйте параметри, щоб побачити вплив на грошовий потік</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Скинути
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Salary Adjustment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Коригування зарплат
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Що буде, якщо підвищити/знизити зарплати на X%?</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Badge variant={salaryAdjustment > 0 ? "destructive" : salaryAdjustment < 0 ? "default" : "secondary"}>
              {salaryAdjustment > 0 ? "+" : ""}{salaryAdjustment}%
            </Badge>
          </div>
          <Slider
            value={[salaryAdjustment]}
            onValueChange={([v]) => setSalaryAdjustment(v)}
            min={-30}
            max={50}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-30% зниження</span>
            <span>Без змін</span>
            <span>+50% підвищення</span>
          </div>
        </div>

        {/* New Hires */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Нові найми
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Кожен найм додає ~4&nbsp;000 $/міс до витрат</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Badge variant={newHires > 0 ? "secondary" : "outline"}>
              +{newHires} осіб
            </Badge>
          </div>
          <Slider
            value={[newHires]}
            onValueChange={([v]) => setNewHires(v)}
            min={0}
            max={10}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Без наймів</span>
            <span>+5</span>
            <span>+10 осіб</span>
          </div>
        </div>

        {/* Include Leads */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label className="font-medium">Враховувати lead-проєкти</Label>
            <p className="text-xs text-muted-foreground">
              Додавати потенційний дохід із лідів
            </p>
          </div>
          <Switch
            checked={includeLeads}
            onCheckedChange={setIncludeLeads}
          />
        </div>

        {/* Impact Summary */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <div className="text-sm font-medium mb-2">Підсумок впливу</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Зміна зарплат:</span>
              <span className={salaryAdjustment > 0 ? "text-red-500" : salaryAdjustment < 0 ? "text-emerald-500" : ""}>
                {salaryAdjustment > 0 ? "+" : ""}{formatUsd(Math.round(
                  totalLaborCost * (salaryAdjustment / 100)
                ))}/міс
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Вартість нових наймів:</span>
              <span className={newHires > 0 ? "text-red-500" : ""}>
                +{formatUsd(newHires * 4000)}/міс
              </span>
            </div>
            {includeLeads && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Дохід із лідів:</span>
                <span className="text-emerald-500">
                  +{formatUsd(Math.round(leadMonthlyRevenue))}/міс
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function TimeMachinePage() {
  const { baseData, isLoading, error } = useBaseFinancials()
  
  // What-If parameters
  const [salaryAdjustment, setSalaryAdjustment] = useState(0)
  const [newHires, setNewHires] = useState(0)
  const [includeLeads, setIncludeLeads] = useState(false)
  const forecast = useForecastData(baseData, salaryAdjustment, newHires, includeLeads)

  const resetSimulation = () => {
    setSalaryAdjustment(0)
    setNewHires(0)
    setIncludeLeads(false)
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Машина часу</h1>
              <p className="text-muted-foreground">60-денний прогноз на основі даних бекенда</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1"><Play className="h-3 w-3" />API-симуляція</Badge>
        </div>
        {isLoading && (
          <Alert>
            <AlertDescription>Завантаження даних прогнозу з API...</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Прогноз грошового потоку
                  <Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>На основі API ендпоінтів аналітики, проєктів, інвойсів і витрат.</TooltipContent></Tooltip>
                </CardTitle>
                <CardDescription>Прогнозований баланс на наступні 60 днів</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ balance: { label: "Баланс", color: "#3B82F6" } }} className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }}
                        interval={9}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `${new Intl.NumberFormat("uk-UA").format(value / 1000)} тис. $`}
                        className="text-muted-foreground"
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const data = payload[0].payload
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-md">
                              <div className="font-medium">{data.date}</div>
                              <div className="mt-1 space-y-1 text-sm">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Баланс:</span>
                                  <span className="font-mono">{formatUsd(data.balance)}</span>
                                </div>
                                {data.hasInvoice && (
                                  <div className="flex justify-between gap-4 text-emerald-600">
                                    <span>Інвойс:</span>
                                    <span className="font-mono">+{formatUsd(data.income)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }}
                      />
                      
                      {/* Risk zone background */}
                      {forecast.riskZoneStart !== null && baseData && (
                        <ReferenceLine
                          y={baseData.currentCash * 0.3}
                          stroke="#EF4444"
                          strokeDasharray="5 5"
                          label={{ value: "Зона ризику", position: "right", fontSize: 10, fill: "#EF4444" }}
                        />
                      )}
                      
                      {/* Zero line */}
                      <ReferenceLine y={0} stroke="#EF4444" strokeWidth={2} />
                      
                      {/* Today marker */}
                      <ReferenceLine x={forecast.data[0]?.date} stroke="#6366F1" strokeDasharray="3 3" />
                      
                      {/* Balance area */}
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        fill="url(#balanceGradient)"
                        dot={(props) => {
                          const { cx, cy, payload } = props
                          if (payload?.hasInvoice) {
                            return (
                              <circle 
                                key={`dot-${payload.day}`}
                                cx={cx} 
                                cy={cy} 
                                r={6} 
                                fill="#10B981" 
                                stroke="white"
                                strokeWidth={2}
                              />
                            )
                          }
                          return <circle key={`empty-${payload?.day}`} r={0} />
                        }}
                      />
                      
                      <defs>
                        <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Очікуваний дохід</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(baseData?.pendingInvoices ?? []).slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between text-sm">
                    <span>{invoice.name}</span>
                    <span className="font-mono text-emerald-600">+{formatUsd(invoice.amount)}</span>
                  </div>
                ))}
                {(baseData?.pendingInvoices.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Немає інвойсів в очікуванні.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <GapProbabilityCard forecast={forecast} />
            
            <WhatIfSimulator
              salaryAdjustment={salaryAdjustment}
              setSalaryAdjustment={setSalaryAdjustment}
              newHires={newHires}
              setNewHires={setNewHires}
              includeLeads={includeLeads}
              setIncludeLeads={setIncludeLeads}
              totalLaborCost={baseData?.totalLaborCost ?? 0}
              leadMonthlyRevenue={baseData?.leadMonthlyRevenue ?? 0}
              onReset={resetSimulation}
            />

          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
