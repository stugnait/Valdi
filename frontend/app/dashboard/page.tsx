"use client"

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

const stats = [
  {
    title: "Загальний дохід",
    value: "$124,560",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    description: "vs попередній місяць",
  },
  {
    title: "Активні проєкти",
    value: "23",
    change: "+3",
    trend: "up",
    icon: FolderKanban,
    description: "в роботі зараз",
  },
  {
    title: "Команда",
    value: "47",
    change: "+2",
    trend: "up",
    icon: Users,
    description: "активних членів",
  },
  {
    title: "Profit Margin",
    value: "34.2%",
    change: "-2.1%",
    trend: "down",
    icon: TrendingUp,
    description: "за цей квартал",
  },
]

const recentProjects = [
  {
    name: "Website Redesign",
    client: "TechCorp Inc.",
    budget: "$45,000",
    spent: 67,
    status: "active",
    team: ["АК", "ОМ", "ІП"],
  },
  {
    name: "Mobile App MVP",
    client: "StartupXYZ",
    budget: "$28,000",
    spent: 89,
    status: "review",
    team: ["ДС", "НК"],
  },
  {
    name: "E-commerce Platform",
    client: "RetailPlus",
    budget: "$85,000",
    spent: 34,
    status: "active",
    team: ["АК", "ІП", "ОМ", "ДС"],
  },
  {
    name: "Brand Identity",
    client: "NewBrand Co.",
    budget: "$12,000",
    spent: 95,
    status: "completed",
    team: ["НК"],
  },
]

const recentTransactions = [
  {
    description: "Stripe — TechCorp Invoice",
    amount: "+$15,000",
    type: "income",
    time: "2 год тому",
  },
  {
    description: "Monobank — Зарплата команди",
    amount: "-$32,400",
    type: "expense",
    time: "Сьогодні",
  },
  {
    description: "Wise — StartupXYZ Payment",
    amount: "+$7,500",
    type: "income",
    time: "Вчора",
  },
  {
    description: "AWS — Серверні витрати",
    amount: "-$1,240",
    type: "expense",
    time: "Вчора",
  },
  {
    description: "Figma — Team subscription",
    amount: "-$75",
    type: "expense",
    time: "3 дні тому",
  },
]

const topEarners = [
  { name: "Олександр К.", role: "Senior Developer", revenue: "$18,500", utilization: 94 },
  { name: "Марія О.", role: "UI/UX Designer", revenue: "$14,200", utilization: 87 },
  { name: "Дмитро С.", role: "Full-stack Dev", revenue: "$16,800", utilization: 91 },
  { name: "Наталія К.", role: "Project Manager", revenue: "$12,400", utilization: 78 },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Огляд фінансів та операцій вашого агентства
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Clock className="mr-2 size-4" />
            Квітень 2026
          </Button>
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            Нова транзакція
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
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

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Projects */}
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
                <div
                  key={project.name}
                  className="flex items-center gap-4 rounded-lg border border-border p-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{project.name}</span>
                      <Badge
                        variant={
                          project.status === "completed"
                            ? "default"
                            : project.status === "review"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {project.status === "active"
                          ? "В роботі"
                          : project.status === "review"
                          ? "На ревʼю"
                          : "Завершено"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{project.client}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={project.spent} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-16">
                        {project.spent}% spent
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{project.budget}</p>
                    <div className="mt-2 flex -space-x-2">
                      {project.team.slice(0, 3).map((member, i) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-background">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {member}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {project.team.length > 3 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                          +{project.team.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
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
                    <p className="text-sm font-medium text-foreground leading-none">
                      {tx.description}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.time}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      tx.type === "income" ? "text-emerald-600" : "text-foreground"
                    }`}
                  >
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Топ заробітчани</CardTitle>
            <CardDescription>Члени команди з найвищим revenue цього місяця</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Переглянути всіх
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {topEarners.map((person) => (
              <div
                key={person.name}
                className="flex items-center gap-3 rounded-lg border border-border p-4"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {person.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground leading-none">
                    {person.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{person.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{person.revenue}</p>
                  <p className="text-xs text-muted-foreground">{person.utilization}% util</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
