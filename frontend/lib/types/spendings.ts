import { Team, TeamMember } from "./teams"
import { Project } from "./projects"

export type Currency = "USD" | "EUR" | "UAH"
export type PaymentCycle = "monthly" | "yearly" | "quarterly"
export type PaymentStatus = "paid" | "pending" | "overdue"
export type PaymentSource = "monobank" | "privat24" | "cash" | "wise" | "payoneer"
export type AllocationTarget = "all" | "team" | "project" | "none"

export interface AllocationLogic {
  type: AllocationTarget
  teamId?: string
  teamName?: string
  projectId?: string
  projectName?: string
}

export interface RecurringExpense {
  id: string
  name: string
  amount: number
  currency: Currency
  amountUSD: number // converted amount
  cycle: PaymentCycle
  category: string
  source: PaymentSource
  allocation: AllocationLogic
  status: PaymentStatus
  nextPaymentDate: string
  lastPaidDate?: string
  description?: string
  createdAt: string
}

export interface VariableExpense {
  id: string
  name: string
  amount: number
  currency: Currency
  amountUSD: number
  category: string
  source: PaymentSource
  date: string
  assigneeId?: string
  assigneeName?: string
  receiptUrl?: string
  description?: string
  allocation: AllocationLogic
  createdAt: string
}

export interface AutomationRule {
  id: string
  name: string
  isActive: boolean
  conditions: {
    type: "keyword" | "amount_range" | "source" | "mcc_code"
    keyword?: string
    minAmount?: number
    maxAmount?: number
    source?: PaymentSource
    mccCode?: string
  }[]
  actions: {
    setCategory?: string
    setRecurring?: boolean
    setAllocation?: AllocationLogic
    assignToMember?: string
    addTag?: string
  }
  matchCount: number
  lastMatchDate?: string
  createdAt: string
}

// Exchange rates (mock - in production would fetch from NBU API)
export const exchangeRates: Record<Currency, number> = {
  USD: 1,
  EUR: 1.08,
  UAH: 0.024,
}

export function convertToUSD(amount: number, currency: Currency): number {
  return Math.round(amount * exchangeRates[currency] * 100) / 100
}

export function formatCurrency(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    USD: "$",
    EUR: "€",
    UAH: "₴",
  }
  return `${symbols[currency]}${amount.toLocaleString()}`
}

// Categories
export const expenseCategories = [
  { id: "infrastructure", name: "Infrastructure", color: "#3B82F6" },
  { id: "software", name: "Software", color: "#8B5CF6" },
  { id: "office", name: "Office", color: "#F59E0B" },
  { id: "legal", name: "Legal", color: "#EF4444" },
  { id: "marketing", name: "Marketing", color: "#EC4899" },
  { id: "equipment", name: "Equipment", color: "#10B981" },
  { id: "food", name: "Food", color: "#F97316" },
  { id: "travel", name: "Travel", color: "#06B6D4" },
  { id: "education", name: "Education", color: "#6366F1" },
  { id: "other", name: "Other", color: "#64748B" },
]

