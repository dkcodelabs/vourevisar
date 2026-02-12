import React from 'react';
import { X, Calendar, TrendingUp, Vibrate, Settings, Plus, Filter, Inbox, Tag, CalendarDays, AlertTriangle, CreditCard, Monitor, FileText } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';


// ─── Tipos ──────────────────────────────────────────────────────────
type NotificationCategory = 'sistema' | 'estudo';

interface MockNotification {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgClass: string;
  iconTextClass: string;
  timestamp: string;
  category: NotificationCategory;
  read: boolean;
  group: 'hoje' | 'ontem' | 'anterior';
}

type FilterOption = 'todas' | 'nao_lidas' | 'sistema' | 'estudo';

// ─── Dados mockados (fiéis ao design) ────────────────────────────────
const MOCK_NOTIFICATIONS: MockNotification[] = [
  {
    id: '1',
    title: 'Revisão vence hoje',
    description: 'Sua revisão de Direito Civil expira em 2h',
    icon: <Calendar size={14} />,
    iconBgClass: 'bg-blue-50 dark:bg-blue-900/30',
    iconTextClass: 'text-blue-500',
    timestamp: 'há 2h',
    category: 'estudo',
    read: false,
    group: 'hoje',
  },
  {
    id: '2',
    title: 'Meta Semanal',
    description: 'Você atingiu 80% da sua meta de estudos!',
    icon: <TrendingUp size={14} />,
    iconBgClass: 'bg-green-50 dark:bg-green-900/30',
    iconTextClass: 'text-green-600',
    timestamp: 'há 5h',
    category: 'estudo',
    read: true,
    group: 'hoje',
  },
  {
    id: '3',
    title: 'Novo Material',
    description: 'O PDF de Processo Penal foi atualizado.',
    icon: <Vibrate size={14} />,
    iconBgClass: 'bg-amber-50 dark:bg-amber-900/30',
    iconTextClass: 'text-amber-600',
    timestamp: 'Ontem',
    category: 'sistema',
    read: true,
    group: 'ontem',
  },
  {
    id: '4',
    title: 'Manutenção Programada',
    description: 'A plataforma ficará instável das 02:00 às 04:00.',
    icon: <Settings size={14} />,
    iconBgClass: 'bg-slate-50 dark:bg-slate-800',
    iconTextClass: 'text-slate-400',
    timestamp: 'há 2 dias',
    category: 'sistema',
    read: true,
    group: 'anterior',
  },
];

// ─── Tipos Solicitações ──────────────────────────────────────────────
type FeedbackStatus = 'respondida' | 'em_desenvolvimento' | 'planejado' | 'em_analise' | 'finalizada';
type StatusFilterOption = 'todas' | FeedbackStatus;

interface MockFeedback {
  id: string;
  code: string;
  title: string;
  status: FeedbackStatus;
  categoryIcon: React.ReactNode;
  categoryLabel: string;
  date: string;
  message?: string;
  response?: {
    text: string;
    date: string;
  };
}

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; dotClass: string; bgClass: string; textClass: string }> = {
  respondida: { label: 'Respondida', dotClass: 'bg-green-500', bgClass: 'bg-green-100 dark:bg-green-900/30', textClass: 'text-green-600 dark:text-green-400' },
  em_desenvolvimento: { label: 'Em Desenvolvimento', dotClass: 'bg-blue-500', bgClass: 'bg-blue-100 dark:bg-blue-900/30', textClass: 'text-blue-600 dark:text-blue-400' },
  planejado: { label: 'Planejado', dotClass: 'bg-purple-500', bgClass: 'bg-purple-100 dark:bg-purple-900/30', textClass: 'text-purple-600 dark:text-purple-400' },
  em_analise: { label: 'Em Análise', dotClass: 'bg-amber-500', bgClass: 'bg-amber-100 dark:bg-amber-900/30', textClass: 'text-amber-600 dark:text-amber-400' },
  finalizada: { label: 'Finalizada', dotClass: 'bg-slate-400', bgClass: 'bg-slate-100 dark:bg-slate-800', textClass: 'text-slate-500' },
};

