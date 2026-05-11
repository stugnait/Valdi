import { expenseCategories } from "@/lib/types/spendings"

const expenseCategoryLabelsUk: Record<string, string> = {
  infrastructure: "Інфраструктура",
  software: "Програмне забезпечення",
  office: "Офіс",
  legal: "Юридичні",
  marketing: "Маркетинг",
  equipment: "Обладнання",
  food: "Харчування",
  travel: "Подорожі",
  education: "Освіта",
  training: "Тренінги",
  "team-event": "Командні події",
  emergency: "Надзвичайні",
  other: "Інше",
}

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
  label: expenseCategoryLabelsUk[category.id] || category.name,
}))

export const getExpenseCategoryLabel = (rawCategory?: string | null) => {
  if (!rawCategory) return "—"
  const normalized = legacyToId[rawCategory] || rawCategory.toLowerCase()
  return expenseCategoryLabelsUk[normalized] || rawCategory
}

export const normalizeExpenseCategoryValue = (rawCategory?: string | null) => {
  if (!rawCategory) return ""
  return legacyToId[rawCategory] || rawCategory.toLowerCase()
}
