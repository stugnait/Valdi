import { NextResponse } from "next/server"

const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json"

export async function GET() {
  try {
    const response = await fetch(NBU_URL, { cache: "no-store" })
    if (!response.ok) {
      return NextResponse.json({ error: `NBU API ${response.status}` }, { status: 502 })
    }

    const payload = (await response.json()) as Array<{ cc: string; rate: number }>
    const usd = payload.find((item) => item.cc === "USD")?.rate
    const eur = payload.find((item) => item.cc === "EUR")?.rate

    if (!usd || !eur) {
      return NextResponse.json({ error: "Missing USD/EUR rates from NBU" }, { status: 502 })
    }

    return NextResponse.json({ USD: usd, EUR: eur })
  } catch {
    return NextResponse.json({ error: "Failed to fetch NBU rates" }, { status: 502 })
  }
}
