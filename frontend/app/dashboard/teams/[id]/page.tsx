"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  DollarSign,
  Percent,
  X,
  ChevronDown,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  type Team, 
  type TeamMember, 
  type TeamOverhead,
  type Skill,
  type TeamMembership
} from "@/lib/types/teams"
import { expenseCategories } from "@/lib/types/spendings"
import { type ApiDeveloper, type ApiTeam, workforceApi } from "@/lib/api/workforce"
import {
  deleteMemberUiData,
  getMemberUiData,
  getTeamOverheads,
  getTeamMemberJoinDate,
  getTeamUiMeta,
  setTeamMemberJoinDate,
  setMemberUiData,
  setTeamOverheads,
} from "@/lib/storage/team-ui"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import { calculateEmployeeBaseCost, calculateTeamMetrics, MONTHLY_WORK_HOURS } from "@/lib/utils/team-metrics"

const skillGroups: Array<{ title: string; skills: Skill[] }> = [
  {
    title: "Frontend",
    skills: [
      { id: "react", name: "React", color: "#61DAFB" },
      { id: "vue", name: "Vue", color: "#42B883" },
      { id: "angular", name: "Angular", color: "#DD0031" },
      { id: "typescript", name: "TypeScript", color: "#3178C6" },
      { id: "javascript", name: "JavaScript", color: "#F7DF1E" },
    ],
  },
  {
    title: "Backend",
    skills: [
      { id: "nodejs", name: "Node.js", color: "#339933" },
      { id: "python", name: "Python", color: "#3776AB" },
      { id: "java", name: "Java", color: "#F89820" },
      { id: "go", name: "Go", color: "#00ADD8" },
    ],
  },
]

