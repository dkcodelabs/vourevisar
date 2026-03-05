import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, Sparkles, Loader2, Undo2, Edit3, ChevronUp, ChevronDown, Trash2, Save, Plus, X } from 'lucide-react';
import { Subject } from '@/types';

interface ImportEditalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: Subject[]) => void;
    subjects: Subject[];
    initialTab?: 'ready' | 'ia' | 'manual';
    manualModeChildren?: React.ReactNode;
}

export const ImportEditalModal = ({ isOpen, onClose, onImport, subjects, initialTab = 'ready', manualModeChildren }: ImportEditalModalProps) => {
    const [activeTab, setActiveTab] = useState<'ready' | 'ia' | 'manual'>(initialTab);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [sourceName, setSourceName] = useState('');

    // Manual States
    const [manualTitle, setManualTitle] = useState('');
    const [manualTopics, setManualTopics] = useState<string[]>(['']);

    // IA States
    const [inputText, setInputText] = useState('');
    const [iaStage, setIaStage] = useState<'input' | 'processing' | 'review'>('input');
    const [processingMsg, setProcessingMsg] = useState('Lendo edital...');
    const [aiResult, setAiResult] = useState<any[]>([]);

    // Mock editais
    const editais = [
        { id: 1, organ: 'Polícia Civil ES', position: 'Investigador', status: 'PÓS-EDITAL', year: '2026', subjectsCount: 12, category: 'Carreiras Policiais' },
        { id: 2, organ: 'INSS', position: 'Técnico do Seguro Social', status: 'PREVISTO', year: '2025', subjectsCount: 8, category: 'Outros' },
        { id: 3, organ: 'Banco do Brasil', position: 'Escriturário', status: 'CONCLUÍDO', year: '2024', subjectsCount: 10, category: 'Bancárias' },
        { id: 4, organ: 'Polícia Militar ES', position: 'Soldado', status: 'PÓS-EDITAL', year: '2026', subjectsCount: 10, category: 'Carreiras Policiais' },
    ];

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
            setManualTopics(['']);
        }
    }, [initialTab, isOpen]);

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

    const handleSaveAiResult = () => {
        const newSubjects: Subject[] = [];

        aiResult.filter(r => r.selected).forEach((r, sIdx) => {
            newSubjects.push({
                id: `ia-subj-${Date.now()}-${sIdx}`,
                name: r.title,
                status: 'Nova',
                topics: r.topics.filter((t: any) => t.selected).map((t: any, idx: number) => ({
                    id: `ia-top-${Date.now()}-${idx}`,
                    name: t.name,
                    completed: false,
                    reviewCount: 0,
                    review_count: 0
                }))
            });
        });

        onImport(newSubjects);
        onClose();
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
                        <h2 className="text-xl font-black text-content-main tracking-tight">Importar Edital</h2>
                        <p className="text-xs text-content-muted font-medium mt-1">Escolha um edital pronto ou use nossa IA</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar flex-1">
                    <div className="flex gap-2 bg-zinc-950 p-1 rounded-[20px] mb-6 w-fit mx-auto border border-black/5 dark:border-white/5">
                        <button
                            onClick={() => setActiveTab('ready')}
                            className={`px-4 py-2.5 rounded-[14px] text-[9px] font-black transition-all uppercase tracking-widest ${activeTab === 'ready' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-primary'}`}
                        >
                            Editais Prontos
                        </button>
                        <button
                            onClick={() => setActiveTab('ia')}
                            className={`px-4 py-2.5 rounded-[14px] text-[9px] font-black transition-all uppercase tracking-widest ${activeTab === 'ia' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-primary'}`}
                        >
                            Importar com IA
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`px-4 py-2.5 rounded-[14px] text-[9px] font-black transition-all uppercase tracking-widest ${activeTab === 'manual' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-primary'}`}
                        >
                            Adicionar Manual
                        </button>
                    </div>

                    {activeTab === 'ready' ? (
                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-content-muted" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Buscar concurso (ex: PCES, PMES, INSS...)"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-16 bg-zinc-950 border border-black/5 dark:border-white/5 rounded-[24px] pl-16 pr-6 text-sm font-medium focus:outline-none focus:border-primary/40 transition-all text-content-main placeholder:text-content-muted/50"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {['Todos', 'Carreiras Policiais', 'Tribunais', 'Bancárias'].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-6 py-2.5 rounded-full text-[10px] font-black transition-all uppercase tracking-widest ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-zinc-950 text-content-muted hover:text-primary'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {filteredEditais.length > 0 ? (
                                    filteredEditais.map(edital => (
                                        <div key={edital.id} className="p-6 rounded-[32px] flex items-center justify-between group hover:border-primary/30 transition-all bg-zinc-800/30">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                                                    <FileText size={28} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-content-main text-base tracking-tight">{edital.organ} - {edital.position}</h4>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-[11px] font-black text-secondary uppercase tracking-widest">{edital.status} {edital.year}</span>
                                                        <span className="text-[11px] font-bold text-content-muted uppercase tracking-widest">{edital.subjectsCount} matérias</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    onImport([{ id: edital.id.toString(), name: edital.organ, status: 'Nova', topics: [] }]);
                                                }}
                                                className="px-8 py-3 bg-primary text-white text-[11px] font-black rounded-[18px] hover:bg-primary/90 transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
                                            >
                                                IMPORTAR EDITAL
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Search className="text-content-muted" size={32} />
                                        </div>
                                        <p className="text-lg font-black text-content-main mb-2">Não encontramos esse edital pré-cadastrado.</p>
                                        <p className="text-sm text-content-muted font-medium">Use a aba 'Importar com IA' para cadastrar o seu agora mesmo.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'ia' ? (
                        <div className="space-y-8">
                            {iaStage === 'input' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="p-8 rounded-[40px] space-y-4 bg-zinc-800/30">
                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Concurso / Origem</label>
                                            <input
                                                type="text"
                                                value={sourceName}
                                                onChange={(e) => setSourceName(e.target.value)}
                                                placeholder="Ex: PC-ES, Faculdade, TRT..."
                                                className="w-full bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[24px] px-8 py-4 text-sm font-medium text-content-main outline-none transition-all"
                                            />
                                        </div>
                                        <div className="p-8 rounded-[40px] space-y-4 bg-zinc-800/30">
                                            <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Conteúdo Programático</label>
                                            <textarea
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                placeholder="Cole aqui o texto do conteúdo programático do edital (Ctrl+V)..."
                                                className="w-full h-80 bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[24px] p-8 text-sm font-medium text-content-main outline-none transition-all resize-none no-scrollbar"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleIaImport}
                                        disabled={!inputText.trim()}
                                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black py-4 rounded-[20px] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
                                    >
                                        <Sparkles size={18} />
                                        ESTRUTURAR COM IA
                                    </button>
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

                                    <div className="space-y-4">
                                        {aiResult.map((subject, sIdx) => (
                                            <div key={subject.id} className="rounded-[32px] overflow-hidden border border-white/5 bg-zinc-800/20">
                                                <div className="p-6 flex items-center justify-between bg-zinc-800/40">
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={subject.selected}
                                                            onChange={() => {
                                                                const newResult = [...aiResult];
                                                                newResult[sIdx].selected = !newResult[sIdx].selected;
                                                                setAiResult(newResult);
                                                            }}
                                                            className="w-5 h-5 rounded-lg border-white/10 text-primary focus:ring-primary bg-zinc-900"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={subject.title}
                                                                onChange={(e) => {
                                                                    const newResult = [...aiResult];
                                                                    newResult[sIdx].title = e.target.value;
                                                                    setAiResult(newResult);
                                                                }}
                                                                className="bg-transparent font-black text-base text-content-main focus:outline-none border-b border-transparent focus:border-primary/40 tracking-tight"
                                                            />
                                                            <Edit3 size={14} className="text-content-muted/50" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const newResult = [...aiResult];
                                                                newResult[sIdx].expanded = !newResult[sIdx].expanded;
                                                                setAiResult(newResult);
                                                            }}
                                                            className="p-2 text-content-muted hover:text-primary transition-colors"
                                                        >
                                                            {subject.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                        </button>
                                                        <button
                                                            onClick={() => setAiResult(aiResult.filter((_, i) => i !== sIdx))}
                                                            className="p-2 text-content-muted hover:text-secondary transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {subject.selected && subject.expanded && (
                                                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/20">
                                                        {subject.topics.map((topic: any, tIdx: number) => (
                                                            <div key={tIdx} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 group transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={topic.selected}
                                                                    onChange={() => {
                                                                        const newResult = [...aiResult];
                                                                        newResult[sIdx].topics[tIdx].selected = !newResult[sIdx].topics[tIdx].selected;
                                                                        setAiResult(newResult);
                                                                    }}
                                                                    className="w-4 h-4 rounded border-white/10 text-primary focus:ring-primary bg-zinc-900"
                                                                />
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <input
                                                                        type="text"
                                                                        value={topic.name}
                                                                        onChange={(e) => {
                                                                            const newResult = [...aiResult];
                                                                            newResult[sIdx].topics[tIdx].name = e.target.value;
                                                                            setAiResult(newResult);
                                                                        }}
                                                                        className="flex-1 bg-transparent text-sm text-content-muted font-medium focus:text-content-main focus:outline-none border-b border-transparent focus:border-primary/40"
                                                                    />
                                                                    <Edit3 size={12} className="text-content-muted/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleSaveAiResult}
                                        className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-[20px] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
                                    >
                                        <Save size={18} />
                                        SALVAR E IMPORTAR
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        manualModeChildren ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 w-full">
                                {manualModeChildren}
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-8 rounded-[40px] space-y-4 bg-zinc-800/30">
                                        <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Nome da Matéria</label>
                                        <input
                                            type="text"
                                            value={manualTitle}
                                            onChange={(e) => setManualTitle(e.target.value)}
                                            placeholder="Ex: Matemática, Direito Penal..."
                                            className="w-full bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[24px] px-8 py-4 text-sm font-medium text-content-main outline-none transition-all"
                                        />
                                    </div>
                                    <div className="p-8 rounded-[40px] space-y-4 bg-zinc-800/30">
                                        <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Concurso / Origem</label>
                                        <input
                                            type="text"
                                            value={sourceName}
                                            onChange={(e) => setSourceName(e.target.value)}
                                            placeholder="Ex: PC-ES, Faculdade, TRT..."
                                            className="w-full bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[24px] px-8 py-4 text-sm font-medium text-content-main outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="p-8 rounded-[40px] space-y-6 bg-zinc-800/30">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Tópicos</label>
                                        <button
                                            onClick={() => setManualTopics([...manualTopics, ''])}
                                            className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-80 transition-all"
                                        >
                                            <Plus size={14} />
                                            ADICIONAR TÓPICO
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                                        {manualTopics.map((topic, idx) => (
                                            <div key={idx} className="flex gap-3">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        value={topic}
                                                        onChange={(e) => {
                                                            const newTopics = [...manualTopics];
                                                            newTopics[idx] = e.target.value;
                                                            setManualTopics(newTopics);
                                                        }}
                                                        placeholder={`Tópico ${idx + 1}`}
                                                        className="w-full bg-zinc-900/50 border border-white/5 focus:border-primary/40 rounded-[18px] px-6 py-3 text-xs font-medium text-content-main outline-none transition-all"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setManualTopics(manualTopics.filter((_, i) => i !== idx))}
                                                    className="w-12 h-12 flex items-center justify-center rounded-[18px] border border-rose-500/30 bg-rose-500/5 text-rose-500 hover:bg-rose-500/20 transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (!manualTitle.trim()) return;
                                        const newSubject: Subject = {
                                            id: `manual-subj-${Date.now()}`,
                                            name: manualTitle,
                                            status: 'Nova',
                                            topics: manualTopics.filter(t => t.trim()).map((t, idx) => ({
                                                id: `manual-top-${Date.now()}-${idx}`,
                                                name: t,
                                                completed: false,
                                                reviewCount: 0,
                                                review_count: 0
                                            }))
                                        };
                                        onImport([newSubject]);
                                        onClose();
                                        setManualTitle('');
                                        setManualTopics(['']);
                                        setSourceName('');
                                    }}
                                    disabled={!manualTitle.trim()}
                                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black py-4 rounded-[20px] shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs tracking-widest uppercase"
                                >
                                    <Save size={18} />
                                    SALVAR MATÉRIA
                                </button>
                            </motion.div>
                        )
                    )}
                </div>
            </motion.div>
        </div>
    );
};
