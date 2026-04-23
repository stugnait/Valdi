"use client"

import { useState, useMemo } from "react"
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
import { mockTeams } from "@/lib/types/teams"
import { mockProjects } from "@/lib/types/projects"
import { mockRecurringExpenses } from "@/lib/types/spendings"

// Base financial data calculation
function useBaseFinancials() {
  return useMemo(() => {
    const totalLaborCost = mockTeams.reduce((sum, team) => 
      sum + team.members.reduce((s, m) => s + m.baseRate, 0), 0
    )
    
    const monthlyRecurring = mockRecurringExpenses.reduce((sum, e) => {
      if (e.cycle === "monthly") return sum + e.amountUSD
      if (e.cycle === "yearly") return sum + e.amountUSD / 12
      if (e.cycle === "quarterly") return sum + e.amountUSD / 3
      return sum
    }, 0)

    // Expected recurring revenue from active projects
    const activeProjects = mockProjects.filter(p => p.status === "active")
    const expectedMonthlyRevenue = activeProjects.reduce((sum, p) => {
      // For T&M projects, use monthly rate
      if (p.billingModel === "time-materials") {
        return sum + (p.clientHourlyRate || 0) * (p.monthlyCap || 160)
      }
      // For fixed price, estimate monthly based on duration
      const startDate = new Date(p.startDate)
      const endDate = new Date(p.endDate)
      const months = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
      return sum + (p.totalContractValue || 0) / months
    }, 0)

    // Pending invoices (expected income)
    const pendingInvoices = mockProjects.flatMap(p => 
      p.invoices.filter(i => i.status === "sent" || i.status === "draft")
    )

    return {
      totalLaborCost,
      monthlyRecurring,
      expectedMonthlyRevenue,
      pendingInvoices,
      currentCash: 45000, // Mock - would come from bank integration
    }
  }, [])
}