const toHourlyRatePayload = (baseRate: number, rateType: "monthly" | "hourly") => {
  const rawHourly = rateType === "monthly" ? baseRate / MONTHLY_WORK_HOURS : baseRate
  return Math.round(rawHourly * 100) / 100
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  
  // Member CRUD state
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [isDeleteMemberOpen, setIsDeleteMemberOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    role: "",
    baseRate: "",
    rateType: "monthly" as "monthly" | "hourly",
    currentTeamAllocation: "100",
    skills: [] as Skill[],
    teamMemberships: [] as TeamMembership[],
  })

  // Overhead CRUD state
  const [isOverheadDialogOpen, setIsOverheadDialogOpen] = useState(false)
  const [isDeleteOverheadOpen, setIsDeleteOverheadOpen] = useState(false)
  const [selectedOverhead, setSelectedOverhead] = useState<TeamOverhead | null>(null)
  const [overheadForm, setOverheadForm] = useState({
    name: "",
    amount: "",
    frequency: "monthly" as "monthly" | "yearly" | "one-time",
    category: "",
    source: "cash" as "cash" | "monobank" | "privat24",
    paidDate: new Date().toISOString().split("T")[0],
  })

  const toUiTeam = (
    apiTeam: ApiTeam,
    developersById: Map<number, ApiDeveloper>,
    totals: { revenue: number; laborCost: number }
  ): Team => {
    const members = apiTeam.memberships.map((membership) => {
      const developer = developersById.get(membership.developer)
      const baseRate = Number(developer?.hourly_rate ?? 0) * MONTHLY_WORK_HOURS
      const utilization = membership.allocation

      const savedMemberUi = getMemberUiData(String(membership.developer))
      const storedJoinDate = getTeamMemberJoinDate(String(apiTeam.id), String(membership.developer))
      const joinDate = storedJoinDate || developer?.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]
      return {
        id: String(membership.developer),
        name: membership.developer_name ?? developer?.full_name ?? "Розробник",
        email: membership.developer_email ?? developer?.email ?? "",
        role: developer?.role ?? "",
        baseRate,
        rateType: "monthly" as const,
        teamOverheadShare: 0,
        companyOverheadShare: 0,
        skills: savedMemberUi.skills ?? [],
        utilization,
        revenue: 0,
        teamMemberships: [{ teamId: String(apiTeam.id), teamName: apiTeam.name, allocation: membership.allocation }],
        joinDate,
      }
    })
    const overheads = getTeamOverheads(String(apiTeam.id))
    const nowDate = new Date()
    const activeMembers = members.filter((member) => new Date(member.joinDate) <= nowDate)
    const metrics = calculateTeamMetrics(activeMembers, overheads)
    const teamContribution = totals.laborCost > 0 ? metrics.teamLaborCost / totals.laborCost : 0
    const totalRevenue = totals.revenue * teamContribution
    const membersWithCost = members.map((member) => ({
      ...member,
      monthlyCost:
        metrics.memberCostById.get(member.id)?.totalCost ?? 0,
      teamOverheadShare: metrics.memberCostById.get(member.id)?.teamOverheadShare ?? 0,
      companyOverheadShare: metrics.memberCostById.get(member.id)?.companyOverheadShare ?? 0,
    }))
    const membersWithRevenue = membersWithCost.map((member) => ({
      ...member,
      revenue: metrics.teamLaborCost > 0 ? (calculateEmployeeBaseCost(member) / metrics.teamLaborCost) * totalRevenue : 0,
    }))
    const now = new Date()
    const burnRateHistory = Array.from({ length: 6 }).map((_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      const historicalMembers = members.filter((member) => new Date(member.joinDate) <= monthEnd)
      const historicalMetrics = calculateTeamMetrics(historicalMembers, overheads)
      const historicalContribution = totals.laborCost > 0 ? historicalMetrics.teamLaborCost / totals.laborCost : 0
      const historicalRevenue = totals.revenue * historicalContribution
      return {
        month: monthDate.toLocaleDateString("uk-UA", { month: "short" }),
        burnRate: historicalMetrics.burnRate,
        revenue: historicalRevenue,
      }
    })

    return {
      id: String(apiTeam.id),
      name: apiTeam.name,
      description: apiTeam.description,
      color: getTeamUiMeta(String(apiTeam.id)).color ?? "#2563eb",
      headcount: members.length,
      burnRate: metrics.burnRate,
      utilization: metrics.utilization,
      efficiencyScore: metrics.burnRate > 0 ? totalRevenue / metrics.burnRate : 0,
      members: membersWithRevenue,
      overheads,
      burnRateHistory,
    }
  }

  const syncTeamMemberships = async (members: TeamMember[]) => {
    await workforceApi.updateTeam(id, {
      memberships: members.map((member) => ({
        developer: Number(member.id),
        allocation: member.teamMemberships[0]?.allocation ?? 100,
      })),
    })
  }

  const syncDeveloperAcrossTeams = async (
    developerId: number,
    existingTeamIds: number[],
    memberships: TeamMembership[]
  ) => {
    const allTeams = await workforceApi.listTeams()
    const desiredMemberships = memberships.length > 0
      ? memberships
      : [{ teamId: String(id), teamName: "", allocation: 100 }]

    const desiredByTeamId = new Map<number, number>()

    desiredMemberships.forEach((membership) => {
      const rawTeamId = Number(membership.teamId)
      let resolvedTeamId = Number.isNaN(rawTeamId) || rawTeamId <= 0 ? null : rawTeamId

      if (!resolvedTeamId && membership.teamName.trim()) {
        const matchedTeam = allTeams.find(
          (candidate) => candidate.name.trim().toLowerCase() === membership.teamName.trim().toLowerCase()
        )
        resolvedTeamId = matchedTeam?.id ?? null
      }

      if (!resolvedTeamId) return

      desiredByTeamId.set(resolvedTeamId, Math.min(100, Math.max(0, membership.allocation || 0)))
    })

    if (!desiredByTeamId.has(Number(id))) {
      desiredByTeamId.set(Number(id), 100)
    }

    const impactedTeamIds = new Set<number>([
      ...existingTeamIds,
      ...desiredByTeamId.keys(),
    ])

    await Promise.all(
      Array.from(impactedTeamIds).map(async (teamId) => {
        const targetTeam = allTeams.find((candidate) => candidate.id === teamId)
        if (!targetTeam) return

        const membershipsWithoutDeveloper = targetTeam.memberships.filter(
          (membership) => membership.developer !== developerId
        )
        const nextAllocation = desiredByTeamId.get(teamId)
        const nextMemberships =
          nextAllocation === undefined
            ? membershipsWithoutDeveloper
            : [...membershipsWithoutDeveloper, { developer: developerId, allocation: nextAllocation }]

        await workforceApi.updateTeam(teamId, {
          memberships: nextMemberships.map((membership) => ({
            developer: membership.developer,
            allocation: membership.allocation,
          })),
        })
      })
    )
  }

  const loadTeam = async () => {
    setIsLoading(true)
    setError("")
    try {
      const [apiTeam, developers, projects] = await Promise.all([
        workforceApi.getTeam(id),
        workforceApi.listDevelopers(),
        workforceApi.listProjects(),
      ])
      const totals = projects.reduce(
        (acc, project) => ({
          revenue: acc.revenue + Number(project.revenue ?? 0),
          laborCost: acc.laborCost + Number(project.labor_cost ?? 0),
        }),
        { revenue: 0, laborCost: 0 }
      )
      const developersById = new Map(developers.map((developer) => [developer.id, developer]))
      setTeam(toUiTeam(apiTeam, developersById, totals))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити команду")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTeam()
  }, [id])

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Завантаження команди...</div>
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Команду не знайдено</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/dashboard/teams">Повернутися до центру команд</Link>
        </Button>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Member CRUD handlers
  const handleSaveMember = async () => {
    if (!team) return

    try {
      const baseRate = parseFloat(memberForm.baseRate) || 0
      const hourlyRate = toHourlyRatePayload(baseRate, memberForm.rateType)
      const currentTeamAllocation = Math.min(
        100,
        Math.max(0, parseInt(memberForm.currentTeamAllocation, 10) || 100)
      )
      const apiDeveloper = selectedMember
        ? await workforceApi.updateDeveloper(selectedMember.id, {
            full_name: memberForm.name,
            email: memberForm.email,
            role: memberForm.role,
            hourly_rate: hourlyRate,
          })
        : await workforceApi.createDeveloper({
            full_name: memberForm.name,
            email: memberForm.email,
            role: memberForm.role,
            hourly_rate: hourlyRate,
            is_active: true,
          })

      const newMember: TeamMember = {
      id: String(apiDeveloper.id),
      name: memberForm.name,
      email: memberForm.email,
      role: memberForm.role,
      baseRate,
      rateType: memberForm.rateType,
      teamOverheadShare: 0,
      companyOverheadShare: 0,
      skills: memberForm.skills,
      utilization: 0,
      revenue: 0,
      teamMemberships: (() => {
        const nonCurrentTeamMemberships = memberForm.teamMemberships.filter(
          (membership) => String(membership.teamId) !== String(team.id)
        )
        return [
          { teamId: team.id, teamName: team.name, allocation: currentTeamAllocation },
          ...nonCurrentTeamMemberships,
        ]
      })(),
    }
      setMemberUiData(newMember.id, {
        skills: newMember.skills,
      })

      await syncDeveloperAcrossTeams(
        apiDeveloper.id,
        apiDeveloper.teams.map((teamMembership) => teamMembership.id),
        newMember.teamMemberships
      )
      setTeamMemberJoinDate(String(team.id), String(apiDeveloper.id), new Date().toISOString().split("T")[0])
      await loadTeam()
      closeMemberDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося зберегти члена команди")
    }
  }

  const handleDeleteMember = async () => {
    if (!team || !selectedMember) return
    try {
      await workforceApi.deleteDeveloper(selectedMember.id)
      deleteMemberUiData(selectedMember.id)
      const updatedMembers = team.members.filter(m => m.id !== selectedMember.id)
      await syncTeamMemberships(updatedMembers)
      await loadTeam()
      setIsDeleteMemberOpen(false)
      setSelectedMember(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити члена команди")
    }
  }

  const openEditMember = (member: TeamMember) => {
    setSelectedMember(member)
    setMemberForm({
      name: member.name,
      email: member.email,
      role: member.role,
      baseRate: member.baseRate.toString(),
      rateType: member.rateType,
      currentTeamAllocation:
        member.teamMemberships.find((membership) => String(membership.teamId) === String(team?.id))?.allocation.toString()
        ?? "100",
      skills: member.skills,
      teamMemberships: member.teamMemberships,
    })
    setIsMemberDialogOpen(true)
  }

  const closeMemberDialog = () => {
    setIsMemberDialogOpen(false)
    setSelectedMember(null)
    setMemberForm({
      name: "",
      email: "",
      role: "",
      baseRate: "",
      rateType: "monthly",
      currentTeamAllocation: "100",
      skills: [],
      teamMemberships: [],
    })
  }

  const toggleSkill = (skill: Skill) => {
    const exists = memberForm.skills.find(s => s.id === skill.id)
    if (exists) {
      setMemberForm({
        ...memberForm,
        skills: memberForm.skills.filter(s => s.id !== skill.id),
      })
    } else {
      setMemberForm({
        ...memberForm,
        skills: [...memberForm.skills, skill],
      })
    }
  }

  // Overhead CRUD handlers
  const handleSaveOverhead = async () => {
    if (!team) return
    
    const newOverhead: TeamOverhead = {
      id: selectedOverhead?.id || `o-${Date.now()}`,
      name: overheadForm.name,
      amount: parseFloat(overheadForm.amount) || 0,
      frequency: overheadForm.frequency,
      category: overheadForm.category,
    }

    const updatedOverheads = selectedOverhead
      ? team.overheads.map(o => o.id === selectedOverhead.id ? newOverhead : o)
      : [...team.overheads, newOverhead]
    setTeam({
      ...team,
      overheads: updatedOverheads,
    })
    setTeamOverheads(team.id, updatedOverheads)
    const amount = parseFloat(overheadForm.amount) || 0
    const paidDate = overheadForm.paidDate || new Date().toISOString().split("T")[0]

    try {
      if (overheadForm.frequency === "one-time") {
        await workforceApi.createVariableExpense({
          name: overheadForm.name,
          amount: amount.toString(),
          currency: "USD",
          category: overheadForm.category || "Team overhead",
          source: overheadForm.source,
          expense_date: paidDate,
          description: `Team overhead: ${team.name}`,
          allocation_type: "team",
          team: Number(team.id),
        })
      } else {
        const nextDate = new Date(paidDate)
        if (overheadForm.frequency === "monthly") nextDate.setMonth(nextDate.getMonth() + 1)
        if (overheadForm.frequency === "yearly") nextDate.setFullYear(nextDate.getFullYear() + 1)

        await workforceApi.createRecurringExpense({
          name: overheadForm.name,
          amount: amount.toString(),
          currency: "USD",
          cycle: overheadForm.frequency === "monthly" ? "monthly" : "yearly",
          category: overheadForm.category || "Team overhead",
          source: overheadForm.source,
          allocation_type: "team",
          team: Number(team.id),
          status: "pending",
          next_payment_date: nextDate.toISOString().split("T")[0],
          last_paid_date: paidDate,
          description: `Team overhead: ${team.name}`,
        })
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Не вдалося синхронізувати витрату")
    }

    closeOverheadDialog()
  }

  const handleDeleteOverhead = () => {
    if (!team || !selectedOverhead) return
    const updatedOverheads = team.overheads.filter(o => o.id !== selectedOverhead.id)
    setTeam({
      ...team,
      overheads: updatedOverheads,
    })
    setTeamOverheads(team.id, updatedOverheads)
    setIsDeleteOverheadOpen(false)
    setSelectedOverhead(null)
  }

  const openEditOverhead = (overhead: TeamOverhead) => {
    setSelectedOverhead(overhead)
    setOverheadForm({
      name: overhead.name,
      amount: overhead.amount.toString(),
      frequency: overhead.frequency,
      category: overhead.category,
      source: "cash",
      paidDate: new Date().toISOString().split("T")[0],
    })
    setIsOverheadDialogOpen(true)
  }

  const closeOverheadDialog = () => {
    setIsOverheadDialogOpen(false)
    setSelectedOverhead(null)
    setOverheadForm({
      name: "",
      amount: "",
      frequency: "monthly",
      category: "",
      source: "cash",
      paidDate: new Date().toISOString().split("T")[0],
    })
  }

  useEffect(() => {
    if (isOverheadDialogOpen && !selectedOverhead) {
      setOverheadForm((prev) => ({
        ...prev,
        paidDate: new Date().toISOString().split("T")[0],
      }))
    }
  }, [isOverheadDialogOpen, selectedOverhead])

  const totalOverheadsCost = team.overheads.reduce((sum, o) => {
    if (o.frequency === "yearly") return sum + o.amount / 12
    if (o.frequency === "one-time") return sum + o.amount / 12
    return sum + o.amount
  }, 0)

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/teams">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${team.color}20` }}
          >
            <Users className="size-6" style={{ color: team.color }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
            <p className="text-sm text-muted-foreground">
              {team.description || `${team.headcount} членів команди`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Кількість людей
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.headcount}</div>
            <p className="text-xs text-muted-foreground">активних членів</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Темп витрат команди
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(team.burnRate)}</div>
            <p className="text-xs text-muted-foreground">на місяць</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Завантаженість
            </CardTitle>
            <Percent className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${team.utilization < 50 ? "text-destructive" : ""}`}>
              {team.utilization}%
            </div>
            <Progress value={team.utilization} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Коефіцієнт ефективності
            </CardTitle>
            {team.efficiencyScore >= 1 ? (
              <TrendingUp className="size-4 text-emerald-500" />
            ) : (
              <TrendingDown className="size-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.efficiencyScore.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">дохід / витрати</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Огляд</TabsTrigger>
          <TabsTrigger value="members">Склад ({team.members.length})</TabsTrigger>
          <TabsTrigger value="overheads">Витрати ({team.overheads.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Burn Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Динаміка темпу витрат</CardTitle>
              <CardDescription>Динаміка витрат та доходів за останні 6 місяців</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={team.burnRateHistory}>
                    <defs>
                      <linearGradient id="burnRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toLocaleString("uk-UA")} тис. $`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "var(--background)", 
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="burnRate" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#burnRate)"
                      name="Темп витрат"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#revenue)"
                      name="Дохід"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Топ-виконавці</CardTitle>
                <CardDescription>Найефективніші члени команди</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.members
                    .sort((a, b) => b.utilization - a.utilization)
                    .slice(0, 3)
                    .map((member) => (
                      <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <Badge variant="outline">{member.utilization}%</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Розподіл навичок</CardTitle>
                <CardDescription>Технології в команді</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const allSkills = team.members.flatMap(m => m.skills)
                    const uniqueSkillsMap = new Map(allSkills.map(s => [s.id, s]))
                    return Array.from(uniqueSkillsMap.values()).map((skill) => {
                      const count = team.members.filter(m => 
                        m.skills.some(s => s.id === skill.id)
                      ).length
                      return (
                        <Badge 
                          key={skill.id} 
                          variant="secondary"
                          style={{ 
                            backgroundColor: `${skill.color}20`, 
                            color: skill.color,
                            borderColor: skill.color,
                          }}
                        >
                          {skill.name} ({count})
                        </Badge>
                      )
                    })
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">Склад команди</h3>
              <p className="text-sm text-muted-foreground">Члени команди та їхня вартість</p>
            </div>
            <Button onClick={() => setIsMemberDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Додати члена
            </Button>
          </div>

          <div className="space-y-3">
            {team.members.map((member) => {
              const employeeBaseCost = calculateEmployeeBaseCost(member)
              const totalCost = employeeBaseCost + member.teamOverheadShare + member.companyOverheadShare
              const isMultiTeam = member.teamMemberships.length > 1

              return (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {member.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{member.name}</h4>
                              {isMultiTeam && (
                                <Badge variant="outline" className="text-xs">
                                  Мультикоманда
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditMember(member)}>
                                <Pencil className="mr-2 size-4" />
                                Редагувати
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedMember(member)
                                  setIsDeleteMemberOpen(true)
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 size-4" />
                                Видалити
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1.5">
                          {member.skills.map((skill) => (
                            <Badge 
                              key={skill.id} 
                              variant="secondary"
                              className="text-xs"
                              style={{ 
                                backgroundColor: `${skill.color}15`, 
                                color: skill.color,
                              }}
                            >
                              {skill.name}
                            </Badge>
                          ))}
                        </div>

                        {/* Cost Breakdown */}
                        <div className="grid grid-cols-4 gap-4 rounded-lg bg-muted/50 p-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Базова вартість</p>
                            <p className="font-medium">{formatCurrency(employeeBaseCost)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Командні витрати</p>
                            <p className="font-medium">{formatCurrency(member.teamOverheadShare)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Витрати компанії</p>
                            <p className="font-medium">{formatCurrency(member.companyOverheadShare)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Загальна вартість</p>
                            <p className="font-semibold text-primary">{formatCurrency(totalCost)}</p>
                          </div>
                        </div>

                        {/* Мультикоманда membership */}
                        {isMultiTeam && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Алокація:</span>
                            {member.teamMemberships.map((tm, i) => (
                              <span key={tm.teamId}>
                                {tm.teamName} ({tm.allocation}%)
                                {i < member.teamMemberships.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Завантаженість & Revenue */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Завантаженість:</span>
                            <Badge variant={member.utilization >= 80 ? "default" : "secondary"}>
                              {member.utilization}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Дохід:</span>
                            <span className="font-medium text-emerald-600">{formatCurrency(member.revenue)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {team.members.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="size-12 text-muted-foreground/50" />
                  <h3 className="mt-4 font-semibold">Немає членів команди</h3>
                  <p className="text-sm text-muted-foreground">Додайте першого члена до команди</p>
                  <Button className="mt-4" onClick={() => setIsMemberDialogOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Додати члена
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Overheads Tab */}
        <TabsContent value="overheads" className="space-y-4">
          <div className="flex justify-between">
            <div>
              <h3 className="text-lg font-semibold">Командні витрати</h3>
              <p className="text-sm text-muted-foreground">
                Витрати, що стосуються тільки цієї команди — {formatCurrency(totalOverheadsCost)}/міс
              </p>
            </div>
            <Button onClick={() => setIsOverheadDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Додати витрату
            </Button>
          </div>

          <div className="space-y-3">
            {team.overheads.map((overhead) => (
              <Card key={overhead.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <DollarSign className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium">{overhead.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{overhead.category}</Badge>
                        <span>•</span>
                        <span>
                          {overhead.frequency === "monthly" ? "Щомісяця" :
                           overhead.frequency === "yearly" ? "Щороку" : "Одноразово"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(overhead.amount)}</p>
                      {overhead.frequency === "yearly" && (
                        <p className="text-xs text-muted-foreground">
                          ~{formatCurrency(overhead.amount / 12)}/міс
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditOverhead(overhead)}>
                          <Pencil className="mr-2 size-4" />
                          Редагувати
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedOverhead(overhead)
                            setIsDeleteOverheadOpen(true)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Видалити
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}

            {team.overheads.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <DollarSign className="size-12 text-muted-foreground/50" />
                  <h3 className="mt-4 font-semibold">Немає командних витрат</h3>
                  <p className="text-sm text-muted-foreground">Додайте витрати, специфічні для цієї команди</p>
                  <Button className="mt-4" onClick={() => setIsOverheadDialogOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Додати витрату
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Member Dialog */}
      <Dialog open={isMemberDialogOpen} onOpenChange={(open) => !open && closeMemberDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedMember ? "Редагувати члена команди" : "Додати члена команди"}
            </DialogTitle>
            <DialogDescription>
              {selectedMember ? "Змініть інформацію про члена команди" : "Додайте нового члена до команди"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-name">Ім&apos;я</Label>
                <Input
                  id="member-name"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  placeholder="Олександр Коваленко"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-email">Електронна пошта</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  placeholder="oleksandr@agency.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Роль</Label>
              <Input
                id="member-role"
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                placeholder="Senior розробник"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member-rate">Базова ставка ($)</Label>
                <Input
                  id="member-rate"
                  type="number"
                  value={memberForm.baseRate}
                  onChange={(e) => setMemberForm({ ...memberForm, baseRate: e.target.value })}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label>Тип оплати</Label>
                <Select 
                  value={memberForm.rateType} 
                  onValueChange={(v: "monthly" | "hourly") => setMemberForm({ ...memberForm, rateType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Місячна</SelectItem>
                    <SelectItem value="hourly">Погодинна</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-current-allocation">Залученість у цій команді (%)</Label>
              <Input
                id="member-current-allocation"
                type="number"
                min={0}
                max={100}
                value={memberForm.currentTeamAllocation === "100" ? "" : memberForm.currentTeamAllocation}
                onChange={(e) => setMemberForm({ ...memberForm, currentTeamAllocation: e.target.value })}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Навички</Label>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Tech Stack</p>
                {skillGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <p className="text-xs font-semibold text-foreground/80">{group.title}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.skills.map((skill) => {
                        const isSelected = memberForm.skills.some((s) => s.id === skill.id)
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              isSelected
                                ? "ring-2 ring-offset-1"
                                : "opacity-60 hover:opacity-100"
                            }`}
                            style={{
                              backgroundColor: `${skill.color}20`,
                              color: skill.color,
                              borderColor: skill.color,
                            }}
                          >
                            {isSelected && "✓ "}
                            {skill.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Розподіл між командами</Label>
              <p className="text-xs text-muted-foreground">
                Якщо людина працює в кількох командах, вкажіть розподіл
              </p>
              <div className="space-y-2">
                {memberForm.teamMemberships.map((tm, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input 
                      value={tm.teamName} 
                      onChange={(e) => {
                        const updated = [...memberForm.teamMemberships]
                        updated[idx] = { ...tm, teamName: e.target.value }
                        setMemberForm({ ...memberForm, teamMemberships: updated })
                      }}
                      placeholder="Назва команди"
                      className="flex-1"
                    />
                    <Input 
                      type="number"
                      value={tm.allocation === 0 ? "" : tm.allocation}
                      placeholder="0"
                      onChange={(e) => {
                        const updated = [...memberForm.teamMemberships]
                        const allocationValue = e.target.value
                        updated[idx] = {
                          ...tm,
                          allocation: allocationValue === "" ? 0 : parseInt(allocationValue) || 0,
                        }
                        setMemberForm({ ...memberForm, teamMemberships: updated })
                      }}
                      className="w-20"
                      max={100}
                      min={0}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setMemberForm({
                          ...memberForm,
                          teamMemberships: memberForm.teamMemberships.filter((_, i) => i !== idx),
                        })
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMemberForm({
                      ...memberForm,
                      teamMemberships: [
                        ...memberForm.teamMemberships,
                        { teamId: "", teamName: "", allocation: 0 },
                      ],
                    })
                  }}
                >
                  <Plus className="mr-2 size-4" />
                  Додати команду
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeMemberDialog}>
              Скасувати
            </Button>
            <Button onClick={handleSaveMember} disabled={!memberForm.name.trim()}>
              {selectedMember ? "Зберегти" : "Додати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation */}
      <AlertDialog open={isDeleteMemberOpen} onOpenChange={setIsDeleteMemberOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити члена команди?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити {selectedMember?.name} з команди? 
              Ця дія незворотна.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overhead Dialog */}
      <Dialog open={isOverheadDialogOpen} onOpenChange={(open) => !open && closeOverheadDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOverhead ? "Редагувати витрату" : "Додати командну витрату"}
            </DialogTitle>
            <DialogDescription>
              Витрати, специфічні для цієї команди (софт, інструменти, тощо)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="overhead-name">Назва</Label>
              <Input
                id="overhead-name"
                value={overheadForm.name}
                onChange={(e) => setOverheadForm({ ...overheadForm, name: e.target.value })}
                placeholder="Figma Team Plan"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="overhead-amount">Сума ($)</Label>
                <Input
                  id="overhead-amount"
                  type="number"
                  value={overheadForm.amount}
                  onChange={(e) => setOverheadForm({ ...overheadForm, amount: e.target.value })}
                  placeholder="75"
                />
              </div>
              <div className="space-y-2">
                <Label>Частота</Label>
                <Select 
                  value={overheadForm.frequency} 
                  onValueChange={(v: "monthly" | "yearly" | "one-time") => 
                    setOverheadForm({ ...overheadForm, frequency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Щомісяця</SelectItem>
                    <SelectItem value="yearly">Щороку</SelectItem>
                    <SelectItem value="one-time">Одноразово</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="overhead-category">Категорія</Label>
              <Select
                value={overheadForm.category || "__placeholder__"}
                onValueChange={(value) =>
                  setOverheadForm({ ...overheadForm, category: value === "__placeholder__" ? "" : value })
                }
              >
                <SelectTrigger id="overhead-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__placeholder__" disabled>
                    Оберіть категорію
                  </SelectItem>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип оплати</Label>
                <Select
                  value={overheadForm.source}
                  onValueChange={(v: "cash" | "monobank" | "privat24") => setOverheadForm({ ...overheadForm, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Готівка</SelectItem>
                    <SelectItem value="monobank">Monobank</SelectItem>
                    <SelectItem value="privat24">Privat24</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="overhead-paid-date">Дата оплати</Label>
                <Input
                  id="overhead-paid-date"
                  type="date"
                  value={overheadForm.paidDate}
                  onChange={(e) => setOverheadForm({ ...overheadForm, paidDate: e.target.value })}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {overheadForm.frequency === "one-time"
                ? "Одноразова витрата буде додана у розділ “Змінні”."
                : `Наступна оплата буде ${overheadForm.frequency === "monthly" ? "наступного місяця" : "наступного року"} у дату ${
                    (() => {
                      const baseDate = new Date(overheadForm.paidDate || new Date().toISOString().split("T")[0])
                      if (overheadForm.frequency === "monthly") baseDate.setMonth(baseDate.getMonth() + 1)
                      if (overheadForm.frequency === "yearly") baseDate.setFullYear(baseDate.getFullYear() + 1)
                      return baseDate.toLocaleDateString("uk-UA")
                    })()
                  }.`}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeOverheadDialog}>
              Скасувати
            </Button>
            <Button onClick={handleSaveOverhead} disabled={!overheadForm.name.trim() || !overheadForm.category}>
              {selectedOverhead ? "Зберегти" : "Додати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Overhead Confirmation */}
      <AlertDialog open={isDeleteOverheadOpen} onOpenChange={setIsDeleteOverheadOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити витрату?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити &quot;{selectedOverhead?.name}&quot;? 
              Ця дія незворотна.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOverhead}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
