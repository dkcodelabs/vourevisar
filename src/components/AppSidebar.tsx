
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Calendar, User, Settings, List, Clock, Trophy, TrendingUp, LucideIcon, Shield, RotateCcw, Target, LayoutGrid, ChevronLeft, ChevronRight, Key, CreditCard, FileUp, Server, FileSearch, MessageSquare } from "lucide-react";
import { UserProfileNav } from './UserProfileNav';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const getNavItems = (isAdmin: boolean) => {
  const mainItems: NavItem[] = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard, end: true },
    { to: "/ciclo-estudos", label: "Ciclo de Estudos", icon: Target },
    { to: "/revisoes", label: "Revisões", icon: Clock },
    { to: "/materias", label: "Matérias", icon: BookOpen },
    { to: "/topicos", label: "Tópicos", icon: List },
    { to: "/estatisticas", label: "Estatísticas", icon: TrendingUp },
  ];

  const adminItems: NavItem[] = isAdmin ? [
    { to: "/gerenciamento", label: "Gerenciamento V1 (Legacy)", icon: Settings },
    { to: "/admin/users", label: "Gerenciar Usuários", icon: User },
    { to: "/admin/content/import", label: "Importar Questões", icon: FileUp },
    { to: "/admin/subscription", label: "Assinaturas", icon: CreditCard },
    { to: "/admin/system", label: "Sistema", icon: Server },
    { to: "/admin/security", label: "Segurança", icon: Shield },
    { to: "/admin/audit", label: "Auditoria", icon: FileSearch },
    { to: "/admin/feedback", label: "Feedbacks", icon: MessageSquare },
  ] : [];

  return { mainItems, adminItems };
};

export function AppSidebar() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const { setOpenMobile, state, toggleSidebar } = useSidebar();
  const isMobile = useIsMobile();
  const isCollapsed = state === 'collapsed';

  const { mainItems, adminItems } = React.useMemo(() => getNavItems(isAdmin), [isAdmin]);

  // Função para verificar se o item está ativo
  const isItemActive = (item: NavItem) => {
    if (item.end) {
      return location.pathname === item.to;
    }

    // Para tópicos, considerar ativo se estiver em /topicos ou /materias/*/topicos
    if (item.to === '/topicos') {
      return location.pathname === '/topicos' || location.pathname.includes('/topicos');
    }

    // Para matérias, considerar ativo apenas se estiver exatamente em /materias
    if (item.to === '/materias') {
      return location.pathname === '/materias';
    }

    return location.pathname.startsWith(item.to);
  };

  // Função para fechar o sidebar em mobile quando navegar
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const renderNavItems = (items: NavItem[]) => (
    items.map((item) => {
      const isActive = isItemActive(item);
      // Only apply collapsed styles on desktop, never on mobile
      const showIconOnly = isCollapsed && !isMobile;

      return (
        <SidebarMenuItem key={item.to}>
          <NavLink to={item.to} end={item.end ?? false} onClick={handleNavClick}>
            <SidebarMenuButton
              isActive={isActive}
              asChild
              tooltip={item.label}
              className={`w-full h-11 px-3 text-sm font-medium transition-all rounded-lg ${showIconOnly ? 'justify-center' : 'justify-start'} ${isActive
                ? '!bg-blue-600 text-white shadow-md'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
            >
              <div className={`flex items-center ${showIconOnly ? 'justify-center' : ''}`}>
                <item.icon size={22} className={`flex-shrink-0 text-white ${showIconOnly ? '' : 'mr-3'}`} />
                <span className={`truncate ${showIconOnly ? 'hidden' : ''}`}>{item.label}</span>
              </div>
            </SidebarMenuButton>
          </NavLink>
        </SidebarMenuItem>
      );
    })
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className="transition-all duration-300 md:!left-4 md:!top-[88px] md:!bottom-4 md:!h-[calc(100vh-104px)] md:!rounded-2xl md:!shadow-2xl"
      style={{ backgroundColor: '#1E2A3B' }}
    >
      <SidebarHeader
        className={`p-4 h-[72px] flex items-center justify-between overflow-hidden ${isMobile ? 'bg-white border-b border-gray-200 shadow-md' : ''}`}
        style={!isMobile ? { backgroundColor: '#1E2A3B' } : undefined}
      >
        {/* Mobile Logo */}
        <div className="flex items-center justify-center w-full md:hidden transition-all duration-300">
          <img src="/logo.png" alt="vouRevisar" className="h-8 w-auto flex-shrink-0" />
        </div>

        {/* Desktop Collapse Toggle (Inside Card) */}
        <div className={`hidden md:flex w-full items-center ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={toggleSidebar}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3" style={{ backgroundColor: '#1E2A3B' }}>
        <SidebarGroup>
          <SidebarMenu className="space-y-1">
            {renderNavItems(mainItems)}
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-4">
            {/* Separator Label - Hidden if collapsed on desktop */}
            {(!isCollapsed || isMobile) && (
              <div className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
                Gerenciamento
              </div>
            )}
            {/* Separator Line for collapsed state */}
            {isCollapsed && !isMobile && (
              <div className="mx-3 my-2 h-[1px] bg-white/10" />
            )}

            <SidebarMenu className="space-y-1">
              {renderNavItems(adminItems)}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {user && (() => {
        // Only show compact (avatar only) when collapsed AND on desktop
        const showCompactProfile = isCollapsed && !isMobile;
        return (
          <SidebarFooter className="p-3" style={{ backgroundColor: '#1E2A3B' }}>
            {showCompactProfile ? (
              <div className="flex justify-center">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={undefined} alt="Avatar do usuário" />
                  <AvatarFallback className="bg-app-blue text-white text-sm font-medium">
                    {user?.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <UserProfileNav />
            )}
          </SidebarFooter>
        );
      })()}
    </Sidebar>
  );
}
