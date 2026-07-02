import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, EyeOff, Plus, Search, Trash2, Edit3, Save, X, Globe, AlertCircle,
    ChevronDown, ChevronUp, AlertTriangle, Send, CheckSquare, XCircle, MessageSquare, Clock,
    GraduationCap, BookOpen, List, Info, Loader2, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { errorService } from '@/lib/errors/errorService';
import { AdminEditalSubjectsModal } from '@/components/admin/AdminEditalSubjectsModal';
import { AdminAddEditalModal } from '@/components/admin/AdminAddEditalModal';


interface Topic {
    id: string;
    name: string;
}

interface Subject {
    id: string;
    name: string;
    topics: Topic[];
}

interface PublicEdital {
    id: string;
    organ: string;
    position: string;
    year: string;
    category: string;
    exam_date?: string;
    exam_board?: string | null;
    is_public?: boolean;
    status?: string;
    created_at?: string;
    subjects?: Subject[];
}

interface EditalSuggestion {
    id: string;
    user_id: string;
    concurso: string;
    status: 'pending' | 'cadastrado' | 'ja_cadastrado' | 'nao_cadastrado';
    response_message?: string;
    responded_at?: string;
    created_at: string;
}

const PRESET_CATEGORIES = ['Carreiras Policiais', 'Judiciário', 'Administrativo', 'Bancárias', 'Educação', 'Saúde', 'Militar', 'Outros'];

const RESPONSE_TEMPLATES = {
    cadastrado: '✅ Analisamos sua sugestão e o edital foi inserido no catálogo! Bons estudos!',
    ja_cadastrado: 'ℹ️ Já disponível no catálogo. Utilize a busca em "Editais Prontos".',
    nao_cadastrado: '❌ Analisamos sua sugestão, mas não foi possível cadastrar este edital no catálogo no momento. Agradecemos pelo interesse!',
};

const STATUS_BADGE = {
    pending: { label: 'Pendente', cls: 'bg-amber-500/10 text-amber-500' },
    cadastrado: { label: 'Atendida', cls: 'bg-emerald-500/10 text-emerald-500' },
    ja_cadastrado: { label: 'Já Existia', cls: 'bg-blue-500/10 text-blue-500' },
    nao_cadastrado: { label: 'Recusada', cls: 'bg-zinc-500/10 text-zinc-400' },
};

const EMPTY_FORM = {
    organ: '',
    position: '',
    year: new Date().getFullYear().toString(),
    category: 'Carreiras Policiais',
    exam_date: '',
    exam_board: '',
    is_public: true,
};