// Generate 60-day forecast
function useForecastData(
  baseData: ReturnType<typeof useBaseFinancials>,
  salaryAdjustment: number,
  newHires: number,
  includeLeads: boolean
) {
  return useMemo(() => {
    const today = new Date()
    const data = []
    let runningBalance = baseData.currentCash

    // Monthly costs with adjustments
    const adjustedLaborCost = baseData.totalLaborCost * (1 + salaryAdjustment / 100)
    const newHireCost = newHires * 4000 // Average new hire cost
    const totalMonthlyCost = adjustedLaborCost + baseData.monthlyRecurring + newHireCost
    const dailyCost = totalMonthlyCost / 30

    // Expected daily revenue
    const baseMonthlyRevenue = baseData.expectedMonthlyRevenue
    const leadRevenue = includeLeads ? 
      mockProjects.filter(p => p.status === "lead").reduce((sum, p) => sum + (p.totalContractValue || 0) / 6, 0) : 0
    const totalExpectedMonthly = baseMonthlyRevenue + leadRevenue
    const dailyRevenue = totalExpectedMonthly / 30

    for (let i = 0; i < 60; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      
      const isToday = i === 0

      // Check for invoice due dates
      const invoiceDue = baseData.pendingInvoices.find(inv => {
        const dueDate = new Date(inv.dueDate)
        return dueDate.toDateString() === date.toDateString()
      })

      // Income spike on invoice date
      const income = invoiceDue ? invoiceDue.amount : (i % 7 === 0 ? dailyRevenue * 7 : 0)
      
      // Expenses are more spread out
      const expense = dailyCost + (i % 30 === 0 ? baseData.monthlyRecurring : 0)

      runningBalance = runningBalance + income - expense

      data.push({
        day: i,
        date: date.toLocaleDateString("uk-UA", { month: "short", day: "numeric" }),
        fullDate: date.toISOString(),
        income,
        expense,
        balance: Math.round(runningBalance),
        isToday,
        isFuture: i > 0,
        hasInvoice: !!invoiceDue,
        invoiceName: invoiceDue?.name,
      })
    }

    // Calculate risk zones
    const minBalance = Math.min(...data.map(d => d.balance))
    const daysUntilZero = data.findIndex(d => d.balance <= 0)
    const riskZoneStart = data.findIndex(d => d.balance < baseData.currentCash * 0.3)

    return {
      data,
      minBalance,
      daysUntilZero: daysUntilZero === -1 ? null : daysUntilZero,
      riskZoneStart: riskZoneStart === -1 ? null : riskZoneStart,
      projectedEndBalance: data[data.length - 1].balance,
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
          Gap Probability
        </CardTitle>
        <CardDescription>Chance of cash flow disruption</CardDescription>
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
            {riskLevel === "high" ? "Take action now" :
             riskLevel === "medium" ? "Monitor closely" :
             "Looking good"}
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          {forecast.daysUntilZero !== null && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Balance hits zero in {forecast.daysUntilZero} days
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Min balance: ${forecast.minBalance.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            60-day projection: ${forecast.projectedEndBalance.toLocaleString()}
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
  onReset,
}: {
  salaryAdjustment: number
  setSalaryAdjustment: (v: number) => void
  newHires: number
  setNewHires: (v: number) => void
  includeLeads: boolean
  setIncludeLeads: (v: boolean) => void
  onReset: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              What-If Simulator
            </CardTitle>
            <CardDescription>Adjust parameters to see impact on cash flow</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Salary Adjustment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              Salary Adjustment
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>What if you raise/cut salaries by X%?</p>
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
            <span>-30% cut</span>
            <span>No change</span>
            <span>+50% raise</span>
          </div>
        </div>

        {/* New Hires */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              New Hires
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Each hire adds ~$4,000/month to burn rate</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Badge variant={newHires > 0 ? "secondary" : "outline"}>
              +{newHires} people
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
            <span>No hires</span>
            <span>+5</span>
            <span>+10 people</span>
          </div>
        </div>

        {/* Include Leads */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label className="font-medium">Include Lead Projects</Label>
            <p className="text-xs text-muted-foreground">
              Count potential revenue from leads
            </p>
          </div>
          <Switch
            checked={includeLeads}
            onCheckedChange={setIncludeLeads}
          />
        </div>

        {/* Impact Summary */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <div className="text-sm font-medium mb-2">Impact Summary</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Salary change:</span>
              <span className={salaryAdjustment > 0 ? "text-red-500" : salaryAdjustment < 0 ? "text-emerald-500" : ""}>
                {salaryAdjustment > 0 ? "+" : ""}${Math.round(
                  mockTeams.reduce((sum, t) => sum + t.members.reduce((s, m) => s + m.baseRate, 0), 0) * 
                  (salaryAdjustment / 100)
                ).toLocaleString()}/mo
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New hire cost:</span>
              <span className={newHires > 0 ? "text-red-500" : ""}>
                +${(newHires * 4000).toLocaleString()}/mo
              </span>
            </div>
            {includeLeads && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead revenue:</span>
                <span className="text-emerald-500">
                  +${Math.round(
                    mockProjects.filter(p => p.status === "lead")
                      .reduce((sum, p) => sum + (p.totalContractValue || 0) / 6, 0)
                  ).toLocaleString()}/mo
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
  const baseData = useBaseFinancials()
  
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

  const chartConfig = {
    balance: {
      label: "Balance",
      color: "#3B82F6",
    },
    income: {
      label: "Income",
      color: "#10B981",
    },
    expense: {
      label: "Expenses",
      color: "#EF4444",
    },
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">The Time Machine</h1>
              <p className="text-muted-foreground">60-day cash flow forecast with what-if scenarios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Play className="h-3 w-3" />
              Real-time Simulation
            </Badge>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Forecast Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cash Flow Forecast */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Cash Flow Forecast
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Projection based on active projects, pending invoices, and recurring expenses</p>
                        </TooltipContent>
                      </Tooltip>
                    </CardTitle>
                    <CardDescription>Projected balance over the next 60 days</CardDescription>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">Balance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/30" />
                      <span className="text-muted-foreground">Risk Zone</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast.data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 11 }}
                        interval={9}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
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
                                  <span className="text-muted-foreground">Balance:</span>
                                  <span className="font-mono">${data.balance.toLocaleString()}</span>
                                </div>
                                {data.hasInvoice && (
                                  <div className="flex justify-between gap-4 text-emerald-600">
                                    <span>Invoice:</span>
                                    <span className="font-mono">+${data.income.toLocaleString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        }}
                      />
                      
                      {/* Risk zone background */}
                      {forecast.riskZoneStart !== null && (
                        <ReferenceLine
                          y={baseData.currentCash * 0.3}
                          stroke="#EF4444"
                          strokeDasharray="5 5"
                          label={{ value: "Risk Zone", position: "right", fontSize: 10, fill: "#EF4444" }}
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

            {/* Income vs Expense Bars */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Income vs Expenses</CardTitle>
                <CardDescription>Aggregated by week for clearer comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={
                        // Aggregate by week
                        forecast.data.reduce((acc, item, i) => {
                          const weekIndex = Math.floor(i / 7)
                          if (!acc[weekIndex]) {
                            acc[weekIndex] = { 
                              week: `Week ${weekIndex + 1}`, 
                              income: 0, 
                              expense: 0 
                            }
                          }
                          acc[weekIndex].income += item.income
                          acc[weekIndex].expense += item.expense
                          return acc
                        }, [] as { week: string; income: number; expense: number }[])
                      }
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                      <YAxis 
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                      <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
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
              onReset={resetSimulation}
            />

            {/* Upcoming Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expected Income</CardTitle>
                <CardDescription>Pending invoices in forecast</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {baseData.pendingInvoices.slice(0, 5).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div>
                        <div className="font-medium text-sm">{inv.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Due: {new Date(inv.dueDate).toLocaleDateString("uk-UA")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-emerald-600">
                          +${inv.amount.toLocaleString()}
                        </div>
                        <Badge variant={inv.status === "sent" ? "default" : "secondary"} className="text-xs">
                          {inv.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
