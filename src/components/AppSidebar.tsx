
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton 
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Calendar, User, Settings, List, LucideIcon } from "lucide-react";
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
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar() {
  const { user } = useAuth();

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 mb-4">
        <div className="flex items-center">
          <span className="text-app-blue font-bold text-2xl">vouRevisar</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <NavLink to={item.to} end={item.end ?? false}>
                  {({ isActive }) => (
                    <SidebarMenuButton isActive={isActive} asChild className="w-full justify-start">
                      <>
                        <item.icon size={20} className="mr-2" />
                        <span>{item.label}</span>
                      </>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      {user && (
        <SidebarFooter className="p-4 mt-auto border-t">
          <div className="flex items-center">
            <div className="flex-1 overflow-hidden text-sm">
              <UserProfileNav />
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
