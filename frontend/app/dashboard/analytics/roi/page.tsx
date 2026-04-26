"use client"

import { useEffect, useMemo, useState } from "react"
import { TrendingUp, Users, Code2, Crown, Info, Star } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  workforceApi,
  type ApiClient,
  type ApiDeveloper,
  type ApiInvoice,
  type ApiProject,
} from "@/lib/api/workforce"

const MONTHS_TO_SHOW = 6
const MONTHLY_HOURS = 160

const fmtUsd = (v: number) =>
  new Intl.NumberFormat("uk-UA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

function getRecentMonths(count: number) {
  const now = new Date()
  return Array.from({ length: count }, (_, idx) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - idx - 1), 1))
    return {
      key: monthKey(d),
      label: d.toLocaleDateString("uk-UA", { month: "short" }),
    }
  })
}

function HeatmapCell({ value, maxValue }: { value: number; maxValue: number }) {
  const intensity = maxValue > 0 ? Math.min(Math.abs(value) / maxValue, 1) : 0
  const isPositive = value >= 0
  const cls =
    value === 0
      ? "bg-muted"
      : isPositive
        ? intensity > 0.7
          ? "bg-emerald-500 text-white"
          : intensity > 0.4
            ? "bg-emerald-400 text-white"
            : "bg-emerald-300 text-emerald-900"
        : intensity > 0.7
          ? "bg-red-500 text-white"
          : intensity > 0.4
            ? "bg-red-400 text-white"
            : "bg-red-300 text-red-900"

  return <div className={`w-12 h-10 flex items-center justify-center text-xs font-medium rounded ${cls}`}>{value > 0 ? "+" : ""}{(value / 1000).toFixed(1)}k</div>
}

