
import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton 
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Calendar, User, Settings, List, Clock, LucideIcon } from "lucide-react";
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
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppSidebar() {
  const { user } = useAuth();

  return (
    <Sidebar className="border-r-0 w-64 glass-card">
      {/* Header */}
      <SidebarHeader className="p-6 border-b border-border/50">
        <motion.div 
          className="flex items-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-brand-600 dark:text-brand-400 font-bold text-2xl">
            vouRevisar
          </span>
        </motion.div>
      </SidebarHeader>
      
      {/* Navigation Content */}
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarMenu className="space-y-1">
            {navItems.map((item, index) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <SidebarMenuItem>
                  <NavLink to={item.to} end={item.end ?? false}>
                    {({ isActive }) => (
                      <SidebarMenuButton 
                        asChild 
                        className={`
                          group relative w-full h-12 px-4 text-base font-medium rounded-xl
                          transition-all duration-200 ease-out overflow-hidden
                          ${isActive 
                            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface-100 dark:hover:bg-surface-800'
                          }
                        `}
                      >
                        <motion.div 
                          className="flex items-center relative z-10"
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                          <item.icon 
                            size={20} 
                            className={`mr-3 transition-transform duration-200 ${
                              isActive ? 'scale-110' : 'group-hover:scale-105'
                            }`} 
                          />
                          <span>{item.label}</span>
                          
                          {/* Active indicator */}
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-xl"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                            />
                          )}
                        </motion.div>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              </motion.div>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Footer with User Profile */}
      {user && (
        <SidebarFooter className="p-4 border-t border-border/50">
          <motion.div 
            className="flex items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <div className="flex-1 overflow-hidden">
              <UserProfileNav />
            </div>
          </motion.div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
