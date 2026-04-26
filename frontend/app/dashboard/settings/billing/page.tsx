"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, CreditCard, Calendar, Receipt } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  workforceApi,
  type ApiInvoice,
  type ApiSubscription,
  type ApiSubscriptionPayment,
} from "@/lib/api/workforce"

const formatDate = (dateString: string | null) =>
  dateString
    ? new Date(dateString).toLocaleDateString("uk-UA", { year: "numeric", month: "long", day: "numeric" })
    : "-"

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("uk-UA", { style: "currency", currency: currency || "USD" }).format(amount)

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<ApiSubscription[]>([])
  const [invoices, setInvoices] = useState<ApiInvoice[]>([])
  const [payments, setPayments] = useState<ApiSubscriptionPayment[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [subscriptionsPayload, invoicesPayload, paymentsPayload] = await Promise.all([
          workforceApi.listSubscriptions(),
          workforceApi.listInvoices(),
          workforceApi.listSubscriptionPayments(),
        ])
        if (!mounted) return
        setSubscriptions(subscriptionsPayload)
        setInvoices(invoicesPayload)
        setPayments(paymentsPayload)
        setLoadError(null)
      } catch (error) {
        if (!mounted) return
        setLoadError(error instanceof Error ? error.message : "Unable to load billing data")
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const activeSubscription = useMemo(
    () => subscriptions.find((item) => item.status === "active") ?? subscriptions[0] ?? null,
    [subscriptions]
  )

  const mrr = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === "active")
        .reduce((sum, s) => sum + Number.parseFloat(String(s.amount ?? 0)), 0),
    [subscriptions]
  )

  return (
    <div className="space-y-6">
      {loadError ? (
        <Alert variant="destructive">
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Оплата та підписка</h1>
        <p className="text-sm text-muted-foreground">Дані завантажуються напряму з backend subscriptions/invoices/payments.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Поточний план</CardTitle><CreditCard className="size-4 text-muted-foreground" /></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscription?.plan_name || "—"}</div>
            <p className="text-xs text-muted-foreground">{activeSubscription ? `${activeSubscription.billing_cycle} • ${activeSubscription.currency}` : "Немає активної підписки"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">MRR</CardTitle><Receipt className="size-4 text-muted-foreground" /></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mrr, activeSubscription?.currency || "USD")}</div>
            <p className="text-xs text-muted-foreground">Сума активних підписок за місяць</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Наступний білінг</CardTitle><Calendar className="size-4 text-muted-foreground" /></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(activeSubscription?.next_billing_date ?? null)}</div>
            <p className="text-xs text-muted-foreground">Дата наступного списання</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Підписки</CardTitle><CardDescription>Реєстр з endpoint `/api/subscriptions/`</CardDescription></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Клієнт</TableHead><TableHead>План</TableHead><TableHead>Сума</TableHead><TableHead>Статус</TableHead><TableHead>Next billing</TableHead></TableRow></TableHeader><TableBody>{subscriptions.map((subscription) => <TableRow key={subscription.id}><TableCell>{subscription.client_name}</TableCell><TableCell>{subscription.plan_name}</TableCell><TableCell>{formatCurrency(Number.parseFloat(String(subscription.amount ?? 0)), subscription.currency)}</TableCell><TableCell><Badge variant={subscription.status === "active" ? "default" : "secondary"}>{subscription.status}</Badge></TableCell><TableCell>{formatDate(subscription.next_billing_date)}</TableCell></TableRow>)}{subscriptions.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Немає підписок.</TableCell></TableRow> : null}</TableBody></Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Інвойси</CardTitle><CardDescription>Реєстр з endpoint `/api/invoices/`</CardDescription></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Номер</TableHead><TableHead>Сума</TableHead><TableHead>Статус</TableHead><TableHead className="text-right">Дії</TableHead></TableRow></TableHeader><TableBody>{invoices.map((invoice) => <TableRow key={invoice.id}><TableCell>{formatDate(invoice.issue_date)}</TableCell><TableCell className="font-mono text-sm">{invoice.number}</TableCell><TableCell>{formatCurrency(Number.parseFloat(invoice.amount), invoice.currency)}</TableCell><TableCell><Badge variant={invoice.status === "paid" ? "default" : invoice.status === "overdue" ? "destructive" : "secondary"}>{invoice.status}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm"><Download className="size-4 mr-2" />PDF</Button></TableCell></TableRow>)}{invoices.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Немає інвойсів.</TableCell></TableRow> : null}</TableBody></Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Платежі підписок</CardTitle><CardDescription>Реєстр з endpoint `/api/subscription-payments/`</CardDescription></CardHeader>
        <CardContent>
          <Table><TableHeader><TableRow><TableHead>Клієнт</TableHead><TableHead>Invoice #</TableHead><TableHead>Сума</TableHead><TableHead>Статус</TableHead><TableHead>Due date</TableHead></TableRow></TableHeader><TableBody>{payments.map((payment) => <TableRow key={payment.id}><TableCell>{payment.client_name}</TableCell><TableCell>{payment.invoice_number}</TableCell><TableCell>{formatCurrency(Number.parseFloat(String(payment.amount ?? 0)), payment.currency)}</TableCell><TableCell><Badge variant={payment.status === "completed" ? "default" : payment.status === "failed" ? "destructive" : "secondary"}>{payment.status}</Badge></TableCell><TableCell>{formatDate(payment.due_date)}</TableCell></TableRow>)}{payments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Немає платежів.</TableCell></TableRow> : null}</TableBody></Table>
        </CardContent>
      </Card>
    </div>
  )
}
