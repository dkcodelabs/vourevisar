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
    ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, FileText, Circle, CheckCircle2, Loader2, AlertTriangle, EyeOff, Eye,
    Database, Save, Cloud, CloudOff, Sparkles, Wand2, EyeIcon, GripVertical
} from 'lucide-react';
import { Subject, Topic, Status } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import type { UserEdital } from '@/pages/Editais';

interface AiSubject {
    title: string;
    topics: { name: string; selected: boolean }[];
    selected: boolean;
}

interface EditalSubjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBack?: () => void;
    edital: UserEdital;
    editais?: UserEdital[]; // Editais do ciclo (para select)
    allSubjects: Subject[];
    onUpdate: (updated: UserEdital) => void;
    initialExpandedSubjectId?: string;
}

const editaisTable = () => supabase.from('user_editais');
const tmpId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const parseOptionalNumberInput = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
};

const hasSubjectWeight = (subject: Subject) =>
    subject.exam_weight_questions !== null && subject.exam_weight_questions !== undefined ||
    subject.exam_weight_points !== null && subject.exam_weight_points !== undefined ||
    subject.exam_weight_percentage !== null && subject.exam_weight_percentage !== undefined;

const getSubjectWeightLabel = (subject: Subject) => {
    const parts = [];
    if (subject.exam_weight_questions !== null && subject.exam_weight_questions !== undefined) {
        parts.push(`${subject.exam_weight_questions} questões`);
    }
    if (subject.exam_weight_points !== null && subject.exam_weight_points !== undefined) {
        parts.push(`${subject.exam_weight_points} pts`);
    }
    return parts.length ? parts.join(' / ') : 'Peso';
};

const getProgress = (subject: Subject) => {
    if (!subject.topics?.length) return 0;
    const completed = subject.topics.filter(t => t.completed).length;
    return Math.round((completed / subject.topics.length) * 100);
};

function getTopicStatus(topic: Topic): { label: string; color: string } {
    if (topic.completed) return { label: 'CONCLUÍDO', color: 'text-emerald-500' };
    if ((topic.reviewCount ?? 0) > 0 || topic.first_studied_at) return { label: 'ESTUDADO', color: 'text-primary/60' };
    return { label: 'NÃO INICIADO', color: 'text-primary/60' };
}

