"use client"

import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/AuthContext"
import { useSubscriptionInfo } from "@/hooks/useSubscriptionInfo"
import { useUserProfile } from "@/hooks/useUserProfile"
import { useUserRole } from "@/hooks/useUserRole"

const getInitials = (nameOrEmail?: string | null) => {
  const value = nameOrEmail?.trim() || "Aluno"
  const parts = value.includes("@") ? [value[0]] : value.split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]).join("").toUpperCase()
}

export function NavUser({ collapsed = false }: { collapsed?: boolean }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const { user, signOut } = useAuth()
  const { profile } = useUserProfile()
  const { subscriptionInfo, loading: subscriptionLoading } = useSubscriptionInfo()
  const { isAdmin, isOwner, loading: roleLoading } = useUserRole()
  const navigate = useNavigate()

  if (!user) return null

  const displayName = profile?.name || user.user_metadata?.name || user.email?.split("@")[0] || "Estudante"
  const email = user.email || ""
  const initials = getInitials(profile?.name || email)
  const planLabel = (() => {
    if (roleLoading || subscriptionLoading) return "Carregando..."
    if (isOwner) return "Proprietário"
    if (isAdmin) return "Administrador"
    if (!subscriptionInfo) return "Sem plano ativo"
    if (!subscriptionInfo.is_active) return "Sem plano ativo"
    if (subscriptionInfo.status === "trial") return "Teste gratuito"
    return subscriptionInfo.plan === "annual" ? "Plano anual" : "Plano mensal"
  })()

  const handleSignOut = async () => {
    await signOut()
    navigate("/login")
  }
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={collapsed ? displayName : undefined}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{planLabel}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/conta" onClick={closeMobileSidebar}>
                  <BadgeCheck />
                  Conta
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
