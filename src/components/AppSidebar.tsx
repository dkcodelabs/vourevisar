
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar 
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Calendar, User, Settings, List, Clock, Trophy, TrendingUp, LucideIcon, Shield, RotateCcw } from "lucide-react";
import { UserProfileNav } from './UserProfileNav';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: "/gerenciamento", label: "Gerenciamento", icon: Shield },
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/ciclo-estudos", label: "Ciclo de Estudos", icon: RotateCcw },
  { to: "/revisoes", label: "Revisões", icon: Clock },
  { to: "/materias", label: "Matérias", icon: BookOpen },
  { to: "/topicos", label: "Tópicos", icon: List },
  { to: "/estatisticas", label: "Estatísticas", icon: TrendingUp },
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

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
    
    // Para gerenciamento, considerar ativo se estiver em /gerenciamento
    if (item.to === '/gerenciamento') {
      return location.pathname === '/gerenciamento';
    }
    
    // Para ciclo de estudos, considerar ativo se estiver em /ciclo-estudos
    if (item.to === '/ciclo-estudos') {
      return location.pathname === '/ciclo-estudos';
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
    <Sidebar className="border-r w-64">
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center">
          <span className="text-app-blue font-bold text-2xl">vouRevisar</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
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
                      className={`w-full justify-start h-10 px-4 text-sm font-medium transition-colors rounded-lg ${
                        isActive 
                          ? 'bg-app-blue text-white hover:bg-app-blue' 
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center">
                        <item.icon size={20} className="mr-3" />
                        <span>{item.label}</span>
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
        <SidebarFooter className="p-4 border-t">
          <div className="flex items-center">
            <div className="flex-1 overflow-hidden">
              <UserProfileNav />
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
