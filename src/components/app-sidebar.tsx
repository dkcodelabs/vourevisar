import * as React from "react"
import {
  BarChart3,
  Bot,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Library,
  Layers,
  MessageSquare,
  RotateCcw,
  Target,
  Users,
  Clock,
  AlertTriangle,
  CircleHelp,
  UserCircle,
  Sparkles,
  BrainCircuit,
  ChevronRight,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/ThemeToggle"
import { BrandMark } from "@/components/brand/BrandLogo"
import { useAIStatus } from "@/hooks/useAIStatus"
import { useUserRole } from "@/hooks/useUserRole"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  onOpenHelp?: () => void
}

export function AppSidebar({ onOpenHelp, ...props }: AppSidebarProps) {
  const { isAdmin, isOwner } = useUserRole()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const location = useLocation()
  const { aiStatus } = useAIStatus({ enabled: isAdmin })
  const collapsed = state === "collapsed" && !isMobile
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false)
  }

  const navMain = [
    { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
    { title: "Meus Editais", url: "/meus-editais", icon: Library },
    { title: "Ciclo de Estudos", url: "/ciclo-estudos", icon: RotateCcw },
    { title: "Revisões", url: "/revisoes", icon: Clock },
    { title: "Treino", url: "/treino", icon: BrainCircuit },
    { title: "Evolução", url: "/estatisticas", icon: BarChart3 },
  ]

  const adminItems: Array<{
    name: string
    url: string
    icon: LucideIcon
    status?: "error" | "ok" | "idle"
  }> = isAdmin
    ? [
        { name: "Gerenciar Usuários", url: "/admin/users", icon: Users },
        { name: "Gerenciar Editais", url: "/admin/editais", icon: Library },
        { name: "Assinaturas", url: "/admin/subscription", icon: CreditCard },
        ...(isOwner ? [{ name: "Divulgação e Repasses", url: "/admin/referrals", icon: Target }] : []),
        { name: "Auditoria", url: "/admin/audit", icon: ClipboardList },
        { name: "Erros do Sistema", url: "/admin/system/errors", icon: AlertTriangle },
        {
          name: "Gestão de IA",
          url: "/admin/ai-settings",
          icon: Bot,
          status:
            aiStatus.status === "active"
              ? "ok"
              : aiStatus.status === "error"
                ? "error"
                : "idle",
        },
        { name: "Feedback", url: "/admin/feedback", icon: MessageSquare },
        { name: "Componentes UI", url: "/reveal-cards", icon: Layers },
        { name: "Modelos de Componentes", url: "/reveal-card-demo", icon: Sparkles },
      ]
    : []

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-3 pb-3 pt-4">
        <div className="flex items-center justify-center gap-2.5 py-1 text-[#172033] dark:text-[#F8FAFC]">
          <BrandMark className="h-7 w-auto shrink-0 text-inherit" />
          <span className="font-sans text-[19px] font-extrabold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            <span className="font-medium opacity-65">vou</span>Revisar
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <NavMain label="" items={navMain} />

        <SidebarSeparator className="app-sidebar-separator my-3" />

        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Conta"
                isActive={location.pathname.startsWith("/conta")}
              >
                <NavLink to="/conta" onClick={closeMobileSidebar} className="flex items-center gap-3.5 w-full">
                  <UserCircle className="size-5 shrink-0 transition-transform duration-150" />
                  <span
                    className={cn(
                      "text-[13px] leading-none tracking-tight flex-1 transition-colors",
                      location.pathname.startsWith("/conta") ? "font-bold text-blue-600 dark:text-white" : "font-medium text-inherit"
                    )}
                  >
                    Conta
                  </span>
                  {location.pathname.startsWith("/conta") && <ChevronRight className="size-3.5 text-blue-600 dark:text-white/80 shrink-0 ml-auto" />}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                type="button"
                tooltip="Ajuda"
                onClick={() => {
                  closeMobileSidebar()
                  onOpenHelp?.()
                }}
                className="flex items-center gap-3"
              >
                <CircleHelp className="size-5 shrink-0 transition-transform duration-150" />
                <span className="text-[13px] font-medium leading-none tracking-tight">Ajuda</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <>
            <SidebarSeparator className="app-sidebar-separator my-3" />
            <NavProjects label="" projects={adminItems} />
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="app-sidebar-footer px-3 pb-3">
        <div className="app-sidebar-theme-toggle group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <ThemeToggle compact={collapsed} />
        </div>
        <NavUser collapsed={collapsed} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
