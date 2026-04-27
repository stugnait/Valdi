"use client"

import { useState } from "react"
import { Check, ArrowRight, Zap, MessageCircle } from "lucide-react"
import { Navbar } from "@/components/landing/navbar"

const plans = [
  {
    id: "bootstrap",
    name: "Bootstrap",
    emoji: "Bootstrap",
    tagline: "Для фрілансерів або щоб просто поклацати.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Спробувати безкоштовно",
    ctaStyle: "secondary" as const,
    popular: false,
    features: [
      "1 активний проект",
      "До 3-х учасників команди",
      "Ручне введення транзакцій",
      "Базові звіти (список витрат)",
    ],
    missing: [
      "Авто-імпорт з банків",
      "Cash Flow Predictor",
      "Team Profitability",
      "Tax Automator",
    ],
  },
  {
    id: "pro",
    name: "Agency Pro",
    tagline: "Для агенцій, які хочуть керувати фінансами впевнено та прозоро.",
    monthlyPrice: 29,
    yearlyPrice: 23,
    cta: "Перейти на Pro",
    ctaStyle: "primary" as const,
    popular: true,
    features: [
      "Безліміт проектів та клієнтів",
      "Авто-імпорт: Monobank / Privat24",
      "Cash Flow Predictor на 30 днів",
      "Team Profitability по кожному розрабу",
      "Tax Automator: звіти для ФОП (5% + ЄСВ)",
      "Пріоритетна підтримка",
    ],
    missing: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Для тих, у кого розробників більше, ніж кави.",
    monthlyPrice: null,
    yearlyPrice: null,
    cta: "Обговорити умови",
    ctaStyle: "outline" as const,
    popular: false,
    features: [
      "Multi-Org: кілька юросіб в одному кабінеті",
      "Custom Integrations: Wise, Revolut, будь-який банк",
      "SLA & підтримка 24/7",
      "On-premise розгортання",
      "Персональний фінансовий консультант",
      "Все з Agency Pro",
    ],
    missing: [],
  },
]

const faqs = [
  {
    q: "Чи безпечно підключати банки?",
    a: "Так, ми використовуємо офіційні API банків і не зберігаємо твої паролі — тільки токени тільки на читання. Твої гроші в безпеці, ми лише дивимося на цифри.",
  },
  {
    q: "Чи можна вивантажити дані?",
    a: "Звичайно. Експорт у CSV або Excel у два кліки з будь-якого розділу. Твої дані — твої назавжди.",
  },
  {
    q: "Як працює знижка за річну оплату?",
    a: "Обираючи річний план, ти економиш 20% — по суті отримуєш 2,4 місяці безкоштовно. Оплата списується одразу за весь рік.",
  },
  {
    q: "Чи є безкоштовний тріал для Pro?",
    a: "Так, 14 днів безкоштовно без введення карки. Якщо не сподобається — просто видали акаунт і не думай про це.",
  },
]

export default function PricingPage() {
  const [yearly, setYearly] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="pt-28 pb-24">
        {/* Header */}
        <section className="max-w-3xl mx-auto px-6 text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight text-balance mb-4">
            Обирай свій рівень контролю.
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            Почніть безкоштовно та переходьте на розширений план, коли бізнес зростає.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 mt-8 bg-secondary rounded-xl p-1">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                !yearly
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Щомісяця
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                yearly
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Щороку
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </section>

        {/* Plans grid */}
        <section className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-8 transition-shadow duration-300 ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-blue-100 bg-white ring-2 ring-primary ring-offset-0"
                    : "border-border bg-white hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                      <Zap size={11} />
                      Найпопулярніший
                    </span>
                  </div>
                )}

                {/* Plan name & tagline */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-foreground mb-1">{plan.name}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-8">
                  {plan.monthlyPrice === null ? (
                    <div>
                      <span className="text-4xl font-bold text-foreground">Custom</span>
                      <p className="text-sm text-muted-foreground mt-1">Зв’яжіться з нами для персональної пропозиції</p>
                    </div>
                  ) : plan.monthlyPrice === 0 ? (
                    <div>
                      <span className="text-4xl font-bold text-foreground">$0</span>
                      <span className="text-muted-foreground text-sm ml-1">/ міс.</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-4xl font-bold text-foreground">
                        ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">/ міс.</span>
                      {yearly && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Списується <span className="font-medium text-foreground">${(plan.yearlyPrice! * 12).toFixed(0)}</span> на рік
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA button */}
                <div className="mb-8">
                  {plan.ctaStyle === "primary" ? (
                    <button className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 animate-pulse hover:animate-none">
                      {plan.cta}
                      <ArrowRight size={15} />
                    </button>
                  ) : plan.ctaStyle === "outline" ? (
                    <button className="w-full flex items-center justify-center gap-2 border border-border text-foreground font-semibold text-sm py-3 rounded-xl hover:bg-secondary hover:border-foreground/20 transition-colors duration-200">
                      <MessageCircle size={15} />
                      {plan.cta}
                    </button>
                  ) : (
                    <button className="w-full bg-secondary text-secondary-foreground font-semibold text-sm py-3 rounded-xl hover:bg-muted transition-colors duration-200">
                      {plan.cta}
                    </button>
                  )}
                </div>

                {/* Feature list */}
                <ul className="flex flex-col gap-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                      <Check size={16} className="text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground/60 line-through">
                      <span className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto px-6 mt-24">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">
            FAQ для комісії
          </h2>
          <div className="flex flex-col gap-4">
            {faqs.map((item) => (
              <div key={item.q} className="rounded-xl border border-border bg-white p-6">
                <h3 className="font-semibold text-foreground mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
