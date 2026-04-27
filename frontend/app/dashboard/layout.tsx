"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { workforceApi } from "@/lib/api/workforce"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const BREADCRUMB_TITLE_MAP: Record<string, string> = {
  dashboard: "Дашборд",
  teams: "Команди",
  clients: "Клієнти",
  projects: "Проєкти",
  create: "Створення",
  recurring: "Регулярні",
  variable: "Змінні",
  rules: "Правила",
  subscriptions: "Підписки",
  invoices: "Інвойси",
  taxes: "Податкові звіти",
  health: "Загальний стан",
  time: "Динаміка у часі",
  roi: "Ефективність та ROI",
  anomalies: "Аномалії та витоки",
  general: "Загальні",
  billing: "Оплата",
  integrations: "Інтеграції",
  profile: "Профіль",
  support: "Підтримка",
}

function getSegmentLabel(segment: string, previousSegment?: string): string {
  if (BREADCRUMB_TITLE_MAP[segment]) {
    return BREADCRUMB_TITLE_MAP[segment]
  }

  if (previousSegment === "teams") {
    return "Команда"
  }

  if (previousSegment === "projects") {
    return "Проєкт"
  }

  return decodeURIComponent(segment)
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [teamBreadcrumbLabel, setTeamBreadcrumbLabel] = useState<string | null>(null)

  const breadcrumbItems = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return []

    const dashboardCrumb = {
      href: "/dashboard",
      label: "Дашборд",
      isCurrent: segments.length === 1,
    }

    if (segments.length === 1) {
      return [dashboardCrumb]
    }

    const lastIndex = segments.length - 1
    const lastSegment = segments[lastIndex]
    const parentSegment = segments[lastIndex - 1]
    const lastHref = `/${segments.join("/")}`

    const lastLabel =
      teamBreadcrumbLabel && parentSegment === "teams"
        ? teamBreadcrumbLabel
        : getSegmentLabel(lastSegment, parentSegment)

    return [
      { ...dashboardCrumb, isCurrent: false },
      {
        href: lastHref,
        label: lastLabel,
        isCurrent: true,
      },
    ]
  }, [pathname, teamBreadcrumbLabel])

  useEffect(() => {
    let isCancelled = false

    const loadTeamBreadcrumbLabel = async () => {
      const teamMatch = pathname.match(/^\/dashboard\/teams\/([^/]+)$/)

      if (!teamMatch) {
        setTeamBreadcrumbLabel(null)
        return
      }

      const teamId = decodeURIComponent(teamMatch[1])

      try {
        const team = await workforceApi.getTeam(teamId)
        if (!isCancelled) {
          setTeamBreadcrumbLabel(team.name)
        }
      } catch {
        if (!isCancelled) {
          setTeamBreadcrumbLabel(null)
        }
      }
    }

    void loadTeamBreadcrumbLabel()

    return () => {
      isCancelled = true
    }
  }, [pathname])

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token")
    const isTokenValid = (() => {
      if (!accessToken) return false
      try {
        const payload = JSON.parse(atob(accessToken.split(".")[1] ?? ""))
        const exp = Number(payload.exp ?? 0)
        return exp * 1000 > Date.now()
      } catch {
        return false
      }
    })()

    if (!isTokenValid) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`)
      return
    }

    setIsCheckingAuth(false)
  }, [pathname, router])

  if (isCheckingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Перевіряємо авторизацію...</p>
      </main>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbItems.map((breadcrumb, index) => (
                <Fragment key={breadcrumb.href}>
                  <BreadcrumbItem>
                    {breadcrumb.isCurrent ? (
                      <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={breadcrumb.href}>{breadcrumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbItems.length - 1 && <BreadcrumbSeparator />}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
