
import React, { useState, useMemo } from 'react';
import {
    Search,
    BookOpen,
    ChevronDown,
    LayoutList,
    LayoutGrid,
    FileText,
    PlayCircle,
    Settings,
    Star,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Maximize2,
    Minimize2,
    Layers
} from 'lucide-react';
import { StudyItem, FilterState } from './types';
import { MOCK_DATA } from './constants';

const ReferenceView: React.FC = () => {
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        status: 'Hoje & Atrasadas',
        groupBySubject: false,
        isAllCollapsed: false,
        revision: 'Todas',
        viewMode: 'Lista'
    });

    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

    // Lógica de filtragem baseada na aba e busca
    const filteredData = useMemo(() => {
        return MOCK_DATA.filter(item => {
            const matchesSearch = item.topic.toLowerCase().includes(filters.search.toLowerCase()) ||
                item.subject.toLowerCase().includes(filters.search.toLowerCase());
            const matchesStatus = item.status === filters.status;
            const matchesRevision = filters.revision === 'Todas' || item.revisionStep === filters.revision;

            return matchesSearch && matchesStatus && matchesRevision;
        });
    }, [filters]);

    // Lógica de agrupamento por matéria
    const groupedData = useMemo(() => {
        if (!filters.groupBySubject) return { "Resultados": filteredData };

        return filteredData.reduce((acc, item) => {
            if (!acc[item.subject]) acc[item.subject] = [];
            acc[item.subject].push(item);
            return acc;
        }, {} as Record<string, StudyItem[]>);
    }, [filteredData, filters.groupBySubject]);

    const stats = useMemo(() => {
        return {
            atrasadas: MOCK_DATA.filter(i => i.status === 'Hoje & Atrasadas').length,
            futuras: MOCK_DATA.filter(i => i.status === 'Futuras').length,
            concluidas: MOCK_DATA.filter(i => i.status === 'Concluídas').length,
        };
    }, []);

    const toggleAll = () => {
        const newState = !filters.isAllCollapsed;
        setFilters(prev => ({ ...prev, isAllCollapsed: newState }));
        if (!newState && filters.groupBySubject) {
            setExpandedSubjects(new Set(Object.keys(groupedData)));
        } else {
            setExpandedSubjects(new Set());
        }
    };

    const toggleSubject = (subject: string) => {
        const newExpanded = new Set(expandedSubjects);
        if (newExpanded.has(subject)) {
            newExpanded.delete(subject);
        } else {
            newExpanded.add(subject);
        }
        setExpandedSubjects(newExpanded);
    };

    const DifficultyStars: React.FC<{ rating: number }> = ({ rating }) => {
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={14}
                        className={`${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} ${rating === 5 && star <= rating ? 'fill-rose-500 text-rose-500' : ''}`}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 line-height-none">Modelo de Referência</h1>
                        <p className="text-sm text-slate-500">Visualização pura do design original para comparação.</p>
                    </div>
                </div>

                {/* Tabs Principais */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button
                        onClick={() => setFilters(prev => ({ ...prev, status: 'Hoje & Atrasadas' }))}
                        className={`group relative overflow-hidden p-5 rounded-2xl border transition-all text-left ${filters.status === 'Hoje & Atrasadas' ? 'bg-white border-rose-200 shadow-lg shadow-rose-50' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="relative z-10 space-y-1">
                            <div className="flex items-center justify-between">
                                <AlertCircle size={20} className={filters.status === 'Hoje & Atrasadas' ? 'text-rose-600' : 'text-slate-400'} />
                                <span className={`text-2xl font-black ${filters.status === 'Hoje & Atrasadas' ? 'text-rose-600' : 'text-slate-400'}`}>{stats.atrasadas}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">Hoje & Atrasadas</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setFilters(prev => ({ ...prev, status: 'Futuras' }))}
                        className={`group relative overflow-hidden p-5 rounded-2xl border transition-all text-left ${filters.status === 'Futuras' ? 'bg-white border-indigo-200 shadow-lg shadow-indigo-50' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="relative z-10 space-y-1">
                            <div className="flex items-center justify-between">
                                <Clock size={20} className={filters.status === 'Futuras' ? 'text-indigo-600' : 'text-slate-400'} />
                                <span className={`text-2xl font-black ${filters.status === 'Futuras' ? 'text-indigo-600' : 'text-slate-400'}`}>{stats.futuras}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">Futuras</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setFilters(prev => ({ ...prev, status: 'Concluídas' }))}
                        className={`group relative overflow-hidden p-5 rounded-2xl border transition-all text-left ${filters.status === 'Concluídas' ? 'bg-white border-emerald-200 shadow-lg shadow-emerald-50' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                    >
                        <div className="relative z-10 space-y-1">
                            <div className="flex items-center justify-between">
                                <CheckCircle2 size={20} className={filters.status === 'Concluídas' ? 'text-emerald-600' : 'text-slate-400'} />
                                <span className={`text-2xl font-black ${filters.status === 'Concluídas' ? 'text-emerald-600' : 'text-slate-400'}`}>{stats.concluidas}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-800">Concluídas</p>
                        </div>
                    </button>
                </section>

                {/* Action Toolbar */}
                <section className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <button
                        onClick={toggleAll}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-all text-sm font-semibold group"
                    >
                        {filters.isAllCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                        <span>{filters.isAllCollapsed ? 'Expandir Tudo' : 'Recolher Tudo'}</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200" />

                    <button
                        onClick={() => setFilters(prev => ({ ...prev, groupBySubject: !prev.groupBySubject }))}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-xl transition-all text-sm font-semibold ${filters.groupBySubject ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Layers size={16} />
                        <span>Agrupar por Matéria</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200" />

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ciclo:</span>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {[1, 2, 3, 4].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setFilters(prev => ({ ...prev, revision: prev.revision === num ? 'Todas' : num }))}
                                    className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition-all ${filters.revision === num ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                    R{num}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Data List */}
                <section className="space-y-6">
                    {Object.entries(groupedData).map(([groupTitle, items]) => {
                        const isGroupExpanded = filters.groupBySubject ? expandedSubjects.has(groupTitle) : !filters.isAllCollapsed;

                        return (
                            <div key={groupTitle} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">
                                {filters.groupBySubject && (
                                    <button
                                        onClick={() => toggleSubject(groupTitle)}
                                        className="w-full flex items-center justify-between px-8 py-5 bg-slate-50/50 hover:bg-slate-100/50 transition-colors border-b border-slate-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <ChevronRight size={18} className={`transition-transform duration-300 ${isGroupExpanded ? 'rotate-90' : ''}`} />
                                            </div>
                                            <h2 className="text-base font-bold text-slate-800">{groupTitle}</h2>
                                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-black rounded-full">
                                                {items.length} {items.length === 1 ? 'item' : 'itens'}
                                            </span>
                                        </div>
                                    </button>
                                )}

                                {isGroupExpanded && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            {!filters.groupBySubject && (
                                                <thead>
                                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Tópico & Disciplina</th>
                                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Dificuldade</th>
                                                        <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Progresso</th>
                                                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                                    </tr>
                                                </thead>
                                            )}
                                            <tbody className="divide-y divide-slate-100">
                                                {items.map((item) => (
                                                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-1.5 h-10 rounded-full ${item.status === 'Hoje & Atrasadas' ? 'bg-rose-500' : item.status === 'Futuras' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                                                <div className="max-w-md">
                                                                    <p className="text-sm font-bold text-slate-800">{item.topic}</p>
                                                                    {!filters.groupBySubject && <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">{item.subject}</p>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <DifficultyStars rating={item.difficulty} />
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${item.status === 'Hoje & Atrasadas' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                                        R{item.revisionStep}
                                                                    </span>
                                                                </div>
                                                                <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full ${item.status === 'Hoje & Atrasadas' ? 'bg-rose-400' : 'bg-indigo-400'}`}
                                                                        style={{ width: `${(item.revisionStep / 4) * 100}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all font-bold text-[11px] group-hover:shadow-md">
                                                                    <PlayCircle size={14} />
                                                                    Iniciar
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            </div>
        </div>
    );
};

export default ReferenceView;
