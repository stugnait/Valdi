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
    title: "Teams & Squads",
    icon: Users,
    items: [
      { title: "Teams Hub", href: "/dashboard/teams", icon: Users },
    ],
  },
  {
    title: "Spendings & Overheads",
    icon: Wallet,
    items: [
      { title: "Recurring", href: "/dashboard/spendings/recurring", icon: Repeat },
      { title: "Variable", href: "/dashboard/spendings/variable", icon: Wallet },
      { title: "Rules", href: "/dashboard/spendings/rules", icon: FileText },
    ],
  },
  {
    title: "Workspace",
    icon: FolderKanban,
    items: [
      { title: "Clients", href: "/dashboard/clients", icon: Building2 },
      { title: "Projects", href: "/dashboard/projects", icon: FolderKanban },
      { title: "Subscriptions", href: "/dashboard/subscriptions", icon: CalendarCheck },
    ],
  },
  {
    title: "Invoices & Revenue",
    icon: CreditCard,
    items: [
      { title: "Invoices", href: "/dashboard/invoices", icon: Receipt },
      { title: "Tax Reports", href: "/dashboard/reports/taxes", icon: Calculator },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    items: [
      { title: "Global Health", href: "/dashboard/analytics/health", icon: Activity },
      { title: "The Time Machine", href: "/dashboard/analytics/time", icon: Clock },
      { title: "Efficiency & ROI", href: "/dashboard/analytics/roi", icon: TrendingUp },
      { title: "Anomalies & Leaks", href: "/dashboard/analytics/anomalies", icon: AlertTriangle },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    items: [
      { title: "General", href: "/dashboard/settings/general", icon: Globe },
      { title: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
      { title: "Integrations", href: "/dashboard/settings/integrations", icon: Link2 },
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

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user_email")

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
            <span className="text-xs text-muted-foreground">Agency Finance</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <LayoutGrid className="size-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                      АК
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">Олександр</span>
                    <span className="text-xs text-muted-foreground">Admin</span>
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
