"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Info,
  Target,
  FileQuestion,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { workforceApi, type ApiDeveloper, type ApiProject, type ApiRecurringExpense, type ApiVariableExpense } from "@/lib/api/workforce"

const MONTHLY_HOURS = 160

function monthLabel(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString("uk-UA", { month: "short" })
}

export default function AnomaliesLeaksPage() {
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [developers, setDevelopers] = useState<ApiDeveloper[]>([])
  const [variableExpenses, setVariableExpenses] = useState<ApiVariableExpense[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<ApiRecurringExpense[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [projectsPayload, developersPayload, variablePayload, recurringPayload] = await Promise.all([
          workforceApi.listProjects(),
          workforceApi.listDevelopers(),
          workforceApi.listVariableExpenses(),
          workforceApi.listRecurringExpenses(),
        ])
        if (!mounted) return
        setProjects(projectsPayload)
        setDevelopers(developersPayload)
        setVariableExpenses(variablePayload)
        setRecurringExpenses(recurringPayload)
      } catch {
        if (!mounted) return
        setProjects([])
        setDevelopers([])
        setVariableExpenses([])
        setRecurringExpenses([])
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const scopeCreepData = useMemo(() => {
    return projects
      .filter((p) => p.status === "active")
      .map((project) => {
        const plannedBudget = Number.parseFloat(project.total_contract_value ?? project.revenue ?? "0")
        const actualSpend = Number.parseFloat(project.labor_cost ?? "0") + Number.parseFloat(project.direct_overheads ?? "0")

        const start = new Date(project.start_date)
        const end = new Date(project.end_date)
        const now = Date.now()
        const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        const elapsedDays = Math.max(0, (now - start.getTime()) / (1000 * 60 * 60 * 24))

        const timeProgress = Math.min(100, (elapsedDays / totalDays) * 100)
        const budgetProgress = plannedBudget > 0 ? (actualSpend / plannedBudget) * 100 : 0
        const creepRatio = timeProgress > 0 ? budgetProgress / timeProgress : 0
        const severity = creepRatio > 1.5 ? "critical" : creepRatio > 1.2 ? "warning" : "ok"

        return {
          id: project.id,
          name: project.name,
          client: project.client_name,
          plannedBudget,
          actualSpend,
          timeProgress,
          budgetProgress,
          creepRatio,
          hasCreep: creepRatio > 1.2,
          severity,
          daysRemaining: Math.max(0, Math.ceil((end.getTime() - now) / (1000 * 60 * 60 * 24))),
          trendData: [
            { week: "Start", planned: 0, actual: 0 },
            { week: "Now", planned: Math.round((plannedBudget * timeProgress) / 100), actual: Math.round(actualSpend) },
          ],
        }
      })
      .sort((a, b) => b.creepRatio - a.creepRatio)
  }, [projects])

  const uncategorizedData = useMemo(() => {
    const uncategorized = variableExpenses
      .filter((tx) => !tx.category || tx.category === "other")
      .map((tx) => ({
        id: tx.id,
        name: tx.name,
        amount: Number.parseFloat(tx.amount ?? "0"),
        source: tx.source,
        date: new Date(tx.expense_date).toLocaleDateString("uk-UA"),
        rawDate: tx.expense_date,
      }))
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime())

    const groupedByMonth = uncategorized.reduce<Record<string, number>>((acc, tx) => {
      const key = monthLabel(tx.rawDate)
      acc[key] = (acc[key] ?? 0) + tx.amount
      return acc
    }, {})

    const monthlyTrend = Object.entries(groupedByMonth).map(([month, amount]) => ({ month, amount }))
    const total = uncategorized.reduce((sum, tx) => sum + tx.amount, 0)

    const totalExpenses = [
      ...variableExpenses.map((e) => Number.parseFloat(e.amount ?? "0")),
      ...recurringExpenses.map((e) => Number.parseFloat(e.amount ?? "0")),
    ].reduce((sum, v) => sum + v, 0)

    return {
      transactions: uncategorized,
      total,
      monthlyTrend,
      uncategorizedPercent: totalExpenses > 0 ? (total / totalExpenses) * 100 : 0,
      trend:
        monthlyTrend.length > 1 && monthlyTrend[monthlyTrend.length - 1].amount < monthlyTrend[monthlyTrend.length - 2].amount
          ? "down"
          : "up",
    }
  }, [variableExpenses, recurringExpenses])

  const benchData = useMemo(() => {
    const members = developers
      .filter((d) => d.is_active)
      .map((dev) => {
        const utilization = Math.min(100, dev.teams.reduce((sum, team) => sum + Number(team.allocation), 0))
        const benchPercent = Math.max(0, 100 - utilization)
        const hourlyRate = Number.parseFloat(dev.hourly_rate ?? "0")
        const benchCost = (hourlyRate * MONTHLY_HOURS * benchPercent) / 100

        return {
          id: dev.id,
          name: dev.full_name,
          teamName: dev.teams.map((t) => t.name).join(", ") || "No team",
          utilization,
          benchPercent,
          benchCost,
          isOnBench: utilization < 60,
        }
      })
      .sort((a, b) => b.benchCost - a.benchCost)

    const totalBenchCost = members.reduce((sum, m) => sum + m.benchCost, 0)
    const avgUtilization = members.length ? Math.round(members.reduce((sum, m) => sum + m.utilization, 0) / members.length) : 0

    return {
      members,
      membersOnBench: members.filter((m) => m.isOnBench),
      totalBenchCost,
      monthlyTrend: [{ month: new Date().toLocaleDateString("uk-UA", { month: "short" }), leakage: totalBenchCost, utilization: avgUtilization }],
      avgUtilization,
    }
  }, [developers])

  const totalLeakage = uncategorizedData.total + benchData.totalBenchCost
  const criticalProjects = scopeCreepData.filter((p) => p.severity === "critical").length

  const chartConfig = {
    amount: { label: "Amount", color: "#8B5CF6" },
    leakage: { label: "Leakage", color: "#EF4444" },
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="h-6 w-6 text-red-500" /></div><div><h1 className="text-2xl font-bold">Anomalies & Leaks</h1><p className="text-muted-foreground">Signals calculated from live projects, developers and expenses</p></div></div>
          <Badge variant="destructive" className="gap-1"><Flame className="h-3 w-3" />${Math.round(totalLeakage).toLocaleString("uk-UA")}/mo potential leakage</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className={criticalProjects > 0 ? "border-red-500/50" : ""}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${criticalProjects > 0 ? "bg-red-500/10" : "bg-muted"}`}><Target className={`h-5 w-5 ${criticalProjects > 0 ? "text-red-500" : "text-muted-foreground"}`} /></div><div><p className="text-sm text-muted-foreground">Scope Creep Alerts</p><p className="text-2xl font-bold">{criticalProjects} critical</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><FileQuestion className="h-5 w-5 text-amber-500" /></div><div><p className="text-sm text-muted-foreground">Uncategorized</p><p className="text-2xl font-bold">${Math.round(uncategorizedData.total).toLocaleString("uk-UA")}</p></div></div></CardContent></Card>
          <Card className={benchData.totalBenchCost > 3000 ? "border-red-500/50" : ""}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${benchData.totalBenchCost > 3000 ? "bg-red-500/10" : "bg-muted"}`}><Clock className={`h-5 w-5 ${benchData.totalBenchCost > 3000 ? "text-red-500" : "text-muted-foreground"}`} /></div><div><p className="text-sm text-muted-foreground">Bench Leakage</p><p className="text-2xl font-bold">${Math.round(benchData.totalBenchCost).toLocaleString("uk-UA")}/mo</p></div></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">Scope Creep Detector<Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>Alerts when budget burn is significantly ahead of timeline progress.</TooltipContent></Tooltip></CardTitle><CardDescription>Active projects with budget-vs-time drift</CardDescription></CardHeader>
          <CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{scopeCreepData.map((project) => <Card key={project.id} className={`border-l-4 ${project.severity === "critical" ? "border-l-red-500" : project.severity === "warning" ? "border-l-amber-500" : "border-l-emerald-500"}`}><CardHeader className="pb-2"><div className="flex items-start justify-between"><div><CardTitle className="text-base">{project.name}</CardTitle><CardDescription>{project.client}</CardDescription></div><Badge variant={project.severity === "critical" ? "destructive" : project.severity === "warning" ? "secondary" : "default"}>{project.creepRatio.toFixed(2)}x burn</Badge></div></CardHeader><CardContent className="space-y-3"><div className="space-y-2"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Time Progress</span><span className="font-mono">{project.timeProgress.toFixed(0)}%</span></div><Progress value={project.timeProgress} className="h-2" /><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Budget Spent</span><span className={`font-mono ${project.hasCreep ? "text-red-500" : ""}`}>{project.budgetProgress.toFixed(0)}%</span></div><Progress value={Math.min(100, project.budgetProgress)} className={`h-2 ${project.hasCreep ? "[&>div]:bg-red-500" : ""}`} /></div><div className="grid grid-cols-3 gap-2 text-center text-sm"><div><div className="font-mono font-semibold">${Math.round(project.plannedBudget).toLocaleString("uk-UA")}</div><div className="text-xs text-muted-foreground">Planned</div></div><div><div className={`font-mono font-semibold ${project.hasCreep ? "text-red-500" : ""}`}>${Math.round(project.actualSpend).toLocaleString("uk-UA")}</div><div className="text-xs text-muted-foreground">Spent</div></div><div><div className="font-mono font-semibold">{project.daysRemaining}d</div><div className="text-xs text-muted-foreground">Remaining</div></div></div></CardContent></Card>)}</div></CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2"><FileQuestion className="h-5 w-5" />Uncategorized Bleeding</CardTitle><CardDescription>Variable expenses with empty/other category</CardDescription></div><Badge variant={uncategorizedData.trend === "down" ? "default" : "destructive"} className="gap-1">{uncategorizedData.trend === "down" ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}{uncategorizedData.uncategorizedPercent.toFixed(1)}% of expenses</Badge></div></CardHeader>
            <CardContent className="space-y-4">
              <ChartContainer config={chartConfig} className="h-[120px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={uncategorizedData.monthlyTrend} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Uncategorized">{uncategorizedData.monthlyTrend.map((_, index) => <Cell key={`cell-${index}`} fill={index === uncategorizedData.monthlyTrend.length - 1 ? "#8B5CF6" : "#8B5CF620"} />)}</Bar></BarChart></ResponsiveContainer></ChartContainer>
              <div className="space-y-2"><div className="text-sm font-medium">Recent uncategorized</div>{uncategorizedData.transactions.slice(0, 4).map((tx) => <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /><div><div className="text-sm font-medium">{tx.name}</div><div className="text-xs text-muted-foreground">{tx.date} - {tx.source}</div></div></div><div className="flex items-center gap-2"><span className="font-mono text-sm">${Math.round(tx.amount).toLocaleString("uk-UA")}</span><Button variant="ghost" size="sm" className="h-6 px-2 text-xs">Categorize</Button></div></div>)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Bench Leakage</CardTitle><CardDescription>Cost of under-utilized active developers</CardDescription></div><Badge variant="secondary">{benchData.avgUtilization}% avg utilization</Badge></div></CardHeader>
            <CardContent className="space-y-4">
              <ChartContainer config={chartConfig} className="h-[120px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={benchData.monthlyTrend} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} /><ChartTooltip content={<ChartTooltipContent />} /><Area type="monotone" dataKey="leakage" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} strokeWidth={2} name="Leakage" /></AreaChart></ResponsiveContainer></ChartContainer>
              <div className="space-y-2"><div className="text-sm font-medium">People with low utilization</div>{benchData.membersOnBench.map((member) => <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback>{member.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar><div><div className="text-sm font-medium">{member.name}</div><div className="text-xs text-muted-foreground">{member.teamName} - {member.utilization}% utilized</div></div></div><div className="text-right"><div className="font-mono text-sm text-red-500">-${Math.round(member.benchCost).toLocaleString("uk-UA")}/mo</div><div className="text-xs text-muted-foreground">{member.benchPercent}% idle time</div></div></div>)}{benchData.membersOnBench.length === 0 && <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm"><CheckCircle2 className="h-4 w-4" />Everyone is well utilized!</div>}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
