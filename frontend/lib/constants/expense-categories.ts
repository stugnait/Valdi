import { expenseCategories } from "@/lib/types/spendings"

const legacyToId: Record<string, string> = {
  Infrastructure: "infrastructure",
  Software: "software",
  Office: "office",
  Legal: "legal",
  Marketing: "marketing",
  Equipment: "equipment",
  Food: "food",
  Travel: "travel",
  Education: "education",
  Training: "training",
  "Team Event": "team-event",
  Emergency: "emergency",
  Other: "other",
  API: "software",
  Assets: "equipment",
  Security: "legal",
}

export const sharedExpenseCategories = expenseCategories.map((category) => ({
  value: category.id,
  label: category.name,
}))

export const getExpenseCategoryLabel = (rawCategory?: string | null) => {
  if (!rawCategory) return "—"
  const normalized = legacyToId[rawCategory] || rawCategory.toLowerCase()
  return sharedExpenseCategories.find((category) => category.value === normalized)?.label || rawCategory
}

export const normalizeExpenseCategoryValue = (rawCategory?: string | null) => {
  if (!rawCategory) return ""
  return legacyToId[rawCategory] || rawCategory.toLowerCase()
}
