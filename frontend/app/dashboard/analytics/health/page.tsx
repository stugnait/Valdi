"use client"

import { useState, useMemo } from "react"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle,
  ArrowRight,
  Coffee,
  Target,
  Gauge,
  Info
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { mockTeams } from "@/lib/types/teams"
import { mockProjects } from "@/lib/types/projects"
import { mockRecurringExpenses, mockVariableExpenses } from "@/lib/types/spendings"

const safeNumber = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback)
const safeRatioPercent = (value: number, total: number, fallback = 0) =>
  total > 0 ? safeNumber((value / total) * 100, fallback) : fallback

const formatCurrency = (value: number, fallback = "—") => {
  if (!Number.isFinite(value)) return fallback
  return `$${value.toLocaleString()}`
}

const formatPercent = (value: number, digits = 1, fallback = "—") => {
  if (!Number.isFinite(value)) return fallback
  return `${value.toFixed(digits)}%`
}

// Calculate aggregated financial data
function useFinancialData() {
  return useMemo(() => {
    // Total Revenue from paid invoices
    const totalRevenue = mockProjects.reduce((sum, p) => {
      return sum + p.invoices
        .filter(i => i.status === "paid")
        .reduce((s, i) => s + i.amount, 0)
    }, 0)

    // Labor costs (all team members)
    const totalLaborCost = mockTeams.reduce((sum, team) => {
      return sum + team.members.reduce((s, m) => s + m.baseRate, 0)
    }, 0)

    // Recurring overheads
    const monthlyRecurring = mockRecurringExpenses.reduce((sum, e) => {
      if (e.cycle === "monthly") return sum + e.amountUSD
      if (e.cycle === "yearly") return sum + e.amountUSD / 12
      if (e.cycle === "quarterly") return sum + e.amountUSD / 3
      return sum
    }, 0)

    // Variable expenses (last 3 months average)
    const variableTotal = mockVariableExpenses.reduce((sum, e) => sum + e.amountUSD, 0)
    const monthlyVariable = variableTotal / 3

    // Total monthly costs
    const totalMonthlyCosts = totalLaborCost + monthlyRecurring + monthlyVariable

    // Calculate tax (5% EP for FOP)
    const taxReserve = totalRevenue * 0.05

    // ESV (Unified Social Contribution) - fixed amount per quarter
    const monthlyESV = 1760 / 3 // ~587 UAH per month in USD terms

    // Depreciation estimate (equipment over 3 years)
    const equipmentValue = mockVariableExpenses
      .filter(e => e.category === "equipment")
      .reduce((sum, e) => sum + e.amountUSD, 0)
    const monthlyDepreciation = equipmentValue / 36

    // EBITDA (Earnings Before Interest, Taxes, Depreciation, Amortization)
    const ebitda = totalRevenue - totalLaborCost - monthlyRecurring - monthlyVariable

    // Net Profit
    const netProfit = ebitda - taxReserve - monthlyESV - monthlyDepreciation

    // Current cash (mock - would come from bank integration)
    const currentCash = 45000

    // Monthly burn rate
    const monthlyBurn = totalMonthlyCosts + taxReserve + monthlyESV

    // Runway in months
    const runwayMonths = monthlyBurn > 0 ? currentCash / monthlyBurn : 0

    return {
      totalRevenue,
      totalLaborCost,
      monthlyRecurring,
      monthlyVariable,
      totalMonthlyCosts,
      taxReserve,
      monthlyESV,
      monthlyDepreciation,
      ebitda,
      netProfit,
      currentCash,
      monthlyBurn,
      runwayMonths,
      profitMargin: totalRevenue > 0 ? safeRatioPercent(netProfit, totalRevenue) : 0,
    }
  }, [])
}

