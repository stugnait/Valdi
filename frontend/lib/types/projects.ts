import { TeamMember, Team } from "./teams"

export type ProjectStatus = "lead" | "active" | "finished" | "paused"
export type BillingModel = "fixed" | "time-materials"
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue"

export interface ProjectTag {
  id: string
  name: string
  color: string
}

export interface Client {
  id: string
  name: string
  email?: string
  company?: string
  contactPerson?: string
  phone?: string
  country?: string
  notes?: string
  createdAt: string
  totalRevenue: number
  activeProjects: number
}

export type SupportContractStatus = "active" | "paused" | "ended"
export type SupportContractCycle = "monthly" | "quarterly" | "yearly"

export interface SupportContract {
  id: string
  projectId: string
  projectName: string
  clientId: string
  clientName: string
  amount: number
  currency: "USD" | "EUR" | "UAH"
  cycle: SupportContractCycle
  status: SupportContractStatus
  startDate: string
  endDate?: string
  hoursIncluded?: number
  description?: string
  lastPaymentDate?: string
  nextPaymentDate: string
  totalPaid: number
}

export interface Milestone {
  id: string
  name: string
  percentage: number
  amount: number
  dueDate?: string
}

export interface Invoice {
  id: string
  name: string
  amount: number
  status: InvoiceStatus
  dueDate: string
  paidDate?: string
  description?: string
}

export interface ResourceAllocation {
  id: string
  memberId: string
  memberName: string
  memberRole: string
  teamId: string
  teamName: string
  allocation: number // percentage 0-100
  monthlyCost: number
}

export interface ProjectExpense {
  id: string
  name: string
  amount: number
  category: string
  date: string
  description?: string
}

export interface Project {
  id: string
  name: string
  client: Client
  status: ProjectStatus
  startDate: string
  endDate: string
  tags: ProjectTag[]
  
  // Business Model
  billingModel: BillingModel
  currency: "USD" | "EUR" | "UAH"
  
  // Fixed Price specific
  totalContractValue?: number
  milestones?: Milestone[]
  taxReservePercent?: number
  
  // T&M specific
  clientHourlyRate?: number
  monthlyCap?: number
  billingCycle?: "weekly" | "biweekly" | "monthly"
  
  // Financials
  revenue: number // paid invoices
  laborCost: number
  directOverheads: number
  bufferPercent: number
  
  // Resources
  allocations: ResourceAllocation[]
  invoices: Invoice[]
  expenses: ProjectExpense[]
  
  // Calculated
  budgetUsedPercent: number
  netProfit: number
  profitMargin: number
}

// Mock clients
export const mockClients: Client[] = [
  { id: "c1", name: "Nike", company: "Nike Inc.", email: "contact@nike.com", contactPerson: "John Smith", phone: "+1 503-671-6453", country: "USA", createdAt: "2023-06-15", totalRevenue: 85000, activeProjects: 1 },
  { id: "c2", name: "Spotify", company: "Spotify AB", email: "partners@spotify.com", contactPerson: "Emma Lindqvist", phone: "+46 8 123 456", country: "Sweden", createdAt: "2023-09-01", totalRevenue: 48000, activeProjects: 1 },
  { id: "c3", name: "CryptoExchange", company: "CryptoEx Ltd", email: "dev@cryptoex.io", contactPerson: "Alex Chen", phone: "+852 2123 4567", country: "Hong Kong", createdAt: "2024-01-10", totalRevenue: 30000, activeProjects: 1 },
  { id: "c4", name: "TechStartup", company: "TechStartup UA", email: "hello@techstartup.ua", contactPerson: "Oleh Bondar", phone: "+380 44 123 4567", country: "Ukraine", createdAt: "2023-11-20", totalRevenue: 8000, activeProjects: 0 },
  { id: "c5", name: "HealthApp", company: "Health Solutions", email: "project@healthapp.com", contactPerson: "Sarah Miller", phone: "+1 415-555-0123", country: "USA", createdAt: "2024-03-05", totalRevenue: 0, activeProjects: 0, notes: "Lead - potential new client" },
]

