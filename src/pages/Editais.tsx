import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
    Search, Plus, PlusCircle, Library, Trash2, Play, Eye, CalendarDays, Clock,
    BookOpen, AlertTriangle, Merge, Unlink, X, CheckCircle2, RefreshCw, ArrowRight, Sparkles, Send, Loader2,
    AlertCircle, Info, GraduationCap, Target, Database, ChevronDown, ChevronUp, Link, FileText
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EditalCard } from '@/components/editais/EditalCard';
import { EditalSubjectsModal } from '@/components/editais/EditalSubjectsModal';
import { SyncReviewModal } from '@/components/editais/SyncReviewModal';
import { EditEditalModal } from '@/components/editais/EditEditalModal'; // Added
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import { MergeSuggestionCard, CompactMergeSuggestionList } from '@/components/subjects/MergeSuggestionCard';
import { Subject } from '@/types';
import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';
import {
    performHybridMerge,
    saveUnificationMap,
    performFullTopicMerge,
    applyTopicMergeToMap,
    persistPhysicalSoftMerge,
    fetchPendingMergeSuggestions,
    discardPendingMergeSuggestions,
    updateSuggestionStatus,
    PendingSuggestion
} from '@/services/cycleMergeService';
import { mergeService } from '@/services/mergeService';
import {
    CycleUnificationMap,
    HybridMergeResult,
    UnifiedSubjectMapping,
    UnifiedTopicMapping,
    TopicMergePhaseResult
} from '@/types/cycleMergeTypes';

// ─── Tipos ─────────────────────────────────────────────────────────────────
export interface UserEdital {
    id: string;
    name: string;
    organ?: string;
    position?: string;
    year?: string;
    examDate?: string;
    createdAt: string;
    updatedAt: string;
    isImported: boolean;
    sourceId?: string;
    subjectIds: string[];
    activeSubjectIds: string[];
    isMergedWith?: string[];
    mergedIntoCycle?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const getDaysUntilExam = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return null;
    return Math.ceil((time - Date.now()) / (1000 * 60 * 60 * 24));
};

