"use client"

import { useEffect, useMemo, useState } from "react"
import { Coffee, Gauge, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { workforceApi, type ApiAnalyticsOverview } from "@/lib/api/workforce"

const formatCurrency = (value: number) => `$${value.toLocaleString()}`
const formatPercent = (value: number) => `${value.toFixed(1)}%`

export default function GlobalHealthPage() {
  const [overview, setOverview] = useState<ApiAnalyticsOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        setIsLoading(true)
        const payload = await workforceApi.getAnalyticsOverview()
        if (!isMounted) return
        setOverview(payload)
        setError(null)
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : "Unable to load analytics")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [])

  const health = overview?.health
  const costStructure = useMemo(() => health?.cost_structure ?? [], [health])

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Coffee className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Global Health</h1>
            <p className="text-muted-foreground">API-driven financial health dashboard</p>
          </div>
        </div>

        {isLoading && <Alert><AlertDescription>Loading analytics overview…</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        {health && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Revenue</p><p className="text-2xl font-bold">{formatCurrency(health.total_revenue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">EBITDA</p><p className="text-2xl font-bold">{formatCurrency(health.ebitda)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Net Profit</p><p className="text-2xl font-bold">{formatCurrency(health.net_profit)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Burn / month</p><p className="text-2xl font-bold">{formatCurrency(health.monthly_burn)}</p></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">Money Flow <Tooltip><TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger><TooltipContent>Data comes from backend analytics endpoint.</TooltipContent></Tooltip></CardTitle>
                  <CardDescription>Sources vs destinations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {health.sankey.sources.map((source) => (
                    <div key={String(source.id)} className="flex items-center justify-between text-sm">
                      <span>{source.name}</span><span className="font-mono">{formatCurrency(source.amount)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t text-sm flex items-center justify-between">
                    <span>Total Income</span><span className="font-mono">{formatCurrency(health.sankey.total_income)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" />Runway</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{health.runway_months.toFixed(1)}</div>
                  <p className="text-sm text-muted-foreground">months</p>
                  <div className="mt-4 text-sm space-y-1">
                    <div className="flex justify-between"><span>Cash</span><span>{formatCurrency(health.current_cash)}</span></div>
                    <div className="flex justify-between"><span>Burn</span><span>{formatCurrency(health.monthly_burn)}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Cost Structure</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {costStructure.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-mono">{formatCurrency(item.amount)} ({formatPercent(item.percent)})</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