// Sankey-style flow visualization data
function useSankeyData(data: ReturnType<typeof useFinancialData>) {
  return useMemo(() => {
    // Sources (left side)
    const sources = mockProjects
      .filter(p => p.status === "active" || p.status === "finished")
      .map(p => ({
        id: p.id,
        name: p.client.name,
        amount: p.invoices
          .filter(i => i.status === "paid")
          .reduce((sum, i) => sum + i.amount, 0),
      }))
      .filter(s => s.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    // Destinations (right side)
    const destinations = [
      { id: "labor", name: "Salaries", amount: data.totalLaborCost, color: "#3B82F6" },
      { id: "overhead", name: "Overheads", amount: data.monthlyRecurring + data.monthlyVariable, color: "#F59E0B" },
      { id: "taxes", name: "Taxes & ESV", amount: data.taxReserve + data.monthlyESV, color: "#EF4444" },
      { id: "profit", name: "Net Profit", amount: Math.max(0, data.netProfit), color: "#10B981" },
    ]

    const totalIncome = sources.reduce((sum, s) => sum + s.amount, 0)

    return { sources, destinations, totalIncome }
  }, [data])
}

// Sankey Diagram Component
function SankeyDiagram({ data }: { data: ReturnType<typeof useSankeyData> }) {
  const { sources, destinations, totalIncome } = data
  
  const maxSourceAmount = sources.length > 0 ? Math.max(...sources.map(s => s.amount)) : 1
  const totalDestAmount = destinations.reduce((sum, d) => sum + d.amount, 0)

  if (sources.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No revenue data yet
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 h-[280px] relative">
      {/* Left side - Sources */}
      <div className="flex flex-col gap-2 w-[180px] shrink-0">
        {sources.map((source) => {
          const height = Math.max(28, (source.amount / maxSourceAmount) * 80)
          return (
            <div 
              key={source.id}
              className="flex items-center gap-2"
            >
              <div 
                className="bg-emerald-500/20 border border-emerald-500/40 rounded-md px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 truncate w-full"
                style={{ minHeight: height }}
              >
                <div className="truncate">{source.name}</div>
                <div className="text-xs text-emerald-600/70 dark:text-emerald-500/70">
                  ${source.amount.toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Middle - Flow visualization */}
      <div className="flex-1 relative h-full min-w-[200px]">
        <svg className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#6366F1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          
          {/* Main flow area */}
          <path
            d="M 0,20 C 80,20 120,140 200,140 L 200,160 C 120,160 80,280 0,280 Z"
            fill="url(#flowGradient)"
            className="opacity-60"
          />
          
          {/* Center label */}
          <foreignObject x="60" y="110" width="80" height="60">
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-xs text-muted-foreground">Total Flow</div>
              <div className="text-lg font-bold">${totalIncome.toLocaleString()}</div>
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* Right side - Destinations */}
      <div className="flex flex-col gap-2 w-[160px] shrink-0">
        {destinations.map((dest) => {
          const percentage = safeRatioPercent(dest.amount, totalDestAmount, 0)
          const height = Math.max(28, percentage * 2)
          return (
            <div 
              key={dest.id}
              className="flex items-center gap-2"
            >
              <div 
                className="rounded-md px-3 py-1.5 text-sm font-medium w-full"
                style={{ 
                  minHeight: height,
                  backgroundColor: `${dest.color}20`,
                  borderLeft: `3px solid ${dest.color}`,
                }}
              >
                <div className="truncate" style={{ color: dest.color }}>{dest.name}</div>
                <div className="text-xs opacity-70">
                  ${dest.amount.toLocaleString()} ({percentage.toFixed(1)}%)
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Runway Gauge Component
function RunwayGauge({ months, cashOnHand, monthlyBurn }: { months: number; cashOnHand: number; monthlyBurn: number }) {
  const percentage = Math.min((months / 12) * 100, 100)
  const rotation = (percentage / 100) * 180 - 90
  
  const getColor = () => {
    if (months < 3) return "#EF4444"
    if (months < 6) return "#F59E0B"
    return "#10B981"
  }

  const getMessage = () => {
    if (months < 3) return "Critical! Find revenue fast"
    if (months < 6) return "Caution - plan ahead"
    if (months < 9) return "Healthy runway"
    return "Excellent position"
  }

  return (
    <div className="flex flex-col items-center">
      {/* Gauge */}
      <div className="relative w-48 h-24 mb-4">
        {/* Background arc */}
        <svg className="w-full h-full" viewBox="0 0 200 100">
          {/* Gray background */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Colored progress */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={getColor()}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.51} 251`}
            className="transition-all duration-1000"
          />
          {/* Center needle */}
          <g transform={`rotate(${rotation}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke="#374151"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="8" fill="#374151" />
          </g>
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-4 text-xs text-muted-foreground">0</div>
        <div className="absolute bottom-0 right-4 text-xs text-muted-foreground">12+</div>
      </div>

      {/* Value */}
      <div className="text-center">
        <div className="text-4xl font-bold" style={{ color: getColor() }}>
          {safeNumber(months).toFixed(1)}
        </div>
        <div className="text-sm text-muted-foreground">months runway</div>
        <Badge 
          variant={months < 3 ? "destructive" : months < 6 ? "secondary" : "default"}
          className="mt-2"
        >
          {getMessage()}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6 w-full text-center">
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold">{formatCurrency(cashOnHand, "$0")}</div>
          <div className="text-xs text-muted-foreground">Cash on Hand</div>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-lg font-semibold">{formatCurrency(monthlyBurn, "$0")}</div>
          <div className="text-xs text-muted-foreground">Monthly Burn</div>
        </div>
      </div>
    </div>
  )
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  change, 
  changeType,
  icon: Icon,
  description 
}: { 
  title: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: React.ElementType
  description?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
          {change && (
            <Badge 
              variant={changeType === "positive" ? "default" : changeType === "negative" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {changeType === "positive" && <TrendingUp className="h-3 w-3 mr-1" />}
              {changeType === "negative" && <TrendingDown className="h-3 w-3 mr-1" />}
              {change}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

// EBITDA Breakdown Component
function EBITDABreakdown({ data }: { data: ReturnType<typeof useFinancialData> }) {
  const items = [
    { label: "Revenue", value: data.totalRevenue, type: "add" as const },
    { label: "Labor Costs", value: -data.totalLaborCost, type: "subtract" as const },
    { label: "Recurring Overheads", value: -data.monthlyRecurring, type: "subtract" as const },
    { label: "Variable Expenses", value: -data.monthlyVariable, type: "subtract" as const },
    { label: "EBITDA", value: data.ebitda, type: "total" as const },
    { label: "Taxes (5% EP)", value: -data.taxReserve, type: "subtract" as const },
    { label: "ESV", value: -data.monthlyESV, type: "subtract" as const },
    { label: "Depreciation", value: -data.monthlyDepreciation, type: "subtract" as const },
    { label: "Net Profit", value: data.netProfit, type: "final" as const },
  ]

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div 
          key={item.label}
          className={`flex items-center justify-between p-2 rounded-lg ${
            item.type === "total" ? "bg-blue-500/10 border border-blue-500/20" :
            item.type === "final" ? "bg-emerald-500/10 border border-emerald-500/20 font-bold" :
            "hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center gap-2">
            {item.type === "add" && <span className="text-emerald-500 text-sm">+</span>}
            {item.type === "subtract" && <span className="text-red-500 text-sm">-</span>}
            {item.type === "total" && <span className="text-blue-500 text-sm">=</span>}
            {item.type === "final" && <Target className="h-4 w-4 text-emerald-500" />}
            <span className={item.type === "total" || item.type === "final" ? "font-semibold" : ""}>
              {item.label}
            </span>
          </div>
          <span className={`font-mono ${
            item.value >= 0 ? "text-emerald-600" : "text-red-600"
          }`}>
            {item.value >= 0 ? "+" : ""}{item.value < 0 ? "-" : ""}${Math.abs(item.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function GlobalHealthPage() {
  const [period, setPeriod] = useState("month")
  const financialData = useFinancialData()
  const sankeyData = useSankeyData(financialData)

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Coffee className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Global Health</h1>
              <p className="text-muted-foreground">Your morning coffee dashboard</p>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(financialData.totalRevenue, "$0")}
            change="+12.5%"
            changeType="positive"
            icon={DollarSign}
            description="From paid invoices"
          />
          <MetricCard
            title="EBITDA"
            value={formatCurrency(financialData.ebitda, "$0")}
            change="+8.2%"
            changeType="positive"
            icon={TrendingUp}
            description="Before taxes & depreciation"
          />
          <MetricCard
            title="Net Profit"
            value={formatCurrency(financialData.netProfit, "$0")}
            change={`${formatPercent(financialData.profitMargin)} margin`}
            changeType={financialData.netProfit > 0 ? "positive" : "negative"}
            icon={Target}
            description="After all deductions"
          />
          <MetricCard
            title="Monthly Burn"
            value={formatCurrency(financialData.monthlyBurn, "$0")}
            change="-3.1%"
            changeType="positive"
            icon={AlertTriangle}
            description="Total monthly outflow"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sankey Diagram */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Money Flow
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Visualization of how money flows from clients through your company to various expense categories</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>Where your money comes from and where it goes</CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <ArrowRight className="h-3 w-3" />
                  Live Flow
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <SankeyDiagram data={sankeyData} />
            </CardContent>
          </Card>

          {/* Runway Gauge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Runway Gauge
              </CardTitle>
              <CardDescription>
                How long you can survive if all clients leave tomorrow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RunwayGauge 
                months={financialData.runwayMonths}
                cashOnHand={financialData.currentCash}
                monthlyBurn={financialData.monthlyBurn}
              />
            </CardContent>
          </Card>
        </div>

        {/* EBITDA Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Net Profit vs EBITDA
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>EBITDA:</strong> Earnings Before Interest, Taxes, Depreciation, and Amortization - shows operational profitability</p>
                    <p className="mt-1"><strong>Net Profit:</strong> What&apos;s actually left in your pocket after everything</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Full breakdown from revenue to net profit</CardDescription>
            </CardHeader>
            <CardContent>
              <EBITDABreakdown data={financialData} />
            </CardContent>
          </Card>

          {/* Cost Structure */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Structure</CardTitle>
              <CardDescription>Where your money is spent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    label: "Labor Costs", 
                    amount: financialData.totalLaborCost, 
                    percent: safeRatioPercent(financialData.totalLaborCost, financialData.totalMonthlyCosts),
                    color: "#3B82F6" 
                  },
                  { 
                    label: "Recurring Overheads", 
                    amount: financialData.monthlyRecurring, 
                    percent: safeRatioPercent(financialData.monthlyRecurring, financialData.totalMonthlyCosts),
                    color: "#F59E0B" 
                  },
                  { 
                    label: "Variable Expenses", 
                    amount: financialData.monthlyVariable, 
                    percent: safeRatioPercent(financialData.monthlyVariable, financialData.totalMonthlyCosts),
                    color: "#8B5CF6" 
                  },
                  { 
                    label: "Taxes & ESV", 
                    amount: financialData.taxReserve + financialData.monthlyESV, 
                    percent: safeRatioPercent(financialData.taxReserve + financialData.monthlyESV, financialData.totalMonthlyCosts),
                    color: "#EF4444" 
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        {item.label}
                      </span>
                      <span className="font-mono">
                        {formatCurrency(item.amount, "$0")} ({formatPercent(item.percent)})
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${item.percent}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Monthly Costs</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(financialData.totalMonthlyCosts, "$0")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
