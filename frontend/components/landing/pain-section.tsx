import { AlertTriangle, Flame, Clock } from "lucide-react"

const painCards = [
  {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    iconBgClass: "bg-amber-50",
    title: "Де гроші, Лебовські?",
    body: "Ти бачиш баланс на картці, але не знаєш, скільки з них — твої, а скільки — податки і зп на наступний тиждень.",
    quote: "Я думав, що я в плюсі. Виявилося, що це гроші клієнта.",
  },
  {
    icon: Flame,
    iconClass: "text-red-500",
    iconBgClass: "bg-red-50",
    title: "Проекти в мінус",
    body: "Клієнт платить $2000, але через довгі фікси і \"хотфікси\" розробники з'їли вже $2500. Ти дізнаєшся про це занадто пізно.",
    quote: "Кожен хотфікс — це твої гроші, не клієнта.",
  },
  {
    icon: Clock,
    iconClass: "text-primary",
    iconBgClass: "bg-accent",
    title: "Касовий розрив",
    body: "Ситуація, коли проектів багато, а платити за офіс завтра нічим, бо дебіторка (борги клієнтів) зависла.",
    quote: "Повний завантаження, порожній рахунок.",
  },
]

export function PainSection() {
  return (
    <section id="pain" className="px-6 py-24 bg-secondary">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-14">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Секція болю
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance max-w-2xl leading-tight">
            Ексель-пекло, або чому агентства закриваються
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {painCards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-border bg-white p-6 hover:shadow-md transition-shadow duration-300"
            >
              <div className={`w-10 h-10 rounded-xl ${card.iconBgClass} flex items-center justify-center mb-4`}>
                <card.icon size={18} className={card.iconClass} />
              </div>

              <h3 className="text-lg font-bold text-foreground mb-3 leading-snug">
                {card.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                {card.body}
              </p>

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground italic">
                  &ldquo;{card.quote}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