// Mock support contracts
export const mockSupportContracts: SupportContract[] = [
  {
    id: "sc1",
    projectId: "p4",
    projectName: "MVP Landing Page",
    clientId: "c4",
    clientName: "TechStartup",
    amount: 500,
    currency: "USD",
    cycle: "monthly",
    status: "active",
    startDate: "2024-03-01",
    hoursIncluded: 5,
    description: "Bug fixes, minor updates, hosting support",
    lastPaymentDate: "2024-05-01",
    nextPaymentDate: "2024-06-01",
    totalPaid: 1500,
  },
  {
    id: "sc2",
    projectId: "p1",
    projectName: "E-commerce App",
    clientId: "c1",
    clientName: "Nike",
    amount: 2000,
    currency: "USD",
    cycle: "monthly",
    status: "active",
    startDate: "2024-04-01",
    hoursIncluded: 20,
    description: "24/7 support, performance monitoring, security patches",
    lastPaymentDate: "2024-05-15",
    nextPaymentDate: "2024-06-15",
    totalPaid: 4000,
  },
  {
    id: "sc3",
    projectId: "p2",
    projectName: "Music Streaming Dashboard",
    clientId: "c2",
    clientName: "Spotify",
    amount: 1200,
    currency: "EUR",
    cycle: "monthly",
    status: "active",
    startDate: "2024-02-01",
    hoursIncluded: 10,
    description: "Feature updates, bug fixes, analytics support",
    lastPaymentDate: "2024-05-01",
    nextPaymentDate: "2024-06-01",
    totalPaid: 4800,
  },
]

// Mock tags
export const mockTags: ProjectTag[] = [
  { id: "t1", name: "React", color: "#61DAFB" },
  { id: "t2", name: "Node.js", color: "#339933" },
  { id: "t3", name: "Mobile", color: "#A855F7" },
  { id: "t4", name: "E-commerce", color: "#F59E0B" },
  { id: "t5", name: "Fintech", color: "#10B981" },
  { id: "t6", name: "SaaS", color: "#3B82F6" },
  { id: "t7", name: "AI/ML", color: "#EC4899" },
  { id: "t8", name: "Web3", color: "#8B5CF6" },
]