export default function EfficiencyROIPage() {
  const [period, setPeriod] = useState("6months")
  const [developers, setDevelopers] = useState<ApiDeveloper[]>([])
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [clients, setClients] = useState<ApiClient[]>([])
  const [invoices, setInvoices] = useState<ApiInvoice[]>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [devs, projs, cls, inv] = await Promise.all([
          workforceApi.listDevelopers(),
          workforceApi.listProjects(),
          workforceApi.listClients(),
          workforceApi.listInvoices(),
        ])
        if (!mounted) return
        setDevelopers(devs)
        setProjects(projs)
        setClients(cls)
        setInvoices(inv)
      } catch {
        if (!mounted) return
        setDevelopers([])
        setProjects([])
        setClients([])
        setInvoices([])
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [])

  const recentMonths = useMemo(() => getRecentMonths(MONTHS_TO_SHOW), [])

  const paidInvoicesByMonth = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const invoice of invoices) {
      if (invoice.status !== "paid") continue
      const raw = invoice.paid_date ?? invoice.issue_date
      const key = monthKey(new Date(raw))
      totals[key] = (totals[key] ?? 0) + Number.parseFloat(invoice.amount ?? "0")
    }
    return totals
  }, [invoices])

  const devMonthlyData = useMemo(() => {
    const activeDevs = developers.filter((d) => d.is_active)
    const totalUtilization = activeDevs.reduce(
      (sum, dev) => sum + Math.max(0, dev.teams.reduce((acc, team) => acc + Number(team.allocation), 0)),
      0
    )

    return activeDevs.map((dev) => {
      const utilization = Math.min(100, dev.teams.reduce((acc, team) => acc + Number(team.allocation), 0))
      const monthlyCost = Number.parseFloat(dev.hourly_rate ?? "0") * MONTHLY_HOURS
      const share = totalUtilization > 0 ? utilization / totalUtilization : 0

      const monthlyData = recentMonths.map((month) => {
        const revenue = (paidInvoicesByMonth[month.key] ?? 0) * share
        return {
          month: month.label,
          revenue,
          profit: revenue - monthlyCost,
        }
      })

      const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0)
      const totalCost = monthlyCost * monthlyData.length
      const avgProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0) / (monthlyData.length || 1)
      const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0

      return {
        id: dev.id,
        name: dev.full_name,
        role: dev.role,
        monthlyData,
        averageProfit: avgProfit,
        roi,
        utilization,
        isGolden: avgProfit > 3000,
        isPassenger: avgProfit < 500,
      }
    })
  }, [developers, recentMonths, paidInvoicesByMonth])

  const maxProfitAbs = useMemo(
    () => Math.max(1, ...devMonthlyData.flatMap((dev) => dev.monthlyData.map((m) => Math.abs(m.profit)))),
    [devMonthlyData]
  )

  const billingModelData = useMemo(() => {
    const groups: Record<string, { revenue: number; cost: number; count: number }> = {}
    for (const project of projects) {
      const key = project.billing_model === "time-materials" ? "Час і матеріали" : "Фіксована ціна"
      if (!groups[key]) groups[key] = { revenue: 0, cost: 0, count: 0 }
      groups[key].revenue += Number.parseFloat(project.revenue ?? "0")
      groups[key].cost += Number.parseFloat(project.labor_cost ?? "0") + Number.parseFloat(project.direct_overheads ?? "0")
      groups[key].count += 1
    }

    return Object.entries(groups).map(([name, stats]) => ({
      name,
      margin: stats.revenue > 0 ? Math.round(((stats.revenue - stats.cost) / stats.revenue) * 100) : 0,
      revenue: Math.round(stats.revenue),
      projects: stats.count,
      fullMark: 100,
    }))
  }, [projects])

  const clientLTVData = useMemo(() => {
    return clients
      .map((client) => {
        const clientProjects = projects.filter((p) => p.client === client.id)
        const totalRevenue = clientProjects.reduce((sum, p) => sum + Number.parseFloat(p.revenue ?? "0"), 0)
        const totalCost = clientProjects.reduce(
          (sum, p) => sum + Number.parseFloat(p.labor_cost ?? "0") + Number.parseFloat(p.direct_overheads ?? "0"),
          0
        )
        const projectCount = clientProjects.length
        const avgProjectValue = projectCount > 0 ? totalRevenue / projectCount : 0

        const firstDate = clientProjects
          .map((p) => new Date(p.start_date))
          .filter((d) => !Number.isNaN(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime())[0]

        const relationshipMonths = firstDate
          ? Math.max(1, Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
          : 0

        return {
          id: client.id,
          name: client.name,
          company: client.company,
          totalRevenue,
          netProfit: totalRevenue - totalCost,
          profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
          projectCount,
          avgProjectValue,
          relationshipMonths,
          monthlyValue: relationshipMonths > 0 ? totalRevenue / relationshipMonths : 0,
        }
      })
      .filter((c) => c.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [clients, projects])

  const goldenAntelopes = devMonthlyData.filter((d) => d.isGolden).length
  const expensivePassengers = devMonthlyData.filter((d) => d.isPassenger).length
  const avgTeamROI = devMonthlyData.length
    ? devMonthlyData.reduce((sum, d) => sum + d.roi, 0) / devMonthlyData.length
    : 0

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold">Ефективність і ROI</h1><p className="text-muted-foreground">На основі актуальних даних команди та фінансів</p></div></div>
          <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="3months">3 місяці</SelectItem><SelectItem value="6months">6 місяців</SelectItem><SelectItem value="year">Цей рік</SelectItem></SelectContent></Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Star className="h-5 w-5 text-amber-500 fill-amber-500" /></div><div><p className="text-sm text-muted-foreground">Золоті антилопи</p><p className="text-2xl font-bold">{goldenAntelopes}</p></div></div><p className="text-xs text-muted-foreground mt-2">Сер. прибуток &gt; 3 тис. $/міс</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-red-500/10"><Users className="h-5 w-5 text-red-500" /></div><div><p className="text-sm text-muted-foreground">Дорогі пасажири</p><p className="text-2xl font-bold">{expensivePassengers}</p></div></div><p className="text-xs text-muted-foreground mt-2">Сер. прибуток &lt; 500 $/міс</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><TrendingUp className="h-5 w-5 text-blue-500" /></div><div><p className="text-sm text-muted-foreground">Середній ROI команди</p><p className="text-2xl font-bold">{avgTeamROI.toFixed(0)}%</p></div></div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Code2 className="h-5 w-5 text-emerald-500" /></div><div><p className="text-sm text-muted-foreground">Найкраща модель</p><p className="text-2xl font-bold">{billingModelData[0]?.name || "-"}</p></div></div><p className="text-xs text-muted-foreground mt-2">{billingModelData[0]?.margin || 0}% маржа</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">ROI розробників / Теплокарта прибутковості<Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>Розподіл доходу базується на частці активної завантаженості та оплачених інвойсах за місяць.</TooltipContent></Tooltip></CardTitle><CardDescription>Останні {MONTHS_TO_SHOW} місяців</CardDescription></CardHeader>
          <CardContent>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="text-left p-2 text-sm font-medium text-muted-foreground">Розробник</th>{recentMonths.map((m) => <th key={m.key} className="p-2 text-sm font-medium text-muted-foreground text-center">{m.label}</th>)}<th className="p-2 text-sm font-medium text-muted-foreground text-center">Сер.</th><th className="p-2 text-sm font-medium text-muted-foreground text-center">ROI</th></tr></thead><tbody>{devMonthlyData.map((dev) => <tr key={dev.id} className="border-t border-muted/50"><td className="p-2"><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback>{dev.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar><div><div className="font-medium text-sm flex items-center gap-1">{dev.name}{dev.isGolden && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}</div><div className="text-xs text-muted-foreground">{dev.role}</div></div></div></td>{dev.monthlyData.map((m) => <td key={`${dev.id}-${m.month}`} className="p-1 text-center"><HeatmapCell value={m.profit} maxValue={maxProfitAbs} /></td>)}<td className="p-2 text-center"><div className={`font-mono text-sm font-medium ${dev.averageProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtUsd(dev.averageProfit)}</div></td><td className="p-2 text-center"><Badge variant={dev.roi > 50 ? "default" : dev.roi > 0 ? "secondary" : "destructive"}>{dev.roi > 0 ? "+" : ""}{dev.roi.toFixed(0)}%</Badge></td></tr>)}</tbody></table></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Code2 className="h-5 w-5" />Прибутковість delivery-моделей</CardTitle><CardDescription>Маржа за моделями білінгу з актуальних проєктів</CardDescription></CardHeader>
            <CardContent>
              <ChartContainer config={{ margin: { label: "Маржа %", color: "#3B82F6" } }} className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart data={billingModelData}><PolarGrid className="stroke-muted" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} /><Radar name="Маржа %" dataKey="margin" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} strokeWidth={2} /><ChartTooltip content={({ active, payload }) => { if (!active || !payload?.length) return null; const data = payload[0].payload; return <div className="rounded-lg border bg-background p-3 shadow-md"><div className="font-medium">{data.name}</div><div className="mt-1 space-y-1 text-sm"><div className="flex justify-between gap-4"><span className="text-muted-foreground">Маржа:</span><span className="font-mono">{data.margin}%</span></div><div className="flex justify-between gap-4"><span className="text-muted-foreground">Дохід:</span><span className="font-mono">{fmtUsd(data.revenue)}</span></div></div></div> }} /></RadarChart></ResponsiveContainer></ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5" />LTV клієнтів</CardTitle><CardDescription>Розраховано з актуальних даних клієнтів і проєктів</CardDescription></CardHeader>
            <CardContent><div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">{clientLTVData.map((client, i) => <div key={client.id} className="p-4 rounded-lg border">{i === 0 && <Badge variant="secondary" className="mb-2 gap-1"><Crown className="h-3 w-3" />Топ-клієнт</Badge>}<div className="flex items-start justify-between mb-3"><div><div className="font-semibold">{client.name}</div><div className="text-sm text-muted-foreground">{client.company}</div></div><Badge variant={client.profitMargin > 30 ? "default" : client.profitMargin > 10 ? "secondary" : "destructive"}>{client.profitMargin.toFixed(0)}% маржа</Badge></div><div className="grid grid-cols-2 gap-4 text-sm"><div><div className="text-muted-foreground">Загальний дохід</div><div className="font-mono font-semibold text-emerald-600">{fmtUsd(client.totalRevenue)}</div></div><div><div className="text-muted-foreground">Чистий прибуток</div><div className={`font-mono font-semibold ${client.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtUsd(client.netProfit)}</div></div><div><div className="text-muted-foreground">Проєкти</div><div className="font-semibold">{client.projectCount}</div></div><div><div className="text-muted-foreground">Сер. чек</div><div className="font-mono font-semibold">{fmtUsd(client.avgProjectValue)}</div></div></div><div className="mt-3 pt-3 border-t flex items-center justify-between"><div className="text-xs text-muted-foreground">{client.relationshipMonths} міс. разом</div><div className="text-xs"><span className="text-muted-foreground">~</span><span className="font-mono font-medium">{fmtUsd(client.monthlyValue)}</span><span className="text-muted-foreground">/міс</span></div></div></div>)}</div></CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}
