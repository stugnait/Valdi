"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Users,
  Building2,
  Wallet,
  FolderKanban,
  BarChart3,
  ChevronRight,
  Settings,
  Bell,
  LogOut,
  User,
  CreditCard,
  FileText,
  Calculator,
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  LayoutGrid,
  Globe,
  Link2,
  Receipt,
  Repeat,
  CalendarCheck,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const navigationItems = [
  {
    title: "Команди та відділи",
    icon: Users,
    items: [
      { title: "Команди", href: "/dashboard/teams", icon: Users },
    ],
  },
  {
    title: "Витрати та накладні",
    icon: Wallet,
    items: [
      { title: "Регулярні", href: "/dashboard/spendings/recurring", icon: Repeat },
      { title: "Змінні", href: "/dashboard/spendings/variable", icon: Wallet },
      { title: "Правила", href: "/dashboard/spendings/rules", icon: FileText },
    ],
  },
  {
    title: "Робочий простір",
    icon: FolderKanban,
    items: [
      { title: "Клієнти", href: "/dashboard/clients", icon: Building2 },
      { title: "Проєкти", href: "/dashboard/projects", icon: FolderKanban },
      { title: "Підписки", href: "/dashboard/subscriptions", icon: CalendarCheck },
    ],
  },
  {
    title: "Інвойси та дохід",
    icon: CreditCard,
    items: [
      { title: "Інвойси", href: "/dashboard/invoices", icon: Receipt },
      { title: "Податкові звіти", href: "/dashboard/reports/taxes", icon: Calculator },
    ],
  },
  {
    title: "Аналітика",
    icon: BarChart3,
    items: [
      { title: "Загальний стан", href: "/dashboard/analytics/health", icon: Activity },
      { title: "Динаміка у часі", href: "/dashboard/analytics/time", icon: Clock },
      { title: "Ефективність та ROI", href: "/dashboard/analytics/roi", icon: TrendingUp },
      { title: "Аномалії та витоки", href: "/dashboard/analytics/anomalies", icon: AlertTriangle },
    ],
  },
  {
    title: "Налаштування",
    icon: Settings,
    items: [
      { title: "Загальні", href: "/dashboard/settings/general", icon: Globe },
      { title: "Оплата", href: "/dashboard/settings/billing", icon: CreditCard },
      { title: "Інтеграції", href: "/dashboard/settings/integrations", icon: Link2 },
    ],
  },
]

interface SubItem {
  title: string
  href: string
  icon?: React.ElementType
  badge?: string
}

interface NavItemProps {
  item: {
    title: string
    icon: React.ElementType
    items: SubItem[]
  }
}

function NavItem({ item }: NavItemProps) {
  const pathname = usePathname()
  const Icon = item.icon

  return (
    <Collapsible defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="w-full">
            <Icon className="size-4" />
            <span className="truncate">{item.title}</span>
            <ChevronRight className="ml-auto size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton asChild isActive={pathname === subItem.href}>
                  <Link href={subItem.href}>
                    {subItem.icon && <subItem.icon className="size-3.5" />}
                    <span className="truncate">{subItem.title}</span>
                    {subItem.badge && (
                      <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-4 font-medium text-muted-foreground">
                        {subItem.badge}
                      </Badge>
                    )}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar() {
  const router = useRouter()
  const [userName, setUserName] = React.useState("Користувач")
  const userRole = "Адміністратор"
  const [companyName, setCompanyName] = React.useState("Фінанси агенції")

  React.useEffect(() => {
    const email = localStorage.getItem("user_email") ?? ""
    const savedName = localStorage.getItem("user_display_name") ?? ""
    const savedCompanyName = localStorage.getItem("company_name") ?? ""

    const emailPrefix = email.includes("@") ? email.split("@")[0] : email
    const fallbackName = emailPrefix || "Користувач"

    setUserName(savedName.trim() || fallbackName)
    setCompanyName(savedCompanyName.trim() || "Фінанси агенції")
  }, [])

  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "U"

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user_email")
    localStorage.removeItem("user_display_name")
    localStorage.removeItem("company_name")

    document.cookie = "access_token=; path=/; max-age=0; samesite=lax"
    document.cookie = "refresh_token=; path=/; max-age=0; samesite=lax"

    router.push("/auth")
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-black text-white">V</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground">Vardi</span>
            <span className="text-xs text-muted-foreground">{companyName}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Швидкі дії */}
        <SidebarGroup>
          <SidebarGroupLabel>Швидкі дії</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <LayoutGrid className="size-4" />
                    <span>Дашборд</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Навігація */}
        <SidebarGroup>
          <SidebarGroupLabel>Навігація</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{userName}</span>
                    <span className="text-xs text-muted-foreground">{userRole}</span>
                  </div>
                  <ChevronRight className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">
                    <User className="mr-2 size-4" />
                    Профіль
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings/general">
                    <Settings className="mr-2 size-4" />
                    Налаштування
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Bell className="mr-2 size-4" />
                  Сповіщення
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 size-4" />
                  Вийти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
