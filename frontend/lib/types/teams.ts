export interface Skill {
  id: string
  name: string
  color: string
}

export interface TeamMembership {
  teamId: string
  teamName: string
  allocation: number // percentage 0-100
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  baseRate: number // monthly or hourly rate
  rateType: "monthly" | "hourly"
  teamOverheadShare: number
  companyOverheadShare: number
  skills: Skill[]
  utilization: number // percentage 0-100
  revenue: number
  teamMemberships: TeamMembership[] // for multi-team membership
}

export interface TeamOverhead {
  id: string
  name: string
  amount: number
  frequency: "monthly" | "yearly" | "one-time"
  category: string
  description?: string
}

export interface BurnRateDataPoint {
  month: string
  burnRate: number
  revenue: number
}

export interface Team {
  id: string
  name: string
  description?: string
  color: string
  headcount: number
  burnRate: number // monthly burn rate
  utilization: number // percentage 0-100
  efficiencyScore: number // ratio of revenue to cost
  members: TeamMember[]
  overheads: TeamOverhead[]
  burnRateHistory: BurnRateDataPoint[]
}

// Mock data
export const mockSkills: Skill[] = [
  { id: "1", name: "React", color: "#61DAFB" },
  { id: "2", name: "TypeScript", color: "#3178C6" },
  { id: "3", name: "Node.js", color: "#339933" },
  { id: "4", name: "Python", color: "#3776AB" },
  { id: "5", name: "Figma", color: "#F24E1E" },
  { id: "6", name: "UI/UX", color: "#FF6B6B" },
  { id: "7", name: "Senior", color: "#8B5CF6" },
  { id: "8", name: "Lead", color: "#F59E0B" },
  { id: "9", name: "DevOps", color: "#06B6D4" },
  { id: "10", name: "AWS", color: "#FF9900" },
]

