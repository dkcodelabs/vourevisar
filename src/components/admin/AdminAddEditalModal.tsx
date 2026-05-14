import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Sparkles, Plus, ArrowLeft, Save, Globe, Info, Loader2,
    ChevronDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { errorService } from '@/lib/errors/errorService';
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import { Subject } from '@/types';

type Mode = null | 'ia' | 'manual';

const PRESET_CATEGORIES = [
    'Carreiras Policiais', 'Judiciário', 'Administrativo',
    'Bancárias', 'Educação', 'Saúde', 'Militar', 'Outros',
];

const EMPTY_FORM = {
    organ: '',
    position: '',
    year: new Date().getFullYear().toString(),
    category: 'Carreiras Policiais',
    exam_date: '',
    is_public: true,
};

interface AdminAddEditalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AdminAddEditalModal = ({ isOpen, onClose, onSuccess }: AdminAddEditalModalProps) => {
    const { user } = useAuth();
    const [mode, setMode] = useState<Mode>(null);

    // Manual form state
    const [form, setForm] = useState(EMPTY_FORM);
    const [categoryDraft, setCategoryDraft] = useState('Carreiras Policiais');
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [saving, setSaving] = useState(false);

    // IA modal state
    const [showIaModal, setShowIaModal] = useState(false);

    const resetAndClose = () => {
        setMode(null);
        setForm(EMPTY_FORM);
        setCategoryDraft('Carreiras Policiais');
        setShowIaModal(false);
        onClose();
    };

    const handleSelectMode = (selected: 'ia' | 'manual') => {
        setMode(selected);
        if (selected === 'ia') {
            setShowIaModal(true);
        }
    };

    const handleBackToPicker = () => {
        setMode(null);
        setShowIaModal(false);
    };

    // Handler chamado pelo ImportEditalModal após extração IA bem-sucedida
    // Salva o resultado direto em public_editais (catálogo global)
    const handleIaImport = async (
        subjects: Subject[],
        editalName?: string,
        _isImported?: boolean,
        _sourceId?: string,
        extraInfo?: { organ: string; position: string; year: string; category?: string; exam_date?: string }
    ) => {
        if (!user) return;

        // Mapeia subjects para o formato JSONB de public_editais
        const mappedSubjects = subjects.map(s => ({
            id: s.id,
            name: s.name,
            topics: (s.topics || []).map(t => ({ id: t.id, name: t.name })),
        }));

        const payload = {
            organ: (extraInfo?.organ || editalName || '').trim(),
            position: (extraInfo?.position || '').trim(),
            year: (extraInfo?.year || new Date().getFullYear().toString()).trim(),
            category: extraInfo?.category || 'Outros',
            exam_date: extraInfo?.exam_date || null,
            is_public: true,
            status: 'published',
            subjects: mappedSubjects,
            created_by: user.id,
        };

        const { error } = await (supabase as any).from('public_editais').insert([payload]);
        if (error) throw error;

        toast.success('Edital importado pela IA e adicionado ao catálogo!');
        setShowIaModal(false);
        setMode(null);
        onSuccess();
        onClose();
    };

