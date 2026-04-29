import { AlertTriangle, Flame, Clock } from "lucide-react"

const painCards = [
  {
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    iconBgClass: "bg-amber-50",
    title: "Відсутність прозорості",
    body: "Ви бачите залишок на рахунках, але не можете розділити власний прибуток, кошти на податки та резерв для виплат наступного місяця.",
    quote: "Я вважав проєкт прибутковим, поки не вирахував операційні витрати.",
  },
  {
    icon: Flame,
    iconClass: "text-red-500",
    iconBgClass: "bg-red-50",
    title: "Від'ємна рентабельність",
    body: "Через непередбачені правки та перевищення бюджету годин, розробники витрачають більше ресурсів, ніж платить клієнт. Ви дізнаєтесь про це надто пізно.",
    quote: "Кожна година понад план — це прямі збитки компанії.",
  },
  {
    icon: Clock,
    iconClass: "text-primary",
    iconBgClass: "bg-accent",
    title: "Неконтрольовані касові розриви",
    body: "Ситуація, коли проектів багато, але на рахунках порожньо через затримки оплат (дебіторку) та відсутність прогнозування витрат.",
    quote: "Завантаження команди 100%, але платити за офіс немає чим.",
  },
]

export function PainSection() {
  return (
    <section id="pain" className="px-6 py-24 bg-secondary">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-14">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Проблематика
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance max-w-2xl leading-tight">
            Чому традиційні таблиці <br /> призводять до фінансових втрат
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
