import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup } from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Calendar, User, Settings, Menu, List } from "lucide-react";
import { UserProfileNav } from './UserProfileNav';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Sidebar className="border-r min-h-screen">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <span className="text-app-blue font-bold text-2xl">vouRevisar</span>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="md:hidden">
            <Menu size={24} />
          </Button>
        </div>
        
        <SidebarContent className={`${collapsed ? 'hidden' : 'block'} md:block`}>
          <SidebarGroup>
            <NavLink 
              to="/" 
              className={({ isActive }) => 
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <LayoutDashboard size={20} />
              <span>Painel</span>
            </NavLink>
            
            <NavLink 
              to="/materias" 
              className={({ isActive }) => 
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <BookOpen size={20} />
              <span>Matérias</span>
            </NavLink>
            
            <NavLink 
              to="/plano-estudos" 
              className={({ isActive }) => 
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <Calendar size={20} />
              <span>Plano de Estudos</span>
            </NavLink>
            
            <NavLink 
              to="/perfil" 
              className={({ isActive }) => 
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <User size={20} />
              <span>Perfil</span>
            </NavLink>
            
            <NavLink 
              to="/configuracoes" 
              className={({ isActive }) => 
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <Settings size={20} />
              <span>Configurações</span>
            </NavLink>
            
            <NavLink 
              to="/topicos" 
              className={({ isActive }) => 
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <List size={20} />
              <span>Tópicos</span>
            </NavLink>
          </SidebarGroup>
        </SidebarContent>
        
        {user && (
          <div className={`${collapsed ? 'hidden' : 'block'} md:block mt-auto border-t pt-4 pb-2`}>
            <div className="flex items-center px-2">
              <div className="flex-1 overflow-hidden text-sm">
                <UserProfileNav />
              </div>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}
