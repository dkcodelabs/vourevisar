
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Calendar, User, Settings, List, Clock, Trophy, TrendingUp, LucideIcon, Shield, RotateCcw, Target } from "lucide-react";
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

const getNavItems = (isAdmin: boolean): NavItem[] => {
  const baseItems: NavItem[] = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard, end: true },
    { to: "/ciclo-estudos", label: "Ciclo de Estudos", icon: Target },
    { to: "/revisoes", label: "Revisões", icon: Clock },
    { to: "/materias", label: "Matérias", icon: BookOpen },
    { to: "/topicos", label: "Tópicos", icon: List },
    { to: "/estatisticas", label: "Estatísticas", icon: TrendingUp },
  ];

  if (isAdmin) {
    baseItems.unshift({ to: "/gerenciamento", label: "Gerenciamento", icon: Shield });
  }

  return baseItems;
};

export function AppSidebar() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const { setOpenMobile, state } = useSidebar();
  const isMobile = useIsMobile();
  const isCollapsed = state === 'collapsed';

  const navItems = React.useMemo(() => getNavItems(isAdmin), [isAdmin]);

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

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#1E2A3B]/20 transition-all duration-300 !bg-[#1E2A3B]"
      style={{ backgroundColor: '#1E2A3B' }}
    >
      <SidebarHeader
        className="p-4 border-b border-white/10 h-16 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#1E2A3B' }}
      >
        <div className="flex items-center justify-center w-full transition-all duration-300">
          {isCollapsed ? (
            <img src="/icon.png" alt="vouRevisar" className="h-10 w-10 flex-shrink-0" />
          ) : (
            <img src="/logo.png" alt="vouRevisar" className="h-10 w-auto flex-shrink-0" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-3" style={{ backgroundColor: '#1E2A3B' }}>
        <SidebarGroup>
          <SidebarMenu className="space-y-1">
            {navItems.map((item) => {
              const isActive = isItemActive(item);

              return (
                <SidebarMenuItem key={item.to}>
                  <NavLink to={item.to} end={item.end ?? false} onClick={handleNavClick}>
                    <SidebarMenuButton
                      isActive={isActive}
                      asChild
                      tooltip={item.label}
                      className={`w-full justify-start h-11 px-3 text-sm font-medium transition-all rounded-lg ${isActive
                        ? '!bg-blue-600 text-white shadow-md'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      <div className="flex items-center">
                        <item.icon size={20} className={`mr-3 flex-shrink-0 text-white`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </SidebarMenuButton>
                  </NavLink>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <SidebarFooter className="p-4 border-t border-white/10" style={{ backgroundColor: '#1E2A3B' }}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
            <div className={`overflow-hidden ${isCollapsed ? 'flex justify-center' : 'flex-1'}`}>
              {isCollapsed ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={undefined} alt="Avatar do usuário" />
                  <AvatarFallback className="bg-app-blue text-white text-sm font-medium">
                    {user?.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserProfileNav />
              )}
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
