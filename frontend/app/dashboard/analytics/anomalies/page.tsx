"use client"

import { useMemo } from "react"
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Target,
  FileQuestion,
  Clock,
  Flame,
  CheckCircle2,
  AlertCircle
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
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { mockTeams } from "@/lib/types/teams"
import { mockProjects } from "@/lib/types/projects"
import { mockVariableExpenses, mockRecurringExpenses } from "@/lib/types/spendings"

// Scope Creep Detection
function useScopeCreepData() {
  return useMemo(() => {
    return mockProjects
      .filter(p => p.status === "active")
      .map(project => {
        const plannedBudget = project.totalContractValue || 
          (project.clientHourlyRate || 0) * (project.monthlyCap || 160) * 
          Math.max(1, Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
        
        const actualSpend = project.laborCost + project.directOverheads
        
        // Calculate progress based on time
        const totalDays = (new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)
        const elapsedDays = (Date.now() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24)
        const timeProgress = Math.min(100, (elapsedDays / totalDays) * 100)
        
        // Budget burn rate
        const budgetProgress = plannedBudget > 0 ? (actualSpend / plannedBudget) * 100 : 0
        
        // Scope creep indicator: if budget progress exceeds time progress significantly
        const creepRatio = timeProgress > 0 ? budgetProgress / timeProgress : 0
        const hasCreep = creepRatio > 1.2 // 20% ahead of schedule burn
        const severity = creepRatio > 1.5 ? "critical" : creepRatio > 1.2 ? "warning" : "ok"
        
        // Generate trend data (mock)
        const trendData = Array.from({ length: 6 }, (_, i) => ({
          week: `W${i + 1}`,
          planned: Math.round((timeProgress / 6) * (i + 1) * (plannedBudget / 100)),
          actual: Math.round((budgetProgress / 6) * (i + 1) * (plannedBudget / 100) * (1 + (creepRatio - 1) * 0.3 * i)),
        }))

        return {
          id: project.id,
          name: project.name,
          client: project.client.name,
          plannedBudget,
          actualSpend,
          timeProgress,
          budgetProgress,
          creepRatio,
          hasCreep,
          severity,
          trendData,
          daysRemaining: Math.max(0, Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        }
      })
      .sort((a, b) => b.creepRatio - a.creepRatio)
  }, [])
}

// Uncategorized Expenses
function useUncategorizedData() {
  return useMemo(() => {
    const now = new Date()
    const daysAgo = (days: number) => {
      const date = new Date(now)
      date.setDate(now.getDate() - days)
      return date.toISOString().split("T")[0]
    }

    // Simulate uncategorized transactions
    const demoTransactions = [
      { id: "u1", name: "Card Payment", amount: 450, daysAgo: 3, source: "monobank" },
      { id: "u2", name: "Wire Transfer", amount: 1200, daysAgo: 6, source: "privat24" },
      { id: "u3", name: "Unknown Merchant", amount: 85, daysAgo: 10, source: "monobank" },
      { id: "u4", name: "Subscription", amount: 29, daysAgo: 13, source: "wise" },
      { id: "u5", name: "ATM Withdrawal", amount: 200, daysAgo: 16, source: "monobank" },
    ]

    const uncategorized = demoTransactions.map((tx) => {
      const txDate = new Date(daysAgo(tx.daysAgo))

      return {
        id: tx.id,
        name: tx.name,
        amount: tx.amount,
        source: tx.source,
        timestamp: txDate.toISOString(),
        date: txDate.toLocaleDateString("uk-UA"),
      }
    })

    const total = uncategorized.reduce((sum, t) => sum + t.amount, 0)

    // Monthly trend (decreasing is good)
    const monthlyTrend = Array.from({ length: 4 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (3 - index), 1)
      const month = monthDate.toLocaleDateString("uk-UA", { month: "short" })
      const baseline = Math.max(total + (3 - index) * 650, total)
      return { month, amount: index === 3 ? total : baseline }
    })

    const allExpenses = [...mockVariableExpenses, ...mockRecurringExpenses]
    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amountUSD, 0)
    const uncategorizedPercent = (total / totalExpenses) * 100

    return {
      transactions: uncategorized,
      total,
      monthlyTrend,
      uncategorizedPercent,
      trend: monthlyTrend[monthlyTrend.length - 1].amount < monthlyTrend[monthlyTrend.length - 2].amount ? "down" : "up",
    }
  }, [])
}