    const handleSaveManual = async () => {
        if (!form.organ.trim() || !form.position.trim() || !form.year.trim()) {
            toastGate.notifyError('Órgão, Cargo e Ano são obrigatórios!', 'VAL-ADM-01', { severity: 'low' });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                organ: form.organ.trim(),
                position: form.position.trim(),
                year: form.year.trim(),
                category: categoryDraft || form.category,
                exam_date: form.exam_date || null,
                is_public: form.is_public,
                status: 'published',
                created_by: user?.id ?? null,
            };

            const { error } = await (supabase as any).from('public_editais').insert([payload]);
            if (error) throw error;

            toast.success('Edital cadastrado com sucesso!');
            onSuccess();
            resetAndClose();
        } catch (err) {
            errorService.report(err, {
                module: 'AdminAddEditalModal',
                action: 'saveManual',
                userMessage: 'Erro ao salvar edital.',
            });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* ── Modal principal (picker + manual) ── */}
            <AnimatePresence>
                {isOpen && !showIaModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={resetAndClose}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    {mode === 'manual' && (
                                        <button
                                            onClick={handleBackToPicker}
                                            className="mr-1 p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-content-muted hover:text-foreground"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                    )}
                                    <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 tracking-normal">
                                        {mode === null ? 'Adicionar ao Catálogo' : 'Criar Manualmente'}
                                    </h2>
                                    {mode === null && (
                                        <p className="text-[11px] text-content-muted font-medium italic hidden md:block border-l border-border/50 dark:border-white/10 pl-3">
                                            Escolha como deseja adicionar o edital ao catálogo público
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={resetAndClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-content-muted"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="overflow-y-auto no-scrollbar flex-1 pt-2 px-5 pb-5">
                                <AnimatePresence mode="wait">
                                    {/* ── PICKER ── */}
                                    {mode === null && (
                                        <motion.div
                                            key="picker"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="py-6 grid grid-cols-2 gap-4"
                                        >
                                            {/* IA */}
                                            <button
                                                onClick={() => handleSelectMode('ia')}
                                                className="group relative flex flex-col items-start justify-between gap-6 p-6 bg-secondary/40 dark:bg-white/[0.03] hover:bg-primary/5 dark:hover:bg-primary/10 border border-border dark:border-white/5 hover:border-primary/40 rounded-2xl transition-all text-left overflow-hidden"
                                            >
                                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-all" />
                                                <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-2xl flex items-center justify-center transition-all shrink-0 z-10">
                                                    <Sparkles size={24} className="text-primary" />
                                                </div>
                                                <div className="z-10">
                                                    <p className="text-sm font-black text-foreground uppercase tracking-wider mb-1">IA</p>
                                                    <p className="text-xs text-content-muted font-medium leading-relaxed">
                                                        Importar edital via PDF ou texto com extração automática de matérias
                                                    </p>
                                                </div>
                                            </button>

                                            {/* Manual */}
                                            <button
                                                onClick={() => handleSelectMode('manual')}
                                                className="group relative flex flex-col items-start justify-between gap-6 p-6 bg-secondary/40 dark:bg-white/[0.03] hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border border-border dark:border-white/5 hover:border-emerald-500/40 rounded-2xl transition-all text-left overflow-hidden"
                                            >
                                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:bg-emerald-500/10 transition-all" />
                                                <div className="w-12 h-12 bg-emerald-500/10 group-hover:bg-emerald-500/20 rounded-2xl flex items-center justify-center transition-all shrink-0 z-10">
                                                    <Plus size={24} className="text-emerald-500" />
                                                </div>
                                                <div className="z-10">
                                                    <p className="text-sm font-black text-foreground uppercase tracking-wider mb-1">Manual</p>
                                                    <p className="text-xs text-content-muted font-medium leading-relaxed">
                                                        Cadastrar edital manualmente preenchendo os dados do concurso
                                                    </p>
                                                </div>
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* ── FORMULÁRIO MANUAL ── */}
                                    {mode === 'manual' && (
                                        <motion.div
                                            key="manual"
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="py-4 space-y-6"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                                <div className="space-y-2 relative">
                                                    <label className="text-xs font-black text-content-muted uppercase tracking-widest px-1">Categoria</label>
                                                    <div className="relative">
                                                        <input
                                                            value={categoryDraft}
                                                            onChange={e => { setCategoryDraft(e.target.value); setShowCategoryDropdown(true); }}
                                                            onFocus={() => setShowCategoryDropdown(true)}
                                                            onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                                                            placeholder="Selecione ou digite..."
                                                            className="w-full h-12 bg-secondary dark:bg-zinc-900/40 border border-border dark:border-white/5 rounded-2xl px-5 pr-10 text-sm font-medium text-content-main dark:text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-content-muted/30"
                                                        />
                                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                                                    </div>
                                                    <AnimatePresence>
                                                        {showCategoryDropdown && (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: -10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="absolute z-30 top-full mt-1 left-0 right-0 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden py-2 max-h-48 overflow-y-auto"
                                                            >
                                                                {PRESET_CATEGORIES.filter(c =>
                                                                    c.toLowerCase().includes(categoryDraft.toLowerCase())
                                                                ).map(cat => (
                                                                    <button
                                                                        key={cat}
                                                                        onMouseDown={() => { setCategoryDraft(cat); setShowCategoryDropdown(false); }}
                                                                        className="w-full text-left px-5 py-3 hover:bg-secondary text-sm font-medium text-content-muted hover:text-foreground transition-all"
                                                                    >
                                                                        {cat}
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* Visibilidade */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-secondary border border-border rounded-2xl">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => setForm(p => ({ ...p, is_public: !p.is_public }))}
                                                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 shadow-inner ${form.is_public ? 'bg-emerald-500' : 'bg-zinc-600/40'}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform duration-300 ${form.is_public ? 'translate-x-7' : 'translate-x-1'}`} />
                                                    </button>
                                                    <div className="flex flex-col cursor-pointer" onClick={() => setForm(p => ({ ...p, is_public: !p.is_public }))}>
                                                        <span className="text-sm font-black text-foreground dark:text-white flex items-center gap-2">
                                                            <Globe size={16} className={form.is_public ? 'text-emerald-500' : 'text-content-muted'} />
                                                            Visibilidade Pública
                                                        </span>
                                                        <span className="text-xs text-content-muted font-medium">
                                                            {form.is_public ? 'Visível para todos os alunos' : 'Acesso restrito via Admin'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/10 text-[11px] font-bold text-amber-500 rounded-xl leading-tight">
                                                    <Info size={14} className="shrink-0" />
                                                    Matérias configuráveis após salvar
                                                </div>
                                            </div>

                                            {/* Autoria */}
                                            <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border border-primary/10 rounded-2xl">
                                                <Info size={14} className="text-primary shrink-0" />
                                                <p className="text-[11px] font-medium text-primary/80">
                                                    Este edital será vinculado à sua conta de administrador ({user?.email}) para rastreabilidade.
                                                </p>
                                            </div>

                                            {/* Ações */}
                                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-white/5">
                                                <button
                                                    onClick={handleBackToPicker}
                                                    className="px-6 py-3 text-sm font-black text-content-muted hover:text-foreground transition-colors"
                                                >
                                                    VOLTAR
                                                </button>
                                                <button
                                                    onClick={handleSaveManual}
                                                    disabled={saving}
                                                    className="h-12 px-10 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-black rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                                >
                                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                                    SALVAR EDITAL
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Modal de IA: reutiliza ImportEditalModal com onImport customizado ── */}
            <ImportEditalModal
                isOpen={showIaModal}
                onClose={() => {
                    setShowIaModal(false);
                    setMode(null);
                }}
                onImport={handleIaImport}
                subjects={[]}
                userEditais={[]}
                initialTab="ia"
            />
        </>
    );
};
