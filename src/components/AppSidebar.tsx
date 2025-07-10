
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton 
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Calendar, User, Settings, List, Clock, Trophy, HelpCircle, TrendingUp, LucideIcon } from "lucide-react";
import { UserProfileNav } from './UserProfileNav';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/materias", label: "Matérias", icon: BookOpen },
  { to: "/plano-estudos", label: "Plano de Estudos", icon: Calendar },
  { to: "/topicos", label: "Tópicos", icon: List },
  { to: "/revisoes", label: "Revisões", icon: Clock },
  { to: "/questoes", label: "Questões", icon: HelpCircle },
  { to: "/revisao-geral", label: "Revisão Geral", icon: Trophy },
  { to: "/estatisticas", label: "Estatísticas", icon: TrendingUp },
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();

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
                  <NavLink to={item.to} end={item.end ?? false}>
                    <SidebarMenuButton 
                      isActive={isActive} 
                      asChild 
                      className={`w-full justify-start h-10 px-4 text-base font-medium transition-colors rounded-lg ${
                        isActive 
                          ? 'bg-app-blue text-white hover:bg-app-blue' 
                          : 'text-gray-700 hover:bg-gray-100'
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
