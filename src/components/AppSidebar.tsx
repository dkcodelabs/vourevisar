import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Settings, Clock,
  Trophy, TrendingUp, LucideIcon, Shield, RotateCcw, Target, LayoutGrid,
  ChevronLeft, ChevronRight, Key, CreditCard, FileUp, Monitor, FileSearch,
  MessageSquare, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, BarChart3, ClipboardList, Library, Layers, Bot
} from "lucide-react";

import { AnimatedLogo } from './AnimatedLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useAIStatus } from '@/hooks/useAIStatus';

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

const getNavItems = (isAdmin: boolean, isOwner: boolean) => {
  const mainItems: NavItem[] = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard, end: true },
    { to: "/meus-editais", label: "Meus Editais", icon: Library },
    { to: "/ciclo-estudos", label: "Ciclo de Estudos", icon: RotateCcw },
    { to: "/revisoes", label: "Revisões", icon: Clock },
    { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
    { to: "/reveal-cards", label: "Componentes UI", icon: Layers },
  ];

  const adminItems: NavItem[] = isAdmin ? [
    { to: "/admin/users", label: "Gerenciar Usuários", icon: Users },
    { to: "/admin/editais", label: "Gerenciar Editais", icon: Library },
    { to: "/admin/importancia-prova", label: "Importância em Prova", icon: TrendingUp },
    { to: "/admin/subscription", label: "Assinaturas", icon: CreditCard },
    ...(isOwner ? [{ to: "/admin/pricing", label: "Preços e Cupons", icon: Target }] : []),
    { to: "/admin/audit", label: "Auditoria", icon: ClipboardList },
    { to: "/admin/ai-settings", label: "Gestão de IA", icon: Bot },
    { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  ] : [];

  return { mainItems, adminItems };
};

export function AppSidebar() {

  const { isAdmin, isOwner, loading } = useUserRole();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const { mainItems, adminItems } = React.useMemo(() => getNavItems(isAdmin, isOwner), [isAdmin, isOwner]);

  React.useEffect(() => {
    if (window.innerWidth >= 768 && window.innerWidth < 1024) {
      setIsCollapsed(true);
    }
  }, []);

  const isItemActive = (item: NavItem) => {
    if (item.end) {
      return location.pathname === item.to;
    }
    if (item.to === '/materias') {
      return location.pathname === '/materias';
    }
    return location.pathname.startsWith(item.to);
  };

  const { aiStatus } = useAIStatus();

  const renderNavItems = (items: NavItem[]) => (
    items.map((item) => {
      const isActive = isItemActive(item);
      const showIconOnly = isCollapsed && !isMobile;
      const isAIItem = item.to === "/admin/ai-settings";
      
      let aiStatusColor = "";
      if (isAIItem) {
        aiStatusColor = aiStatus.status === 'active' ? 'text-green-500' : 'text-red-500';
      }

      return (
        <li key={item.to} className="w-full">
          <SidebarTooltip label={item.label} enabled={showIconOnly}>
            <NavLink to={item.to} end={item.end ?? false} className="w-full block">
              <div
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all group ${isActive ? 'nav-item-active' : 'text-sidebar-muted hover:bg-primary/5 hover:text-primary'
                  } ${showIconOnly ? 'justify-center px-0' : ''}`}
              >
                <div className="relative">
                  <item.icon 
                    size={18} 
                    className={isActive ? 'text-primary' : (isAIItem ? aiStatusColor : '')} 
                  />
                  {isAIItem && showIconOnly && (
                    <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar ${aiStatus.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                  )}
                </div>
                {!showIconOnly && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="font-medium text-[13px] whitespace-nowrap truncate">{item.label}</span>
                    {isAIItem && (
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ml-2 ${aiStatus.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                    )}
                  </div>
                )}
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
      className={`flex flex-col h-full bg-sidebar shrink-0 overflow-hidden relative transition-colors duration-300 z-[90] ${isMobile ? 'w-full rounded-none border-none' : 'rounded-3xl border border-border dark:border-white/5'
        }`}
    >
      <div className="pl-3 pr-4 py-6 flex items-center justify-between h-[88px] relative">
        <div className={`flex items-center overflow-hidden h-full ${isCollapsed && !isMobile ? 'justify-center w-full' : ''}`}>
          <AnimatedLogo collapsed={isCollapsed && !isMobile} className="h-full" />
        </div>

        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-secondary dark:hover:bg-white/5 rounded-lg transition-colors text-sidebar-muted shrink-0"
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

        {(isAdmin || loading) && (
          <div className="pt-2">
            {(!isCollapsed || isMobile) && (
              <div className="px-3 mb-2 flex items-center gap-2">
                <Shield size={12} className="text-sidebar-muted/50" />
                <p className="text-[10px] font-bold text-sidebar-muted/50 uppercase tracking-widest">
                  Administração
                </p>
              </div>
            )}
            <nav className="space-y-1">
              <ul className="flex w-full min-w-0 flex-col gap-1">
                {loading ? (
                  // Admin Skeleton Loader
                  Array.from({ length: 4 }).map((_, i) => (
                    <li key={`admin-skeleton-${i}`} className="w-full">
                      <div className={`flex items-center gap-2 px-3 py-2.5 ${isCollapsed && !isMobile ? 'justify-center' : ''}`}>
                        <div className={`bg-primary/10 animate-pulse rounded-lg shrink-0 ${isCollapsed && !isMobile ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`} />
                        {!isCollapsed || isMobile ? (
                          <div className="h-3 w-2/3 bg-primary/5 animate-pulse rounded-md" />
                        ) : null}
                      </div>
                    </li>
                  ))
                ) : (
                  renderNavItems(adminItems)
                )}
              </ul>
            </nav>
          </div>
        )}
      </div>


    </motion.aside>
  );
}
