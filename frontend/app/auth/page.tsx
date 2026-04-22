"use client"

import { FormEvent, useMemo, useState } from "react"
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"

type AuthTab = "signup" | "login"

type AuthResponse = {
  access: string
  refresh: string
  user?: {
    id: number
    username: string
    email: string
  }
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ символів", pass: password.length >= 8 },
    { label: "Велика буква", pass: /[A-Z]/.test(password) },
    { label: "Цифра", pass: /[0-9]/.test(password) },
  ]
  const strength = checks.filter((c) => c.pass).length
  const colors = ["bg-border", "bg-red-400", "bg-amber-400", "bg-emerald-500"]
  const labels = ["", "Слабкий", "Середній", "Надійний"]

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength] : "bg-border"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`flex items-center gap-1 text-xs transition-colors duration-200 ${
                c.pass ? "text-emerald-600" : "text-muted-foreground"
              }`}
            >
              <Check size={10} className={c.pass ? "opacity-100" : "opacity-0"} />
              {c.label}
            </span>
          ))}
        </div>
        {strength > 0 && (
          <span className={`text-xs font-medium ${colors[strength].replace("bg-", "text-")}`}>
            {labels[strength]}
          </span>
        )}
      </div>
    </div>
  )
}

async function parseApiError(response: Response) {
  try {
    const data = await response.json()
    if (typeof data?.detail === "string") return data.detail

    const messages = Object.entries(data ?? {})
      .map(([field, value]) => {
        if (Array.isArray(value)) {
          return `${field}: ${value.join(", ")}`
        }
        return `${field}: ${String(value)}`
      })
      .join("\n")

    return messages || "Невідома помилка"
  } catch {
    return "Помилка мережі або сервера"
  }
}

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<AuthTab>("signup")
  const [showPass, setShowPass] = useState(false)
  const [agencyName, setAgencyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const submitLabel = useMemo(
    () => (tab === "signup" ? "Створити кабінет Vardi" : "Увійти"),
    [tab],
  )

  const onTabChange = (newTab: AuthTab) => {
    setTab(newTab)
    setError("")
    setSuccess("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const endpoint = tab === "signup" ? "/api/auth/register/" : "/api/auth/login/"
      const payload =
        tab === "signup"
          ? {
              email,
              password,
              username: email.split("@")[0],
              agency_name: agencyName,
            }
          : {
              email,
              password,
            }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await parseApiError(response))
      }

      const data = (await response.json()) as AuthResponse

      localStorage.setItem("access_token", data.access)
      localStorage.setItem("refresh_token", data.refresh)
      if (data.user) {
        localStorage.setItem("user_email", data.user.email)
      }

      setSuccess(tab === "signup" ? "Реєстрація успішна. Тепер ти залогінений ✨" : "Успішний вхід ✨")
      setPassword("")
      const nextPath = searchParams.get("next") || "/dashboard"
      router.push(nextPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сталася помилка")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-primary font-black text-sm">V</span>
            </div>
            <span className="text-white font-bold text-lg">Vardi</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="text-white">
            <p className="text-2xl font-semibold leading-snug text-balance">
              &ldquo;Твої фінанси під контролем, поки ти спиш.&rdquo;
            </p>
            <footer className="mt-4 text-blue-200 text-sm">
              — кожен founder після першого місяця з Vardi
            </footer>
          </blockquote>

          <div className="flex gap-8 pt-4 border-t border-white/20">
            <div>
              <p className="text-2xl font-bold text-white">340+</p>
              <p className="text-blue-200 text-sm">агентств онбордяться</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">$2.1M</p>
              <p className="text-blue-200 text-sm">транзакцій оброблено</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-blue-200 text-xs">
          SOC 2 Type II · 256-bit AES Encryption · GDPR Compliant
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">V</span>
            </div>
            <span className="text-foreground font-bold text-lg">Vardi</span>
          </div>

          <div className="flex bg-secondary rounded-xl p-1 mb-8">
            <button
              onClick={() => onTabChange("signup")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                tab === "signup"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Реєстрація
            </button>
            <button
              onClick={() => onTabChange("login")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                tab === "login"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Вхід
            </button>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {tab === "signup" ? "Створи свій кабінет" : "З поверненням"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tab === "signup" ? "14 днів безкоштовно, без карки." : "Залітай в свій дашборд."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {tab === "signup" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Agency Name</label>
                <input
                  type="text"
                  placeholder="RichFlow Studio"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Work Email</label>
              <input
                type="email"
                placeholder="igor@richflow.studio"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Мінімум 8 символів"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {tab === "signup" && <PasswordStrength password={password} />}
            </div>

            {error && <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold text-sm py-3.5 rounded-xl hover:bg-blue-700 transition-colors duration-200 mt-2 disabled:opacity-60"
            >
              {isLoading ? "Обробка..." : submitLabel}
              <ArrowRight size={15} />
            </button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {tab === "signup" ? "Реєструючись, ти погоджуєшся з нашою " : "Ще немає акаунту? "}
            {tab === "signup" ? (
              <button className="text-primary hover:underline">Політикою конфіденційності</button>
            ) : (
              <button
                onClick={() => onTabChange("signup")}
                className="text-primary hover:underline font-medium"
              >
                Зареєструйся
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
