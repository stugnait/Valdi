"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Plus,
  FolderKanban,
  TrendingUp,
  Users,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpRight,
  DollarSign,
  Percent,
  Search,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
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
  mockProjects, 
  type Project, 
  type ProjectStatus,
  getStatusBadgeVariant,
  getStatusLabel,
  getBudgetHealthColor,
} from "@/lib/types/projects"

const statusFilters: ProjectStatus[] = ["lead", "active", "finished", "paused"]

export default function ProjectsHubPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus[]>(["active", "lead"])
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(p.status)
    return matchesSearch && matchesStatus
  })

  const handleDelete = () => {
    if (!selectedProject) return
    setProjects(projects.filter(p => p.id !== selectedProject.id))
    setIsDeleteOpen(false)
    setSelectedProject(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Header stats
  const activeProjects = projects.filter(p => p.status === "active")
  const totalPipelineValue = activeProjects.reduce((sum, p) => sum + (p.totalContractValue || 0), 0)
  const avgMargin = activeProjects.length > 0
    ? activeProjects.reduce((sum, p) => sum + p.profitMargin, 0) / activeProjects.length
    : 0
  const activeTeamsCount = new Set(
    activeProjects.flatMap(p => p.allocations.map(a => a.teamId))
  ).size

  const toggleStatusFilter = (status: ProjectStatus) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Hub</h1>
          <p className="text-sm text-muted-foreground">
            Портфоліо проектів та бізнес-кейсів агентства
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/create">
            <Plus className="mr-2 size-4" />
            Новий проект
          </Link>
        </Button>
      </div>

      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pipeline Value
            </CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</div>
            <p className="text-xs text-muted-foreground">
              {activeProjects.length} активних контрактів
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Project Margin
            </CardTitle>
            <Percent className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${avgMargin >= 20 ? "text-emerald-600" : avgMargin >= 0 ? "text-amber-600" : "text-destructive"}`}>
              {avgMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              середня маржинальність
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Teams
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTeamsCount}</div>
            <p className="text-xs text-muted-foreground">
              залучено на проектах
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук за назвою або клієнтом..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 size-4" />
              Статус
              {statusFilter.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5">
                  {statusFilter.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Фільтр за статусом</DropdownMenuLabel>
            {statusFilters.map(status => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={statusFilter.includes(status)}
                onCheckedChange={() => toggleStatusFilter(status)}
              >
                {getStatusLabel(status)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => {
          const healthColor = getBudgetHealthColor(project.budgetUsedPercent, project.netProfit)
          const isUnprofitable = project.netProfit < 0

          return (
            <Card 
              key={project.id} 
              className={`relative transition-all hover:shadow-md ${
                isUnprofitable ? "border-destructive/50" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base line-clamp-1">{project.name}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">
                      {project.client.name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/projects/${project.id}`}>
                            <ArrowUpRight className="mr-2 size-4" />
                            Переглянути
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/projects/${project.id}?edit=true`}>
                            <Pencil className="mr-2 size-4" />
                            Редагувати
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setSelectedProject(project)
                            setIsDeleteOpen(true)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Видалити
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map(tag => (
                    <Badge 
                      key={tag.id}
                      variant="secondary"
                      className="text-xs"
                      style={{ 
                        backgroundColor: `${tag.color}15`, 
                        color: tag.color 
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>

                {/* Budget Health */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Budget Health</span>
                    <span className={`font-medium ${
                      healthColor === "destructive" ? "text-destructive" :
                      healthColor === "warning" ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {project.budgetUsedPercent.toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(project.budgetUsedPercent, 100)}
                    className={`h-2 ${
                      healthColor === "destructive" ? "[&>div]:bg-destructive" :
                      healthColor === "warning" ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                    }`}
                  />
                </div>

                {/* Profitability */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Net Profit</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isUnprofitable ? "text-destructive" : "text-emerald-600"}`}>
                      {formatCurrency(project.netProfit)}
                    </span>
                    {project.profitMargin !== 0 && (
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          isUnprofitable ? "border-destructive/50 text-destructive" : 
                          "border-emerald-500/50 text-emerald-600"
                        }`}
                      >
                        <TrendingUp className="mr-1 size-3" />
                        {project.profitMargin.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Team & Contract */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="size-3.5" />
                    <span>{project.allocations.length} членів</span>
                  </div>
                  {project.totalContractValue && (
                    <span className="text-sm font-medium">
                      {formatCurrency(project.totalContractValue)}
                    </span>
                  )}
                </div>

                {/* View Button */}
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    Деталі проекту
                    <ArrowUpRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {/* Add New Project Card */}
        <Card 
          className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-muted/50"
          onClick={() => window.location.href = "/dashboard/projects/create"}
        >
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed">
              <Plus className="size-6" />
            </div>
            <span className="text-sm font-medium">Створити проект</span>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center">
            <FolderKanban className="size-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Проектів не знайдено</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Спробуйте змінити параметри пошуку або фільтри
            </p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard/projects/create">
                <Plus className="mr-2 size-4" />
                Створити перший проект
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити проект &quot;{selectedProject?.name}&quot;? 
              Ця дія незворотна і видалить всю історію інвойсів та витрат.
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
