import type { Currency } from "@/lib/types/spendings"

export type BaseCurrency = "USD"

export interface NbuRates {
  USD: number
  EUR: number
  UAH: 1
  fetchedAt: string
  source: "nbu" | "cache" | "fallback"
}

const CACHE_KEY = "nbu_exchange_rates_v1"
const CACHE_TTL_MS = 1000 * 60 * 60 * 6

export const FALLBACK_NBU_RATES: NbuRates = {
  USD: 41.5,
  EUR: 45,
  UAH: 1,
  fetchedAt: new Date(0).toISOString(),
  source: "fallback",
}

function isValidRates(value: unknown): value is NbuRates {
  if (!value || typeof value !== "object") return false
  const rates = value as Partial<NbuRates>
  return Boolean(rates.USD && rates.EUR && rates.UAH === 1 && typeof rates.fetchedAt === "string")
}

export function convertToBaseCurrency(
  amount: number,
  fromCurrency: Currency,
  rates: NbuRates,
  baseCurrency: BaseCurrency = "USD"
): number {
  if (baseCurrency !== "USD") return amount
  if (fromCurrency === "USD") return amount
  if (fromCurrency === "UAH") return amount / rates.USD
  return (amount * rates.EUR) / rates.USD
}

export function toMonthlyRecurringAmount(amount: number, cycle: "monthly" | "quarterly" | "yearly"): number {
  if (cycle === "yearly") return amount / 12
  if (cycle === "quarterly") return amount / 3
  return amount
}

export async function getNbuRates(): Promise<{ rates: NbuRates; warning: string | null }> {
  const cached = readCachedRates()

  try {
    const response = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&valcode=EUR&json")
    if (!response.ok) throw new Error(`NBU API ${response.status}`)
    const payload = (await response.json()) as Array<{ cc: string; rate: number }>
    const usd = payload.find((item) => item.cc === "USD")?.rate
    const eur = payload.find((item) => item.cc === "EUR")?.rate
    if (!usd || !eur) throw new Error("NBU rates are incomplete")

    const rates: NbuRates = {
      USD: usd,
      EUR: eur,
      UAH: 1,
      fetchedAt: new Date().toISOString(),
      source: "nbu",
    }
    writeCachedRates(rates)
    return { rates, warning: null }
  } catch {
    if (cached) {
      return {
        rates: { ...cached, source: "cache" },
        warning: "Не вдалося оновити курс НБУ. Використовується кешований курс.",
      }
    }
    return {
      rates: FALLBACK_NBU_RATES,
      warning: "Курс НБУ недоступний. Використовується fallback-курс, перевірте розрахунки.",
    }
  }
}

function readCachedRates(): NbuRates | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!isValidRates(parsed)) return null
    const age = Date.now() - new Date(parsed.fetchedAt).getTime()
    if (age > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCachedRates(rates: NbuRates) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(rates))
}