// Mock projects
export const mockProjects: Project[] = [
  {
    id: "p1",
    name: "E-commerce App",
    client: mockClients[0],
    status: "active",
    startDate: "2024-01-15",
    endDate: "2024-06-30",
    tags: [mockTags[0], mockTags[3]],
    billingModel: "fixed",
    currency: "USD",
    totalContractValue: 85000,
    milestones: [
      { id: "m1", name: "Prepayment", percentage: 30, amount: 25500 },
      { id: "m2", name: "MVP Release", percentage: 40, amount: 34000 },
      { id: "m3", name: "Final Delivery", percentage: 30, amount: 25500 },
    ],
    taxReservePercent: 5,
    revenue: 59500,
    laborCost: 32400,
    directOverheads: 2800,
    bufferPercent: 10,
    allocations: [
      { id: "a1", memberId: "m1", memberName: "Олександр Коваленко", memberRole: "Tech Lead", teamId: "1", teamName: "Frontend Squad", allocation: 80, monthlyCost: 5200 },
      { id: "a2", memberId: "m2", memberName: "Марія Олійник", memberRole: "Senior Developer", teamId: "1", teamName: "Frontend Squad", allocation: 100, monthlyCost: 5200 },
      { id: "a3", memberId: "m5", memberName: "Дмитро Савченко", memberRole: "Senior Backend Dev", teamId: "2", teamName: "Backend Team", allocation: 60, monthlyCost: 3480 },
    ],
    invoices: [
      { id: "i1", name: "Prepayment 30%", amount: 25500, status: "paid", dueDate: "2024-01-20", paidDate: "2024-01-18" },
      { id: "i2", name: "MVP Release 40%", amount: 34000, status: "paid", dueDate: "2024-04-15", paidDate: "2024-04-12" },
      { id: "i3", name: "Final Delivery 30%", amount: 25500, status: "sent", dueDate: "2024-07-01" },
    ],
    expenses: [
      { id: "e1", name: "AWS Infrastructure", amount: 1200, category: "Infrastructure", date: "2024-02-01" },
      { id: "e2", name: "Premium Template", amount: 800, category: "Assets", date: "2024-01-20" },
      { id: "e3", name: "Domain & SSL", amount: 150, category: "Infrastructure", date: "2024-01-16" },
    ],
    budgetUsedPercent: 72,
    netProfit: 24300,
    profitMargin: 28.6,
  },
  {
    id: "p2",
    name: "Music Streaming Dashboard",
    client: mockClients[1],
    status: "active",
    startDate: "2024-02-01",
    endDate: "2024-08-31",
    tags: [mockTags[0], mockTags[5]],
    billingModel: "time-materials",
    currency: "USD",
    clientHourlyRate: 75,
    monthlyCap: 160,
    billingCycle: "monthly",
    revenue: 48000,
    laborCost: 28800,
    directOverheads: 1500,
    bufferPercent: 5,
    allocations: [
      { id: "a4", memberId: "m3", memberName: "Ігор Петренко", memberRole: "Middle Developer", teamId: "1", teamName: "Frontend Squad", allocation: 100, monthlyCost: 3800 },
      { id: "a5", memberId: "m7", memberName: "Юлія Бондаренко", memberRole: "Design Lead", teamId: "3", teamName: "Design Studio", allocation: 40, monthlyCost: 2000 },
    ],
    invoices: [
      { id: "i4", name: "February Hours", amount: 11250, status: "paid", dueDate: "2024-03-05", paidDate: "2024-03-03" },
      { id: "i5", name: "March Hours", amount: 12000, status: "paid", dueDate: "2024-04-05", paidDate: "2024-04-08" },
      { id: "i6", name: "April Hours", amount: 12750, status: "paid", dueDate: "2024-05-05", paidDate: "2024-05-02" },
      { id: "i7", name: "May Hours", amount: 12000, status: "sent", dueDate: "2024-06-05" },
    ],
    expenses: [
      { id: "e4", name: "Spotify API Access", amount: 500, category: "API", date: "2024-02-01" },
      { id: "e5", name: "Analytics Platform", amount: 300, category: "Software", date: "2024-02-15" },
    ],
    budgetUsedPercent: 58,
    netProfit: 17700,
    profitMargin: 36.9,
  },
  {
    id: "p3",
    name: "Crypto Trading Platform",
    client: mockClients[2],
    status: "active",
    startDate: "2024-03-01",
    endDate: "2024-12-31",
    tags: [mockTags[4], mockTags[7]],
    billingModel: "fixed",
    currency: "USD",
    totalContractValue: 150000,
    milestones: [
      { id: "m4", name: "Deposit", percentage: 20, amount: 30000 },
      { id: "m5", name: "Phase 1: Core", percentage: 30, amount: 45000 },
      { id: "m6", name: "Phase 2: Trading", percentage: 30, amount: 45000 },
      { id: "m7", name: "Final Launch", percentage: 20, amount: 30000 },
    ],
    taxReservePercent: 5,
    revenue: 30000,
    laborCost: 42000,
    directOverheads: 5200,
    bufferPercent: 15,
    allocations: [
      { id: "a6", memberId: "m1", memberName: "Олександр Коваленко", memberRole: "Tech Lead", teamId: "1", teamName: "Frontend Squad", allocation: 20, monthlyCost: 1300 },
      { id: "a7", memberId: "m5", memberName: "Дмитро Савченко", memberRole: "Senior Backend Dev", teamId: "2", teamName: "Backend Team", allocation: 100, monthlyCost: 5800 },
      { id: "a8", memberId: "m6", memberName: "Наталія Кравчук", memberRole: "DevOps Engineer", teamId: "2", teamName: "Backend Team", allocation: 50, monthlyCost: 2700 },
    ],
    invoices: [
      { id: "i8", name: "Deposit 20%", amount: 30000, status: "paid", dueDate: "2024-03-05", paidDate: "2024-03-04" },
      { id: "i9", name: "Phase 1: Core 30%", amount: 45000, status: "draft", dueDate: "2024-06-01" },
    ],
    expenses: [
      { id: "e6", name: "Security Audit", amount: 3500, category: "Security", date: "2024-04-15" },
      { id: "e7", name: "AWS Infrastructure", amount: 1200, category: "Infrastructure", date: "2024-03-01" },
    ],
    budgetUsedPercent: 95,
    netProfit: -17200,
    profitMargin: -57.3,
  },
  {
    id: "p4",
    name: "MVP Landing Page",
    client: mockClients[3],
    status: "finished",
    startDate: "2024-01-01",
    endDate: "2024-02-15",
    tags: [mockTags[0], mockTags[5]],
    billingModel: "fixed",
    currency: "USD",
    totalContractValue: 8000,
    milestones: [
      { id: "m8", name: "Prepayment", percentage: 50, amount: 4000 },
      { id: "m9", name: "Delivery", percentage: 50, amount: 4000 },
    ],
    taxReservePercent: 5,
    revenue: 8000,
    laborCost: 4200,
    directOverheads: 300,
    bufferPercent: 0,
    allocations: [
      { id: "a9", memberId: "m4", memberName: "Анна Шевченко", memberRole: "Junior Developer", teamId: "1", teamName: "Frontend Squad", allocation: 100, monthlyCost: 2200 },
      { id: "a10", memberId: "m8", memberName: "Максим Литвин", memberRole: "UI Designer", teamId: "3", teamName: "Design Studio", allocation: 30, monthlyCost: 1050 },
    ],
    invoices: [
      { id: "i10", name: "Prepayment 50%", amount: 4000, status: "paid", dueDate: "2024-01-05", paidDate: "2024-01-03" },
      { id: "i11", name: "Final 50%", amount: 4000, status: "paid", dueDate: "2024-02-20", paidDate: "2024-02-18" },
    ],
    expenses: [
      { id: "e8", name: "Stock Images", amount: 150, category: "Assets", date: "2024-01-10" },
    ],
    budgetUsedPercent: 100,
    netProfit: 3500,
    profitMargin: 43.8,
  },
  {
    id: "p5",
    name: "Health Tracking Mobile App",
    client: mockClients[4],
    status: "lead",
    startDate: "2024-07-01",
    endDate: "2024-12-31",
    tags: [mockTags[2], mockTags[0]],
    billingModel: "fixed",
    currency: "USD",
    totalContractValue: 65000,
    milestones: [
      { id: "m10", name: "Prepayment", percentage: 25, amount: 16250 },
      { id: "m11", name: "Design Phase", percentage: 25, amount: 16250 },
      { id: "m12", name: "Development", percentage: 35, amount: 22750 },
      { id: "m13", name: "Launch", percentage: 15, amount: 9750 },
    ],
    taxReservePercent: 5,
    revenue: 0,
    laborCost: 0,
    directOverheads: 0,
    bufferPercent: 10,
    allocations: [],
    invoices: [],
    expenses: [],
    budgetUsedPercent: 0,
    netProfit: 0,
    profitMargin: 0,
  },
]

