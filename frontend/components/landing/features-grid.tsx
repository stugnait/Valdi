import { Banknote, Users2, BarChart3, Sparkles } from "lucide-react"

const features = [
  {
    icon: Banknote,
    iconClass: "text-primary",
    iconBgClass: "bg-accent",
    badgeClass: "bg-accent text-primary",
    title: "Банкінг без додатків",
    description:
      "Контролюйте кожну гривню в одному вікні завдяки прямій синхронізації.",
    badge: "Live Sync",
  },
  {
    icon: Users2,
    iconClass: "text-emerald-600",
    iconBgClass: "bg-emerald-50",
    badgeClass: "bg-emerald-50 text-emerald-700",
    title: "Контроль витрат на команду",
    description:
      "Дізнайтеся реальну вартість кожного проекту, враховуючи кожну хвилину роботи спеціаліста.",
    badge: "Auto-calc",
  },
  {
    icon: BarChart3,
    iconClass: "text-amber-600",
    iconBgClass: "bg-amber-50",
    badgeClass: "bg-amber-50 text-amber-700",
    title: "Звіти в один клік",
    description:
      "Отримуйте актуальний P&L звіт миттєво, без Excel та калькуляторів.",
    badge: "No Manual Work",
  },
  {
    icon: Sparkles,
    iconClass: "text-violet-600",
    iconBgClass: "bg-violet-50",
    badgeClass: "bg-violet-50 text-violet-700",
    title: "Розумне групування",
    description:
      "Система сама розпізнає категорії витрат, навчаючись на ваших операціях.",
    badge: "AI-powered",
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="px-6 py-24 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-14">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Інтелектуальні рішення
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground max-w-2xl leading-tight mb-4">
            Більше ніж облік. <br /> Повна фінансова прозорість.
          </h2>
          <p className="text-muted-foreground text-base max-w-xl text-pretty leading-relaxed">
            Забудьте про ручне заповнення таблиць. Vardi автоматизує збір даних безпосередньо з ваших банківських рахунків.
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
