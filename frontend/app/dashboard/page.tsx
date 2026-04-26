"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Users,
  FolderKanban,
  TrendingUp,
  Plus,
  MoreHorizontal,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  workforceApi,
  type ApiDeveloper,
  type ApiInvoice,
  type ApiProject,
  type ApiSubscriptionPayment,
  type ApiVariableExpense,
} from "@/lib/api/workforce"

const formatMoney = (value: number) =>
  new Intl.NumberFormat("uk-UA", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)

const formatRelativeDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<ApiProject[]>([])
  const [developers, setDevelopers] = useState<ApiDeveloper[]>([])
  const [invoices, setInvoices] = useState<ApiInvoice[]>([])
  const [subscriptionPayments, setSubscriptionPayments] = useState<ApiSubscriptionPayment[]>([])
  const [variableExpenses, setVariableExpenses] = useState<ApiVariableExpense[]>([])

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      try {
        const [projectsPayload, developersPayload, invoicesPayload, paymentsPayload, expensesPayload] = await Promise.all([
          workforceApi.listProjects(),
          workforceApi.listDevelopers(),
          workforceApi.listInvoices(),
          workforceApi.listSubscriptionPayments(),
          workforceApi.listVariableExpenses(),
        ])

        if (!mounted) return
        setProjects(projectsPayload)
        setDevelopers(developersPayload)
        setInvoices(invoicesPayload)
        setSubscriptionPayments(paymentsPayload)
        setVariableExpenses(expensesPayload)
      } catch {
        if (!mounted) return
        setProjects([])
        setDevelopers([])
        setInvoices([])
        setSubscriptionPayments([])
        setVariableExpenses([])
      }
    }

    void loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active" || project.status === "lead"),
    [projects]
  )

  const totalRevenue = useMemo(
    () => projects.reduce((sum, project) => sum + Number.parseFloat(project.revenue ?? "0"), 0),
    [projects]
  )

  const paidInvoices = useMemo(() => invoices.filter((invoice) => invoice.status === "paid"), [invoices])

  const invoiceIncome = useMemo(
    () => paidInvoices.reduce((sum, invoice) => sum + Number.parseFloat(invoice.amount ?? "0"), 0),
    [paidInvoices]
  )

  const completedPayments = useMemo(
    () => subscriptionPayments.filter((payment) => payment.status === "completed"),
    [subscriptionPayments]
  )

  const subscriptionIncome = useMemo(
    () => completedPayments.reduce((sum, payment) => sum + Number.parseFloat(String(payment.amount ?? 0)), 0),
    [completedPayments]
  )

  const expensesAmount = useMemo(
    () => variableExpenses.reduce((sum, expense) => sum + Number.parseFloat(expense.amount ?? "0"), 0),
    [variableExpenses]
  )

  const profitMargin = totalRevenue > 0 ? ((totalRevenue - expensesAmount) / totalRevenue) * 100 : 0

  const stats = [
    {
      title: "Загальний дохід",
      value: formatMoney(invoiceIncome + subscriptionIncome),
      change: `${paidInvoices.length + completedPayments.length}`,
      trend: "up",
      icon: DollarSign,
      description: "оплачених транзакцій",
    },
    {
      title: "Активні проєкти",
      value: String(activeProjects.length),
      change: String(projects.length),
      trend: "up",
      icon: FolderKanban,
      description: "всього проєктів",
    },
    {
      title: "Команда",
      value: String(developers.filter((item) => item.is_active).length),
      change: String(developers.length),
      trend: "up",
      icon: Users,
      description: "всього учасників",
    },
    {
      title: "Маржинальність",
      value: `${profitMargin.toFixed(1)}%`,
      change: formatMoney(expensesAmount),
      trend: profitMargin >= 0 ? "up" : "down",
      icon: TrendingUp,
      description: "змінні витрати",
    },
  ]

  const recentProjects = activeProjects.slice(0, 4).map((project) => {
    const revenue = Number.parseFloat(project.revenue ?? "0")
    const laborCost = Number.parseFloat(project.labor_cost ?? "0")
    const budget = Number.parseFloat(project.total_contract_value ?? project.revenue ?? "0")
    const spent = revenue > 0 ? Math.max(0, Math.min(100, Math.round((laborCost / revenue) * 100))) : 0

    return {
      name: project.name,
      client: project.client_name,
      budget: formatMoney(budget),
      spent,
      status: project.status,
      team: developers
        .filter((developer) => developer.teams.some((team) => team.id === project.id))
        .slice(0, 4)
        .map((developer) => developer.full_name),
    }
  })

  const recentTransactions = [
    ...paidInvoices.map((invoice) => ({
      description: `Інвойс №${invoice.number} — ${invoice.client_name}`,
      amount: `+${formatMoney(Number.parseFloat(invoice.amount ?? "0"))}`,
      type: "income",
      date: invoice.paid_date ?? invoice.issue_date,
    })),
    ...completedPayments.map((payment) => ({
      description: `Підписка — ${payment.client_name}`,
      amount: `+${formatMoney(Number.parseFloat(String(payment.amount ?? 0)))}`,
      type: "income",
      date: payment.payment_date ?? payment.due_date,
    })),
    ...variableExpenses.map((expense) => ({
      description: `${expense.source.toUpperCase()} — ${expense.name}`,
      amount: `-${formatMoney(Number.parseFloat(expense.amount ?? "0"))}`,
      type: "expense",
      date: expense.expense_date,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const topEarners = developers
    .filter((developer) => developer.is_active)
    .map((developer) => ({
      name: developer.full_name,
      role: developer.role,
      revenue: formatMoney(Number.parseFloat(developer.hourly_rate ?? "0")),
      utilization: Math.min(
        100,
        Math.round(developer.teams.reduce((sum, team) => sum + Number(team.allocation), 0))
      ),
    }))
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Дашборд</h1>
          <p className="text-sm text-muted-foreground">Огляд фінансів та операцій вашого агентства</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Clock className="mr-2 size-4" />
            Поточні дані
          </Button>
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            Нова транзакція
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs">
                  {stat.trend === "up" ? (
                    <span className="flex items-center text-emerald-600">
                      <ArrowUpRight className="size-3" />
                      {stat.change}
                    </span>
                  ) : (
                    <span className="flex items-center text-red-500">
                      <ArrowDownRight className="size-3" />
                      {stat.change}
                    </span>
                  )}
                  <span className="text-muted-foreground">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Активні проєкти</CardTitle>
              <CardDescription>Прогрес та бюджет поточних проєктів</CardDescription>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div key={project.name} className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{project.name}</span>
                      <Badge
                        variant={
                          project.status === "finished"
                            ? "default"
                            : project.status === "lead"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {project.status === "active"
                          ? "В роботі"
                          : project.status === "lead"
                            ? "Лід"
                            : project.status === "paused"
                              ? "Пауза"
                              : "Завершено"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{project.client}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={project.spent} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-16">{project.spent}% витрат</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{project.budget}</p>
                    <div className="mt-2 flex -space-x-2">
                      {project.team.slice(0, 3).map((member, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {member
                              .split(" ")
                              .map((item) => item[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Останні транзакції</CardTitle>
            <CardDescription>Рух коштів за останні дні</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground leading-none">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeDate(tx.date)}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-foreground"}`}
                  >
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Топ заробітчани</CardTitle>
            <CardDescription>Члени команди з найвищою залученістю</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Переглянути всіх
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {topEarners.map((person) => (
              <div key={person.name} className="flex items-center gap-3 rounded-lg border border-border p-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {person.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground leading-none">{person.name}</p>
                  <p className="text-xs text-muted-foreground">{person.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{person.revenue}/год</p>
                  <p className="text-xs text-muted-foreground">{person.utilization}% завантаження</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