// Subscription Types
export type SubscriptionStatus = "active" | "pending" | "paused" | "cancelled" | "expired"
export type SubscriptionBillingCycle = "monthly" | "quarterly" | "semi-annual" | "yearly"
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded"

export interface SubscriptionPayment {
  id: string
  subscriptionId: string
  amount: number
  currency: "USD" | "EUR" | "UAH"
  status: PaymentStatus
  paymentDate: string
  dueDate: string
  invoiceNumber?: string
  notes?: string
}

export interface ClientSubscription {
  id: string
  clientId: string
  clientName: string
  projectId?: string
  projectName?: string
  
  // Subscription Details
  planName: string
  description?: string
  status: SubscriptionStatus
  
  // Billing
  amount: number
  currency: "USD" | "EUR" | "UAH"
  billingCycle: SubscriptionBillingCycle
  
  // Dates
  startDate: string
  endDate?: string
  nextBillingDate: string
  lastPaymentDate?: string
  
  // Confirmation
  confirmedAt?: string
  confirmedBy?: string
  contractUrl?: string
  
  // Features/Limits
  features?: string[]
  hoursIncluded?: number
  usersIncluded?: number
  
  // Financial Summary
  totalPaid: number
  payments: SubscriptionPayment[]
  
  // Metadata
  createdAt: string
  updatedAt: string
}