// Mock recurring expenses
export const mockRecurringExpenses: RecurringExpense[] = [
  {
    id: "r1",
    name: "AWS Cloud Services",
    amount: 1200,
    currency: "USD",
    amountUSD: 1200,
    cycle: "monthly",
    category: "infrastructure",
    source: "wise",
    allocation: { type: "all" },
    status: "paid",
    nextPaymentDate: "2024-05-01",
    lastPaidDate: "2024-04-01",
    description: "Main cloud infrastructure",
    createdAt: "2023-01-15",
  },
  {
    id: "r2",
    name: "Office Rent",
    amount: 45000,
    currency: "UAH",
    amountUSD: 1080,
    cycle: "monthly",
    category: "office",
    source: "privat24",
    allocation: { type: "all" },
    status: "pending",
    nextPaymentDate: "2024-04-25",
    lastPaidDate: "2024-03-25",
    description: "Coworking space in Kyiv",
    createdAt: "2022-06-01",
  },
  {
    id: "r3",
    name: "Slack Business+",
    amount: 12.50,
    currency: "USD",
    amountUSD: 12.50,
    cycle: "monthly",
    category: "software",
    source: "monobank",
    allocation: { type: "all" },
    status: "paid",
    nextPaymentDate: "2024-05-10",
    lastPaidDate: "2024-04-10",
    createdAt: "2022-01-01",
  },
  {
    id: "r4",
    name: "Figma Enterprise",
    amount: 180,
    currency: "USD",
    amountUSD: 180,
    cycle: "monthly",
    category: "software",
    source: "wise",
    allocation: { type: "team", teamId: "3", teamName: "Design Studio" },
    status: "paid",
    nextPaymentDate: "2024-05-05",
    lastPaidDate: "2024-04-05",
    createdAt: "2023-03-01",
  },
  {
    id: "r5",
    name: "JetBrains All Products",
    amount: 649,
    currency: "USD",
    amountUSD: 649,
    cycle: "yearly",
    category: "software",
    source: "wise",
    allocation: { type: "team", teamId: "2", teamName: "Backend Team" },
    status: "paid",
    nextPaymentDate: "2025-01-15",
    lastPaidDate: "2024-01-15",
    createdAt: "2022-01-15",
  },
  {
    id: "r6",
    name: "Accountant Services",
    amount: 15000,
    currency: "UAH",
    amountUSD: 360,
    cycle: "monthly",
    category: "legal",
    source: "privat24",
    allocation: { type: "all" },
    status: "paid",
    nextPaymentDate: "2024-05-01",
    lastPaidDate: "2024-04-01",
    createdAt: "2021-01-01",
  },
  {
    id: "r7",
    name: "GitHub Enterprise",
    amount: 21,
    currency: "USD",
    amountUSD: 21,
    cycle: "monthly",
    category: "software",
    source: "monobank",
    allocation: { type: "all" },
    status: "paid",
    nextPaymentDate: "2024-05-15",
    lastPaidDate: "2024-04-15",
    createdAt: "2022-06-01",
  },
  {
    id: "r8",
    name: "Vercel Pro",
    amount: 40,
    currency: "USD",
    amountUSD: 40,
    cycle: "monthly",
    category: "infrastructure",
    source: "monobank",
    allocation: { type: "team", teamId: "1", teamName: "Frontend Squad" },
    status: "pending",
    nextPaymentDate: "2024-04-20",
    createdAt: "2023-02-01",
  },
]

// Mock variable expenses
export const mockVariableExpenses: VariableExpense[] = [
  {
    id: "v1",
    name: "MacBook Pro M3",
    amount: 2499,
    currency: "USD",
    amountUSD: 2499,
    category: "equipment",
    source: "wise",
    date: "2024-04-15",
    assigneeId: "m1",
    assigneeName: "Олександр Коваленко",
    receiptUrl: "/receipts/macbook-m3.pdf",
    description: "New laptop for tech lead",
    allocation: { type: "none" },
    createdAt: "2024-04-15",
  },
  {
    id: "v2",
    name: "Team Building Event",
    amount: 35000,
    currency: "UAH",
    amountUSD: 840,
    category: "other",
    source: "privat24",
    date: "2024-04-10",
    description: "Q1 team gathering",
    allocation: { type: "all" },
    createdAt: "2024-04-10",
  },
  {
    id: "v3",
    name: "Facebook Ads",
    amount: 500,
    currency: "USD",
    amountUSD: 500,
    category: "marketing",
    source: "monobank",
    date: "2024-04-08",
    description: "Recruiting campaign",
    allocation: { type: "all" },
    createdAt: "2024-04-08",
  },
  {
    id: "v4",
    name: "Conference Tickets",
    amount: 800,
    currency: "EUR",
    amountUSD: 864,
    category: "education",
    source: "wise",
    date: "2024-04-05",
    assigneeId: "m5",
    assigneeName: "Дмитро Савченко",
    description: "Backend conference in Warsaw",
    allocation: { type: "team", teamId: "2", teamName: "Backend Team" },
    createdAt: "2024-04-05",
  },
  {
    id: "v5",
    name: "Premium Figma Plugins",
    amount: 150,
    currency: "USD",
    amountUSD: 150,
    category: "software",
    source: "monobank",
    date: "2024-04-01",
    assigneeId: "m7",
    assigneeName: "Юлія Бондаренко",
    allocation: { type: "team", teamId: "3", teamName: "Design Studio" },
    createdAt: "2024-04-01",
  },
  {
    id: "v6",
    name: "Office Supplies",
    amount: 3500,
    currency: "UAH",
    amountUSD: 84,
    category: "office",
    source: "cash",
    date: "2024-03-28",
    receiptUrl: "/receipts/office-supplies.jpg",
    allocation: { type: "all" },
    createdAt: "2024-03-28",
  },
  {
    id: "v7",
    name: "Security Audit",
    amount: 3500,
    currency: "USD",
    amountUSD: 3500,
    category: "infrastructure",
    source: "wise",
    date: "2024-03-20",
    description: "External security audit for crypto project",
    allocation: { type: "project", projectId: "p3", projectName: "Crypto Trading Platform" },
    createdAt: "2024-03-20",
  },
  {
    id: "v8",
    name: "Monitor Dell 27\"",
    amount: 450,
    currency: "USD",
    amountUSD: 450,
    category: "equipment",
    source: "wise",
    date: "2024-03-15",
    assigneeId: "m3",
    assigneeName: "Ігор Петренко",
    receiptUrl: "/receipts/dell-monitor.pdf",
    allocation: { type: "none" },
    createdAt: "2024-03-15",
  },
]

