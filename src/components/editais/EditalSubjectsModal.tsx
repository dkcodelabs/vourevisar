/**
 * EditalSubjectsModal — estado local otimista (sem reload durante uso)
 * - UI atualiza IMEDIATAMENTE, sem chamar refreshData() enquanto modal está aberto
 * - refreshData() só é chamado ao FECHAR o modal
 * - Confirmação de exclusão inline (sem window.confirm)
 * - Inputs sem ring/outline de foco
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Plus, X, Trash2, Check, BookOpen, GraduationCap,
    ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, FileText, Circle, CheckCircle2, Loader2, AlertTriangle,
    Database, Save, Sparkles, BriefcaseBusiness, Gauge, BarChart2, BookPlus
} from 'lucide-react';
import { Subject, Topic, Status } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useTimer } from '@/contexts/TimerContext';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';
import type { UserEdital } from '@/pages/Editais';
import {
    formatExamWeightInputValue,
    getExamWeightTotals,
    getSubjectExamWeightLine,
    hasSubjectExamWeight,
    parseOptionalExamWeightNumber
} from '@/utils/examWeight';
import {
    filterSubjectsAccentInsensitive,
    resolveBulkSubjectName
} from '@/utils/subjectSearch';
import { parseBulkTopics, shouldAdvanceToBulkTopics } from '@/utils/bulkTopicParser';
import { getIncidenceLevelLabel } from '@/utils/topicIncidenceLevel';
import { subjectNameSchema } from '@/lib/validation';
import {
    editalHeaderBadgeTypography,
    editalHeaderExamBoardTypography,
    editalHeaderPositionTypography
} from '@/components/editais/editalHeaderTypography';
import { guardActiveTimerOperation } from '@/utils/activeTimerOperationGuard';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import {
    getEditalSubjectCycleProgress,
    getEditalTopicCycleProgress,
    getEditalTopicProgressBadge
} from '@/utils/editalTopicProgress';
import {
    applyTopicProgressRepairPlan,
    buildEditalTopicProgressRepairPlan,
    toTopicProgressDatabasePatch
} from '@/utils/editalTopicProgressRepair';

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

const parseCycleUnificationMap = (value: unknown): CycleUnificationMap | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Partial<CycleUnificationMap>;
    if (candidate.version !== 1 || !Array.isArray(candidate.editalIds) || !Array.isArray(candidate.unifiedSubjects)) {
        return null;
    }
    return candidate as CycleUnificationMap;
};

export const EditalSubjectsModal = ({
    isOpen, onClose, onBack, edital, editais, allSubjects, onUpdate, initialExpandedSubjectId
}: EditalSubjectsModalProps) => {
    const { user } = useAuth();
    const { activeTimer } = useTimer();
    const { refreshData } = useApp();
    const { refresh: refreshOrigins } = useEditalOriginsWithMerge();

    // ── Estado local otimista ────────────────────────────────────────────
    const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
    const [localEditalIds, setLocalEditalIds] = useState<string[]>([]);
    // IDs das matérias ativas (visíveis no Ciclo de Estudos) — subconjunto de localEditalIds
    const [localActiveIds, setLocalActiveIds] = useState<string[]>([]);
    const [cycleUnificationMap, setCycleUnificationMap] = useState<CycleUnificationMap | null>(null);
    // Flag: só inicializa ao abrir, ignora mudanças externas enquanto modal está aberto
    const initializedRef = useRef(false);
    const hasPendingSync = useRef(false);
    const repairedProgressGroupsRef = useRef(new Set<string>());
    const canRunStructuralOperation = useCallback(
        () => guardActiveTimerOperation(activeTimer),
        [activeTimer],
    );

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
            review_stage: t.review_stage ?? null,
            reviewStage: t.reviewStage,
            first_studied_at: t.first_studied_at ?? null,
            firstStudiedAt: t.firstStudiedAt,
            last_reviewed_at: t.last_reviewed_at ?? null,
            lastReviewedAt: t.lastReviewedAt,
            next_review: t.next_review ?? null,
            nextReview: t.nextReview,
            is_completed: t.is_completed ?? false,
            difficulty_level: t.difficulty_level ?? null,
            incidence_level: t.incidence_level ?? null,
            incidence_score: t.incidence_score ?? null,
            total_volume: t.total_volume ?? null,
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
            setCycleUnificationMap(null);
            repairedProgressGroupsRef.current.clear();
        }
    }, [isOpen, edital, allSubjects]);

    useEffect(() => {
        if (!isOpen || !user?.id) {
            setCycleUnificationMap(null);
            return;
        }

        let cancelled = false;

        const loadCycleUnificationMap = async () => {
            const { data, error } = await supabase
                .from('user_cycles')
                .select('unification_map')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .limit(1)
                .maybeSingle();

            if (cancelled) return;

            if (error) {
                setCycleUnificationMap(null);
                void errorService.report(error, {
                    module: 'EditalSubjectsModal',
                    action: 'loadCycleUnificationMap',
                    userId: user.id,
                    severity: 'low',
                    scope: 'core',
                    featureArea: 'study_cycle',
                    showToast: false,
                });
                return;
            }

            setCycleUnificationMap(parseCycleUnificationMap(data?.unification_map ?? null));
        };

        void loadCycleUnificationMap();

        return () => {
            cancelled = true;
        };
    }, [isOpen, user?.id]);

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
    const [showManualAdd, setShowManualAdd] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isSavingSubject, setIsSavingSubject] = useState(false);
    const manualSubjectInputRef = useRef<HTMLInputElement>(null);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [focusedSubjectId, setFocusedSubjectId] = useState<string | null>(null);
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
    const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
    const [editingWeightSubjectId, setEditingWeightSubjectId] = useState<string | null>(null);
    const [weightSavedSubjectId, setWeightSavedSubjectId] = useState<string | null>(null);
    const [weightDraft, setWeightDraft] = useState({ questions: '', points: '' });

    const focusSubject = useCallback((subjectId: string) => {
        setSearchQuery('');
        setExpandedIds([subjectId]);
        setFocusedSubjectId(subjectId);
    }, []);

    useEffect(() => {
        if (!focusedSubjectId) return;

        const focusTimer = window.setTimeout(() => {
            const subjectCard = document.getElementById(`subject-card-${focusedSubjectId}`);
            subjectCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            subjectCard?.focus({ preventScroll: true });
        }, 160);
        const clearTimer = window.setTimeout(() => setFocusedSubjectId(null), 1800);

        return () => {
            window.clearTimeout(focusTimer);
            window.clearTimeout(clearTimer);
        };
    }, [focusedSubjectId]);

    // Limpa o status de "Sincronizado" após alguns segundos para feedback dinâmico
    useEffect(() => {
        if (syncStatus === 'saved') {
            const timer = setTimeout(() => setSyncStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [syncStatus]);

    useEffect(() => {
        if (weightSavedSubjectId) {
            const timer = setTimeout(() => setWeightSavedSubjectId(null), 2600);
            return () => clearTimeout(timer);
        }
    }, [weightSavedSubjectId]);

    // ── Adição de tópicos em lote ────────────────────────────────────────────
    const [showIaAdd, setShowIaAdd] = useState(false);
    const [iaSubjectName, setIaSubjectName] = useState('');
    const [iaInputText, setIaInputText] = useState('');
    const [iaStage, setIaStage] = useState<'input' | 'review'>('input');
    const [aiResult, setAiResult] = useState<AiSubject[]>([]);
    const [showIaSubjectSuggestions, setShowIaSubjectSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
    const [iaOverflowVisible, setIaOverflowVisible] = useState(false);
    const iaSuggestionsRef = useRef<HTMLDivElement>(null);
    const iaTopicsInputRef = useRef<HTMLTextAreaElement>(null);

    const iaSubjectSuggestions = useMemo(() => {
        return filterSubjectsAccentInsensitive(localSubjects, iaSubjectName);
    }, [localSubjects, iaSubjectName]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (iaSuggestionsRef.current && !iaSuggestionsRef.current.contains(event.target as Node)) {
                setShowIaSubjectSuggestions(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setShowIaSubjectSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        setFocusedSuggestionIndex(-1);
    }, [iaSubjectName, showIaSubjectSuggestions]);

    const advanceToBulkTopics = (selectedSubjectName?: string) => {
        if (selectedSubjectName) setIaSubjectName(selectedSubjectName);
        setShowIaSubjectSuggestions(false);
        setFocusedSuggestionIndex(-1);
        window.requestAnimationFrame(() => iaTopicsInputRef.current?.focus());
    };

    const handleIaSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (shouldAdvanceToBulkTopics(e.key, e.shiftKey)) {
            e.preventDefault();
            advanceToBulkTopics(resolveBulkSubjectName(
                iaSubjectSuggestions,
                focusedSuggestionIndex,
                iaSubjectName
            ));
            return;
        }

        if (!showIaSubjectSuggestions) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setShowIaSubjectSuggestions(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedSuggestionIndex(prev =>
                    prev < iaSubjectSuggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedSuggestionIndex(prev =>
                    prev > 0 ? prev - 1 : iaSubjectSuggestions.length - 1
                );
                break;
            case 'Escape':
                e.preventDefault();
                setShowIaSubjectSuggestions(false);
                break;
            default:
                break;
        }
    };

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
        setShowManualAdd(false);
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
        // Reset batch-add states
        setShowIaAdd(false);
        setIaOverflowVisible(false);
        setShowIaSubjectSuggestions(false);
        setShowManualAdd(false);
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

    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        const previousTransform = document.body.style.transform;
        const previousRootBackground = document.documentElement.style.backgroundColor;
        document.body.style.overflow = 'hidden';
        document.body.style.transform = 'none';
        document.documentElement.style.backgroundColor = '#000000';

        const handleModalKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (showIaSubjectSuggestions) {
                setShowIaSubjectSuggestions(false);
                return;
            }
            if (showSwitchConfirm) {
                setShowSwitchConfirm(false);
                setPendingEditalSwitch(null);
                return;
            }
            handleClose();
        };

        document.addEventListener('keydown', handleModalKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.transform = previousTransform;
            document.documentElement.style.backgroundColor = previousRootBackground;
            document.removeEventListener('keydown', handleModalKeyDown);
        };
    }, [handleClose, isOpen, showIaSubjectSuggestions, showSwitchConfirm]);

    // ── Preparar prévia local ────────────────────────────────────────────────
    const handleBulkPreview = useCallback(() => {
        if (!iaSubjectName.trim() || !iaInputText.trim()) return;

        const topics = parseBulkTopics(iaInputText).map(name => ({ name, selected: true }));
        if (topics.length === 0) return;

        setAiResult([{ title: iaSubjectName.trim(), topics, selected: true }]);
        setIaStage('review');
    }, [iaSubjectName, iaInputText]);

    // ── Confirmar e adicionar tópicos em lote ───────────────────────────────
    const handleIaConfirm = useCallback(async () => {
        if (!user || !iaSubjectName.trim()) return;

        setIsSavingSubject(true);
        let createdSubjectId: string | null = null;
        let editalLinked = false;
        let targetSubjectId: string | null = null;
        try {
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

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
                let persistedTopics: Topic[] = [];

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

                    const { data: insertedTopics, error: insertErr } = await supabase
                        .from('topics')
                        .insert(topicsToInsert)
                        .select();

                    if (insertErr) throw insertErr;
                    if (!insertedTopics || insertedTopics.length !== topicsToInsert.length) {
                        throw new Error('O banco não confirmou todos os tópicos adicionados.');
                    }
                    persistedTopics = (insertedTopics || []).map(topic => ({
                        ...topic,
                        reviewCount: topic.review_count ?? 0,
                        subtopics: []
                    })) as Topic[];
                }

                const updatedSubjects = localSubjects.map(s => {
                    if (s.id === existingSubject.id) {
                        return { ...s, topics: [...s.topics, ...persistedTopics] };
                    }
                    return s;
                });

                setLocalSubjects(updatedSubjects);
                targetSubjectId = existingSubject.id;
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
                createdSubjectId = created.id;

                // Insert topics into 'topics' table
                let persistedTopics: Topic[] = [];
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

                    const { data: insertedTopics, error: insertErr } = await supabase
                        .from('topics')
                        .insert(topicsToInsert)
                        .select();

                    if (insertErr) throw insertErr;
                    if (!insertedTopics || insertedTopics.length !== topicsToInsert.length) {
                        throw new Error('O banco não confirmou todos os tópicos adicionados.');
                    }
                    persistedTopics = (insertedTopics || []).map(topic => ({
                        ...topic,
                        reviewCount: topic.review_count ?? 0,
                        subtopics: []
                    })) as Topic[];
                }

                const newSubjectIds = [...localEditalIds, created.id];
                const newSubjectWithTopics = { ...created, topics: persistedTopics } as Subject;
                setLocalSubjects([...localSubjects, newSubjectWithTopics]);
                setLocalEditalIds(newSubjectIds);
                targetSubjectId = created.id;

                const { error: editalUpdateError } = await editaisTable()
                    .update({
                        subject_ids: newSubjectIds,
                        active_subject_ids: newSubjectIds,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', edital.id);
                if (editalUpdateError) throw editalUpdateError;
                editalLinked = true;

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
            if (targetSubjectId) focusSubject(targetSubjectId);

            toast.success('Tópicos salvos com sucesso!');

        } catch (error: unknown) {
            if (createdSubjectId && !editalLinked) {
                const { error: rollbackError } = await supabase
                    .from('subjects')
                    .delete()
                    .eq('id', createdSubjectId);
                if (rollbackError) console.error('Erro ao desfazer matéria do lote:', rollbackError);
            }
            console.error('Erro ao salvar:', error);
            errorService.report(error instanceof Error ? error : new Error(String(error)), {
                module: 'EditalSubjectsModal',
                action: 'iaConfirm',
                userMessage: 'Erro ao adicionar matéria'
            });
        } finally {
            setIsSavingSubject(false);
        }
    }, [user, iaSubjectName, aiResult, localSubjects, localEditalIds, edital, selectedEdital.id, onUpdate, focusSubject]);

    // ── Derivados ─────────────────────────────────────────────────────────
    const cycleProgressSubjects = useMemo(() => {
        const subjectsById = new Map(allSubjects.map(subject => [subject.id, subject]));
        localSubjects.forEach(subject => subjectsById.set(subject.id, subject));
        return Array.from(subjectsById.values());
    }, [allSubjects, localSubjects]);

    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return localSubjects;
        const q = searchQuery.toLowerCase();
        return localSubjects.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.topics.some(t => t.name.toLowerCase().includes(q))
        );
    }, [localSubjects, searchQuery]);

    const examWeightTotals = useMemo(
        () => getExamWeightTotals(localSubjects),
        [localSubjects]
    );

    const totalTopics = localSubjects.reduce((sum, s) => sum + s.topics.length, 0);
    const completedTopics = localSubjects.reduce(
        (sum, subject) =>
            sum + subject.topics.filter(topic =>
                getEditalTopicCycleProgress(topic, cycleProgressSubjects, cycleUnificationMap).isCompleted
            ).length,
        0,
    );

    useEffect(() => {
        if (!isOpen || !user?.id || !cycleUnificationMap) return;

        const repairPlan = buildEditalTopicProgressRepairPlan(cycleProgressSubjects, cycleUnificationMap)
            .filter(entry => !repairedProgressGroupsRef.current.has(entry.groupKey));

        if (repairPlan.length === 0) return;

        repairPlan.forEach(entry => repairedProgressGroupsRef.current.add(entry.groupKey));

        const repairEquivalentProgress = async () => {
            const failedGroups: string[] = [];

            for (const entry of repairPlan) {
                const patch = toTopicProgressDatabasePatch(entry.patch);
                if (Object.keys(patch).length === 0) continue;

                const { error } = await supabase
                    .from('topics')
                    .update(patch)
                    .in('id', entry.targetTopicIds);

                if (error) {
                    failedGroups.push(entry.groupKey);
                    void errorService.report(error, {
                        module: 'EditalSubjectsModal',
                        action: 'repairEquivalentTopicProgress',
                        userId: user.id,
                        severity: 'medium',
                        scope: 'core',
                        featureArea: 'study_cycle',
                        showToast: false,
                        metadata: {
                            sourceTopicId: entry.sourceTopicId,
                            targetTopicIds: entry.targetTopicIds,
                        },
                    });
                }
            }

            if (failedGroups.length > 0) {
                failedGroups.forEach(groupKey => repairedProgressGroupsRef.current.delete(groupKey));
                return;
            }

            setLocalSubjects(prev => applyTopicProgressRepairPlan(prev, repairPlan));
            hasPendingSync.current = true;
        };

        void repairEquivalentProgress();
    }, [cycleProgressSubjects, cycleUnificationMap, isOpen, user?.id]);

    const displayOrgan = selectedEdital.organ || selectedEdital.name.split(' - ')[0];
    const displayPosition = selectedEdital.position || (
        selectedEdital.name.split(' - ').length > 1
            ? selectedEdital.name.split(' - ').slice(1).join(' - ')
            : null
    );
    const canPreviewBulkTopics = Boolean(iaSubjectName.trim() && parseBulkTopics(iaInputText).length > 0);
    const sourceBadge = selectedEdital.sourceId
        ? {
            label: 'Cópia • Catálogo',
            className: 'border-primary/20 bg-primary/10 text-primary',
            icon: Database
        }
        : selectedEdital.isImported
            ? {
                label: 'Cópia • IA',
                className: 'border-incidence/20 bg-incidence/10 text-incidence',
                icon: Sparkles
            }
            : {
                label: 'Manual',
                className: 'border-border bg-secondary text-content-muted',
                icon: FileText
            };
    const SourceBadgeIcon = sourceBadge.icon;

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
        if (!canRunStructuralOperation()) return;
        if (!user || isSavingSubject) return;

        const normalizedNames = newSubjectName
            .split(';')
            .map(name => name.trim().toUpperCase())
            .filter(Boolean);
        if (normalizedNames.length === 0) return;

        const uniqueNames = Array.from(new Set(normalizedNames));
        const invalidName = uniqueNames.find(name => !subjectNameSchema.safeParse(name).success);
        if (invalidName) {
            const validation = subjectNameSchema.safeParse(invalidName);
            const message = validation.success ? 'Nome de matéria inválido.' : validation.error.issues[0]?.message;
            errorService.report(new Error('Invalid subject name'), {
                module: 'EditalSubjectsModal', action: 'saveSubject',
                userMessage: `Não foi possível adicionar "${invalidName}": ${message}`
            });
            return;
        }

        const existingNames = new Set(localSubjects.map(subject => subject.name.trim().toUpperCase()));
        const namesToCreate = uniqueNames.filter(name => !existingNames.has(name));
        const ignoredCount = normalizedNames.length - namesToCreate.length;

        if (namesToCreate.length === 0) {
            errorService.report(new Error('Duplicate subjects'), {
                module: 'EditalSubjectsModal', action: 'saveSubject',
                userMessage: 'Todas as matérias informadas já existem neste edital.'
            });
            return;
        }

        setIsSavingSubject(true);
        const placeholders = namesToCreate.map((name, index) => ({
            id: tmpId(), name, status: 'Nova', topics: [],
            order: localSubjects.length + index, created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(), notes: null, user_id: user.id,
        } as unknown as Subject));
        const placeholderIds = new Set(placeholders.map(subject => subject.id));

        setLocalSubjects(prev => [...prev, ...placeholders]);
        setSyncStatus('saving');
        let persistedSubjectIds: string[] = [];

        try {
            const { data: createdSubjects, error: subjErr } = await supabase
                .from('subjects').insert(namesToCreate.map(name => ({
                    user_id: user.id,
                    name,
                    status: 'Nova',
                    edital_id: edital.id
                })))
                .select('id, name');
            if (subjErr) throw subjErr;
            persistedSubjectIds = createdSubjects?.map(subject => subject.id) || [];
            if (!createdSubjects || createdSubjects.length !== namesToCreate.length) {
                throw new Error('O banco não retornou todas as matérias criadas.');
            }

            const createdIds = createdSubjects.map(subject => subject.id);
            const updatedIds = [...localEditalIds, ...createdIds];
            const { error: edErr } = await editaisTable().update({ subject_ids: updatedIds }).eq('id', edital.id);
            if (edErr) throw edErr;

            const createdByName = new Map(createdSubjects.map(subject => [subject.name.trim().toUpperCase(), subject.id]));
            setLocalSubjects(prev => prev.map(subject => {
                if (!placeholderIds.has(subject.id)) return subject;
                return { ...subject, id: createdByName.get(subject.name.trim().toUpperCase()) || subject.id };
            }));
            focusSubject(createdIds[0]);
            setLocalEditalIds(updatedIds);
            onUpdate({ ...edital, subjectIds: updatedIds });
            hasPendingSync.current = true;
            setSyncStatus('saved');
            setNewSubjectName('');
            requestAnimationFrame(() => manualSubjectInputRef.current?.focus());

            const createdMessage = namesToCreate.length === 1
                ? `Matéria "${namesToCreate[0]}" criada!`
                : `${namesToCreate.length} matérias criadas!`;
            const ignoredMessage = ignoredCount > 0
                ? ` ${ignoredCount} ${ignoredCount === 1 ? 'duplicada foi ignorada' : 'duplicadas foram ignoradas'}.`
                : '';
            toast.success(`${createdMessage}${ignoredMessage}`);
        } catch (err) {
            if (persistedSubjectIds.length > 0) {
                const { error: rollbackError } = await supabase
                    .from('subjects')
                    .delete()
                    .in('id', persistedSubjectIds);
                if (rollbackError) console.error('Erro ao desfazer matérias não vinculadas:', rollbackError);
            }
            setLocalSubjects(prev => prev.filter(subject => !placeholderIds.has(subject.id)));
            setExpandedIds(prev => prev.filter(id => !placeholderIds.has(id)));
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'saveSubject', userMessage: 'Erro ao criar matéria.' });
        } finally {
            setIsSavingSubject(false);
        }
    }, [canRunStructuralOperation, newSubjectName, user, isSavingSubject, localSubjects, localEditalIds, edital, onUpdate, focusSubject]);

    // ── Excluir matéria permanentemente (só editais manuais) ──────────────
    const handleConfirmDeleteSubject = useCallback(async (subjectId: string, subjectName: string) => {
        if (!canRunStructuralOperation()) return;
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
            toast.success(`Matéria "${subjectName}" excluída permanentemente.`);
        } catch (err) {
            // Reverte otimismo
            setLocalSubjects(allSubjects.filter(s => edital.subjectIds.includes(s.id)));
            setLocalEditalIds(edital.subjectIds);
            setLocalActiveIds(edital.activeSubjectIds?.length ? edital.activeSubjectIds : edital.subjectIds);
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'deleteSubject', userMessage: 'Erro ao excluir matéria.' });
        }
    }, [canRunStructuralOperation, localEditalIds, localActiveIds, edital, allSubjects, onUpdate, localSubjects, user]);

    // ── Alternar ativo/inativo (visível/oculto no Ciclo de Estudos) ───────
    const handleToggleSubjectActive = useCallback(async (subjectId: string, subjectName: string) => {
        if (!canRunStructuralOperation()) return;
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
    }, [canRunStructuralOperation, localActiveIds, edital, onUpdate]);

    // ── Salvar novo tópico inline ──────────────────────────────────────────
    const handleSaveNewTopic = useCallback(async (subjectId: string) => {
        if (!canRunStructuralOperation()) return;
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
    }, [canRunStructuralOperation, newTopicTexts, savingTopics, user, selectedEdital.id]);

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

    const handleStartWeightEdit = useCallback((subject: Subject) => {
        setWeightSavedSubjectId(null);
        setEditingWeightSubjectId(subject.id);
        setWeightDraft({
            questions: formatExamWeightInputValue(subject.exam_weight_questions),
            points: formatExamWeightInputValue(subject.exam_weight_points)
        });
    }, []);

    const handleCancelWeightEdit = useCallback(() => {
        setEditingWeightSubjectId(null);
        setWeightDraft({ questions: '', points: '' });
    }, []);

    const handleSaveSubjectWeight = useCallback(async (subjectId: string) => {
        const subject = localSubjects.find(item => item.id === subjectId);
        if (!subject) return;

        setSyncStatus('saving');
        try {
            const examWeightQuestions = parseOptionalExamWeightNumber(weightDraft.questions);
            const examWeightPoints = parseOptionalExamWeightNumber(weightDraft.points);
            const nextSubject = {
                ...subject,
                exam_weight_questions: examWeightQuestions,
                exam_weight_points: examWeightPoints,
                exam_weight_percentage: subject.exam_weight_percentage ?? null,
                exam_weight_raw:
                    examWeightQuestions !== null || examWeightPoints !== null || subject.exam_weight_percentage !== null
                        ? 'Informado manualmente pelo aluno na edição do edital'
                        : null
            };
            const hasWeight = hasSubjectExamWeight(nextSubject);
            const { error } = await supabase
                .from('subjects')
                .update({
                    exam_weight_questions: nextSubject.exam_weight_questions,
                    exam_weight_points: nextSubject.exam_weight_points,
                    exam_weight_percentage: nextSubject.exam_weight_percentage,
                    exam_weight_raw: hasWeight ? nextSubject.exam_weight_raw : null
                })
                .eq('id', subjectId);

            if (error) throw error;
            setLocalSubjects(prev => prev.map(item => item.id === subjectId ? nextSubject : item));
            setEditingWeightSubjectId(null);
            setWeightSavedSubjectId(subjectId);
            setWeightDraft({ questions: '', points: '' });
            hasPendingSync.current = true;
            setSyncStatus('saved');
        } catch (err) {
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'editSubjectWeight', userMessage: 'Erro ao salvar peso da matéria.' });
        }
    }, [localSubjects, weightDraft]);

    // ── Excluir tópico — pede confirmação inline primeiro ─────────────────
    const handleRequestDeleteTopic = useCallback((topicId: string) => {
        setConfirmDeleteTopicId(prev => prev === topicId ? null : topicId);
    }, []);

    const handleConfirmDeleteTopic = useCallback(async (topicId: string, subjectId: string) => {
        if (!canRunStructuralOperation()) return;
        setConfirmDeleteTopicId(null);
        // Otimismo: remove da lista ativa imediatamente
        const topicToDeactivate = localSubjects
            .find(s => s.id === subjectId)?.topics.find(t => t.id === topicId);

        setLocalSubjects(prev => prev.map(s =>
            s.id === subjectId ? { ...s, topics: s.topics.filter(t => t.id !== topicId) } : s
        ));
        setSyncStatus('saving');
        try {
            // 1. Limpeza profunda: remover histórico de revisão
            const { error: histErr } = await supabase
                .from('topic_review_history')
                .delete()
                .eq('topic_id', topicId);

            if (histErr) {
                console.error('Erro ao excluir histórico do tópico:', histErr);
            }

            // 2. Delete: excluir permanentemente (hard delete)
            const { error } = await supabase
                .from('topics')
                .delete()
                .eq('id', topicId);
            if (error) throw error;
            hasPendingSync.current = true;
            setSyncStatus('saved');
            toast.success(`Tópico "${topicToDeactivate?.name || 'selecionado'}" excluído permanentemente.`, { duration: 3000 });
        } catch (err) {
            // Reverte otimismo
            if (topicToDeactivate) {
                setLocalSubjects(prev => prev.map(s =>
                    s.id === subjectId ? { ...s, topics: [...s.topics, topicToDeactivate] } : s
                ));
            }
            setSyncStatus('error');
            errorService.report(err, { module: 'EditalSubjectsModal', action: 'hardDeleteTopic', userMessage: 'Erro ao excluir tópico.' });
        }
    }, [canRunStructuralOperation, localSubjects]);

    // ── Restaurar tópico da lixeira ────────────────────────────────────────
    const handleRestoreTopic = useCallback(async (topicId: string, subjectId: string) => {
        if (!canRunStructuralOperation()) return;
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
                .update({ is_active: true })
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
    }, [canRunStructuralOperation, inactiveTopics]);

    // ── Carregar tópicos inativos ao expandir matéria ─────────────────────
    const loadInactiveTopics = useCallback(async (subjectId: string) => {
        if (inactiveTopics[subjectId]) return; // Já carregados
        try {
            const { data, error } = await supabase
                .from('topics')
                .select('id, name, completed, review_count, subject_id')
                .eq('subject_id', subjectId)
                .eq('is_active', false);
            if (error) throw error;
            setInactiveTopics(prev => ({
                ...prev,
                [subjectId]: (data || []).map((t) => ({
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

    return createPortal(
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={handleClose}
                className="fixed inset-0 z-[100] h-[100dvh] w-screen bg-black/80 backdrop-blur-md"
                aria-hidden="true"
            />
            <div className="edital-subjects-positioner pointer-events-none fixed inset-0 z-[101] flex h-[100dvh] w-screen justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="edital-subjects-panel pointer-events-auto relative flex w-full max-w-5xl flex-col overflow-hidden border border-border bg-modal pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_60px_rgba(0,0,0,0.28)]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edital-subjects-modal-title"
                >
                    <div className="pointer-events-none absolute inset-x-10 top-0 z-20 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                    {/* ── Header ── */}
                    <div className="relative flex shrink-0 items-start justify-between gap-3 border-b border-border bg-gradient-to-br from-primary/[0.07] via-transparent to-incidence/[0.04] px-4 py-4 sm:gap-4 sm:px-6">
                        <div className="flex min-w-0 items-start gap-3">
                            {initialExpandedSubjectId && (
                                <button
                                    onClick={onBack ? handleBack : handleClose}
                                    className="group -ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:h-10 lg:w-10"
                                    title={onBack ? "Voltar para Ciclo de Estudos" : "Voltar para Matérias"}
                                >
                                    <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                                </button>
                            )}
                            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary lg:flex">
                                <GraduationCap className="h-[18px] w-[18px]" />
                            </div>
                            <div className="min-w-0 flex-1 lg:pt-2">
                                <div className="flex min-w-0 flex-col gap-1">
                                    <div className="flex min-w-0 items-start gap-1.5">
                                        <GraduationCap size={11} className="lg:hidden shrink-0 text-primary mt-[3px]" />
                                        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <h2 id="edital-subjects-modal-title" className="line-clamp-2 min-w-0 basis-full text-sm font-black uppercase tracking-tight text-content-main [overflow-wrap:anywhere] lg:basis-auto lg:line-clamp-1">
                                                {selectedEdital.year ? `${selectedEdital.year} - ` : ''}{displayOrgan}
                                            </h2>
                                            {syncStatus === 'saving' && (
                                                <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-primary/75">
                                                    <Loader2 size={10} className="animate-spin text-primary" />
                                                    Salvando...
                                                </span>
                                            )}
                                            {syncStatus === 'saved' && (
                                                <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-success">
                                                    <CheckCircle2 size={10} />
                                                    Sincronizado
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {displayPosition && (
                                        <p className={`flex min-w-0 items-center gap-1.5 truncate text-content-muted ${editalHeaderPositionTypography}`}>
                                            <BriefcaseBusiness size={11} className="shrink-0 text-warning" />
                                            <span className="truncate">{displayPosition}</span>
                                        </p>
                                    )}
                                    {selectedEdital.examBoard && (
                                        <p className={`flex min-w-0 items-center gap-1.5 truncate text-content-muted ${editalHeaderExamBoardTypography}`}>
                                            <GraduationCap size={11} className="shrink-0 text-incidence" />
                                            <span className="truncate">{selectedEdital.examBoard}</span>
                                        </p>
                                    )}
                                    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-medium text-content-muted">
                                        <BookOpen size={11} className="shrink-0 text-primary" />
                                        {localSubjects.length} {localSubjects.length === 1 ? 'matéria' : 'matérias'} • {totalTopics} {totalTopics === 1 ? 'tópico' : 'tópicos'}
                                        <span className={`inline-flex shrink-0 items-center gap-0.5 rounded border px-1 py-px ${editalHeaderBadgeTypography} ${sourceBadge.className}`}>
                                            <SourceBadgeIcon size={8} />
                                            {sourceBadge.label}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-destructive/15 bg-destructive/[0.06] text-content-muted transition-colors hover:border-destructive/35 hover:bg-destructive/12 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 lg:h-10 lg:w-10"
                            aria-label="Fechar"
                        >
                            <X size={16} />
                        </button>
                    </div>


                    {/* ── Filtro e ações ── */}
                    <div className="max-h-[58dvh] shrink-0 overscroll-contain space-y-3 overflow-y-auto border-b border-border bg-surface/45 px-4 py-3 no-scrollbar sm:max-h-[60dvh] sm:px-6 sm:py-4 lg:max-h-none lg:overflow-visible">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="relative min-w-0 flex-1">
                                <input
                                    type="text"
                                    placeholder="Filtrar matérias e tópicos..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="h-11 w-full rounded-xl border border-border-strong/70 bg-control pl-3 pr-11 text-base text-content-main outline-none transition-colors placeholder:text-content-muted/55 focus:border-primary/45 focus:ring-2 focus:ring-primary/10 sm:text-sm lg:h-10"
                                />
                                {searchQuery ? (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-content-muted transition-colors hover:bg-secondary hover:text-content-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:h-10 lg:w-10" aria-label="Limpar busca">
                                        <X size={14} />
                                    </button>
                                ) : (
                                    <div className="pointer-events-none absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-content-muted lg:h-10 lg:w-10">
                                        <Search size={14} />
                                    </div>
                                )}
                            </div>

                            <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center md:justify-start">
                                {isEditable ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setShowManualAdd(prev => !prev);
                                                setShowIaAdd(false);
                                                setIaOverflowVisible(false);
                                                setShowIaSubjectSuggestions(false);
                                            }}
                                            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/[0.08] px-4 text-xs font-bold text-primary transition-colors hover:border-primary/40 hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:w-auto lg:h-10 ${showManualAdd ? 'border-primary/45 bg-primary/15 ring-2 ring-primary/20' : ''
                                                }`}
                                        >
                                            <BookPlus size={14} className="text-primary" />
                                            Nova Matéria
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowIaAdd(prev => {
                                                    const next = !prev;
                                                    if (!next) {
                                                        setIaOverflowVisible(false);
                                                        setShowIaSubjectSuggestions(false);
                                                    }
                                                    return next;
                                                });
                                                setShowManualAdd(false);
                                            }}
                                            className={`app-button-secondary flex h-11 w-full items-center justify-center gap-2 px-4 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:w-auto lg:h-10 ${showIaAdd ? 'ring-2 ring-primary/30 bg-secondary/80' : ''
                                                }`}
                                        >
                                            <BookPlus size={14} className="text-primary" />
                                            Adicionar em Lote
                                        </button>
                                    </>
                                ) : (
                                    <div className="col-span-2 flex h-11 items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 px-3 text-[11px] font-bold text-warning lg:h-10">
                                        <AlertTriangle size={14} />
                                        Edital protegido
                                    </div>
                                )}
                            </div>
                        </div>

                        <AnimatePresence initial={false}>
                            {showManualAdd && isEditable && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -4 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -4 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary/40 p-3 sm:flex-row sm:items-center">
                                        <div className="relative min-w-0 flex-1">
                                            <BookPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Nome da matéria ou várias separadas por ;"
                                                value={newSubjectName}
                                                onChange={e => setNewSubjectName(e.target.value.toUpperCase())}
                                                onKeyDown={e => { if (e.key === 'Enter') handleSaveSubject(); }}
                                                className="h-11 w-full rounded-xl border border-border bg-control py-1.5 pl-9 pr-3 text-base text-content-main outline-none transition-colors placeholder:text-content-muted/55 focus:border-primary/45 focus:ring-2 focus:ring-primary/10 sm:text-sm lg:h-10"
                                                ref={manualSubjectInputRef}
                                            />
                                        </div>
                                        <button
                                            onClick={handleSaveSubject}
                                            disabled={!newSubjectName.trim() || isSavingSubject}
                                            className="app-button-success flex h-11 items-center justify-center gap-2 px-4 text-[11px] font-bold disabled:cursor-not-allowed lg:h-10"
                                        >
                                            {isSavingSubject ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                            Adicionar
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {showIaAdd && isEditable && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, y: -4 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -4 }}
                                    className={showIaAdd && iaOverflowVisible ? "overflow-visible" : "overflow-hidden"}
                                    onAnimationComplete={() => {
                                        if (showIaAdd) {
                                            setIaOverflowVisible(true);
                                        }
                                    }}
                                >
                                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <BookPlus size={16} className="text-primary" />
                                                <span className="text-xs font-bold uppercase tracking-wider text-primary">Adicionar tópicos em lote</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (isSavingSubject) return;
                                                    setShowIaAdd(false);
                                                    setIaOverflowVisible(false);
                                                    setShowIaSubjectSuggestions(false);
                                                    setIaSubjectName('');
                                                    setIaInputText('');
                                                    setIaStage('input');
                                                }}
                                                disabled={isSavingSubject}
                                                className="rounded-lg p-1 text-content-muted transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Fechar inclusão em lote"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        {isSavingSubject ? (
                                            <div className="flex min-h-[250px] flex-col items-center justify-center gap-4 rounded-xl border border-primary/15 bg-background/35 px-6 text-center" aria-live="polite">
                                                <span className="grid size-12 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-lg shadow-primary/10">
                                                    <Loader2 size={22} className="animate-spin" />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-bold text-content-main">Salvando matéria e tópicos...</p>
                                                    <p className="mt-1 text-[11px] text-content-muted">Aguarde a confirmação antes de fechar.</p>
                                                </div>
                                            </div>
                                        ) : iaStage === 'input' ? (
                                            <div className="space-y-3">
                                                <div className="relative w-full" ref={iaSuggestionsRef}>
                                                    <input
                                                        type="text"
                                                        placeholder="Nome da matéria (digite para buscar ou criar nova)"
                                                        value={iaSubjectName}
                                                        onChange={e => {
                                                            setIaSubjectName(e.target.value.toUpperCase());
                                                            setShowIaSubjectSuggestions(true);
                                                        }}
                                                        onFocus={() => setShowIaSubjectSuggestions(true)}
                                                        onKeyDown={handleIaSubjectKeyDown}
                                                        className="h-11 w-full rounded-xl border border-border bg-control px-3 text-base text-content-main outline-none transition-colors placeholder:text-[13px] placeholder:text-content-muted/55 focus:border-primary/45 focus:ring-2 focus:ring-primary/10 sm:text-sm lg:h-10"
                                                    />

                                                    {/* Dropdown de sugestões customizado premium */}
                                                    {showIaSubjectSuggestions && (
                                                        <>
                                                            {iaSubjectSuggestions.length > 0 ? (
                                                                <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover/95 p-1 shadow-2xl backdrop-blur-md no-scrollbar">
                                                                    {iaSubjectSuggestions.map((s, idx) => {
                                                                        const isFocused = idx === focusedSuggestionIndex;
                                                                        const isSelected = s.name === iaSubjectName.trim();
                                                                        return (
                                                                            <button
                                                                                key={s.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    advanceToBulkTopics(s.name);
                                                                                }}
                                                                                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${isFocused
                                                                                        ? 'bg-primary/15 text-primary font-semibold'
                                                                                        : isSelected
                                                                                            ? 'bg-primary/10 text-primary font-medium'
                                                                                            : 'text-content-main hover:bg-secondary'
                                                                                    }`}
                                                                            >
                                                                                <span>{s.name}</span>
                                                                                {isSelected && <Check size={12} className="text-primary" />}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                iaSubjectName.trim() !== '' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => advanceToBulkTopics(iaSubjectName.trim())}
                                                                        className="absolute left-0 right-0 top-full z-[100] mt-1 rounded-xl border border-border bg-popover/95 p-3 text-left text-xs text-content-muted shadow-2xl backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-content-main"
                                                                    >
                                                                        Usar matéria nova: <span className="font-semibold text-primary">"{iaSubjectName}"</span>
                                                                    </button>
                                                                )
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <textarea
                                                        ref={iaTopicsInputRef}
                                                        placeholder={`Ex.: Crase; Pontuação; Concordância verbal\n\nOu um por linha:\nCrase\nPontuação\nConcordância verbal`}
                                                        value={iaInputText}
                                                        onChange={e => setIaInputText(e.target.value)}
                                                        onFocus={() => setShowIaSubjectSuggestions(false)}
                                                        rows={7}
                                                        className="min-h-[168px] w-full resize-y rounded-xl border border-border bg-control p-3 text-sm leading-relaxed text-content-main outline-none transition-colors placeholder:text-[13px] placeholder:leading-[1.4] placeholder:text-content-muted/55 focus:border-primary/45 focus:ring-2 focus:ring-primary/10"
                                                    />
                                                    <p className="pl-1 text-[11px] leading-relaxed text-content-muted">
                                                        Pode colar tudo na mesma linha separado por ponto e vírgula (;) ou colocar um tópico em cada linha.
                                                    </p>
                                                </div>
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={handleBulkPreview}
                                                        disabled={!canPreviewBulkTopics}
                                                        className="app-button-primary flex h-11 items-center gap-2 px-4 text-[11px] font-bold disabled:cursor-not-allowed lg:h-10"
                                                    >
                                                        <Check size={12} />
                                                        Conferir tópicos
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}

                                        {!isSavingSubject && iaStage === 'review' && aiResult.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-content-main">{iaSubjectName}</span>
                                                    <span className="text-[11px] text-content-muted">{aiResult[0].topics.length} tópicos encontrados</span>
                                                </div>
                                                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-background/60 p-2">
                                                    {aiResult[0].topics.map((topic, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 rounded px-2 py-2 hover:bg-secondary/70">
                                                            <span className="w-4 text-[10px] font-bold text-content-muted">{idx + 1}.</span>
                                                            <span className="flex-1 break-words text-xs text-content-main">{topic.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between gap-2">
                                                    <button
                                                        onClick={() => { setIaStage('input'); setAiResult([]); }}
                                                        disabled={isSavingSubject}
                                                        className="app-button-secondary h-10 px-3 text-[11px] font-bold"
                                                    >
                                                        Voltar
                                                    </button>
                                                    <button
                                                        onClick={handleIaConfirm}
                                                        disabled={isSavingSubject}
                                                        className="app-button-success flex h-10 items-center gap-2 px-4 text-[11px] font-bold disabled:cursor-not-allowed"
                                                    >
                                                        {isSavingSubject ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                                        Salvar tópicos
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Lista de matérias ── */}
                    <div className="flex-1 overscroll-contain space-y-3 overflow-y-auto bg-background/25 px-3 py-4 no-scrollbar sm:px-6">
                        {filteredSubjects.length === 0 ? (
                            <div className="py-20 flex flex-col items-center text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary/60 shadow-inner">
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
                            <>
                                <div className="flex items-center justify-between gap-3 px-1 pb-1">
                                    <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-content-muted">
                                        <BookOpen size={11} className="shrink-0 text-primary" />
                                        Conteúdo do Edital
                                    </h3>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const isAllExpanded = filteredSubjects.length > 0 && expandedIds.length === filteredSubjects.length;
                                                if (isAllExpanded) setExpandedIds([]);
                                                else setExpandedIds(filteredSubjects.map(s => s.id));
                                            }}
                                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/55 px-3 text-[10px] font-extrabold uppercase tracking-[0.10em] text-content-muted transition-colors hover:border-primary/25 hover:bg-primary/[0.07] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:h-9"
                                        >
                                            {filteredSubjects.length > 0 && expandedIds.length === filteredSubjects.length ? (
                                                <>
                                                    <ChevronUp size={12} className="text-primary" />
                                                    Recolher
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronsUpDown size={12} className="text-primary" />
                                                    Expandir
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                {filteredSubjects.map((subject) => {
                                    const progress = getEditalSubjectCycleProgress(subject, cycleProgressSubjects, cycleUnificationMap);
                                    const isExpanded = expandedIds.includes(subject.id);
                                    const isTemp = subject.id.startsWith('tmp_');
                                    const isPendingDelete = confirmDeleteSubjectId === subject.id;
                                    const isEditingWeight = editingWeightSubjectId === subject.id;
                                    const hasJustSavedWeight = weightSavedSubjectId === subject.id;

                                    return (
                                        <div key={subject.id} className={`group relative flex flex-col overflow-hidden rounded-2xl border app-cycle-subject transition-all
                                        ${isTemp ? 'opacity-60 cursor-default' : ''}
                                        ${focusedSubjectId === subject.id ? 'ring-2 ring-primary/55 shadow-lg shadow-primary/10' : ''}
                                        `}>

                                            {/* ── Card da matéria ── */}
                                            <div
                                                id={`subject-card-${subject.id}`}
                                                tabIndex={-1}
                                                onClick={() => !isTemp && !isPendingDelete && !isEditingWeight && !hasJustSavedWeight && toggleExpand(subject.id)}
                                                className={`relative z-10 flex cursor-pointer items-center justify-between gap-3 px-4 py-3 outline-none ${isExpanded ? 'border-b border-border dark:border-white/5' : ''}`}
                                            >
                                                {hasJustSavedWeight && !isEditingWeight ? (
                                                    <div
                                                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-success/20 bg-success/10 px-2.5 py-1.5 text-success"
                                                        onClick={event => event.stopPropagation()}
                                                    >
                                                        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[10px] font-semibold">
                                                            <Check size={12} strokeWidth={3} />
                                                            Peso atualizado
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setWeightSavedSubjectId(null)}
                                                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-success/70 transition-colors hover:bg-success/15 hover:text-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40"
                                                            aria-label="Fechar confirmação de peso"
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    </div>
                                                ) : isEditingWeight ? (
                                                    <div
                                                        className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5rem] items-end gap-2 rounded-xl border border-warning/25 bg-warning/10 p-2"
                                                        onClick={event => event.stopPropagation()}
                                                    >
                                                        <label className="min-w-0">
                                                            <span className="mb-1 block truncate text-[10px] font-semibold text-content-muted">
                                                                Questões
                                                            </span>
                                                            <input
                                                                value={weightDraft.questions}
                                                                onChange={event => setWeightDraft(prev => ({ ...prev, questions: event.target.value }))}
                                                                placeholder="0"
                                                                inputMode="decimal"
                                                                aria-label="Quantidade de questões da matéria"
                                                                className="app-field app-type-control h-10 w-full min-w-0 px-2 text-sm backdrop-blur placeholder:text-content-muted/60"
                                                            />
                                                        </label>
                                                        <label className="min-w-0">
                                                            <span className="mb-1 block truncate text-[10px] font-semibold text-content-muted">
                                                                Pontos
                                                            </span>
                                                            <input
                                                                value={weightDraft.points}
                                                                onChange={event => setWeightDraft(prev => ({ ...prev, points: event.target.value }))}
                                                                placeholder="0"
                                                                inputMode="decimal"
                                                                aria-label="Quantidade de pontos da matéria"
                                                                className="app-field app-type-control h-10 w-full min-w-0 px-2 text-sm backdrop-blur placeholder:text-content-muted/60"
                                                            />
                                                        </label>
                                                        <div className="flex min-w-0 items-end justify-end gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveSubjectWeight(subject.id)}
                                                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                                aria-label="Salvar peso da matéria"
                                                            >
                                                                <Check size={11} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelWeightEdit}
                                                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-control text-content-muted transition-colors hover:bg-control-hover hover:text-control-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                                aria-label="Cancelar edição de peso"
                                                            >
                                                                <X size={11} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            {isTemp && (
                                                                <Loader2 size={14} className="animate-spin text-content-muted shrink-0" />
                                                            )}
                                                            <div className="flex min-w-0 flex-col gap-1">
                                                                <div className="flex min-w-0">
                                                                    {editingSubjectId === subject.id ? (
                                                                        <div className="flex min-w-0 items-center gap-1">
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
                                                                                className="h-10 w-full rounded-lg border border-primary/35 bg-control px-3 text-sm font-bold uppercase tracking-wide text-content-main outline-none focus:ring-2 focus:ring-primary/15"
                                                                                autoFocus
                                                                            />
                                                                            <button onClick={e => { e.stopPropagation(); handleSaveSubjectEdit(); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-success transition-colors hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40" aria-label="Salvar nome da matéria"><Check size={14} /></button>
                                                                            <button onClick={e => { e.stopPropagation(); setEditingSubjectId(null); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-secondary hover:text-content-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label="Cancelar edição da matéria"><X size={14} /></button>
                                                                        </div>
                                                                    ) : (
                                                                        <span
                                                                            className={`line-clamp-2 min-w-0 text-xs font-black uppercase tracking-wide text-content-main [overflow-wrap:anywhere] ${isEditable ? 'hover:text-primary transition-colors' : ''}`}
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
                                                                </div>
                                                                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                                                    <span className="flex items-center text-[10px] font-semibold text-content-muted">
                                                                        <span className="w-[3ch] text-right tabular-nums inline-block mr-1">{subject.topics.length}</span>
                                                                        <span className="w-[40px]">{subject.topics.length === 1 ? 'tópico' : 'tópicos'}</span>
                                                                    </span>
                                                                    <div className="h-2.5 w-px bg-border" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleStartWeightEdit(subject);
                                                                        }}
                                                                        disabled={!isEditable}
                                                                        className={`inline-flex min-h-8 max-w-full items-center gap-1 rounded-lg py-1 pl-0 pr-2 text-[10px] font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default ${hasSubjectExamWeight(subject)
                                                                                ? 'text-success hover:bg-success/10'
                                                                                : 'text-content-muted hover:text-primary'
                                                                            }`}
                                                                    >
                                                                        <Gauge size={11} />
                                                                        <span className="truncate">
                                                                            {hasSubjectExamWeight(subject)
                                                                                ? getSubjectExamWeightLine(subject, examWeightTotals)
                                                                                : 'Peso'}
                                                                        </span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!isTemp && (
                                                            <div className="flex shrink-0 items-center gap-1">
                                                                <div className="mr-1 hidden items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/50 px-2 py-1.5 sm:flex">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${progress === 100 ? 'bg-success' : progress > 0 ? 'bg-primary' : 'bg-content-muted/40'}`} />
                                                                    <span className="text-[10px] font-black tabular-nums tracking-tighter text-content-main">{progress}%</span>
                                                                </div>
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); toggleExpand(subject.id); }}
                                                                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-content-muted transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:h-9 lg:w-9 ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                                                                    aria-label={isExpanded ? 'Recolher matéria' : 'Expandir matéria'}
                                                                >
                                                                    <ChevronDown size={15} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
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
                                                        className="overflow-hidden bg-background/55 shadow-inner"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <div className="flex flex-col">
                                                            {/* Input "Novo tópico..." (lote ou manual) */}
                                                            {isEditable && (
                                                                <div className="relative border-b border-border px-3 py-3 sm:px-4">
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
                                                                        className="h-11 w-full rounded-xl border border-border bg-control px-3 pr-12 text-base text-content-main outline-none transition-colors placeholder:text-content-muted/55 focus:border-primary/45 focus:ring-2 focus:ring-primary/10 sm:text-sm lg:h-10"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleSaveNewTopic(subject.id)}
                                                                        disabled={savingTopics[subject.id] || !newTopicTexts[subject.id]?.trim()}
                                                                        className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40 sm:right-4 lg:h-10 lg:w-10"
                                                                        aria-label="Adicionar tópico"
                                                                    >
                                                                        {savingTopics[subject.id] ? <Loader2 size={12} className="animate-spin" /> : <Plus size={14} />}
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {/* Tópicos */}
                                                            {subject.topics.length === 0 ? (
                                                                <p className="py-3 text-center text-xs font-medium text-content-muted">
                                                                    Nenhum tópico adicionado
                                                                </p>
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    {subject.topics.map((topic) => {
                                                                        const isTmpTopic = topic.id.startsWith('tmp_');
                                                                        const progressBadge = isTmpTopic
                                                                            ? null
                                                                            : getEditalTopicProgressBadge(topic, cycleProgressSubjects, cycleUnificationMap);
                                                                        const progressBadgeClass = progressBadge?.tone === 'success'
                                                                            ? 'border-success/25 bg-success/10 text-success'
                                                                            : progressBadge?.tone === 'primary'
                                                                                ? 'border-primary/25 bg-primary/10 text-primary'
                                                                                : 'border-border bg-secondary/55 text-content-muted';
                                                                        return (
                                                                            <div
                                                                                key={topic.id}
                                                                                className={`group/topic flex min-h-12 items-center justify-between border-b border-border px-3 py-3 transition-colors last:border-b-0 sm:px-4 app-cycle-topic-row ${isTmpTopic ? 'opacity-50' : ''}`}
                                                                            >
                                                                                <div className="flex flex-col flex-1 min-w-0 pr-2 gap-0.5 justify-center">
                                                                                    <div className="flex items-center gap-2">
                                                                                        {isTmpTopic && <Loader2 size={13} className="animate-spin text-primary/50 shrink-0" />}
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
                                                                                                    className="h-10 w-full rounded-lg border border-primary/35 bg-control px-3 text-[13px] text-content-main outline-none focus:ring-2 focus:ring-primary/15"
                                                                                                    autoFocus
                                                                                                />
                                                                                                <button onClick={handleSaveTopicEdit} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-success transition-colors hover:bg-success/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/40" aria-label="Salvar nome do tópico"><Check size={14} /></button>
                                                                                                <button onClick={() => setEditingTopicId(null)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-secondary hover:text-content-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label="Cancelar edição do tópico"><X size={14} /></button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span
                                                                                                title={topic.name}
                                                                                                className={`w-full text-left text-[13px] font-medium leading-relaxed line-clamp-2 text-content-main [word-break:break-word] ${isTmpTopic || !isEditable ? '' : 'cursor-text group-hover/topic:text-primary transition-colors'}`}
                                                                                                onClick={(e) => {
                                                                                                    if (!isTmpTopic && isEditable) {
                                                                                                        e.stopPropagation();
                                                                                                        setEditingTopicId(topic.id);
                                                                                                        setEditingTopicName(topic.name);
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                {topic.name}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    {!isTmpTopic && (progressBadge || getIncidenceLevelLabel(topic.incidence_level)) && (
                                                                                        <div className="flex flex-wrap items-center gap-1.5 pl-[2px]">
                                                                                            {progressBadge && (
                                                                                                <span className={`inline-flex min-h-6 items-center rounded-md border px-1.5 text-[9px] font-black uppercase tracking-[0.08em] ${progressBadgeClass}`}>
                                                                                                    {progressBadge.label}
                                                                                                </span>
                                                                                            )}
                                                                                            {getIncidenceLevelLabel(topic.incidence_level) && (
                                                                                                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-content-muted/70">
                                                                                                    <BarChart2 size={10} className="text-primary/70" />
                                                                                                    {getIncidenceLevelLabel(topic.incidence_level)}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {!isTmpTopic && isEditable && editingTopicId !== topic.id && (
                                                                                    confirmDeleteTopicId === topic.id ? (
                                                                                        // Confirmação inline no tópico
                                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                                            <span className="mr-1 text-[11px] font-bold text-destructive">Excluir?</span>
                                                                                            <button
                                                                                                onClick={() => setConfirmDeleteTopicId(null)}
                                                                                                className="h-9 rounded-lg bg-secondary px-2.5 text-[11px] font-bold text-content-muted transition-colors hover:bg-secondary/80 hover:text-content-main"
                                                                                            >
                                                                                                Não
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleConfirmDeleteTopic(topic.id, subject.id)}
                                                                                                className="h-9 rounded-lg bg-destructive px-2.5 text-[11px] font-bold text-destructive-foreground transition-colors hover:bg-destructive/85"
                                                                                            >
                                                                                                Sim
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => handleRequestDeleteTopic(topic.id)}
                                                                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-content-muted transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 md:h-9 md:w-9 md:opacity-0 md:group-hover/topic:opacity-100"
                                                                                            aria-label={`Excluir tópico ${topic.name}`}
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

                                                            {/* Lixeira removida conforme solicitado (hard delete apenas) */}

                                                            {isEditable && (
                                                                <div className="flex justify-end border-t border-border px-3 py-2.5 sm:px-4">
                                                                    {confirmDeleteSubjectId === subject.id ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="mr-1 text-[11px] font-bold text-destructive">Excluir matéria?</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setConfirmDeleteSubjectId(null)}
                                                                                className="h-9 rounded-lg bg-secondary px-3 text-[11px] font-bold text-content-muted transition-colors hover:bg-secondary/80 hover:text-content-main"
                                                                            >
                                                                                Não
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleConfirmDeleteSubject(subject.id, subject.name)}
                                                                                className="h-9 rounded-lg bg-destructive px-3 text-[11px] font-bold text-destructive-foreground transition-colors hover:bg-destructive/85"
                                                                            >
                                                                                Sim
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setConfirmDeleteSubjectId(prev => prev === subject.id ? null : subject.id)}
                                                                            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-destructive/[0.05] px-3 text-[11px] font-bold text-destructive/80 transition-colors hover:bg-destructive/12 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 lg:h-9"
                                                                        >
                                                                            <Trash2 size={12} />
                                                                            Excluir matéria
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Confirmação de troca de edital */}
            <AnimatePresence>
                {showSwitchConfirm && pendingEditalSwitch && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-overlay/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative flex w-full max-w-md flex-col gap-6 rounded-[28px] border border-border bg-modal p-6 shadow-2xl sm:p-8"
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
                                    className="app-button-secondary h-11 flex-1 px-4 text-xs font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmEditalSwitch}
                                    className="h-11 flex-1 rounded-xl bg-destructive px-4 text-xs font-bold text-destructive-foreground transition-colors hover:bg-destructive/85"
                                >
                                    Descartar e Trocar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>,
        document.body
    );
};
