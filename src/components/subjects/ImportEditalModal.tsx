import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Sparkles, Loader2, Undo2, Edit3, ChevronUp, ChevronDown, Trash2, Save, Plus, X, MessageSquare, CalendarDays, Database, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Subject } from '@/types';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AiTopic {
    name: string;
    selected: boolean;
}

interface AiSubject {
    id: string;
    title: string;
    selected: boolean;
    expanded: boolean;
    topics: AiTopic[];
}

interface ImportEditalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (subjects: Subject[], editalName?: string, isImported?: boolean, sourceId?: string) => Promise<void> | void;
    subjects: Subject[];
    initialTab?: 'ready' | 'ia' | 'manual';
    manualModeChildren?: React.ReactNode;
}

export const ImportEditalModal = ({ isOpen, onClose, onImport, subjects, initialTab = 'ready', manualModeChildren }: ImportEditalModalProps) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'ready' | 'ia' | 'manual'>(initialTab);
    const [showSuggestSlide, setShowSuggestSlide] = useState(false);
    const [suggestConcurso, setSuggestConcurso] = useState('');
    const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
    const [suggestionSent, setSuggestionSent] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [sourceName, setSourceName] = useState('');

    // Manual States
    const [manualTitle, setManualTitle] = useState('');
    const [manualSubjects, setManualSubjects] = useState<string[]>([]);
    const [currentManualSubject, setCurrentManualSubject] = useState('');
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [examDate, setExamDate] = useState('');

    // IA States
    const [inputText, setInputText] = useState('');
    const [iaStage, setIaStage] = useState<'input' | 'processing' | 'review'>('input');
    const [processingMsg, setProcessingMsg] = useState('Lendo edital...');
    const [aiResult, setAiResult] = useState<AiSubject[]>([]);

    // State for dynamic editais from database
    const [editais, setEditais] = useState<any[]>([]);
    const [loadingEditais, setLoadingEditais] = useState(true);
    const [isLoadingReady, setIsLoadingReady] = useState(false); // New state for ready tab import

    useEffect(() => {
        const fetchPublicEditais = async () => {
            try {
                const { data, error } = await (supabase as any)
                    .from('public_editais')
                    .select('*')
                    .eq('is_public', true)
                    .order('created_at', { ascending: false });
                
                if (!error && data) {
                    setEditais(data);
                }
            } catch (err) {
                console.error('Error fetching global editais:', err);
            } finally {
                setLoadingEditais(false);
            }
        };

        if (isOpen) {
            fetchPublicEditais();
        }
    }, [isOpen]);

    const filteredEditais = editais.filter(e => {
        const matchesSearch = `${e.organ} ${e.position}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || e.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    useEffect(() => {
        setActiveTab(initialTab);
        if (!isOpen) {
            setIaStage('input');
            setInputText('');
            setAiResult([]);
            setManualTitle('');
            setManualSubjects([]);
            setCurrentManualSubject('');
            setIsSavingManual(false);
            setExamDate('');
            setShowSuggestSlide(false);
            setSuggestionSent(false);
            setSourceName(''); // Reset sourceName on close
        }
    }, [initialTab, isOpen]);

    const handleOpenSuggest = () => {
        setSuggestConcurso(searchQuery.trim());
        setSuggestionSent(false);
        setShowSuggestSlide(true);
    };

    const handleSendSuggestion = async () => {
        if (!suggestConcurso.trim()) return;
        setIsSendingSuggestion(true);
        try {
            await (supabase as any)
                .from('edital_suggestions')
                .insert({
                    user_id: user?.id,
                    concurso: suggestConcurso.trim().toUpperCase(),
                    status: 'pending'
                });
            setSuggestionSent(true);
        } catch (err) {
            console.error('Erro ao enviar sugestão:', err);
        } finally {
            setIsSendingSuggestion(false);
        }
    };

    const handleIaImport = () => {
        setIaStage('processing');
        setProcessingMsg('Analisando edital com IA...');

        setTimeout(() => {
            setProcessingMsg('Estruturando matérias e tópicos...');
            setTimeout(() => {
                setAiResult([
                    {
                        id: 'm1',
                        title: 'Língua Portuguesa',
                        selected: true,
                        expanded: true,
                        topics: [
                            { name: 'Compreensão e interpretação de textos', selected: true },
                            { name: 'Tipologia textual', selected: true },
                            { name: 'Ortografia oficial', selected: true },
                            { name: 'Acentuação gráfica', selected: true }
                        ]
                    },
                    {
                        id: 'm2',
                        title: 'Raciocínio Lógico',
                        selected: true,
                        expanded: false,
                        topics: [
                            { name: 'Estruturas lógicas', selected: true },
                            { name: 'Lógica de argumentação', selected: true },
                            { name: 'Diagramas lógicos', selected: true }
                        ]
                    }
                ]);
                setIaStage('review');
            }, 2000);
        }, 1500);
    };

    const handleSaveAiResult = async () => {
        const newSubjects: Subject[] = [];

        aiResult.filter(r => r.selected).forEach((r, sIdx) => {
            newSubjects.push({
                id: `ia-subj-${Date.now()}-${sIdx}`,
                name: r.title,
                status: 'Nova',
                topics: r.topics.filter((t) => t.selected).map((t, idx) => ({
                    id: `ia-top-${Date.now()}-${idx}`,
                    name: t.name,
                    completed: false,
                    reviewCount: 0,
                    review_count: 0
                }))
            });
        });

        await onImport(newSubjects, sourceName.trim() || 'Importado com IA', true); // isImported = true
        onClose();
        setSourceName('');
    };

    const handleSaveManual = async () => {
        if (!manualTitle.trim()) {
            toastGate.notifyError('Preencha o nome do edital/concurso', 'VAL-01', { severity: 'low' });
            return;
        }

        if (manualSubjects.length === 0) {
            toastGate.notifyError('Adicione pelo menos uma matéria', 'VAL-02', { severity: 'low' });
            return;
        }

        setIsSavingManual(true);
        try {
            const newSubjects: Subject[] = manualSubjects.map((name, idx) => ({
                id: `manual-subj-${Date.now()}-${idx}`,
                name: name.trim().toUpperCase(),
                status: 'Nova',
                topics: []
            }));

            await onImport(newSubjects, manualTitle.trim(), false); // isImported = false
            onClose();
            setManualTitle('');
            setManualSubjects([]);
            setCurrentManualSubject('');
        } catch (error) {
            console.error('Erro ao salvar edital manual:', error);
        } finally {
            setIsSavingManual(false);
        }
    };

    const handleImportReadyEdital = async (edital: any) => {
        setIsLoadingReady(true);
        try {
            // If no subjects, just log it silently or ignore as requested by user
            if (!edital.subjects || !Array.isArray(edital.subjects) || edital.subjects.length === 0) {
                console.log("[ImportEditalModal] Edital sem matérias, mas importação permitida conforme regra de negócio.");
            }

            const subjectsList = Array.isArray(edital.subjects) ? edital.subjects : [];

            const importSubjects: Subject[] = subjectsList.map((s: any, i: number) => {
                return {
                    id: `imp-${edital.id}-${i}-${Date.now()}`,
                    name: s.name,
                    status: 'Nova',
                    topics: (s.topics || []).map((t: any, ti: number) => ({
                        id: `imp-top-${edital.id}-${i}-${ti}-${Date.now()}`,
                        name: typeof t === 'string' ? t : t.name,
                        completed: false,
                        reviewCount: 0,
                        review_count: 0,
                    }))
                };
            });
            await onImport(importSubjects, `${edital.organ} - ${edital.position}`, true, edital.id);
            onClose();
        } catch (error) {
            console.error('Erro ao importar edital pronto:', error);
            // Re-throw or handle error to show in UI
            toastGate.notifyError(error instanceof Error ? error.message : 'Erro ao importar edital selecionado', 'IMP-01');
        } finally {
            setIsLoadingReady(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-5xl bg-zinc-900 border border-black/10 dark:border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Importar Edital</h2>
                        <p className="text-sm text-content-muted font-medium mt-1">Escolha um edital pronto ou use nossa IA</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-900 dark:hover:text-zinc-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar flex-1">
                    <div className="flex gap-2 bg-zinc-900/50 p-1.5 rounded-2xl mb-8 w-fit mx-auto border border-white/5">
                        <button
                            onClick={() => setActiveTab('ready')}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'ready' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <FileText size={14} />
                            Editais Prontos
                        </button>
                        <button
                            onClick={() => setActiveTab('ia')}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'ia' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <Sparkles size={14} />
                            Importar com IA
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'manual' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <Plus size={14} />
                            Adicionar Manual
                        </button>
                    </div>

                    {activeTab === 'ready' ? (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar concurso (ex: PCES, PMES, INSS...)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-14 bg-zinc-950 border border-black/5 dark:border-white/5 rounded-[20px] pl-14 pr-6 text-sm font-medium focus:outline-none focus:border-primary/40 transition-all text-content-main placeholder:text-content-muted/50"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {['Todos', 'Carreiras Policiais', 'Tribunais', 'Bancárias', 'Administrativo', 'Educação'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-4 py-2 rounded-full text-[11px] font-semibold transition-all tracking-wide border ${selectedCategory === cat ? 'bg-zinc-200 text-zinc-900 border-zinc-200' : 'bg-transparent border-white/10 text-content-muted hover:border-white/30 hover:text-zinc-200'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {loadingEditais ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <LoadingSpinner size="medium" />
                                    <p className="text-xs text-content-muted mt-4 font-bold uppercase tracking-widest animate-pulse">Carregando catálogo...</p>
                                </div>
                            ) : filteredEditais.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {filteredEditais.map(edital => (
                                        <motion.div 
                                            key={edital.id} 
                                            whileHover={{ scale: 1.01 }}
                                            className="p-4 rounded-2xl group border border-white/5 bg-zinc-800/20 hover:bg-zinc-800/50 hover:border-primary/30 transition-all relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4"
                                        >
                                            {/* Glow effect on hover */}
                                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl z-0" />
                                            
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 z-10 hidden sm:flex">
                                                <FileText size={20} className="text-primary" />
                                            </div>

                                            <div className="flex-1 min-w-0 z-10 w-full border-b border-white/5 sm:border-b-0 pb-3 sm:pb-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-content-main text-sm sm:text-base tracking-tight uppercase group-hover:text-primary transition-colors truncate">
                                                        {edital.organ}
                                                    </h4>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${
                                                        edital.status === 'PÓS-EDITAL' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        edital.status === 'PREVISTO' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                                    }`}>
                                                        {edital.status} {edital.year}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-content-muted font-medium mt-0.5 truncate">{edital.position}</p>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto z-10">
                                                 <div className="flex flex-wrap items-center gap-1.5 flex-1 sm:max-w-[240px] lg:max-w-[320px]">
                                                     {edital.subjects && edital.subjects.length > 0 ? (
                                                         <>
                                                             {edital.subjects.slice(0, 3).map((s: any, idx: number) => (
                                                                 <span key={idx} className="px-1.5 py-0.5 bg-zinc-900/50 text-[9px] font-bold rounded-md border border-white/5 text-zinc-400 truncate max-w-[100px] sm:max-w-none">
                                                                     {s.name}
                                                                 </span>
                                                             ))}
                                                             {edital.subjects.length > 3 && (
                                                                 <span className="text-[9px] font-bold text-primary/60">+{edital.subjects.length - 3} mats.</span>
                                                             )}
                                                         </>
                                                     ) : (
                                                         <span className="text-[10px] font-bold text-amber-500/60 flex items-center gap-1 uppercase tracking-wider bg-amber-500/5 px-2 py-1 rounded-md border border-amber-500/10">
                                                             <AlertTriangle size={10} /> Sem conteúdos
                                                         </span>
                                                     )}
                                                 </div>

                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleImportReadyEdital(edital);
                                                    }}
                                                    disabled={isLoadingReady}
                                                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all scale-100 sm:scale-75 sm:group-hover:scale-100 shrink-0 hover:bg-primary hover:text-white disabled:opacity-50"
                                                >
                                                    {isLoadingReady ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Search className="text-content-muted" size={32} />
                                    </div>
                                    <p className="text-lg font-black text-content-main mb-2 tracking-tight">SEM RESULTADOS</p>
                                    {searchQuery.trim() ? (
                                        <p className="text-sm text-content-muted font-medium mb-6">Não encontramos concursos para <span className="text-zinc-300 font-bold">&ldquo;{searchQuery}&rdquo;</span></p>
                                    ) : (
                                        <p className="text-sm text-content-muted font-medium mb-6">Ainda não há editais no catálogo. Seja o primeiro a sugerir!</p>
                                    )}
                                    <button
                                        onClick={handleOpenSuggest}
                                        className="inline-flex items-center gap-2 text-[11px] font-bold text-primary/80 hover:text-primary transition-colors uppercase tracking-widest bg-primary/10 hover:bg-primary/20 px-6 py-3 rounded-full"
                                    >
                                        <MessageSquare size={14} />
                                        Sugerir Edital
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'ia' ? (
                        <div className="space-y-8">
                            {iaStage === 'input' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 max-w-3xl mx-auto">
                                    <div className="space-y-4">
                                        <div className="p-6 rounded-3xl space-y-3 bg-zinc-800/20 border border-white/5">
                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Concurso / Origem</label>
                                            <input
                                                type="text"
                                                value={sourceName}
                                                onChange={(e) => setSourceName(e.target.value)}
                                                placeholder="Ex: PC-ES, Faculdade, TRT..."
                                                className="w-full bg-[#111114] border border-white/5 focus:border-primary/40 rounded-2xl px-6 py-3.5 text-sm font-medium text-content-main outline-none transition-all shadow-inner"
                                            />
                                        </div>
                                        <div className="p-6 rounded-3xl space-y-3 bg-zinc-800/20 border border-white/5">
                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Conteúdo Programático</label>
                                            <textarea
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                placeholder="Cole aqui o texto do conteúdo programático do edital (Ctrl+V)..."
                                                className="w-full h-64 bg-[#111114] border border-white/5 focus:border-primary/40 rounded-2xl p-6 text-sm font-medium text-content-main outline-none transition-all resize-none no-scrollbar shadow-inner"
                                            />
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            onClick={handleIaImport}
                                            disabled={!inputText.trim()}
                                            className="w-full sm:w-auto px-10 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs mx-auto uppercase tracking-widest"
                                        >
                                            <Sparkles size={16} />
                                            Estruturar com IA
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {iaStage === 'processing' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center text-center">
                                    <div className="relative mb-10">
                                        <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse"></div>
                                        <Loader2 className="text-primary animate-spin relative" size={80} />
                                    </div>
                                    <h3 className="text-2xl font-black text-content-main mb-3 tracking-tight">{processingMsg}</h3>
                                    <p className="text-xs text-content-muted font-bold uppercase tracking-[0.3em]">Aguarde alguns segundos...</p>
                                </motion.div>
                            )}

                            {iaStage === 'review' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black text-content-main tracking-tight">Revisão da Estrutura</h3>
                                        <button onClick={() => setIaStage('input')} className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black text-content-muted hover:text-primary transition-colors uppercase tracking-widest bg-zinc-800 rounded-full">
                                            <Undo2 size={14} /> Voltar
                                        </button>
                                    </div>

                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 no-scrollbar">
                                        {aiResult.map((subj, sIdx) => (
                                            <div key={subj.id} className="p-5 rounded-3xl bg-zinc-800/10 border border-white/5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={subj.selected}
                                                            onChange={() => {
                                                                const newResult = [...aiResult];
                                                                newResult[sIdx].selected = !newResult[sIdx].selected;
                                                                setAiResult(newResult);
                                                            }}
                                                            className="w-5 h-5 rounded-lg accent-primary"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={subj.title}
                                                            onChange={(e) => {
                                                                const newResult = [...aiResult];
                                                                newResult[sIdx].title = e.target.value;
                                                                setAiResult(newResult);
                                                            }}
                                                            className="bg-transparent border-none font-bold text-content-main outline-none focus:text-primary transition-colors text-lg"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newResult = [...aiResult];
                                                            newResult[sIdx].expanded = !newResult[sIdx].expanded;
                                                            setAiResult(newResult);
                                                        }}
                                                        className="text-content-muted hover:text-primary transition-colors"
                                                    >
                                                        {subj.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </button>
                                                </div>

                                                {subj.expanded && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                                                        {subj.topics.map((topic, tIdx) => (
                                                            <div key={tIdx} className="flex items-center gap-2 p-2 px-3 rounded-xl hover:bg-zinc-800/30 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={topic.selected}
                                                                    onChange={() => {
                                                                        const newResult = [...aiResult];
                                                                        newResult[sIdx].topics[tIdx].selected = !newResult[sIdx].topics[tIdx].selected;
                                                                        setAiResult(newResult);
                                                                    }}
                                                                    className="w-4 h-4 rounded accent-primary/60"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={topic.name}
                                                                    onChange={(e) => {
                                                                        const newResult = [...aiResult];
                                                                        newResult[sIdx].topics[tIdx].name = e.target.value;
                                                                        setAiResult(newResult);
                                                                    }}
                                                                    className="bg-transparent border-none text-sm text-content-main outline-none"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex justify-center">
                                        <button
                                            onClick={handleSaveAiResult}
                                            className="px-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-3xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                                        >
                                            IMPORTAR SELECIONADOS
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 max-w-4xl mx-auto pt-2 pb-8">
                            {/* Modern Bar Style for Adding Subjects */}
                            <div className="glow-card p-4 rounded-2xl flex flex-col items-start gap-4 mb-4 relative z-20">
                                <div className="flex flex-col sm:flex-row w-full gap-4 items-center justify-between">
                                    <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
                                        {/* Edital Name (Origin) Field */}
                                        <div className="relative flex-1">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/60">
                                                <Database size={14} />
                                            </div>
                                            <input
                                                type="text"
                                                value={manualTitle}
                                                onChange={(e) => setManualTitle(e.target.value)}
                                                placeholder="Concurso / Origem (ex: PC-ES)"
                                                className="w-full h-11 bg-[#111114] border border-black/5 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary/40 transition-all text-content-main placeholder:text-content-muted/40 shadow-inner"
                                            />
                                        </div>

                                        {/* Subject Input Field */}
                                        <div className="relative flex-[1.5]">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
                                            <input
                                                type="text"
                                                value={currentManualSubject}
                                                onChange={(e) => setCurrentManualSubject(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && currentManualSubject.trim()) {
                                                        e.preventDefault();
                                                        setManualSubjects(prev => [...prev, currentManualSubject.trim()]);
                                                        setCurrentManualSubject('');
                                                    }
                                                }}
                                                placeholder="Nome da matéria (Português, RLM...)"
                                                className="w-full h-11 bg-[#111114] border border-black/5 dark:border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary/40 transition-all text-content-main placeholder:text-content-muted/40 shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (currentManualSubject.trim()) {
                                                setManualSubjects(prev => [...prev, currentManualSubject.trim()]);
                                                setCurrentManualSubject('');
                                            }
                                        }}
                                        disabled={!currentManualSubject.trim()}
                                        className="h-11 px-6 bg-emerald-500 text-white text-[10px] font-black rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40 uppercase tracking-widest"
                                    >
                                        <Plus size={14} />
                                        ADICIONAR MATÉRIA
                                    </button>
                                </div>
                            </div>

                            {/* List of Added Subjects */}
                            <div className="flex flex-wrap gap-2 min-h-[100px] p-6 rounded-3xl bg-black/20 border border-white/5 relative">
                                {manualSubjects.length === 0 ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 pointer-events-none">
                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-2">
                                            <FileText size={20} className="text-content-muted" />
                                        </div>
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted">Nenhuma matéria adicionada</p>
                                    </div>
                                ) : (
                                    manualSubjects.map((topic, index) => (
                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            key={`${topic}-${index}`}
                                            className="group flex items-center gap-2 pl-4 pr-2 py-2 bg-zinc-800 border border-white/10 rounded-xl transition-all hover:border-primary/40"
                                        >
                                            <span className="text-xs font-bold text-zinc-200">{topic}</span>
                                            <button
                                                onClick={() => {
                                                    setManualSubjects(prev => prev.filter((_, i) => i !== index));
                                                }}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                                            >
                                                <X size={12} />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            <div className="pt-8 flex flex-col items-center gap-4">
                                <button
                                    onClick={handleSaveManual}
                                    disabled={!manualTitle.trim() || manualSubjects.length === 0 || isSavingManual}
                                    className="px-16 py-4 bg-primary text-white font-black rounded-[24px] shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3 relative min-w-[280px] justify-center"
                                >
                                    {isSavingManual ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            SALVANDO...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={20} />
                                            SALVAR EDITAL MANUAL
                                        </>
                                    )}
                                </button>
                                <p className="text-[10px] text-content-muted font-bold uppercase tracking-[0.2em]">O edital ficará salvo em &ldquo;Meus Editais&rdquo;</p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ── Sugerir Edital Drawer ── */}
            <AnimatePresence>
                {showSuggestSlide && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSuggestSlide(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-[32px] z-10"
                        />
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="absolute inset-y-0 right-0 w-full max-w-sm bg-zinc-900 border-l border-white/10 rounded-r-[32px] flex flex-col z-20 shadow-2xl"
                        >
                            <div className="px-6 pt-7 pb-5 border-b border-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                                        <MessageSquare size={18} className="text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-zinc-100 tracking-tight">Sugerir Edital</h3>
                                        <p className="text-[11px] text-content-muted mt-0.5">Vamos analisar e cadastrar em breve</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSuggestSlide(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-100"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 flex flex-col justify-center px-6 pb-8">
                                {suggestionSent ? (
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="text-center py-8"
                                    >
                                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
                                            <CheckCircle2 className="text-emerald-400" size={32} />
                                        </div>
                                        <h4 className="text-base font-black text-zinc-100 mb-2">Sugestão Enviada!</h4>
                                        <p className="text-sm text-content-muted mb-6 leading-relaxed">
                                            Recebemos sua sugestão para <span className="text-zinc-300 font-bold">{suggestConcurso}</span>. Iremos analisar e te notificaremos quando disponível.
                                        </p>
                                        <button
                                            onClick={() => setShowSuggestSlide(false)}
                                            className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all"
                                        >
                                            FECHAR
                                        </button>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em]">
                                                Nome do Concurso / Edital
                                            </label>
                                            <input
                                                type="text"
                                                value={suggestConcurso}
                                                onChange={e => setSuggestConcurso(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && suggestConcurso.trim() && handleSendSuggestion()}
                                                placeholder="Ex: PCES, PMES, INSS, TRT..."
                                                autoFocus
                                                className="w-full h-12 bg-zinc-950/80 border border-white/8 rounded-2xl px-5 text-sm font-medium text-content-main placeholder:text-content-muted/40 focus:outline-none focus:border-primary/40 transition-all"
                                            />
                                            <p className="text-[10px] text-content-muted pl-1">
                                                Informe o nome ou sigla do concurso que deseja ter disponível no catálogo.
                                            </p>
                                        </div>

                                        <button
                                            onClick={handleSendSuggestion}
                                            disabled={!suggestConcurso.trim() || isSendingSuggestion}
                                            className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                                        >
                                            {isSendingSuggestion ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={15} />
                                                    ENVIAR SUGESTÃO
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