// Bench Leakage
function useBenchData() {
  return useMemo(() => {
    const allMembers = mockTeams.flatMap(team => 
      team.members.map(m => ({
        ...m,
        teamName: team.name,
        teamColor: team.color,
        // Calculate bench time (100 - utilization = bench %)
        benchPercent: 100 - m.utilization,
        benchCost: m.baseRate * ((100 - m.utilization) / 100),
        isOnBench: m.utilization < 60,
      }))
    )

    const totalBenchCost = allMembers.reduce((sum, m) => sum + m.benchCost, 0)
    const membersOnBench = allMembers.filter(m => m.isOnBench)

    // Monthly bench leakage trend
    const monthlyTrend = [
      { month: "Січ", leakage: 4200, utilization: 78 },
      { month: "Лют", leakage: 3800, utilization: 81 },
      { month: "Бер", leakage: 5100, utilization: 74 },
      { month: "Кві", leakage: totalBenchCost, utilization: Math.round(allMembers.reduce((sum, m) => sum + m.utilization, 0) / allMembers.length) },
    ]

    return {
      members: allMembers.sort((a, b) => b.benchCost - a.benchCost),
      membersOnBench,
      totalBenchCost,
      monthlyTrend,
      avgUtilization: Math.round(allMembers.reduce((sum, m) => sum + m.utilization, 0) / allMembers.length),
    }
  }, [])
}

