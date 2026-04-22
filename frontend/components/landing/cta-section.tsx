import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <>
      <section id="cta" className="px-6 py-24 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl border border-border bg-secondary p-8 md:p-14 flex flex-col items-center text-center gap-6 shadow-sm">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Фінальний заклик
            </span>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-balance leading-tight">
              Досить рахувати на пальцях.
            </h2>

            <p className="text-muted-foreground text-base max-w-md text-pretty leading-relaxed">
              Спробуй Vardi безкоштовно 14 днів. Без кредитної карти, без
              зобов&apos;язань. Просто підключи своє агентство і подивись, де
              насправді твої гроші.
            </p>

            <a
              href="#"
              className="group flex items-center gap-2.5 px-8 py-4 rounded-xl bg-primary text-white font-semibold text-base hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
              Почати 14-денний тріал
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </a>

            <p className="text-xs text-muted-foreground">
              Без кредитної карти · Скасування в 1 клік · Підтримка 24/7
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">V</span>
            </div>
            <span className="text-sm font-semibold text-foreground">Vardi</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 Vardi. Фінансова аналітика для українських агентств.
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Умови</a>
            <a href="#" className="hover:text-foreground transition-colors">Приватність</a>
            <a href="#" className="hover:text-foreground transition-colors">Контакти</a>
          </div>
        </div>
      </footer>
    </>
  )
}