export const EditalSubjectsModal = ({
    isOpen, onClose, onBack, edital, editais, allSubjects, onUpdate, initialExpandedSubjectId
}: EditalSubjectsModalProps) => {
    const { user } = useAuth();
    const { refreshData } = useApp();
    const { refresh: refreshOrigins } = useEditalOriginsWithMerge();

    // ── Estado local otimista ────────────────────────────────────────────
    const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
    const [localEditalIds, setLocalEditalIds] = useState<string[]>([]);
    // IDs das matérias ativas (visíveis no Ciclo de Estudos) — subconjunto de localEditalIds
    const [localActiveIds, setLocalActiveIds] = useState<string[]>([]);
    // Flag: só inicializa ao abrir, ignora mudanças externas enquanto modal está aberto
    const initializedRef = useRef(false);
    const hasPendingSync = useRef(false);

    // ── Edital selecionado (para select de múltiplos editais) ──
    const [selectedEdital, setSelectedEdital] = useState<UserEdital>(edital);
    const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
    const [pendingEditalSwitch, setPendingEditalSwitch] = useState<UserEdital | null>(null);
    const showEditalSelector = editais && editais.length > 1;

    const transformSubject = useCallback((s: Subject): Subject => ({
        id: s.id,
        name: s.name,
        topics: (s.topics || []).map((t: Topic): Topic => ({
            id: t.id,
            name: t.name,
            completed: t.completed || false,
            review_count: t.review_count || 0,
            reviewCount: t.review_count || 0,
            subtopics: t.subtopics || []
        })),
        status: (s.status as Status) || 'Nova',
        is_visible: s.is_visible ?? true,
        exam_weight_points: s.exam_weight_points ?? null,
        exam_weight_questions: s.exam_weight_questions ?? null,
        exam_weight_percentage: s.exam_weight_percentage ?? null,
        exam_weight_raw: s.exam_weight_raw ?? null
    }), []);

    useEffect(() => {
        if (isOpen && edital) {
            const subjects = allSubjects.filter(s => edital.subjectIds.includes(s.id));
            setLocalSubjects(subjects);
            setLocalEditalIds(edital.subjectIds);
            setLocalActiveIds(edital.activeSubjectIds?.length ? edital.activeSubjectIds : edital.subjectIds);
            setSyncStatus(null);
            initializedRef.current = true;
            hasPendingSync.current = false;
        }
        if (!isOpen) {
            initializedRef.current = false;
            setSyncStatus(null);
        }
    }, [isOpen, edital, allSubjects]);

    // ── Efeito para expandir e dar scroll na matéria inicial ──
    useEffect(() => {
        if (isOpen && initialExpandedSubjectId) {
            setExpandedIds(prev => {
                if (prev.includes(initialExpandedSubjectId)) return prev;
                return [...prev, initialExpandedSubjectId];
            });
            
            // Pequeno delay para o modal animar e a lista renderizar
            const timer = setTimeout(() => {
                const el = document.getElementById(`subject-card-${initialExpandedSubjectId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Adiciona um brilho temporário para destaque
                    el.classList.add('ring-2', 'ring-primary/50');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-primary/50'), 2000);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, initialExpandedSubjectId]);

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
    // Estado de tópicos inativos (lixeira local por matéria) — chave: subjectId
    const [inactiveTopics, setInactiveTopics] = useState<Record<string, Topic[]>>({});
    const [showInactiveIds, setShowInactiveIds] = useState<string[]>([]); // IDs de matérias com lixeira aberta
    const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
    const [editingSubjectName, setEditingSubjectName] = useState('');
    const [notesModal, setNotesModal] = useState<{ isOpen: boolean; subjectId: string; subjectName: string }>({
        isOpen: false, subjectId: '', subjectName: ''
    });
    const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

    // Limpa o status de "Sincronizado" após alguns segundos para feedback dinâmico
    useEffect(() => {
        if (syncStatus === 'saved') {
            const timer = setTimeout(() => setSyncStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [syncStatus]);
    
    // ── IA Add Mode ──────────────────────────────────────────────────────────
    const [showIaAdd, setShowIaAdd] = useState(false);
    const [iaSubjectName, setIaSubjectName] = useState('');
    const [iaInputText, setIaInputText] = useState('');
    const [iaStage, setIaStage] = useState<'input' | 'processing' | 'review'>('input');
    const [aiResult, setAiResult] = useState<AiSubject[]>([]);
    const [isProcessingIa, setIsProcessingIa] = useState(false);

    // ── Funções de troca de edital ──────────────────────────────────────────
    const hasUnsavedChanges = useMemo(() => {
        return newSubjectName.trim().length > 0 ||
            Object.values(newTopicTexts).some(t => t.trim().length > 0) ||
            (editingTopicId !== null && editingTopicName.trim().length > 0);
    }, [newSubjectName, newTopicTexts, editingTopicId, editingTopicName]);

    const handleEditalChange = (newEditalId: string) => {
        const newEdital = editais?.find(e => e.id === newEditalId);
        if (!newEdital || newEdital.id === selectedEdital.id) return;

        if (hasUnsavedChanges) {
            setPendingEditalSwitch(newEdital);
            setShowSwitchConfirm(true);
        } else {
            applyEditalSwitch(newEdital);
        }
    };

    const applyEditalSwitch = (newEdital: UserEdital) => {
        setNewSubjectName('');
        setNewTopicTexts({});
        setEditingTopicId(null);
        setEditingTopicName('');
        setSelectedEdital(newEdital);
        setLocalSubjects(allSubjects.filter(s => newEdital.subjectIds.includes(s.id)));
        setLocalEditalIds(newEdital.subjectIds);
        setLocalActiveIds(newEdital.activeSubjectIds?.length ? newEdital.activeSubjectIds : newEdital.subjectIds);
        setShowIaAdd(false);
        setIaSubjectName('');
        setIaInputText('');
        setIaStage('input');
        setAiResult([]);
        setShowSwitchConfirm(false);
        setPendingEditalSwitch(null);
    };

    const confirmEditalSwitch = () => {
        if (pendingEditalSwitch) {
            applyEditalSwitch(pendingEditalSwitch);
        }
    };

    const cancelEditalSwitch = () => {
        setShowSwitchConfirm(false);
        setPendingEditalSwitch(null);
    };

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
        // Reset IA states
        setShowIaAdd(false);
        setIaSubjectName('');
        setIaInputText('');
        setIaStage('input');
        setAiResult([]);
        onClose();
    }, [onClose, refreshData, refreshOrigins]);

    const handleBack = useCallback(() => {
        handleClose();
        onBack?.();
    }, [handleClose, onBack]);

    // ── Processar com IA ─────────────────────────────────────────────────────
    const handleIaProcess = useCallback(async () => {
        if (!iaSubjectName.trim() || !iaInputText.trim() || !user) return;
        
        setIsProcessingIa(true);
        setIaStage('processing');
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autorizado');
            
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-edital`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    inputText: iaInputText,
                    isComplementMode: true,
                    subjectName: iaSubjectName.trim()
                })
            });
            
            const result = await response.json();
            
            if (result.error) throw new Error(result.error);
            
            interface ExtractionResult {
                s?: { 
                    t?: string; 
                    title?: string; 
                    p?: { n?: string; name?: string }[]; 
                    topics?: { n?: string; name?: string }[] 
                }[];
                subjects?: { 
                    t?: string; 
                    title?: string; 
                    p?: { n?: string; name?: string }[]; 
                    topics?: { n?: string; name?: string }[] 
                }[];
            }

            let parsed: ExtractionResult;
            try {
                parsed = typeof result.text === 'string' ? JSON.parse(result.text) : result.text;
            } catch {
                parsed = { s: [] };
            }
            
            const subjects = parsed.s || parsed.subjects || [];
            const mapped: AiSubject[] = subjects.map(s => ({
                title: s.t || s.title || iaSubjectName.trim(),
                topics: (s.p || s.topics || []).map(t => ({
                    name: t.n || t.name || '',
                    selected: true
                })).filter(t => t.name.trim()),
                selected: true
            }));
            
            // Force subject name to user input
            const adjustedResults = mapped.map(s => ({ 
                ...s, 
                title: iaSubjectName.trim() 
            }));
            
            setAiResult(adjustedResults);
            setIaStage('review');
            
        } catch (error: unknown) {
            console.error('Erro na IA:', error);
            errorService.report(error instanceof Error ? error : new Error(String(error)), { 
                module: 'EditalSubjectsModal', 
                action: 'iaProcess', 
                userMessage: 'Erro ao processar com IA' 
            });
            setIaStage('input');
        } finally {
            setIsProcessingIa(false);
        }
    }, [iaSubjectName, iaInputText, user]);

    // ── Confirmar e adicionar tópicos da IA ─────────────────────────────────
    const handleIaConfirm = useCallback(async () => {
        if (!user || !iaSubjectName.trim()) return;
        
        setIsSavingSubject(true);
        try {
            const selectedTopics = aiResult
                .filter(s => s.selected)
                .flatMap(s => s.topics.filter(t => t.selected))
                .map((t, idx) => {
                    const cleanName = t.name.trim();
                    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                    return {
                        id: tmpId(),
                        name: formattedName.length > 500 ? formattedName.substring(0, 497) + '...' : formattedName,
                        completed: false,
                        reviewCount: 0,
                        review_count: 0,
                        position: idx
                    };
                });
            
            // Check if subject already exists
            const existingSubject = localSubjects.find(
                s => s.name.toLowerCase() === iaSubjectName.trim().toLowerCase()
            );
            
            if (existingSubject) {
                // Add topics to existing subject (in 'topics' table)
                const existingTopicNames = new Set(existingSubject.topics.map(t => t.name.toLowerCase()));
                const newTopics = selectedTopics.filter(t => !existingTopicNames.has(t.name.toLowerCase()));
                
                if (newTopics.length > 0) {
                    const topicsToInsert = newTopics.map((t, idx) => ({
                        subject_id: existingSubject.id,
                        edital_id: selectedEdital.id,
                        name: t.name,
                        completed: false,
                        review_count: 0,
                        review_stage: null,
                        position: existingSubject.topics.length + idx
                    }));
                    
                    const { error: insertErr } = await supabase
                        .from('topics')
                        .insert(topicsToInsert);
                    
                    if (insertErr) throw insertErr;
                }
                
                const updatedSubjects = localSubjects.map(s => {
                    if (s.id === existingSubject.id) {
                        return { ...s, topics: [...s.topics, ...newTopics] };
                    }
                    return s;
                });
                
                setLocalSubjects(updatedSubjects);
                hasPendingSync.current = true;
                setSyncStatus('saved');
            } else {
                // Create new subject with (Complemento) suffix
                const { data: created, error: createErr } = await supabase
                    .from('subjects')
                    .insert({
                        user_id: user.id,
                        name: `${iaSubjectName.trim()} (Complemento)`,
                        status: 'Nova',
                        edital_id: selectedEdital.id
                    })
                    .select()
                    .single();
                
                if (createErr) throw createErr;
                
                // Insert topics into 'topics' table
                if (selectedTopics.length > 0) {
                    const topicsToInsert = selectedTopics.map((t, idx) => ({
                        subject_id: created.id,
                        edital_id: selectedEdital.id, // Mandatory for persistence
                        name: t.name.length > 500 ? t.name.substring(0, 497) + '...' : t.name,
                        completed: false,
                        review_count: 0,
                        review_stage: null,
                        position: idx
                    }));
                    
                    const { error: insertErr } = await supabase
                        .from('topics')
                        .insert(topicsToInsert);
                    
                    if (insertErr) throw insertErr;
                }
                
                const newSubjectIds = [...localEditalIds, created.id];
                const newSubjectWithTopics = { ...created, topics: selectedTopics } as Subject;
                setLocalSubjects([...localSubjects, newSubjectWithTopics]);
                setLocalEditalIds(newSubjectIds);
                
                await editaisTable()
                    .update({ 
                        subject_ids: newSubjectIds,
                        active_subject_ids: newSubjectIds,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', edital.id);
                
                hasPendingSync.current = true;
                setSyncStatus('saved');
                
                onUpdate({ ...edital, subjectIds: newSubjectIds, activeSubjectIds: newSubjectIds });
            }
            
            setSyncStatus('saved');
            setShowIaAdd(false);
            setIaSubjectName('');
            setIaInputText('');
            setIaStage('input');
            setAiResult([]);
            
            toast.success('Matéria adicionada com sucesso!');
            
        } catch (error: unknown) {
            console.error('Erro ao salvar:', error);
            errorService.report(error instanceof Error ? error : new Error(String(error)), { 
                module: 'EditalSubjectsModal', 
                action: 'iaConfirm', 
                userMessage: 'Erro ao adicionar matéria' 
            });
        } finally {
            setIsSavingSubject(false);
        }
    }, [user, iaSubjectName, aiResult, localSubjects, localEditalIds, edital, selectedEdital.id, onUpdate]);

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

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const isCurrentlyExpanded = prev.includes(id);
            if (!isCurrentlyExpanded) {
                // Carrega tópicos inativos ao expandir pela primeira vez
                loadInactiveTopics(id);
            }
            return isCurrentlyExpanded ? prev.filter(i => i !== id) : [...prev, id];
        });
    };

    // ── Salvar nova matéria ───────────────────────────────────────────────
    const handleSaveSubject = useCallback(async () => {
        const name = newSubjectName.trim().toUpperCase();
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
        setExpandedIds(prev => [...prev, placeholderId]);
        setNewSubjectName('');
        setSyncStatus('saving');

        try {
            const { data: newSubj, error: subjErr } = await supabase
                .from('subjects').insert({ 
                    user_id: user.id, 
                    name, 
                    status: 'Nova',
                    edital_id: edital.id 
                })
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
            setSyncStatus('saved');
            toast.success(`Matéria "${name}" criada!`);
        } catch (err) {
            setLocalSubjects(prev => prev.filter(s => s.id !== placeholderId));
            setExpandedIds(prev => prev.filter(id => id !== placeholderId));
            setSyncStatus('error');
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
        setSyncStatus('saving');

        try {
            // 0. Remove histórico de revisões dos tópicos desta matéria ANTES (limpeza profunda)
            const subjectToDelete = localSubjects.find(s => s.id === subjectId);
            const topicIds = subjectToDelete?.topics.map(t => t.id) || [];
            
            if (topicIds.length > 0) {
                const { error: histErr } = await supabase
                    .from('topic_review_history')
                    .delete()
                    .in('topic_id', topicIds);
                if (histErr) {
                    console.error('Erro ao excluir histórico da matéria:', histErr);
                    // Não travamos o fluxo principal, mas registramos
                }
            }

            // 1. Remove tópicos ANTES da matéria (FK constraint)
            const { error: topicsErr } = await supabase
                .from('topics').delete().eq('subject_id', subjectId);
            if (topicsErr) throw topicsErr;

            // 2. Remove a matéria
            const { error: subjErr } = await supabase
                .from('subjects').delete().eq('id', subjectId);
            if (subjErr) throw subjErr;

            // 3. Remover do Ciclo de Estudos (user_cycles) — Evita dados órfãos na página de Revisões
            const { data: currentCycle } = await supabase
                .from('user_cycles')
                .select('id, ciclo_atual')
                .eq('user_id', user!.id)
                .maybeSingle();

            if (currentCycle && currentCycle.ciclo_atual) {
                const currentIds = (currentCycle.ciclo_atual as string[]) || [];
                const newCycleIds = currentIds.filter(id => id !== subjectId);
                
                if (newCycleIds.length !== currentIds.length) {
                    await supabase
                        .from('user_cycles')
                        .update({ ciclo_atual: newCycleIds, atualizado_em: new Date().toISOString() })
                        .eq('id', currentCycle.id);
                    window.dispatchEvent(new CustomEvent('cycleUpdated'));
                }
            }

            // 4. Atualiza o edital (retira de subject_ids e active_subject_ids)
            const { error: edErr } = await editaisTable()
                .update({ subject_ids: updatedIds, active_subject_ids: updatedActiveIds }).eq('id', edital.id);
            if (edErr) throw edErr;

            onUpdate({ ...edital, subjectIds: updatedIds, activeSubjectIds: updatedActiveIds });
            hasPendingSync.current = true;
            setSyncStatus('saved');
            toast.success(`"${subjectName}" excluída permanentemente.`);
        } catch (err) {
            // Reverte otimismo
            setLocalSubjects(allSubjects.filter(s => edital.subjectIds.includes(s.id)));
            setLocalEditalIds(edital.subjectIds);
            setLocalActiveIds(edital.activeSubjectIds?.length ? edital.activeSubjectIds : edital.subjectIds);
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'deleteSubject', userMessage: 'Erro ao excluir matéria.' });
        }
    }, [localEditalIds, localActiveIds, edital, allSubjects, onUpdate, localSubjects]);

    // ── Alternar ativo/inativo (visível/oculto no Ciclo de Estudos) ───────
    const handleToggleSubjectActive = useCallback(async (subjectId: string, subjectName: string) => {
        const isCurrentlyActive = localActiveIds.includes(subjectId);
        const newActiveIds = isCurrentlyActive
            ? localActiveIds.filter(id => id !== subjectId)
            : [...localActiveIds, subjectId];

        // Otimismo
        setLocalActiveIds(newActiveIds);
        setSyncStatus('saving');

        try {
            const { error } = await editaisTable()
                .update({ active_subject_ids: newActiveIds }).eq('id', edital.id);
            if (error) throw error;

            onUpdate({ ...edital, activeSubjectIds: newActiveIds });
            hasPendingSync.current = true;
            setSyncStatus('saved');
            toast.success(
                isCurrentlyActive
                    ? `"${subjectName}" ocultada do Ciclo de Estudos.`
                    : `"${subjectName}" ativada no Ciclo de Estudos.`,
                { duration: 1500 }
            );
        } catch (err) {
            // Reverte
            setLocalActiveIds(localActiveIds);
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'toggleActive', userMessage: 'Erro ao alterar visibilidade.' });
        }
    }, [localActiveIds, edital, onUpdate]);

    // ── Salvar novo tópico inline ──────────────────────────────────────────
    const handleSaveNewTopic = useCallback(async (subjectId: string) => {
        const rawText = newTopicTexts[subjectId]?.trim();
        if (!rawText || savingTopics[subjectId] || !user) return;
        const text = rawText.charAt(0).toUpperCase() + rawText.slice(1);

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
        setSyncStatus('saving');

        try {
            const { data: newTopic, error } = await supabase.from('topics').insert({
                subject_id: subjectId, 
                edital_id: selectedEdital.id,
                name: text, 
                completed: false, 
                review_count: 0, 
                review_stage: null,
            }).select('id').single();
            if (error) throw error;

            setLocalSubjects(prev => prev.map(s =>
                s.id === subjectId
                    ? { ...s, topics: s.topics.map(t => t.id === placeholderTopic.id ? { ...t, id: newTopic.id } : t) }
                    : s
            ));
            hasPendingSync.current = true;
            setSyncStatus('saved');
        } catch (err) {
            setLocalSubjects(prev => prev.map(s =>
                s.id === subjectId ? { ...s, topics: s.topics.filter(t => t.id !== placeholderTopic.id) } : s
            ));
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'saveTopic', userMessage: 'Erro ao adicionar tópico.' });
        } finally {
            setSavingTopics(prev => ({ ...prev, [subjectId]: false }));
        }
    }, [newTopicTexts, savingTopics, user, selectedEdital.id]);

    // ── Editar tópico ──────────────────────────────────────────────────────
    const handleSaveTopicEdit = useCallback(async () => {
        if (!editingTopicId || !editingTopicName.trim()) return;
        const rawName = editingTopicName.trim();
        const newName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        setLocalSubjects(prev => prev.map(s => ({
            ...s, topics: s.topics.map(t => t.id === editingTopicId ? { ...t, name: newName } : t)
        })));
        setEditingTopicId(null);
        setEditingTopicName('');
        setSyncStatus('saving');
        try {
            const { error } = await supabase.from('topics').update({ name: newName }).eq('id', editingTopicId);
            if (error) throw error;
            hasPendingSync.current = true;
            setSyncStatus('saved');
        } catch (err) {
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'editTopic', userMessage: 'Erro ao renomear.' });
        }
    }, [editingTopicId, editingTopicName]);

    // ── Renomear matéria ──────────────────────────────────────────────────
    const handleSaveSubjectEdit = useCallback(async () => {
        if (!editingSubjectId || !editingSubjectName.trim()) return;
        const newName = editingSubjectName.trim().toUpperCase();
        
        // Otimismo
        setLocalSubjects(prev => prev.map(s => s.id === editingSubjectId ? { ...s, name: newName } : s));
        setEditingSubjectId(null);
        setEditingSubjectName('');
        setSyncStatus('saving');

        try {
            const { error } = await supabase.from('subjects').update({ name: newName }).eq('id', editingSubjectId);
            if (error) throw error;
            hasPendingSync.current = true;
            setSyncStatus('saved');
            toast.success('Matéria renomeada!');
        } catch (err) {
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'editSubject', userMessage: 'Erro ao renomear.' });
            // Recarrega se der erro
            setLocalSubjects(allSubjects.filter(s => edital.subjectIds.includes(s.id)));
        }
    }, [editingSubjectId, editingSubjectName, allSubjects, edital.subjectIds]);

    const updateSubjectWeightLocal = useCallback((
        subjectId: string,
        field: 'exam_weight_questions' | 'exam_weight_points' | 'exam_weight_percentage',
        value: string
    ) => {
        const parsed = parseOptionalNumberInput(value);
        setLocalSubjects(prev => prev.map(subject => {
            if (subject.id !== subjectId) return subject;
            const nextSubject = {
                ...subject,
                [field]: parsed
            };

            if (parsed !== null) {
                nextSubject.exam_weight_raw = 'Informado manualmente pelo aluno na edição do edital';
            }

            return nextSubject;
        }));
    }, []);

    const handleSaveSubjectWeight = useCallback(async (subjectId: string) => {
        const subject = localSubjects.find(item => item.id === subjectId);
        if (!subject) return;

        setSyncStatus('saving');
        try {
            const hasWeight = hasSubjectWeight(subject);
            const { error } = await supabase
                .from('subjects')
                .update({
                    exam_weight_questions: subject.exam_weight_questions ?? null,
                    exam_weight_points: subject.exam_weight_points ?? null,
                    exam_weight_percentage: subject.exam_weight_percentage ?? null,
                    exam_weight_raw: hasWeight ? subject.exam_weight_raw || 'Informado manualmente pelo aluno na edição do edital' : null
                } as any)
                .eq('id', subjectId);

            if (error) throw error;
            hasPendingSync.current = true;
            setSyncStatus('saved');
        } catch (err) {
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'editSubjectWeight', userMessage: 'Erro ao salvar peso da matéria.' });
        }
    }, [localSubjects]);

    // ── Excluir tópico — pede confirmação inline primeiro ─────────────────
    const handleRequestDeleteTopic = useCallback((topicId: string) => {
        setConfirmDeleteTopicId(prev => prev === topicId ? null : topicId);
    }, []);

    const handleConfirmDeleteTopic = useCallback(async (topicId: string, subjectId: string) => {
        setConfirmDeleteTopicId(null);
        // Otimismo: move para lista de inativos na UI imediatamente
        const topicToDeactivate = localSubjects
            .find(s => s.id === subjectId)?.topics.find(t => t.id === topicId);

        if (topicToDeactivate) {
            setInactiveTopics(prev => ({
                ...prev,
                [subjectId]: [...(prev[subjectId] || []), topicToDeactivate]
            }));
        }
        setLocalSubjects(prev => prev.map(s =>
            s.id === subjectId ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s
        ));
        setSyncStatus('saving');
        try {
            // Soft Delete: marca como inativo em vez de excluir permanentemente
            const { error } = await supabase
                .from('topics')
                .update({ is_active: false, deleted_at: new Date().toISOString() } as any)
                .eq('id', topicId);
            if (error) throw error;
            hasPendingSync.current = true;
            setSyncStatus('saved');
            toast.success('Tópico movido para a lixeira.', { duration: 2000 });
        } catch (err) {
            // Reverte otimismo
            if (topicToDeactivate) {
                setLocalSubjects(prev => prev.map(s =>
                    s.id === subjectId ? { ...s, topics: [...s.topics, topicToDeactivate] } : s
                ));
                setInactiveTopics(prev => ({
                    ...prev,
                    [subjectId]: (prev[subjectId] || []).filter(t => t.id !== topicId)
                }));
            }
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'softDeleteTopic', userMessage: 'Erro ao mover tópico para lixeira.' });
        }
    }, [localSubjects]);

    // ── Restaurar tópico da lixeira ────────────────────────────────────────
    const handleRestoreTopic = useCallback(async (topicId: string, subjectId: string) => {
        const topicToRestore = inactiveTopics[subjectId]?.find(t => t.id === topicId);
        if (!topicToRestore) return;

        // Otimismo: move de volta para lista ativa
        setInactiveTopics(prev => ({
            ...prev,
            [subjectId]: (prev[subjectId] || []).filter(t => t.id !== topicId)
        }));
        setLocalSubjects(prev => prev.map(s =>
            s.id === subjectId ? { ...s, topics: [...s.topics, topicToRestore] } : s
        ));
        setSyncStatus('saving');
        try {
            const { error } = await supabase
                .from('topics')
                .update({ is_active: true, deleted_at: null } as any)
                .eq('id', topicId);
            if (error) throw error;
            hasPendingSync.current = true;
            setSyncStatus('saved');
            toast.success('Tópico restaurado!', { duration: 2000 });
        } catch (err) {
            // Reverte otimismo
            setLocalSubjects(prev => prev.map(s =>
                s.id === subjectId ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s
            ));
            setInactiveTopics(prev => ({
                ...prev,
                [subjectId]: [...(prev[subjectId] || []), topicToRestore]
            }));
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'restoreTopic', userMessage: 'Erro ao restaurar tópico.' });
        }
    }, [inactiveTopics]);

    // ── Carregar tópicos inativos ao expandir matéria ─────────────────────
    const loadInactiveTopics = useCallback(async (subjectId: string) => {
        if (inactiveTopics[subjectId]) return; // Já carregados
        try {
            const { data, error } = await supabase
                .from('topics')
                .select('id, name, completed, review_count, subject_id')
                .eq('subject_id', subjectId)
                .eq('is_active', false) as any;
            if (error) throw error;
            setInactiveTopics(prev => ({
                ...prev,
                [subjectId]: (data || []).map((t: any) => ({
                    ...t,
                    reviewCount: t.review_count || 0,
                    subtopics: [],
                } as Topic))
            }));
        } catch (err) {
            console.error('Erro ao carregar tópicos inativos:', err);
            setInactiveTopics(prev => ({ ...prev, [subjectId]: [] }));
        }
    }, [inactiveTopics]);

    const isEditable = !selectedEdital.sourceId || !!selectedEdital.isImported;

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
                    className="relative w-full max-w-5xl bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
                >
                    {/* ── Header ── */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            {initialExpandedSubjectId && (
                                <button
                                    onClick={onBack ? handleBack : handleClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 transition-all text-primary shrink-0 -ml-1 group"
                                    title={onBack ? "Voltar para Ciclo de Estudos" : "Voltar para Matérias"}
                                >
                                    <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                                </button>
                            )}
                            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                <GraduationCap className="text-primary" size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Database size={12} className="text-primary/80 shrink-0" />
                                            <span className="text-sm font-black text-primary uppercase tracking-wider truncate max-w-[400px]">
                                                {initialExpandedSubjectId ? (
                                                    <span className="flex items-center gap-2">
                                                        <span className="opacity-40 hover:opacity-100 cursor-pointer transition-opacity" onClick={handleClose}>EDITAIS</span>
                                                        <span className="opacity-20">/</span>
                                                        <span>{selectedEdital.name}</span>
                                                    </span>
                                                ) : selectedEdital.name}
                                            </span>
                                        </div>

                                        {selectedEdital.sourceId ? (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 shrink-0">
                                                <Database size={8} className="text-sky-400" />
                                                <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest">SISTEMA</span>
                                            </div>
                                        ) : selectedEdital.isImported ? (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 shrink-0">
                                                <Sparkles size={8} className="text-purple-400" />
                                                <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">IA</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-500/10 border border-zinc-500/20 shrink-0">
                                                <FileText size={8} className="text-zinc-400" />
                                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">MANUAL</span>
                                            </div>
                                        )}
                                        
                                        {/* Status de Sincronização */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <div className="w-px h-3 bg-white/10 mx-1" />
                                            {syncStatus === 'saving' && (
                                                <div className="flex items-center gap-1.5">
                                                    <Loader2 size={10} className="animate-spin text-primary" />
                                                    <span className="text-[9px] font-bold text-primary/70 uppercase tracking-widest">Salvando...</span>
                                                </div>
                                            )}
                                            {syncStatus === 'saved' && (
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle2 size={10} className="text-emerald-500" />
                                                    <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">Sincronizado</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {(selectedEdital.position || selectedEdital.year) && (
                                        <span className="text-[10px] font-bold text-content-muted uppercase tracking-widest truncate mt-0.5">
                                            {[selectedEdital.position, selectedEdital.year].filter(Boolean).join(' • ')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-content-muted mt-0.5">
                                    {localSubjects.length} {localSubjects.length === 1 ? 'matéria' : 'matérias'} e {totalTopics} {totalTopics === 1 ? 'tópico' : 'tópicos'}
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

                    {/* ── Input nova matéria (TODOS os editais) ── */}
                    <div className="px-6 pb-6 pt-2 shrink-0 space-y-3">
                        {/* Modo IA */}
                        {showIaAdd ? (
                                <div className="glow-card p-4 rounded-2xl border border-primary/30 bg-zinc-800/30">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={16} className="text-primary" />
                                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Adicionar com IA</span>
                                        </div>
                                        <button
                                            onClick={() => { setShowIaAdd(false); setIaSubjectName(''); setIaInputText(''); setIaStage('input'); }}
                                            className="p-1 hover:bg-white/5 rounded transition-colors text-content-muted hover:text-zinc-100"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    {iaStage === 'input' && (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Nome da matéria (ex: Português)"
                                                value={iaSubjectName}
                                                onChange={e => setIaSubjectName(e.target.value.toUpperCase())}
                                                className="w-full h-9 bg-zinc-950/50 border border-white/10 rounded-xl px-3 text-xs focus:outline-none focus:border-primary/50 transition-all text-content-main placeholder:text-content-muted/40"
                                            />
                                            <textarea
                                                placeholder="Cole aqui APENAS os tópicos da matéria (sem nome da matéria)..."
                                                value={iaInputText}
                                                onChange={e => setIaInputText(e.target.value)}
                                                rows={4}
                                                className="w-full bg-zinc-950/50 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-primary/50 transition-all text-content-main placeholder:text-content-muted/40 resize-none"
                                            />
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={handleIaProcess}
                                                    disabled={!iaSubjectName.trim() || !iaInputText.trim() || isProcessingIa}
                                                    className="flex items-center gap-2 px-4 h-9 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black rounded-xl transition-all"
                                                >
                                                    {isProcessingIa ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                                                    <span>PROCESSAR</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {iaStage === 'processing' && (
                                        <div className="py-8 flex flex-col items-center justify-center text-center">
                                            <Loader2 size={24} className="animate-spin text-primary mb-3" />
                                            <p className="text-xs text-content-main font-medium">Processando com IA...</p>
                                            <p className="text-[10px] text-content-muted mt-1">Extraindo tópicos automaticamente</p>
                                        </div>
                                    )}

                                    {iaStage === 'review' && aiResult.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-content-main">{iaSubjectName}</span>
                                                <span className="text-[10px] text-content-muted">{aiResult[0].topics.length} tópicos encontrados</span>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto space-y-1 bg-zinc-900/50 rounded-lg p-2 border border-white/5">
                                                {aiResult[0].topics.map((topic, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5">
                                                        <span className="text-[9px] font-bold text-content-muted w-4">{idx + 1}.</span>
                                                        <span className="text-xs text-content-main flex-1 break-words">{topic.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between">
                                                <button
                                                    onClick={() => { setIaStage('input'); setAiResult([]); }}
                                                    className="px-3 h-8 text-[10px] font-bold text-content-muted hover:text-zinc-100 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                                                >
                                                    VOLTAR
                                                </button>
                                                <button
                                                    onClick={handleIaConfirm}
                                                    disabled={isSavingSubject}
                                                    className="flex items-center gap-2 px-4 h-8 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-[10px] font-black rounded-xl transition-all"
                                                >
                                                    {isSavingSubject ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                    <span>ADICIONAR</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Modo Manual */
                                isEditable ? (
                                    <div className="flex items-center gap-3 self-start">
                                        <div className="glow-card p-3 rounded-2xl flex items-center gap-3 border border-white/5 bg-zinc-800/20 flex-1 self-center">
                                            <div className="relative flex-1">
                                                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Nome da matéria (ex: Português)"
                                                    value={newSubjectName}
                                                    onChange={e => setNewSubjectName(e.target.value.toUpperCase())}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveSubject(); }}
                                                    className="w-full h-9 bg-zinc-950/50 border border-white/5 rounded-xl py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:border-primary/30 transition-all text-content-main placeholder:text-content-muted/40"
                                                />
                                            </div>
                                            
                                            <button
                                                onClick={handleSaveSubject}
                                                disabled={!newSubjectName.trim() || isSavingSubject}
                                                className="flex items-center gap-2 px-4 h-9 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 shrink-0"
                                            >
                                                {isSavingSubject ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                <span className="hidden xs:inline uppercase tracking-widest">SALVAR</span>
                                            </button>
                                        </div>
                                        
                                        <button
                                            onClick={() => setShowIaAdd(true)}
                                            className="flex items-center gap-2 px-4 h-9 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[10px] font-bold rounded-xl transition-all shrink-0"
                                        >
                                            <Sparkles size={14} />
                                            <span className="whitespace-nowrap">Gerar com IA</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 self-start mb-2">
                                        <AlertTriangle size={14} className="text-amber-500" />
                                        <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">
                                            Edital do sistema - Conteúdo protegido
                                        </span>
                                    </div>
                                )
                            )}
                        </div>

                    {/* ── Lista de matérias ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 no-scrollbar">
                        {filteredSubjects.length === 0 ? (
                            <div className="py-20 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4 border border-white/5 shadow-inner">
                                    <BookOpen size={28} className="text-content-muted/40" />
                                </div>
                                <h3 className="text-base font-bold text-content-main mb-2">
                                    {searchQuery ? 'Nenhum resultado' : 'Edital sem matérias'}
                                </h3>
                                <p className="text-xs text-content-muted/60 max-w-[280px] leading-relaxed">
                                    {searchQuery 
                                        ? `Não encontramos nada para "${searchQuery}". Tente outro termo.` 
                                        : edital.isImported 
                                            ? 'Este edital do sistema está aguardando a inserção de conteúdos pela nossa equipe.' 
                                            : 'Você ainda não adicionou nenhuma matéria. Use o campo acima para começar seu edital manual!'}
                                </p>
                            </div>
                        ) : (
                            filteredSubjects.map((subject, index) => {
                                const progress = getProgress(subject);
                                const isExpanded = expandedIds.includes(subject.id);
                                const isTemp = subject.id.startsWith('tmp_');
                                const isPendingDelete = confirmDeleteSubjectId === subject.id;

                                return (
                                    <div key={subject.id} className={`flex flex-col mb-3 group transition-all relative overflow-hidden glow-card rounded-[24px] border border-white/5
                                        ${isTemp ? 'opacity-60 cursor-default' : ''}
                                        ${isPendingDelete ? 'border-red-500/30 opacity-70' : ''}`}>
                                        
                                        {/* ── Confirmação inline de exclusão ── */}
                                        <AnimatePresence>
                                            {isPendingDelete && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden bg-red-500/10"
                                                >
                                                    <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-red-500/20">
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
                                            id={`subject-card-${subject.id}`}
                                            onClick={() => !isTemp && !isPendingDelete && toggleExpand(subject.id)}
                                            className={`px-6 py-4 flex items-center justify-between cursor-pointer bg-background ${isExpanded ? 'border-b border-white/5' : ''} relative z-10`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {isTemp ? (
                                                    <Loader2 size={14} className="animate-spin text-content-muted shrink-0" />
                                                ) : (
                                                    <GripVertical size={14} className="text-content-muted shrink-0" />
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {editingSubjectId === subject.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="text"
                                                                    value={editingSubjectName}
                                                                    onChange={e => setEditingSubjectName(e.target.value.toUpperCase())}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter') handleSaveSubjectEdit();
                                                                        if (e.key === 'Escape') setEditingSubjectId(null);
                                                                        e.stopPropagation();
                                                                    }}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="h-7 text-xs px-2 w-full bg-zinc-950 border border-primary/30 rounded outline-none ring-0 text-white font-black uppercase tracking-widest"
                                                                    autoFocus
                                                                />
                                                                <button onClick={e => { e.stopPropagation(); handleSaveSubjectEdit(); }} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"><Check size={14} /></button>
                                                                <button onClick={e => { e.stopPropagation(); setEditingSubjectId(null); }} className="p-1 text-content-muted hover:bg-white/5 rounded"><X size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <span 
                                                                className={`text-xs font-black uppercase tracking-widest text-primary/80 truncate ${isEditable ? 'hover:text-primary transition-colors' : ''}`}
                                                                onClick={(e) => {
                                                                    if (isEditable) {
                                                                        e.stopPropagation();
                                                                        setEditingSubjectId(subject.id);
                                                                        setEditingSubjectName(subject.name);
                                                                    }
                                                                }}
                                                            >
                                                                {subject.name}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-content-muted font-semibold tabular-nums ml-2">
                                                            {subject.topics.length} {subject.topics.length === 1 ? 'tópico' : 'tópicos'}
                                                        </span>
                                                        {hasSubjectWeight(subject) && (
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 py-0.5">
                                                                {getSubjectWeightLabel(subject)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {!isTemp && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {/* Progresso circular */}
                                                    <div className="hidden sm:flex items-center justify-center relative w-8 h-8 rounded-full bg-zinc-900 border border-white/5 mr-1 overflow-hidden shadow-sm">
                                                        <svg className="w-full h-full -rotate-90 p-1" viewBox="0 0 100 100" shapeRendering="geometricPrecision">
                                                            <circle 
                                                                className="text-white/5" 
                                                                strokeWidth="10" 
                                                                stroke="currentColor" 
                                                                fill="transparent" 
                                                                r="42" 
                                                                cx="50" 
                                                                cy="50" 
                                                            />
                                                            <circle 
                                                                className="text-primary transition-all duration-1000 ease-out" 
                                                                strokeWidth="10" 
                                                                strokeDasharray={`${(progress / 100) * 263.89}, 263.89`}
                                                                strokeLinecap="round" 
                                                                stroke="currentColor" 
                                                                fill="transparent" 
                                                                r="42" 
                                                                cx="50" 
                                                                cy="50" 
                                                            />
                                                        </svg>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-content-main tabular-nums leading-none tracking-tighter">{progress}%</span>
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
                                                    {/* Botão de Visibilidade (Apenas para Importados: Sistema ou IA) */}
                                                    {(selectedEdital.sourceId || edital.isImported) && (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                handleToggleSubjectActive(subject.id, subject.name);
                                                            }}
                                                            title={localActiveIds.includes(subject.id) ? 'Ocultar do Ciclo de Estudos' : 'Mostrar no Ciclo de Estudos'}
                                                            className={`p-1.5 rounded-lg transition-all
                                                                ${localActiveIds.includes(subject.id)
                                                                    ? 'text-content-muted hover:text-amber-400 hover:bg-amber-500/10'
                                                                    : 'text-amber-400 bg-amber-500/10 opacity-100'
                                                                } ${!localActiveIds.includes(subject.id) ? '' : 'sm:opacity-0 group-hover:opacity-100'}`}
                                                        >
                                                            {localActiveIds.includes(subject.id)
                                                                ? <Eye size={14} />
                                                                : <EyeOff size={14} />
                                                            }
                                                        </button>
                                                    )}

                                                    {/* Botão de Excluir (IA ou Manual - Não Sistema) */}
                                                    {isEditable && (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteSubjectId(prev => prev === subject.id ? null : subject.id);
                                                            }}
                                                            title="Excluir matéria permanentemente"
                                                            className={`p-1.5 rounded-lg transition-all sm:opacity-0 group-hover:opacity-100
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
                                                    <div className="flex flex-col">
                                                        <div className="px-4 py-3 border-b border-white/5">
                                                            <div className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
                                                                <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5">
                                                                    <div>
                                                                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-content-muted">Peso da prova</p>
                                                                        <p className="text-[10px] text-content-muted">Preencha só se constar no edital.</p>
                                                                    </div>
                                                                    <span className="text-[8px] font-black uppercase tracking-[0.14em] text-content-muted border border-white/10 rounded-md px-1.5 py-0.5">
                                                                        Opcional
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                                                                    <label className="space-y-1">
                                                                        <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.14em]">Questões</span>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            value={subject.exam_weight_questions ?? ''}
                                                                            onChange={e => updateSubjectWeightLocal(subject.id, 'exam_weight_questions', e.target.value)}
                                                                            onBlur={() => handleSaveSubjectWeight(subject.id)}
                                                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveSubjectWeight(subject.id); }}
                                                                            disabled={!isEditable}
                                                                            className="w-full h-9 px-3 bg-black/30 border border-white/5 rounded-lg text-[12px] font-bold text-content-main outline-none disabled:opacity-60 focus:border-primary/30 transition-colors"
                                                                            placeholder="Ex.: 10"
                                                                        />
                                                                    </label>
                                                                    <label className="space-y-1">
                                                                        <span className="block text-[8px] font-black text-content-muted uppercase tracking-[0.14em]">Pontos</span>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={subject.exam_weight_points ?? ''}
                                                                            onChange={e => updateSubjectWeightLocal(subject.id, 'exam_weight_points', e.target.value)}
                                                                            onBlur={() => handleSaveSubjectWeight(subject.id)}
                                                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveSubjectWeight(subject.id); }}
                                                                            disabled={!isEditable}
                                                                            className="w-full h-9 px-3 bg-black/30 border border-white/5 rounded-lg text-[12px] font-bold text-content-main outline-none disabled:opacity-60 focus:border-primary/30 transition-colors"
                                                                            placeholder="Ex.: 20"
                                                                        />
                                                                    </label>
                                                                    {subject.exam_weight_raw && (
                                                                        <p className="sm:col-span-2 text-[10px] text-content-muted leading-relaxed border-t border-white/5 pt-2">
                                                                            {subject.exam_weight_raw.includes('Informado manualmente')
                                                                                ? 'Peso informado manualmente.'
                                                                                : `Evidência: ${subject.exam_weight_raw}`}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Input "Novo tópico..." (IA ou MANUAL) */}
                                                        {isEditable && (
                                                            <div className="relative px-4 py-3 border-b border-white/5">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Novo tópico..."
                                                                    value={newTopicTexts[subject.id] || ''}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        const formatted = val.charAt(0).toUpperCase() + val.slice(1);
                                                                        setNewTopicTexts(prev => ({ ...prev, [subject.id]: formatted }));
                                                                    }}
                                                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveNewTopic(subject.id); }}
                                                                    className="w-full bg-white/5 border border-white/5 rounded-lg py-2 px-3 pr-8 text-xs outline-none ring-0 focus:border-primary/30 transition-colors text-content-main placeholder:text-content-muted/50"
                                                                />
                                                                <button
                                                                    onClick={() => handleSaveNewTopic(subject.id)}
                                                                    disabled={savingTopics[subject.id] || !newTopicTexts[subject.id]?.trim()}
                                                                    className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded hover:bg-primary/20 transition-all disabled:opacity-40"
                                                                >
                                                                    {savingTopics[subject.id] ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Tópicos */}
                                                        {subject.topics.length === 0 ? (
                                                            <p className="text-center text-[10px] text-content-muted uppercase font-bold tracking-widest py-4">
                                                                Nenhum tópico
                                                            </p>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                {subject.topics.map((topic, idx) => {
                                                                    const status = getTopicStatus(topic);
                                                                    const isTmpTopic = topic.id.startsWith('tmp_');
                                                                    return (
                                                                        <div
                                                                            key={topic.id}
                                                                            className={`flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-accent/50 dark:hover:bg-white/[0.03] transition-colors group/topic ${isTmpTopic ? 'opacity-50' : ''}`}
                                                                        >
                                                                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">

                                                                                <div className="shrink-0">
                                                                                    {isTmpTopic
                                                                                        ? <Loader2 size={13} className="animate-spin text-primary/50" />
                                                                                        : topic.completed
                                                                                            ? <CheckCircle2 size={14} className="fill-green-900/40 text-green-500" />
                                                                                            : <Circle size={14} className="text-content-muted" />
                                                                                    }
                                                                                </div>

                                                                                {!isTmpTopic && isEditable && editingTopicId === topic.id ? (
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
                                                                                            className="h-6 text-xs px-2 w-full bg-zinc-800 border border-primary/30 rounded outline-none ring-0 text-white"
                                                                                            autoFocus
                                                                                        />
                                                                                        <button onClick={handleSaveTopicEdit} className="p-0.5 text-emerald-500 hover:bg-emerald-500/10 rounded"><Check size={13} /></button>
                                                                                        <button onClick={() => setEditingTopicId(null)} className="p-0.5 text-content-muted hover:bg-white/5 rounded"><X size={13} /></button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div
                                                                                        className={`flex flex-col flex-1 min-w-0 ${isTmpTopic || !isEditable ? '' : 'cursor-text group-hover/topic:text-primary transition-colors'}`}
                                                                                        onClick={() => {
                                                                                            if (!isTmpTopic && isEditable) { setEditingTopicId(topic.id); setEditingTopicName(topic.name); }
                                                                                        }}
                                                                                    >
                                                                                        <span className={`text-xs font-medium ${topic.completed ? 'text-content-muted line-through' : 'text-content-main'}`}>
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

                                                                            {!isTmpTopic && isEditable && (
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

                                                        {/* ── Seção de Tópicos Inativados (Lixeira) ── */}
                                                        {(() => {
                                                            const subjectInactive = (inactiveTopics[subject.id] || []).filter(t => 
                                                                !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
                                                            );
                                                            if (subjectInactive.length === 0) return null;
                                                            const isShowingInactive = showInactiveIds.includes(subject.id);
                                                            return (
                                                                <div className="border-t border-white/5">
                                                                    <button
                                                                        onClick={() => setShowInactiveIds(prev =>
                                                                            isShowingInactive
                                                                                ? prev.filter(id => id !== subject.id)
                                                                                : [...prev, subject.id]
                                                                        )}
                                                                        className="flex items-center gap-1.5 w-full text-left px-4 py-2 hover:bg-white/[0.02] transition-colors group/trash"
                                                                    >
                                                                        <Trash2 size={11} className="text-zinc-500 group-hover/trash:text-zinc-300 transition-colors" />
                                                                        <span className="text-[9px] font-bold text-zinc-500 group-hover/trash:text-zinc-300 uppercase tracking-widest transition-colors">
                                                                            Lixeira ({subjectInactive.length})
                                                                        </span>
                                                                        <ChevronDown size={10} className={`ml-auto text-zinc-600 transition-transform ${isShowingInactive ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                    <AnimatePresence initial={false}>
                                                                        {isShowingInactive && (
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ duration: 0.15 }}
                                                                                className="overflow-hidden"
                                                                            >
                                                                                <div className="flex flex-col">
                                                                                    {subjectInactive.map(inactiveTopic => (
                                                                                        <div
                                                                                            key={inactiveTopic.id}
                                                                                            className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-zinc-800/20 opacity-60 hover:opacity-80 transition-opacity group/inactive"
                                                                                        >
                                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                                <Trash2 size={11} className="text-zinc-600 shrink-0" />
                                                                                                <span className="text-[11px] text-zinc-400 line-through truncate">{inactiveTopic.name}</span>
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={() => handleRestoreTopic(inactiveTopic.id, subject.id)}
                                                                                                title="Restaurar tópico"
                                                                                                className="px-2 h-5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition-all opacity-0 group-hover/inactive:opacity-100 shrink-0"
                                                                                            >
                                                                                                Restaurar
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            );
                                                        })()}
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

            {/* Confirmação de troca de edital */}
            <AnimatePresence>
                {showSwitchConfirm && pendingEditalSwitch && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-[32px] p-8 shadow-2xl flex flex-col gap-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                    <AlertTriangle size={20} className="text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-100">Alterações não salvas</h3>
                                    <p className="text-[11px] text-content-muted mt-0.5">
                                        Você tem alterações pendentes que serão perdidas.
                                    </p>
                                </div>
                            </div>
                            <p className="text-xs text-content-muted mb-6">
                                Deseja trocar para <span className="font-bold text-content-main">{pendingEditalSwitch.name}</span> e descartar as alterações?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelEditalSwitch}
                                    className="flex-1 px-4 py-2.5 text-xs font-bold text-content-muted bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmEditalSwitch}
                                    className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all"
                                >
                                    Descartar e Trocar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
