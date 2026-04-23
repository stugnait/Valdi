"use client"

import { useState, useMemo } from "react"
import { 
  TrendingUp, 
  Users, 
  Code2,
  Crown,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Star
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { mockTeams } from "@/lib/types/teams"
import { mockProjects, mockClients } from "@/lib/types/projects"

function stableNoise(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000003
  }
  return (hash % 1000) / 1000
}

// Calculate developer ROI data
function useDevROIData() {
  return useMemo(() => {
    const months = ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер"]
    
    // Get all unique developers
    const allDevs = mockTeams.flatMap(team => 
      team.members.map(m => ({
        ...m,
        teamName: team.name,
        teamColor: team.color,
      }))
    )

    // Calculate monthly profit per developer (mock data with variation)
    const devMonthlyData = allDevs.map(dev => {
      const baseProfit = dev.revenue - dev.baseRate - dev.teamOverheadShare - dev.companyOverheadShare
      return {
        id: dev.id,
        name: dev.name,
        role: dev.role,
        teamName: dev.teamName,
        teamColor: dev.teamColor,
        monthlyCost: dev.baseRate,
        monthlyData: months.map((month) => ({
          month,
          // Keep values deterministic so analytics are stable between page reloads.
          profit: Math.round(baseProfit * (0.7 + stableNoise(`${dev.id}-${month}-profit`) * 0.6)),
          revenue: Math.round(dev.revenue * (0.8 + stableNoise(`${dev.id}-${month}-revenue`) * 0.4)),
        })),
        averageProfit: baseProfit,
        roi: ((dev.revenue / (dev.baseRate + dev.teamOverheadShare + dev.companyOverheadShare)) - 1) * 100,
        isGolden: baseProfit > 3000,
        isPassenger: baseProfit < 500,
      }
    })

    return { devMonthlyData, months }
  }, [])
}

// Calculate tech stack profitability
function useTechStackData() {
  return useMemo(() => {
    // Group projects by tags and calculate profitability
    const tagStats: Record<string, { revenue: number; cost: number; count: number }> = {}
    
    mockProjects.forEach(project => {
      const projectRevenue = project.invoices
        .filter(i => i.status === "paid")
        .reduce((sum, i) => sum + i.amount, 0)
      const projectCost = project.laborCost + project.directOverheads
      
      project.tags.forEach(tag => {
        if (!tagStats[tag.name]) {
          tagStats[tag.name] = { revenue: 0, cost: 0, count: 0 }
        }
        tagStats[tag.name].revenue += projectRevenue / project.tags.length
        tagStats[tag.name].cost += projectCost / project.tags.length
        tagStats[tag.name].count += 1
      })
    })

    return Object.entries(tagStats)
      .filter(([_, stats]) => stats.revenue > 0)
      .map(([name, stats]) => ({
        name,
        margin: Math.round(((stats.revenue - stats.cost) / stats.revenue) * 100),
        revenue: Math.round(stats.revenue),
        projects: stats.count,
        fullMark: 100,
      }))
      .sort((a, b) => b.margin - a.margin)
  }, [])
}

