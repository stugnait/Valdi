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
  spendings: "Витрати",
  recurring: "Регулярні",
  variable: "Змінні",
  rules: "Правила",
  subscriptions: "Підписки",
  invoices: "Інвойси",
  reports: "Звіти",
  taxes: "Податкові звіти",
  analytics: "Аналітика",
  health: "Загальний стан",
  time: "Динаміка у часі",
  roi: "Ефективність та ROI",
  anomalies: "Аномалії та витоки",
  settings: "Налаштування",
  general: "Загальні",
  billing: "Оплата",
  integrations: "Інтеграції",
  profile: "Профіль",
  support: "Підтримка",
}

function getBreadcrumbLabel(segment: string, previousSegment?: string): string {
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
  const [dynamicBreadcrumbLabels, setDynamicBreadcrumbLabels] = useState<Record<string, string>>({})

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)

    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`
      return {
        href,
        label: dynamicBreadcrumbLabels[href] ?? getBreadcrumbLabel(segment, segments[index - 1]),
        isCurrent: index === segments.length - 1,
      }
    })
  }, [dynamicBreadcrumbLabels, pathname])


  useEffect(() => {
    let isCancelled = false

    const loadDynamicBreadcrumbLabel = async () => {
      const teamMatch = pathname.match(/^\/dashboard\/teams\/([^/]+)$/)

      if (!teamMatch) {
        setDynamicBreadcrumbLabels({})
        return
      }

      const teamId = decodeURIComponent(teamMatch[1])

      try {
        const team = await workforceApi.getTeam(teamId)
        if (!isCancelled) {
          setDynamicBreadcrumbLabels({ [`/dashboard/teams/${teamId}`]: team.name })
        }
      } catch {
        if (!isCancelled) {
          setDynamicBreadcrumbLabels({})
        }
      }
    }

    void loadDynamicBreadcrumbLabel()

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
              {breadcrumbs.map((breadcrumb, index) => (
                <Fragment key={breadcrumb.href}>
                  <BreadcrumbItem>
                    {breadcrumb.isCurrent ? (
                      <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={breadcrumb.href}>{breadcrumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
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