// Mock automation rules
export const mockAutomationRules: AutomationRule[] = [
  {
    id: "rule1",
    name: "AWS Auto-Categorize",
    isActive: true,
    conditions: [
      { type: "keyword", keyword: "AWS" },
      { type: "keyword", keyword: "Amazon Web Services" },
    ],
    actions: {
      setCategory: "infrastructure",
      setRecurring: true,
      setAllocation: { type: "all" },
    },
    matchCount: 24,
    lastMatchDate: "2024-04-01",
    createdAt: "2023-01-15",
  },
  {
    id: "rule2",
    name: "Figma Design Team",
    isActive: true,
    conditions: [
      { type: "keyword", keyword: "Figma" },
    ],
    actions: {
      setCategory: "software",
      setRecurring: true,
      setAllocation: { type: "team", teamId: "3", teamName: "Design Studio" },
    },
    matchCount: 12,
    lastMatchDate: "2024-04-05",
    createdAt: "2023-03-01",
  },
  {
    id: "rule3",
    name: "Office Food Expenses",
    isActive: true,
    conditions: [
      { type: "keyword", keyword: "Auchan" },
      { type: "keyword", keyword: "Silpo" },
      { type: "keyword", keyword: "ATB" },
    ],
    actions: {
      setCategory: "food",
      setAllocation: { type: "all" },
    },
    matchCount: 45,
    lastMatchDate: "2024-04-18",
    createdAt: "2022-06-01",
  },
  {
    id: "rule4",
    name: "JetBrains Backend",
    isActive: true,
    conditions: [
      { type: "keyword", keyword: "JetBrains" },
      { type: "keyword", keyword: "IntelliJ" },
    ],
    actions: {
      setCategory: "software",
      setRecurring: true,
      setAllocation: { type: "team", teamId: "2", teamName: "Backend Team" },
    },
    matchCount: 6,
    lastMatchDate: "2024-01-15",
    createdAt: "2022-01-15",
  },
  {
    id: "rule5",
    name: "Large Equipment Purchase",
    isActive: true,
    conditions: [
      { type: "amount_range", minAmount: 500 },
      { type: "source", source: "wise" },
    ],
    actions: {
      setCategory: "equipment",
      addTag: "needs-review",
    },
    matchCount: 8,
    lastMatchDate: "2024-04-15",
    createdAt: "2023-06-01",
  },
  {
    id: "rule6",
    name: "Uber Taxi",
    isActive: false,
    conditions: [
      { type: "keyword", keyword: "Uber" },
      { type: "keyword", keyword: "Bolt" },
    ],
    actions: {
      setCategory: "travel",
      setAllocation: { type: "all" },
    },
    matchCount: 67,
    lastMatchDate: "2024-04-12",
    createdAt: "2022-01-01",
  },
]

// Helper functions
export function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case "paid": return "text-emerald-600 bg-emerald-50"
    case "pending": return "text-amber-600 bg-amber-50"
    case "overdue": return "text-red-600 bg-red-50"
    default: return "text-muted-foreground bg-muted"
  }
}

export function getSourceIcon(source: PaymentSource): string {
  switch (source) {
    case "monobank": return "🏦"
    case "privat24": return "💳"
    case "cash": return "💵"
    case "wise": return "🌐"
    case "payoneer": return "💱"
    default: return "💰"
  }
}

export function getCycleLabel(cycle: PaymentCycle): string {
  switch (cycle) {
    case "monthly": return "Monthly"
    case "yearly": return "Yearly"
    case "quarterly": return "Quarterly"
    default: return cycle
  }
}

export function calculateMonthlyTotal(expenses: RecurringExpense[]): number {
  return expenses.reduce((total, expense) => {
    let monthlyAmount = expense.amountUSD
    if (expense.cycle === "yearly") monthlyAmount = expense.amountUSD / 12
    if (expense.cycle === "quarterly") monthlyAmount = expense.amountUSD / 3
    return total + monthlyAmount
  }, 0)
}

export function getNextBigPayment(expenses: RecurringExpense[]): RecurringExpense | null {
  const sorted = [...expenses]
    .filter(e => e.status === "pending" || new Date(e.nextPaymentDate) > new Date())
    .sort((a, b) => b.amountUSD - a.amountUSD)
  return sorted[0] || null
}