const MOCK_FEEDBACKS: MockFeedback[] = [
  {
    id: 'f1',
    code: 'FBK-20391',
    title: 'Sugestão de novos flashcards de Biologia',
    status: 'respondida',
    categoryIcon: <Tag size={10} />,
    categoryLabel: 'Melhoria',
    date: '24 Out 2023',
    message: 'Gostaria de ver mais conteúdos focados em Microbiologia e Genética Molecular nos flashcards da plataforma.',
    response: {
      text: 'Olá, Bruno! Adoramos sua sugestão. Já repassamos para nossa equipe de conteúdo acadêmico. Novos cards de Genética estão em produção. Previsão: Próxima semana!',
      date: 'Hoje, 14:20',
    },
  },
  {
    id: 'f2',
    code: 'FBK-20389',
    title: 'Modo escuro para versão mobile',
    status: 'em_desenvolvimento',
    categoryIcon: <Monitor size={10} />,
    categoryLabel: 'UX/UI',
    date: '23 Out 2023',
  },
  {
    id: 'f3',
    code: 'FBK-20388',
    title: 'Exportação de notas em PDF',
    status: 'planejado',
    categoryIcon: <FileText size={10} />,
    categoryLabel: 'Funcionalidade',
    date: '23 Out 2023',
  },
  {
    id: 'f4',
    code: 'FBK-20385',
    title: 'Erro ao carregar simulado do ENEM',
    status: 'em_analise',
    categoryIcon: <AlertTriangle size={10} />,
    categoryLabel: 'Suporte Técnico',
    date: '22 Out 2023',
  },
  {
    id: 'f5',
    code: 'FBK-20370',
    title: 'Dúvida sobre renovação do plano anual',
    status: 'finalizada',
    categoryIcon: <CreditCard size={10} />,
    categoryLabel: 'Financeiro',
    date: '18 Out 2023',
  },
];

