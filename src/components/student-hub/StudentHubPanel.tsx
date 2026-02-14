import React, { useRef, useEffect } from 'react';
import { X, Calendar, TrendingUp, Vibrate, Settings, Plus, Filter, Inbox, CalendarDays, AlertTriangle, Wand2, PlusCircle, RefreshCw, BellOff, MessageSquarePlus, SearchX } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useNotifications, type UserNotification, type NotificationFilter } from '@/hooks/useNotifications';
import { useUserFeedbacks, type UserFeedback, type FeedbackStatus } from '@/hooks/useUserFeedbacks';
import { useStudentHubBadge } from '@/hooks/useStudentHubBadge';
import { getFeedbackStatusLabel } from '@/services/feedbackService';
import { analytics } from '@/lib/analytics';

// ─── Status Config ──────────────────────────────────────────
const STATUS_CONFIG: Record<FeedbackStatus, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  nova: { label: 'Nova', dotClass: 'bg-amber-500', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-600 dark:text-amber-400' },
  planejada: { label: 'Planejada', dotClass: 'bg-purple-500', bgClass: 'bg-purple-100 dark:bg-purple-900/30', textClass: 'text-purple-600 dark:text-purple-400' },
  em_desenvolvimento: { label: 'Em Desenvolvimento', dotClass: 'bg-blue-500', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-600 dark:text-blue-400' },
  concluida: { label: 'Concluída', dotClass: 'bg-green-500', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-600 dark:text-green-400' },
  nao_planejada: { label: 'Não Planejada', dotClass: 'bg-slate-400', bgClass: 'bg-slate-100 dark:bg-slate-800', textClass: 'text-slate-500' },
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string }> = {
  melhoria: { icon: <Wand2 size={10} />, label: 'Melhoria' },
  nova_funcionalidade: { icon: <PlusCircle size={10} />, label: 'Nova funcionalidade' },
  problema: { icon: <AlertTriangle size={10} />, label: 'Problema' },
  // Legacy types from old form
  improvement: { icon: <Wand2 size={10} />, label: 'Melhoria' },
  feature_request: { icon: <PlusCircle size={10} />, label: 'Nova funcionalidade' },
  ux_issue: { icon: <AlertTriangle size={10} />, label: 'Problema' },
};

// ─── Helpers ────────────────────────────────────────────────
const NOTIFICATION_ICON_MAP: Record<string, { icon: React.ReactNode; bgClass: string; textClass: string }> = {
  estudo: { icon: <Calendar size={14} />, bgClass: 'bg-blue-50 dark:bg-blue-900/30', textClass: 'text-blue-500' },
  progresso: { icon: <TrendingUp size={14} />, bgClass: 'bg-green-50 dark:bg-green-900/30', textClass: 'text-green-600' },
  alerta: { icon: <Vibrate size={14} />, bgClass: 'bg-amber-50 dark:bg-amber-900/30', textClass: 'text-amber-600' },
  sistema: { icon: <Settings size={14} />, bgClass: 'bg-slate-50 dark:bg-slate-800', textClass: 'text-slate-400' },
};

function getNotificationIcon(type: string) {
  return NOTIFICATION_ICON_MAP[type] || NOTIFICATION_ICON_MAP.sistema;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDateGroup(dateStr: string): 'hoje' | 'ontem' | 'anterior' {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);

  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (notifDate.getTime() === today.getTime()) return 'hoje';
  if (notifDate.getTime() === yesterday.getTime()) return 'ontem';
  return 'anterior';
}

/** Helper para formatar mensagens de notificação humanizadas */
function formatNotificationMessage(msg: string): string {
  // Substitui 'feedback' por 'pedido/solicitação'
  let clean = msg.replace(/Seu feedback/gi, 'Sua solicitação')
    .replace(/feedback/gi, 'pedido');

  // Mapeia status técnicos para labels amigáveis
  const statusMatch = clean.match(/mudou para:\s*([a-z_]+)$/i);
  if (statusMatch) {
    const rawStatus = statusMatch[1];
    const label = getFeedbackStatusLabel(rawStatus);
    clean = clean.replace(rawStatus, label);
  }

  return clean;
}

type StatusFilterOption = 'todas' | FeedbackStatus;

// ─── Props ───────────────────────────────────────────────────
interface StudentHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Skeleton Components ─────────────────────────────────────
const SkeletonNotification: React.FC = () => (
  <div className="relative pl-8 animate-pulse" aria-hidden="true">
    <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
    <div className="flex flex-col gap-1.5">
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-full" />
    </div>
  </div>
);

const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 animate-pulse" aria-hidden="true">
    <div className="flex justify-between items-start mb-2">
      <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded w-20" />
      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-16" />
    </div>
    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6 mb-2" />
    <div className="flex gap-3">
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-16" />
      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-14" />
    </div>
  </div>
);

// ─── Componente Principal ────────────────────────────────────
export const StudentHubPanel: React.FC<StudentHubPanelProps> = ({ isOpen, onClose }) => {
  // Analytics: Log opening
  useEffect(() => {
    if (isOpen) {
      analytics.sendEvent('student_hub_opened');
    }
  }, [isOpen]);
  const [activeTab, setActiveTab] = React.useState<'notificacoes' | 'feedbacks'>('notificacoes');
  const [activeFilter, setActiveFilter] = React.useState<NotificationFilter>('todas');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilterOption | 'respondido'>('todas');
  const [expandedFeedback, setExpandedFeedback] = React.useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // ── Hooks ───────────────────────────────────────────────────
  // Hook unificado para Unread/Fingerprint logic
  const {
    unreadFeedbackIds,
    markFeedbackAsRead,
    totalUnreadCount
  } = useStudentHubBadge();

  const {
    notifications,
    isLoading: notifLoading,
    error: notifError,
    markAsRead: markNotificationAsRead,
    markAllRead: markAllNotificationsRead,
    refetch: refetchNotifs,
  } = useNotifications();

  const {
    feedbacks,
    isLoading: fbLoading,
    isSubmitting,
    error: fbError,
    submitFeedback,
    refetch: refetchFeedbacks,
  } = useUserFeedbacks();

  // ── Polling Realtime (10s) - SILENT ─────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      // Refresh inicial ao abrir
      refetchNotifs({ silent: true });
      refetchFeedbacks({ silent: true });

      // Polling a cada 10s
      interval = setInterval(() => {
        refetchNotifs({ silent: true });
        refetchFeedbacks({ silent: true });
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isOpen, refetchNotifs, refetchFeedbacks]);


  // Filtrar notificações (Exclusivo Estudo)
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      // Regra: Não mostrar feedback/solicitação na aba de notificações
      const isFeedbackRelated = /feedback|solicita[çc][ãa]o|pedido/i.test(n.message) || /feedback|solicita[çc][ãa]o|pedido/i.test(n.title);
      if (isFeedbackRelated) return false;

      if (activeFilter === 'nao_lidas') return !n.read;
      return true;
    });
  }, [notifications, activeFilter]);

  // Agrupar notificações por data
  const grouped = React.useMemo(() => {
    const groups: Record<string, UserNotification[]> = {};
    filteredNotifications.forEach((n) => {
      const group = getDateGroup(n.created_at);
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const groupOrder = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'ontem', label: 'Ontem' },
    { key: 'anterior', label: 'Anterior' },
  ];

  // Filtrar feedbacks
  const filteredFeedbacks = React.useMemo(() => {
    if (statusFilter === 'todas') return feedbacks;
    if (statusFilter === 'respondido') return feedbacks.filter(fb => !!fb.admin_reply);
    return feedbacks.filter((fb) => fb.status === statusFilter);
  }, [feedbacks, statusFilter]);

  // Fechar com ESC
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showFeedbackModal) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose, showFeedbackModal]);

  // Bloquear scroll do body
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Foco no drawer ao abrir
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtros de notificação simplificados (Apenas Todas e Não lidas)
  const filters: { key: NotificationFilter; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'nao_lidas', label: 'Não lidas' },
  ];

  // ── Callback do FeedbackModal (Com correção de fechamento) ────
  const handleFeedbackSubmit = async (type: string, title: string, description: string) => {
    try {
      const result = await submitFeedback({
        type: type as 'melhoria' | 'nova_funcionalidade' | 'problema',
        title,
        description,
      });

      if (result?.protocol_code) {
        // Sucesso: Fechar modal e atualizar lista
        setShowFeedbackModal(false);
        // Atualização otimista ou refetch já acontece no hook submitFeedback
        // Refetch silencioso extra por garantia
        refetchFeedbacks({ silent: true });
      }
      return result?.protocol_code ?? null;
    } catch (error) {
      // Erro: Modal permanece aberto
      console.error("Erro ao enviar feedback:", error);
      return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel lateral */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Central do Aluno"
        tabIndex={-1}
        className="fixed top-0 right-0 h-full w-full sm:w-[400px] md:w-[420px] bg-white dark:bg-slate-900 shadow-2xl z-[70] flex flex-col border-l border-slate-100 dark:border-slate-800 animate-in slide-in-from-right duration-300 outline-none"
      >
        {/* ── Sticky Header + Tabs ─────────────────────────────── */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-0.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Central do Aluno</h2>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors -mt-0.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Acompanhe avisos e o andamento dos seus pedidos.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800" role="tablist" aria-label="Seções da Central">
            <button
              role="tab"
              id="tab-notificacoes"
              aria-selected={activeTab === 'notificacoes'}
              aria-controls="tabpanel-notificacoes"
              onClick={() => {
                setActiveTab('notificacoes');
                analytics.sendEvent('student_tab_changed', { tab: 'notificacoes' });
              }}
              className={`relative flex-1 py-3 text-xs font-semibold transition-colors text-center min-h-[44px] ${activeTab === 'notificacoes'
                ? 'text-blue-500'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Notificações
              {activeTab === 'notificacoes' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" aria-hidden="true" />
              )}
            </button>
            <button
              role="tab"
              id="tab-feedbacks"
              aria-selected={activeTab === 'feedbacks'}
              aria-controls="tabpanel-feedbacks"
              onClick={() => {
                setActiveTab('feedbacks');
                analytics.sendEvent('student_tab_changed', { tab: 'feedbacks' });
              }}
              className={`relative flex-1 py-3 text-xs font-semibold transition-colors text-center min-h-[44px] ${activeTab === 'feedbacks'
                ? 'text-blue-500'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              Feedback
              {activeTab === 'feedbacks' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* ── Conteúdo da aba ativa ─────────────────────────── */}
        {activeTab === 'notificacoes' ? (
          <div role="tabpanel" id="tabpanel-notificacoes" aria-labelledby="tab-notificacoes" className="flex-1 flex flex-col min-h-0">
            {/* Filtros + Link */}
            <div className="px-5 py-3 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${activeFilter === f.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {totalUnreadCount > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-[11px] font-semibold text-blue-500 hover:underline"
                  >
                    Marcar todas como lidas
                  </button>
                </div>
              )}
            </div>

            {/* Timeline de notificações */}
            <div className="flex-1 overflow-y-auto scroll-smooth px-5 pb-10">
              {/* Skeleton Loading */}
              {notifLoading && (
                <div className="space-y-5 py-4" role="status" aria-label="Carregando notificações">
                  <SkeletonNotification />
                  <SkeletonNotification />
                  <SkeletonNotification />
                  <span className="sr-only">Carregando notificações...</span>
                </div>
              )}

              {/* Erro */}
              {!notifLoading && notifError && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <AlertTriangle size={28} className="mb-2 text-red-400" />
                  <p className="text-xs font-medium text-red-500 mb-2">Erro ao carregar</p>
                  <button
                    onClick={() => refetchNotifs()}
                    className="text-[11px] font-semibold text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Tentar novamente
                  </button>
                </div>
              )}

              {/* Dados */}
              {!notifLoading && !notifError && (
                <>
                  {groupOrder.map(({ key, label }) => {
                    const items = grouped[key];
                    if (!items || items.length === 0) return null;

                    const isOlder = key === 'anterior';

                    return (
                      <div key={key} className={`relative ${key !== 'hoje' ? 'mt-1' : ''} pb-4`}>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                          {label}
                        </h4>

                        <div className="space-y-5 relative">
                          <div
                            className={`absolute left-3 top-1.5 bottom-1.5 w-0.5 bg-slate-100 dark:bg-slate-800 ${isOlder ? 'opacity-30' : ''}`}
                          />

                          {items.map((notification) => {
                            const iconInfo = getNotificationIcon(notification.type);
                            return (
                              <div
                                key={notification.id}
                                className={`relative pl-8 group cursor-pointer ${isOlder ? 'opacity-70 hover:opacity-100 transition-opacity' : ''}`}
                                onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                              >
                                {/* Ícone circular */}
                                <div
                                  className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center z-10 ring-[3px] ring-white dark:ring-slate-900 ${iconInfo.bgClass} ${iconInfo.textClass}`}
                                  aria-hidden="true"
                                >
                                  {iconInfo.icon}
                                </div>

                                {/* Conteúdo */}
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex justify-between items-center">
                                    <h3 className="font-semibold text-xs group-hover:text-blue-500 transition-colors text-slate-900 dark:text-white">
                                      {notification.title}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                      <span className="text-[9px] text-slate-400 uppercase font-medium">
                                        {formatRelativeDate(notification.created_at)}
                                      </span>
                                      {!notification.read && (
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                    {formatNotificationMessage(notification.message)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Estado vazio */}
                  {filteredNotifications.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        {activeFilter !== 'todas' ? (
                          <SearchX size={24} className="text-slate-300 dark:text-slate-600" aria-hidden="true" />
                        ) : (
                          <BellOff size={24} className="text-slate-300 dark:text-slate-600" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {activeFilter !== 'todas'
                          ? 'Nenhuma notificação com este filtro.'
                          : 'Nenhuma notificação por enquanto.'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                        {activeFilter !== 'todas'
                          ? 'Tente outro filtro ou aguarde novas atualizações.'
                          : 'Quando houver atualizações ou avisos, eles aparecerão aqui.'}
                      </p>
                      {activeFilter !== 'todas' && (
                        <button
                          onClick={() => setActiveFilter('todas')}
                          className="mt-3 text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          Limpar filtro
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* ── Aba Feedbacks ─────────────────────────────── */
          <div role="tabpanel" id="tabpanel-feedbacks" aria-labelledby="tab-feedbacks" className="flex-1 flex flex-col min-h-0">
            {/* Botão + Filtro — sticky */}
            <div className="sticky top-0 z-[5] bg-white dark:bg-slate-900 flex items-center gap-2 px-5 py-3 border-b border-slate-50 dark:border-slate-800/50">
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm text-[11px] min-h-[44px]"
              >
                <Plus size={14} aria-hidden="true" />
                Nova Solicitação
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  aria-haspopup="listbox"
                  aria-expanded={showStatusDropdown}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-2.5 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 hover:border-slate-300 transition-colors min-h-[44px]"
                >
                  <Filter size={12} className="text-slate-400" aria-hidden="true" />
                  Status: <span className="font-medium">{statusFilter === 'todas' ? 'Todas' : statusFilter === 'respondido' ? 'Respondido' : STATUS_CONFIG[statusFilter]?.label ?? statusFilter}</span>
                </button>
                {showStatusDropdown && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setShowStatusDropdown(false)} />
                    <div role="listbox" className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-[90] py-1">
                      {(['todas', 'respondido', 'nova', 'planejada', 'em_desenvolvimento', 'concluida', 'nao_planejada'] as (StatusFilterOption | 'respondido')[]).map((opt) => (
                        <button
                          key={opt}
                          role="option"
                          aria-selected={statusFilter === opt}
                          onClick={() => { setStatusFilter(opt); setShowStatusDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-[11px] transition-colors min-h-[36px] ${statusFilter === opt ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          {opt === 'todas' ? 'Todas' : opt === 'respondido' ? 'Respondido' : STATUS_CONFIG[opt as FeedbackStatus]?.label ?? opt}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Lista de cards */}
            <div className="flex-1 overflow-y-auto scroll-smooth px-5 pb-10 space-y-2.5">
              {/* Skeleton Loading */}
              {fbLoading && (
                <div className="space-y-2.5 py-2" role="status" aria-label="Carregando pedidos">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                  <span className="sr-only">Carregando pedidos...</span>
                </div>
              )}

              {/* Erro */}
              {!fbLoading && fbError && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <AlertTriangle size={28} className="mb-2 text-red-400" />
                  <p className="text-xs font-medium text-red-500 mb-2">Erro ao carregar</p>
                  <button
                    onClick={() => refetchFeedbacks()}
                    className="text-[11px] font-semibold text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Tentar novamente
                  </button>
                </div>
              )}

              {/* Dados */}
              {!fbLoading && !fbError && (
                <>
                  {filteredFeedbacks.map((fb) => {
                    const status = STATUS_CONFIG[fb.status] || STATUS_CONFIG.nova;
                    const typeInfo = TYPE_CONFIG[fb.type] || TYPE_CONFIG.melhoria;
                    const isExpanded = expandedFeedback === fb.id;
                    const hasReply = !!fb.admin_reply;

                    // NOVA LÓGICA DE UNREAD (Fingerprint)
                    const isUnread = unreadFeedbackIds.has(fb.id);

                    return (
                      <div
                        key={fb.id}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => {
                          const newExpandedState = isExpanded ? null : fb.id;
                          setExpandedFeedback(newExpandedState);

                          // Se tentar abrir (expandir) e for não lido, marca como lido imediatamente
                          if (!isExpanded && isUnread) {
                            markFeedbackAsRead(fb.id);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const newExpandedState = isExpanded ? null : fb.id;
                            setExpandedFeedback(newExpandedState);

                            if (!isExpanded && isUnread) {
                              markFeedbackAsRead(fb.id);
                            }
                          }
                        }}
                        className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${hasReply && isExpanded
                          ? 'border border-slate-200 dark:border-slate-800'
                          : fb.status === 'em_desenvolvimento'
                            ? 'border-2 border-blue-400/40 hover:border-blue-400/60'
                            : 'border border-slate-200 dark:border-slate-800 hover:border-blue-400/50'
                          }`}
                      >
                        {/* Header do card */}
                        <div className={`p-3 ${hasReply && isExpanded ? 'border-b border-slate-100 dark:border-slate-800 bg-blue-500/5' : ''}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-[9px] font-mono font-bold tracking-wider ${hasReply && isExpanded
                              ? 'text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded'
                              : 'text-slate-400 font-medium'
                              }`}>
                              {fb.protocol_code}
                            </span>
                            <div className="flex items-center gap-2">
                              {/* Blue Dot Indicator for Feedback */}
                              {isUnread && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ring-2 ring-blue-100 dark:ring-blue-900" title="Nova atualização" />
                              )}
                              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${status.bgClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} aria-hidden="true" />
                                <span className={`text-[9px] font-bold uppercase ${status.textClass}`}>
                                  {status.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-0.5 line-clamp-2">
                            {fb.title}
                          </h3>
                          <div className="flex items-center gap-2.5 text-[9px] text-slate-400">
                            <span className="flex items-center gap-0.5" aria-hidden="true">
                              {typeInfo.icon}
                              {typeInfo.label}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <CalendarDays size={10} aria-hidden="true" />
                              {formatRelativeDate(fb.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Conteúdo expandido */}
                        <div
                          className={`transition-all duration-200 ease-in-out ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}
                        >
                          <div className="p-3 space-y-2.5">
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Sua solicitação</p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                                {fb.description}
                              </p>
                            </div>
                            {hasReply && (
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border-l-2 border-blue-500 space-y-1">
                                <p className="text-[8px] font-bold text-blue-500 uppercase">Resposta da equipe</p>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-normal">
                                  {fb.admin_reply}
                                </p>
                                {fb.admin_reply_at && (
                                  <p className="text-[9px] text-slate-400 text-right">{formatRelativeDate(fb.admin_reply_at)}</p>
                                )}
                              </div>
                            )}
                            {fb.status === 'nao_planejada' && fb.admin_reason && (
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border-l-2 border-slate-400 space-y-1">
                                <p className="text-[8px] font-bold text-slate-500 uppercase">Motivo</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                                  {fb.admin_reason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Estado vazio */}
                  {filteredFeedbacks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        {statusFilter !== 'todas' ? (
                          <SearchX size={24} className="text-slate-300 dark:text-slate-600" aria-hidden="true" />
                        ) : (
                          <MessageSquarePlus size={24} className="text-slate-300 dark:text-slate-600" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {statusFilter !== 'todas'
                          ? 'Nenhum pedido com este status.'
                          : 'Você ainda não enviou nenhum pedido.'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                        {statusFilter !== 'todas'
                          ? 'Tente um filtro diferente ou envie uma solicitação.'
                          : 'Diga o que pode ser melhorado — sua opinião importa!'}
                      </p>
                      {statusFilter !== 'todas' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setStatusFilter('todas'); }}
                          className="mt-3 text-[11px] font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          Limpar filtro
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowFeedbackModal(true); }}
                          className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all text-xs min-h-[44px]"
                        >
                          <Plus size={14} aria-hidden="true" />
                          Enviar sua primeira solicitação
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div >

      {/* ── Modal de Feedback ──────────────────────── */}
      < FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={handleFeedbackSubmit}
        isSubmitting={isSubmitting}
      />
    </>
  );
};
