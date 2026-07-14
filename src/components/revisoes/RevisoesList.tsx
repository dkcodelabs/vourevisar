import React from 'react';
import {
    CheckCircle2, Sparkles, BookOpen, CalendarOff, ChevronRight,
    Play, Square, FileText, Loader2, ClipboardList, FilterX
} from 'lucide-react';
import { RevisionItem, RevisionStatus } from '@/types/revision';
import { useNavigate } from 'react-router-dom';
import { TrendIcon } from '@/components/mentor/TrendIcon';
import type { MentorTrendLabel } from '@/types/mentor';

import { DifficultyBarsCompact } from '@/components/ui/difficulty-rating';
import type { ActiveTimer } from '@/contexts/TimerContext';
import { getReviewTopicRowClassName } from './reviewTopicRowClassName';

interface RevisoesListProps {
    activeTab: string;
    groupedItems: { [key: string]: RevisionItem[] };
    collapsedGroups: { [key: string]: boolean };
    setCollapsedGroups: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
    stats: {
        today: number;
        overdue: number;
        future: number;
        totalTopics: number;
        totalSubjects: number;
        startedTopicsCount: number;
    };
    activeTimer: ActiveTimer | null;
    highlightedTopicId: string | null;
    trendByTopic: Map<string, MentorTrendLabel>;
    loadingActions: Record<string, string>;
    handleMarkCompleted: (id: string) => void;
    handleAiAssist: (item: RevisionItem) => void;
    openNotesModal: (topicId: string, topicName: string, subjectName: string) => void;
    setSearchTerm: (term: string) => void; // For empty state clearing
    setReviewStageFilter: (filter: string) => void; // For empty state clearing
}