// Calculate client LTV
function useClientLTVData() {
  return useMemo(() => {
    const clientData = mockClients.map(client => {
      const clientProjects = mockProjects.filter(p => p.client.id === client.id)
      
      const totalRevenue = clientProjects.reduce((sum, p) => 
        sum + p.invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0), 0
      )
      
      const totalCost = clientProjects.reduce((sum, p) => 
        sum + p.laborCost + p.directOverheads, 0
      )
      
      const projectCount = clientProjects.length
      const avgProjectValue = projectCount > 0 ? totalRevenue / projectCount : 0
      
      // Calculate relationship duration in months
      const firstProject = clientProjects
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]
      const relationshipMonths = firstProject 
        ? Math.max(1, Math.floor((Date.now() - new Date(firstProject.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 0

      return {
        id: client.id,
        name: client.name,
        company: client.company,
        totalRevenue,
        totalCost,
        netProfit: totalRevenue - totalCost,
        profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
        projectCount,
        avgProjectValue,
        relationshipMonths,
        monthlyValue: relationshipMonths > 0 ? totalRevenue / relationshipMonths : 0,
      }
    })
    .filter(c => c.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)

    return clientData
  }, [])
}

// Heatmap Cell Component
function HeatmapCell({ value, maxValue }: { value: number; maxValue: number }) {
  const intensity = Math.min(Math.abs(value) / maxValue, 1)
  const isPositive = value >= 0
  
  const getColor = () => {
    if (value === 0) return "bg-muted"
    if (isPositive) {
      if (intensity > 0.7) return "bg-emerald-500 text-white"
      if (intensity > 0.4) return "bg-emerald-400 text-white"
      return "bg-emerald-300 text-emerald-900"
    } else {
      if (intensity > 0.7) return "bg-red-500 text-white"
      if (intensity > 0.4) return "bg-red-400 text-white"
      return "bg-red-300 text-red-900"
    }
  }

  return (
    <div className={`w-12 h-10 flex items-center justify-center text-xs font-medium rounded ${getColor()}`}>
      {value > 0 ? "+" : ""}{(value / 1000).toFixed(1)}k
    </div>
  )
}

// Developer Heatmap
function DevROIHeatmap({ data, months }: { data: ReturnType<typeof useDevROIData>["devMonthlyData"]; months: string[] }) {
  const maxProfit = Math.max(...data.flatMap(d => d.monthlyData.map(m => Math.abs(m.profit))))

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left p-2 text-sm font-medium text-muted-foreground">Developer</th>
            {months.map(month => (
              <th key={month} className="p-2 text-sm font-medium text-muted-foreground text-center">
                {month}
              </th>
            ))}
            <th className="p-2 text-sm font-medium text-muted-foreground text-center">Avg</th>
            <th className="p-2 text-sm font-medium text-muted-foreground text-center">ROI</th>
          </tr>
        </thead>
        <tbody>
          {data.map(dev => (
            <tr key={dev.id} className="border-t border-muted/50">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ backgroundColor: dev.teamColor + "30", color: dev.teamColor }}>
                      {dev.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-1">
                      {dev.name}
                      {dev.isGolden && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                    </div>
                    <div className="text-xs text-muted-foreground">{dev.role}</div>
                  </div>
                </div>
              </td>
              {dev.monthlyData.map((monthData, i) => (
                <td key={i} className="p-1 text-center">
                  <HeatmapCell value={monthData.profit} maxValue={maxProfit} />
                </td>
              ))}
              <td className="p-2 text-center">
                <div className={`font-mono text-sm font-medium ${dev.averageProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  ${dev.averageProfit.toLocaleString()}
                </div>
              </td>
              <td className="p-2 text-center">
                <Badge variant={dev.roi > 50 ? "default" : dev.roi > 0 ? "secondary" : "destructive"}>
                  {dev.roi > 0 ? "+" : ""}{dev.roi.toFixed(0)}%
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Client LTV Card
function ClientLTVCard({ client }: { client: ReturnType<typeof useClientLTVData>[0] }) {
  return (
    <div className="p-4 rounded-lg border hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold">{client.name}</div>
          <div className="text-sm text-muted-foreground">{client.company}</div>
        </div>
        <Badge variant={client.profitMargin > 30 ? "default" : client.profitMargin > 10 ? "secondary" : "destructive"}>
          {client.profitMargin.toFixed(0)}% margin
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Total Revenue</div>
          <div className="font-mono font-semibold text-emerald-600">
            ${client.totalRevenue.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Net Profit</div>
          <div className={`font-mono font-semibold ${client.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            ${client.netProfit.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Projects</div>
          <div className="font-semibold">{client.projectCount}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Avg Value</div>
          <div className="font-mono font-semibold">${client.avgProjectValue.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {client.relationshipMonths} months together
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">~</span>
          <span className="font-mono font-medium">${client.monthlyValue.toLocaleString()}</span>
          <span className="text-muted-foreground">/mo</span>
        </div>
      </div>
    </div>
  )
}

export default function EfficiencyROIPage() {
  const [period, setPeriod] = useState("6months")
  const { devMonthlyData, months } = useDevROIData()
  const techStackData = useTechStackData()
  const clientLTVData = useClientLTVData()

  const chartConfig = {
    margin: {
      label: "Margin %",
      color: "#3B82F6",
    },
  }

  // Summary stats
  const goldenAntelopes = devMonthlyData.filter(d => d.isGolden).length
  const expensivePassengers = devMonthlyData.filter(d => d.isPassenger).length
  const avgTeamROI = devMonthlyData.reduce((sum, d) => sum + d.roi, 0) / devMonthlyData.length

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Efficiency & ROI</h1>
              <p className="text-muted-foreground">Breaking down the business to atoms</p>
            </div>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Golden Antelopes</p>
                  <p className="text-2xl font-bold">{goldenAntelopes}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                High-profit generators (&gt;$3k/mo)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Users className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expensive Passengers</p>
                  <p className="text-2xl font-bold">{expensivePassengers}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Low-profit contributors (&lt;$500/mo)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Team ROI</p>
                  <p className="text-2xl font-bold">{avgTeamROI.toFixed(0)}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Revenue over cost ratio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Code2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Stack</p>
                  <p className="text-2xl font-bold">{techStackData[0]?.name || "-"}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {techStackData[0]?.margin || 0}% profit margin
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Developer ROI Heatmap */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Dev ROI / Profitability Heatmap
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Shows net profit generated by each developer (Revenue from their projects minus their cost)</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Monthly profit contribution per developer</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-emerald-500" />
                  <span>High Profit</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span>Loss</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DevROIHeatmap data={devMonthlyData} months={months} />
          </CardContent>
        </Card>

        {/* Tech Stack & Client LTV */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tech Stack Profitability Radar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Tech Stack Profitability
              </CardTitle>
              <CardDescription>Profit margins by technology stack</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={techStackData}>
                    <PolarGrid className="stroke-muted" />
                    <PolarAngleAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                    />
                    <Radar
                      name="Margin %"
                      dataKey="margin"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const data = payload[0].payload
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-md">
                            <div className="font-medium">{data.name}</div>
                            <div className="mt-1 space-y-1 text-sm">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Margin:</span>
                                <span className="font-mono">{data.margin}%</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Revenue:</span>
                                <span className="font-mono">${data.revenue.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Projects:</span>
                                <span>{data.projects}</span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* Bar chart below for comparison */}
              <div className="mt-4 space-y-2">
                {techStackData.slice(0, 5).map((stack, i) => (
                  <div key={stack.name} className="flex items-center gap-3">
                    <div className="w-20 text-sm font-medium truncate">{stack.name}</div>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          stack.margin > 40 ? "bg-emerald-500" :
                          stack.margin > 20 ? "bg-blue-500" :
                          stack.margin > 0 ? "bg-amber-500" :
                          "bg-red-500"
                        }`}
                        style={{ width: `${Math.max(0, stack.margin)}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-sm font-mono">
                      {stack.margin}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Conclusion */}
              {techStackData.length > 0 && techStackData[techStackData.length - 1].margin < 15 && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <Info className="h-4 w-4" />
                    Consider phasing out {techStackData[techStackData.length - 1].name} projects - only {techStackData[techStackData.length - 1].margin}% margin
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client LTV */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Client LTV (Lifetime Value)
              </CardTitle>
              <CardDescription>Total value and profitability per client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {clientLTVData.map((client, i) => (
                  <div key={client.id}>
                    {i === 0 && (
                      <Badge variant="secondary" className="mb-2 gap-1">
                        <Crown className="h-3 w-3" />
                        Top Client
                      </Badge>
                    )}
                    <ClientLTVCard client={client} />
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">
                      ${clientLTVData.reduce((sum, c) => sum + c.totalRevenue, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Client Revenue</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      ${Math.round(clientLTVData.reduce((sum, c) => sum + c.totalRevenue, 0) / clientLTVData.length).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Client Value</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