const AdminEditais = () => {
    const [activeTab, setActiveTab] = useState<'editais' | 'solicitacoes'>('editais');
    const [editais, setEditais] = useState<PublicEdital[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [savingEdital, setSavingEdital] = useState(false);
    
    // Form state
    const [form, setForm] = useState(EMPTY_FORM);
    const [categoryDraft, setCategoryDraft] = useState('');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    
    // Suggestions state
    const [suggestions, setSuggestions] = useState<EditalSuggestion[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [respondingId, setRespondingId] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof RESPONSE_TEMPLATES>('cadastrado');
    const [customMessage, setCustomMessage] = useState('');
    const [sendingResponse, setSendingResponse] = useState(false);
    
    // Subjects modal state
    const [selectedEditalForSubjects, setSelectedEditalForSubjects] = useState<PublicEdital | null>(null);
    const [isSubjectsModalOpen, setIsSubjectsModalOpen] = useState(false);


    const fetchEditais = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('public_editais')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setEditais(data || []);
        } catch (err) {
            errorService.report(err, { module: 'AdminEditais', action: 'fetch', userMessage: 'Erro ao carregar editais.' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchSuggestions = useCallback(async () => {
        setLoadingSuggestions(true);
        try {
            const { data } = await supabase
                .from('edital_suggestions')
                .select('*')
                .order('created_at', { ascending: false });
            setSuggestions(data || []);
        } finally {
            setLoadingSuggestions(false);
        }
    }, []);

    useEffect(() => {
        fetchEditais();
        fetchSuggestions();
    }, [fetchEditais, fetchSuggestions]);

    const openAddModal = () => {
        setIsAddModalOpen(true);
    };


    const openEditForm = (edital: PublicEdital) => {
        setForm({
            organ: edital.organ,
            position: edital.position,
            year: edital.year,
            category: edital.category,
            exam_date: edital.exam_date || '',
            exam_board: edital.exam_board || '',
            is_public: edital.is_public ?? true,
        });
        setCategoryDraft(edital.category);
        setEditingId(edital.id);
    };

    const handleSave = async () => {
        if (!form.organ.trim() || !form.position.trim() || !form.year.trim()) {
            toastGate.notifyError('Órgão, Cargo e Ano são obrigatórios!', 'VAL-ADM-01', { severity: 'low' });
            return;
        }
        
        const payload = {
            organ: form.organ.trim(),
            position: form.position.trim(),
            year: form.year.trim(),
            category: categoryDraft || form.category,
            exam_date: form.exam_date || null,
            exam_board: form.exam_board.trim() || null,
            is_public: form.is_public,
            status: 'published',
            updated_at: new Date().toISOString()
        };

        setSavingEdital(true);
        try {
            let error;
            if (editingId) {
                const { error: err } = await supabase.from('public_editais').update(payload).eq('id', editingId);
                error = err;
            } else {
                const { error: err } = await supabase.from('public_editais').insert([payload]);
                error = err;
            }
            if (error) throw error;
            
            toast.success(editingId ? 'Edital atualizado!' : 'Edital cadastrado!');
            setEditingId(null);
            fetchEditais();
        } catch (err) {
            errorService.report(err, { module: 'AdminEditais', action: 'save', userMessage: 'Erro ao salvar edital. Verifique suas permissões.' });
        } finally {
            setSavingEdital(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('public_editais').delete().eq('id', id);
            if (error) throw error;
            toast.success('Edital removido.');
            setConfirmDeleteId(null);
            fetchEditais();
        } catch (err) {
            errorService.report(err, { module: 'AdminEditais', action: 'delete', userMessage: 'Erro ao remover.' });
        }
    };

    const handleRespond = async (suggestion: EditalSuggestion) => {
        if (sendingResponse) return;
        setSendingResponse(true);
        const msg = customMessage.trim() || RESPONSE_TEMPLATES[selectedTemplate];
        try {
            const { error: suggErr } = await supabase.from('edital_suggestions').update({
                status: selectedTemplate,
                response_message: msg,
                responded_at: new Date().toISOString(),
            }).eq('id', suggestion.id);
            if (suggErr) throw suggErr;

            await supabase.from('user_notifications').insert({
                user_id: suggestion.user_id,
                title: `Resposta sobre "${suggestion.concurso}"`,
                message: msg,
                type: selectedTemplate === 'cadastrado' ? 'success' : selectedTemplate === 'nao_cadastrado' ? 'warning' : 'info',
                read: false,
                data: { reference_type: 'edital_suggestion', reference_id: suggestion.id },
                // Omit category to prevent violations of user_notifications_category_check if 'sistema' is not supported
            });

            toast.success('Resposta enviada com sucesso!');
            setRespondingId(null);
            setCustomMessage('');
            fetchSuggestions();
        } catch (err) {
            errorService.report(err, { module: 'AdminEditais', action: 'respond', userMessage: 'Erro ao notificar o usuário da resposta.' });
        } finally {
            setSendingResponse(false);
        }
    };

    const filteredEditais = useMemo(() => 
        editais.filter(e =>
            e.status !== 'archived' &&
            `${e.organ} ${e.position} ${e.category} ${e.exam_board || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [editais, searchQuery]
    );

    const pendingCount = suggestions.filter(s => s.status === 'pending').length;

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* ─── TOOLBAR SUPERIOR ─── */}
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between w-full mb-8">
                    
                    {/* Abas Esquerda */}
                    <div className="flex bg-secondary dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-border dark:border-white/5 backdrop-blur-md shrink-0 w-full md:w-auto">

                        <button
                            onClick={() => setActiveTab('editais')}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2 px-6 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === 'editais' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-content-main'
                            }`}
                        >
                            <FileText size={16} /> Editais
                        </button>
                        <button
                            onClick={() => setActiveTab('solicitacoes')}
                            className={`flex flex-1 md:flex-none relative items-center justify-center gap-2 px-6 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === 'solicitacoes' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-content-main'
                            }`}
                        >
                            <MessageSquare size={16} /> Solicitações
                            {pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-18 px-1 rounded-full bg-amber-500 text-black font-black text-[9px] flex items-center justify-center border-2 border-zinc-900 animate-bounce">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Controles Direita */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto shrink-0">
                        {/* Busca */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted" size={16} />
                            <input
                                placeholder="Buscar nos editais..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-secondary border border-border rounded-2xl pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-primary/40 transition-all text-content-main placeholder:text-content-muted/50"

                            />
                        </div>

                        <button
                            onClick={openAddModal}
                            className="w-full sm:w-auto h-11 px-6 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group active:scale-95 shrink-0"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Novo Edital
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* ─── ABA EDITAIS ─── */}
                    {activeTab === 'editais' && (
                        <motion.div key="ed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                            {/* Formulário de Edição (inline, apenas para edição de existente) */}
                            <AnimatePresence>
                                {!!editingId && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -20 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -20 }}
                                        className="overflow-hidden mb-8"
                                    >
                                        <div className="bg-card backdrop-blur-xl border border-border rounded-3xl p-6 md:p-8 shadow-2xl mx-auto w-full relative">

                                            <div className="flex items-center justify-between mb-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${editingId ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                        {editingId ? <Edit3 size={24} /> : <Plus size={24} />}
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-black text-foreground dark:text-white tracking-tight">
                                                            {editingId ? 'Editar Edital' : 'Cadastrar Novo Edital'}
                                                        </h2>
                                                        <p className="text-sm text-content-muted font-medium">
                                                            {editingId ? 'Atualize as informações do concurso' : 'Preencha os dados do novo concurso'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => { setEditingId(null); }} 
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary text-content-muted hover:text-foreground hover:bg-secondary/80 transition-all border border-border"

                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-content-muted uppercase tracking-widest px-1">Órgão</label>
                                                    <input
                                                        value={form.organ}
                                                        onChange={e => setForm(p => ({ ...p, organ: e.target.value }))}
                                                        placeholder="Ex: PMES, PCES, TJ..."
                                                        className="w-full h-12 bg-secondary dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-2xl px-5 text-sm font-medium text-content-main dark:text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-content-muted/30"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-content-muted uppercase tracking-widest px-1">Cargo</label>
                                                    <input
                                                        value={form.position}
                                                        onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                                                        placeholder="Ex: Soldado, Delegado, Analista..."
                                                        className="w-full h-12 bg-secondary dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-2xl px-5 text-sm font-medium text-content-main dark:text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-content-muted/30"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-content-muted uppercase tracking-widest px-1">Ano</label>
                                                    <input
                                                        value={form.year}
                                                        onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                                                        placeholder="Ex: 2024, 2025..."
                                                        className="w-full h-12 bg-secondary dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-2xl px-5 text-sm font-medium text-content-main dark:text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-content-muted/30"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-content-muted uppercase tracking-widest px-1">Data da Prova</label>
                                                    <input
                                                        type="date"
                                                        value={form.exam_date}
                                                        onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))}
                                                        className="w-full h-12 bg-secondary dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-2xl px-5 text-sm font-medium text-content-main dark:text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all [color-scheme:dark]"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-black text-content-muted uppercase tracking-widest px-1">Banca</label>
                                                    <input
                                                        value={form.exam_board}
                                                        onChange={e => setForm(p => ({ ...p, exam_board: e.target.value }))}
                                                        placeholder="Ex: Cebraspe, FGV, FCC..."
                                                        className="w-full h-12 bg-secondary dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-2xl px-5 text-sm font-medium text-content-main dark:text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-content-muted/30"
                                                    />
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <label className="text-xs font-black text-content-muted uppercase tracking-widest px-1">Categoria</label>
                                                    <input
                                                        value={categoryDraft}
                                                        onChange={e => { setCategoryDraft(e.target.value); setShowCategoryDropdown(true); }}
                                                        onFocus={() => setShowCategoryDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                                                        placeholder="Selecione ou digite..."
                                                        className="w-full h-12 bg-secondary dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-2xl px-5 text-sm font-medium text-content-main dark:text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-content-muted/30"
                                                    />
                                                    <AnimatePresence>
                                                        {showCategoryDropdown && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, y: -10 }} 
                                                                animate={{ opacity: 1, y: 0 }} 
                                                                exit={{ opacity: 0, y: -10 }} 
                                                                className="absolute z-30 top-[80px] left-0 right-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden py-2 max-h-56 overflow-y-auto"

                                                            >
                                                                {PRESET_CATEGORIES.filter(c => c.toLowerCase().includes(categoryDraft.toLowerCase())).map(cat => (
                                                                    <button 
                                                                        key={cat} 
                                                                        onMouseDown={() => { setCategoryDraft(cat); setShowCategoryDropdown(false); }} 
                                                                        className="w-full text-left px-5 py-3 hover:bg-secondary text-sm font-medium text-content-muted hover:text-foreground transition-all capitalize"

                                                                    >
                                                                        {cat}
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 bg-secondary border border-border rounded-2xl">

                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => setForm(p => ({ ...p, is_public: !p.is_public }))}
                                                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 shadow-inner ${form.is_public ? 'bg-emerald-500' : 'bg-red-500/20'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${form.is_public ? 'translate-x-7' : 'translate-x-1'}`} />
                                                    </button>
                                                    <div className="flex flex-col cursor-pointer" onClick={() => setForm(p => ({ ...p, is_public: !p.is_public }))}>
                                                        <span className="text-sm font-black text-foreground dark:text-white flex items-center gap-2">
                                                            <Globe size={16} className={form.is_public ? "text-emerald-500" : "text-content-muted"} />
                                                            Visibilidade Pública
                                                        </span>
                                                        <span className="text-xs text-content-muted font-medium">
                                                            {form.is_public ? 'Visível para todos os alunos' : 'Acesso restrito apenas via Admin'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/10 text-[11px] font-bold text-amber-500 rounded-xl leading-tight">
                                                    <Info size={16} className="shrink-0" /> Configuração de matérias disponível após salvar.
                                                </div>
                                            </div>

                                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-white/5">
                                                <button 
                                                    onClick={() => { setEditingId(null); }} 
                                                    className="px-6 py-3 text-sm font-black text-content-muted hover:text-white transition-colors"
                                                >
                                                    DESCARTAR
                                                </button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={savingEdital}
                                                    className="h-12 px-10 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                                >
                                                    {savingEdital ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                    ATUALIZAR EDITAL
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Lista de Editais */}
                            <div className="flex flex-col gap-2">
                                {isLoading ? (
                                    <div className="py-20 text-center"><LoadingSpinner size="large" /></div>
                                ) : filteredEditais.length === 0 ? (
                                    <div className="py-20 text-center bg-secondary border border-border rounded-3xl">
                                        <AlertCircle size={48} className="mx-auto text-zinc-800 mb-4" />

                                        <p className="text-content-muted font-black text-xs uppercase tracking-widest">Nenhum edital encontrado</p>
                                    </div>
                                ) : (
                                    filteredEditais.map((edital, idx) => {
                                        const subjectsCount = edital.subjects?.length || 0;
                                        const topicsCount = edital.subjects?.reduce((acc: number, s) => acc + (s.topics?.length || 0), 0) || 0;

                                        return (
                                            <motion.div
                                                key={edital.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.02 }}
                                                className="group relative bg-card border border-border hover:border-primary/30 hover:bg-secondary/30 transition-all duration-200 rounded-xl overflow-hidden cursor-pointer"

                                                onClick={() => {
                                                    setSelectedEditalForSubjects(edital);
                                                    setIsSubjectsModalOpen(true);
                                                }}
                                            >
                                                <div className="px-5 py-3 grid grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_112px_118px_58px] xl:gap-5">
                                                    {/* Indicador de Seleção Lateral */}
                                                    <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-white/5 group-hover:bg-primary transition-colors" />
                                                    
                                                    {/* Conteúdo principal */}
                                                    <div className="min-w-0 space-y-1.5 pr-16 xl:pr-0">
                                                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase leading-tight">
                                                            <span className="text-[9px] font-black text-zinc-600 tracking-[0.18em]">Banca</span>
                                                            <span
                                                                className="max-w-full truncate text-zinc-400"
                                                                title={edital.exam_board || 'Não cadastrada'}
                                                            >
                                                                {edital.exam_board || 'Não cadastrada'}
                                                            </span>
                                                            <span className="text-zinc-700">|</span>
                                                            <span
                                                                className="max-w-full truncate text-zinc-400"
                                                                title={edital.category || 'Não informada'}
                                                            >
                                                                {edital.category || 'Não informada'}
                                                            </span>
                                                        </div>
                                                        <h3
                                                            className="text-[15px] font-black text-foreground dark:text-white uppercase tracking-normal leading-tight break-words group-hover:text-primary transition-colors"
                                                            title={edital.organ}
                                                        >
                                                            {edital.organ}
                                                        </h3>
                                                        <div className="min-w-0 text-[12px] font-bold uppercase leading-snug text-zinc-300">
                                                            <span className="mr-2 text-[9px] font-black text-zinc-600 tracking-[0.16em]">Cargo</span>
                                                            <span title={edital.position || 'Não informado'}>{edital.position || 'Não informado'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Ano e data */}
                                                    <div className="flex flex-wrap items-center gap-2 xl:flex-col xl:items-start xl:gap-1">
                                                        <span className="rounded-md border border-white/5 bg-secondary/60 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{edital.year}</span>
                                                        {edital.exam_date && (
                                                            <span className="rounded-md border border-primary/15 bg-primary/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary/85">
                                                                {new Date(edital.exam_date).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Métricas */}
                                                    <div className="flex min-w-[118px] items-center gap-4 xl:flex-col xl:items-start xl:gap-1 xl:border-l xl:border-white/5 xl:pl-5">
                                                        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                                                                <span className={`text-base font-black leading-none tracking-tighter ${subjectsCount === 0 ? 'text-amber-500 animate-pulse' : 'text-primary'}`}>{subjectsCount}</span>
                                                                <span className={`text-[10px] font-black uppercase tracking-tighter ${subjectsCount === 0 ? 'text-amber-500/60' : 'text-primary/60'}`}>Matérias</span>
                                                        </div>
                                                        <div className={`flex items-baseline gap-1.5 whitespace-nowrap ${topicsCount === 0 ? 'opacity-100' : 'opacity-35'}`}>
                                                                <span className={`text-xs font-black leading-none tracking-tighter ${topicsCount === 0 ? 'text-amber-500' : 'text-white'}`}>{topicsCount}</span>
                                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${topicsCount === 0 ? 'text-amber-500/60' : 'text-white'}`}>Tópicos</span>
                                                        </div>
                                                    </div>

                                                    <div className="absolute right-4 top-4 flex items-center justify-center xl:static xl:border-l xl:border-white/5 xl:pl-4">
                                                        <div className="relative flex w-12 items-center justify-center">
                                                            {/* Visibilidade Padrão: Status */}
                                                            <div className="flex flex-col items-center gap-1 group-hover:opacity-0 group-hover:scale-75 transition-all duration-300">
                                                                {edital.is_public ? (
                                                                    <>
                                                                        <Globe size={18} className="text-emerald-500" />
                                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Pub</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <EyeOff size={18} className="text-zinc-600" />
                                                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Priv</span>
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Visibilidade Hover: Ações Verticais */}
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); openEditForm(edital); }} 
                                                                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                                    title="Editar Edital"
                                                                >
                                                                    <Edit3 size={18} />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(edital.id); }} 
                                                                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                    title="Excluir Edital"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Overlay de Confirmação de Exclusão */}
                                                {confirmDeleteId === edital.id && (
                                                    <div onClick={(e) => e.stopPropagation()} className="absolute inset-0 bg-red-950/95 backdrop-blur-md flex items-center justify-center px-6 z-20">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2">
                                                                <AlertTriangle size={18} className="text-red-500 animate-bounce" />
                                                                <h4 className="text-white font-black uppercase tracking-widest text-xs">Excluir edital?</h4>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setConfirmDeleteId(null)} className="h-9 px-5 bg-white/10 text-white text-[10px] font-black rounded-lg hover:bg-white/20 transition-all uppercase">Não</button>
                                                                <button onClick={() => handleDelete(edital.id)} className="h-9 px-5 bg-red-600 text-white text-[10px] font-black rounded-lg hover:bg-red-500 transition-all uppercase">Sim, Excluir</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ─── ABA SOLICITAÇÕES ─── */}
                    {activeTab === 'solicitacoes' && (
                        <motion.div key="sol" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                            {loadingSuggestions ? (
                                <div className="py-20 text-center"><LoadingSpinner size="large" /></div>
                            ) : suggestions.length === 0 ? (
                                <div className="py-20 text-center bg-zinc-900/40 border border-white/5 rounded-3xl">
                                    <MessageSquare size={48} className="mx-auto text-zinc-800 mb-4" />
                                    <h3 className="text-sm font-black text-content-muted uppercase tracking-widest">Tudo limpo!</h3>
                                    <p className="text-xs text-zinc-600 mt-1">Nenhuma solicitação pendente.</p>
                                </div>
                            ) : (
                                suggestions.map(s => (
                                    <motion.div 
                                        key={s.id} 
                                        layout 
                                        className="bg-card border border-border rounded-3xl p-6 transition-all hover:border-primary/20 relative overflow-hidden group"

                                    >
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg border uppercase tracking-widest ${STATUS_BADGE[s.status].cls}`}>
                                                        {STATUS_BADGE[s.status].label}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1.5">
                                                        <Clock size={12} /> {new Date(s.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-black text-foreground dark:text-white tracking-tight uppercase mb-2">
                                                    {s.concurso}
                                                </h3>
                                                
                                                {s.response_message && (
                                                    <div className="mt-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Resposta do Sistema:</p>
                                                        <p className="text-sm text-content-muted italic">"{s.response_message}"</p>
                                                    </div>
                                                )}
                                            </div>

                                            {s.status === 'pending' && respondingId !== s.id && (
                                                <button
                                                    onClick={() => { setRespondingId(s.id); setSelectedTemplate('cadastrado'); setCustomMessage(RESPONSE_TEMPLATES['cadastrado']); }}
                                                    className="h-11 px-6 bg-primary/10 text-primary text-xs font-black rounded-2xl hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2 shrink-0 border border-primary/20 uppercase tracking-widest sm:self-start"
                                                >
                                                    <Send size={14} /> Responder
                                                </button>
                                            )}
                                        </div>

                                        <AnimatePresence>
                                            {respondingId === s.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-6 pt-6 border-t border-white/5 space-y-6 overflow-hidden"
                                                >
                                                    <div>
                                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 block">Selecione um Modelo</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => { setSelectedTemplate('cadastrado'); setCustomMessage(RESPONSE_TEMPLATES['cadastrado']); }}
                                                                className={`flex items-center gap-2 px-4 h-10 border text-[10px] font-black transition-all uppercase tracking-widest rounded-xl ${selectedTemplate === 'cadastrado' ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-white/5 text-content-muted hover:text-white hover:bg-white/10'}`}
                                                            >
                                                                <CheckSquare size={14} /> Cadastrado
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedTemplate('ja_cadastrado'); setCustomMessage(RESPONSE_TEMPLATES['ja_cadastrado']); }}
                                                                className={`flex items-center gap-2 px-4 h-10 border text-[10px] font-black transition-all uppercase tracking-widest rounded-xl ${selectedTemplate === 'ja_cadastrado' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 border-white/5 text-content-muted hover:text-white hover:bg-white/10'}`}
                                                            >
                                                                <Info size={14} /> Já Existe
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedTemplate('nao_cadastrado'); setCustomMessage(RESPONSE_TEMPLATES['nao_cadastrado']); }}
                                                                className={`flex items-center gap-2 px-4 h-10 border text-[10px] font-black transition-all uppercase tracking-widest rounded-xl ${selectedTemplate === 'nao_cadastrado' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-white/5 border-white/5 text-content-muted hover:text-white hover:bg-white/10'}`}
                                                            >
                                                                <XCircle size={14} /> Rejeitar
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden p-1 focus-within:border-primary/30 transition-all">
                                                        <textarea
                                                            value={customMessage}
                                                            onChange={e => setCustomMessage(e.target.value)}
                                                            rows={3}
                                                            className="w-full bg-transparent px-5 py-4 text-sm font-medium text-content-main dark:text-white outline-none resize-none placeholder:text-zinc-700"
                                                            placeholder="Escreva sua mensagem personalizada..."
                                                        />
                                                    </div>

                                                    <div className="flex justify-end gap-3 items-center">
                                                        <button onClick={() => setRespondingId(null)} className="px-6 py-2 text-xs font-black text-zinc-500 hover:text-white transition-colors uppercase">Cancelar</button>
                                                        <button
                                                            onClick={() => handleRespond(s)}
                                                            disabled={sendingResponse}
                                                            className="h-11 px-8 bg-primary hover:bg-primary/90 text-white text-xs font-black rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-primary/20 uppercase tracking-widest"
                                                        >
                                                            {sendingResponse ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                            Enviar Resposta
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Margem final para o scroll respirar na lista */}
                <div className="h-20" />
            </div>

            {/* Admin Subjects Management Modal */}
            <AdminEditalSubjectsModal
                isOpen={isSubjectsModalOpen}
                onClose={() => {
                    setIsSubjectsModalOpen(false);
                    fetchEditais();
                }}
                edital={selectedEditalForSubjects}
                onUpdate={fetchEditais}
            />

            {/* Modal de Adição com picker IA/Manual */}
            <AdminAddEditalModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchEditais}
            />
        </div>
    );
};

export default AdminEditais;