/** Converte row do Supabase → UserEdital */
const rowToEdital = (row: Record<string, unknown>): UserEdital => ({
    id: row.id as string,
    name: row.name as string,
    organ: (row.organ as string) || undefined,
    position: (row.position as string) || undefined,
    year: (row.year as string) || undefined,
    examDate: (row.exam_date as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isImported: row.is_imported as boolean,
    sourceId: (row.source_id as string) || undefined,
    subjectIds: (row.subject_ids as string[]) || [],
    activeSubjectIds: (row.active_subject_ids as string[]) || [],
    isMergedWith: (row.merged_with as string[]) || undefined,
    mergedIntoCycle: (row.merged_into_cycle as boolean) || false,
});

/** Wrapper para acessar tabela user_editais (não está nos types gerados ainda) */
const editaisTable = () => (supabase as any).from('user_editais');

// ─── Componente Principal ───────────────────────────────────────────────────
const Editais = () => {
    const { user } = useAuth();
    const { subjects, isLoading, refreshData } = useApp();
    const location = useLocation();

    const [editais, setEditais] = useState<UserEdital[]>([]);
    const [loadingEditais, setLoadingEditais] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'manual' | 'imported'>('all');
    const [filterCycle, setFilterCycle] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importModalTab, setImportModalTab] = useState<'ready' | 'ia' | 'manual'>('ready');
    const [subjectsModal, setSubjectsModal] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [unloadConfirm, setUnloadConfirm] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [cycleConflict, setCycleConflict] = useState<{
        isOpen: boolean;
        edital: UserEdital | null;
        existingIds: string[];
        currentOrigins: (UserEdital | { name: string; isManual: boolean })[];
        step: 'select' | 'preview' | 'topic-preview' | 'success';
        action: 'merge' | 'replace' | 'hybrid' | null;
        unificationMap?: CycleUnificationMap;
        finalSubjectIds?: string[];
        hybridResult?: HybridMergeResult;
        aiStatus?: 'success' | 'error' | 'timeout';
        topicMergeResult?: TopicMergePhaseResult;
        subjectDisplayNameOverrides?: Record<string, string>; // subjectId → custom name
        showIASuggestionsOnly?: boolean;
    }>({
        isOpen: false,
        edital: null,
        existingIds: [],
        currentOrigins: [],
        step: 'select',
        action: null,
        showIASuggestionsOnly: false
    });
    const [pendingMerges, setPendingMerges] = useState<Record<string, any>>({});
    const [isRecoveringMerge, setIsRecoveringMerge] = useState(false);
    const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [mergePhase, setMergePhase] = useState<'exact' | 'ai' | 'finalizing'>('exact');
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [removalProgress, setRemovalProgress] = useState<{ editalId: string, message: string, percentage: number } | null>(null);

    const [expandedPreviewSubjects, setExpandedPreviewSubjects] = useState<Set<string>>(new Set());
    const [pendingSuggestions, setPendingSuggestions] = useState<PendingSuggestion[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const toggleSubjectExpansion = (displayName: string) => {
        setExpandedSubjects(prev => {
            const next = new Set(prev);
            if (next.has(displayName)) {
                next.delete(displayName);
            } else {
                next.add(displayName);
            }
            return next;
        });
    };

    const togglePreviewSubjectExpansion = (subjectId: string) => {
        setExpandedPreviewSubjects(prev => {
            const next = new Set(prev);
            if (next.has(subjectId)) {
                next.delete(subjectId);
            } else {
                next.add(subjectId);
            }
            return next;
        });
    };
    const [processingProgress, setProcessingProgress] = useState<{ message: string; percentage?: number; current?: number; total?: number } | null>(null);
    const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
    const [suggestionName, setSuggestionName] = useState('');
    const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
    const [syncReview, setSyncReview] = useState<{
        isOpen: boolean;
        edital: UserEdital | null;
        localSubjects: Subject[];
        sourceSubjects: any[];
    }>({ isOpen: false, edital: null, localSubjects: [], sourceSubjects: [] });
    const [editModal, setEditModal] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [loadedEditalSubjects, setLoadedEditalSubjects] = useState<Subject[]>([]);

    // ── Efeito para abrir modal baseado no estado de navegação ──
    useEffect(() => {
        if (location.state?.openImportModal) {
            setIsImportModalOpen(true);
            if (location.state?.importTab) {
                setImportModalTab(location.state.importTab);
            }
        }
        if (location.state?.filterCycle) {
            setFilterCycle(true);
        }
        // Limpa o estado para evitar que reabra ao atualizar a página
        if (location.state?.openImportModal || location.state?.filterCycle) {
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // ── Fetch editais do Supabase ──
    const fetchEditais = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await editaisTable()
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEditais((data || []).map(rowToEdital));
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'fetch', userMessage: 'Erro ao carregar editais.' });
        } finally {
            setLoadingEditais(false);
        }
    }, [user?.id]);

    // ── Salvar Edital ──
    const handleSaveEdital = useCallback(async (id: string, updates: { organ: string; position: string; year: string; exam_date?: string }) => {
        try {
            const { error } = await editaisTable()
                .update({
                    organ: updates.organ,
                    position: updates.position,
                    year: updates.year,
                    exam_date: updates.exam_date || null,
                    name: updates.position ? `${updates.organ} - ${updates.position}` : updates.organ,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', id);

            if (error) throw error;
            toast.success('Edital atualizado com sucesso!');
            await fetchEditais();
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'save', userMessage: 'Erro ao salvar alterações.' });
        }
    }, [fetchEditais]);

    const [searchParams] = useSearchParams();
    const highlightedSourceId = searchParams.get('sourceId');
    const [scrolledTo, setScrolledTo] = useState(false);

    const [publicEditais, setPublicEditais] = useState<any[]>([]);

    const fetchPublicEditais = useCallback(async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('public_editais')
                .select('id, updated_at, subjects');
            if (!error && data) {
                setPublicEditais(data);
            }
        } catch (err) {
            console.error('Error fetching public editais for sync check:', err);
        }
    }, []);

    const loadPendingMerges = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await (supabase as any)
                .from('pending_cycle_merges')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            const map: Record<string, any> = {};
            data?.forEach((item: any) => {
                if (item.edital_id) {
                    map[item.edital_id] = {
                        ...item.state_data,
                        updatedAt: item.updated_at
                    };
                }
            });
            setPendingMerges(map);
        } catch (err) {
            console.error('Erro ao carregar mesclagens pendentes:', err);
        }
    }, [user]);

    const savePendingMerge = useCallback(async (editalId: string, state: any) => {
        if (!user) return;
        try {
            const dataToSave = { ...state };
            delete dataToSave.isOpen;
            delete dataToSave.edital;

            const { error } = await (supabase as any)
                .from('pending_cycle_merges')
                .upsert({
                    user_id: user.id,
                    edital_id: editalId,
                    state_data: dataToSave,
                    updated_at: new Date().toISOString()
                } as any);

            if (error) throw error;
            setPendingMerges(prev => ({ ...prev, [editalId]: dataToSave }));
        } catch (err) {
            console.error('Erro ao salvar mesclagem pendente:', err);
        }
    }, [user]);

    const discardPendingMerge = useCallback(async (editalId: string | 'all') => {
        if (!user) return;
        try {
            let query = (supabase as any)
                .from('pending_cycle_merges')
                .delete()
                .eq('user_id', user.id);

            if (editalId !== 'all') {
                query = query.eq('edital_id', editalId);
            }

            const { error } = await query;
            if (error) throw error;

            setPendingMerges(prev => {
                if (editalId === 'all') return {};
                const next = { ...prev };
                delete next[editalId];
                return next;
            });

            if (editalId === 'all') {
                console.log('[Editais] Todos os rascunhos de mesclagem foram invalidados pois o ciclo mudou.');
            }
        } catch (err) {
            console.error('Erro ao descartar mesclagem pendente:', err);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchEditais();
            fetchPublicEditais();
            loadPendingMerges();
        }
    }, [user, fetchEditais, fetchPublicEditais, loadPendingMerges]);

    // Escuta evento de atualização de matérias/tópicos para refresh
    useEffect(() => {
        const handleExternalUpdate = () => {
            fetchEditais();
        };
        window.addEventListener('subjectUpdated', handleExternalUpdate);
        return () => window.removeEventListener('subjectUpdated', handleExternalUpdate);
    }, [fetchEditais]);

    // Carrega sugestões pendentes da IA
    const loadPendingSuggestions = useCallback(async () => {
        if (!user?.id) return;
        setIsLoadingSuggestions(true);
        try {
            const suggestions = await fetchPendingMergeSuggestions(user.id);
            setPendingSuggestions(suggestions);
        } catch (err) {
            console.error('[Editais] Erro ao carregar sugestões:', err);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [user?.id]);

    useEffect(() => {
        const checkAndLoadSuggestions = async () => {
            if (!user?.id) return;

            // Se não houver editais, as sugestões são órfãs e devem ser limpas
            if (editais.length === 0 && !isLoading) {
                const suggestions = await fetchPendingMergeSuggestions(user.id);
                if (suggestions.length > 0) {
                    console.log('[Editais] Limpando sugestões órfãs (zero editais)');
                    await discardPendingMergeSuggestions(user.id);
                    setPendingSuggestions([]);
                }
                return;
            }

            loadPendingSuggestions();
        };

        checkAndLoadSuggestions();
    }, [user?.id, editais.length, isLoading, loadPendingSuggestions]);

    // handlers para aprovar/rejeitar sugestões de mesclagem
    const handleApproveSuggestion = useCallback(async (suggestion: PendingSuggestion) => {
        try {
            const originalIds = (suggestion.original_ids as string[] | undefined) || [];
            if (originalIds.length >= 2) {
                // 1. Buscar progresso de todos os tópicos envolvidos
                const { data: topicsData } = await supabase
                    .from('topics')
                    .select('id, completed, review_count, next_review, last_reviewed_at, difficulty_level, notes, memory_stability, current_interval, retention_score, total_reviews')
                    .in('id', originalIds);

                if (topicsData && topicsData.length > 0) {
                    // 2. Encontrar o tópico com maior progresso (prioridade para completed=true, depois review_count)
                    const masterTopic = [...topicsData].sort((a, b) => {
                        if (a.completed && !b.completed) return -1;
                        if (!a.completed && b.completed) return 1;
                        return (b.review_count || 0) - (a.review_count || 0);
                    })[0];

                    const primaryId = originalIds[0];
                    const secondaryIds = originalIds.slice(1);

                    // 3. Sincronizar todos os tópicos com os dados do 'master'
                    await (supabase as any)
                        .from('topics')
                        .update({
                            completed: masterTopic.completed,
                            review_count: masterTopic.review_count,
                            next_review: masterTopic.next_review,
                            last_reviewed_at: masterTopic.last_reviewed_at,
                            difficulty_level: masterTopic.difficulty_level,
                            notes: masterTopic.notes,
                            memory_stability: masterTopic.memory_stability,
                            current_interval: masterTopic.current_interval,
                            retention_score: masterTopic.retention_score,
                            total_reviews: masterTopic.total_reviews
                        })
                        .in('id', originalIds);

                    // 4. Definir o parent_topic_id (primaryId será o pai visual)
                    await (supabase as any)
                        .from('topics')
                        .update({ parent_topic_id: primaryId })
                        .in('id', secondaryIds);

                    console.log(`[Editais] Tópicos unificados e sincronizados usando como base: ${masterTopic.id}`);
                }
            }
            await updateSuggestionStatus(suggestion.id, 'approved');
            setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
            toast.success('Tópicos unificados e sincronizados!');
        } catch (err) {
            errorService.report(err, { module: 'merge', action: 'approve', userMessage: 'Erro ao unificar tópicos.' });
        }
    }, []);

    const handleRejectSuggestion = useCallback(async (suggestion: PendingSuggestion) => {
        try {
            await updateSuggestionStatus(suggestion.id, 'rejected');
            setPendingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        } catch (err) {
            errorService.report(err, { module: 'merge', action: 'reject', userMessage: 'Erro ao rejeitar sugestão.' });
        }
    }, []);

    // Reseta filtros se houver um sourceId destacado (para garantir que seja visível para o scroll)
    useEffect(() => {
        if (highlightedSourceId) {
            setActiveFilter('all');
            setSearchQuery('');
        }
    }, [highlightedSourceId]);
    // ── Filtro ──
    const filteredEditais = useMemo(() => {
        let result = editais;

        // 0. Filtro por Ciclo (vindo da página Matérias)
        if (filterCycle) {
            result = result.filter(e => e.mergedIntoCycle);
        }

        // 1. Filtro por Busca
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(e => e.name.toLowerCase().includes(q));
        }

        // 2. Filtro por Tipo
        if (activeFilter === 'manual') {
            result = result.filter(e => !e.isImported);
        } else if (activeFilter === 'imported') {
            result = result.filter(e => e.isImported);
        }

        return result;
    }, [editais, searchQuery, activeFilter, filterCycle]);

    useEffect(() => {
        if (highlightedSourceId && filteredEditais.length > 0 && !scrolledTo) {
            const timer = setTimeout(() => {
                const targetEdital = filteredEditais.find(e => e.sourceId === highlightedSourceId || e.id === highlightedSourceId);
                if (targetEdital) {
                    const element = document.getElementById(`edital-${targetEdital.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setScrolledTo(true);
                    }
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [highlightedSourceId, filteredEditais, scrolledTo]);

    // ── Métricas por edital ──
    const getEditalMetrics = useCallback((edital: UserEdital) => {
        if (!subjects || subjects.length === 0) {
            return { totalTopics: 0, completedTopics: 0, totalStudyMinutes: 0, subjectsCount: 0 };
        }

        const ids = Array.isArray(edital.subjectIds) ? edital.subjectIds : [];
        // Filtramos os subjects que pertencem a este edital
        const editalSubjects = subjects.filter(s => ids.includes(s.id));

        // CORREÇÃO: Evitar contagem inflada se o edital tiver o mesmo ID de subject múltiplas vezes (improvável mas possível no DB)
        // Ou se subjects.filter retornar duplicatas. Usamos um Map para garantir unicidade por ID.
        const uniqueSubjects = Array.from(new Map(editalSubjects.map(s => [s.id, s])).values());

        const totalTopics = uniqueSubjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0);
        const completedTopics = uniqueSubjects.reduce((acc, s) => acc + (s.topics?.filter(t => t.completed).length || 0), 0);
        const completedSubjectsCount = uniqueSubjects.filter(s =>
            s.topics && s.topics.length > 0 && s.topics.every(t => t.completed)
        ).length;

        const totalStudyMinutes = uniqueSubjects.reduce((acc, s) =>
            acc + (s.topics?.reduce((tAcc, t) => tAcc + (t.review_count || 0) * 25, 0) || 0), 0);

        return {
            totalTopics,
            completedTopics,
            totalStudyMinutes,
            subjectsCount: uniqueSubjects.length,
            completedSubjectsCount
        };
    }, [subjects]);

    // ── CRUD Operations ──
    const handleDeleteEdital = useCallback(async (edital: UserEdital) => {
        setProcessingId(edital.id);
        try {
            // 1. Sincronizar ciclo e limpar merges ANTES de deletar o edital físico.
            // Isso é vital para que o serviço identifique quais IDs estão saindo e promova sobreviventes.
            await mergeService.syncCycleAfterRemoval(user!.id, edital.id);
            await mergeService.cleanupMergesAfterEditalRemoval(user!.id, edital.id, (p) => {
                setRemovalProgress({ editalId: edital.id, ...p });
            });

            // 2. Limpar o mapa de unificação do ciclo para remover referências ao edital deletado
            const { data: updatedCycle } = await supabase
                .from('user_cycles')
                .select('unification_map')
                .eq('user_id', user!.id)
                .maybeSingle();

            if (updatedCycle?.unification_map) {
                let newUnificationMap = updatedCycle.unification_map as any;
                const subjectIdsSet = new Set(edital.subjectIds);

                newUnificationMap = {
                    ...newUnificationMap,
                    editalIds: (newUnificationMap.editalIds || []).filter((id: string) => id !== edital.id),
                    unifiedSubjects: (newUnificationMap.unifiedSubjects || []).map((u: any) => ({
                        ...u,
                        originalSubjectIds: u.originalSubjectIds.filter((id: string) => !subjectIdsSet.has(id))
                    })).filter((u: any) => u.originalSubjectIds.length > 0)
                };

                if (newUnificationMap.editalIds.length === 0) newUnificationMap = null;

                await supabase
                    .from('user_cycles')
                    .update({ unification_map: newUnificationMap })
                    .eq('user_id', user!.id);
            }

            // 3. Limpar rascunhos de mesclagem (IA e Cycle)
            await (supabase as any)
                .from('pending_cycle_merges')
                .delete()
                .eq('user_id', user!.id)
                .eq('edital_id', edital.id);

            if (edital.mergedIntoCycle) {
                await discardPendingMerge('all');
            }

            // Limpa sugestões pendentes de mesclagem (IA/Semântica) para o usuário
            await discardPendingMergeSuggestions(user!.id);
            setPendingSuggestions([]);

            // 4. DELEÇÃO FÍSICA ÚNICA
            // Graças ao ON DELETE CASCADE configurado no banco, isto deletará automaticamente:
            // - subjects vinculados
            // - topics vinculados
            // - topic_merges onde estes tópicos eram primários
            // - subject_merges onde estas matérias eram primárias
            // - histórico de revisão e sessões de estudo
            const { error } = await editaisTable().delete().eq('id', edital.id);
            if (error) throw error;

            setEditais(prev => prev.filter(e => e.id !== edital.id));
            setDeleteConfirm({ isOpen: false, edital: null });

            const cleanName = edital.name.length > 50 ? `${edital.name.substring(0, 50)}...` : edital.name;
            toast.success(`Edital "${cleanName}" removido com sucesso.`);

            window.dispatchEvent(new CustomEvent('cycleUpdated'));
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'delete', userMessage: 'Erro ao deletar edital.' });
        } finally {
            setProcessingId(null);
            setRemovalProgress(null);
        }
    }, [user, discardPendingMerge]);

    const handleSendSuggestion = async () => {
        if (!suggestionName.trim() || !user) return;
        setIsSendingSuggestion(true);
        try {
            const { error } = await (supabase as any).from('edital_suggestions').insert({
                user_id: user.id,
                concurso: suggestionName.trim(),
                status: 'pending'
            } as any);
            if (error) throw error;
            toast.success('Sugestão enviada com sucesso!');
            setIsSuggestionOpen(false);
            setSuggestionName('');
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'suggest', userMessage: 'Erro ao enviar sugestão.' });
        } finally {
            setIsSendingSuggestion(false);
        }
    };

    const handleUnloadCycle = useCallback(async (edital: UserEdital) => {
        if (!user) return;
        setProcessingId(edital.id);

        // Garante que subjectIds seja um array de strings
        const subjectIds = Array.isArray(edital.subjectIds)
            ? edital.subjectIds.filter(id => typeof id === 'string' && id.length > 0)
            : [];

        console.log('[Editais] handleUnloadCycle:', { editalId: edital.id, name: edital.name, subjectIds });

        try {
            // ─── 1. Sincronizar Ciclo e Gerenciar Unificações Orfãs ───
            // Substitui IDs removidos por sobreviventes se houver mesclagem. 
            // Garante que o edital que FICA no ciclo mantenha suas matérias.
            await mergeService.syncCycleAfterRemoval(user.id, edital.id);

            // ─── 2. Limpeza Profunda de Mesclagens (Garante que o ícone de tesoura suma) ───
            await mergeService.cleanupMergesAfterEditalRemoval(user.id, edital.id, (p) => {
                setRemovalProgress({ editalId: edital.id, ...p });
            });

            // ─── 3. Atualizar o unification_map (Remover referências ao edital que está saindo) ───
            const { data: updatedCycle } = await supabase
                .from('user_cycles')
                .select('unification_map')
                .eq('user_id', user.id)
                .maybeSingle();

            if (updatedCycle?.unification_map) {
                let newUnificationMap = updatedCycle.unification_map as any;
                const subjectIdsToRemove = new Set(edital.subjectIds);

                newUnificationMap = {
                    ...newUnificationMap,
                    editalIds: (newUnificationMap.editalIds || []).filter((id: string) => id !== edital.id),
                    unifiedSubjects: (newUnificationMap.unifiedSubjects || []).map((u: any) => ({
                        ...u,
                        originalSubjectIds: u.originalSubjectIds.filter((id: string) => !subjectIdsToRemove.has(id))
                    })).filter((u: any) => u.originalSubjectIds.length > 0)
                };

                if (newUnificationMap.editalIds.length === 0) newUnificationMap = null;

                await supabase
                    .from('user_cycles')
                    .update({ unification_map: newUnificationMap })
                    .eq('user_id', user.id);
            }

            // ─── 4. Resetar campos SRS nos tópicos (Remove da página de Revisões) ───
            if (edital.subjectIds && edital.subjectIds.length > 0) {
                await supabase
                    .from('topics')
                    .update({
                        next_review: null,
                        review_stage: '0',
                        memory_stability: 0,
                        review_count: 0,
                        first_studied_at: null,
                        last_reviewed_at: null,
                        completed: false,
                        current_interval: null
                    } as any)
                    .in('subject_id', subjectIds);

                // ─── 5. Purgar logs de estudo e histórico de revisão PARA ESTE EDITAL ───
                await (supabase as any).from('study_sessions').delete().eq('edital_id', edital.id);
                await (supabase as any).from('topic_review_history').delete().eq('edital_id', edital.id);
            }

            // ─── 6. Atualizar Estado do Edital Local ───
            await editaisTable()
                .update({ merged_into_cycle: false, active_subject_ids: [] } as any)
                .eq('id', edital.id);

            // ─── 7. Invalidar rascunhos (O baseline do ciclo mudou) ───
            await discardPendingMerge('all');

            setEditais(prev => prev.map(e =>
                e.id === edital.id
                    ? { ...e, mergedIntoCycle: false, activeSubjectIds: [] }
                    : e
            ));

            toast.success(`"${edital.name}" removido do ciclo.`);
            window.dispatchEvent(new CustomEvent('cycleUpdated'));
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            refreshData();
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'unloadCycle', userMessage: 'Erro ao remover edital do ciclo.' });
        } finally {
            setProcessingId(null);
            setRemovalProgress(null);
        }
    }, [user, refreshData, discardPendingMerge]);

    const handleLoadCycle = useCallback(async (edital: UserEdital) => {
        if (!user) return;
        setProcessingId(edital.id);

        try {
            // Verificar se há uma mesclagem pendente para este edital
            const pending = pendingMerges[edital.id];

            if (pending) {
                setIsRecoveringMerge(true);
                setCycleConflict({
                    isOpen: true,
                    edital: edital,
                    ...pending
                });
                setProcessingId(null);
                return;
            }

            const { data: existingCycle } = await supabase
                .from('user_cycles')
                .select('id, ciclo_atual, unification_map')
                .eq('user_id', user.id)
                .maybeSingle();

            const unificationMap = existingCycle?.unification_map as any;
            const existingIdsInCycle = (existingCycle?.ciclo_atual as string[] | null) || [];

            // 1. Detectar nomes das matérias que já estão no ciclo (para detecção por nome)
            const namesInCycle = new Set<string>();
            subjects.forEach(s => {
                if (existingIdsInCycle.includes(s.id)) {
                    namesInCycle.add(s.name.toLowerCase().trim());
                }
            });

            // 2. Expandir IDs considerando unificações passadas
            const expandedExistingIds = new Set(existingIdsInCycle);
            if (unificationMap?.unifiedSubjects) {
                unificationMap.unifiedSubjects.forEach((u: any) => {
                    const hasSomeInCycle = u.originalSubjectIds.some((id: string) => expandedExistingIds.has(id));
                    if (hasSomeInCycle) {
                        u.originalSubjectIds.forEach((id: string) => expandedExistingIds.add(id));
                        if (u.displayNameOverride) namesInCycle.add(u.displayNameOverride.toLowerCase().trim());
                    }
                });
            }

            // 3. Identificar origens e conflitos
            // 3. Identificar origens e conflitos
            const realExistingIdsInCycle = Array.from(expandedExistingIds).filter(id => subjects.some(s => s.id === id));
            const origins: (UserEdital | { name: string; isManual: boolean })[] = [];

            // Buscar matérias do edital atual para o preview
            const { data: editalSubjectsData } = await supabase
                .from('subjects')
                .select('*, topics(*)')
                .in('id', edital.subjectIds);

            const currentEditalSubjects = (editalSubjectsData as any[]) || [];

            // Detecção por Nome: Se alguma matéria do novo edital tem o mesmo nome de algo no ciclo
            const hasNameConflict = currentEditalSubjects.some(s => namesInCycle.has(s.name.toLowerCase().trim()));

            // Adicionar editais que possuem matérias no ciclo
            for (const e of editais) {
                if (e.id === edital.id) continue;
                const hasCommonId = e.subjectIds.some(id => expandedExistingIds.has(id));
                const hasCommonName = e.subjectIds.some(id => {
                    const s = subjects.find(sub => sub.id === id);
                    return s && namesInCycle.has(s.name.toLowerCase().trim());
                });

                if (hasCommonId || hasCommonName) {
                    origins.push(e);
                }
            }

            // Verificar matérias que não pertencem a nenhum dos editais identificados (Manuais ou Órfãs)
            const coveredIds = new Set(origins.flatMap(o => (o as any).isManual ? [] : (o as UserEdital).subjectIds || []));
            const hasOrphanSubjects = realExistingIdsInCycle.some(id => !coveredIds.has(id));

            if (hasOrphanSubjects || (origins.length === 0 && hasNameConflict)) {
                origins.push({ name: 'Manual', isManual: true });
            }

            if (editalSubjectsData) {
                setLoadedEditalSubjects(editalSubjectsData as any);
            }

            // Mostrar modal de carga/conflito
            setCycleConflict({
                isOpen: true,
                edital: edital,
                existingIds: realExistingIdsInCycle,
                currentOrigins: origins,
                step: realExistingIdsInCycle.length > 0 ? 'select' : 'preview',
                action: realExistingIdsInCycle.length > 0 ? null : 'replace'
            });
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'loadCycle', userMessage: 'Erro ao preparar carga do ciclo.' });
        } finally {
            setProcessingId(null);
        }
    }, [user, editais, subjects, pendingMerges]);

    const executeCycleLoad = useCallback(async (subjectIds: string[]) => {
        if (!user) return;
        try {
            const { data: existingCycle } = await supabase
                .from('user_cycles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (existingCycle) {
                const { error } = await supabase
                    .from('user_cycles')
                    .update({
                        ciclo_atual: subjectIds,
                        atualizado_em: new Date().toISOString(),
                    })
                    .eq('user_id', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('user_cycles')
                    .insert({
                        user_id: user.id,
                        ciclo_atual: subjectIds,
                    });
                if (error) throw error;
            }

            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('cycleUpdated')); // Notificar que o ciclo foi atualizado
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'loadCycleExecute', userMessage: 'Erro ao carregar matérias no ciclo.' });
            throw err;
        }
    }, [user]);

    const markEditalMerged = useCallback(async (editalId: string, subjectIds: string[]) => {
        try {
            await editaisTable().update({
                merged_into_cycle: true,
                active_subject_ids: subjectIds,  // inicializa active = todos os subjects
            } as any).eq('id', editalId);
            // Atualizar estado local
            setEditais(prev => prev.map(e =>
                e.id === editalId
                    ? { ...e, mergedIntoCycle: true, activeSubjectIds: subjectIds }
                    : e
            ));
        } catch (err) {
            console.error('Error marking edital as merged:', err);
        }
    }, []);

    const finalPreviewIds = useMemo(() => {
        if (!cycleConflict.edital) return [];
        if (cycleConflict.action === 'merge' && cycleConflict.finalSubjectIds) {
            return cycleConflict.finalSubjectIds;
        }
        // Sempre incluímos as existentes para poder mostrar o "diff" (o que sai e o que entra)
        return [...new Set([...cycleConflict.existingIds, ...cycleConflict.edital.subjectIds])];
    }, [cycleConflict]);

    const handleHybridPreview = useCallback(async () => {
        if (!cycleConflict.edital || !user) return;
        setIsMerging(true);
        setMergePhase('exact');
        setProcessingProgress({ message: 'Unificando matérias...', percentage: 10 });
        try {
            const edital = cycleConflict.edital;
            const existingSubs = subjects.filter(s => cycleConflict.existingIds.includes(s.id));
            const newSubs = subjects.filter(s => edital.subjectIds.includes(s.id));

            const existingEditalIds = editais
                .filter(e => e.mergedIntoCycle && e.id !== edital.id)
                .map(e => e.id);

            const { data: existingMerges } = await supabase
                .from('subject_merges')
                .select('*')
                .eq('user_id', user.id)
                .is('reverted_at', null);

            const result = await performHybridMerge(
                existingSubs,
                newSubs,
                existingEditalIds,
                edital.id,
                existingMerges || [],
                setMergePhase,
                (prog) => setProcessingProgress(prog)
            );

            const newState = {
                step: 'preview' as const,
                action: 'merge' as const,
                hybridResult: result,
                unificationMap: result.unificationMap,
                finalSubjectIds: result.finalSubjectIds,
                aiStatus: result.stats.aiStatus,
                subjectDisplayNameOverrides: {},
                topicMergeResult: undefined,
            };

            setCycleConflict(prev => ({
                ...prev,
                ...newState
            }));

            // Persistir no banco de dados
            savePendingMerge(edital.id, {
                existingIds: cycleConflict.existingIds,
                currentOrigins: cycleConflict.currentOrigins,
                ...newState
            });

            if (result.stats.aiStatus === 'error') {
                toastGate.notifyError('IA Indisponível no momento. A mesclagem usará apenas nomes idênticos.', 'IA-03', { severity: 'medium' });
            }
        } catch (err) {
            errorService.report(err, { module: 'cycle', action: 'merge_preview', userMessage: 'Erro ao gerar prévia da mesclagem via IA.' });
            setProcessingProgress(null);
        } finally {
            setIsMerging(false);
            setProcessingProgress(null);
        }
    }, [cycleConflict, subjects, editais, user, savePendingMerge]);

    const handleTopicPreview = useCallback(async (useAI: boolean) => {
        if (!cycleConflict.unificationMap) return;
        setIsAnalyzingTopics(true);
        setMergePhase('exact');
        setProcessingProgress({ message: useAI ? 'Mesclando tópicos com IA...' : 'Organizando tópicos...', percentage: 0 });
        try {
            // Apply current name overrides to map before topic analysis
            const overrides = cycleConflict.subjectDisplayNameOverrides || {};
            const mapWithOverrides: CycleUnificationMap = {
                ...cycleConflict.unificationMap,
                unifiedSubjects: cycleConflict.unificationMap.unifiedSubjects.map(us => ({
                    ...us,
                    displayNameOverride: overrides[us.originalSubjectIds[0]] || us.displayNameOverride,
                })),
            };

            const topicResult = await performFullTopicMerge(
                mapWithOverrides,
                subjects,
                useAI,
                user?.id,
                undefined,
                (prog) => setProcessingProgress(prog),
                setMergePhase
            );

            const newState = {
                step: 'topic-preview' as const,
                unificationMap: mapWithOverrides,
                topicMergeResult: topicResult,
            };

            setCycleConflict(prev => ({
                ...prev,
                ...newState
            }));

            // Persistir no banco de dados
            if (cycleConflict.edital) {
                savePendingMerge(cycleConflict.edital.id, {
                    existingIds: cycleConflict.existingIds,
                    currentOrigins: cycleConflict.currentOrigins,
                    action: cycleConflict.action,
                    hybridResult: cycleConflict.hybridResult,
                    aiStatus: cycleConflict.aiStatus,
                    ...newState
                });
            }

            // Recarrega as sugestões para o estado local para exibir o switcher no modal
            await loadPendingSuggestions();
        } catch (err) {
            errorService.report(err, { module: 'cycle', action: 'topic_preview', userMessage: 'Erro ao analisar tópicos.' });
        } finally {
            setIsAnalyzingTopics(false);
            setProcessingProgress(null);
        }
    }, [cycleConflict, subjects, savePendingMerge, user?.id, loadPendingSuggestions]);

    const handleCycleConflictAction = useCallback(async (action: 'replace' | 'merge' | 'hybrid') => {
        if (!cycleConflict.edital || !user) return;
        const edital = cycleConflict.edital;
        setProcessingId(edital.id);
        // Apply topic merge results into the unification map if available
        let currentUnificationMap = cycleConflict.unificationMap;
        if (cycleConflict.topicMergeResult && cycleConflict.unificationMap) {
            currentUnificationMap = applyTopicMergeToMap(cycleConflict.unificationMap, cycleConflict.topicMergeResult);
        }

        setIsMerging(true);
        setMergePhase('finalizing');
        setProcessingProgress({ message: 'Preparando unificação...', percentage: 5 });

        try {
            if (action === 'replace') {
                // Remove todos os editais anteriores da carga de ciclo
                const oldMerged = editais.filter(e => e.mergedIntoCycle && e.id !== edital.id);
                for (const e of oldMerged) {
                    await editaisTable().update({
                        merged_into_cycle: false,
                        active_subject_ids: []
                    } as any).eq('id', e.id);
                }

                await executeCycleLoad(edital.subjectIds);
                await markEditalMerged(edital.id, edital.subjectIds);

                // Limpar data da prova ao substituir ciclo
                await supabase
                    .from('user_settings')
                    .update({ data_prova_meta: null } as any)
                    .eq('user_id', user.id);

                setProcessingProgress({ message: 'Finalizando substituição...', percentage: 95 });
                toast.success(`Ciclo substituído com sucesso por "${edital.name}".`);
            } else {
                // Se já temos o mapa calculado da prévia, usamos (agora já atualizado pelos tópicos logo acima). Senão (fallback), calculamos.
                let unificationMap = currentUnificationMap || cycleConflict.hybridResult?.unificationMap;
                let finalSubjectIds = cycleConflict.finalSubjectIds || cycleConflict.hybridResult?.finalSubjectIds;
                let result: HybridMergeResult | null = cycleConflict.hybridResult || null;

                if (!unificationMap || !finalSubjectIds) {
                    const existingSubs = subjects.filter(s => cycleConflict.existingIds.includes(s.id));
                    const newSubs = subjects.filter(s => edital.subjectIds.includes(s.id));
                    const existingEditalIds = editais
                        .filter(e => e.mergedIntoCycle && e.id !== edital.id)
                        .map(e => e.id);

                    setProcessingProgress({ message: 'Unificando matérias...', percentage: 10 });
                    setIsMerging(true);
                    setMergePhase('exact');

                    const resultData = await performHybridMerge(
                        existingSubs,
                        newSubs,
                        existingEditalIds,
                        edital.id,
                        [],
                        setMergePhase,
                        (prog) => setProcessingProgress(prog)
                    );
                    unificationMap = resultData.unificationMap;
                    finalSubjectIds = resultData.finalSubjectIds;
                    // We don't need to set result locally here if we use resultData below
                    result = resultData;
                }

                // 1. Aplicar unificação física (Soft Merge) no banco de dados
                setProcessingProgress({ message: 'Salvando estrutura de matérias...', percentage: 30 });
                await persistPhysicalSoftMerge(unificationMap);

                // 2. Persistir o mapa de unificação no registro do ciclo (para UI)
                setProcessingProgress({ message: 'Unificando tópicos no banco...', percentage: 60 });
                await saveUnificationMap(user.id, unificationMap);

                // 3. NOVO: Salvar mesclagens nas tabelas dedicated (subject_merges e topic_merges)
                try {
                    // Buscar o cycle_id primeiro
                    const { data: cycleData } = await (supabase as any)
                        .from('user_cycles')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('status', 'active')
                        .limit(1)
                        .maybeSingle();

                    const cycleId = cycleData?.id;
                    if (cycleId && unificationMap) {
                        setProcessingProgress({ message: 'Cruzando históricos entre editais...', percentage: 80 });
                        await mergeService.saveMergeFromUnificationMap(user.id, cycleId, unificationMap);
                        console.log('[Editais] Mesclagens salvas nas tabelas dedicated');
                        window.dispatchEvent(new CustomEvent('mergeUpdated'));
                    }
                } catch (mergeErr) {
                    console.error('[Editais] Erro ao salvar nas tabelas de merge:', mergeErr);
                }

                // 4. Carregar matérias no ciclo ativo
                setProcessingProgress({ message: 'Finalizando carga de ciclo...', percentage: 95 });
                await executeCycleLoad(finalSubjectIds!);
                await markEditalMerged(edital.id, edital.subjectIds);

                const currentStats = result?.stats || cycleConflict.hybridResult?.stats;
                const totalNew = currentStats ? (currentStats.totalSubjectsInCycle - cycleConflict.existingIds.length) : 0;
                const mergeDetails = currentStats ? [
                    currentStats.exactMatches > 0 ? `${currentStats.exactMatches} unificação(ões) exata(s)` : '',
                    currentStats.semanticMatches > 0 ? `${currentStats.semanticMatches} unificação(ões) por IA` : '',
                    currentStats.standaloneSubjects > 0 ? `${currentStats.standaloneSubjects} matéria(s) independente(s)` : '',
                ].filter(Boolean).join(', ') : '';

                toast.success(
                    `Mesclagem concluída! ${totalNew} nova(s) matéria(s) adicionadas. ${mergeDetails ? `(${mergeDetails})` : ''}`
                );
            }

            // Se a ação foi concluída com sucesso, descartar persistência
            // Como o ciclo mudou, invalidamos TODOS os rascunhos para garantir integridade
            await discardPendingMerge('all');

            // Envia evento de atualização
            window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'merge_completed' } }));

            // Mudar para tela de sucesso em vez de fechar
            setCycleConflict(prev => ({ ...prev, step: 'success' }));

            // Atualizar dados em background
            await fetchEditais();
            await refreshData();
        } catch (err) {
            errorService.report(err, { module: 'cycle', action: 'conflict_resolution', userMessage: 'Erro ao processar ação no ciclo.' });
        } finally {
            setProcessingId(null);
            setIsMerging(false);
            setProcessingProgress(null);
        }
    }, [cycleConflict, executeCycleLoad, editais, markEditalMerged, fetchEditais, refreshData, user, subjects, discardPendingMerge]);

    /**
     * Importação de edital: cria matérias e tópicos REAIS no Supabase,
     * coleta os UUIDs retornados e salva o edital com esses IDs.
     */
    const handleImportDone = useCallback(async (
        importedSubjects: Subject[],
        editalName?: string,
        isImported: boolean = false,
        sourceId?: string,
        extraInfo?: { organ: string; position: string; year: string; category?: string; exam_date?: string }
    ) => {
        console.log("🚀 handleImportDone acionado - Versão 2.3 (Correção P0001)");
        console.log("Parâmetros:", { editalName, isImported, sourceId, extraInfo });

        if (!user || isSaving) return;
        setIsSaving(true);

        try {
            // 1. Criar o Edital primeiro (com lista de IDs vazia)
            const finalName = editalName || 'Novo Edital';
            // Sanitização robusta da data da prova
            let sanitizedExamDate: string | null = null;
            if (extraInfo?.exam_date && typeof extraInfo.exam_date === 'string' && extraInfo.exam_date.trim() !== '') {
                // Se a data vier no formato AAAA-MM-DD ou similar válido
                sanitizedExamDate = extraInfo.exam_date;
            }

            const { data: newEditalRow, error: editalErr } = await editaisTable().insert({
                user_id: user.id,
                name: finalName,
                is_imported: isImported,
                source_id: sourceId,
                organ: extraInfo?.organ,
                position: extraInfo?.position,
                year: extraInfo?.year,
                category: extraInfo?.category,
                exam_date: sanitizedExamDate,
                subject_ids: [], // Será atualizado no final
                active_subject_ids: [],
                merged_into_cycle: false,
            } as any).select().single();

            if (editalErr) throw editalErr;
            if (!newEditalRow) throw new Error('Falha ao criar edital base.');

            const realSubjectIds: string[] = [];

            // 2. Loop de matérias já com o edital_id
            for (const subj of importedSubjects) {
                // Criar matéria no Supabase vinculada ao edital
                const { data: newSubject, error: subjErr } = await supabase
                    .from('subjects')
                    .insert({
                        user_id: user.id,
                        edital_id: newEditalRow.id, // OBRIGATÓRIO agora
                        name: subj.name,
                        status: 'Nova',
                        color: subj.color || '#3b82f6',
                    } as any)
                    .select('id')
                    .single();

                if (subjErr) throw subjErr;
                if (!newSubject) continue;

                realSubjectIds.push(newSubject.id);

                // Criar tópicos da matéria vinculados ao edital e à matéria
                const topicsToInsert = subj.topics
                    .filter(t => t.name?.trim())
                    .map((t, idx) => ({
                        subject_id: newSubject.id,
                        edital_id: newEditalRow.id, // OBRIGATÓRIO agora
                        name: t.name,
                        completed: false,
                        review_count: 0,
                        position: t.position ?? idx,
                        is_active: true
                    }));

                if (topicsToInsert.length > 0) {
                    const { error: topicErr } = await supabase
                        .from('topics')
                        .insert(topicsToInsert as any);
                    if (topicErr) throw topicErr;
                }
            }

            // 3. Atualizar o Edital com a lista final de UUIDs de matérias
            if (realSubjectIds.length > 0) {
                const { error: updateErr } = await editaisTable()
                    .update({
                        subject_ids: realSubjectIds,
                        active_subject_ids: realSubjectIds
                    } as any)
                    .eq('id', newEditalRow.id);

                if (updateErr) throw updateErr;
            }

            // 4. Atualizar tudo
            await fetchEditais();
            await refreshData();

            // Forçamos o despacho do evento para garantir que outros componentes saibam da mudança
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('topicUpdated'));

            setIsImportModalOpen(false);

            // CONSTRUIR O EDITAL FINAL COM OS DADOS ATUALIZADOS
            // Isso evita que o modal de matérias abra "vazio" (sem os IDs das matérias recém-criadas)
            const finalEdital = rowToEdital({
                ...newEditalRow,
                subject_ids: realSubjectIds,
                active_subject_ids: realSubjectIds,
                updated_at: new Date().toISOString()
            });

            // Abrir automaticamente o modal de matérias se for criação manual 
            // ou se o usuário desejar (no caso manual é obrigatório abrir agora)
            if (!isImported) {
                setSubjectsModal({ isOpen: true, edital: finalEdital });
                toast.success(`Edital "${finalName}" criado! Agora adicione as matérias.`);
            } else {
                // No caso de importado por IA, também garantimos que os dados estão refletidos
                toast.success(`Edital "${finalName}" com ${realSubjectIds.length} matéria(s) importado com sucesso!`);
            }
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'import', userMessage: 'Erro ao importar edital.' });
        } finally {
            setIsSaving(false);
        }
    }, [user, isSaving, refreshData, fetchEditais]);

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const handleMerge = useCallback(async () => {
        if (selectedIds.size < 2 || !user) return;
        setIsMerging(true);
        const ids = Array.from(selectedIds);
        const mergedEditais = editais.filter(e => ids.includes(e.id));
        const mergedName = mergedEditais.map(e => e.name).join(' + ');
        const mergedSubjectIds = [...new Set(mergedEditais.flatMap(e => e.subjectIds))];

        // Se houver matérias com IDs diferentes mas nomes idênticos, a unificação manual simples
        // não as agrupa. O usuário deve preferir a Unificação Híbrida (IA) para isso.
        // No entanto, garantimos que IDs idênticos nunca sejam duplicados.

        try {
            const { error: insertErr } = await editaisTable().insert({
                user_id: user.id,
                name: `[Mesclado] ${mergedName}`.substring(0, 200),
                is_imported: false,
                subject_ids: mergedSubjectIds,
                merged_with: ids,
            } as any);
            if (insertErr) throw insertErr;

            const { error: deleteErr } = await editaisTable()
                .delete()
                .in('id', ids)
                .eq('user_id', user.id);
            if (deleteErr) throw deleteErr;

            await fetchEditais();
            setSelectedIds(new Set());
            toast.success('Editais mesclados com sucesso!');

            // Limpa as sugestões pendentes de IA ao finalizar a mesclagem
            await discardPendingMergeSuggestions(user.id);
            setPendingSuggestions([]);
        } finally {
            setIsMerging(false);
        }
    }, [selectedIds, editais, user, fetchEditais]);

    const handleUpdateEdital = useCallback(async (updatedEdital: UserEdital) => {
        if (!user) return;
        try {
            const { error } = await editaisTable().update({
                name: updatedEdital.name,
                subject_ids: updatedEdital.subjectIds,
                active_subject_ids: updatedEdital.activeSubjectIds,
                exam_date: updatedEdital.examDate || null,
                updated_at: new Date().toISOString()
            } as any).eq('id', updatedEdital.id).eq('user_id', user.id);
            if (error) throw error;

            setEditais(prev => prev.map(e => e.id === updatedEdital.id ? updatedEdital : e));
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'update', userMessage: 'Erro ao atualizar edital.' });
        }
    }, [user]);

    /**
     * Sincronização Interativa:
     * Busca o edital oficial e abre o modal de revisão.
     */
    const handleSyncEdital = useCallback(async (edital: UserEdital) => {
        if (!user || !edital.sourceId) return;
        setProcessingId(edital.id);

        try {
            // 1. Buscar fonte e local em paralelo
            const [sourceResult, localResult] = await Promise.all([
                (supabase as any)
                    .from('public_editais')
                    .select('*')
                    .eq('id', edital.sourceId)
                    .single(),
                supabase
                    .from('subjects')
                    .select('id, name, status, topics(id, name, completed, review_count)')
                    .in('id', edital.subjectIds || [])
            ]);

            if (sourceResult.error || !sourceResult.data) throw new Error('Edital original não encontrado');
            if (localResult.error) console.error('Erro no refetch local:', localResult.error);

            console.log('[Sync DEBUG]', {
                editalId: edital.id,
                sourceId: edital.sourceId,
                sourceNames: (sourceResult.data.subjects || []).map((s: any) => s.name),
                localNames: (localResult.data || []).map((s: any) => s.name),
            });

            setSyncReview({
                isOpen: true,
                edital: edital,
                localSubjects: (localResult.data as unknown as Subject[]) || [],
                sourceSubjects: sourceResult.data.subjects || [],
            });

        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'sync-prep', userMessage: 'Erro ao buscar edital oficial.' });
        } finally {
            setProcessingId(null);
        }
    }, [user]);

    /**
     * Aplica as alterações selecionadas no SyncReviewModal
     */
    const applySyncChanges = async (
        addedSubjects: any[],
        addedTopics: Record<string, string[]>,
        removedSubjIds: string[],
        removedTopIds: string[]
    ) => {
        const edital = syncReview.edital;
        if (!user || !edital) return;
        setProcessingId(edital.id);

        try {
            const finalSubjectIds = [...(edital.subjectIds || [])];
            console.log('[Sync Apply] Iniciando. subjectIds atuais:', finalSubjectIds);

            // 1. Processar Matérias Novas
            for (const ss of addedSubjects) {
                console.log('[Sync Apply] Inserindo matéria:', ss.name);
                const { data: newSubj, error: nSubjErr } = await supabase
                    .from('subjects')
                    .insert({
                        user_id: user.id,
                        name: ss.name || ss.title,
                        status: 'Nova',
                        edital_id: edital.id
                    } as any)
                    .select('id')
                    .single();

                if (nSubjErr || !newSubj) {
                    console.error('[Sync Apply] Erro ao inserir matéria:', nSubjErr);
                    throw nSubjErr;
                }
                console.log('[Sync Apply] Matéria inserida:', ss.name, '→ ID:', newSubj.id);
                finalSubjectIds.push(newSubj.id);

                const topicsToInsert = (ss.topics || []).map((ts: any, idx: number) => ({
                    subject_id: newSubj.id,
                    edital_id: edital.id, // Vínculo explícito com o edital
                    name: typeof ts === 'string' ? ts : ts.name,
                    completed: false,
                    review_count: 0,
                    position: (ts as any).position ?? idx
                }));

                if (topicsToInsert.length > 0) {
                    const { error: topicErr } = await supabase.from('topics').insert(topicsToInsert as any);
                    if (topicErr) {
                        console.error('[Sync Apply] Erro ao inserir tópicos:', topicErr);
                        throw topicErr;
                    }
                }
            }

            // 2. Processar Tópicos Novos em Matérias Existentes
            for (const [subjId, topics] of Object.entries(addedTopics)) {
                const topicsToInsert = topics.map((tName, idx) => ({
                    subject_id: subjId,
                    edital_id: edital.id, // Vínculo explícito com o edital
                    name: tName,
                    completed: false,
                    review_count: 0,
                    position: idx
                }));
                if (topicsToInsert.length > 0) {
                    await supabase.from('topics').insert(topicsToInsert as any);
                }
            }

            // 3. Processar Remoções de Tópicos
            if (removedTopIds.length > 0) {
                await supabase.from('topics').delete().in('id', removedTopIds);
            }

            // 4. Processar Remoções de Matérias
            if (removedSubjIds.length > 0) {
                console.log('[Sync Apply] Removendo matérias:', removedSubjIds);
                await supabase.from('topics').delete().in('subject_id', removedSubjIds);
                const { error: subjDelErr } = await supabase.from('subjects').delete().in('id', removedSubjIds).eq('user_id', user!.id);
                if (subjDelErr) {
                    console.error('[Sync Apply] Erro ao deletar matérias:', subjDelErr);
                    throw subjDelErr;
                }

                const idsToRemoveSet = new Set(removedSubjIds);
                const updatedFinalIds = finalSubjectIds.filter(id => !idsToRemoveSet.has(id));
                finalSubjectIds.length = 0;
                finalSubjectIds.push(...updatedFinalIds);
            }

            // 5. Finalizar atualização do edital local
            console.log('[Sync Apply] Finalizando. subjectIds finais:', finalSubjectIds);
            const { error: updErr } = await editaisTable().update({
                subject_ids: finalSubjectIds,
                active_subject_ids: finalSubjectIds,
                updated_at: new Date().toISOString()
            } as any).eq('id', edital.id);

            if (updErr) {
                console.error('[Sync Apply] Erro ao atualizar edital:', updErr);
                throw updErr;
            }

            toast.success('Edital atualizado com sucesso!');
            await fetchEditais();
            await refreshData();
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('topicUpdated'));

        } catch (err) {
            console.error('[Sync Apply] ERRO:', err);
            errorService.report(err, { module: 'editais', action: 'sync-apply', userMessage: 'Erro ao aplicar atualizações.' });
            toast.error('Erro ao aplicar sincronização. Verifique o console para detalhes.');
        } finally {
            setProcessingId(null);
            setSyncReview(prev => ({ ...prev, isOpen: false }));
        }
    };

    // ── Loading ──
    if (isLoading || loadingEditais) return <LoadingSpinner size="large" showText fullPage />;

    return (
        <div className="min-h-screen p-3 md:p-4 lg:p-6 space-y-4">
            {/* ── Cabeçalho Principal (só mostra se houver editais) ── */}
            {editais.length > 0 && (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Filtros e Busca */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                            {/* Busca */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar edital..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full h-9 bg-secondary border border-border dark:border-white/5 rounded-xl pl-9 pr-3 text-xs font-medium focus:outline-none focus:border-primary/40 transition-all text-foreground placeholder:text-content-muted/50 shadow-sm"
                                />
                            </div>

                            {/* Filtros de Tipo */}
                            <div className="flex bg-secondary p-1 rounded-lg border border-border h-9">
                                {[
                                    { id: 'all', label: 'Todos', count: editais.length },
                                    { id: 'imported', label: 'Importados', count: editais.filter(e => e.isImported).length },
                                    { id: 'manual', label: 'Criados', count: editais.filter(e => !e.isImported).length }
                                ].map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => setActiveFilter(f.id as 'all' | 'imported' | 'manual')}
                                        className={`px-2 h-full rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${activeFilter === f.id
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-content-muted hover:text-foreground'
                                            }`}
                                    >
                                        <span className="bg-primary/20 text-primary px-1 py-0.5 rounded text-[8px] font-bold">{f.count}</span>
                                        <span>{f.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 shrink-0">
                            <AnimatePresence>
                                {selectedIds.size >= 2 && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        onClick={handleMerge}
                                        disabled={isMerging}
                                        className="flex items-center gap-1.5 h-9 px-4 bg-violet-500 hover:bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
                                    >
                                        {isMerging ? (
                                            <RefreshCw size={14} className="animate-spin" />
                                        ) : (
                                            <Merge size={14} />
                                        )}
                                        Mesclar ({selectedIds.size})
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-1.5 h-9 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Plus size={14} />
                                Adicionar Edital
                            </button>
                        </div>
                    </div>

                    {/* Sub-header info (opcional, bem discreto agora) */}
                    <div className="flex items-center gap-4 text-[9px] font-bold text-content-muted uppercase tracking-[0.15em] px-1">
                        {selectedIds.size > 0 && (
                            <span className="text-violet-400">{selectedIds.size} selecionados</span>
                        )}
                    </div>

                    {/* Badge de filtro ciclo (ao vir da página Matérias) */}
                    {filterCycle && (
                        <div className="flex items-center gap-3 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                            <Database size={14} className="text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-foreground">
                                    Mostrando editais do ciclo
                                </p>
                                <p className="text-[10px] text-content-muted mt-0.5">
                                    Clique em &ldquo;Ver Matérias&rdquo; para adicionar matérias e tópicos
                                </p>
                            </div>
                            <button
                                onClick={() => setFilterCycle(false)}
                                className="p-1.5 hover:bg-primary/10 rounded-md transition-colors shrink-0"
                            >
                                <X size={14} className="text-content-muted" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Banner de Alerta Amigável (Ciclo Vazio) */}
            {editais.length > 0 && !editais.some(e => e.mergedIntoCycle) && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center gap-3 text-orange-600 dark:text-orange-400 animate-pulse-subtle"
                >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle size={16} />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-bold leading-tight">
                            Você tem editais cadastrados, mas nenhum está carregado no seu ciclo ativo de estudos.
                        </p>
                        <p className="text-[10px] font-medium opacity-80">
                            Clique em <span className="font-bold">"Carregar Ciclo"</span> em um edital abaixo para começar seu planejamento inteligente!
                        </p>
                    </div>
                </motion.div>
            )}

            {/* ── Grid de Cards / Empty State ── */}
            {filteredEditais.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glow-card p-8 md:p-16 flex flex-col items-center justify-center text-center border border-border bg-card shadow-xl rounded-2xl overflow-hidden relative"
                >
                    {/* Elementos Decorativos de Fundo */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />

                    <div className="relative">
                        <div className="w-16 h-16 bg-secondary dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6 mx-auto rotate-3 shadow-inner group-hover:rotate-0 transition-transform duration-500">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm">
                                <Library className="text-primary" size={28} />
                            </div>
                        </div>
                    </div>

                    {editais.length === 0 ? (
                        <div className="max-w-xl mx-auto space-y-4 relative">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight mb-3">
                                    Vamos começar sua aprovação?
                                </h2>
                                <p className="text-sm text-content-muted leading-relaxed font-medium">
                                    Parece que você ainda não tem nenhum edital. <br className="hidden md:block" />
                                    Importe um edital pronto da nossa biblioteca ou use nossa IA para estruturar um do zero!
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-1 active:scale-95"
                                >
                                    <Plus size={16} />
                                    Importar Primeiro Edital
                                </button>
                            </div>

                            <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { icon: GraduationCap, title: 'Foco Total', desc: 'Conteúdo organizado' },
                                    { icon: Target, title: 'Ciclos IA', desc: 'Estudo adaptativo' },
                                    { icon: Clock, title: 'Evolução', desc: 'Acompanhe seu progresso' }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1.5">
                                        <div className="w-7 h-7 rounded-lg bg-secondary dark:bg-white/5 flex items-center justify-center mb-1">
                                            <item.icon size={12} className="text-primary/60" />
                                        </div>
                                        <h3 className="text-[9px] font-bold uppercase tracking-wider text-foreground">{item.title}</h3>
                                        <p className="text-[9px] text-content-muted font-medium">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : searchQuery.trim() ? (
                        <div className="max-w-md mx-auto space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
                                    Nenhum resultado para "{searchQuery}"
                                </h2>
                                <p className="text-sm text-content-muted font-medium">
                                    Não encontramos nenhum edital nos seus registros com esse nome. Deseja sugerir a inclusão desse concurso?
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                <button
                                    onClick={() => {
                                        setSuggestionName(searchQuery);
                                        setIsSuggestionOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-sm font-bold rounded-xl"
                                >
                                    <Sparkles size={18} />
                                    Sugerir Edital
                                </button>
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="flex items-center gap-2 px-6 py-3 text-content-muted hover:text-foreground transition-all text-sm font-bold"
                                >
                                    Limpar busca
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-md mx-auto space-y-6 pt-12 text-center">
                            <div className="w-20 h-20 bg-secondary rounded-[32px] flex items-center justify-center mx-auto mb-6">
                                <Search className="text-content-muted/30" size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
                                    {filterCycle
                                        ? "Nenhum edital no ciclo atual"
                                        : (searchQuery || activeFilter !== 'all'
                                            ? "Nenhum edital encontrado"
                                            : "Sua biblioteca está vazia")}
                                </h2>
                                <p className="text-sm text-content-muted font-medium max-w-[280px] mx-auto leading-relaxed">
                                    {filterCycle
                                        ? "Você está visualizando apenas editais integrados ao seu ciclo. Desative o filtro de ciclo para ver todos."
                                        : "Tente ajustar os termos da busca ou os filtros de categoria acima."}
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setActiveFilter('all');
                                        setSearchQuery("");
                                        setFilterCycle(false);
                                    }}
                                    className="px-8 py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    Limpar Todos os Filtros
                                </button>
                                {pendingSuggestions.length > 0 && editais.length === 0 && (
                                    <button
                                        onClick={async () => {
                                            if (user?.id) {
                                                await discardPendingMergeSuggestions(user.id);
                                                setPendingSuggestions([]);
                                                toast.success("Sugestões órfãs limpas com sucesso.");
                                            }
                                        }}
                                        className="px-8 py-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-amber-500 hover:text-white transition-all"
                                    >
                                        Limpar Sugestões Antigas
                                    </button>
                                )}
                                {filterCycle && (
                                    <button
                                        onClick={() => setFilterCycle(false)}
                                        className="px-8 py-4 bg-secondary text-foreground text-xs font-black uppercase tracking-widest rounded-2xl border border-border hover:bg-secondary/80 transition-all"
                                    >
                                        Ver Biblioteca Completa
                                    </button>
                                )}
                            </div>
                        </div>

                    )}
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredEditais.map(edital => {
                        const metrics = getEditalMetrics(edital);
                        const daysLeft = getDaysUntilExam(edital.examDate);

                        const source = publicEditais.find(p => p.id === edital.sourceId);
                        const sourceTime = source ? new Date(source.updated_at).getTime() : 0;
                        const localCreatedTime = new Date(edital.createdAt).getTime();
                        const localUpdatedTime = edital.updatedAt ? new Date(edital.updatedAt).getTime() : localCreatedTime;

                        const hasRealUpdate = (() => {
                            if (!source) return false;

                            const sourceSubjects = source.subjects || [];
                            const localSubjectNames = new Set(
                                subjects
                                    .filter(s => (edital.subjectIds || []).includes(s.id))
                                    .map(s => (s.name || '').trim().toUpperCase())
                            );

                            // Verifica matérias novas no fonte
                            for (const ss of sourceSubjects) {
                                const ssName = (ss.name || '').trim().toUpperCase();
                                if (ssName && !localSubjectNames.has(ssName)) {
                                    return true;
                                }
                            }

                            // Verifica matérias locais que não existem no fonte
                            const localSubjectsOnly = subjects.filter(
                                s => (edital.subjectIds || []).includes(s.id)
                            );
                            for (const ls of localSubjectsOnly) {
                                const lsName = (ls.name || '').trim().toUpperCase();
                                if (lsName && !sourceSubjects.some(
                                    (ss: any) => (ss.name || '').trim().toUpperCase() === lsName
                                )) {
                                    return true;
                                }
                            }

                            // Verifica tópicos dentro de cada matéria
                            for (const ss of sourceSubjects) {
                                const ssName = (ss.name || '').trim().toUpperCase();
                                const localSubject = subjects.find(s => (s.name || '').trim().toUpperCase() === ssName);
                                if (!localSubject) continue;

                                const sourceTopics = ss.topics || [];
                                const localTopics = localSubject.topics || [];
                                const localTopicNames = new Set(
                                    (localTopics || []).map((t: any) => (t.name || '').trim().toUpperCase())
                                );

                                // Verifica tópicos novos no fonte
                                for (const st of sourceTopics) {
                                    const stName = (st.name || '').trim().toUpperCase();
                                    if (stName && !localTopicNames.has(stName)) {
                                        return true;
                                    }
                                }

                                // Verifica tópicos locais que não existem no fonte
                                for (const lt of (localTopics || [])) {
                                    const ltName = (lt.name || '').trim().toUpperCase();
                                    if (ltName && !sourceTopics.some(
                                        (st: any) => (st.name || '').trim().toUpperCase() === ltName
                                    )) {
                                        return true;
                                    }
                                }
                            }

                            return false;
                        })();

                        const hasUpdate = hasRealUpdate;

                        const editalSubjects = subjects.filter(s => (edital.subjectIds || []).includes(s.id));

                        return (
                            <div
                                key={edital.id}
                                id={`edital-${edital.id}`}
                                className="w-full"
                            >
                                <EditalCard
                                    key={edital.id}
                                    edital={edital}
                                    metrics={metrics}
                                    daysLeft={daysLeft}
                                    isSelected={selectedIds.has(edital.id)}
                                    onToggleSelect={() => toggleSelect(edital.id)}
                                    onViewSubjects={() => setSubjectsModal({ isOpen: true, edital })}
                                    onLoadCycle={() => handleLoadCycle(edital)}
                                    onUnloadCycle={() => setUnloadConfirm({ isOpen: true, edital })}
                                    onDelete={() => setDeleteConfirm({ isOpen: true, edital })}
                                    onSync={() => handleSyncEdital(edital)}
                                    onEdit={() => setEditModal({ isOpen: true, edital })}
                                    isProcessing={processingId === edital.id}
                                    processingProgress={processingId === edital.id ? removalProgress : undefined}
                                    hasUpdate={!!hasUpdate}
                                    isHighlighted={highlightedSourceId === edital.sourceId || highlightedSourceId === edital.id}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Slide-in Sugestão ── */}
            <AnimatePresence>
                {isSuggestionOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSuggestionOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card dark:bg-zinc-950 border-l border-border dark:border-white/10 z-[120] p-6 shadow-2xl overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center">
                                        <Sparkles className="text-primary" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground tracking-tight">Sugerir Edital</h2>
                                        <p className="text-xs text-content-muted font-medium">Solicite a inclusão de um concurso</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSuggestionOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary dark:bg-white/5 text-content-muted hover:text-foreground transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                                    <p className="text-xs text-primary/80 leading-relaxed">
                                        Basta informar o nome do edital/concurso que você deseja. Nossa equipe irá analisar e cadastrar o conteúdo programático no sistema.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-content-muted uppercase tracking-widest pl-1">
                                        Nome do Concurso/Edital
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: PC-ES 2024, INSS, Receita Federal..."
                                        value={suggestionName}
                                        onChange={(e) => setSuggestionName(e.target.value)}
                                        className="w-full h-12 bg-secondary dark:bg-white/5 border border-border dark:border-white/10 rounded-2xl px-4 text-sm text-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all"
                                        autoFocus
                                    />
                                </div>

                                <button
                                    onClick={handleSendSuggestion}
                                    disabled={!suggestionName.trim() || isSendingSuggestion}
                                    className="w-full h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    {isSendingSuggestion ? (
                                        <RefreshCw size={18} className="animate-spin" />
                                    ) : (
                                        <Send size={18} />
                                    )}
                                    Enviar Solicitação
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Modal de Importação ── */}
            <ImportEditalModal
                isOpen={isImportModalOpen}
                onClose={() => {
                    setIsImportModalOpen(false);
                }}
                initialTab={importModalTab}
                subjects={subjects}
                userEditais={editais}
                onImport={handleImportDone}
            />

            {/* ── Modal Ver Matérias ── */}
            {subjectsModal.edital && (
                <EditalSubjectsModal
                    isOpen={subjectsModal.isOpen}
                    onClose={() => setSubjectsModal({ isOpen: false, edital: null })}
                    edital={subjectsModal.edital}
                    editais={editais.filter(e => !e.mergedIntoCycle)}
                    allSubjects={subjects}
                    onUpdate={handleUpdateEdital}
                />
            )}

            {/* ── Confirm Delete Modal ── */}
            <AnimatePresence>
                {deleteConfirm.isOpen && deleteConfirm.edital && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirm({ isOpen: false, edital: null })}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-card border border-border rounded-[32px] p-8 shadow-2xl flex flex-col gap-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                    <Trash2 className="text-red-500" size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground tracking-tight">Excluir Edital?</h3>
                                    <p className="text-xs text-zinc-500 font-medium mt-0.5">
                                        Esta ação afetará suas matérias e progresso.
                                    </p>
                                </div>
                            </div>

                            <div className="text-zinc-400 text-sm leading-relaxed">
                                <p className="mb-4">Tem certeza que deseja excluir o edital <strong>"{deleteConfirm.edital.name}"</strong>?</p>

                                {deleteConfirm.edital.isImported ? (
                                    <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-xl text-sky-400 text-sm">
                                        <div className="flex items-start gap-3">
                                            <Info size={18} className="shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold uppercase text-[10px] tracking-widest mb-1">Edital Importado</p>
                                                <p className="opacity-90 leading-normal">
                                                    Este edital foi importado. Se você excluí-lo, poderá <strong>adicioná-lo novamente</strong> da biblioteca sem perda de dados históricos.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-sm">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold uppercase text-[10px] tracking-widest mb-1">Criação Manual</p>
                                                <p className="opacity-90 leading-normal">
                                                    Este edital foi criado manualmente. A exclusão é <strong>permanente</strong> e todos os registros vinculados serão removidos ("já era").
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 mt-2">
                                <button
                                    onClick={() => setDeleteConfirm({ isOpen: false, edital: null })}
                                    disabled={processingId === deleteConfirm.edital.id}
                                    className="flex-1 py-4 bg-secondary dark:bg-zinc-800 text-content-muted dark:text-zinc-400 font-bold rounded-2xl hover:bg-secondary/80 dark:hover:bg-zinc-700 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDeleteEdital(deleteConfirm.edital!)}
                                    disabled={processingId === deleteConfirm.edital.id}
                                    className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {processingId === deleteConfirm.edital.id ? (
                                        <RefreshCw size={16} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                    Confirmar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Confirm Unload Cycle Modal ── */}
            <AnimatePresence>
                {unloadConfirm.isOpen && unloadConfirm.edital && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setUnloadConfirm({ isOpen: false, edital: null })}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-[28px] p-8 shadow-2xl"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                    <Unlink className="text-sky-400" size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-content-main tracking-tight">Remover do Ciclo</h3>
                                    <p className="text-xs text-content-muted mt-0.5">
                                        As matérias deste edital deixarão de aparecer no seu ciclo de estudos.
                                    </p>
                                </div>
                            </div>
                            <div className="text-zinc-400 text-sm leading-relaxed mb-8">
                                Tem certeza que deseja remover o edital <strong>"{unloadConfirm.edital.name}"</strong> do seu ciclo atual?
                                <br /><br />
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 text-sm">
                                    <div className="flex items-start gap-3">
                                        <Info size={18} className="shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Informação importante:</p>
                                            <p className="mt-1 opacity-90">Seu progresso nos tópicos e histórico de revisões <strong>não serão perdidos</strong>. Você encontrará esses dados no Histórico Total.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        handleUnloadCycle(unloadConfirm.edital!);
                                        setUnloadConfirm({ isOpen: false, edital: null });
                                    }}
                                    className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                                >
                                    Remover
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {cycleConflict.isOpen && cycleConflict.edital && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                if (!isMerging && cycleConflict.step !== 'success') {
                                    setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null });
                                    setIsRecoveringMerge(false);
                                }
                            }}
                            className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-2xl bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-[28px] shadow-2xl p-7 flex flex-col gap-6 overflow-hidden"
                        >
                            {/* Overlay de Processamento com IA */}
                            {(isMerging || isAnalyzingTopics) && cycleConflict.step !== 'success' && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-background/90 backdrop-blur-md animate-in fade-in duration-300 rounded-[28px]">
                                    <div className="flex flex-col items-center gap-6 text-center max-w-[280px]">
                                        <div className="relative">
                                            <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                                            <div className="relative bg-emerald-500/10 p-5 rounded-full border border-emerald-500/20">
                                                <Loader2 size={32} className="text-emerald-500 animate-spin" />
                                            </div>
                                            <Merge size={16} className="absolute -bottom-1 -right-1 text-emerald-500 bg-background rounded-full p-0.5 border border-emerald-500/20" />
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-base font-black text-foreground uppercase tracking-tight leading-tight">
                                                {mergePhase === 'finalizing' ? 'Finalizando Mesclagem' : 'Processamento Inteligente'}
                                            </h3>
                                            <div className="flex flex-col gap-2">
                                                <p className="text-xs text-content-muted font-medium px-4">
                                                    {processingProgress?.message || "Analisando a compatibilidade..."}
                                                </p>
                                                <div className="flex justify-center mt-1">
                                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                                        {mergePhase === 'exact'
                                                            ? "Mapeamento Primário"
                                                            : mergePhase === 'finalizing'
                                                                ? "Gravando no Banco"
                                                                : "IA em Ação"
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden border border-border/50 relative">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-300 ease-out"
                                                style={{ width: `${processingProgress?.percentage ?? ((mergePhase === 'exact' ? 10 : 50))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Banner de Mesclagem Recuperada (Estilo Amber para consistência) */}
                            {isRecoveringMerge && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4 mb-2"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                                            <FileText size={18} className="text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-amber-800 dark:text-amber-300">
                                                Mesclagem recuperada
                                            </p>
                                            <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                                                Restauramos sua última análise · {new Date((cycleConflict as any).updatedAt).toLocaleString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (cycleConflict.edital) discardPendingMerge(cycleConflict.edital.id);
                                            setIsRecoveringMerge(false);
                                            setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null });
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-xl transition-all flex-shrink-0"
                                    >
                                        <Trash2 size={12} />
                                        Descartar
                                    </button>
                                </motion.div>
                            )}

                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cycleConflict.step === 'preview' || cycleConflict.step === 'topic-preview' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                        {cycleConflict.step === 'preview' || cycleConflict.step === 'topic-preview' ? (
                                            <CheckCircle2 className="text-emerald-400" size={24} />
                                        ) : (
                                            <AlertTriangle className="text-sky-400" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                                            {cycleConflict.existingIds.length === 0
                                                ? 'Novo Ciclo'
                                                : (cycleConflict.step === 'select' ? 'Carregar Ciclo' : (cycleConflict.step === 'success' ? 'Sucesso' : 'Confirmar Ação'))}
                                        </h3>
                                        <p className="text-xs text-content-muted font-medium">
                                            {cycleConflict.existingIds.length === 0
                                                ? 'Prepare seu novo ciclo de estudos'
                                                : (cycleConflict.step === 'select'
                                                    ? 'Escolha como carregar este edital'
                                                    : (cycleConflict.step === 'success' ? 'Operação finalizada' : `Revise como ficará seu ciclo ao ${cycleConflict.action === 'merge' ? 'mesclar' : 'substituir'}`))
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!isMerging && !isAnalyzingTopics && cycleConflict.step !== 'success') {
                                            setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null });
                                            setIsRecoveringMerge(false);
                                        }
                                    }}
                                    disabled={isMerging || isAnalyzingTopics || cycleConflict.step === 'success'}
                                    className="p-2 hover:bg-secondary dark:hover:bg-white/5 rounded-xl transition-colors text-content-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar relative min-h-[100px]">
                                {/* Seção: Ciclo Atual (SÓ MOSTRA NO PASSO 1 - SELECT) */}
                                {cycleConflict.step === 'select' && cycleConflict.existingIds.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black text-content-muted uppercase tracking-widest">ATUALMENTE NO CICLO</span>
                                            <span className="text-[10px] font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-md">
                                                {cycleConflict.existingIds.length} matérias
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            {cycleConflict.currentOrigins.map((origin, i) => {
                                                const isManual = (origin as any).isManual;
                                                const editalOrigin = isManual ? null : origin as UserEdital;

                                                const originSubjects = subjects.filter(s => {
                                                    if (!cycleConflict.existingIds.includes(s.id)) return false;
                                                    if (isManual) {
                                                        return !cycleConflict.currentOrigins.some(o => (o as any).id === s.edital_id);
                                                    }
                                                    return s.edital_id === editalOrigin?.id;
                                                });

                                                if (originSubjects.length === 0) return null;

                                                return (
                                                    <div key={i} className="p-3.5 rounded-2xl bg-sky-500/5 border border-sky-500/10 space-y-3">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-4 bg-sky-500 rounded-full" />
                                                                <span className="text-xs font-bold text-foreground uppercase tracking-tight">{origin.name}</span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {originSubjects.map(s => (
                                                                <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/50">
                                                                    <BookOpen size={12} className="text-sky-500/50" />
                                                                    <span className="text-xs font-bold text-foreground/80 truncate">{s.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Seção: Novo Edital (SÓ MOSTRA NO PASSO 1 - SELECT) */}
                                {cycleConflict.step === 'select' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">NOVO EDITAL SELECIONADO</span>
                                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                {cycleConflict.edital.subjectIds.length} matérias
                                            </span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                                    <span className="text-xs font-bold text-foreground uppercase tracking-tight">{cycleConflict.edital.name}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {cycleConflict.edital.subjectIds.slice(0, 10).map(sid => {
                                                    const s = loadedEditalSubjects.find(subj => subj.id === sid) || subjects.find(subj => subj.id === sid);
                                                    if (!s) return null;
                                                    return (
                                                        <div key={sid} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 transition-all">
                                                            <BookOpen size={12} className="text-emerald-500/50" />
                                                            <span className="text-[10px] font-bold text-emerald-600/90 dark:text-emerald-400/90 truncate uppercase">{s.name}</span>
                                                        </div>
                                                    );
                                                })}
                                                {cycleConflict.edital.subjectIds.length > 10 && (
                                                    <div className="flex items-center justify-center px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 border-dashed">
                                                        <span className="text-[9px] font-bold text-emerald-600/50 uppercase tracking-widest">+{cycleConflict.edital.subjectIds.length - 10} matérias</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Seção: Resultado (Preview) - SÓ MOSTRA SE FOR PREVIEW */}
                                {cycleConflict.step === 'preview' && (
                                    <div className="space-y-4 py-2">
                                        <div className="flex flex-col gap-1 px-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">
                                                    {cycleConflict.existingIds.length === 0
                                                        ? 'CONFIGURAÇÃO DO NOVO CICLO'
                                                        : (cycleConflict.action === 'merge' ? 'PREVIEW APÓS A MESCLA' : 'PREVIEW DO NOVO CICLO')}
                                                </span>
                                                <span className="text-[10px] font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-md">
                                                    {finalPreviewIds.length} matérias no total
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-content-muted italic leading-relaxed">
                                                {cycleConflict.existingIds.length === 0
                                                    ? 'As matérias abaixo serão adicionadas ao seu novo ciclo.'
                                                    : (cycleConflict.action === 'merge'
                                                        ? 'As matérias com mesmo nome serão unificadas para preservar seu progresso.'
                                                        : 'Seu ciclo atual será removido e substituído por este edital.')}
                                            </p>
                                        </div>

                                        <div className="relative p-4 rounded-2xl bg-secondary dark:bg-zinc-800/30 border border-border dark:border-white/5 space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                                            <div className="flex flex-col gap-2">
                                                {(cycleConflict.action === 'merge' || cycleConflict.action === 'hybrid') && cycleConflict.unificationMap ? (
                                                    [
                                                        ...(cycleConflict.unificationMap.unifiedSubjects || []).map(us => ({ ...us, type: 'unified' as const })),
                                                        ...subjects.filter(s => cycleConflict.unificationMap?.standaloneSubjectIds.includes(s.id)).map(s => ({
                                                            displayName: s.name,
                                                            originalSubjectIds: [s.id],
                                                            type: 'standalone' as const
                                                        }))
                                                    ].sort((a, b) => a.displayName.localeCompare(b.displayName)).map((item) => {
                                                        const isUnified = item.type === 'unified';
                                                        const primaryId = item.originalSubjectIds[0];
                                                        const overrideValue = cycleConflict.subjectDisplayNameOverrides?.[primaryId] ?? (('displayNameOverride' in item ? item.displayNameOverride : null) || item.displayName);
                                                        const isExpanded = expandedPreviewSubjects.has(primaryId);

                                                        return (
                                                            <div
                                                                key={primaryId}
                                                                className={`flex flex-col rounded-2xl border transition-all ${isUnified
                                                                        ? 'bg-emerald-500/[0.04] border-emerald-500/20 shadow-sm shadow-emerald-500/5'
                                                                        : 'bg-zinc-500/[0.03] border-zinc-500/10'
                                                                    }`}
                                                            >
                                                                <div
                                                                    className="flex items-center justify-between gap-3 p-3 cursor-pointer select-none"
                                                                    onClick={() => togglePreviewSubjectExpansion(primaryId)}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                        <div className={`p-1.5 rounded-lg shrink-0 ${isUnified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'
                                                                            }`}>
                                                                            <BookOpen size={14} />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-foreground uppercase tracking-wide truncate">
                                                                            {overrideValue}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${isUnified ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                                                            }`}>
                                                                            {isUnified ? 'MESCLADO' : 'MANTIDO'}
                                                                        </span>
                                                                        <div className="text-content-muted/40 transition-transform duration-200">
                                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <AnimatePresence>
                                                                    {isExpanded && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            className="overflow-hidden"
                                                                        >
                                                                            <div className="px-3 pb-3 pt-0 space-y-2 border-t border-border/10 mt-1">
                                                                                <p className="text-[10px] font-black text-content-muted/60 uppercase tracking-widest mt-2 px-1">Fonte da Matéria</p>
                                                                                <div className="flex flex-col gap-1.5">
                                                                                    {item.originalSubjectIds.map(sid => {
                                                                                        const s = subjects.find(sub => sub.id === sid);
                                                                                        const edId = s?.edital_id;
                                                                                        const ed = editais.find(e => e.id === edId);
                                                                                        return (
                                                                                            <div key={sid} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-background/50 border border-border/50">
                                                                                                <FileText size={10} className="text-content-muted/40" />
                                                                                                <span className="text-[10px] font-bold text-content-muted uppercase tracking-tight">
                                                                                                    {ed?.name || 'Matéria Existente'}
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    subjects.filter(s => finalPreviewIds.includes(s.id)).map(s => {
                                                        const isNew = cycleConflict.edital?.subjectIds.includes(s.id);
                                                        const isCurrent = cycleConflict.existingIds.includes(s.id);

                                                        let cardStyle = 'bg-zinc-500/[0.03] border-zinc-500/10';
                                                        let badgeStyle = 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
                                                        let label = 'MANTIDO';

                                                        if (cycleConflict.action === 'replace') {
                                                            if (isNew && !isCurrent) {
                                                                cardStyle = 'bg-emerald-500/[0.04] border-emerald-500/20';
                                                                badgeStyle = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                                                                label = 'NOVO';
                                                            } else if (!isNew && isCurrent) {
                                                                cardStyle = 'bg-red-500/[0.02] border-red-500/10 opacity-40 grayscale';
                                                                badgeStyle = 'bg-red-500/10 text-red-500 border-red-500/20';
                                                                label = 'REMOVIDO';
                                                            }
                                                        }

                                                        return (
                                                            <div key={s.id} className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${cardStyle}`}>
                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                    <div className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-500 shrink-0">
                                                                        <BookOpen size={14} />
                                                                    </div>
                                                                    <span className="text-sm font-bold text-foreground uppercase tracking-wide truncate">
                                                                        {s.name}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${badgeStyle}`}>
                                                                    {label}
                                                                </span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Seção: Topic Preview (Etapa 2 - IA) */}
                                {cycleConflict.step === 'topic-preview' && cycleConflict.topicMergeResult && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">PRÉVIA DA UNIFICAÇÃO DE TÓPICOS (IA)</span>
                                                <p className="text-[10px] text-content-muted italic">Confira abaixo como a IA unificou os tópicos equivalentes.</p>
                                            </div>

                                            {/* Switcher de Visualização */}
                                            {pendingSuggestions.length > 0 && (
                                                <div className="flex items-center p-1 bg-black/10 dark:bg-white/5 rounded-xl border border-white/5">
                                                    <button
                                                        onClick={() => setCycleConflict(prev => ({ ...prev, showIASuggestionsOnly: false }))}
                                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${!cycleConflict.showIASuggestionsOnly
                                                                ? 'bg-white dark:bg-zinc-700 text-foreground shadow-sm'
                                                                : 'text-content-muted hover:text-foreground'
                                                            }`}
                                                    >
                                                        Todos
                                                    </button>
                                                    <button
                                                        onClick={() => setCycleConflict(prev => ({ ...prev, showIASuggestionsOnly: true }))}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${cycleConflict.showIASuggestionsOnly
                                                                ? 'bg-amber-500 text-white shadow-sm'
                                                                : 'text-content-muted hover:text-amber-500'
                                                            }`}
                                                    >
                                                        <Sparkles size={10} className={cycleConflict.showIASuggestionsOnly ? 'text-white' : 'text-amber-500'} />
                                                        Sugestões ({pendingSuggestions.length})
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 rounded-3xl bg-secondary dark:bg-zinc-800/30 border border-border dark:border-white/5 space-y-4 max-h-[45vh] overflow-y-auto no-scrollbar">
                                            {cycleConflict.showIASuggestionsOnly ? (
                                                <CompactMergeSuggestionList
                                                    suggestions={pendingSuggestions}
                                                    onApprove={handleApproveSuggestion}
                                                    onReject={handleRejectSuggestion}
                                                    disabled={isLoadingSuggestions}
                                                />
                                            ) : (
                                                cycleConflict.topicMergeResult.groups.map(group => {
                                                    const primaryId = group.originalSubjectIds[0];
                                                    const isExpanded = expandedPreviewSubjects.has(primaryId);

                                                    return (
                                                        <div key={group.subjectDisplayName} className="space-y-2">
                                                            <div
                                                                className="flex items-center justify-between gap-3 p-1.5 cursor-pointer select-none hover:bg-white/5 rounded-xl transition-colors group"
                                                                onClick={() => togglePreviewSubjectExpansion(primaryId)}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Library size={12} className="text-emerald-500" />
                                                                    <span className="text-xs font-black uppercase tracking-widest text-foreground/80 group-hover:text-emerald-400 transition-colors">
                                                                        {group.subjectDisplayName}
                                                                    </span>
                                                                </div>
                                                                <div className="text-content-muted/40 transition-transform duration-200">
                                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <div className="grid grid-cols-1 gap-1.5 pl-5 pb-1">
                                                                            {group.topicMappings.map((tm, i) => (
                                                                                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border/20">
                                                                                    <span className="text-[10px] text-foreground/80 font-medium truncate">{tm.displayName}</span>
                                                                                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${tm.originalTopicIds.length > 1 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-500/10 text-content-muted border-zinc-500/10'
                                                                                        }`}>
                                                                                        {tm.originalTopicIds.length > 1 ? 'UNIFICADO' : 'MANTIDO'}
                                                                                    </span>
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
                                )}


                                {/* Ações do Modal */}
                                <div className="space-y-3 pt-2">
                                    {cycleConflict.step === 'select' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <button
                                                onClick={handleHybridPreview}
                                                disabled={isMerging}
                                                className="flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all group disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {isMerging ? <Loader2 size={18} className="animate-spin" /> : <Merge size={18} />}
                                                    <span className="text-sm font-black uppercase tracking-wider">Mesclar</span>
                                                </div>
                                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                            <button
                                                onClick={() => setCycleConflict(prev => ({ ...prev, step: 'preview', action: 'replace' }))}
                                                className="flex items-center justify-between px-5 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <RefreshCw size={18} />
                                                    <span className="text-sm font-black uppercase tracking-wider">Substituir</span>
                                                </div>
                                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    ) : cycleConflict.step === 'preview' ? (
                                        <div className="flex flex-col gap-3">
                                            {cycleConflict.action === 'merge' && (
                                                <>
                                                    <button
                                                        onClick={() => handleTopicPreview(true)}
                                                        disabled={isMerging || isAnalyzingTopics}
                                                        className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all group disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isAnalyzingTopics ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                                            <span className="text-sm font-black uppercase tracking-wider">Mesclar Tópicos com IA</span>
                                                        </div>
                                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCycleConflictAction('merge')}
                                                        disabled={isMerging || processingId === cycleConflict.edital!.id}
                                                        className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 hover:bg-sky-500 hover:text-white transition-all group disabled:opacity-50"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {processingId === cycleConflict.edital!.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                                            <span className="text-sm font-black uppercase tracking-wider">Mesclar matérias (Mais Rápido)</span>
                                                        </div>
                                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                </>
                                            )}
                                            {cycleConflict.action !== 'merge' && (
                                                <button
                                                    onClick={() => handleCycleConflictAction(cycleConflict.action!)}
                                                    disabled={processingId === cycleConflict.edital!.id}
                                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                                >
                                                    {processingId === cycleConflict.edital!.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                                    {cycleConflict.existingIds.length === 0 ? 'Criar Ciclo de Estudos' : 'Confirmar Substituição'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setCycleConflict(prev => ({ ...prev, step: 'select', action: null }))}
                                                disabled={isMerging || isAnalyzingTopics}
                                                className="w-full py-3 text-xs font-bold text-content-muted hover:text-foreground transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isMerging || isAnalyzingTopics ? 'Processando...' : '← Voltar e Alterar Escolha'}
                                            </button>
                                        </div>
                                    ) : cycleConflict.step === 'success' ? (
                                        <div className="flex flex-col items-center gap-6 py-4 animate-in zoom-in-95 duration-300">
                                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                                <CheckCircle2 size={32} className="text-emerald-500" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Mesclagem Concluída!</h4>
                                                <p className="text-xs text-content-muted max-w-[280px]">
                                                    Seu ciclo de estudos foi atualizado com sucesso. Todas as matérias e tópicos já estão disponíveis.
                                                </p>
                                            </div>

                                            <div className="w-full bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/10 space-y-5">
                                                <div className="flex items-center justify-between text-[11px] uppercase font-black tracking-[0.2em] text-emerald-500/70 border-b border-emerald-500/10 pb-4">
                                                    <span>Resumo da Operação</span>
                                                    <Sparkles size={12} className="text-emerald-500" />
                                                </div>

                                                <div className="space-y-5">
                                                    {/* Identificação Principal */}
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] text-content-muted uppercase font-bold tracking-wider">Edital Adicionado</span>
                                                        <h5 className="text-lg font-black text-foreground uppercase tracking-tight leading-tight">
                                                            {cycleConflict.edital?.name}
                                                        </h5>
                                                        <div className="flex gap-4 mt-2">
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/10">
                                                                <Target size={12} className="text-emerald-500" />
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                                                                    {cycleConflict.edital?.position || 'Cargo não definido'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-foreground/5 rounded-md border border-foreground/5">
                                                                <CalendarDays size={12} className="text-content-muted" />
                                                                <span className="text-[10px] font-black text-content-muted uppercase tracking-tighter">
                                                                    {cycleConflict.edital?.examDate
                                                                        ? new Date(cycleConflict.edital.examDate).toLocaleDateString('pt-BR')
                                                                        : 'Prova: A definir'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Métricas Comparativas */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-3 bg-white/5 rounded-xl p-4 border border-white/5">
                                                            <div className="text-[10px] text-content-muted uppercase font-black tracking-widest border-b border-white/5 pb-2">
                                                                Neste Edital
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-2xl font-black text-foreground">{cycleConflict.edital?.subjectIds.length || 0}</span>
                                                                    <span className="text-[10px] text-content-muted font-bold uppercase tracking-tighter">Matérias</span>
                                                                </div>
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-xl font-black text-emerald-500/80">
                                                                        {loadedEditalSubjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0)}
                                                                    </span>
                                                                    <span className="text-[10px] text-content-muted font-bold uppercase tracking-tighter">Tópicos</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3 bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/10">
                                                            <div className="text-[10px] text-emerald-600 uppercase font-black tracking-widest border-b border-emerald-500/10 pb-2">
                                                                Total no Ciclo
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-2xl font-black text-foreground">
                                                                        {cycleConflict.hybridResult?.stats.totalSubjectsInCycle || (cycleConflict.edital?.subjectIds.length || 0)}
                                                                    </span>
                                                                    <span className="text-[10px] text-content-muted font-bold uppercase tracking-tighter">Matérias</span>
                                                                </div>
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className="text-xl font-black text-emerald-500">
                                                                        {/* Somar tópicos de todas as matérias que estão no ciclo final */}
                                                                        {subjects
                                                                            .filter(s => (cycleConflict.finalSubjectIds || cycleConflict.edital?.subjectIds || []).includes(s.id))
                                                                            .reduce((acc, s) => acc + (s.topics?.length || 0), 0)
                                                                            // Se o ciclo for novo, subjects pode não ter os novos temas ainda, então pegamos o maior valor
                                                                            || loadedEditalSubjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0)
                                                                        }
                                                                    </span>
                                                                    <span className="text-[10px] text-content-muted font-bold uppercase tracking-tighter">Tópicos</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Composição do Ciclo */}
                                                    <div className="space-y-2">
                                                        <span className="text-[10px] text-content-muted uppercase font-black tracking-widest block">Editais no Ciclo:</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-tight shadow-sm shadow-emerald-500/20">
                                                                {cycleConflict.edital?.organ || cycleConflict.edital?.name.split(' - ')[0]} (Atual)
                                                            </span>

                                                            {cycleConflict.currentOrigins.map((o: any) => {
                                                                if ('isManual' in o) {
                                                                    return (
                                                                        <span key="manual" className="px-2.5 py-1 bg-amber-500/10 rounded-lg text-[9px] font-black text-amber-600 border border-amber-500/10 uppercase tracking-tight">
                                                                            Matérias Avulsas
                                                                        </span>
                                                                    );
                                                                }
                                                                if (o.id === cycleConflict.edital?.id) return null;
                                                                return (
                                                                    <span key={o.id} className="px-2.5 py-1 bg-emerald-500/10 rounded-lg text-[9px] font-black text-emerald-600 border border-emerald-500/10 uppercase tracking-tight">
                                                                        {o.organ || o.name.split(' - ')[0]}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null, showIASuggestionsOnly: false })}
                                                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                                            >
                                                Finalizar e Ver Ciclo
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={() => handleCycleConflictAction('merge')}
                                                disabled={processingId === cycleConflict.edital!.id}
                                                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                            >
                                                {processingId === cycleConflict.edital!.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                                Confirmar Mesclagem Completa
                                            </button>
                                            <div className="flex flex-col items-center gap-2">
                                                <button
                                                    onClick={() => setCycleConflict(prev => ({ ...prev, step: 'preview', topicMergeResult: undefined }))}
                                                    disabled={isMerging || isAnalyzingTopics}
                                                    className="w-full py-2 text-xs font-bold text-content-muted hover:text-foreground transition-colors uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isMerging || isAnalyzingTopics ? 'Processando...' : '← Voltar para Matérias'}
                                                </button>
                                                <p className="text-[9px] text-content-muted/60 text-center leading-tight">
                                                    Você pode voltar e mesclar somente matérias,<br />
                                                    e posteriormente mesclar manualmente os tópicos.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            {/* ── Modal de Revisão de Sincronização ── */}
            {syncReview.isOpen && syncReview.edital && (
                <SyncReviewModal
                    isOpen={syncReview.isOpen}
                    onClose={() => setSyncReview(prev => ({ ...prev, isOpen: false }))}
                    onApply={applySyncChanges}
                    localSubjects={syncReview.localSubjects}
                    sourceSubjects={syncReview.sourceSubjects}
                    editalName={syncReview.edital.name}
                />
            )}

            <EditEditalModal
                isOpen={editModal.isOpen}
                onClose={() => setEditModal({ isOpen: false, edital: null })}
                edital={editModal.edital}
                onSave={handleSaveEdital}
            />
        </div>
    );
};

export default Editais;