export const RevisoesList: React.FC<RevisoesListProps> = ({
    activeTab,
    groupedItems,
    collapsedGroups,
    setCollapsedGroups,
    stats,
    activeTimer,
    highlightedTopicId,
    trendByTopic,
    loadingActions,
    handleMarkCompleted,
    handleAiAssist,
    openNotesModal,
  setSearchTerm,
  setReviewStageFilter
}) => {
  const navigate = useNavigate();

    const getGroupStyle = (groupKey: string) => {
        switch (groupKey) {
            case 'FOCUS_MERGED':
                return {
                    title: (
                        <div className="flex items-center gap-1.5 text-base">
                            <span className="text-orange-600 dark:text-orange-500">Hoje</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-[10px] font-bold min-w-[16px] flex items-center justify-center">
                                {stats.today}
                            </span>
                            <span className="mx-0.5 text-muted-foreground">&</span>
                            <span className="text-rose-600 dark:text-rose-500">Atrasadas</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-[10px] font-bold min-w-[16px] flex items-center justify-center">
                                {stats.overdue}
                            </span>
                        </div>
                    ),
                    color: 'border-transparent',
                    text: 'text-foreground'
                };
            case RevisionStatus.OVERDUE: return { title: 'Atrasadas', color: 'border-red-400', text: 'text-rose-500' };
            case RevisionStatus.TODAY: return { title: 'Hoje', color: 'border-orange-500', text: 'text-orange-500' };
            case RevisionStatus.FUTURE: return { title: 'Futuras', color: 'border-blue-500', text: 'text-blue-500' };
            case RevisionStatus.COMPLETED: return { title: 'Concluídas', color: 'border-emerald-500', text: 'text-emerald-500' };
            case RevisionStatus.CONSOLIDATED: return { title: 'Já dominados', color: 'border-border', text: 'text-emerald-500' };
            case RevisionStatus.UNSTARTED: return { title: 'Não Iniciados', color: 'border-border', text: 'text-blue-500' };
            default: return { title: groupKey, color: 'border-primary/40', text: 'text-primary' };
        }
    };

    const totalItems = Object.values(groupedItems).reduce((acc, curr) => acc + curr.length, 0);

    if (totalItems === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
                {/* FOCUS TAB EMPTY STATE */}
                {activeTab === 'FOCUS' && (
                    <>
                        {/* Caso 1: Usuário não tem dados ainda */}
                        {stats.totalTopics === 0 ? (
                            <>
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                                    <BookOpen size={30} />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-3">
                                    {stats.totalSubjects === 0
                                        ? "Monte seu edital para liberar revisões"
                                        : "Adicione tópicos para começar"}
                                </h3>
                                <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                                    {stats.totalSubjects === 0 ? (
                                        "Cadastre ou importe um edital. Depois, inicie o primeiro tópico no Ciclo de Estudos para gerar revisões automaticamente."
                                    ) : (
                                        "Inclua tópicos nas matérias e inicie o estudo pelo Ciclo. As revisões entram aqui depois da primeira sessão concluída."
                                    )}
                                </p>
                                <button
                                    onClick={() => navigate('/meus-editais')}
                                    className="app-button-primary px-6 py-3 text-sm font-bold transition-colors"
                                >
                                    {stats.totalSubjects === 0 ? 'Ir para Meus Editais' : 'Gerenciar tópicos'}
                                </button>
                            </>
                        ) : stats.startedTopicsCount === 0 ? (
                            /* Caso 2: Tem tópicos mas nunca iniciou nenhum estudo */
                            <>
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                                    <Sparkles size={30} />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-3">Nenhum tópico iniciado ainda</h3>
                                <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                                    As revisões aparecem depois que você inicia um tópico no Ciclo de Estudos e conclui a sessão com avaliação de dificuldade.
                                </p>
                                <button
                                    onClick={() => navigate('/ciclo-estudos')}
                                    className="app-button-primary px-6 py-3 text-sm font-bold transition-colors"
                                >
                                    Ir para o Ciclo de Estudos
                                </button>
                            </>
                        ) : (
                            /* Caso 3: Usuário zerou as revisões de hoje e atrasadas */
                            <>
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                                    <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-2">Revisões em dia</h3>
                                <p className="text-content-muted max-w-md mx-auto mb-6 leading-relaxed">
                                    Você não tem revisões vencidas ou programadas para hoje.
                                </p>

                                <div className="mb-8 flex items-center gap-3 rounded-2xl border border-success/20 bg-success/8 px-5 py-3">
                                    <CheckCircle2 size={18} className="flex-shrink-0 text-success" />
                                    <p className="text-sm md:text-base text-foreground font-medium whitespace-normal md:whitespace-nowrap">
                                        Continue pelo ciclo quando quiser avançar em novos tópicos.
                                    </p>
                                </div>

                                {(stats.totalTopics - stats.startedTopicsCount > 0) && (
                                    <div className="max-w-sm w-full rounded-2xl border border-primary/15 bg-primary/8 p-5 relative overflow-hidden group hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate('/ciclo-estudos')}>
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-15 transition-opacity">
                                            <Sparkles size={80} />
                                        </div>
                                        <div className="flex items-start gap-4 relative z-10">
                                            <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                                                <Sparkles size={20} className="text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-foreground mb-1">Ainda há tópico novo no ciclo</p>
                                                <p className="text-xs text-content-muted mb-3 leading-relaxed">
                                                    {stats.totalTopics - stats.startedTopicsCount} {stats.totalTopics - stats.startedTopicsCount === 1 ? 'tópico ainda não foi iniciado' : 'tópicos ainda não foram iniciados'}.
                                                </p>
                                                <div className="flex items-center text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                                                    Ir para o Ciclo <ChevronRight size={14} className="ml-0.5" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* FUTURE TAB EMPTY STATE */}
                {activeTab === 'FUTURE' && (
                    <>
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50 dark:ring-blue-900/10">
                            <CalendarOff size={32} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Sem revisões futuras</h3>
                        <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                            {stats.startedTopicsCount === 0
                                ? "Você ainda não tem tópicos em estudo ativo. Inicie um tópico no Ciclo de Estudos para que suas futuras revisões comecem a ser agendadas."
                                : "Não há revisões agendadas para os próximos dias."}
                        </p>

                        {(stats.totalTopics - stats.startedTopicsCount > 0) && (
                            <div className="max-w-sm w-full rounded-2xl border border-primary/15 bg-primary/8 p-5 relative overflow-hidden group hover:border-primary/30 transition-all cursor-pointer" onClick={() => navigate('/ciclo-estudos')}>
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-15 transition-opacity">
                                    <Sparkles size={80} />
                                </div>
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                                        <BookOpen size={20} className="text-primary" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-foreground mb-1">Avance pelo ciclo</p>
                                        <p className="text-xs text-content-muted mb-3 leading-relaxed">
                                            Existem {stats.totalTopics - stats.startedTopicsCount} {stats.totalTopics - stats.startedTopicsCount === 1 ? 'tópico aguardando primeiro contato' : 'tópicos aguardando primeiro contato'}.
                                        </p>
                                        <div className="flex items-center text-xs font-bold text-primary group-hover:translate-x-1 transition-transform">
                                            Ir para o Ciclo <ChevronRight size={14} className="ml-0.5" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* COMPLETED TAB EMPTY STATE */}
                {activeTab === 'COMPLETED' && (
                    <>
                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground mb-2">Construindo sua jornada</h3>
                        <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                            {stats.startedTopicsCount === 0
                                ? "Inicie os estudos no Ciclo de Estudos. Suas matérias concluídas aparecerão aqui no futuro."
                                : <>Você tem <span className="font-bold text-foreground">{stats.startedTopicsCount} tópicos</span> em fase de estudos. <br /> Continue revisando com consistência para vê-los aqui em breve.</>}
                        </p>
                    </>
                )}

                {/* ALL TAB EMPTY STATE */}
                {activeTab === 'ALL' && (
                    <>
                        {stats.totalTopics === 0 ? (
                            <>
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                                    <ClipboardList size={30} />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-3">Central de Revisões</h3>
                                <p className="text-content-muted max-w-md mx-auto mb-6 leading-relaxed">
                                    {stats.totalSubjects === 0 ? (
                                        "Cadastre ou importe um edital. Depois, inicie o primeiro tópico no Ciclo de Estudos."
                                    ) : (
                                        "Cadastre tópicos nas matérias e inicie o estudo pelo Ciclo para criar sua fila de revisões."
                                    )}
                                </p>

                                <div className="flex flex-wrap justify-center gap-3 max-w-lg mb-8">
                                    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-orange-700 dark:text-orange-300">
                                        Atrasadas
                                    </div>
                                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
                                        Hoje
                                    </div>
                                    <div className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-cyan-700 dark:text-cyan-300">
                                        Futuras
                                    </div>
                                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-green-700 dark:text-green-300">
                                        Dominadas
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/meus-editais')}
                                    className="app-button-primary px-6 py-3 text-sm font-bold transition-colors"
                                >
                                    {stats.totalSubjects === 0 ? 'Ir para Meus Editais' : 'Gerenciar tópicos'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-secondary text-content-muted">
                                    <FilterX size={30} />
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-2">Nenhum tópico corresponde aos filtros</h3>
                                <p className="text-content-muted max-w-md mx-auto mb-6 leading-relaxed">
                                    Tente ajustar a pesquisa ou os filtros de ciclo para visualizar seus tópicos.
                                </p>
                                <button
                                    onClick={() => { setSearchTerm(''); setReviewStageFilter('all'); }}
                                    className="app-button-secondary px-5 py-2 text-sm font-bold transition-colors"
                                >
                                    Limpar Filtros
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Enforce Order: Overdue -> Today -> Future -> Unstarted -> Completed -> Consolidado */}
            {['FOCUS_MERGED', RevisionStatus.OVERDUE, RevisionStatus.TODAY, RevisionStatus.FUTURE, RevisionStatus.UNSTARTED, RevisionStatus.COMPLETED, RevisionStatus.CONSOLIDATED, ...Object.keys(groupedItems).filter(k =>
                ![RevisionStatus.OVERDUE, RevisionStatus.TODAY, RevisionStatus.FUTURE, RevisionStatus.UNSTARTED, RevisionStatus.COMPLETED, RevisionStatus.CONSOLIDATED, 'FOCUS_MERGED'].includes(k)
            )].map((key) => {
                const groupItems = groupedItems[key];
                if (!groupItems || groupItems.length === 0) return null;

                const style = getGroupStyle(key);
                const isCollapsed = collapsedGroups[key];
                const isGroupExpanded = !isCollapsed;

                /* Handle Subject View Title Logic if needed, otherwise use style.title */
                const groupTitle = activeTab === 'SUBJECTS' ? key : style.title;

                return (
                    <div key={key} className="glass-card shadow-sm overflow-hidden transition-all duration-300">
                        {/* Header */}
                        <button
                            onClick={() => {
                                setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
                            }}
                            className="w-full flex items-center justify-between px-8 py-5 bg-card/30 hover:bg-accent/30 transition-colors border-b border-border"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'SUBJECTS' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                                    <ChevronRight size={18} className={`transition-transform duration-300 ${isGroupExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                <div className={`text-base font-bold ${activeTab === 'SUBJECTS' ? 'text-foreground' : style.text}`}>
                                    {groupTitle}
                                </div>
                                <span className="px-2 py-0.5 bg-secondary text-content-muted text-[10px] font-black rounded-full">
                                    {groupItems.length} {groupItems.length === 1 ? 'item' : 'itens'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="text-xs text-muted-foreground/60 font-medium italic hidden sm:block">Clique para alternar visão</p>
                            </div>
                        </button>

                        {/* Content */}
                        {isGroupExpanded && (
                            <div className="overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-2">
                                {/* Desktop Header */}
                                <div className="hidden lg:grid lg:grid-cols-[1.5fr,120px,120px,140px] gap-4 px-6 py-4 bg-secondary/30 border-b border-border">
                                    <div className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pl-2">Tópico & Disciplina</div>
                                    <div className="text-[11px] font-black text-muted-foreground uppercase tracking-widest text-center">Dificuldade</div>
                                    <div className="text-[11px] font-black text-muted-foreground uppercase tracking-widest text-center">Progresso</div>
                                    <div className="text-[11px] font-black text-muted-foreground uppercase tracking-widest text-center">Ações</div>
                                </div>

                                {/* List Items Grid */}
                                <div className="divide-y divide-border">
                                    {groupItems.map(item => {
                                        const isActive = activeTimer?.topicId === item.id;
                                        const isHighlighted = highlightedTopicId === item.id;
                                        const trendLabel = trendByTopic.get(item.id);
                                        return (
                                            <div
                                                id={`topic-${item.id}`}
                                                key={item.id}
                                                className={getReviewTopicRowClassName({ isActive, isHighlighted })}
                                            >
                                                {/* Mobile: Stacked / Desktop: Grid */}
                                                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,120px,120px,140px] gap-4 p-4 md:px-6 md:py-5 items-center">

                                                    {/* 1. Tópico */}
                                                    <div className="pl-2 min-w-0 w-full">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-1.5 h-10 rounded-full shrink-0 transition-all ${isActive ? 'bg-primary shadow-[0_0_10px_rgba(0,191,255,0.5)] scale-y-110' :
                                                                item.status === 'OVERDUE' ? 'bg-rose-500' :
                                                                item.status === 'TODAY' ? 'bg-orange-500' :
                                                                    item.status === 'FUTURE' ? 'bg-blue-500' :
                                                                        item.status === 'UNSTARTED' ? 'bg-blue-500' :
                                                                            item.status === 'COMPLETED' || item.status === 'CONSOLIDATED' ? 'bg-emerald-500' :
                                                                                'bg-success'
                                                                }`} />
                                                            <div className="min-w-0 flex-1">
                                                                <div className={`text-sm font-bold break-words leading-snug ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                                    <span className="align-middle mr-1.5">{item.topic}</span>
                                                                    {trendLabel && (trendLabel === 'Melhorando' || trendLabel === 'Piorando') && (
                                                                        <span className="inline-flex mr-1.5 align-middle translate-y-[1px]" title={`Tendência de Retenção: ${trendLabel}`}>
                                                                            <TrendIcon type={trendLabel} iconOnly={false} />
                                                                        </span>
                                                                    )}
                                                                    {isActive && <span className="inline-block text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full animate-pulse align-middle">Em andamento</span>}
                                                                </div>
                                                                {item.subject && <p className="text-xs text-content-muted mt-1 font-bold uppercase truncate">{item.subject}</p>}
                                                                {item.showOrigin && item.originSummary && (
                                                                    <p
                                                                        className="mt-1 max-w-full truncate text-[11px] font-semibold text-content-muted/80"
                                                                        title={item.originLabels?.join(' + ') || item.originSummary}
                                                                    >
                                                                        Origem: {item.originSummary}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 2. Dificuldade (Mobile: row) */}
                                                    <div className="flex items-center justify-between lg:justify-center pl-4 lg:pl-0">
                                                        <span className="lg:hidden text-xs text-muted-foreground font-medium">Dificuldade:</span>
                                                        <DifficultyBarsCompact level={item.difficulty || 0} size="sm" />
                                                    </div>

                                                    {/* 3. Progresso (Mobile: row) */}
                                                    <div className="flex items-center justify-between lg:justify-center pl-4 lg:pl-0">
                                                        <span className="lg:hidden text-xs text-muted-foreground font-medium">Status:</span>
                                                        <div className="flex flex-col gap-1.5 w-24">
                                                            <div className="flex items-center gap-2">
                                                                {(item.status === 'OVERDUE') && (
                                                                    <span className="text-rose-600 dark:text-rose-400 text-[11px] font-bold">Atrasada</span>
                                                                )}
                                                                <span
                                                                    className="text-foreground text-[10px] font-black border border-primary/20 bg-primary/10 px-2 py-0.5 rounded w-full text-center tracking-wide"
                                                                    title={`${item.reviewCount ?? 0} de ${item.maxReviews ?? 0} revisões programadas concluídas`}
                                                                >
                                                                    {item.reviewCount ?? 0}/{item.maxReviews ?? 0} revisões
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {item.learningStatus ? (
                                                                    <span
                                                                        className="text-content-muted text-[10px] font-semibold border border-border px-2 py-0.5 rounded cursor-help w-full text-center tracking-wide shadow-sm bg-secondary"
                                                                        title={`Representa a retenção estimada com base na estabilidade da memória (Curva do Esquecimento + revisões): ${item.memoryStability?.toFixed(1) || 0}`}
                                                                    >
                                                                        {item.learningStatus}
                                                                    </span>
                                                                ) : (
                                                                    <span
                                                                        className="text-content-muted text-[10px] font-semibold border border-border px-2 py-0.5 rounded cursor-help w-full text-center tracking-wide"
                                                                    >
                                                                        Novo
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Progresso visual omitido, evitando barras de progresso fixo X de Y */}
                                                        </div>
                                                    </div>

                                                    {/* 4. Ações */}
                                                    <div className="flex justify-end lg:justify-center pr-2 lg:pr-0 pt-2 lg:pt-0 border-t lg:border-0 border-border mt-2 lg:mt-0">
                                                        <div className="flex items-center gap-2 w-full justify-between lg:justify-center">
                                                            {/* Mobile Label */}
                                                            <span className="lg:hidden text-xs text-muted-foreground font-medium">Ações:</span>

                                                            <div className="flex gap-2">
                                                                {/* Botão IA */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleAiAssist(item); }}
                                                                    disabled={!!loadingActions[item.id]}
                                                                    className="h-10 w-10 flex items-center justify-center text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title="Assistente de revisão em preparação"
                                                                >
                                                                    {loadingActions[item.id] === 'ai' ? (
                                                                        <Loader2 size={16} className="animate-spin" />
                                                                    ) : (
                                                                        <Sparkles size={16} />
                                                                    )}
                                                                </button>

                                                                {/* Botão Marcar Revisão (PLAY/STOP/RESUME) */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleMarkCompleted(item.id); }}
                                                                    disabled={!!loadingActions[item.id]}
                                                                    className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isActive
                                                                        ? activeTimer?.status === 'PAUSED'
                                                                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20' // PAUSED: Amber
                                                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20' // RUNNING: Indigo
                                                                        : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' // IDLE: Emerald
                                                                        }`}
                                                                    title={isActive
                                                                        ? activeTimer?.status === 'PAUSED' ? "Retomar Revisão" : "Parar e Avaliar"
                                                                        : "Iniciar Cronômetro"}
                                                                >
                                                                    {loadingActions[item.id] === 'review' ? (
                                                                        <Loader2 size={16} className="animate-spin" />
                                                                    ) : isActive ? (
                                                                        activeTimer?.status === 'PAUSED' ? (
                                                                            <Play size={16} className="fill-current" /> // PAUSED: Play
                                                                        ) : (
                                                                            <Square size={16} className="fill-current" /> // RUNNING: Square
                                                                        )
                                                                    ) : (
                                                                        <Play size={16} className="fill-current" /> // IDLE: Play
                                                                    )}
                                                                </button>

                                                                {/* Botão Ver Nota */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openNotesModal(item.id, item.topic, item.subject || '');
                                                                    }}
                                                                    disabled={!!loadingActions[item.id]}
                                                                    className="h-10 w-10 flex items-center justify-center text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title="Ver Nota"
                                                                >
                                                                    {loadingActions[item.id] === 'notes' ? (
                                                                        <Loader2 size={16} className="animate-spin" />
                                                                    ) : (
                                                                        <FileText size={16} />
                                                                    )}
                                                                </button>


                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )
                        }
                    </div>
                );
            })}
        </div>
    );
};
