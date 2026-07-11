import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Clock,
  Trophy, TrendingUp, LucideIcon, Shield, RotateCcw, Target, LayoutGrid,
  ChevronLeft, ChevronRight, Key, CreditCard, FileUp, Monitor, FileSearch,
  MessageSquare, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronUp, BarChart3, ClipboardList, Library, Bot, NotebookTabs, AlertTriangle, Crown, LogOut, User
} from "lucide-react";

import { AnimatedLogo } from './AnimatedLogo';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useAIStatus } from '@/hooks/useAIStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useSubscriptionInfo } from '@/hooks/useSubscriptionInfo';
import { UserAvatar } from '@/components/ui/UserAvatar';

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
    { to: "/cadernos", label: "Cadernos", icon: NotebookTabs },
    { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  ];

  const adminItems: NavItem[] = isAdmin ? [
    { to: "/admin/users", label: "Gerenciar Usuários", icon: Users },
    { to: "/admin/editais", label: "Gerenciar Editais", icon: Library },
    { to: "/admin/importancia-prova", label: "Importância em Prova", icon: TrendingUp },
    { to: "/admin/subscription", label: "Assinaturas", icon: CreditCard },
    ...(isOwner ? [{ to: "/admin/pricing", label: "Preços e Cupons", icon: Target }] : []),
    { to: "/admin/audit", label: "Auditoria", icon: ClipboardList },
    { to: "/admin/system/errors", label: "Erros do Sistema", icon: AlertTriangle },
    { to: "/admin/ai-settings", label: "Gestão de IA", icon: Bot },
    { to: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  ] : [];

  return { mainItems, adminItems };
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '—';
  const [, year, month, day] = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? [];
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
};

const getDaysUntil = (dateString?: string | null) => {
  if (!dateString) return null;
  const target = new Date(dateString);
  if (Number.isNaN(target.getTime())) return null;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
};

const getSubscriptionView = (
  subscriptionInfo: ReturnType<typeof useSubscriptionInfo>['subscriptionInfo'],
  isAdmin: boolean,
  isOwner: boolean,
) => {
  if (isOwner || isAdmin) {
    return {
      badge: isOwner ? 'OWNER' : 'ADMIN',
      title: isOwner ? 'Proprietário' : 'Administrador',
      status: isOwner ? 'Acesso total' : 'Acesso interno',
      tone: isOwner ? 'text-amber-400' : 'text-sky-400',
      cta: 'Planos',
      summary: 'Acesso total',
      compact: true,
    };
  }

  if (!subscriptionInfo || !subscriptionInfo.is_active) {
    return {
      badge: 'FREE',
      title: 'Plano Free',
      status: 'Sem acesso ativo',
      tone: 'text-slate-400',
      cta: 'Assinar agora',
      summary: 'Escolha um plano para liberar o app.',
      compact: false,
    };
  }

  if (subscriptionInfo.status === 'trial') {
    const days = Math.max(subscriptionInfo.days_remaining ?? 0, 0);
    return {
      badge: `TRIAL (${days}D)`,
      title: 'Teste gratuito',
      status: 'Teste gratuito',
      tone: days <= 3 ? 'text-amber-400' : 'text-cyan-400',
      cta: 'Assinar agora',
      summary: `Termina em ${formatDate(subscriptionInfo.trial_ends_at)}`,
      remaining: days === 1 ? '1 dia restante' : `${days} dias restantes`,
      compact: false,
    };
  }

  const isAnnual = subscriptionInfo.plan === 'annual';
  const renewalDate = subscriptionInfo.next_billing_date || subscriptionInfo.subscription_ends_at;
  const daysUntilRenewal = getDaysUntil(renewalDate);
  const renewalSummary = renewalDate
    ? `Renova em ${formatDate(renewalDate)}`
    : 'Assinatura ativa';

  return {
    badge: isAnnual ? 'ANUAL' : 'MENSAL',
    title: isAnnual ? 'Plano Anual' : 'Plano Mensal',
    status: 'Ativo',
    tone: 'text-emerald-400',
    cta: 'Gerenciar',
    summary: daysUntilRenewal !== null
      ? `${renewalSummary} (${daysUntilRenewal === 1 ? '1 dia' : `${daysUntilRenewal} dias`})`
      : renewalSummary,
    compact: true,
  };
};

