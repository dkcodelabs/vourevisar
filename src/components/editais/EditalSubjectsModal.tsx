/**
 * EditalSubjectsModal — estado local otimista (sem reload durante uso)
 * - UI atualiza IMEDIATAMENTE, sem chamar refreshData() enquanto modal está aberto
 * - refreshData() só é chamado ao FECHAR o modal
 * - Confirmação de exclusão inline (sem window.confirm)
 * - Inputs sem ring/outline de foco
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, X, Trash2, Check, BookOpen, GraduationCap,
    ChevronDown, ChevronUp, ChevronsUpDown, FileText, Circle, CheckCircle2, Loader2, AlertTriangle, EyeOff, Eye,
    Database, Save
} from 'lucide-react';
import { Subject, Topic } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useEditalOrigins } from '@/hooks/useEditalOrigins';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import type { UserEdital } from '@/pages/Editais';

interface EditalSubjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    edital: UserEdital;
    allSubjects: Subject[];
    onUpdate: (updated: UserEdital) => void;
}

const editaisTable = () => (supabase as any).from('user_editais');
const tmpId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

function getProgress(subject: Subject) {
    if (!subject.topics.length) return 0;
    return Math.round((subject.topics.filter(t => t.completed).length / subject.topics.length) * 100);
}

function getTopicStatus(topic: Topic): { label: string; color: string } {
    if (topic.completed) return { label: 'CONCLUÍDO', color: 'text-emerald-500' };
    if ((topic.reviewCount ?? 0) > 0 || topic.first_studied_at) return { label: 'ESTUDADO', color: 'text-primary/60' };
    return { label: 'NÃO INICIADO', color: 'text-primary/60' };
}

export const EditalSubjectsModal = ({
    isOpen, onClose, edital, allSubjects, onUpdate
}: EditalSubjectsModalProps) => {
    const { user } = useAuth();
    const { refreshData } = useApp();
    const { refresh: refreshOrigins } = useEditalOrigins();

    // ── Estado local otimista ────────────────────────────────────────────
    const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
    const [localEditalIds, setLocalEditalIds] = useState<string[]>([]);
    // IDs das matérias ativas (visíveis na pág. Matérias) — subconjunto de localEditalIds
    const [localActiveIds, setLocalActiveIds] = useState<string[]>([]);
    // Flag: só inicializa ao abrir, ignora mudanças externas enquanto modal está aberto
    const initializedRef = useRef(false);
    // Flag: houve mudanças que precisam de sync ao fechar
    const hasPendingSync = useRef(false);

    useEffect(() => {
        if (isOpen && !initializedRef.current) {
            // Primeira abertura: inicializa estado local
            setLocalSubjects(allSubjects.filter(s => edital.subjectIds.includes(s.id)));
            setLocalEditalIds(edital.subjectIds);
            // Inicializa IDs ativos (usa activeSubjectIds se existir, senão usa subjectIds)
            setLocalActiveIds(edital.activeSubjectIds?.length ? edital.activeSubjectIds : edital.subjectIds);
            initializedRef.current = true;
            hasPendingSync.current = false;
        }
        if (!isOpen) {
            initializedRef.current = false;
        }
    }, [isOpen]); // ←— INTENCIONALMENTE só depende de isOpen, não de allSubjects

    // ── UI state ─────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isSavingSubject, setIsSavingSubject] = useState(false);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [newTopicTexts, setNewTopicTexts] = useState<Record<string, string>>({});
    const [savingTopics, setSavingTopics] = useState<Record<string, boolean>>({});
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [editingTopicName, setEditingTopicName] = useState('');
    // Estado de confirmação inline para matéria
    const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<string | null>(null);
    // Estado de confirmação inline para tópico
    const [confirmDeleteTopicId, setConfirmDeleteTopicId] = useState<string | null>(null);
    const [notesModal, setNotesModal] = useState<{ isOpen: boolean; subjectId: string; subjectName: string }>({
        isOpen: false, subjectId: '', subjectName: ''
    });

    // ── Fechar modal + sync ───────────────────────────────────────────────
    const handleClose = useCallback(() => {
        if (hasPendingSync.current) {
            // Sincroniza globalmente ao fechar (não durante uso)
            refreshData();
            refreshOrigins();
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
        }
        setConfirmDeleteSubjectId(null);
        setSearchQuery('');
        onClose();
    }, [onClose, refreshData, refreshOrigins]);

    // ── Derivados ─────────────────────────────────────────────────────────
    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return localSubjects;
        const q = searchQuery.toLowerCase();
        return localSubjects.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.topics.some(t => t.name.toLowerCase().includes(q))
        );
    }, [localSubjects, searchQuery]);

    const totalTopics = localSubjects.reduce((sum, s) => sum + s.topics.length, 0);
    const completedTopics = localSubjects.reduce((sum, s) => sum + s.topics.filter(t => t.completed).length, 0);

    useEffect(() => {
        if (searchQuery.trim()) setExpandedIds(filteredSubjects.map(s => s.id));
    }, [searchQuery, filteredSubjects]);

    const toggleExpand = (id: string) =>
        setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    // ── Salvar nova matéria ───────────────────────────────────────────────
    const handleSaveSubject = useCallback(async () => {
        const name = newSubjectName.trim();
        if (!name || !user || isSavingSubject) return;
        if (localSubjects.find(s => s.name.toLowerCase() === name.toLowerCase())) {
            errorService.report(new Error('Duplicate subject'), {
                module: 'EditalSubjectsModal', action: 'saveSubject',
                userMessage: `A matéria "${name}" já existe neste edital.`
            });
            return;
        }
        setIsSavingSubject(true);
        const placeholderId = tmpId();
        const placeholder: Subject = {
            id: placeholderId, name, status: 'Nova', topics: [],
            order: localSubjects.length, created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(), notes: null, user_id: user.id,
        } as unknown as Subject;

        setLocalSubjects(prev => [...prev, placeholder]);
        setExpandedIds([placeholderId]);
        setNewSubjectName('');

        try {
            const { data: newSubj, error: subjErr } = await supabase
                .from('subjects').insert({ user_id: user.id, name, status: 'Nova' })
                .select('id').single();
            if (subjErr) throw subjErr;

            const updatedIds = [...localEditalIds, newSubj.id];
            const { error: edErr } = await editaisTable().update({ subject_ids: updatedIds }).eq('id', edital.id);
            if (edErr) throw edErr;

            setLocalSubjects(prev => prev.map(s => s.id === placeholderId ? { ...s, id: newSubj.id } : s));
            setExpandedIds([newSubj.id]);
            setLocalEditalIds(updatedIds);
            onUpdate({ ...edital, subjectIds: updatedIds });
            hasPendingSync.current = true;
            toast.success(`Matéria "${name}" criada!`);
        } catch (err) {
            setLocalSubjects(prev => prev.filter(s => s.id !== placeholderId));
            setExpandedIds(prev => prev.filter(id => id !== placeholderId));
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'saveSubject', userMessage: 'Erro ao criar matéria.' });
        } finally {
            setIsSavingSubject(false);
        }
    }, [newSubjectName, user, isSavingSubject, localSubjects, localEditalIds, edital, onUpdate]);

    // ── Excluir matéria permanentemente (só editais manuais) ──────────────
    const handleConfirmDeleteSubject = useCallback(async (subjectId: string, subjectName: string) => {
        setConfirmDeleteSubjectId(null);
        // Otimismo: remove da UI imediatamente
        setLocalSubjects(prev => prev.filter(s => s.id !== subjectId));
        setExpandedIds(prev => prev.filter(id => id !== subjectId));
        const updatedIds = localEditalIds.filter(id => id !== subjectId);
        const updatedActiveIds = localActiveIds.filter(id => id !== subjectId);
        setLocalEditalIds(updatedIds);
        setLocalActiveIds(updatedActiveIds);

        try {
            // 1. Remove tópicos ANTES da matéria (FK constraint)
            const { error: topicsErr } = await supabase
                .from('topics').delete().eq('subject_id', subjectId);
            if (topicsErr) throw topicsErr;

            // 2. Remove a matéria
            const { error: subjErr } = await supabase
                .from('subjects').delete().eq('id', subjectId);
            if (subjErr) throw subjErr;

            // 3. Atualiza o edital (retira de subject_ids e active_subject_ids)
            const { error: edErr } = await editaisTable()
                .update({ subject_ids: updatedIds, active_subject_ids: updatedActiveIds }).eq('id', edital.id);
            if (edErr) throw edErr;

            onUpdate({ ...edital, subjectIds: updatedIds, activeSubjectIds: updatedActiveIds });
            hasPendingSync.current = true;
            toast.success(`"${subjectName}" excluída permanentemente.`);
        } catch (err) {
            // Reverte otimismo
            setLocalSubjects(allSubjects.filter(s => edital.subjectIds.includes(s.id)));
            setLocalEditalIds(edital.subjectIds);
            setLocalActiveIds(edital.activeSubjectIds?.length ? edital.activeSubjectIds : edital.subjectIds);
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'deleteSubject', userMessage: 'Erro ao excluir matéria.' });
        }
    }, [localEditalIds, localActiveIds, edital, allSubjects, onUpdate]);

    // ── Alternar ativo/inativo (visível/oculto na pág. Matérias) ──────────
    const handleToggleSubjectActive = useCallback(async (subjectId: string, subjectName: string) => {
        const isCurrentlyActive = localActiveIds.includes(subjectId);
        const newActiveIds = isCurrentlyActive
            ? localActiveIds.filter(id => id !== subjectId)
            : [...localActiveIds, subjectId];

        // Otimismo
        setLocalActiveIds(newActiveIds);

        try {
            const { error } = await editaisTable()
                .update({ active_subject_ids: newActiveIds }).eq('id', edital.id);
            if (error) throw error;

            onUpdate({ ...edital, activeSubjectIds: newActiveIds });
            hasPendingSync.current = true;
            toast.success(
                isCurrentlyActive
                    ? `"${subjectName}" ocultada da pág. Matérias.`
                    : `"${subjectName}" ativada na pág. Matérias.`,
                { duration: 1500 }
            );
        } catch (err) {
            // Reverte
            setLocalActiveIds(localActiveIds);
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'toggleActive', userMessage: 'Erro ao alterar visibilidade.' });
        }
    }, [localActiveIds, edital, onUpdate]);

    // ── Salvar novo tópico inline ──────────────────────────────────────────
    const handleSaveNewTopic = useCallback(async (subjectId: string) => {
        const text = newTopicTexts[subjectId]?.trim();
        if (!text || savingTopics[subjectId] || !user) return;

        const placeholderTopic: Topic = {
            id: tmpId(), name: text, completed: false, reviewCount: 0,
            review_stage: null, first_studied_at: null, last_reviewed_at: null,
            subject_id: subjectId, notes: null, stability: 0, scheduledFor: null,
            next_review: null, reviewStage: 'Primeiro Contato',
        } as unknown as Topic;

        setLocalSubjects(prev => prev.map(s =>
            s.id === subjectId ? { ...s, topics: [...s.topics, placeholderTopic] } : s
        ));
        setNewTopicTexts(prev => ({ ...prev, [subjectId]: '' }));
        setSavingTopics(prev => ({ ...prev, [subjectId]: true }));

        try {
            const { data: newTopic, error } = await supabase.from('topics').insert({
                subject_id: subjectId, name: text, completed: false, review_count: 0, review_stage: null,
            }).select('id').single();
            if (error) throw error;

            setLocalSubjects(prev => prev.map(s =>
                s.id === subjectId
                    ? { ...s, topics: s.topics.map(t => t.id === placeholderTopic.id ? { ...t, id: newTopic.id } : t) }
                    : s
            ));
            hasPendingSync.current = true;
        } catch (err) {
            setLocalSubjects(prev => prev.map(s =>
                s.id === subjectId ? { ...s, topics: s.topics.filter(t => t.id !== placeholderTopic.id) } : s
            ));
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'saveTopic', userMessage: 'Erro ao adicionar tópico.' });
        } finally {
            setSavingTopics(prev => ({ ...prev, [subjectId]: false }));
        }
    }, [newTopicTexts, savingTopics, user]);

    // ── Editar tópico ──────────────────────────────────────────────────────
    const handleSaveTopicEdit = useCallback(async () => {
        if (!editingTopicId || !editingTopicName.trim()) return;
        const newName = editingTopicName.trim();
        setLocalSubjects(prev => prev.map(s => ({
            ...s, topics: s.topics.map(t => t.id === editingTopicId ? { ...t, name: newName } : t)
        })));
        setEditingTopicId(null);
        setEditingTopicName('');
        try {
            const { error } = await supabase.from('topics').update({ name: newName }).eq('id', editingTopicId);
            if (error) throw error;
            hasPendingSync.current = true;
        } catch (err) {
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'editTopic', userMessage: 'Erro ao renomear.' });
        }
    }, [editingTopicId, editingTopicName]);

    // ── Excluir tópico — pede confirmação inline primeiro ─────────────────
    const handleRequestDeleteTopic = useCallback((topicId: string) => {
        setConfirmDeleteTopicId(prev => prev === topicId ? null : topicId);
    }, []);

    const handleConfirmDeleteTopic = useCallback(async (topicId: string, subjectId: string) => {
        setConfirmDeleteTopicId(null);
        // Otimismo: remove imediatamente da UI
        setLocalSubjects(prev => prev.map(s =>
            s.id === subjectId ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s
        ));
        try {
            const { error } = await supabase.from('topics').delete().eq('id', topicId);
            if (error) throw error;
            hasPendingSync.current = true;
        } catch (err) {
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'deleteTopic', userMessage: 'Erro ao excluir.' });
        }
    }, []);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative w-full max-w-3xl bg-zinc-900 border border-white/8 rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
                >
                    {/* ── Header ── */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                <GraduationCap className="text-primary" size={18} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-zinc-100 tracking-tight truncate">{edital.name}</h2>
                                <p className="text-[11px] text-content-muted mt-0.5">
                                    {localSubjects.length} matéria{localSubjects.length !== 1 ? 's' : ''} • {completedTopics}/{totalTopics} tópicos
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-100 shrink-0 ml-3"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* ── Filtro e Controles (topo) ── */}
                    <div className="px-6 pt-4 pb-2 shrink-0 flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" size={14} />
                            <input
                                type="text"
                                placeholder="Filtrar matérias e tópicos..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-9 bg-zinc-800/60 border border-white/5 rounded-xl pl-9 pr-9 text-xs outline-none ring-0 focus:border-primary/30 transition-colors text-content-main placeholder:text-content-muted/50"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-zinc-100">
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                const isAllExpanded = filteredSubjects.length > 0 && expandedIds.length === filteredSubjects.length;
                                if (isAllExpanded) setExpandedIds([]);
                                else setExpandedIds(filteredSubjects.map(s => s.id));
                            }}
                            className="px-4 h-9 flex items-center justify-center gap-2 text-[10px] font-bold text-content-muted hover:text-zinc-100 bg-zinc-800/60 hover:bg-zinc-800 border border-white/5 rounded-xl transition-all uppercase tracking-widest whitespace-nowrap"
                        >
                            {filteredSubjects.length > 0 && expandedIds.length === filteredSubjects.length ? (
                                <>
                                    <ChevronUp size={14} className="text-primary" />
                                    Recolher Tudo
                                </>
                            ) : (
                                <>
                                    <ChevronsUpDown size={14} className="text-primary" />
                                    Expandir Tudo
                                </>
                            )}
                        </button>
                    </div>

                    {/* ── Input nova matéria ── */}
                    <div className="px-6 pb-6 pt-2 shrink-0">
                        <div className="glow-card p-3 rounded-2xl flex items-center gap-3 border border-white/5 bg-zinc-800/20">
                            <div className="relative flex-1">
                                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                                <input
                                    type="text"
                                    placeholder="Nome da matéria (ex: Português)"
                                    value={newSubjectName}
                                    onChange={e => setNewSubjectName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveSubject(); }}
                                    className="w-full h-9 bg-zinc-950/50 border border-white/5 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:border-primary/30 transition-all text-content-main placeholder:text-content-muted/40"
                                />
                            </div>
                            <div className="w-px h-6 bg-white/10 shrink-0 mx-1" />
                            <div className="flex items-center gap-2 pr-2">
                                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-950/30 border border-white/5">
                                    <Database size={10} className="text-primary/60" />
                                    <span className="text-[10px] font-bold text-content-muted truncate max-w-[100px] uppercase tracking-wider">{edital.name}</span>
                                </div>
                                <button
                                    onClick={handleSaveSubject}
                                    disabled={!newSubjectName.trim() || isSavingSubject}
                                    className="flex items-center gap-2 px-4 h-9 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    {isSavingSubject ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    <span className="hidden xs:inline uppercase tracking-widest">SALVAR</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Lista de matérias ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 no-scrollbar">
                        {filteredSubjects.length === 0 ? (
                            <div className="py-14 flex flex-col items-center text-center">
                                <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                                    <BookOpen size={24} className="text-content-muted" />
                                </div>
                                <p className="text-sm font-semibold text-content-muted">
                                    {searchQuery ? 'Nenhum resultado.' : 'Nenhuma matéria neste edital.'}
                                </p>
                                {!searchQuery && (
                                    <p className="text-xs text-content-muted/50 mt-1">Use o campo acima para adicionar.</p>
                                )}
                            </div>
                        ) : (
                            filteredSubjects.map((subject, index) => {
                                const progress = getProgress(subject);
                                const isExpanded = expandedIds.includes(subject.id);
                                const isTemp = subject.id.startsWith('tmp_');
                                const isPendingDelete = confirmDeleteSubjectId === subject.id;

                                return (
                                    <div key={subject.id}>
                                        {/* ── Confirmação inline de exclusão ── */}
                                        <AnimatePresence>
                                            {isPendingDelete && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden mb-2"
                                                >
                                                    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                                            <p className="text-xs text-red-300 font-medium truncate">
                                                                Excluir <strong>"{subject.name}"</strong> e todos os tópicos?
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button
                                                                onClick={() => setConfirmDeleteSubjectId(null)}
                                                                className="px-3 h-7 text-[10px] font-bold text-content-muted hover:text-zinc-100 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => handleConfirmDeleteSubject(subject.id, subject.name)}
                                                                className="px-3 h-7 text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all"
                                                            >
                                                                Excluir
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* ── Card da matéria ── */}
                                        <div
                                            onClick={() => !isTemp && !isPendingDelete && toggleExpand(subject.id)}
                                            className={`glow-card px-4 py-3 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden
                                                ${isExpanded ? 'border-primary/30' : ''}
                                                ${isTemp ? 'opacity-60 cursor-default' : ''}
                                                ${isPendingDelete ? 'border-red-500/30 opacity-70' : ''}`}
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />

                                            <div className="flex items-center gap-3 pl-2 min-w-0">
                                                <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                                    {isTemp
                                                        ? <Loader2 size={12} className="animate-spin text-primary" />
                                                        : <span className="text-[10px] font-black text-primary">#{index + 1}</span>
                                                    }
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-content-main text-xs sm:text-sm tracking-tight uppercase truncate max-w-[160px] sm:max-w-xs">
                                                            {subject.name}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-white/5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/80" />
                                                            {subject.topics.length} {subject.topics.length === 1 ? 'tópico' : 'tópicos'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-content-muted/60 mt-0.5">{edital.name}</span>
                                                </div>
                                            </div>

                                            {!isTemp && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {/* Progresso circular */}
                                                    <div className="hidden sm:flex items-center justify-center relative w-8 h-8 rounded-full bg-zinc-800 border border-white/5 mr-1">
                                                        <svg className="w-full h-full -rotate-90 p-0.5" viewBox="0 0 36 36">
                                                            <circle className="text-white/5" strokeWidth="3" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                                                            <circle className="text-primary transition-all duration-700" strokeWidth="3" strokeDasharray={`${progress}, 100`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="16" cx="18" cy="18" />
                                                        </svg>
                                                        <span className="absolute text-[8px] font-bold text-content-main">{progress}%</span>
                                                    </div>

                                                    {/* Anotações */}
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setNotesModal({ isOpen: true, subjectId: subject.id, subjectName: subject.name });
                                                        }}
                                                        title="Anotações"
                                                        className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                                                    >
                                                        <FileText size={14} />
                                                    </button>

                                                    {/* Botão principal: toggle (importado) ou excluir (manual) */}
                                                    {edital.isImported ? (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                handleToggleSubjectActive(subject.id, subject.name);
                                                            }}
                                                            title={localActiveIds.includes(subject.id) ? 'Ocultar da pág. Matérias' : 'Mostrar na pág. Matérias'}
                                                            className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100
                                                                ${localActiveIds.includes(subject.id)
                                                                    ? 'text-content-muted hover:text-amber-400 hover:bg-amber-500/10'
                                                                    : 'text-amber-400 bg-amber-500/10 opacity-100'
                                                                }`}
                                                        >
                                                            {localActiveIds.includes(subject.id)
                                                                ? <Eye size={14} />
                                                                : <EyeOff size={14} />
                                                            }
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteSubjectId(prev => prev === subject.id ? null : subject.id);
                                                            }}
                                                            title="Excluir matéria permanentemente"
                                                            className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100
                                                                ${isPendingDelete ? 'text-red-400 bg-red-500/10 opacity-100' : 'text-content-muted hover:text-red-500 hover:bg-red-500/10'}`}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}

                                                    <div className="w-px h-4 bg-white/5 mx-0.5" />

                                                    {/* Expand */}
                                                    <button
                                                        onClick={e => { e.stopPropagation(); toggleExpand(subject.id); }}
                                                        className={`p-1.5 hover:bg-primary/10 rounded-lg transition-all text-content-muted hover:text-primary ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                                                    >
                                                        <ChevronDown size={15} />
                                                    </button>
                                                </div>
                                            )}

                                        </div>

                                        {/* ── Conteúdo expandido ── */}
                                        <AnimatePresence initial={false}>
                                            {isExpanded && !isTemp && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.18 }}
                                                    className="overflow-hidden"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <div className="mt-1 ml-3 p-3 rounded-xl bg-black/20 space-y-2 border border-white/5">

                                                        {/* Input "Novo tópico..." */}
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                placeholder="Novo tópico..."
                                                                value={newTopicTexts[subject.id] || ''}
                                                                onChange={e => setNewTopicTexts(prev => ({ ...prev, [subject.id]: e.target.value }))}
                                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveNewTopic(subject.id); }}
                                                                className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 px-3 pr-8 text-xs outline-none ring-0 focus:border-primary/30 transition-colors text-content-main placeholder:text-content-muted/50"
                                                            />
                                                            <button
                                                                onClick={() => handleSaveNewTopic(subject.id)}
                                                                disabled={savingTopics[subject.id] || !newTopicTexts[subject.id]?.trim()}
                                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-primary/10 text-primary rounded hover:bg-primary/20 transition-all disabled:opacity-40"
                                                            >
                                                                {savingTopics[subject.id] ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />}
                                                            </button>
                                                        </div>

                                                        {/* Tópicos */}
                                                        {subject.topics.length === 0 ? (
                                                            <p className="text-center text-[10px] text-content-muted uppercase font-bold tracking-widest py-3">
                                                                Nenhum tópico
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                {subject.topics.map((topic, idx) => {
                                                                    const status = getTopicStatus(topic);
                                                                    const isTmpTopic = topic.id.startsWith('tmp_');
                                                                    return (
                                                                        <div
                                                                            key={topic.id}
                                                                            className={`flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-all group/topic ${isTmpTopic ? 'opacity-50' : ''}`}
                                                                        >
                                                                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                                                                                <span className="text-[9px] font-bold text-content-muted w-4 shrink-0 text-right">{idx + 1}.</span>
                                                                                <div className="shrink-0">
                                                                                    {isTmpTopic
                                                                                        ? <Loader2 size={13} className="animate-spin text-primary/50" />
                                                                                        : topic.completed
                                                                                            ? <CheckCircle2 size={14} className="fill-green-900/40 text-green-500" />
                                                                                            : <Circle size={14} className="text-content-muted" />
                                                                                    }
                                                                                </div>

                                                                                {!isTmpTopic && editingTopicId === topic.id ? (
                                                                                    <div className="flex items-center gap-1 flex-1">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={editingTopicName}
                                                                                            onChange={e => setEditingTopicName(e.target.value)}
                                                                                            onKeyDown={e => {
                                                                                                if (e.key === 'Enter') handleSaveTopicEdit();
                                                                                                if (e.key === 'Escape') setEditingTopicId(null);
                                                                                                e.stopPropagation();
                                                                                            }}
                                                                                            className="h-6 text-xs px-2 w-full bg-zinc-800 border border-primary/30 rounded outline-none ring-0"
                                                                                            autoFocus
                                                                                        />
                                                                                        <button onClick={handleSaveTopicEdit} className="p-0.5 text-green-500"><Check size={13} /></button>
                                                                                        <button onClick={() => setEditingTopicId(null)} className="p-0.5 text-content-muted"><X size={13} /></button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div
                                                                                        className={`flex flex-col flex-1 min-w-0 ${isTmpTopic ? '' : 'cursor-text'}`}
                                                                                        onClick={() => {
                                                                                            if (!isTmpTopic) { setEditingTopicId(topic.id); setEditingTopicName(topic.name); }
                                                                                        }}
                                                                                    >
                                                                                        <span className={`text-xs font-medium truncate ${topic.completed ? 'text-content-muted line-through' : 'text-content-main'}`}>
                                                                                            {topic.name}
                                                                                        </span>
                                                                                        {!isTmpTopic && (
                                                                                            <span className={`text-[8px] font-black uppercase tracking-widest ${status.color}`}>
                                                                                                {status.label}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {!isTmpTopic && (
                                                                                confirmDeleteTopicId === topic.id ? (
                                                                                    // Confirmação inline no tópico
                                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                                        <span className="text-[9px] text-red-400 font-bold mr-1">Excluir?</span>
                                                                                        <button
                                                                                            onClick={() => setConfirmDeleteTopicId(null)}
                                                                                            className="px-1.5 h-5 text-[9px] font-bold text-content-muted bg-white/5 hover:bg-white/10 rounded transition-all"
                                                                                        >
                                                                                            Não
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleConfirmDeleteTopic(topic.id, subject.id)}
                                                                                            className="px-1.5 h-5 text-[9px] font-bold text-white bg-red-500 hover:bg-red-600 rounded transition-all"
                                                                                        >
                                                                                            Sim
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => handleRequestDeleteTopic(topic.id)}
                                                                                        className="opacity-0 group-hover/topic:opacity-100 p-1 hover:bg-red-500/10 rounded text-content-muted hover:text-red-500 transition-all shrink-0"
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </button>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Modal de anotações */}
            <SubjectNotesModal
                isOpen={notesModal.isOpen}
                onClose={() => setNotesModal(prev => ({ ...prev, isOpen: false }))}
                subjectId={notesModal.subjectId}
                subjectName={notesModal.subjectName}
            />
        </>
    );
};
