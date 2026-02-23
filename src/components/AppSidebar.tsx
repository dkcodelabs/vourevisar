import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Book, Calendar, Users, Settings, List, Clock,
  Trophy, TrendingUp, LucideIcon, Shield, RotateCcw, Target, LayoutGrid,
  ChevronLeft, ChevronRight, Key, CreditCard, FileUp, Monitor, FileSearch,
  MessageSquare, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, BarChart3, ClipboardList
} from "lucide-react";
import { UserProfileNav } from './UserProfileNav';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from 'motion/react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const getNavItems = (isAdmin: boolean) => {
  const mainItems: NavItem[] = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard, end: true },
    { to: "/ciclo-estudos", label: "Ciclo de Estudos", icon: RotateCcw },
    { to: "/revisoes", label: "Revisões", icon: Clock },
    { to: "/materias", label: "Matérias", icon: Book },
    { to: "/topicos", label: "Tópicos", icon: List },
    { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  ];

  const adminItems: NavItem[] = isAdmin ? [
    { to: "/gerenciamento", label: "Gerenciamento V1 (Legacy)", icon: Settings },
    { to: "/admin/users", label: "Gerenciar Usuários", icon: Users },
    { to: "/admin/content/import", label: "Importar Questões", icon: FileUp },
    { to: "/admin/subscription", label: "Assinaturas", icon: CreditCard },
    { to: "/admin/system", label: "Sistema", icon: Monitor },
    { to: "/admin/security", label: "Segurança", icon: Shield },
    { to: "/admin/audit", label: "Auditoria", icon: ClipboardList },
    { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  ] : [];

  return { mainItems, adminItems };
};

export function AppSidebar() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const { mainItems, adminItems } = React.useMemo(() => getNavItems(isAdmin), [isAdmin]);

  React.useEffect(() => {
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      setIsCollapsed(true);
    }
  }, []);

  const isItemActive = (item: NavItem) => {
    if (item.end) {
      return location.pathname === item.to;
    }
    if (item.to === '/topicos') {
      return location.pathname === '/topicos' || location.pathname.includes('/topicos');
    }
    if (item.to === '/materias') {
      return location.pathname === '/materias';
    }
    return location.pathname.startsWith(item.to);
  };

  const renderNavItems = (items: NavItem[]) => (
    items.map((item) => {
      const isActive = isItemActive(item);
      const showIconOnly = isCollapsed && !isMobile;

      return (
        <li key={item.to} className="w-full">
          <NavLink to={item.to} end={item.end ?? false} className="w-full block">
            <div
              title={showIconOnly ? item.label : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive ? 'nav-item-active' : 'text-sidebar-muted hover:bg-primary/5 hover:text-primary'
                } ${showIconOnly ? 'justify-center px-0' : ''}`}
            >
              <item.icon size={22} className={isActive ? 'text-primary' : ''} />
              {!showIconOnly && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
            </div>
          </NavLink>
        </li>
      );
    })
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed && !isMobile ? 80 : (isMobile ? '100%' : 260) }}
      className={`flex flex-col bg-sidebar shrink-0 overflow-hidden relative transition-colors duration-300 z-[90] ${isMobile ? 'w-full h-full rounded-none border-none' : 'h-[calc(100vh-32px)] md:h-[calc(100vh-48px)] rounded-3xl border border-white/5'
        }`}
    >
      <div className="p-6 flex items-center justify-between">
        <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed && !isMobile ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,191,255,0.3)]">
            <RotateCcw className="text-black font-bold" size={24} strokeWidth={2.5} />
          </div>
          {!(isCollapsed && !isMobile) && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sidebar-foreground font-extrabold text-2xl tracking-tight whitespace-nowrap"
            >
              VOU<span className="text-primary">REVISAR</span>
            </motion.span>
          )}
        </div>

        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-sidebar-muted shrink-0"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-8 mt-2">
        <nav className="space-y-1">
          <ul className="flex w-full min-w-0 flex-col gap-1">
            {renderNavItems(mainItems)}
          </ul>
        </nav>

        {isAdmin && (
          <div className="pt-4 border-t border-white/5">
            <nav className="space-y-1">
              <ul className="flex w-full min-w-0 flex-col gap-1">
                {renderNavItems(adminItems)}
              </ul>
            </nav>
          </div>
        )}
      </div>

      {user && (
        <div className="p-4 mt-auto border-t border-white/5">
          {isCollapsed && !isMobile ? (
            <div className="flex justify-center">
              <Avatar className="h-9 w-9 border border-white/10 shadow-sm">
                <AvatarImage src={undefined} alt="Avatar do usuário" />
                <AvatarFallback className="bg-primary/20 text-primary text-[12px] font-bold">
                  {user?.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <UserProfileNav />
          )}
        </div>
      )}
    </motion.aside>
  );
}
