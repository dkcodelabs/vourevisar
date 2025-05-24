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
    <Sidebar className="border-r"> {/* min-h-screen is handled by SidebarProvider context styles */}
      <SidebarHeader className="p-4 mb-4"> {/* Default p-2, mb-6 from old design, adjusted to mb-4 */}
        <div className="flex items-center"> {/* Removed justify-between as there's no other element */}
          <span className="text-app-blue font-bold text-2xl">vouRevisar</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent> {/* Takes remaining space, p-0 by default, SidebarGroup adds padding */}
        <SidebarGroup> {/* Default p-2 */}
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
        <SidebarFooter className="p-4 mt-auto border-t"> {/* Default p-2, mt-auto for stick to bottom */}
          {/* The UserProfileNav might have its own padding, ensure it fits well */}
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
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
