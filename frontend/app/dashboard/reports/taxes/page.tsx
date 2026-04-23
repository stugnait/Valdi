"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  Calculator,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  Percent,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { ApiInvoice, ApiTaxReport, workforceApi } from "@/lib/api/workforce"

// FOP tax constants for Ukraine (2024)
const TAX_RATE_EP = 0.05 // 5% Yedyny Podatok (Single Tax) for Group 3
const ESV_RATE = 0.22 // 22% ESV (Social Contribution)
const MIN_WAGE_2024 = 7100 // Minimum wage in UAH for ESV calculation
const ESV_MONTHLY = MIN_WAGE_2024 * ESV_RATE // ESV per month

interface QuarterData {
  quarter: string
  income: number
  taxEP: number
  esvPaid: number
  totalDue: number
  paidDate: string | null
  status: "paid" | "pending" | "overdue"
}

interface MonthlyIncome {
  month: string
  income: number
  invoices: number
}

// Exchange rate UAH/USD
const UAH_USD_RATE = 41.5

export default function TaxReportsPage() {
  const [selectedYear, setSelectedYear] = useState("2024")
  const [selectedQuarter, setSelectedQuarter] = useState("Q2")
  const [invoices, setInvoices] = useState<ApiInvoice[]>([])
  const [taxReports, setTaxReports] = useState<ApiTaxReport[]>([])

  useEffect(() => {
    const load = async () => {
      const [invoicesResponse, taxReportsResponse] = await Promise.all([
        workforceApi.listInvoices(),
        workforceApi.listTaxReports(),
      ])
      setInvoices(invoicesResponse)
      setTaxReports(taxReportsResponse)
    }
    load()
  }, [])

  const mockMonthlyIncome: MonthlyIncome[] = useMemo(() => {
    const monthlyMap = new Map<string, { income: number; invoices: number }>()
    invoices
      .filter(invoice => invoice.status === "paid" && invoice.paid_date && invoice.paid_date.startsWith(selectedYear))
      .forEach(invoice => {
        const month = invoice.paid_date!.slice(0, 7)
        const current = monthlyMap.get(month) ?? { income: 0, invoices: 0 }
        monthlyMap.set(month, { income: current.income + Number(invoice.amount), invoices: current.invoices + 1 })
      })
    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, income: values.income, invoices: values.invoices }))
  }, [invoices, selectedYear])

  const mockQuarters: QuarterData[] = useMemo(
    () =>
      taxReports
        .filter(report => String(report.year) === selectedYear)
        .map(report => ({
          quarter: `Q${report.quarter} ${report.year}`,
          income: Number(report.income),
          taxEP: Number(report.tax_ep),
          esvPaid: Number(report.esv_paid),
          totalDue: Number(report.total_due),
          paidDate: report.paid_date,
          status: report.status,
        })),
    [taxReports, selectedYear]
  )

  // Calculate totals
  const totalIncomeYTD = mockMonthlyIncome.reduce((sum, m) => sum + m.income, 0)
  const totalTaxEP = totalIncomeYTD * TAX_RATE_EP
  const monthsWorked = mockMonthlyIncome.length
  const totalESV = monthsWorked * ESV_MONTHLY
  const totalDue = totalTaxEP + totalESV
  const totalPaid = mockQuarters
    .filter(q => q.status === "paid")
    .reduce((sum, q) => sum + q.totalDue, 0)
  const remainingDue = totalDue - totalPaid

  // Current quarter progress
  const currentQuarter = mockQuarters.find(q => q.status === "pending")
  const quarterProgress = currentQuarter 
    ? (currentQuarter.income / (totalIncomeYTD / 2)) * 100 // estimate
    : 0

  const handleExportCSV = () => {
    // In production, this would generate and download a CSV file
    const csvContent = [
      ["Month", "Income (UAH)", "Income (USD)", "Tax 5% (UAH)", "ESV (UAH)"],
      ...mockMonthlyIncome.map(m => [
        m.month,
        m.income,
        Math.round(m.income / UAH_USD_RATE),
        Math.round(m.income * TAX_RATE_EP),
        ESV_MONTHLY
      ])
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tax-report-${selectedYear}-${selectedQuarter}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tax Reports</h1>
          <p className="text-sm text-muted-foreground">
            FOP Group 3 tax calculations and reporting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income YTD</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">&#8372;{totalIncomeYTD.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${Math.round(totalIncomeYTD / UAH_USD_RATE).toLocaleString()} USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Due (5% EP)</CardTitle>
            <Percent className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">&#8372;{Math.round(totalTaxEP).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              5% of total income
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ESV Due</CardTitle>
            <Coins className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">&#8372;{Math.round(totalESV).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {monthsWorked} months x &#8372;{ESV_MONTHLY.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className={remainingDue > 0 ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/50"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining to Pay</CardTitle>
            {remainingDue > 0 ? (
              <AlertTriangle className="size-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remainingDue > 0 ? "text-amber-700" : "text-emerald-700"}`}>
              &#8372;{Math.round(remainingDue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Until end of {selectedQuarter} {selectedYear}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Estimator */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="size-5" />
                Tax Estimator
              </CardTitle>
              <CardDescription>
                Automatic calculation based on received payments
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Calculations based on FOP Group 3 rates: 5% EP (Single Tax) + ESV (22% of min wage = &#8372;{ESV_MONTHLY.toLocaleString()}/month)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly Breakdown */}
            <div>
              <h4 className="text-sm font-medium mb-4">Monthly Income Breakdown</h4>
              <div className="space-y-3">
                {mockMonthlyIncome.map(month => {
                  const tax = month.income * TAX_RATE_EP
                  return (
                    <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {new Date(month.month + "-01").toLocaleDateString("uk-UA", { month: "long", year: "numeric" })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {month.invoices} invoices
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">&#8372;{month.income.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          Tax: &#8372;{Math.round(tax).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Tax Calculation Summary</h4>
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Income</span>
                  <span className="font-medium">&#8372;{totalIncomeYTD.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">5% Single Tax (EP)</span>
                  <span className="font-medium">&#8372;{Math.round(totalTaxEP).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ESV ({monthsWorked} months)</span>
                  <span className="font-medium">&#8372;{Math.round(totalESV).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total Due</span>
                  <span className="font-bold">&#8372;{Math.round(totalDue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Already Paid</span>
                  <span className="font-medium">- &#8372;{totalPaid.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Remaining</span>
                  <span className={`font-bold ${remainingDue > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    &#8372;{Math.round(remainingDue).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="size-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Next Payment Deadline</p>
                    <p className="text-blue-600">
                      Q2 2024 taxes due by July 19, 2024
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quarterly Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
                Quarterly Summary
              </CardTitle>
              <CardDescription>
                Tax payments by quarter
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
              <FileSpreadsheet className="size-4" />
              Export for Accountant
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quarter</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Tax 5%</TableHead>
                <TableHead className="text-right">ESV</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockQuarters.map(quarter => (
                <TableRow key={quarter.quarter}>
                  <TableCell className="font-medium">{quarter.quarter}</TableCell>
                  <TableCell className="text-right">&#8372;{quarter.income.toLocaleString()}</TableCell>
                  <TableCell className="text-right">&#8372;{quarter.taxEP.toLocaleString()}</TableCell>
                  <TableCell className="text-right">&#8372;{Math.round(quarter.esvPaid).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">&#8372;{Math.round(quarter.totalDue).toLocaleString()}</TableCell>
                  <TableCell>
                    {quarter.status === "paid" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 gap-1">
                        <CheckCircle2 className="size-3" />
                        Paid {quarter.paidDate && new Date(quarter.paidDate).toLocaleDateString("uk-UA")}
                      </Badge>
                    ) : quarter.status === "pending" ? (
                      <Badge className="bg-amber-100 text-amber-800">
                        Pending
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 gap-1">
                        <AlertTriangle className="size-3" />
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Current Quarter Progress */}
      {currentQuarter && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Quarter Progress</CardTitle>
            <CardDescription>
              {currentQuarter.quarter} - Estimated based on current income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Income Progress</span>
                <span className="font-medium">
                  &#8372;{currentQuarter.income.toLocaleString()} / ~&#8372;{Math.round(totalIncomeYTD / 2).toLocaleString()} (estimated)
                </span>
              </div>
              <Progress value={Math.min(quarterProgress, 100)} className="h-2" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Tax Due</div>
                  <div className="font-bold text-lg">&#8372;{currentQuarter.taxEP.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">ESV Due</div>
                  <div className="font-bold text-lg">&#8372;{Math.round(currentQuarter.esvPaid).toLocaleString()}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm text-amber-700">Total to Pay</div>
                  <div className="font-bold text-lg text-amber-800">&#8372;{Math.round(currentQuarter.totalDue).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
