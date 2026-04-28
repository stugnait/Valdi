"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type Team } from "@/lib/types/teams"
import { type ApiDeveloper, type ApiTeam, workforceApi } from "@/lib/api/workforce"
import { deleteTeamUiMeta, getMemberUiData, getTeamOverheads, getTeamUiMeta, setTeamUiMeta } from "@/lib/storage/team-ui"
import { calculateTeamMetrics, MONTHLY_WORK_HOURS } from "@/lib/utils/team-metrics"

const colorOptions = [
  { name: "Blue", value: "#2563eb" },
  { name: "Green", value: "#10b981" },
  { name: "Orange", value: "#f59e0b" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Red", value: "#ef4444" },
  { name: "Cyan", value: "#06b6d4" },
]
export default function TeamsHubPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [companyRevenue, setCompanyRevenue] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#2563eb",
  })

  const toUiTeam = (
    team: ApiTeam,
    developersById: Map<number, ApiDeveloper>,
    totals: { revenue: number; laborCost: number }
  ): Team => {
    const normalizedId = String(team.id)
    const defaultColor = colorOptions[team.id % colorOptions.length]?.value ?? "#2563eb"
    const color = getTeamUiMeta(String(team.id)).color ?? defaultColor
    const members = team.memberships.map((membership) => {
      const developer = developersById.get(membership.developer)
      const baseRate = Number(developer?.hourly_rate ?? 0) * MONTHLY_WORK_HOURS
      const utilization = membership.allocation
      const savedMemberUi = getMemberUiData(String(membership.developer))

      return {
        id: String(membership.developer),
        name: membership.developer_name ?? developer?.full_name ?? "Developer",
        email: membership.developer_email ?? developer?.email ?? "",
        role: developer?.role ?? "",
        baseRate,
        rateType: "monthly" as const,
        teamOverheadShare: 0,
        companyOverheadShare: 0,
        skills: savedMemberUi.skills ?? [],
        utilization,
        revenue: 0,
        teamMemberships: [{ teamId: normalizedId, teamName: team.name, allocation: membership.allocation }],
      }
    })
    const overheads = getTeamOverheads(normalizedId)
    const metrics = calculateTeamMetrics(members, overheads)
    const teamContribution = totals.laborCost > 0 ? metrics.teamLaborCost / totals.laborCost : 0
    const teamRevenue = totals.revenue * teamContribution
    const membersWithShares = members.map((member) => ({
      ...member,
      teamOverheadShare: metrics.memberCostById.get(member.id)?.teamOverheadShare ?? 0,
      companyOverheadShare: metrics.memberCostById.get(member.id)?.companyOverheadShare ?? 0,
    }))

    return {
      id: normalizedId,
      name: team.name,
      description: team.description,
      color,
      headcount: members.length,
      burnRate: metrics.burnRate,
      utilization: metrics.utilization,
      efficiencyScore: metrics.burnRate > 0 ? teamRevenue / metrics.burnRate : 0,
      members: membersWithShares,
      overheads,
      burnRateHistory: [],
    }
  }

  const loadTeams = async () => {
    setIsLoading(true)
    setError("")
    try {
      const [teamsData, developersData, projectsData] = await Promise.all([
        workforceApi.listTeams(),
        workforceApi.listDevelopers(),
        workforceApi.listProjects(),
      ])
      const totals = projectsData.reduce(
        (acc, project) => ({
          revenue: acc.revenue + Number(project.revenue ?? 0),
          laborCost: acc.laborCost + Number(project.labor_cost ?? 0),
        }),
        { revenue: 0, laborCost: 0 }
      )
      setCompanyRevenue(totals.revenue)
      const developersById = new Map(developersData.map((developer) => [developer.id, developer]))
      setTeams(teamsData.map((team) => toUiTeam(team, developersById, totals)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити команди")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadTeams()
  }, [])

  const handleCreate = async () => {
    try {
      await workforceApi.createTeam({
        name: formData.name.trim(),
        description: formData.description.trim(),
      })
      const teamsData = await workforceApi.listTeams()
      const createdTeam = teamsData
        .filter((team) => team.name === formData.name.trim())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (createdTeam) {
        setTeamUiMeta(String(createdTeam.id), { color: formData.color })
      }
      await loadTeams()
      setIsCreateOpen(false)
      setFormData({ name: "", description: "", color: "#2563eb" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося створити команду")
    }
  }

  const handleEdit = async () => {
    if (!selectedTeam) return
    try {
      await workforceApi.updateTeam(selectedTeam.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
      })
      setTeamUiMeta(selectedTeam.id, { color: formData.color })
      await loadTeams()
      setIsEditOpen(false)
      setSelectedTeam(null)
      setFormData({ name: "", description: "", color: "#2563eb" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося оновити команду")
    }
  }

  const handleDelete = async () => {
    if (!selectedTeam) return
    try {
      await workforceApi.deleteTeam(selectedTeam.id)
      deleteTeamUiMeta(selectedTeam.id)
      setTeams((prev) => prev.filter((team) => team.id !== selectedTeam.id))
      setIsDeleteOpen(false)
      setSelectedTeam(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося видалити команду")
    }
  }

  const openEdit = (team: Team) => {
    setSelectedTeam(team)
    setFormData({
      name: team.name,
      description: team.description || "",
      color: team.color,
    })
    setIsEditOpen(true)
  }

  const openDelete = (team: Team) => {
    setSelectedTeam(team)
    setIsDeleteOpen(true)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const totalHeadcount = new Set(
    teams.flatMap((team) => team.members.map((member) => member.id))
  ).size
  const totalBurnRate = teams.reduce((sum, t) => sum + t.burnRate, 0)
  const companyHours = teams.reduce(
    (acc, team) => ({
      allocated: acc.allocated + team.members.reduce(
        (sum, member) => sum + MONTHLY_WORK_HOURS * (member.utilization / 100),
        0
      ),
      available: acc.available + team.members.length * MONTHLY_WORK_HOURS,
    }),
    { allocated: 0, available: 0 }
  )
  const avgUtilization = companyHours.available > 0
    ? Math.round((companyHours.allocated / companyHours.available) * 100)
    : 0
  const avgEfficiency = totalBurnRate > 0
    ? (companyRevenue / totalBurnRate).toFixed(2)
    : "0"

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams Hub</h1>
          <p className="text-sm text-muted-foreground">
            Управління командами та відділами агентства
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Нова команда
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всього людей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHeadcount}</div>
            <p className="text-xs text-muted-foreground">у {teams.length} командах</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Загальний Burn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBurnRate)}</div>
            <p className="text-xs text-muted-foreground">на місяць</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Середня Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUtilization}%</div>
            <p className="text-xs text-muted-foreground">завантаженість</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Загальна Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEfficiency}x</div>
            <p className="text-xs text-muted-foreground">revenue / cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Cards Grid */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Завантаження команд...</CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const isLowUtilization = team.utilization < 50
          const isHighEfficiency = team.efficiencyScore >= 1.0

          return (
            <Card 
              key={team.id} 
              className={`relative transition-all hover:shadow-md ${
                isLowUtilization ? "border-destructive/50 bg-destructive/5" : ""
              }`}
            >
              {/* Color indicator */}
              <div 
                className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
                style={{ backgroundColor: team.color }}
              />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${team.color}20` }}
                    >
                      <Users className="size-5" style={{ color: team.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {team.headcount} {team.headcount === 1 ? "людина" : team.headcount < 5 ? "людини" : "людей"}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(team)}>
                        <Pencil className="mr-2 size-4" />
                        Редагувати
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => openDelete(team)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Видалити
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Burn Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Burn Rate</span>
                  <span className="font-semibold">{formatCurrency(team.burnRate)}/міс</span>
                </div>

                {/* Utilization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Utilization</span>
                    <div className="flex items-center gap-1">
                      {isLowUtilization && (
                        <AlertTriangle className="size-3.5 text-destructive" />
                      )}
                      <span className={`font-semibold ${isLowUtilization ? "text-destructive" : ""}`}>
                        {team.utilization}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={team.utilization} 
                    className={`h-2 ${isLowUtilization ? "[&>div]:bg-destructive" : ""}`}
                  />
                </div>

                {/* Efficiency Score */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Efficiency Score</span>
                  <Badge 
                    variant={isHighEfficiency ? "default" : "secondary"}
                    className={`${isHighEfficiency ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}`}
                  >
                    {isHighEfficiency ? (
                      <TrendingUp className="mr-1 size-3" />
                    ) : (
                      <TrendingDown className="mr-1 size-3" />
                    )}
                    {team.efficiencyScore.toFixed(2)}x
                  </Badge>
                </div>

                {/* View Details Button */}
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/teams/${team.id}`}>
                    Переглянути команду
                    <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {/* Add New Team Card */}
        <Card 
          className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-muted/50"
          onClick={() => setIsCreateOpen(true)}
        >
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed">
              <Plus className="size-6" />
            </div>
            <span className="text-sm font-medium">Додати команду</span>
          </CardContent>
        </Card>
      </div>

      {/* Create Team Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Створити нову команду</DialogTitle>
            <DialogDescription>
              Додайте нову команду або відділ до вашого агентства
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Назва команди</Label>
              <Input
                id="name"
                placeholder="Наприклад: Frontend Squad"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Опис (опціонально)</Label>
              <Textarea
                id="description"
                placeholder="Коротко опишіть призначення команди..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Колір команди</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-8 w-8 rounded-full transition-all ${
                      formData.color === color.value 
                        ? "ring-2 ring-offset-2 ring-foreground" 
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Створити команду
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редагувати команду</DialogTitle>
            <DialogDescription>
              Змініть інформацію про команду
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Назва команди</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Опис</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Колір команди</Label>
              <div className="flex gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`h-8 w-8 rounded-full transition-all ${
                      formData.color === color.value 
                        ? "ring-2 ring-offset-2 ring-foreground" 
                        : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name.trim()}>
              Зберегти зміни
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити команду?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити команду &quot;{selectedTeam?.name}&quot;? 
              Ця дія незворотна і видалить усіх членів команди з цієї команди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
