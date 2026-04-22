"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react"

const cashFlowData = [
  { month: "Лют", income: 42000, expense: 28000 },
  { month: "Бер", income: 38000, expense: 31000 },
  { month: "Кві", income: 55000, expense: 29000 },
  { month: "Тра", income: 48000, expense: 33000 },
  { month: "Чер", income: 62000, expense: 27000 },
  { month: "Лип", income: 71000, expense: 32000 },
  { month: "Сер", income: 68000, expense: 30000 },
]

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  positive,
}: {
  icon: React.ElementType
  label: string
  value: string
  delta: string
  positive: boolean
}) {
  return (
    <div className="bg-secondary border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-white border border-border flex items-center justify-center">
          <Icon size={14} className="text-muted-foreground" />
        </div>
      </div>
      <span className="text-xl font-bold text-foreground">{value}</span>
      <div className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}>
        {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {delta}
      </div>
    </div>
  )
}

export function DashboardPreview() {
  return (
    <div className="relative rounded-2xl border border-border overflow-hidden shadow-xl shadow-slate-200/60">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 h-9 border-b border-border bg-secondary">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4 h-4 rounded bg-muted text-[10px] text-muted-foreground flex items-center px-2">
          app.vardi.agency/dashboard
        </div>
      </div>

      {/* Dashboard content */}
      <div className="flex h-[420px] md:h-[480px] bg-white">
        {/* Sidebar */}
        <aside className="hidden md:flex w-44 border-r border-border flex-col gap-1 p-3 bg-secondary">
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="text-[9px] font-bold text-white">V</span>
            </div>
            <span className="text-xs font-semibold text-foreground">Vardi</span>
          </div>
          {[
            { label: "Дашборд", active: true },
            { label: "Проекти", active: false },
            { label: "Команда", active: false },
            { label: "Транзакції", active: false },
            { label: "Звіти", active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`text-[11px] px-2 py-1.5 rounded-md transition-colors ${
                item.active
                  ? "bg-accent text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </div>
          ))}
        </aside>

        {/* Main area */}
        <main className="flex-1 overflow-hidden p-4 flex flex-col gap-4 bg-white">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={DollarSign}
              label="Чистий прибуток"
              value="$41,200"
              delta="+18% vs минулий місяць"
              positive
            />
            <StatCard
              icon={TrendingUp}
              label="Маржинальність"
              value="58%"
              delta="+6% за квартал"
              positive
            />
            <StatCard
              icon={Users}
              label="Burn Rate команди"
              value="$28,400"
              delta="-3% за місяць"
              positive
            />
            <StatCard
              icon={TrendingDown}
              label="Дебіторка"
              value="$9,600"
              delta="+12% за тиждень"
              positive={false}
            />
          </div>

          {/* Chart */}
          <div className="flex-1 bg-white border border-border rounded-xl p-4 min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-foreground">Cash Flow</p>
                <p className="text-[10px] text-muted-foreground">Доходи vs витрати, $</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  Дохід
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                  Витрати
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: 11,
                    color: "#0f172a",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                />
                <Area type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={2} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expense" stroke="#94a3b8" strokeWidth={2} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </main>
      </div>
    </div>
  )
}
