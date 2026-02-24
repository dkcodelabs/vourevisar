import React from 'react';
import { Minimize2, Maximize2, HelpCircle, Search, X, Layers } from 'lucide-react';

interface RevisoesToolbarProps {
    stats: any;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    activeTab: string;
    setActiveTab: (tab: any) => void;
    reviewStageFilter: string;
    setReviewStageFilter: (filter: string) => void;
    areAllExpanded: boolean;
    onToggleAll: () => void;
    onToggleSubjectView: () => void; // Passed from parent
    onOpenInfoModal: () => void;
    className?: string;
    isRecoveryMode?: boolean;
}

export const RevisoesToolbar: React.FC<RevisoesToolbarProps> = ({
    stats,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    reviewStageFilter,
    setReviewStageFilter,
    areAllExpanded,
    onToggleAll,
    onToggleSubjectView,
    onOpenInfoModal,
    className,
    isRecoveryMode = false
}) => {
    return (
        <div className={`w-full ${className || ''}`}>
            <section className="w-full flex flex-wrap items-center gap-2 md:gap-4 glass-card px-4 py-2 rounded-2xl shadow-md transition-all">
                {/* 1. Botão Recolher/Expandir (SÓ ÍCONE) */}
                <button
                    onClick={onToggleAll}
                    className="flex items-center justify-center w-10 h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group shrink-0"
                    title={areAllExpanded ? 'Recolher Tudo' : 'Expandir Tudo'}
                >
                    {areAllExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>

                {/* 1.5 Botão de Informação */}
                <button
                    onClick={onOpenInfoModal}
                    className="flex items-center justify-center w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all group shrink-0"
                    title="Como funciona o agendamento?"
                >
                    <HelpCircle size={18} />
                </button>

                {/* 2. Campo de Pesquisa Integrado */}
                <div className="order-last md:order-none w-full md:w-auto md:flex-1 min-w-[200px] relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/[0.05] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 dark:text-slate-200"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                            title="Limpar pesquisa"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* 3. Abas Principais (Simplificadas: Hoje vs Todas) */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 max-w-full min-w-0">
                    {/* Hoje (antiga Focus) */}
                    <button
                        onClick={() => setActiveTab('FOCUS')}
                        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border shadow-sm ${activeTab === 'FOCUS'
                            ? isRecoveryMode
                                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/20'
                                : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400'
                            : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        <span>Hoje</span>
                        <span className={`text-[10px] font-black px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'FOCUS'
                            ? isRecoveryMode
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shadow-sm'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 shadow-sm'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                            {/* If stats.focusCount exists use it, otherwise sum. 
                                We will add focusCount to stats in Revisoes.tsx next. */}
                            {stats.focusCount ?? (stats.today + stats.overdue)}
                        </span>
                    </button>

                    {/* Todas */}
                    <button
                        onClick={() => {
                            setActiveTab('ALL');
                            setReviewStageFilter('all');
                        }}
                        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border shadow-sm ${activeTab === 'ALL'
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        <span>Todas</span>
                        <span className={`text-[10px] font-black px-1.5 h-4 flex items-center justify-center rounded-full min-w-[16px] ${activeTab === 'ALL' ? 'bg-slate-700 text-slate-200 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                            {stats.totalTopics}
                        </span>
                    </button>
                </div>

                <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />

                {/* 4. Botão Agrupar por Matéria */}
                <button
                    onClick={onToggleSubjectView}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all text-xs font-bold whitespace-nowrap ${activeTab === 'SUBJECTS' ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                >
                    <Layers size={16} />
                    <span className="hidden sm:inline">Agrupar por Matéria</span>
                    <span className="sm:hidden">Agrupar</span>
                </button>
            </section>
        </div>
    );
};