// Scope Creep Card Component
function ScopeCreepCard({ project }: { project: ReturnType<typeof useScopeCreepData>[0] }) {
  const chartConfig = {
    planned: { label: "Planned", color: "#3B82F6" },
    actual: { label: "Actual", color: project.severity === "critical" ? "#EF4444" : project.severity === "warning" ? "#F59E0B" : "#10B981" },
  }

  return (
    <Card className={`border-l-4 ${
      project.severity === "critical" ? "border-l-red-500" :
      project.severity === "warning" ? "border-l-amber-500" :
      "border-l-emerald-500"
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{project.name}</CardTitle>
            <CardDescription>{project.client}</CardDescription>
          </div>
          <Badge variant={project.severity === "critical" ? "destructive" : project.severity === "warning" ? "secondary" : "default"}>
            {project.severity === "critical" && <AlertTriangle className="h-3 w-3 mr-1" />}
            {project.creepRatio.toFixed(2)}x burn rate
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bars */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Time Progress</span>
            <span className="font-mono">{project.timeProgress.toFixed(0)}%</span>
          </div>
          <Progress value={project.timeProgress} className="h-2" />
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget Spent</span>
            <span className={`font-mono ${project.hasCreep ? "text-red-500" : ""}`}>
              {project.budgetProgress.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={Math.min(100, project.budgetProgress)} 
            className={`h-2 ${project.hasCreep ? "[&>div]:bg-red-500" : ""}`}
          />
        </div>

        {/* Mini Trend Chart */}
        <ChartContainer config={chartConfig} className="h-[80px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={project.trendData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <Area
                type="monotone"
                dataKey="planned"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.1}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke={chartConfig.actual.color}
                fill={chartConfig.actual.color}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-mono font-semibold">${project.plannedBudget.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Planned</div>
          </div>
          <div>
            <div className={`font-mono font-semibold ${project.hasCreep ? "text-red-500" : ""}`}>
              ${project.actualSpend.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Spent</div>
          </div>
          <div>
            <div className="font-mono font-semibold">{project.daysRemaining}d</div>
            <div className="text-xs text-muted-foreground">Remaining</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnomaliesLeaksPage() {
  const scopeCreepData = useScopeCreepData()
  const uncategorizedData = useUncategorizedData()
  const benchData = useBenchData()

  const chartConfig = {
    amount: { label: "Amount", color: "#8B5CF6" },
    leakage: { label: "Leakage", color: "#EF4444" },
    utilization: { label: "Utilization", color: "#10B981" },
  }

  // Total leakage calculation
  const totalLeakage = uncategorizedData.total + benchData.totalBenchCost
  const criticalProjects = scopeCreepData.filter(p => p.severity === "critical").length

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Anomalies & Leaks</h1>
              <p className="text-muted-foreground">Finding where your money disappears</p>
            </div>
          </div>
          <Badge variant="destructive" className="gap-1">
            <Flame className="h-3 w-3" />
            ${totalLeakage.toLocaleString()}/mo potential leakage
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className={criticalProjects > 0 ? "border-red-500/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${criticalProjects > 0 ? "bg-red-500/10" : "bg-muted"}`}>
                  <Target className={`h-5 w-5 ${criticalProjects > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scope Creep Alerts</p>
                  <p className="text-2xl font-bold">{criticalProjects} critical</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={uncategorizedData.total > 1000 ? "border-amber-500/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${uncategorizedData.total > 1000 ? "bg-amber-500/10" : "bg-muted"}`}>
                  <FileQuestion className={`h-5 w-5 ${uncategorizedData.total > 1000 ? "text-amber-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Uncategorized</p>
                  <p className="text-2xl font-bold">${uncategorizedData.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={benchData.totalBenchCost > 3000 ? "border-red-500/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${benchData.totalBenchCost > 3000 ? "bg-red-500/10" : "bg-muted"}`}>
                  <Clock className={`h-5 w-5 ${benchData.totalBenchCost > 3000 ? "text-red-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bench Leakage</p>
                  <p className="text-2xl font-bold">${benchData.totalBenchCost.toLocaleString()}/mo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scope Creep Detector */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Scope Creep Detector
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Compares planned budget vs actual spending against time progress. Alert triggers when spending outpaces timeline.</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Projects where costs are growing faster than progress</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scopeCreepData.map(project => (
                <ScopeCreepCard key={project.id} project={project} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Uncategorized Bleeding */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileQuestion className="h-5 w-5" />
                    Uncategorized Bleeding
                  </CardTitle>
                  <CardDescription>Money going nowhere (no category or project)</CardDescription>
                </div>
                <Badge variant={uncategorizedData.trend === "down" ? "default" : "destructive"} className="gap-1">
                  {uncategorizedData.trend === "down" ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {uncategorizedData.uncategorizedPercent.toFixed(1)}% of expenses
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trend Chart */}
              <ChartContainer config={chartConfig} className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={uncategorizedData.monthlyTrend} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="Uncategorized">
                      {uncategorizedData.monthlyTrend.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={index === uncategorizedData.monthlyTrend.length - 1 ? "#8B5CF6" : "#8B5CF620"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* Transaction List */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Recent uncategorized</div>
                {uncategorizedData.transactions.slice(0, 4).map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <div>
                        <div className="text-sm font-medium">{tx.name}</div>
                        <div className="text-xs text-muted-foreground">{tx.date} - {tx.source}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">${tx.amount}</span>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        Categorize
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Goal */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-600 text-sm">
                  <Target className="h-4 w-4" />
                  Goal: Reduce to $0 uncategorized
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bench Leakage */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Bench Leakage
                  </CardTitle>
                  <CardDescription>Money paid while people aren&apos;t on projects</CardDescription>
                </div>
                <Badge variant="secondary">
                  {benchData.avgUtilization}% avg utilization
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trend Chart */}
              <ChartContainer config={chartConfig} className="h-[120px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={benchData.monthlyTrend} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="leakage"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name="Leakage"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* People on Bench */}
              <div className="space-y-2">
                <div className="text-sm font-medium">People with low utilization</div>
                {benchData.membersOnBench.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback style={{ backgroundColor: member.teamColor + "30", color: member.teamColor }}>
                          {member.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.teamName} - {member.utilization}% utilized</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-red-500">
                        -${member.benchCost.toLocaleString()}/mo
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.benchPercent}% idle time
                      </div>
                    </div>
                  </div>
                ))}

                {benchData.membersOnBench.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Everyone is well utilized!
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Monthly Bench Cost</span>
                  <span className="text-xl font-bold text-red-500">
                    ${benchData.totalBenchCost.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This is money &quot;flushed down the toilet&quot; paying idle time
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