// Mock Subscription Payments
export const mockSubscriptionPayments: SubscriptionPayment[] = [
  // TechStartup subscription payments
  { id: "sp1", subscriptionId: "sub1", amount: 299, currency: "USD", status: "completed", paymentDate: "2024-01-15", dueDate: "2024-01-15", invoiceNumber: "INV-SUB-001" },
  { id: "sp2", subscriptionId: "sub1", amount: 299, currency: "USD", status: "completed", paymentDate: "2024-02-15", dueDate: "2024-02-15", invoiceNumber: "INV-SUB-002" },
  { id: "sp3", subscriptionId: "sub1", amount: 299, currency: "USD", status: "completed", paymentDate: "2024-03-15", dueDate: "2024-03-15", invoiceNumber: "INV-SUB-003" },
  { id: "sp4", subscriptionId: "sub1", amount: 299, currency: "USD", status: "completed", paymentDate: "2024-04-15", dueDate: "2024-04-15", invoiceNumber: "INV-SUB-004" },
  { id: "sp5", subscriptionId: "sub1", amount: 299, currency: "USD", status: "pending", paymentDate: "", dueDate: "2024-05-15", invoiceNumber: "INV-SUB-005" },
  
  // Nike subscription payments
  { id: "sp6", subscriptionId: "sub2", amount: 1500, currency: "USD", status: "completed", paymentDate: "2024-02-01", dueDate: "2024-02-01", invoiceNumber: "INV-SUB-010" },
  { id: "sp7", subscriptionId: "sub2", amount: 1500, currency: "USD", status: "completed", paymentDate: "2024-03-01", dueDate: "2024-03-01", invoiceNumber: "INV-SUB-011" },
  { id: "sp8", subscriptionId: "sub2", amount: 1500, currency: "USD", status: "completed", paymentDate: "2024-04-01", dueDate: "2024-04-01", invoiceNumber: "INV-SUB-012" },
  { id: "sp9", subscriptionId: "sub2", amount: 1500, currency: "USD", status: "pending", paymentDate: "", dueDate: "2024-05-01", invoiceNumber: "INV-SUB-013" },
  
  // Spotify subscription payments
  { id: "sp10", subscriptionId: "sub3", amount: 2400, currency: "EUR", status: "completed", paymentDate: "2024-01-01", dueDate: "2024-01-01", invoiceNumber: "INV-SUB-020" },
  { id: "sp11", subscriptionId: "sub3", amount: 2400, currency: "EUR", status: "pending", paymentDate: "", dueDate: "2024-04-01", invoiceNumber: "INV-SUB-021" },
  
  // CryptoExchange subscription payments
  { id: "sp12", subscriptionId: "sub4", amount: 5000, currency: "USD", status: "completed", paymentDate: "2024-03-15", dueDate: "2024-03-15", invoiceNumber: "INV-SUB-030" },
  
  // HealthApp subscription payments (pending confirmation)
  { id: "sp13", subscriptionId: "sub5", amount: 199, currency: "USD", status: "pending", paymentDate: "", dueDate: "2024-06-01", invoiceNumber: "INV-SUB-040" },
]

