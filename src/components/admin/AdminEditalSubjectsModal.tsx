import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, X, Trash2, Check, BookOpen, GraduationCap,
    ChevronDown, ChevronUp, ChevronsUpDown, FileText, Circle, CheckCircle2, Loader2, AlertTriangle,
    Database, Save, Sparkles, Undo2, FileUp, Edit3, Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';

interface Topic {
    id: string;
    name: string;
}

interface Subject {
    id: string;
    name: string;
    topics: Topic[];
    color?: string;
    priority?: number;
}

interface AdminEditalSubjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    edital: {
        id: string;
        organ: string;
        position: string;
        year: string;
        category: string;
        subjects?: Subject[];
    } | null;
    onUpdate: () => void;
}

export const AdminEditalSubjectsModal = ({
    isOpen, onClose, edital, onUpdate
}: AdminEditalSubjectsModalProps) => {
    const [activeTab, setActiveTab] = useState<'current' | 'ia' | 'pdf'>('current');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // AI Tab State
    const [inputText, setInputText] = useState('');
    const [iaStage, setIaStage] = useState<'input' | 'processing' | 'review'>('input');
    const [aiResult, setAiResult] = useState<{
        id: string;
        title: string;
        selected: boolean;
        expanded: boolean;
        topics: { name: string; selected: boolean }[];
    }[]>([]);
    const [processingMsg, setProcessingMsg] = useState('Analisando conteúdo...');

    // Manual Tab State
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [newTopicTexts, setNewTopicTexts] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<string | null>(null);
    const [confirmDeleteTopicId, setConfirmDeleteTopicId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && edital) {
            // Edital subjects are stored as JSON in the 'subjects' column
            const editalSubjects: any[] = (edital as any).subjects || [];
            
            // Ensure every subject and topic has an ID for local management
            const formattedSubjects = editalSubjects.map((s: Subject, sIdx: number) => ({
                id: s.id || `s-${sIdx}-${Date.now()}`,
                name: s.name,
                topics: (s.topics || []).map((t: Topic, tIdx: number) => ({
                    id: t.id || `t-${sIdx}-${tIdx}-${Date.now()}`,
                    name: t.name
                })),
                color: s.color || '#3b82f6', // Default color if not set
                priority: s.priority || 0
            }));
            setSubjects(formattedSubjects);
            setActiveTab('current');
            setIaStage('input');
            setInputText('');
            setHasUnsavedChanges(false);
        }
    }, [isOpen, edital]);

    const handleSaveToDatabase = async (updatedSubjects: Subject[], shouldNotify = false) => {
        setIsSaving(true);
        try {
            const dbSubjects = updatedSubjects.map(s => ({
                id: s.id,
                name: s.name,
                color: s.color,
                priority: s.priority,
                topics: s.topics.map(t => ({ id: t.id, name: t.name }))
            }));

            const { error: updateErr } = await (supabase as any)
                .from('public_editais')
                .update({ 
                    subjects: dbSubjects,
                    updated_at: new Date().toISOString()
                })
                .eq('id', edital?.id);

            if (updateErr) throw updateErr;

            if (shouldNotify) {
                try {
                    console.log('Iniciando disparos de notificações globais...');
                    const { data: rpcData, error: usersErr } = await (supabase as any)
                        .rpc('get_users_by_edital_source', { source_uuid: edital?.id });

                    if (!usersErr && rpcData && rpcData.length > 0) {
                        const uniqueUserIds = Array.from(new Set(rpcData.map((u: any) => u.user_id)));
                        const notificationsToInsert = uniqueUserIds.map(userId => ({
                            user_id: userId,
                            type: 'update_edital',
                            category: 'sistema',
                            title: 'Matriz de Estudos',
                            message: `O edital ${(edital as any).organ || 'que você segue'} foi atualizado.`,
                            action_url: `/meus-editais?sourceId=${edital?.id}`,
                            read: false,
                            created_at: new Date().toISOString()
                        }));

                        await (supabase as any).from('user_notifications').insert(notificationsToInsert);
                        toast.success(`${uniqueUserIds.length} alunos serão notificados.`);
                    }
                } catch (notifErr) {
                    console.error('Erro ao notificar usuários:', notifErr);
                }
                toast.success('Edital sincronizado com sucesso!');
            } else {
                toast.success('Alterações salvas com sucesso.');
                onClose();
            }

            setHasUnsavedChanges(false);
            if (onUpdate) onUpdate();
        } catch (err: any) {
            console.error('Erro ao salvar edital:', err);
            errorService.report(err, { module: 'AdminEditalSubjectsModal', action: 'save' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddSubject = () => {
        const name = newSubjectName.trim();
        if (!name) return;

        const newSubj: Subject = {
            id: `s-new-${Date.now()}`,
            name,
            topics: [],
            color: '#3b82f6',
            priority: 0
        };

        const updated = [...subjects, newSubj];
        setSubjects(updated);
        setNewSubjectName('');
        setExpandedIds(prev => [...prev, newSubj.id]);
        setHasUnsavedChanges(true);
    };

    const handleDeleteSubject = (id: string) => {
        const subject = subjects.find(s => s.id === id);
        const updated = subjects.filter(s => s.id !== id);
        setSubjects(updated);
        setHasUnsavedChanges(true);
        toast.success(`Matéria "${subject?.name || ''}" removida.`);
    };

    const handleAddTopic = (subjectId: string) => {
        const text = newTopicTexts[subjectId]?.trim();
        if (!text) return;

        const updated = subjects.map(s => {
            if (s.id === subjectId) {
                return {
                    ...s,
                    topics: [...(s.topics || []), { id: `t-new-${Date.now()}`, name: text }]
                };
            }
            return s;
        });

        setSubjects(updated);
        setNewTopicTexts(prev => ({ ...prev, [subjectId]: '' }));
        setHasUnsavedChanges(true);
    };

    const handleDeleteTopic = (subjectId: string, topicId: string) => {
        let topicName = '';
        const updated = subjects.map(s => {
            if (s.id === subjectId) {
                const topic = s.topics?.find(t => t.id === topicId);
                topicName = topic?.name || '';
                return {
                    ...s,
                    topics: (s.topics || []).filter(t => t.id !== topicId)
                };
            }
            return s;
        });
        setSubjects(updated);
        setHasUnsavedChanges(true);
        if (topicName) {
            toast.success(`Tópico "${topicName}" removido.`);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSaveEdit = (id: string) => {
        const name = editingName.trim();
        if (!name) {
            setEditingId(null);
            return;
        }

        const updated = subjects.map(s => s.id === id ? { ...s, name } : s);
        setSubjects(updated);
        setEditingId(null);
        setHasUnsavedChanges(true);
    };

    const handleUpdateSubjectColor = (id: string, color: string) => {
        const updated = subjects.map(s => s.id === id ? { ...s, color } : s);
        setSubjects(updated);
        setHasUnsavedChanges(true);
    };

    const handleUpdateSubjectPriority = (id: string, priority: number) => {
        const updated = subjects.map(s => s.id === id ? { ...s, priority } : s);
        setSubjects(updated);
        setHasUnsavedChanges(true);
    };

    const handleIaImport = () => {
        if (!inputText.trim()) return;

        setIaStage('processing');
        setProcessingMsg('Analisando edital...');

        setTimeout(() => {
            setProcessingMsg('Estruturando matérias e tópicos...');
            setTimeout(() => {
                // Mock result logic similar to ImportEditalModal
                setAiResult([
                    {
                        id: 'm1',
                        title: 'Direito Administrativo',
                        selected: true,
                        expanded: true,
                        topics: [
                            { name: 'Princípios da Administração Pública', selected: true },
                            { name: 'Organização Administrativa', selected: true },
                            { name: 'Ato Administrativo', selected: true }
                        ]
                    },
                    {
                        id: 'm2',
                        title: 'Direito Constitucional',
                        selected: true,
                        expanded: false,
                        topics: [
                            { name: 'Direitos e Garantias Fundamentais', selected: true },
                            { name: 'Organização do Estado', selected: true }
                        ]
                    }
                ]);
                setIaStage('review');
            }, 1500);
        }, 1000);
    };

    const handleConfirmIaImport = () => {
        const importedSubjects: Subject[] = aiResult
            .filter(r => r.selected)
            .map((r, sIdx) => ({
                id: `s-ia-${Date.now()}-${sIdx}`,
                name: r.title,
                topics: r.topics
                    .filter(t => t.selected)
                    .map((t, tIdx) => ({
                        id: `t-ia-${Date.now()}-${sIdx}-${tIdx}`,
                        name: t.name
                    }))
            }));

        const updated = [...subjects, ...importedSubjects];
        setSubjects(updated);
        setHasUnsavedChanges(true);
        setActiveTab('current');
    };

    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return subjects;
        const q = searchQuery.toLowerCase();
        return subjects.filter(s => 
            s.name.toLowerCase().includes(q) || 
            s.topics.some(t => t.name.toLowerCase().includes(q))
        );
    }, [subjects, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-5xl bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                            <GraduationCap className="text-primary" size={18} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-black text-zinc-100 tracking-tight truncate uppercase">
                                {edital.organ} • {edital.position} ({edital.year})
                            </h2>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">
                                Gerenciar Conteúdo
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-content-muted hover:text-zinc-100 shrink-0 ml-3">
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/5 bg-zinc-900/30">
                    <div className="flex gap-2 bg-zinc-950/50 p-1.2 rounded-2xl border border-white/5 mx-auto">
                        <button
                            onClick={() => setActiveTab('current')}
                            className={`px-6 py-2 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'current' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <FileText size={14} />
                            Conteúdo Atual
                        </button>
                        <button
                            onClick={() => setActiveTab('ia')}
                            className={`px-6 py-2 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'ia' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <Sparkles size={14} />
                            Importar com IA
                        </button>
                        <button
                            onClick={() => setActiveTab('pdf')}
                            className={`px-6 py-2 rounded-xl text-[11px] font-bold transition-all tracking-wide flex items-center gap-2 ${activeTab === 'pdf' ? 'bg-primary text-white shadow-sm' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
                        >
                            <Plus size={14} />
                            Adicionar Manual
                        </button>
                    </div>

                    {isSaving && (
                        <div className="absolute right-6 flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">
                            <Loader2 size={12} className="animate-spin" />
                            SALVANDO...
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                    {activeTab === 'current' ? (
                        <div className="space-y-6">
                            {/* Filter and Controls */}
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar matérias e tópicos..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full h-9 bg-zinc-800/60 border border-white/5 rounded-xl pl-9 pr-9 text-xs outline-none focus:border-primary/30 transition-all"
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
                                    className="px-4 h-9 flex items-center justify-center gap-2 text-[10px] font-bold text-content-muted hover:text-zinc-100 bg-zinc-800/60 border border-white/5 rounded-xl transition-all uppercase tracking-widest whitespace-nowrap"
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

                            {/* Quick Add Subject */}
                            <div className="glow-card p-3 rounded-2xl flex items-center gap-3 border border-white/5 bg-zinc-800/20 mt-2">
                                <div className="relative flex-1">
                                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Nome da matéria (ex: Português)"
                                        value={newSubjectName}
                                        onChange={e => setNewSubjectName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                                        className="w-full h-9 bg-zinc-950/50 border border-white/5 rounded-xl pl-9 pr-3 text-xs outline-none focus:border-primary/30 transition-all font-medium"
                                    />
                                </div>
                                <button
                                    onClick={handleAddSubject}
                                    disabled={!newSubjectName.trim()}
                                    className="px-6 h-9 bg-primary/20 hover:bg-primary text-primary hover:text-white font-black rounded-xl transition-all flex items-center gap-2 text-[10px] uppercase tracking-widest"
                                >
                                    ADICIONAR
                                </button>
                            </div>

                            {/* Subjects List */}
                            <div className="space-y-3">
                                {filteredSubjects.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                                            <Database className="text-content-muted/30" size={28} />
                                        </div>
                                        <h3 className="text-base font-bold text-content-main mb-2">
                                            {searchQuery ? 'Nenhum resultado' : 'Edital sem conteúdo'}
                                        </h3>
                                        <p className="text-xs text-content-muted/60 max-w-[280px] leading-relaxed">
                                            {searchQuery 
                                                ? `Não encontramos nada para "${searchQuery}". Tente outro termo.` 
                                                : 'Este edital ainda não possui matérias cadastradas. Use as abas acima para adicionar conteúdo.'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredSubjects.map((subject, index) => {
                                        const isExpanded = expandedIds.includes(subject.id);
                                        const isPendingDelete = confirmDeleteSubjectId === subject.id;

                                        return (
                                            <div key={subject.id}>
                                                {/* ── Confirmação inline de exclusão de matéria ── */}
                                                <AnimatePresence>
                                                    {isPendingDelete && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden mb-2"
                                                        >
                                                            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 shadow-lg shadow-red-500/5">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                                                                        <AlertTriangle size={14} className="text-red-400" />
                                                                    </div>
                                                                    <p className="text-xs text-red-300 font-medium truncate">
                                                                        Excluir <strong>"{subject.name.toUpperCase()}"</strong> e todos os tópicos?
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteSubjectId(null); }}
                                                                        className="px-3 h-7 text-[10px] font-bold text-content-muted hover:text-zinc-100 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteSubject(subject.id);
                                                                            setConfirmDeleteSubjectId(null);
                                                                        }}
                                                                        className="px-3 h-7 text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all shadow-lg shadow-red-500/20"
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
                                                    onClick={() => !isPendingDelete && toggleExpand(subject.id)}
                                                    className={`glow-card px-4 py-3 rounded-2xl flex items-center justify-between group hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden mb-2
                                                        ${isExpanded ? 'border-primary/30 bg-primary/5' : ''}
                                                        ${isPendingDelete ? 'border-red-500/30 opacity-70' : ''}`}
                                                >
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" />

                                                    <div className="flex items-center gap-3 pl-2 min-w-0">
                                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                                            <span className="text-[10px] font-black text-primary">#{index + 1}</span>
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {editingId === subject.id ? (
                                                                    <input
                                                                        autoFocus
                                                                        value={editingName}
                                                                        onChange={e => setEditingName(e.target.value)}
                                                                        onBlur={() => handleSaveEdit(subject.id)}
                                                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(subject.id)}
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="bg-zinc-800 border-none px-2 rounded font-bold text-content-main text-xs sm:text-sm tracking-tight uppercase min-w-[200px] outline-none"
                                                                    />
                                                                ) : (
                                                                    <span className="font-bold text-content-main text-xs sm:text-sm tracking-tight uppercase truncate max-w-[160px] sm:max-w-xs">
                                                                        {subject.name}
                                                                    </span>
                                                                )}
                                                                <span className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-white/5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/80" />
                                                                    {subject.topics.length} {subject.topics.length === 1 ? 'tópico' : 'tópicos'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-content-muted/60 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                                                {edital.organ} • {edital.position}
                                                            </span>
                                                            
                                                            {/* Metadata Controls (Hidden when editing name) */}
                                                            {editingId !== subject.id && (
                                                                <div className="flex items-center gap-4 px-1 pt-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="relative group/color">
                                                                            <input 
                                                                                type="color" 
                                                                                value={subject.color || '#3b82f6'} 
                                                                                onChange={(e) => handleUpdateSubjectColor(subject.id, e.target.value)}
                                                                                className="w-5 h-5 rounded-full border border-white/10 cursor-pointer overflow-hidden p-0 bg-transparent transition-transform hover:scale-110"
                                                                            />
                                                                            <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 bg-zinc-800 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                                                                                Cor Temática
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-1.5 h-6 bg-zinc-800/80 px-2 rounded-lg border border-white/5 relative group/priority">
                                                                        <GraduationCap size={12} className="text-content-muted" />
                                                                        <input 
                                                                            type="number" 
                                                                            value={subject.priority || 0}
                                                                            onChange={(e) => handleUpdateSubjectPriority(subject.id, parseInt(e.target.value) || 0)}
                                                                            className="w-8 bg-transparent text-[10px] font-black text-zinc-300 outline-none focus:text-primary transition-colors text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        />
                                                                        <div className="absolute left-1/2 -top-8 -translate-x-1/2 px-2 py-1 bg-zinc-800 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-white opacity-0 group-hover/priority:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                                                                            Prioridade
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingId(subject.id);
                                                                setEditingName(subject.name);
                                                            }}
                                                            title="Editar nome"
                                                            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-content-muted hover:text-primary opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteSubjectId(prev => prev === subject.id ? null : subject.id);
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${isPendingDelete ? 'text-red-500 bg-red-500/10 opacity-100' : 'text-content-muted hover:text-red-500 hover:bg-red-500/10'}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>

                                                        <div className="w-px h-4 bg-white/5 mx-0.5" />

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleExpand(subject.id); }}
                                                            className={`p-1.5 hover:bg-primary/10 rounded-lg transition-all text-content-muted hover:text-primary ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                                                        >
                                                            <ChevronDown size={15} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* ── Lista de Tópicos ── */}
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden mb-4"
                                                        >
                                                            <div className="pl-6 pr-4 space-y-1.5 pt-2 pb-4">
                                                                {/* Campo Rápido para Novo Tópico */}
                                                                <div className="flex items-center gap-2 mb-4 pl-7 pr-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Novo tópico..."
                                                                        value={newTopicTexts[subject.id] || ''}
                                                                        onChange={e => setNewTopicTexts(prev => ({ ...prev, [subject.id]: e.target.value }))}
                                                                        onKeyDown={e => e.key === 'Enter' && handleAddTopic(subject.id)}
                                                                        className="flex-1 bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-primary/40 transition-all font-medium"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleAddTopic(subject.id)}
                                                                        disabled={!newTopicTexts[subject.id]?.trim()}
                                                                        className="h-8 w-8 flex items-center justify-center bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-lg transition-all disabled:opacity-30"
                                                                    >
                                                                        <Plus size={16} />
                                                                    </button>
                                                                </div>

                                                                {subject.topics.map((topic, tIdx) => (
                                                                    <div key={topic.id} className="group/topic">
                                                                        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 border border-white/5 transition-all">
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <span className="text-[10px] font-bold text-content-muted/40 shrink-0 w-4 tracking-tighter">
                                                                                    {tIdx + 1}.
                                                                                </span>
                                                                                <p className="text-xs text-content-main font-medium break-words py-1 leading-relaxed">
                                                                                    {topic.name}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover/topic:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTopic(subject.id, topic.id); }}
                                                                                    className="p-1 hover:bg-red-500/10 rounded transition-colors text-content-muted hover:text-red-400"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'ia' ? (
                        <div className="space-y-6">
                            {iaStage === 'input' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl mx-auto">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-content-muted uppercase tracking-[0.2em] ml-1">Conteúdo Programático</label>
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            placeholder="Cole aqui o texto do conteúdo programático (Ctrl+V)..."
                                            className="w-full h-80 bg-zinc-800/30 border border-white/5 focus:border-primary/40 rounded-3xl p-6 text-sm font-medium text-content-main outline-none transition-all resize-none no-scrollbar shadow-inner"
                                        />
                                    </div>
                                    <button
                                        onClick={handleIaImport}
                                        disabled={!inputText.trim()}
                                        className="w-full py-5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-black rounded-3xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-xs uppercase tracking-widest"
                                    >
                                        <Sparkles size={18} /> Estruturar com Inteligência Artificial
                                    </button>
                                </motion.div>
                            )}

                            {iaStage === 'processing' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-24 flex flex-col items-center justify-center text-center">
                                    <div className="relative mb-8">
                                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
                                        <Loader2 className="text-primary animate-spin relative" size={64} />
                                    </div>
                                    <h3 className="text-2xl font-black text-content-main mb-2 tracking-tight">{processingMsg}</h3>
                                    <p className="text-[10px] text-content-muted font-black uppercase tracking-[0.3em] animate-pulse">Este processo pode levar alguns segundos</p>
                                </motion.div>
                            )}

                            {iaStage === 'review' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black text-content-main tracking-tight">Revisar Estrutura Gerada</h3>
                                        <button onClick={() => setIaStage('input')} className="flex items-center gap-2 px-6 py-2.5 text-[10px] font-black text-content-muted hover:text-primary transition-colors uppercase tracking-widest bg-white/5 rounded-full border border-white/5">
                                            <Undo2 size={14} /> Refazer
                                        </button>
                                    </div>

                                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 no-scrollbar">
                                        {aiResult.map((subj, sIdx) => (
                                            <div key={subj.id} className="p-6 rounded-[2rem] bg-zinc-800/20 border border-white/5">
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
                                                            className="bg-transparent border-none font-bold text-zinc-100 outline-none focus:text-primary transition-colors text-lg"
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
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                                                        {subj.topics.map((topic, tIdx) => (
                                                            <div key={tIdx} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
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
                                                                    className="bg-transparent border-none text-xs text-zinc-300 outline-none focus:text-primary transition-all w-full"
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
                                            onClick={handleConfirmIaImport}
                                            className="px-16 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] text-xs uppercase tracking-[0.2em]"
                                        >
                                            Adicionar Selecionados ao Edital
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                            <div className="w-24 h-24 bg-zinc-800/50 rounded-[2rem] flex items-center justify-center border border-white/5 border-dashed relative overflow-hidden group">
                                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Plus size={40} className="text-content-muted group-hover:text-primary transition-colors" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-content-main tracking-tight uppercase">Adicionar Manual</h3>
                                <p className="text-sm text-content-muted max-w-sm mx-auto font-medium">
                                    Em breve você poderá adicionar conteúdos complexos e tabelas de forma manual e estruturada.
                                </p>
                            </div>
                            <button disabled className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-content-muted uppercase tracking-widest cursor-not-allowed">
                                Funcionalidade em Desenvolvimento
                            </button>
                        </div>
                    )}
                </div>

                {/* Explicit Footer for Saving */}
                <div className="px-8 py-5 border-t border-white/5 bg-zinc-900/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {hasUnsavedChanges && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <AlertTriangle className="text-amber-500" size={14} />
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Alterações Pendentes</span>
                            </div>
                        )}
                        {!hasUnsavedChanges && subjects.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircle2 className="text-emerald-500" size={14} />
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Sincronizado</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => handleSaveToDatabase(subjects, false)}
                            disabled={isSaving || !hasUnsavedChanges}
                            className="px-6 h-11 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 font-bold rounded-2xl transition-all flex items-center gap-2 text-[11px] uppercase tracking-widest active:scale-[0.98] border border-white/5"
                        >
                            {isSaving ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                <Save size={16} />
                            )}
                            Salvar e Sair
                        </button>
                        <button
                            onClick={() => handleSaveToDatabase(subjects, true)}
                            disabled={isSaving || !hasUnsavedChanges}
                            className="px-8 h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:bg-zinc-800 text-white font-black rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center gap-3 text-[11px] uppercase tracking-widest active:scale-[0.98]"
                        >
                            {isSaving ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <RefreshCw size={18} />
                            )}
                            Sincronizar
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
