const testimonials = [
  {
    initials: "ІГ",
    avatarClass: "bg-blue-100 text-blue-700",
    name: "Ігор Г.",
    company: "Founder, RichYou Agency",
    quote:
      "Я думав, що я багатий, поки не поставив цей SaaS. Виявилося, що я працюю за їжу. Тепер я реально керую агентством.",
  },
  {
    initials: "АС",
    avatarClass: "bg-emerald-100 text-emerald-700",
    name: "Анонімний студент",
    company: 'CEO, TechFlow Studio',
    quote:
      "Система допомогла виявити проекти, які фактично працювали в нуль через невраховані хотфікси. Тепер ми фокусуємося лише на прибуткових напрямках.",
  },
  {
    initials: "ДК",
    avatarClass: "bg-amber-100 text-amber-700",
    name: "Дмитро К.",
    company: "Founder, Digital Studio",
    quote:
      "Найбільша цінність Vardi — це спокій. Я точно знаю, скільки ми заробимо наступного місяця і чи вистачить нам на операційні витрати без касових розривів.",
  },
]

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 12 12" className="w-3.5 h-3.5 fill-amber-400">
          <path d="M6 .5l1.5 3 3.3.5-2.4 2.3.6 3.2L6 8l-3 1.5.6-3.2L1.2 4l3.3-.5z" />
        </svg>
      ))}
    </div>
  )
}

export function SocialProof() {
  return (
    <section className="px-6 py-24 bg-secondary">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center text-center mb-14">
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Досвід користувачів
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-balance max-w-xl leading-tight">
            Відгуки власників, які обрали автоматизацію
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-border bg-white p-6 flex flex-col gap-4 hover:shadow-md transition-shadow duration-300"
            >
              <StarRating />

              <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.avatarClass}`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