// Mock Client Subscriptions
export const mockClientSubscriptions: ClientSubscription[] = [
  {
    id: "sub1",
    clientId: "c4",
    clientName: "TechStartup",
    projectId: "p4",
    projectName: "MVP Landing Page",
    planName: "Growth Support",
    description: "Ongoing technical support and minor feature updates",
    status: "active",
    amount: 299,
    currency: "USD",
    billingCycle: "monthly",
    startDate: "2024-01-15",
    nextBillingDate: "2024-05-15",
    lastPaymentDate: "2024-04-15",
    confirmedAt: "2024-01-10",
    confirmedBy: "Олег Бондар",
    contractUrl: "/contracts/techstartup-support-2024.pdf",
    features: ["5 hours support/month", "Bug fixes", "Security updates", "Email support"],
    hoursIncluded: 5,
    totalPaid: 1196,
    payments: mockSubscriptionPayments.filter(p => p.subscriptionId === "sub1"),
    createdAt: "2024-01-10",
    updatedAt: "2024-04-15",
  },
  {
    id: "sub2",
    clientId: "c1",
    clientName: "Nike",
    projectId: "p1",
    projectName: "E-commerce App",
    planName: "Enterprise Support",
    description: "24/7 premium support with dedicated team and SLA",
    status: "active",
    amount: 1500,
    currency: "USD",
    billingCycle: "monthly",
    startDate: "2024-02-01",
    nextBillingDate: "2024-05-01",
    lastPaymentDate: "2024-04-01",
    confirmedAt: "2024-01-25",
    confirmedBy: "John Smith",
    contractUrl: "/contracts/nike-enterprise-2024.pdf",
    features: ["Unlimited support hours", "24/7 availability", "Dedicated Slack channel", "Priority bug fixes", "Performance monitoring", "Monthly reports"],
    hoursIncluded: 40,
    usersIncluded: 10,
    totalPaid: 4500,
    payments: mockSubscriptionPayments.filter(p => p.subscriptionId === "sub2"),
    createdAt: "2024-01-25",
    updatedAt: "2024-04-01",
  },
  {
    id: "sub3",
    clientId: "c2",
    clientName: "Spotify",
    projectId: "p2",
    projectName: "Music Streaming Dashboard",
    planName: "Pro Maintenance",
    description: "Quarterly maintenance and feature updates package",
    status: "active",
    amount: 2400,
    currency: "EUR",
    billingCycle: "quarterly",
    startDate: "2024-01-01",
    nextBillingDate: "2024-04-01",
    lastPaymentDate: "2024-01-01",
    confirmedAt: "2023-12-20",
    confirmedBy: "Emma Lindqvist",
    contractUrl: "/contracts/spotify-maintenance-2024.pdf",
    features: ["15 hours/quarter", "Feature updates", "Performance optimization", "Analytics review"],
    hoursIncluded: 15,
    totalPaid: 2400,
    payments: mockSubscriptionPayments.filter(p => p.subscriptionId === "sub3"),
    createdAt: "2023-12-20",
    updatedAt: "2024-01-01",
  },
  {
    id: "sub4",
    clientId: "c3",
    clientName: "CryptoExchange",
    projectId: "p3",
    projectName: "Crypto Trading Platform",
    planName: "Security Package",
    description: "Semi-annual security audits and compliance updates",
    status: "active",
    amount: 5000,
    currency: "USD",
    billingCycle: "semi-annual",
    startDate: "2024-03-15",
    nextBillingDate: "2024-09-15",
    lastPaymentDate: "2024-03-15",
    confirmedAt: "2024-03-10",
    confirmedBy: "Alex Chen",
    contractUrl: "/contracts/cryptoex-security-2024.pdf",
    features: ["Security audit", "Penetration testing", "Compliance review", "Security patches", "Incident response"],
    totalPaid: 5000,
    payments: mockSubscriptionPayments.filter(p => p.subscriptionId === "sub4"),
    createdAt: "2024-03-10",
    updatedAt: "2024-03-15",
  },
  {
    id: "sub5",
    clientId: "c5",
    clientName: "HealthApp",
    planName: "Starter Support",
    description: "Basic support package for new projects",
    status: "pending",
    amount: 199,
    currency: "USD",
    billingCycle: "monthly",
    startDate: "2024-06-01",
    nextBillingDate: "2024-06-01",
    features: ["3 hours support/month", "Bug fixes", "Email support"],
    hoursIncluded: 3,
    totalPaid: 0,
    payments: mockSubscriptionPayments.filter(p => p.subscriptionId === "sub5"),
    createdAt: "2024-05-01",
    updatedAt: "2024-05-01",
  },
  {
    id: "sub6",
    clientId: "c4",
    clientName: "TechStartup",
    planName: "Analytics Add-on",
    description: "Monthly analytics and reporting service",
    status: "paused",
    amount: 150,
    currency: "USD",
    billingCycle: "monthly",
    startDate: "2024-02-01",
    endDate: "2024-04-01",
    nextBillingDate: "2024-05-01",
    lastPaymentDate: "2024-03-01",
    confirmedAt: "2024-01-28",
    confirmedBy: "Олег Бондар",
    features: ["Monthly traffic report", "Conversion analysis", "SEO recommendations"],
    totalPaid: 300,
    payments: [],
    createdAt: "2024-01-28",
    updatedAt: "2024-04-01",
  },
]

