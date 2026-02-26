import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Book, Calendar, Users, Settings, List, Clock,
  Trophy, TrendingUp, LucideIcon, Shield, RotateCcw, Target, LayoutGrid,
  ChevronLeft, ChevronRight, Key, CreditCard, FileUp, Monitor, FileSearch,
  MessageSquare, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, BarChart3, ClipboardList
} from "lucide-react";

import { AnimatedLogo } from './AnimatedLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';

import { motion, AnimatePresence } from 'motion/react';

// ─── Tooltip Moderno para Menu Recolhido ────────────────────────────────────
interface SidebarTooltipProps {
  label: string;
  children: React.ReactNode;
  enabled: boolean;
}

const SidebarTooltip = ({ label, children, enabled }: SidebarTooltipProps) => {
  const [visible, setVisible] = React.useState(false);

  if (!enabled) return <>{children}</>;

  return (
    <div
      className="relative w-full flex justify-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: -6, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-[200] pointer-events-none"
          >
            {/* Seta */}
            <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-0 h-0
              border-t-[5px] border-t-transparent
              border-b-[5px] border-b-transparent
              border-r-[5px] border-r-[rgba(30,30,35,0.92)]"
            />
            {/* Balão */}
            <div className="
              bg-[rgba(20,20,25,0.92)] dark:bg-[rgba(15,15,20,0.95)]
              text-white text-[12px] font-semibold
              px-3 py-1.5 rounded-lg
              whitespace-nowrap
              shadow-[0_4px_20px_rgba(0,0,0,0.4)]
              border border-white/10
              backdrop-blur-md
              ring-1 ring-inset ring-white/5
            ">
              {label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
// ────────────────────────────────────────────────────────────────────────────

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
          <SidebarTooltip label={item.label} enabled={showIconOnly}>
            <NavLink to={item.to} end={item.end ?? false} className="w-full block">
              <div
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group ${isActive ? 'nav-item-active' : 'text-sidebar-muted hover:bg-primary/5 hover:text-primary'
                  } ${showIconOnly ? 'justify-center px-0' : ''}`}
              >
                <item.icon size={18} className={isActive ? 'text-primary' : ''} />
                {!showIconOnly && <span className="font-medium text-[13px] whitespace-nowrap">{item.label}</span>}
              </div>
            </NavLink>
          </SidebarTooltip>
        </li>
      );
    })
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed && !isMobile ? 80 : (isMobile ? '100%' : 260) }}
      className={`flex flex-col h-full bg-sidebar shrink-0 overflow-hidden relative transition-colors duration-300 z-[90] ${isMobile ? 'w-full rounded-none border-none' : 'rounded-3xl border border-white/5'
        }`}
    >
      <div className="pl-3 pr-4 py-6 flex items-center justify-between h-[88px] relative">
        <div className={`flex items-center overflow-hidden h-full ${isCollapsed && !isMobile ? 'justify-center w-full' : ''}`}>
          <AnimatedLogo collapsed={isCollapsed && !isMobile} className="h-full" />
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


    </motion.aside>
  );
}
