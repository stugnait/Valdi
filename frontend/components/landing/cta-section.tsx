import { ArrowRight } from "lucide-react"

export function CtaSection() {
  return (
    <>
      <section id="cta" className="px-6 py-24 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-3xl border border-border bg-secondary p-8 md:p-14 flex flex-col items-center text-center gap-6 shadow-sm">
            <span className="text-xs font-semibold text-primary uppercase tracking-widest">
              Готові почати?
            </span>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-balance leading-tight">
              Масштабуйте бізнес, <br /> базуючись на даних
            </h2>

            <p className="text-muted-foreground text-base max-w-md text-pretty leading-relaxed">
              Спробуйте Vardi безкоштовно протягом 14 днів. Отримайте повний контроль над рентабельністю проектів без складних таблиць та ручної роботи.
            </p>

            <a
              href="#"
              className="group flex items-center gap-2.5 px-8 py-4 rounded-xl bg-primary text-white font-semibold text-base hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
              Почати безкоштовно
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </a>

            <p className="text-xs text-muted-foreground">
              Без кредитної карти · Скасування в 1 клік · Підтримка 24/7
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center relative">

          {/* 1. Логотип (Зліва) */}
          <div className="flex-1 flex justify-center md:justify-start mb-6 md:mb-0">
            <div className="flex items-center gap-2.5 group cursor-default">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shadow-sm">
                <span className="text-[10px] font-bold text-white">V</span>
              </div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">Vardi</span>
            </div>
          </div>

          {/* 2. Копірайт (Абсолютний центр на десктопі) */}
          <div className="md:absolute md:left-1/2 md:-translate-x-1/2 mb-6 md:mb-0">
            <p className="text-xs text-slate-400 font-medium text-center">
              © 2026 Vardi. <span className="hidden sm:inline">Фінансова аналітика для агентств.</span>
            </p>
          </div>

          {/* 3. Контакти (Справа) */}
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-xs font-semibold text-slate-600">
              <a
                  href="tel:+380123456789"
                  className="hover:text-primary transition-colors duration-200"
              >
                +380 (12) 345 67 89
              </a>
              <a
                  href="mailto:manager@vardi.com"
                  className="hover:text-primary transition-colors duration-200 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-6"
              >
                manager@vardi.com
              </a>
            </div>
          </div>

        </div>
      </footer>
    </>
  )
}