// Subscription Helper Functions
export function getSubscriptionStatusColor(status: SubscriptionStatus): string {
  switch (status) {
    case "active": return "default"
    case "pending": return "secondary"
    case "paused": return "outline"
    case "cancelled": return "destructive"
    case "expired": return "destructive"
    default: return "secondary"
  }
}

export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case "active": return "Активна"
    case "pending": return "Очікує"
    case "paused": return "Призупинено"
    case "cancelled": return "Скасовано"
    case "expired": return "Закінчилась"
    default: return status
  }
}

export function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case "completed": return "default"
    case "pending": return "secondary"
    case "failed": return "destructive"
    case "refunded": return "outline"
    default: return "secondary"
  }
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "completed": return "Оплачено"
    case "pending": return "Очікує"
    case "failed": return "Помилка"
    case "refunded": return "Повернено"
    default: return status
  }
}

export function getBillingCycleLabel(cycle: SubscriptionBillingCycle): string {
  switch (cycle) {
    case "monthly": return "Щомісяця"
    case "quarterly": return "Щоквартально"
    case "semi-annual": return "Раз на півроку"
    case "yearly": return "Щороку"
    default: return cycle
  }
}

export function calculateSubscriptionMetrics(subscriptions: ClientSubscription[]) {
  const activeSubscriptions = subscriptions.filter(s => s.status === "active")
  
  const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
    let monthlyAmount = sub.amount
    switch (sub.billingCycle) {
      case "quarterly": monthlyAmount = sub.amount / 3; break
      case "semi-annual": monthlyAmount = sub.amount / 6; break
      case "yearly": monthlyAmount = sub.amount / 12; break
    }
    // Convert to USD for simplicity
    if (sub.currency === "EUR") monthlyAmount *= 1.08
    if (sub.currency === "UAH") monthlyAmount *= 0.027
    return sum + monthlyAmount
  }, 0)
  
  const totalPaid = subscriptions.reduce((sum, sub) => sum + sub.totalPaid, 0)
  const pendingPayments = subscriptions.flatMap(s => s.payments).filter(p => p.status === "pending")
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0)
  
  return {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: activeSubscriptions.length,
    monthlyRecurringRevenue,
    totalPaid,
    pendingPayments: pendingPayments.length,
    pendingAmount,
  }
}

// Helper functions
export function getBudgetHealthColor(percent: number, profit: number): string {
  if (profit < 0) return "destructive"
  if (percent >= 90) return "destructive"
  if (percent >= 75) return "warning"
  return "success"
}

export function getStatusBadgeVariant(status: ProjectStatus): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": return "default"
    case "lead": return "secondary"
    case "finished": return "outline"
    case "paused": return "destructive"
    default: return "secondary"
  }
}

export function getStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "active": return "Active"
    case "lead": return "Lead"
    case "finished": return "Finished"
    case "paused": return "Paused"
    default: return status
  }
}

export function calculateProjectMetrics(project: Project) {
  const totalRevenue = project.invoices
    .filter(i => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0)
  
  const totalLaborCost = project.allocations.reduce((sum, a) => sum + a.monthlyCost, 0)
  const totalExpenses = project.expenses.reduce((sum, e) => sum + e.amount, 0)
  
  const netProfit = totalRevenue - totalLaborCost - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  
  const budgetUsed = project.totalContractValue 
    ? ((totalLaborCost + totalExpenses) / project.totalContractValue) * 100
    : 0
  
  return {
    revenue: totalRevenue,
    laborCost: totalLaborCost,
    directOverheads: totalExpenses,
    netProfit,
    profitMargin,
    budgetUsedPercent: Math.min(budgetUsed, 100),
  }
}
