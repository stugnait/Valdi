"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock, Info, Play, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Area, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { workforceApi } from "@/lib/api/workforce"

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
  pendingInvoices: Array<{ id: number; name: string; dueDate: string; amount: number; status: string }>
  currentCash: number
}

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

        const activeRevenue = projects
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

        const pendingInvoices = invoices
          .filter((invoice) => invoice.status === "sent" || invoice.status === "draft")
          .map((invoice) => ({
            id: invoice.id,
            name: invoice.number || invoice.project_name,
            dueDate: invoice.due_date,
            amount: toNumber(invoice.amount),
            status: invoice.status,
          }))

        const monthlyRecurring = recurring.reduce((sum, expense) => {
          const amount = toNumber(expense.amount)
          if (expense.cycle === "monthly") return sum + amount
          if (expense.cycle === "quarterly") return sum + amount / 3
          if (expense.cycle === "yearly") return sum + amount / 12
          return sum
        }, 0)

        setBaseData({
          totalLaborCost: overview.health.total_labor_cost,
          monthlyRecurring,
          expectedMonthlyRevenue: activeRevenue,
          leadMonthlyRevenue,
          pendingInvoices,
          currentCash: overview.health.current_cash,
        })
        setError(null)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "Unable to load forecast data")
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

function useForecastData(baseData: BaseFinancials | null, salaryAdjustment: number, newHires: number, includeLeads: boolean) {
  return useMemo(() => {
    if (!baseData) {
      return { data: [], minBalance: 0, daysUntilZero: null as number | null, riskZoneStart: null as number | null, projectedEndBalance: 0 }
    }

    const today = new Date()
    const data: Array<Record<string, number | string | boolean>> = []
    let runningBalance = baseData.currentCash

    const adjustedLaborCost = baseData.totalLaborCost * (1 + salaryAdjustment / 100)
    const newHireCost = newHires * 4000
    const totalMonthlyCost = adjustedLaborCost + baseData.monthlyRecurring + newHireCost
    const dailyCost = totalMonthlyCost / 30

    const totalExpectedMonthly = baseData.expectedMonthlyRevenue + (includeLeads ? baseData.leadMonthlyRevenue : 0)
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

export default function TimeMachinePage() {
  const { baseData, isLoading, error } = useBaseFinancials()
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
              <h1 className="text-2xl font-bold">The Time Machine</h1>
              <p className="text-muted-foreground">60-day forecast based on backend data</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1"><Play className="h-3 w-3" />API Simulation</Badge>
        </div>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {isLoading && <Alert><AlertDescription>Loading forecast from API…</AlertDescription></Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Cash Flow Forecast
                  <Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>Based on analytics, projects, invoices, and expenses API endpoints.</TooltipContent></Tooltip>
                </CardTitle>
                <CardDescription>Projected balance over next 60 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{ balance: { label: "Balance", color: "#3B82F6" } }} className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecast.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={9} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `$${(Number(value) / 1000).toFixed(0)}k`} />
                      <ChartTooltip />
                      {baseData && <ReferenceLine y={baseData.currentCash * 0.3} stroke="#EF4444" strokeDasharray="5 5" />}
                      <ReferenceLine y={0} stroke="#EF4444" />
                      <Area type="monotone" dataKey="balance" stroke="#3B82F6" fill="#3B82F633" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gap Probability</CardTitle>
                <CardDescription>Risk of cashflow disruption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{forecast.daysUntilZero !== null ? "95%" : forecast.minBalance < 10000 ? "75%" : "20%"}</div>
                <p className="text-sm text-muted-foreground mt-2">Min balance: ${forecast.minBalance.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What-if simulator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Salary adjustment: {salaryAdjustment}%</Label>
                  <Slider value={[salaryAdjustment]} min={-20} max={30} step={1} onValueChange={(v) => setSalaryAdjustment(v[0] ?? 0)} />
                </div>
                <div className="space-y-2">
                  <Label>New hires: {newHires}</Label>
                  <Slider value={[newHires]} min={0} max={8} step={1} onValueChange={(v) => setNewHires(v[0] ?? 0)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="leads">Include lead pipeline</Label>
                  <Switch id="leads" checked={includeLeads} onCheckedChange={setIncludeLeads} />
                </div>
                <Button variant="outline" className="w-full" onClick={resetSimulation}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expected income</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(baseData?.pendingInvoices ?? []).slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between text-sm">
                    <span>{invoice.name}</span>
                    <span className="font-mono text-emerald-600">+${invoice.amount.toLocaleString()}</span>
                  </div>
                ))}
                {(baseData?.pendingInvoices.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No pending invoices.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
