import type { ApiVariableExpense } from "@/lib/api/workforce"
import { convertToBaseCurrency, type NbuRates } from "@/lib/utils/currency"

type ImpactFlag = "actualMonthlySpend" | "cashFlow" | "budgetDeviation" | "companyBurnRate"

export const hasImpactFlag = (expense: ApiVariableExpense, flag: ImpactFlag, defaultValue = false) =>
  expense.impact_flags?.[flag] ?? defaultValue

export const sumIrregularExpensesByFlagInUsd = (
  expenses: ApiVariableExpense[],
  flag: ImpactFlag,
  rates: NbuRates
) =>
  expenses
    .filter((expense) => hasImpactFlag(expense, flag, flag === "actualMonthlySpend"))
    .reduce(
      (sum, expense) =>
        sum + convertToBaseCurrency(Number.parseFloat(expense.amount ?? "0"), expense.currency, rates),
      0
    )
