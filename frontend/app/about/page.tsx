"use client"

import {
  LayoutDashboard,
  FolderKanban,
  Users2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Clock,
  BarChart2,
  Bell,
  Lock,
  CreditCard,
  Cpu,
} from "lucide-react"
import { Navbar } from "@/components/landing/navbar"

const features = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    label: "Фінансовий радар",
    heading: "Вся картина бізнесу на одному екрані.",
    text: "Не потрібно перемикатися між банківськими застосунками. Ми об’єднуємо баланс, рівень витрат і чистий прибуток в одному зрозумілому екрані.",
    bullets: [
      {
        icon: Clock,
        title: "Cash Runway",
        desc: "Скільки місяців життя лишилося у твоєї контори.",
      },
      {
        icon: BarChart2,
        title: "Автоматичний P&L",
        desc: "Звіт про прибутки та збитки, який не треба заповнювати руками.",
      },
      {
        icon: CreditCard,
        title: "Live-баланс",
        desc: "Актуальні залишки на всіх рахунках: Mono, Privat, Cash, Crypto.",
      },
    ],
    visual: <DashboardVisual />,
    reverse: false,
  },
  {
    id: "projects",
    icon: FolderKanban,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    label: "Трекінг проектів",
    heading: "Рахуй маржу, а не просто оборот.",
    text: "Навіть якщо клієнт платить багато, важливо розуміти реальну маржу. Система автоматично враховує витрати на інструменти та команду в бюджеті проєкту.",
    bullets: [
      {
        icon: BarChart2,
        title: "Budget vs Actual",
        desc: "Реальний прогрес витрат у реальному часі.",
      },
      {
        icon: TrendingUp,
        title: "Project ROI",
        desc: "Автоматичний розрахунок окупності кожного клієнта.",
      },
      {
        icon: Bell,
        title: "Alerts",
        desc: "Система маякне, якщо проект почав \"жерти\" більше, ніж планувалося.",
      },
    ],
    visual: <ProjectsVisual />,
    reverse: true,
  },
  {
    id: "team",
    icon: Users2,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    label: "Team Cost Tracking",
    heading: "Скільки реально коштує ваша команда?",
    text: "Кожен розробник має свою ціну для бізнесу: зарплата + податки + техніка. Ми мапимо ці витрати на твої проекти автоматично.",
    bullets: [
      {
        icon: Cpu,
        title: "Cost per Hour",
        desc: "Бачиш собівартість години кожного тіммейта.",
      },
      {
        icon: CreditCard,
        title: "Payroll Automator",
        desc: "Відомість на виплату ЗП формується сама на основі транзакцій з банку.",
      },
    ],
    visual: <TeamVisual />,
    reverse: false,
  },
  {
    id: "cashflow",
    icon: TrendingUp,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    label: "Cash Flow Prediction",
    heading: "Плануйте наперед і уникайте касових розривів.",
    text: "На основі твоїх регулярних витрат та очікуваних інвойсів ми малюємо графік твого балансу на 30–60 днів вперед.",
    bullets: [
      {
        icon: Bell,
        title: "Stop Cash Gap",
        desc: "Якщо через два тижні на рахунках буде нуль — ти дізнаєшся про це сьогодні.",
      },
    ],
    visual: <CashFlowVisual />,
    reverse: true,
  },
  {
    id: "security",
    icon: ShieldCheck,
    iconColor: "text-slate-600",
    iconBg: "bg-slate-100",
    label: "Безпека",
    heading: "Ваші дані — під надійним захистом.",
    text: "Ми використовуємо офіційні Read-only API. Це означає, що система може тільки бачити транзакції, але ніхто не зможе відправити гроші кудись не туди.",
    bullets: [
      {
        icon: Lock,
        title: "AES-256",
        desc: "Банківське шифрування даних на рівні протоколу.",
      },
      {
        icon: ShieldCheck,
        title: "Без паролів",
        desc: "Жодних збережених паролів від банків — тільки токени тільки на читання.",
      },
      {
        icon: CheckCircle2,
        title: "Ізоляція даних",
        desc: "Повна ізоляція даних між клієнтами на рівні бази.",
      },
    ],
    visual: <SecurityVisual />,
    reverse: false,
  },
]

// ── Inline visuals ──────────────────────────────────────────────────────────

