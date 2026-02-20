
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar
} from "@/components/ui/sidebar";
import { LayoutDashboard, BookOpen, Calendar, User, Settings, List, Clock, Trophy, TrendingUp, LucideIcon, Shield, RotateCcw, Target, LayoutGrid, ChevronLeft, ChevronRight, Key, CreditCard, FileUp, Server, FileSearch, MessageSquare, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp } from "lucide-react";
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
    { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
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

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showScrollDownIndicator, setShowScrollDownIndicator] = React.useState(false);
  const [showScrollUpIndicator, setShowScrollUpIndicator] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollDownIndicator(
        scrollHeight > clientHeight && Math.ceil(scrollTop + clientHeight) < scrollHeight - 2
      );
      setShowScrollUpIndicator(scrollTop > 0);
    }
  }, []);

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll, mainItems, adminItems, isCollapsed]);

  // Handle checking scroll after a slight delay, to allow rendering
  React.useEffect(() => {
    const timeout = setTimeout(checkScroll, 100);
    return () => clearTimeout(timeout);
  }, [checkScroll]);

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
        <SidebarMenuItem key={item.to} className="w-full">
          <NavLink to={item.to} end={item.end ?? false} onClick={handleNavClick} className="w-full block">
            <SidebarMenuButton
              isActive={isActive}
              asChild
              tooltip={showIconOnly ? item.label : undefined}
              className={`w-full h-10 px-2 text-[13px] font-medium transition-all rounded-lg relative group/nav flex items-center gap-2 overflow-hidden ${showIconOnly ? 'justify-center' : 'justify-start'} ${isActive
                ? 'text-[#EAB308] bg-[#241A0B] !bg-[#241A0B] hover:bg-[#241A0B]' // Force yellow text and brown bg
                : 'text-slate-200 hover:text-white hover:bg-slate-800/50'
                }`}
            >
              <div className={`flex items-center w-full ${showIconOnly ? 'justify-center' : ''}`}>
                {/* Indicador lateral amarelo fluído para itens ativos - agora sempre visível */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-[#EAB308] rounded-r-md"></div>
                )}
                <item.icon size={22} className={`flex-shrink-0 ${isActive ? 'text-[#EAB308]' : 'text-slate-200 group-hover/nav:text-white'} ${showIconOnly ? '' : 'mr-3'}`} />
                <span className={`text-[13px] font-medium truncate ${showIconOnly ? 'hidden' : ''} ${isActive ? 'text-[#EAB308]' : 'text-slate-200 group-hover/nav:text-white'}`}>{item.label}</span>
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
      className="transition-all duration-300 md:!left-4 md:!top-[88px] md:!bottom-4 md:!h-[calc(100vh-104px)] [&>div[data-sidebar=sidebar]]:!rounded-2xl md:!rounded-2xl border-none shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-2xl z-[90]"
    >
      <SidebarHeader
        className={`relative p-3 h-[60px] flex flex-row items-center justify-between border-b border-slate-800/80 z-20`}
      >
        {/* Up Indicator */}
        <div className={`absolute bottom-0 left-0 w-full flex justify-center pointer-events-none z-30 transition-opacity duration-300 translate-y-1/2 ${showScrollUpIndicator ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-[#181A1C] border border-slate-700/80 rounded-full p-0.5 shadow-lg flex items-center justify-center">
            <ChevronUp size={14} className="text-slate-400 animate-bounce" />
          </div>
        </div>

        {/* Logo Section */}
        <div className={`flex items-center gap-2 w-full ${isCollapsed && !isMobile ? 'justify-center' : 'justify-start'}`}>
          <div className="w-7 h-7 bg-[#EAB308] rounded-md flex items-center justify-center shrink-0 shadow-sm shadow-[#EAB308]/20">
            <RotateCcw className="text-black/90 font-bold" size={16} strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg tracking-tight text-white">EduFlow</span>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <div className={`flex items-center justify-end`}>
          <button
            onClick={toggleSidebar}
            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center p-1 rounded-md"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>
      </SidebarHeader>

      <SidebarContent
        ref={scrollRef}
        onScroll={checkScroll}
        className="p-2 bg-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <SidebarGroup>
          <SidebarMenu className="space-y-0.5">
            {renderNavItems(mainItems)}
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup className="mt-3 border-t border-slate-800/50 pt-3">
            {isCollapsed && !isMobile && (
              <div className="mx-2 my-2 h-[1px] bg-slate-800/50" />
            )}

            <SidebarMenu className="space-y-0.5">
              {renderNavItems(adminItems)}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {user && (() => {
        // Only show compact (avatar only) when collapsed AND on desktop
        const showCompactProfile = isCollapsed && !isMobile;
        return (
          <SidebarFooter className="relative p-3 mt-auto border-t border-slate-800/80 bg-transparent z-20">
            {/* Down Indicator */}
            <div className={`absolute top-0 left-0 w-full flex justify-center pointer-events-none z-30 transition-opacity duration-300 -translate-y-1/2 ${showScrollDownIndicator ? 'opacity-100' : 'opacity-0'}`}>
              <div className="bg-[#181A1C] border border-slate-700/80 rounded-full p-0.5 shadow-lg flex items-center justify-center">
                <ChevronDown size={14} className="text-slate-400 animate-bounce" />
              </div>
            </div>

            {showCompactProfile ? (
              <div className="flex justify-center">
                <Avatar className="h-8 w-8 border border-slate-700">
                  <AvatarImage src={undefined} alt="Avatar do usuário" />
                  <AvatarFallback className="bg-slate-800 text-white text-[11px] font-medium">
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
