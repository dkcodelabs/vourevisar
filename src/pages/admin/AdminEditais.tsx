import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Trash2, Edit3, Save, X,
    AlertCircle, MessageSquare, 
    Clock, CheckCheck, Loader2, Globe, EyeOff, 
    Send, CheckSquare, Info, XCircle, FileText,
    CalendarDays, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { errorService } from '@/lib/errors/errorService';
import { AdminEditalSubjectsModal } from '@/components/admin/AdminEditalSubjectsModal';


interface PublicEdital {
    id: string;
    organ: string;
    position: string;
    year: string;
    category: string;
    is_public?: boolean;
    status?: string;
    created_at?: string;
    subjects?: any[];
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
    is_public: true,
};

const AdminEditais = () => {
    const [activeTab, setActiveTab] = useState<'editais' | 'solicitacoes'>('editais');
    const [editais, setEditais] = useState<PublicEdital[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddingNew, setIsAddingNew] = useState(false);
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
            const { data, error } = await (supabase as any)
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
            const { data } = await (supabase as any)
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

    const openAddForm = () => {
        setForm(EMPTY_FORM);
        setCategoryDraft('Carreiras Policiais');
        setIsAddingNew(true);
        setEditingId(null);
    };

    const openEditForm = (edital: PublicEdital) => {
        setForm({
            organ: edital.organ,
            position: edital.position,
            year: edital.year,
            category: edital.category,
            is_public: edital.is_public ?? true,
        });
        setCategoryDraft(edital.category);
        setEditingId(edital.id);
        setIsAddingNew(false);
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
            is_public: form.is_public,
            status: 'published'
        };

        setSavingEdital(true);
        try {
            let error;
            if (editingId) {
                const { error: err } = await (supabase as any).from('public_editais').update(payload).eq('id', editingId);
                error = err;
            } else {
                // Remove subject data completely if any legacy reference tries to assert it
                const { error: err } = await (supabase as any).from('public_editais').insert([payload]);
                error = err;
            }
            if (error) throw error;
            
            toast.success(editingId ? 'Edital atualizado!' : 'Edital cadastrado!');
            setIsAddingNew(false);
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
            const { error } = await (supabase as any).from('public_editais').delete().eq('id', id);
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
            const { error: suggErr } = await (supabase as any).from('edital_suggestions').update({
                status: selectedTemplate,
                response_message: msg,
                responded_at: new Date().toISOString(),
            }).eq('id', suggestion.id);
            if (suggErr) throw suggErr;

            await (supabase as any).from('user_notifications').insert({
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
        editais.filter(e => `${e.organ} ${e.position}`.toLowerCase().includes(searchQuery.toLowerCase())),
        [editais, searchQuery]
    );

    const pendingCount = suggestions.filter(s => s.status === 'pending').length;
    const isFormOpen = isAddingNew || !!editingId;

    return (
        <div className="min-h-screen p-4 md:p-8 bg-background text-foreground">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* ─── TOOLBAR SUPERIOR ─── */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full mb-8">
                    
                    {/* Abas Esquerda */}
                    <div className="flex items-center p-1.5 bg-zinc-900/50 rounded-full border border-white/5 backdrop-blur-md shrink-0 w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('editais')}
                            className={`flex flex-1 md:flex-none items-center justify-center gap-2 px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                                activeTab === 'editais' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <FileText size={16} /> Editais
                        </button>
                        <button
                            onClick={() => setActiveTab('solicitacoes')}
                            className={`flex flex-1 md:flex-none relative items-center justify-center gap-2 px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                                activeTab === 'solicitacoes' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <MessageSquare size={16} /> Solicitações
                            {pendingCount > 0 && (
                                <span className="absolute top-1 right-2 w-5 h-5 rounded-full bg-amber-500 text-amber-950 font-black text-[10px] flex items-center justify-center border-2 border-zinc-900">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Controles Direita */}
                    <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input
                                placeholder="Buscar por cargo/órgão..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-zinc-900/70 border-none rounded-full pl-11 pr-5 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600"
                            />
                        </div>

                        <button
                            onClick={openAddForm}
                            className="h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-full transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 shrink-0"
                        >
                            <Plus size={18} /> Cadastrar
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {/* ─── ABA EDITAIS ─── */}
                    {activeTab === 'editais' && (
                        <motion.div key="ed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                            {/* Formulário de Cadastro / Edição Centralizado */}
                            <AnimatePresence>
                                {isFormOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden mb-6"
                                    >
                                        <div className="bg-[#1A1A1F] border border-white/5 rounded-2xl p-6 shadow-2xl mx-auto w-full">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-2 text-emerald-400">
                                                    <Plus size={18} className={editingId ? 'text-cyan-400' : 'text-emerald-400'} />
                                                    <h2 className={`text-base font-bold ${editingId ? 'text-white' : 'text-white'}`}>
                                                        {editingId ? 'Editar Edital' : 'Cadastrar Novo Edital'}
                                                    </h2>
                                                </div>
                                                <button onClick={() => { setIsAddingNew(false); setEditingId(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-wider">Órgão / Sigla</label>
                                                    <input
                                                        value={form.organ}
                                                        onChange={e => setForm(p => ({ ...p, organ: e.target.value }))}
                                                        placeholder="PMES"
                                                        className="w-full h-11 bg-zinc-950 border border-transparent rounded-xl px-4 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-wider">Cargo</label>
                                                    <input
                                                        value={form.position}
                                                        onChange={e => setForm(p => ({ ...p, position: e.target.value }))}
                                                        placeholder="Soldado"
                                                        className="w-full h-11 bg-zinc-950 border border-transparent rounded-xl px-4 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-wider">Ano</label>
                                                    <input
                                                        value={form.year}
                                                        onChange={e => setForm(p => ({ ...p, year: e.target.value }))}
                                                        placeholder="2026"
                                                        className="w-full h-11 bg-zinc-950 border border-transparent rounded-xl px-4 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-2 relative">
                                                    <label className="text-[10px] font-bold text-zinc-500 uppercase ml-1 tracking-wider">Categoria</label>
                                                    <input
                                                        value={categoryDraft}
                                                        onChange={e => { setCategoryDraft(e.target.value); setShowCategoryDropdown(true); }}
                                                        onFocus={() => setShowCategoryDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                                                        className="w-full h-11 bg-zinc-950 border border-transparent rounded-xl px-4 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                                                    />
                                                    <AnimatePresence>
                                                        {showCategoryDropdown && (
                                                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-30 top-[60px] left-0 right-0 bg-background border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 max-h-48 overflow-y-auto">
                                                                {PRESET_CATEGORIES.filter(c => c.toLowerCase().includes(categoryDraft.toLowerCase())).map(cat => (
                                                                    <button key={cat} onMouseDown={() => { setCategoryDraft(cat); setShowCategoryDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-zinc-300 transition-all">{cat}</button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 mb-6">
                                                <button
                                                    onClick={() => setForm(p => ({ ...p, is_public: !p.is_public }))}
                                                >
                                                    <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${form.is_public ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
                                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${form.is_public ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                </button>
                                                <div className="flex items-center gap-2 text-sm text-zinc-300 font-medium cursor-pointer" onClick={() => setForm(p => ({ ...p, is_public: !p.is_public }))}>
                                                    <Globe size={14} className="text-emerald-400" />
                                                    Visível no catálogo para todos
                                                </div>
                                            </div>

                                            {/* Disclaimer visual conforme solicitado */}
                                            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-6 font-medium italic">
                                                <span className="text-yellow-500/80 text-base">💡</span> Após salvar, clique no edital para adicionar matérias e tópicos.
                                            </div>

                                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                                <button onClick={() => { setIsAddingNew(false); setEditingId(null); }} className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                                                <button
                                                    onClick={handleSave}
                                                    disabled={savingEdital}
                                                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
                                                >
                                                    {savingEdital ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    Salvar Edital
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Lista Clean de Editais (Row-like) */}
                            <div className="flex flex-col gap-2 bg-[#1A1A1F]/50 rounded-2xl p-2">
                                {isLoading ? (
                                    <div className="py-20 text-center"><LoadingSpinner size="large" /></div>
                                ) : filteredEditais.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <AlertCircle size={32} className="mx-auto text-zinc-700 mb-3" />
                                        <p className="text-zinc-500 text-sm">Nenhum edital corresponde à busca ou o catálogo está vazio.</p>
                                    </div>
                                ) : (
                                    filteredEditais.map(edital => (
                                        <motion.div
                                            key={edital.id}
                                            layout
                                            onClick={() => {
                                                setSelectedEditalForSubjects(edital);
                                                setIsSubjectsModalOpen(true);
                                            }}
                                            className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 px-5 rounded-xl transition-all hover:bg-white/5 cursor-pointer"
                                        >
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                                    <span className="font-bold text-white text-base group-hover:text-cyan-400 transition-colors">{edital.organ}</span>
                                                    <span className="text-zinc-600">·</span>
                                                    <span className="text-zinc-400 font-medium">{edital.position}</span>
                                                    <span className="text-zinc-600">·</span>
                                                    <span className="text-zinc-400 font-medium flex items-center gap-1"><CalendarDays size={14}/> {edital.year}</span>
                                                    {edital.is_public ? (
                                                        <span className="text-emerald-400/90 font-medium text-[11px] flex items-center gap-1 ml-2"><Globe size={11}/> Público</span>
                                                    ) : (
                                                        <span className="text-red-400/90 font-medium text-[11px] flex items-center gap-1 ml-2"><EyeOff size={11}/> Privado</span>
                                                    )}
                                                    <span className="text-[10px] font-black text-cyan-500/0 group-hover:text-cyan-500/60 uppercase tracking-widest ml-auto transition-all hidden md:inline">Gerenciar Conteúdo</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                                        {edital.category}
                                                    </div>
                                                    {edital.subjects && edital.subjects.length > 0 ? (
                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest pr-4">
                                                            <span>{edital.subjects.length} Matérias</span>
                                                            <span className="text-zinc-700 mx-1">•</span>
                                                            <span>{edital.subjects.reduce((acc: number, s: any) => acc + (s.topics?.length || 0), 0)} Tópicos</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                            <AlertTriangle size={12} /> Sem matérias
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-3 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openEditForm(edital); }} 
                                                    className="w-9 h-9 flex items-center justify-center bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-all"
                                                    title="Editar Detalhes"
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(edital.id); }} 
                                                    className="w-9 h-9 flex items-center justify-center bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-all"
                                                    title="Excluir Edital"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>

                                            {confirmDeleteId === edital.id && (
                                                <div onClick={(e) => e.stopPropagation()} className="absolute inset-0 bg-red-950/90 rounded-xl flex items-center justify-center gap-4 z-10">
                                                    <span className="text-sm text-red-100 font-bold">Excluir edital?</span>
                                                    <button onClick={() => setConfirmDeleteId(null)} className="px-3 py-1.5 text-xs text-red-200 hover:text-white transition-all">Cancelar</button>
                                                    <button onClick={() => handleDelete(edital.id)} className="px-5 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-500 shadow-lg">Sim, excluir</button>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))
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
                                <div className="py-20 text-center">
                                    <MessageSquare size={32} className="mx-auto text-zinc-700 mb-3" />
                                    <h3 className="text-base font-bold text-zinc-400">Tudo limpo!</h3>
                                    <p className="text-zinc-600 text-sm">Nenhuma solicitação nova por aqui.</p>
                                </div>
                            ) : (
                                suggestions.map(s => (
                                    <motion.div 
                                        key={s.id} 
                                        layout 
                                        className="bg-[#1A1A1F]/80 border border-white/5 rounded-2xl p-6 transition-all shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border border-current ${STATUS_BADGE[s.status].cls}`}>
                                                        {STATUS_BADGE[s.status].label}
                                                    </span>
                                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                        <Clock size={12} /> {new Date(s.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                                <p className="text-lg font-bold text-white tracking-tight">{s.concurso}</p>
                                                
                                                {s.response_message && (
                                                    <div className="mt-4 inline-block bg-zinc-950/50 rounded-lg p-3 border border-white/5">
                                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Resposta enviada</p>
                                                        <p className="text-sm text-zinc-300 italic">{s.response_message}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {s.status === 'pending' && respondingId !== s.id && (
                                                <button
                                                    onClick={() => { setRespondingId(s.id); setSelectedTemplate('cadastrado'); setCustomMessage(RESPONSE_TEMPLATES['cadastrado']); }}
                                                    className="px-5 py-2.5 bg-cyan-500/10 text-cyan-400 text-sm font-bold rounded-xl hover:bg-cyan-500/20 transition-all flex items-center gap-2 shrink-0 border border-cyan-500/20"
                                                >
                                                    <Send size={15} /> Responder
                                                </button>
                                            )}
                                        </div>

                                        <AnimatePresence>
                                            {respondingId === s.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-6 pt-6 border-t border-white/5 space-y-5 overflow-hidden"
                                                >
                                                    <div>
                                                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Selecionar Resposta</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => { setSelectedTemplate('cadastrado'); setCustomMessage(RESPONSE_TEMPLATES['cadastrado']); }}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${selectedTemplate === 'cadastrado' ? 'bg-zinc-800 border-zinc-700 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-emerald-400/70'}`}
                                                            >
                                                                <CheckSquare size={14} /> FOI CADASTRADO
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedTemplate('ja_cadastrado'); setCustomMessage(RESPONSE_TEMPLATES['ja_cadastrado']); }}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${selectedTemplate === 'ja_cadastrado' ? 'bg-zinc-800 border-zinc-700 text-cyan-400' : 'border-transparent text-zinc-500 hover:text-cyan-400/70'}`}
                                                            >
                                                                <Info size={14} /> JÁ CADASTRADO
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedTemplate('nao_cadastrado'); setCustomMessage(RESPONSE_TEMPLATES['nao_cadastrado']); }}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${selectedTemplate === 'nao_cadastrado' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'border-transparent text-zinc-500 hover:text-red-500/70'}`}
                                                            >
                                                                <XCircle size={14} /> NÃO CADASTRADO
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="bg-zinc-950 border border-white/5 rounded-xl overflow-hidden p-1">
                                                        <textarea
                                                            value={customMessage}
                                                            onChange={e => setCustomMessage(e.target.value)}
                                                            rows={2}
                                                            className="w-full bg-transparent px-3 py-3 text-sm text-zinc-300 outline-none resize-none font-medium"
                                                        />
                                                    </div>

                                                    <div className="flex justify-end gap-3 items-center">
                                                        <button onClick={() => setRespondingId(null)} className="px-5 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">Cancelar</button>
                                                        <button
                                                            onClick={() => handleRespond(s)}
                                                            disabled={sendingResponse}
                                                            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg"
                                                        >
                                                            {sendingResponse ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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
                    fetchEditais(); // Refresh background data
                }}
                edital={selectedEditalForSubjects}
                onUpdate={fetchEditais}
            />
        </div>
    );
};

export default AdminEditais;