function DashboardVisual() {
  const stats = [
    { label: "Cash Runway", value: "8.3 міс.", change: "+1.2", up: true },
    { label: "Burn Rate", value: "$12 400", change: "-4%", up: true },
    { label: "Чистий прибуток", value: "$9 100", change: "+18%", up: true },
  ]
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col gap-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Dashboard</p>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-secondary p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className={`text-xs font-medium mt-1 ${s.up ? "text-emerald-600" : "text-red-500"}`}>{s.change}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-secondary h-24 flex items-end px-4 pb-4 gap-1.5 overflow-hidden">
        {[40, 55, 48, 62, 70, 58, 75, 80, 68, 90, 84, 95].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-blue-200"
            style={{ height: `${h}%` }}
          />
        ))}
        {[95].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-primary" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

function ProjectsVisual() {
  const projects = [
    { name: "Fintech App", budget: 85, actual: 61, roi: "+39%" },
    { name: "E-commerce", budget: 100, actual: 91, roi: "+10%" },
    { name: "SaaS MVP", budget: 60, actual: 44, roi: "+54%" },
  ]
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col gap-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Profitability</p>
      <div className="flex flex-col gap-4">
        {projects.map((p) => (
          <div key={p.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="text-emerald-600 font-semibold text-xs">{p.roi}</span>
            </div>
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-blue-200 rounded-full" style={{ width: `${p.budget}%` }} />
              <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${p.actual}%` }} />
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Actual</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-200 inline-block" />Budget</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamVisual() {
  const team = [
    { name: "Oleksiy D.", role: "Senior Dev", hourly: "$28", monthly: "$4 480" },
    { name: "Maria K.", role: "PM", hourly: "$18", monthly: "$2 880" },
    { name: "Ivan S.", role: "Designer", hourly: "$16", monthly: "$2 560" },
  ]
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col gap-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Costs</p>
      <div className="flex flex-col divide-y divide-border">
        {team.map((m) => (
          <div key={m.name} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-primary">
                {m.name.slice(0, 1)}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{m.monthly}<span className="text-xs text-muted-foreground font-normal">/міс.</span></p>
              <p className="text-xs text-muted-foreground">{m.hourly}/год</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Загальний Burn Rate</span>
        <span className="text-sm font-bold text-primary">$9 920 / міс.</span>
      </div>
    </div>
  )
}

function CashFlowVisual() {
  const months = ["Зараз", "+2 тиж", "+1 міс", "+2 міс"]
  const values = [100, 68, 35, 12]
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col gap-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cash Flow Forecast</p>
      <div className="flex items-end gap-3 h-28">
        {values.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div
              className={`w-full rounded-lg transition-all ${v <= 20 ? "bg-red-400" : v <= 50 ? "bg-amber-400" : "bg-primary"}`}
              style={{ height: `${v}%` }}
            />
            <span className="text-xs text-muted-foreground text-center leading-tight">{months[i]}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-3">
        <Bell size={16} className="text-red-500 shrink-0 mt-0.5" />
        <p className="text-xs text-red-700 leading-relaxed">
          <span className="font-semibold">Stop Cash Gap:</span> через 6 тижнів баланс впаде нижче $5 000. Час виставити передоплатний інвойс.
        </p>
      </div>
    </div>
  )
}

function SecurityVisual() {
  const items = [
    { label: "Шифрування", value: "AES-256", ok: true },
    { label: "Збережені паролі", value: "Немає", ok: true },
    { label: "Доступ до переказів", value: "Заблоковано", ok: true },
    { label: "Ізоляція клієнтів", value: "Увімкнено", ok: true },
    { label: "Read-only API", value: "Тільки читання", ok: true },
  ]
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm flex flex-col gap-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security Audit</p>
      <div className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-3">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-28 pb-24">
        {/* Header */}
        <section className="max-w-3xl mx-auto px-6 text-center mb-24">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-4">
            Як це працює
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight text-balance mb-5">
            П&apos;ять речей, які Vardi робить замість тебе.
          </h1>
          <p className="text-lg text-muted-foreground text-balance leading-relaxed">
            Не ще один Excel. Не черговий дашборд. Фінансовий мозок твого агентства,
            який не спить і не йде у відпустку.
          </p>
        </section>

        {/* Feature blocks */}
        <div className="max-w-6xl mx-auto px-6 flex flex-col gap-32">
          {features.map((f, idx) => {
            const Icon = f.icon
            return (
              <section
                key={f.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                  f.reverse ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Text side */}
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={20} className={f.iconColor} />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{String(idx + 1).padStart(2, "0")} — {f.label}</span>
                  </div>

                  <h2 className="text-3xl font-bold text-foreground tracking-tight text-balance leading-snug">
                    {f.heading}
                  </h2>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {f.text}
                  </p>

                  <ul className="flex flex-col gap-4">
                    {f.bullets.map((b) => {
                      const BIcon = b.icon
                      return (
                        <li key={b.title} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                            <BIcon size={13} className="text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-foreground">{b.title}: </span>
                            <span className="text-sm text-muted-foreground">{b.desc}</span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Visual side */}
                <div className={f.reverse ? "lg:order-first" : ""}>
                  {f.visual}
                </div>
              </section>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <section className="max-w-2xl mx-auto px-6 mt-32 text-center">
          <div className="rounded-2xl border border-border bg-secondary p-12 flex flex-col items-center gap-6">
            <h2 className="text-3xl font-bold text-foreground text-balance">
              Готовий перестати гадати і почати знати?
            </h2>
            <p className="text-muted-foreground text-balance">
              14 днів безкоштовно. Без карки. Без дурниць.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-blue-700 transition-colors duration-200"
            >
              Переглянути тарифи
              <ArrowRight size={15} />
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
