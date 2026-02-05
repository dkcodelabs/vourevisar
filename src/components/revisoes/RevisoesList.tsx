import React from 'react';
import {
    CheckCircle2, Sparkles, BookOpen, Calendar, CalendarOff, ChevronRight,
    Play, Square, FileText, Loader2, Star
} from 'lucide-react';
import { RevisionItem, RevisionStatus } from '@/types/revision';
import { useNavigate } from 'react-router-dom';

const DifficultyStars = ({ rating }: { rating: number }) => {
    return (
        <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
            <span className="text-sm">{rating}</span>
            <Star
                size={14}
                className="fill-amber-400 text-amber-400"
            />
        </div>
    );
};

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
        startedTopicsCount: number;
    };
    activeTimer: any;
    highlightedTopicId: string | null;
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
                        <div className="flex items-center gap-1.5">
                            <span>Hoje</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-[10px] font-bold min-w-[16px] flex items-center justify-center">
                                {stats.today}
                            </span>
                            <span className="mx-0.5">&</span>
                            <span>Atrasadas</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[10px] font-bold min-w-[16px] flex items-center justify-center">
                                {stats.overdue}
                            </span>
                        </div>
                    ),
                    color: 'border-red-400',
                    text: 'text-red-600 dark:text-red-400'
                };
            case RevisionStatus.OVERDUE: return { title: 'Atrasadas', color: 'border-red-400', text: 'text-red-500' };
            case RevisionStatus.TODAY: return { title: 'Hoje', color: 'border-orange-500', text: 'text-orange-600' };
            case RevisionStatus.FUTURE: return { title: 'Futuras', color: 'border-blue-500', text: 'text-blue-600' };
            case RevisionStatus.COMPLETED: return { title: 'Concluídas', color: 'border-green-500', text: 'text-green-600' };
            case RevisionStatus.UNSTARTED: return { title: 'Não Iniciados', color: 'border-slate-300', text: 'text-slate-500' };
            default: return { title: groupKey, color: 'border-purple-500', text: 'text-purple-600' };
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
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <span className="text-4xl">📚</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Comece sua jornada de revisões!</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                                    Adicione suas matérias e tópicos — o sistema agenda automaticamente suas revisões usando a técnica de repetição espaçada.
                                </p>
                                <button
                                    onClick={() => navigate('/materias')}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                                >
                                    Adicionar Matérias
                                </button>
                            </>
                        ) : (
                            /* Caso 2: Usuário zerou as revisões de hoje e atrasadas */
                            <>
                                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                                    <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Parabéns! Tudo em dia!</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                                    Você zerou suas revisões de hoje e atrasadas. <br /> Seu foco e disciplina estão rendendo frutos.
                                </p>

                                {/* Frase Motivacional - Responsiva */}
                                <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/30 px-5 py-3 rounded-2xl mb-8 shadow-sm">
                                    <span className="text-xl flex-shrink-0">✅</span>
                                    <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-medium whitespace-normal md:whitespace-nowrap">
                                        Cada revisão concluída é uma etapa mais perto da sua conquista.
                                    </p>
                                </div>

                                {(stats.totalTopics - stats.startedTopicsCount > 0) && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 max-w-sm w-full relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer" onClick={() => navigate('/ciclo-estudos')}>
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Sparkles size={80} />
                                        </div>
                                        <div className="flex items-start gap-4 relative z-10">
                                            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-800/50 rounded-xl shrink-0">
                                                <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400 fill-indigo-200 dark:fill-indigo-900" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1">Mantenha o progresso!</p>
                                                <p className="text-xs text-indigo-700 dark:text-indigo-400/90 mb-3 leading-relaxed">
                                                    Você tem <span className="font-bold bg-indigo-100 dark:bg-indigo-800 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-200">{stats.totalTopics - stats.startedTopicsCount} tópicos</span> ainda não iniciados. Que tal começar um agora?
                                                </p>
                                                <div className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
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
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Sem revisões futuras</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                            Não há revisões agendadas para os próximos dias.
                        </p>

                        {(stats.totalTopics - stats.startedTopicsCount > 0) && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-5 max-w-sm w-full relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer" onClick={() => navigate('/ciclo-estudos')}>
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Sparkles size={80} />
                                </div>
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-800/50 rounded-xl shrink-0">
                                        <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-1">Explore novos conteúdos</p>
                                        <p className="text-xs text-indigo-700 dark:text-indigo-400/90 mb-3 leading-relaxed">
                                            Existem <span className="font-bold bg-indigo-100 dark:bg-indigo-800 px-1.5 py-0.5 rounded text-indigo-800 dark:text-indigo-200">{stats.totalTopics - stats.startedTopicsCount} tópicos</span> aguardando início. Ótima oportunidade para avançar.
                                        </p>
                                        <div className="flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                                            Ver Matérias <ChevronRight size={14} className="ml-0.5" />
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
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 size={32} className="text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Construindo sua jornada</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                            Você tem <span className="font-bold text-slate-700 dark:text-slate-300">{stats.startedTopicsCount} tópicos</span> em fase de estudos. <br /> Continue revisando com consistência para vê-los aqui em breve.
                        </p>
                    </>
                )}

                {/* ALL TAB EMPTY STATE */}
                {activeTab === 'ALL' && (
                    <>
                        {stats.totalTopics === 0 ? (
                            <>
                                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-indigo-100 dark:from-slate-800 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <span className="text-4xl">📋</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Central de Revisões</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                                    Aqui você terá a visão completa de todos os seus tópicos organizados por status de revisão.
                                </p>

                                {/* Features */}
                                <div className="flex flex-wrap justify-center gap-3 max-w-lg mb-8">
                                    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-orange-700 dark:text-orange-300">
                                        <span>⏰</span> Atrasados
                                    </div>
                                    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
                                        <span>📅</span> Para Hoje
                                    </div>
                                    <div className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-cyan-700 dark:text-cyan-300">
                                        <span>🔮</span> Futuros
                                    </div>
                                    <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full text-xs font-medium text-green-700 dark:text-green-300">
                                        <span>✅</span> Concluídos
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/materias')}
                                    className="px-6 py-3 bg-gradient-to-r from-slate-700 to-indigo-600 hover:from-slate-800 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                                >
                                    Adicionar Matérias
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                                    <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Nenhum tópico corresponde aos filtros</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
                                    Tente ajustar a pesquisa ou os filtros de ciclo para visualizar seus tópicos.
                                </p>
                                <button
                                    onClick={() => { setSearchTerm(''); setReviewStageFilter('all'); }}
                                    className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
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
            {Object.entries(groupedItems).map(([key, groupItems]) => {
                if (groupItems.length === 0) return null;

                const style = getGroupStyle(key);
                const isCollapsed = collapsedGroups[key];
                const isGroupExpanded = !isCollapsed;

                /* Handle Subject View Title Logic if needed, otherwise use style.title */
                const groupTitle = activeTab === 'SUBJECTS' ? key : style.title;

                return (
                    <div key={key} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
                        {/* Header */}
                        <button
                            onClick={() => {
                                setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
                            }}
                            className="w-full flex items-center justify-between px-8 py-5 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${activeTab === 'SUBJECTS' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                    <ChevronRight size={18} className={`transition-transform duration-300 ${isGroupExpanded ? 'rotate-90' : ''}`} />
                                </div>
                                <div className={`text-base font-bold ${activeTab === 'SUBJECTS' ? 'text-slate-800 dark:text-slate-200' : style.text}`}>
                                    {groupTitle}
                                </div>
                                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black rounded-full">
                                    {groupItems.length} {groupItems.length === 1 ? 'item' : 'itens'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium italic hidden sm:block">Clique para alternar visão</p>
                            </div>
                        </button>

                        {/* Content */}
                        {isGroupExpanded && (
                            <div className="overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-2">
                                {/* Desktop Header */}
                                <div className="hidden lg:grid lg:grid-cols-[1.5fr,120px,120px,140px] gap-4 px-6 py-4 bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                                    <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2">Tópico & Disciplina</div>
                                    <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Dificuldade</div>
                                    <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Progresso</div>
                                    <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Ações</div>
                                </div>

                                {/* List Items Grid */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {groupItems.map(item => {
                                        const isActive = activeTimer?.topicId === item.id;
                                        return (
                                            <div
                                                id={`topic-${item.id}`}
                                                key={item.id}
                                                className={`group transition-all duration-300 ${isActive ? 'bg-indigo-50/50 dark:bg-indigo-900/10' :
                                                    highlightedTopicId === item.id ? 'highlight-blink z-10' :
                                                        'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'} min-w-0`}
                                            >
                                                {/* Mobile: Stacked / Desktop: Grid */}
                                                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr,120px,120px,140px] gap-4 p-4 md:px-6 md:py-5 items-center">

                                                    {/* 1. Tópico */}
                                                    <div className="pl-2 min-w-0 w-full">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-1.5 h-10 rounded-full shrink-0 transition-all ${isActive ? 'bg-indigo-500 dark:bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)] dark:shadow-[0_0_15px_rgba(129,140,248,0.6)] scale-y-110' :
                                                                item.status === 'TODAY' || item.status === 'OVERDUE' ? 'bg-rose-500 dark:bg-rose-500' :
                                                                    item.status === 'FUTURE' ? 'bg-indigo-500 dark:bg-indigo-500' :
                                                                        'bg-emerald-500 dark:bg-emerald-500'
                                                                }`} />
                                                            <div className="min-w-0 flex-1">
                                                                <p className={`text-sm font-bold break-words line-clamp-2 ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                    {item.topic}
                                                                    {isActive && <span className="ml-2 inline-block text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-300 dark:border dark:border-indigo-500/40 px-1.5 py-0.5 rounded-full animate-pulse">Em andamento</span>}
                                                                </p>
                                                                {item.subject && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-bold uppercase truncate">{item.subject}</p>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 2. Dificuldade (Mobile: row) */}
                                                    <div className="flex items-center justify-between lg:justify-center pl-4 lg:pl-0">
                                                        <span className="lg:hidden text-xs text-slate-400 font-medium">Dificuldade:</span>
                                                        <DifficultyStars rating={item.difficulty || 0} />
                                                    </div>

                                                    {/* 3. Progresso (Mobile: row) */}
                                                    <div className="flex items-center justify-between lg:justify-center pl-4 lg:pl-0">
                                                        <span className="lg:hidden text-xs text-slate-400 font-medium">Ciclo:</span>
                                                        <div className="flex flex-col gap-1.5 w-24">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-1 rounded-md text-xs font-black uppercase tracking-wider ${item.status === 'TODAY' || item.status === 'OVERDUE'
                                                                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                                                    : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                                                    }`}>
                                                                    R{item.reviewCount || 1}
                                                                </span>
                                                                {(item.status === 'OVERDUE') && (
                                                                    <span className="text-rose-600 dark:text-rose-400 text-[11px] font-bold">Atrasada</span>
                                                                )}
                                                            </div>
                                                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${item.status === 'TODAY' || item.status === 'OVERDUE' ? 'bg-rose-400' : 'bg-indigo-400'}`}
                                                                    style={{ width: `${((item.reviewCount || 1) / 5) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 4. Ações */}
                                                    <div className="flex justify-end lg:justify-center pr-2 lg:pr-0 pt-2 lg:pt-0 border-t lg:border-0 border-slate-100 dark:border-slate-800 mt-2 lg:mt-0">
                                                        <div className="flex items-center gap-2 w-full justify-between lg:justify-center">
                                                            {/* Mobile Label */}
                                                            <span className="lg:hidden text-xs text-slate-400 font-medium">Ações:</span>

                                                            <div className="flex gap-2">
                                                                {/* Botão IA */}
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleAiAssist(item); }}
                                                                    disabled={!!loadingActions[item.id]}
                                                                    className="h-10 w-10 flex items-center justify-center text-purple-500 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    title="Assistente de Revisão"
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
                                                                            ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-400' // PAUSED: Amber
                                                                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-200' // RUNNING: Indigo
                                                                        : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' // IDLE: Emerald
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
                                                                    className="h-10 w-10 flex items-center justify-center text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
