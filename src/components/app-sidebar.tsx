import * as React from "react"
import {
  BarChart3,
  Bot,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Library,
  MessageSquare,
  NotebookTabs,
  RotateCcw,
  Target,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  CircleHelp,
  UserCircle,
  Sparkles,
  BrainCircuit,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useAIStatus } from "@/hooks/useAIStatus"
import { useUserRole } from "@/hooks/useUserRole"
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
    { title: "Cadernos", url: "/cadernos", icon: NotebookTabs },
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
        { name: "Importância em Prova", url: "/admin/importancia-prova", icon: TrendingUp },
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
      ]
    : []

  const teams = [
    {
      name: "vouRevisar",
      logo: <Sparkles />,
      plan: "Estudos inteligentes",
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="px-3 pb-2 pt-3">
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent className="px-1">
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
                <NavLink to="/conta" onClick={closeMobileSidebar}>
                  <UserCircle />
                  <span>Conta</span>
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
              >
                <CircleHelp />
                <span>Ajuda</span>
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
      <SidebarFooter className="px-3 pb-3">
        <div className="app-sidebar-theme-toggle group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <ThemeToggle compact={collapsed} />
        </div>
        <NavUser collapsed={collapsed} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