// ─── Props ───────────────────────────────────────────────────────────
interface StudentHubPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Componente Principal ────────────────────────────────────────────
export const StudentHubPanel: React.FC<StudentHubPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = React.useState<'notificacoes' | 'solicitacoes'>('notificacoes');
  const [activeFilter, setActiveFilter] = React.useState<FilterOption>('todas');
  const [notifications, setNotifications] = React.useState<MockNotification[]>(MOCK_NOTIFICATIONS);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilterOption>('todas');
  const [expandedFeedback, setExpandedFeedback] = React.useState<string | null>('f1');
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);


  // Filtrar notificações
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'nao_lidas') return !n.read;
      if (activeFilter === 'sistema') return n.category === 'sistema';
      if (activeFilter === 'estudo') return n.category === 'estudo';
      return true; // 'todas'
    });
  }, [notifications, activeFilter]);

  // Agrupar notificações
  const grouped = React.useMemo(() => {
    const groups: Record<string, MockNotification[]> = {};
    filteredNotifications.forEach((n) => {
      if (!groups[n.group]) groups[n.group] = [];
      groups[n.group].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const groupOrder: { key: string; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'ontem', label: 'Ontem' },
    { key: 'anterior', label: 'Anterior' },
  ];

  // Marcar todas como lidas
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fechar com ESC
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Bloquear scroll do body
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filters: { key: FilterOption; label: string }[] = [
    { key: 'todas', label: 'Todas' },
    { key: 'nao_lidas', label: 'Não lidas' },
    { key: 'sistema', label: 'Sistema' },
    { key: 'estudo', label: 'Estudo' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[60]"
        onClick={onClose}
      />

      {/* Painel lateral */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-slate-900 shadow-2xl z-[70] flex flex-col border-l border-slate-100 dark:border-slate-800 animate-in slide-in-from-right duration-300"
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start mb-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Central do Aluno</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors -mt-0.5"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe avisos e suas solicitações.
          </p>
        </div>

        {/* ── Tabs (distribuídas na largura) ──────────────────── */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('notificacoes')}
            className={`relative flex-1 py-3 text-xs font-semibold transition-colors text-center ${activeTab === 'notificacoes'
              ? 'text-blue-500'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Notificações
            {activeTab === 'notificacoes' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('solicitacoes')}
            className={`relative flex-1 py-3 text-xs font-semibold transition-colors text-center ${activeTab === 'solicitacoes'
              ? 'text-blue-500'
              : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Minhas Solicitações
            {activeTab === 'solicitacoes' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500" />
            )}
          </button>
        </div>

        {/* ── Conteúdo da aba ativa ─────────────────────────── */}
        {activeTab === 'notificacoes' ? (
          <>
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
              {unreadCount > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-blue-500 hover:underline"
                  >
                    Marcar todas como lidas
                  </button>
                </div>
              )}
            </div>

            {/* Timeline de notificações */}
            <div className="flex-1 overflow-y-auto px-5 pb-10">
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
                      {/* Linha vertical da timeline */}
                      <div
                        className={`absolute left-3 top-1.5 bottom-1.5 w-0.5 bg-slate-100 dark:bg-slate-800 ${isOlder ? 'opacity-30' : ''
                          }`}
                      />

                      {items.map((notification) => (
                        <div
                          key={notification.id}
                          className={`relative pl-8 group cursor-pointer ${isOlder ? 'opacity-70 hover:opacity-100 transition-opacity' : ''
                            }`}
                        >
                          {/* Ícone circular */}
                          <div
                            className={`absolute left-0 top-0.5 w-6 h-6 rounded-full flex items-center justify-center z-10 ring-[3px] ring-white dark:ring-slate-900 ${notification.iconBgClass} ${notification.iconTextClass}`}
                          >
                            {notification.icon}
                          </div>

                          {/* Conteúdo */}
                          <div className="flex flex-col gap-0.5">
                            <div className="flex justify-between items-center">
                              <h3
                                className={`font-semibold text-xs group-hover:text-blue-500 transition-colors ${isOlder
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-900 dark:text-white'
                                  }`}
                              >
                                {notification.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-[9px] text-slate-400 uppercase font-medium">
                                  {notification.timestamp}
                                </span>
                                {!notification.read && (
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                              {notification.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Estado vazio */}
              {filteredNotifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Calendar size={32} className="mb-2 opacity-40" />
                  <p className="text-xs font-medium">Nenhuma notificação encontrada</p>
                  <p className="text-[11px] mt-1">Tente alterar o filtro selecionado</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Aba Solicitações ─────────────────────────────── */
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Botão + Filtro */}
            <div className="flex items-center gap-2 px-5 py-3">
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm text-[11px]"
              >
                <Plus size={12} />
                Enviar Feedback
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-2 px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 hover:border-slate-300 transition-colors"
                >
                  <Filter size={12} className="text-slate-400" />
                  Status: <span className="font-medium">{statusFilter === 'todas' ? 'Todas' : STATUS_CONFIG[statusFilter].label}</span>
                </button>
                {showStatusDropdown && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setShowStatusDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-[90] py-1">
                      {(['todas', 'respondida', 'em_desenvolvimento', 'planejado', 'em_analise', 'finalizada'] as StatusFilterOption[]).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => { setStatusFilter(opt); setShowStatusDropdown(false); }}
                          className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${statusFilter === opt ? 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                          {opt === 'todas' ? 'Todas' : STATUS_CONFIG[opt].label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Lista de cards */}
            <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-2.5">
              {MOCK_FEEDBACKS
                .filter((fb) => statusFilter === 'todas' || fb.status === statusFilter)
                .map((fb) => {
                  const status = STATUS_CONFIG[fb.status];
                  const isExpanded = expandedFeedback === fb.id;
                  const hasResponse = fb.status === 'respondida' && fb.response;

                  return (
                    <div
                      key={fb.id}
                      onClick={() => setExpandedFeedback(isExpanded ? null : fb.id)}
                      className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden transition-all cursor-pointer ${hasResponse && isExpanded
                        ? 'border border-slate-200 dark:border-slate-800'
                        : fb.status === 'em_desenvolvimento'
                          ? 'border-2 border-blue-400/40 hover:border-blue-400/60'
                          : 'border border-slate-200 dark:border-slate-800 hover:border-blue-400/50'
                        }`}
                    >
                      {/* Header do card */}
                      <div className={`p-3 ${hasResponse && isExpanded ? 'border-b border-slate-100 dark:border-slate-800 bg-blue-500/5' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[9px] font-mono font-bold tracking-wider ${hasResponse && isExpanded
                            ? 'text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded'
                            : 'text-slate-400 font-medium'
                            }`}>
                            {fb.code}
                          </span>
                          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full ${status.bgClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                            <span className={`text-[9px] font-bold uppercase ${status.textClass}`}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-0.5 line-clamp-1">
                          {fb.title}
                        </h3>
                        <div className="flex items-center gap-2.5 text-[9px] text-slate-400">
                          <span className="flex items-center gap-0.5">
                            {fb.categoryIcon}
                            {fb.categoryLabel}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <CalendarDays size={10} />
                            {fb.date}
                          </span>
                        </div>
                      </div>

                      {/* Conteúdo expandido (apenas para "respondida") */}
                      {hasResponse && isExpanded && fb.message && fb.response && (
                        <div className="p-3 space-y-2.5">
                          <div className="space-y-0.5">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Sua mensagem</p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                              {fb.message}
                            </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border-l-2 border-blue-500 space-y-1">
                            <p className="text-[8px] font-bold text-blue-500 uppercase">Resposta da equipe</p>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-normal">
                              {fb.response.text}
                            </p>
                            <p className="text-[9px] text-slate-400 text-right">{fb.response.date}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Estado vazio */}
              {MOCK_FEEDBACKS.filter((fb) => statusFilter === 'todas' || fb.status === statusFilter).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <Inbox size={20} className="text-slate-300" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400">Nenhum feedback encontrado</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Suas mensagens aparecerão aqui.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de Feedback ──────────────────────── */}
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </>
  );
};
