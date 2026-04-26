"use client"

import { useState } from "react"
import { ArrowRight, ArrowLeft, Check } from "lucide-react"
import Link from "next/link"

const CURRENCIES = [
  { id: "USD", label: "USD", desc: "Долар США", flag: "🇺🇸", note: "Дефолт для IT" },
  { id: "UAH", label: "UAH", desc: "Гривня", flag: "🇺🇦", note: "Для внутрішніх витрат" },
  { id: "EUR", label: "EUR", desc: "Євро", flag: "🇪🇺", note: "Для EU клієнтів" },
]

const TEAM_SIZES = [
  { id: "1-5", label: "1–5", desc: "Solo або мікро-команда" },
  { id: "5-15", label: "5–15", desc: "Зростаючий стартап" },
  { id: "15-50", label: "15–50", desc: "Середнє агентство" },
  { id: "50+", label: "50+", desc: "Велика контора" },
]

const BANKS = [
  { id: "mono", label: "Monobank", color: "bg-[#1a1a2e]", textColor: "text-white" },
  { id: "privat", label: "Privat24", color: "bg-green-600", textColor: "text-white" },
  { id: "wise", label: "Wise", color: "bg-[#9fe870]", textColor: "text-[#163300]" },
  { id: "revolut", label: "Revolut", color: "bg-[#0075eb]", textColor: "text-white" },
  { id: "cash", label: "Cash", color: "bg-amber-400", textColor: "text-amber-900" },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [currency, setCurrency] = useState("USD")
  const [teamSize, setTeamSize] = useState("")
  const [banks, setBanks] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const toggleBank = (id: string) => {
    setBanks((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    )
  }

  const canNext =
    step === 1
      ? !!currency
      : step === 2
      ? !!teamSize
      : step === 3
      ? banks.length > 0
      : false

  if (done) {
    const hasMono = banks.includes("mono")
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
            <Check size={32} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Налаштування завершено!
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {hasMono
                ? "Ти обрав Monobank — підключи API ключ зараз і транзакції потечуть самі. Або зроби це пізніше в налаштуваннях."
                : "Ваш кабінет готовий. Перейдіть у дашборд і додайте перші транзакції."}
            </p>
          </div>

          {hasMono && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
              <p className="text-sm font-semibold text-foreground mb-1">
                Підключи Monobank API
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Відкрий Monobank → Налаштування → API → скопіюй токен сюди.
              </p>
              <input
                type="text"
                placeholder="u***_xxxxxxxxxxxxxxxxxxx"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm py-3.5 rounded-xl hover:bg-blue-700 transition-colors duration-200"
            >
              Перейти в дашборд
              <ArrowRight size={15} />
            </Link>
            {hasMono && (
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Підключу API пізніше
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">V</span>
          </div>
          <span className="font-bold text-foreground">Vardi</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  s < step
                    ? "bg-primary text-white"
                    : s === step
                    ? "bg-primary text-white ring-4 ring-primary/20"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {s < step ? <Check size={13} /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 h-px transition-all duration-300 ${
                    s < step ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">Крок {step} з 3</p>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {step === 1 && (
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Крок 1 — Валюта
              </p>
              <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">
                У якій валюті вести базову фінансову аналітику?
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                Всі транзакції конвертуватимуться до цієї бази для точної аналітики.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCurrency(c.id)}
                    className={`relative flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200 ${
                      currency === c.id
                        ? "border-primary bg-blue-50"
                        : "border-border bg-white hover:border-muted-foreground/30"
                    }`}
                  >
                    {currency === c.id && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    <span className="text-3xl">{c.flag}</span>
                    <span className="font-bold text-foreground">{c.label}</span>
                    <span className="text-xs text-muted-foreground text-center leading-tight">
                      {c.note}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Крок 2 — Команда
              </p>
              <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">
                Скільки людей у вашій команді?
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                Підберемо тарифний план і налаштуємо Burn Rate під твій масштаб.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {TEAM_SIZES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTeamSize(t.id)}
                    className={`relative flex flex-col items-start gap-1 p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                      teamSize === t.id
                        ? "border-primary bg-blue-50"
                        : "border-border bg-white hover:border-muted-foreground/30"
                    }`}
                  >
                    {teamSize === t.id && (
                      <div className="absolute top-3 right-3 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    <span className="text-xl font-bold text-foreground">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
                Крок 3 — Банки
              </p>
              <h2 className="text-2xl font-bold text-foreground mb-2 text-balance">
                Які інструменти для грошей ти юзаєш?
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                Обирай кілька — підключимо автоматичний імпорт транзакцій.
              </p>
              <div className="flex flex-col gap-3">
                {BANKS.map((b) => {
                  const selected = banks.includes(b.id)
                  return (
                    <button
                      key={b.id}
                      onClick={() => toggleBank(b.id)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        selected
                          ? "border-primary bg-blue-50"
                          : "border-border bg-white hover:border-muted-foreground/30"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl ${b.color} ${b.textColor} flex items-center justify-center text-xs font-bold shrink-0`}
                      >
                        {b.label.slice(0, 2)}
                      </div>
                      <span className="font-medium text-foreground text-sm">{b.label}</span>
                      <div
                        className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          selected ? "bg-primary border-primary" : "border-border"
                        }`}
                      >
                        {selected && <Check size={11} className="text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
            >
              <ArrowLeft size={15} />
              Назад
            </button>

            <button
              onClick={() => {
                if (step < 3) setStep((s) => s + 1)
                else setDone(true)
              }}
              disabled={!canNext}
              className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 3 ? "Завершити налаштування" : "Далі"}
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