export const mockTeams: Team[] = [
  {
    id: "1",
    name: "Frontend Squad",
    description: "Web and mobile frontend development team",
    color: "#2563eb",
    headcount: 8,
    burnRate: 42500,
    utilization: 87,
    efficiencyScore: 1.42,
    members: [
      {
        id: "m1",
        name: "Олександр Коваленко",
        email: "oleksandr@agency.com",
        role: "Tech Lead",
        baseRate: 6500,
        rateType: "monthly",
        teamOverheadShare: 450,
        companyOverheadShare: 280,
        skills: [
          { id: "1", name: "React", color: "#61DAFB" },
          { id: "2", name: "TypeScript", color: "#3178C6" },
          { id: "8", name: "Lead", color: "#F59E0B" },
        ],
        utilization: 94,
        revenue: 18500,
        teamMemberships: [{ teamId: "1", teamName: "Frontend Squad", allocation: 100 }],
      },
      {
        id: "m2",
        name: "Марія Олійник",
        email: "maria@agency.com",
        role: "Senior Developer",
        baseRate: 5200,
        rateType: "monthly",
        teamOverheadShare: 450,
        companyOverheadShare: 280,
        skills: [
          { id: "1", name: "React", color: "#61DAFB" },
          { id: "2", name: "TypeScript", color: "#3178C6" },
          { id: "7", name: "Senior", color: "#8B5CF6" },
        ],
        utilization: 91,
        revenue: 14200,
        teamMemberships: [{ teamId: "1", teamName: "Frontend Squad", allocation: 100 }],
      },
      {
        id: "m3",
        name: "Ігор Петренко",
        email: "igor@agency.com",
        role: "Middle Developer",
        baseRate: 3800,
        rateType: "monthly",
        teamOverheadShare: 450,
        companyOverheadShare: 280,
        skills: [
          { id: "1", name: "React", color: "#61DAFB" },
          { id: "3", name: "Node.js", color: "#339933" },
        ],
        utilization: 82,
        revenue: 9800,
        teamMemberships: [{ teamId: "1", teamName: "Frontend Squad", allocation: 100 }],
      },
      {
        id: "m4",
        name: "Анна Шевченко",
        email: "anna@agency.com",
        role: "Junior Developer",
        baseRate: 2200,
        rateType: "monthly",
        teamOverheadShare: 450,
        companyOverheadShare: 280,
        skills: [
          { id: "1", name: "React", color: "#61DAFB" },
        ],
        utilization: 78,
        revenue: 5400,
        teamMemberships: [{ teamId: "1", teamName: "Frontend Squad", allocation: 100 }],
      },
    ],
    overheads: [
      { id: "o1", name: "Figma Team", amount: 75, frequency: "monthly", category: "Software" },
      { id: "o2", name: "Vercel Pro", amount: 40, frequency: "monthly", category: "Infrastructure" },
      { id: "o3", name: "GitHub Copilot", amount: 152, frequency: "monthly", category: "Software" },
    ],
    burnRateHistory: [
      { month: "Лис", burnRate: 38000, revenue: 52000 },
      { month: "Гру", burnRate: 40200, revenue: 48000 },
      { month: "Січ", burnRate: 41500, revenue: 55000 },
      { month: "Лют", burnRate: 42000, revenue: 58000 },
      { month: "Бер", burnRate: 42500, revenue: 60000 },
      { month: "Кві", burnRate: 42500, revenue: 62000 },
    ],
  },
  {
    id: "2",
    name: "Backend Team",
    description: "API and infrastructure development",
    color: "#10b981",
    headcount: 6,
    burnRate: 38200,
    utilization: 92,
    efficiencyScore: 1.58,
    members: [
      {
        id: "m5",
        name: "Дмитро Савченко",
        email: "dmytro@agency.com",
        role: "Senior Backend Dev",
        baseRate: 5800,
        rateType: "monthly",
        teamOverheadShare: 620,
        companyOverheadShare: 280,
        skills: [
          { id: "3", name: "Node.js", color: "#339933" },
          { id: "4", name: "Python", color: "#3776AB" },
          { id: "7", name: "Senior", color: "#8B5CF6" },
        ],
        utilization: 95,
        revenue: 16800,
        teamMemberships: [{ teamId: "2", teamName: "Backend Team", allocation: 100 }],
      },
      {
        id: "m6",
        name: "Наталія Кравчук",
        email: "natalia@agency.com",
        role: "DevOps Engineer",
        baseRate: 5400,
        rateType: "monthly",
        teamOverheadShare: 620,
        companyOverheadShare: 280,
        skills: [
          { id: "9", name: "DevOps", color: "#06B6D4" },
          { id: "10", name: "AWS", color: "#FF9900" },
        ],
        utilization: 88,
        revenue: 12400,
        teamMemberships: [
          { teamId: "2", teamName: "Backend Team", allocation: 70 },
          { teamId: "1", teamName: "Frontend Squad", allocation: 30 },
        ],
      },
    ],
    overheads: [
      { id: "o4", name: "AWS Credits", amount: 1200, frequency: "monthly", category: "Infrastructure" },
      { id: "o5", name: "JetBrains All Products", amount: 249, frequency: "yearly", category: "Software" },
      { id: "o6", name: "Datadog", amount: 180, frequency: "monthly", category: "Monitoring" },
    ],
    burnRateHistory: [
      { month: "Лис", burnRate: 35000, revenue: 54000 },
      { month: "Гру", burnRate: 36500, revenue: 56000 },
      { month: "Січ", burnRate: 37000, revenue: 58000 },
      { month: "Лют", burnRate: 37800, revenue: 59000 },
      { month: "Бер", burnRate: 38200, revenue: 60000 },
      { month: "Кві", burnRate: 38200, revenue: 61000 },
    ],
  },
  {
    id: "3",
    name: "Design Studio",
    description: "UI/UX and brand design",
    color: "#f59e0b",
    headcount: 4,
    burnRate: 22800,
    utilization: 45,
    efficiencyScore: 0.72,
    members: [
      {
        id: "m7",
        name: "Юлія Бондаренко",
        email: "yulia@agency.com",
        role: "Design Lead",
        baseRate: 5000,
        rateType: "monthly",
        teamOverheadShare: 380,
        companyOverheadShare: 280,
        skills: [
          { id: "5", name: "Figma", color: "#F24E1E" },
          { id: "6", name: "UI/UX", color: "#FF6B6B" },
          { id: "8", name: "Lead", color: "#F59E0B" },
        ],
        utilization: 52,
        revenue: 8200,
        teamMemberships: [{ teamId: "3", teamName: "Design Studio", allocation: 100 }],
      },
      {
        id: "m8",
        name: "Максим Литвин",
        email: "maksym@agency.com",
        role: "UI Designer",
        baseRate: 3500,
        rateType: "monthly",
        teamOverheadShare: 380,
        companyOverheadShare: 280,
        skills: [
          { id: "5", name: "Figma", color: "#F24E1E" },
          { id: "6", name: "UI/UX", color: "#FF6B6B" },
        ],
        utilization: 38,
        revenue: 4200,
        teamMemberships: [{ teamId: "3", teamName: "Design Studio", allocation: 100 }],
      },
    ],
    overheads: [
      { id: "o7", name: "Adobe Creative Cloud", amount: 600, frequency: "monthly", category: "Software" },
      { id: "o8", name: "Figma Enterprise", amount: 180, frequency: "monthly", category: "Software" },
      { id: "o9", name: "Stock Photos", amount: 99, frequency: "monthly", category: "Assets" },
    ],
    burnRateHistory: [
      { month: "Лис", burnRate: 22000, revenue: 18000 },
      { month: "Гру", burnRate: 22400, revenue: 16000 },
      { month: "Січ", burnRate: 22600, revenue: 17500 },
      { month: "Лют", burnRate: 22800, revenue: 15000 },
      { month: "Бер", burnRate: 22800, revenue: 16500 },
      { month: "Кві", burnRate: 22800, revenue: 16000 },
    ],
  },
]
