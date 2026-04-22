import { Banknote, Users2, BarChart3, Sparkles } from "lucide-react"

const features = [
  {
    icon: Banknote,
    iconClass: "text-primary",
    iconBgClass: "bg-accent",
    badgeClass: "bg-accent text-primary",
    title: "Direct Bank Sync",
    description:
      "Жодних ручних виписок. API Monobank та Privat24 підтягують транзакції в режимі реального часу. Ти бачиш кожну гривню без відкриття банківського додатку.",
    badge: "Real-time",
  },
  {
    icon: Users2,
    iconClass: "text-emerald-600",
    iconBgClass: "bg-emerald-50",
    badgeClass: "bg-emerald-50 text-emerald-700",
    title: "Team Burn Rate",
    description:
      "Система знає собівартість кожної хвилини твого тіммейта. Ми рахуємо витрати на команду автоматично — ти знаєш рентабельність кожного розробника.",
    badge: "Автоматично",
  },
  {
    icon: BarChart3,
    iconClass: "text-amber-600",
    iconBgClass: "bg-amber-50",
    badgeClass: "bg-amber-50 text-amber-700",
    title: "Automatic P&L",
    description:
      "Звіт про прибутки та збитки формується сам. Ти бачиш маржинальність кожного проекту без калькулятора, в будь-який момент.",
    badge: "Без Excel",
  },
  {
    icon: Sparkles,
    iconClass: "text-violet-600",
    iconBgClass: "bg-violet-50",
    badgeClass: "bg-violet-50 text-violet-700",
    title: "Smart Categorization",
    description:
      "Система сама розуміє, що \"Silpo\" — це витрати на офіс/печиво, а \"Ucloud\" — це сервери. AI навчається на твоїх паттернах.",
    badge: "AI-powered",
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="px-6 py-24 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-14">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Технічні м&apos;язи
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance max-w-2xl leading-tight mb-4">
            Ми не просто малюємо картинки. Ми інженери.
          </h2>
          <p className="text-muted-foreground text-base max-w-xl text-pretty leading-relaxed">
            Кожна функція побудована на реальних API банків і автоматизованих
            алгоритмах. Без ручної роботи.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-white p-7 hover:shadow-md hover:border-slate-300 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl ${feature.iconBgClass} flex items-center justify-center shrink-0`}>
                  <feature.icon size={20} className={feature.iconClass} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{feature.title}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${feature.badgeClass}`}>
                      {feature.badge}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