const SidebarAccountPanel = ({
  isCollapsed,
  isMobile,
  isAdmin,
  isOwner,
}: {
  isCollapsed: boolean;
  isMobile: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}) => {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { subscriptionInfo, loading } = useSubscriptionInfo();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement>(null);
  const showIconOnly = isCollapsed && !isMobile;

  React.useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAccountMenuOpen]);

  if (!user) return null;

  const firstName = (profile?.name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário')
    .split(' ')[0]
    .toUpperCase();
  const view = getSubscriptionView(subscriptionInfo, isAdmin, isOwner);
  const handleSignOut = async () => {
    setIsSigningOut(true);
    setIsAccountMenuOpen(false);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  if (showIconOnly) {
    return (
      <div className="px-3 pb-4">
        <SidebarTooltip label="Meu Perfil" enabled>
          <Link
            to="/conta?tab=perfil"
            className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-black/5 text-sidebar-muted transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary dark:bg-white/5"
          >
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.name || user.email}
              className="h-10 w-10 rounded-xl border border-white/10"
              fallbackClassName="rounded-xl bg-amber-500/10 text-amber-300"
            />
          </Link>
        </SidebarTooltip>
      </div>
    );
  }

  return (
    <div className="relative shrink-0 border-t border-border/70 p-3" ref={accountMenuRef}>
      <AnimatePresence>
        {isAccountMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-2xl border border-border bg-sidebar shadow-2xl dark:border-white/10"
          >
            <div className="p-2">
              <Link
                to="/conta?tab=perfil"
                onClick={() => setIsAccountMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-sidebar-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <User size={16} />
                Conta
              </Link>
              <div className="my-1 h-px bg-border/80" />
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-orange-500 transition-colors hover:bg-orange-500/10 disabled:cursor-wait disabled:opacity-70"
              >
                <LogOut size={16} />
                {isSigningOut ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsAccountMenuOpen((open) => !open)}
        className="mb-2 flex w-full items-center gap-3 rounded-2xl px-1 py-1 text-left transition-opacity hover:opacity-90"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold tracking-wide text-sidebar-foreground">
            {firstName}
          </p>
          <p className={`truncate text-[10px] font-black uppercase tracking-wider ${view.tone}`}>
            {loading ? 'CARREGANDO' : view.badge}
          </p>
        </div>
        <UserAvatar
          src={profile?.avatar_url}
          name={profile?.name || user.email}
          className="h-11 w-11 rounded-xl border border-white/10"
          fallbackClassName="rounded-xl bg-amber-500/10 text-amber-300"
        />
      </button>

      <Link
        to="/planos"
        className="group block rounded-2xl border border-border bg-black/[0.03] p-3 transition-all hover:border-primary/40 hover:bg-primary/[0.06] dark:bg-white/[0.03]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            {isOwner || isAdmin ? <Crown size={15} /> : <CreditCard size={15} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sidebar-muted">
              Assinatura
            </p>
            <p className="truncate text-[13px] font-black leading-tight text-sidebar-foreground">
              {view.title}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold text-sidebar-muted">
            {view.compact ? view.summary : view.remaining}
          </p>
          <span className={`shrink-0 text-[11px] font-black ${view.tone}`}>
            {view.status}
          </span>
        </div>

        <div className="mt-3 rounded-full bg-sidebar-foreground px-3 py-2 text-center text-[11px] font-bold text-sidebar transition-all group-hover:bg-primary group-hover:text-primary-foreground">
          {view.cta}
        </div>
      </Link>
    </div>
  );
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
    return location.pathname.startsWith(item.to);
  };

  const { aiStatus } = useAIStatus({ enabled: isAdmin });

  const getAIStatusVisual = () => {
    if (aiStatus.status === 'active') {
      return {
        iconClass: 'text-green-500',
        dotClass: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
      };
    }

    if (aiStatus.status === 'error') {
      return {
        iconClass: 'text-red-500',
        dotClass: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
      };
    }

    return {
      iconClass: 'text-sidebar-muted',
      dotClass: 'bg-slate-400 shadow-none',
    };
  };

  const renderNavItems = (items: NavItem[]) => (
    items.map((item) => {
      const isActive = isItemActive(item);
      const showIconOnly = isCollapsed && !isMobile;
      const isAIItem = item.to === "/admin/ai-settings";
      const aiVisual = getAIStatusVisual();
      
      let aiStatusColor = "";
      if (isAIItem) {
        aiStatusColor = aiVisual.iconClass;
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
                    <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar ${aiVisual.dotClass}`} />
                  )}
                </div>
                {!showIconOnly && (
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="font-medium text-[13px] whitespace-nowrap truncate">{item.label}</span>
                    {isAIItem && (
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ml-2 ${aiVisual.dotClass}`} />
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

        {isAdmin && (
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
                {renderNavItems(adminItems)}
              </ul>
            </nav>
          </div>
        )}
      </div>

      <SidebarAccountPanel
        isCollapsed={isCollapsed}
        isMobile={isMobile}
        isAdmin={isAdmin}
        isOwner={isOwner}
      />

    </motion.aside>
  );
}
