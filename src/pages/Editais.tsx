import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
    Search, Plus, PlusCircle, Library, Trash2, Play, Eye, CalendarDays, Clock, LayoutGrid,
    BookOpen, AlertTriangle, Merge, Unlink, X, CheckCircle2, RefreshCw, ArrowRight, Sparkles, Send, Loader2,
    AlertCircle, Info, GraduationCap, Target, Database, ChevronDown, ChevronLeft, ChevronUp, ChevronRight, Link, FileText
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
    const [subjectsModal, setSubjectsModal] = useState<{ 
        isOpen: boolean; 
        edital: UserEdital | null;
        initialExpandedSubjectId?: string;
    }>({ isOpen: false, edital: null });
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
        wasTopicMerged?: boolean;
        showDetailedPreview?: boolean;
    }>({
        isOpen: false,
        edital: null,
        existingIds: [],
        currentOrigins: [],
        step: 'select',
        action: null,
        showIASuggestionsOnly: false,
        showDetailedPreview: false
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
    const [dataLoaded, setDataLoaded] = useState(false);

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
        // Usar uma flag temporária para evitar re-execução indesejada ao mudar o array de editais
        const state = location.state;
        if (!state) return;

        if (state.openImportModal) {
            setIsImportModalOpen(true);
            if (state.importTab) {
                setImportModalTab(state.importTab);
            }
        }
        
        // Abre modal de matérias de um edital específico
        if (state.openEditalId && editais.length > 0) {
            const targetEdital = editais.find(e => e.id === state.openEditalId);
            if (targetEdital) {
                setSubjectsModal({ 
                    isOpen: true, 
                    edital: targetEdital,
                    initialExpandedSubjectId: state.highlightSubjectId 
                });
            }
        }

        if (state.filterCycle) {
            setFilterCycle(true);
        }

        // Limpa o estado imediatamente para não disparar novamente
        window.history.replaceState({}, document.title);
    }, [location.state, editais.length > 0]); // Só re-executa se o estado mudar ou se os editais carregarem pela primeira vez


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
            setDataLoaded(true);
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

            // 4. Sincronizar Ciclo e Limpar Merges antes da deleção física
            // Isso garante que o array ciclo_atual seja limpo e as flags dos editais remanescentes auditadas.
            await mergeService.syncCycleAfterRemoval(user!.id, edital.id);
            await mergeService.cleanupMergesAfterEditalRemoval(user!.id, edital.id);

            if (edital.mergedIntoCycle) {
                await discardPendingMerge('all');
            }

            // Limpa sugestões pendentes de mesclagem (IA/Semântica) para o usuário
            await discardPendingMergeSuggestions(user!.id);
            setPendingSuggestions([]);


            // 5. DELEÇÃO FÍSICA ÚNICA
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

            // ─── 6. ATOMIC UNLOAD: Atualizar edital + deletar ciclo se último ───
            const { data: rpcResult, error: rpcErr } = await supabase.rpc('atomic_cycle_unload_or_delete', {
                p_user_id: user.id,
                p_edital_id: edital.id
            });

            if (rpcErr) throw rpcErr;
            if (rpcResult && (rpcResult as any).ok === false) throw new Error((rpcResult as any).error);

            const cycleWasDeleted = (rpcResult as any)?.cycle_deleted === true;
            console.log('[Editais] Unload atômico:', { cycleWasDeleted, result: rpcResult });

            // ─── 7. Invalidar rascunhos (O baseline do ciclo mudou) ───
            await discardPendingMerge('all');

            setEditais(prev => prev.map(e =>
                e.id === edital.id
                    ? { ...e, mergedIntoCycle: false, activeSubjectIds: [] }
                    : e
            ));

            const msg = cycleWasDeleted
                ? `"${edital.name}" removido. Ciclo de estudos encerrado (sem editais ativos).`
                : `"${edital.name}" removido do ciclo.`;
            toast.success(msg);
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
                step: 'select',
                action: realExistingIdsInCycle.length > 0 ? null : 'replace',
                showDetailedPreview: realExistingIdsInCycle.length === 0
            });
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'loadCycle', userMessage: 'Erro ao preparar carga do ciclo.' });
        } finally {
            setProcessingId(null);
        }
    }, [user, editais, subjects, pendingMerges]);


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

        // OTIMIZAÇÃO: Se já temos o resultado da mesclagem híbrida, não reprocessamos
        if (cycleConflict.hybridResult && cycleConflict.step === 'select') {
            setCycleConflict(prev => ({ ...prev, step: 'preview', action: 'merge' }));
            return;
        }

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

        // OTIMIZAÇÃO: Se já temos o resultado dos tópicos, não reprocessamos
        if (cycleConflict.topicMergeResult && cycleConflict.step === 'preview') {
            setCycleConflict(prev => ({ ...prev, step: 'topic-preview' }));
            return;
        }

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
        // IMPORTANTE: Só usamos o resultado de tópicos se a ação for chamada explicitamente a partir do ultimo passo (topic-preview)
        let currentUnificationMap = cycleConflict.unificationMap;
        if (cycleConflict.step === 'topic-preview' && cycleConflict.topicMergeResult && cycleConflict.unificationMap) {
            currentUnificationMap = applyTopicMergeToMap(cycleConflict.unificationMap, cycleConflict.topicMergeResult);
        }

        setIsMerging(true);
        setMergePhase('finalizing');
        setProcessingProgress({ message: 'Preparando unificação...', percentage: 5 });

        try {
            let finalIdsToLoad: string[] = [];
            let oldEditalIds: string[] = [];

            if (action === 'replace') {
                // Identificar editais que serão removidos do ciclo
                const oldMerged = editais.filter(e => e.mergedIntoCycle && e.id !== edital.id);
                oldEditalIds = oldMerged.map(e => e.id);
                finalIdsToLoad = edital.subjectIds;

                // Limpar data da prova ao substituir ciclo
                await supabase
                    .from('user_settings')
                    .update({ data_prova_meta: null } as any)
                    .eq('user_id', user.id);

                setProcessingProgress({ message: 'Iniciando substituição...', percentage: 20 });
            } else {
                // Se já temos o mapa calculado da prévia, usamos (agora já atualizado pelos tópicos logo acima). Senão (fallback), calculamos.
                let unificationMap = currentUnificationMap || cycleConflict.hybridResult?.unificationMap;
                let finalSubjectIdsFromMap = cycleConflict.finalSubjectIds || cycleConflict.hybridResult?.finalSubjectIds;
                let result: HybridMergeResult | null = cycleConflict.hybridResult || null;

                if (!unificationMap || !finalSubjectIdsFromMap) {
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
                    finalSubjectIdsFromMap = resultData.finalSubjectIds;
                    result = resultData;
                }

                // 1. Aplicar unificação física (Soft Merge) no banco de dados
                setProcessingProgress({ message: 'Salvando estrutura de matérias...', percentage: 30 });
                await persistPhysicalSoftMerge(unificationMap);

                // 2. Persistir o mapa de unificação no registro do ciclo (para UI)
                setProcessingProgress({ message: 'Unificando tópicos no banco...', percentage: 60 });
                await saveUnificationMap(user.id, unificationMap);

                // 3. Salvar mesclagens nas tabelas dedicated (subject_merges e topic_merges)
                try {
                    const { data: cycleData } = await (supabase as any)
                        .from('user_cycles')
                        .select('id')
                        .eq('user_id', user.id)
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

                finalIdsToLoad = finalSubjectIdsFromMap!;
            }

            // ATOMIC LOAD: Garantir que o ciclo e o status do edital mudem juntos
            setProcessingProgress({ message: 'Finalizando carga atômica...', percentage: 90 });
            
            const { data: rpcData, error: rpcError } = await supabase.rpc('atomic_cycle_load', {
                p_user_id: user.id,
                p_new_edital_id: edital.id,
                p_new_subject_ids: finalIdsToLoad,
                p_old_edital_ids: oldEditalIds,
                p_mode: action === 'replace' ? 'replace' : 'merge'
            });

            if (rpcError) throw rpcError;
            if (rpcData && (rpcData as any).ok === false) throw new Error((rpcData as any).error);

            // Sincronizar estado local de editais para evitar disparidade na UI
            setEditais(prev => prev.map(e => {
                if (e.id === edital.id) return { ...e, mergedIntoCycle: true, activeSubjectIds: finalIdsToLoad };
                if (oldEditalIds.includes(e.id)) return { ...e, mergedIntoCycle: false, activeSubjectIds: [] };
                return e;
            }));

            // Notificações e Transição de Tela
            if (action === 'replace') {
                toast.success(`Ciclo substituído com sucesso por "${edital.name}".`);
            } else {
                const currentStats = cycleConflict.hybridResult?.stats;
                const totalNew = currentStats ? (currentStats.totalSubjectsInCycle - cycleConflict.existingIds.length) : 0;
                toast.success(`Mesclagem concluída! ${totalNew > 0 ? `${totalNew} nova(s) matéria(s) adicionadas.` : 'Estrutura atualizada.'}`);
            }

            // Se a ação foi concluída com sucesso, descartar persistência
            // Como o ciclo mudou, invalidamos TODOS os rascunhos para garantir integridade
            await discardPendingMerge('all');

            // Envia evento de atualização
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'merge_completed' } }));

            // Mudar para tela de sucesso em vez de fechar
            setCycleConflict(prev => ({ ...prev, step: 'success', wasTopicMerged: prev.step === 'topic-preview' }));

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
    }, [cycleConflict, editais, fetchEditais, refreshData, user, subjects, discardPendingMerge, persistPhysicalSoftMerge, saveUnificationMap]);

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
    if (isLoading || loadingEditais || !dataLoaded) return <LoadingSpinner size="large" showText fullPage />;

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
                                    placeholder="Buscar matriz..."
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
                                NOVA MATRIZ
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
                                    Mostrando matrizes do ciclo
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
                            Você tem matrizes cadastradas, mas nenhuma está carregada no seu ciclo ativo de estudos.
                        </p>
                        <p className="text-[10px] font-medium opacity-80">
                            Clique em <span className="font-bold">"Carregar Ciclo"</span> em um edital abaixo para começar seu planejamento inteligente!
                        </p>
                    </div>
                </motion.div>
            )}

            {/* ── Grid de Cards / Empty State ── */}
            {dataLoaded && filteredEditais.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center text-center py-20 px-8 relative"
                >
                    {editais.length === 0 ? (
                        isImportModalOpen ? (
                            <div className="w-full text-left">
                                <ImportEditalModal
                                    isOpen={isImportModalOpen}
                                    onClose={() => setIsImportModalOpen(false)}
                                    initialTab={importModalTab}
                                    subjects={subjects}
                                    userEditais={editais}
                                    onImport={handleImportDone}
                                    isFirstAccess={true}
                                    inlineMode={true}
                                />
                            </div>
                        ) : (
                            <div className="max-w-5xl mx-auto w-full space-y-12">
                                <div className="text-center space-y-3">
                                    <h1 className="text-3xl font-semibold text-white tracking-tight">
                                        Você ainda não possui nenhum Edital ativo
                                    </h1>
                                    <p className="text-content-muted text-base">
                                        Escolha uma das opções abaixo para configurar sua preparação.
                                    </p>
                                </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                {/* Card 1: Catálogo Oficial */}
                                <motion.button
                                    whileHover={{ y: -4 }}
                                    onClick={() => {
                                        setImportModalTab('ready');
                                        setIsImportModalOpen(true);
                                    }}
                                    className="relative flex flex-col items-center text-center p-8 bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-cyan-500/50 rounded-[32px] transition-all group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute top-4 right-4 bg-cyan-400 text-black text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wider">
                                        RECOMENDADO
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-6 text-cyan-400 group-hover:scale-110 transition-transform">
                                        <Library size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">Catálogo Oficial</h3>
                                    <p className="text-sm text-content-muted font-medium leading-relaxed">
                                        Acesse editais já mapeados e organizados pela nossa equipe.
                                    </p>
                                </motion.button>

                                {/* Card 2: Importar Edital com IA */}
                                <motion.button
                                    whileHover={{ y: -4 }}
                                    onClick={() => {
                                        setImportModalTab('ia');
                                        setIsImportModalOpen(true);
                                    }}
                                    className="relative flex flex-col items-center text-center p-8 bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-emerald-500/50 rounded-[32px] transition-all group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
                                        <Sparkles size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">Importar Edital com IA</h3>
                                    <p className="text-sm text-content-muted font-medium leading-relaxed">
                                        Suba o PDF do seu edital e deixe nossa IA organizar os tópicos para você automaticamente.
                                    </p>
                                </motion.button>

                                {/* Card 3: Criar Manualmente */}
                                <motion.button
                                    whileHover={{ y: -4 }}
                                    onClick={() => {
                                        setImportModalTab('manual');
                                        setIsImportModalOpen(true);
                                    }}
                                    className="relative flex flex-col items-center text-center p-8 bg-zinc-900/50 backdrop-blur-md border border-white/5 hover:border-amber-500/50 rounded-[32px] transition-all group overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 transition-transform">
                                        <Plus size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">Criar Manualmente</h3>
                                    <p className="text-sm text-content-muted font-medium leading-relaxed">
                                        Para editais específicos ou personalizados. Tenha controle total sobre cada matéria e assunto.
                                    </p>
                                </motion.button>
                            </div>
                        </div>
                        )
                    ) : searchQuery.trim() ? (
                        <div className="max-w-md mx-auto space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
                                    Nenhum resultado para "{searchQuery}"
                                </h2>
                                <p className="text-sm text-content-muted font-medium">
                                    Não encontramos nenhuma matriz nos seus registros com esse nome. Deseja sugerir a inclusão desse concurso?
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
                                    Sugerir Matriz
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
                                        ? "Nenhuma matriz no ciclo atual"
                                        : (searchQuery || activeFilter !== 'all'
                                            ? "Nenhuma matriz encontrada"
                                            : "Sua biblioteca está vazia")}
                                </h2>
                                <p className="text-sm text-content-muted font-medium max-w-[280px] mx-auto leading-relaxed">
                                    {filterCycle
                                        ? "Você está visualizando apenas matrizes integradas ao seu ciclo. Desative o filtro de ciclo para ver todos."
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
            {editais.length > 0 && (
                <ImportEditalModal
                    isOpen={isImportModalOpen}
                    onClose={() => {
                        setIsImportModalOpen(false);
                    }}
                    initialTab={importModalTab}
                    subjects={subjects}
                    userEditais={editais}
                    onImport={handleImportDone}
                    isFirstAccess={false}
                />
            )}

            {/* ── Modal Ver Matérias ── */}
            {subjectsModal.edital && (
                <EditalSubjectsModal
                    isOpen={subjectsModal.isOpen}
                    onClose={() => setSubjectsModal({ isOpen: false, edital: null })}
                    edital={subjectsModal.edital}
                    editais={editais.filter(e => !e.mergedIntoCycle)}
                    allSubjects={subjects}
                    onUpdate={handleUpdateEdital}
                    initialExpandedSubjectId={subjectsModal.initialExpandedSubjectId}
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
                            className="relative w-full max-w-md bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-[32px] p-8 shadow-2xl flex flex-col gap-6"
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
                            className="relative w-full max-w-md bg-white dark:bg-[#18181A] border border-zinc-200 dark:border-white/[0.08] rounded-[32px] p-8 shadow-2xl"
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
                    <>
                    {/* Backdrop - Ocupando a tela INTEIRA com prioridade máxima */}
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
                        className="fixed inset-0 z-[999] bg-black/40 dark:bg-black/90 backdrop-blur-md"
                    />
                    {/* Container de posicionamento com margem fixa de ~1cm (16px) */}
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-4xl bg-white dark:bg-[#18181B] border border-zinc-200 dark:border-white/[0.08] rounded-[32px] shadow-2xl shadow-black/50 flex flex-col overflow-hidden pointer-events-auto" style={{ maxHeight: 'calc(100vh - 32px)' }}
                        >
                            {/* Efeito de Profundidade Sutil */}
                            <div className="absolute inset-0 pointer-events-none border border-white/[0.03] rounded-[32px]" />
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

                            {/* Header - Espaçamento Interno Lateral 2cm (px-8), Vertical 1cm (py-4) */}
                            <div className="px-8 pt-4 pb-4 border-b border-white/[0.08] flex items-start justify-between bg-white dark:bg-[#18181B] sticky top-0 z-[60]">
                                <div className="flex flex-col gap-1.5 focus:outline-none">
                                    <div className="flex items-center gap-3">
                                        {/* Navegação Rápida < > */}
                                        {cycleConflict.existingIds.length > 0 && cycleConflict.step !== 'success' && (
                                            <div className="flex items-center bg-white/5 dark:bg-white/5 p-0.5 rounded-lg border border-white/10 mr-1 shadow-sm">
                                                <button
                                                    onClick={() => {
                                                        if (cycleConflict.step === 'preview') setCycleConflict(prev => ({ ...prev, step: 'select', action: null }));
                                                        else if (cycleConflict.step === 'topic-preview') setCycleConflict(prev => ({ ...prev, step: 'preview' }));
                                                    }}
                                                    disabled={cycleConflict.step === 'select' || isMerging || isAnalyzingTopics}
                                                    className="p-1.5 hover:bg-white/10 dark:hover:bg-white/10 disabled:opacity-20 rounded-md transition-all text-content-muted hover:text-foreground active:scale-95"
                                                    title="Voltar"
                                                >
                                                    <ChevronLeft size={14} strokeWidth={3} />
                                                </button>
                                                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                                                <button
                                                    onClick={() => {
                                                        if (cycleConflict.step === 'select') handleHybridPreview();
                                                        else if (cycleConflict.step === 'preview') handleTopicPreview(true);
                                                    }}
                                                    disabled={cycleConflict.step === 'topic-preview' || (cycleConflict.step === 'select' && isMerging) || isAnalyzingTopics}
                                                    className="p-1.5 hover:bg-white/10 dark:hover:bg-white/10 disabled:opacity-20 rounded-md transition-all text-content-muted hover:text-foreground active:scale-95"
                                                    title="Próximo"
                                                >
                                                    <ChevronRight size={14} strokeWidth={3} />
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2.5">
                                            {cycleConflict.step === 'success' ? (
                                                <div className="flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-0.5 border border-emerald-500/20">
                                                    CONCLUÍDO
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center rounded-full bg-sky-500/10 text-sky-500 text-[10px] font-black px-2 py-0.5 border border-sky-500/20">
                                                    {cycleConflict.existingIds.length === 0 ? '1/1' :
                                                     cycleConflict.action === 'replace' ? (cycleConflict.step === 'select' ? '1/2' : '2/2') :
                                                     cycleConflict.step === 'select' ? '1/3' :
                                                     cycleConflict.step === 'preview' ? '2/3' : '3/3'}
                                                </div>
                                            )}
                                            <h2 className="text-[14px] font-black text-foreground uppercase tracking-tight">
                                                {cycleConflict.step === 'select' ? 'Carregar Edital' : 
                                                 cycleConflict.step === 'preview' ? (cycleConflict.existingIds.length === 0 ? 'Carregar Edital' : 'Preview Mescla Matérias') :
                                                 cycleConflict.step === 'topic-preview' ? 'Preview Mescla Matérias e Tópicos' :
                                                 'Edital Carregado'}
                                            </h2>
                                        </div>
                                    </div>

                                    <p className="text-[11px] font-medium text-content-muted leading-relaxed whitespace-normal md:whitespace-nowrap">
                                        {cycleConflict.step === 'select' ? 'Escolha como deseja adicionar o novo edital ao seu planejamento.' :
                                         (cycleConflict.step === 'preview' || cycleConflict.step === 'topic-preview') ? 'As matérias com mesmo nome serão unificadas para preservar seu progresso.' :
                                         'Seu planejamento foi atualizado com sucesso.'}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        if (!isMerging && !isAnalyzingTopics && cycleConflict.step !== 'success') {
                                            setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null, showIASuggestionsOnly: false });
                                            setIsRecoveringMerge(false);
                                        }
                                    }}
                                    disabled={isMerging || isAnalyzingTopics || cycleConflict.step === 'success'}
                                    className="p-2 hover:bg-secondary dark:hover:bg-white/5 rounded-xl transition-colors text-content-muted flex-shrink-0"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Área de Conteúdo - Lateral 2cm, Vertical 1cm */}
                            <div className="flex-1 overflow-y-auto no-scrollbar pt-4 px-8 pb-4 flex flex-col gap-8">
                                {/* Banner de Mesclagem Recuperada - SEMPRE NO TOPO DO CONTEÚDO (Exceto Sucesso) */}
                                {isRecoveringMerge && cycleConflict.step !== 'success' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between gap-4 flex-shrink-0"
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

                                <div className="flex-1 flex flex-col gap-10 no-scrollbar">
                                {/* Seção: Ciclo Atual (SÓ MOSTRA NO PASSO 1 - SELECT) */}
                                {cycleConflict.step === 'select' && cycleConflict.existingIds.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black text-content-muted uppercase tracking-widest">ATUALMENTE NO CICLO</span>
                                            <span className="text-[10px] font-bold text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full">
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
                                                    <div key={i} className="p-4 rounded-xl bg-[#101E2B] border border-[#1E3A52] space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-4 bg-[#0284C7] rounded-full" />
                                                                <span className="text-[13px] font-black text-foreground uppercase tracking-tight">{origin.name}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-[#38BDF8] bg-[#0284C7]/20 px-2.5 py-1 rounded-full border border-[#0284C7]/20">
                                                                {originSubjects.length} matérias
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">
                                                            {originSubjects.map(s => (
                                                                <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-[#192734] border border-[#1E3A52]/50 hover:bg-[#192734]/80 transition-colors group">
                                                                    <BookOpen size={10} className="text-[#0284C7]" />
                                                                    <span className="text-[10px] font-bold text-sky-100 truncate leading-none">{s.name}</span>
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
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">NOVO EDITAL SELECIONADO</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setCycleConflict(prev => ({ ...prev, showDetailedPreview: !prev.showDetailedPreview }))}
                                                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase tracking-wider hover:bg-emerald-500/20 transition-all"
                                                >
                                                    {cycleConflict.showDetailedPreview ? <LayoutGrid size={10} /> : <Eye size={10} />}
                                                    {cycleConflict.showDetailedPreview ? 'Ver Resumo' : 'Ver Tópicos'}
                                                </button>
                                                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                    {cycleConflict.edital.subjectIds.length} matérias
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-[#12251A] border border-[#1E422D] space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-4 bg-[#10B981] rounded-full" />
                                                    <span className="text-[13px] font-black text-foreground uppercase tracking-tight">{cycleConflict.edital.name}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-[#34D399] bg-[#10B981]/20 px-2.5 py-1 rounded-full border border-[#10B981]/20">
                                                    + {cycleConflict.edital.subjectIds.length} matérias
                                                </span>
                                            </div>

                                            {cycleConflict.showDetailedPreview ? (
                                                <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1 pr-2 custom-scrollbar">
                                                    {cycleConflict.edital.subjectIds.map(sid => {
                                                        const s = loadedEditalSubjects.find(subj => subj.id === sid) || subjects.find(subj => subj.id === sid);
                                                        if (!s) return null;
                                                        return (
                                                            <div key={sid} className="p-3 rounded-xl bg-[#1A3123] border border-[#1E422D] space-y-2.5 group transition-all hover:border-[#1E422D]/80">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1 h-3 bg-[#10B981] rounded-full" />
                                                                        <span className="text-[11px] font-black text-[#6EE7B7] uppercase tracking-wider truncate">{s.name}</span>
                                                                    </div>
                                                                    <span className="text-[8px] font-black text-[#34D399]/50 uppercase tracking-widest">
                                                                        {s.topics?.length || 0} tópicos
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className="grid grid-cols-1 gap-1.5 pl-3 border-l border-[#1E422D]">
                                                                    {(s.topics || []).map(t => (
                                                                        <div key={t.id} className="flex items-center gap-2 text-[10px] text-content-muted/70">
                                                                            <div className="w-0.5 h-0.5 rounded-full bg-[#10B981]/40" />
                                                                            <span className="truncate leading-none">{t.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-2.5">
                                                    {cycleConflict.edital.subjectIds.slice(0, 15).map(sid => {
                                                        const s = loadedEditalSubjects.find(subj => subj.id === sid) || subjects.find(subj => subj.id === sid);
                                                        if (!s) return null;
                                                        return (
                                                            <div key={sid} className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-[#1A3123] border border-[#1E422D]/50 transition-all hover:bg-[#1A3123]/80 group">
                                                                <BookOpen size={10} className="text-[#10B981]" />
                                                                <span className="text-[10px] font-bold text-[#6EE7B7] truncate leading-none">{s.name}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {cycleConflict.edital.subjectIds.length > 15 && (
                                                        <div className="flex items-center justify-center px-4 py-2 rounded-none bg-[#1A3123] border border-[#1E422D]/50 border-dashed">
                                                            <span className="text-[10px] font-black text-[#34D399]/50 uppercase tracking-widest leading-none">+{cycleConflict.edital.subjectIds.length - 15}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Seção: Resultado (Preview) - SÓ MOSTRA SE FOR PREVIEW */}
                                {cycleConflict.step === 'preview' && (
                                    <div className="space-y-2.5 py-2">


                                        <div className="relative p-4 rounded-2xl bg-secondary dark:bg-zinc-800/30 border border-content-muted/5 space-y-4">
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
                                                                        ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                                                                        : 'bg-white/5 border-white/5'
                                                                    }`}
                                                            >
                                                                <div
                                                                    className="flex items-center justify-between gap-3 p-3 cursor-pointer select-none"
                                                                    onClick={() => togglePreviewSubjectExpansion(primaryId)}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                        <div className={`p-1.5 rounded-lg shrink-0 ${isUnified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-content-muted/40'
                                                                            }`}>
                                                                            <BookOpen size={14} />
                                                                        </div>
                                                                        <span className="text-[11px] font-black text-foreground uppercase tracking-wider truncate">
                                                                            {overrideValue}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${isUnified ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-content-muted/40 border-white/5'
                                                                            }`}>
                                                                            {isUnified ? 'MESCLADO' : 'MANTIDO'}
                                                                        </span>
                                                                        <div className="text-content-muted/20">
                                                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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

                                                        let cardStyle = 'bg-white/5 border-white/5';
                                                        let badgeStyle = 'bg-white/5 text-content-muted/40 border-white/5';
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
                                                            <div key={s.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl border transition-all ${cardStyle}`}>
                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                    <div className="p-1.5 rounded-lg bg-white/5 text-content-muted/40 shrink-0">
                                                                        <BookOpen size={12} />
                                                                    </div>
                                                                    <span className="text-[11px] font-black text-foreground uppercase tracking-wider truncate">
                                                                        {s.name}
                                                                    </span>
                                                                </div>
                                                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${badgeStyle}`}>
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

                                        <div className="p-4 rounded-3xl bg-secondary dark:bg-zinc-800/30 border border-border dark:border-white/5 space-y-4">
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
                                                                                    <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${tm.originalTopicIds.length > 1 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-500/10 text-content-muted border-zinc-500/10'}`}>
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

                                    {/* Seção: Sucesso (Resumo) */}
                                    {cycleConflict.step === 'success' && (
                                        <div className="flex flex-col items-center gap-4 py-2 animate-in zoom-in-95 duration-500 w-full">
                                            
                                            <div className="flex sm:flex-row items-center justify-center gap-4 w-full">
                                                <div className="relative shrink-0">
                                                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                                                    <div className="relative w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-xl">
                                                        <CheckCircle2 size={24} className="text-emerald-500" />
                                                    </div>
                                                </div>
                                                
                                            <div className="text-center sm:text-left space-y-0.5">
                                                <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Ciclagem Concluída!</h4>
                                                <span className="text-[11px] text-emerald-500 font-bold uppercase tracking-[.2em]">Ambiente atualizado</span>
                                            </div>
                                            </div>

                                            <div className="w-full bg-emerald-500/[0.03] rounded-[24px] p-4 border border-emerald-500/10 space-y-4">
                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-[.3em] text-emerald-500/60 pb-3 border-b border-emerald-500/10">
                                                    <span>Resumo Estratégico</span>
                                                    <Sparkles size={12} />
                                                </div>

                                                <div className="space-y-4">
                                                    {/* Aviso Dinâmico da Ação */}
                                                    <div className={`p-3 rounded-xl border flex items-start gap-3 w-full
                                                        ${cycleConflict.action === 'replace' 
                                                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' 
                                                            : cycleConflict.wasTopicMerged 
                                                                ? 'bg-purple-500/10 border-purple-500/20 text-purple-500' 
                                                                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                                                        <div className="shrink-0 mt-0.5">
                                                            {cycleConflict.action === 'replace' ? <Info size={14} /> : 
                                                             cycleConflict.wasTopicMerged ? <Sparkles size={14} /> : <AlertTriangle size={14} />}
                                                        </div>
                                                        <div className="space-y-0.5 flex-1">
                                                            <span className="text-[9px] uppercase font-black tracking-widest block opacity-70">
                                                                {cycleConflict.action === 'replace' ? 'Substituição Direta' : 
                                                                 cycleConflict.wasTopicMerged ? 'Processamento Profundo' : 'Agrupamento Rápido'}
                                                            </span>
                                                            <p className="text-[11px] font-medium leading-tight text-foreground/90">
                                                                {cycleConflict.action === 'replace'
                                                                    ? 'Limpamos o ciclo anterior e montamos um novo do zero baseado neste edital.'
                                                                    : cycleConflict.wasTopicMerged
                                                                    ? 'Matérias unificadas e tópicos minuciosamente processados com Inteligência Artificial.'
                                                                    : 'Matérias unificadas. Tópicos apenas agrupados sem mesclagem avançada de IA.'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Identificação Principal */}
                                                    <div className="space-y-1.5">
                                                        <span className="text-[9px] text-content-muted/60 uppercase font-black tracking-widest">Edital Integrado</span>
                                                        <h5 className="text-sm font-black text-foreground uppercase tracking-tight leading-tight">
                                                            {cycleConflict.edital?.name}
                                                        </h5>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/10">
                                                                <Target size={12} className="text-emerald-500" />
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tight">
                                                                    {cycleConflict.edital?.position || 'Cargo Master'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                                                <CalendarDays size={12} className="text-content-muted/60" />
                                                                <span className="text-[9px] font-black text-content-muted/60 uppercase tracking-tight">
                                                                    {cycleConflict.edital?.examDate
                                                                        ? new Date(cycleConflict.edital.examDate).toLocaleDateString('pt-BR')
                                                                        : 'Prova em Aberto'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Métricas e Composição */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        <div className="bg-emerald-500/[0.04] rounded-xl p-3 border border-emerald-500/10 transition-all hover:bg-emerald-500/[0.06]">
                                                            <span className="text-[8px] text-emerald-500/50 uppercase font-black tracking-widest block mb-1">Total de Matérias</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-2xl font-black text-foreground">{cycleConflict.edital?.subjectIds.length || 0}</span>
                                                                <span className="text-[9px] text-content-muted font-bold uppercase tracking-tight">mat</span>
                                                            </div>
                                                        </div>

                                                        <div className="bg-emerald-500/[0.04] rounded-xl p-3 border border-emerald-500/10 transition-all hover:bg-emerald-500/[0.06]">
                                                            <span className="text-[8px] text-emerald-500/50 uppercase font-black tracking-widest block mb-1">Total de Tópicos</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-2xl font-black text-foreground">
                                                                    {cycleConflict.edital?.subjectIds.reduce((acc, sid) => {
                                                                        const s = loadedEditalSubjects.find(subj => subj.id === sid) || subjects.find(subj => subj.id === sid);
                                                                        return acc + (s?.topics?.length || 0);
                                                                    }, 0) || 0}
                                                                </span>
                                                                <span className="text-[9px] text-content-muted font-bold uppercase tracking-tight">top</span>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-all hover:bg-white/10 col-span-2 sm:col-span-1">
                                                            <span className="text-[8px] text-content-muted/40 uppercase font-black tracking-widest block mb-1">Status do Ciclo</span>
                                                            <div className="flex items-baseline justify-between mt-1">
                                                                <span className="text-sm font-black text-foreground uppercase tracking-tight">Ativo</span>
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Editais no Ciclo */}
                                                    <div className="space-y-2">
                                                        <span className="text-[9px] text-content-muted/60 uppercase font-black tracking-widest block">Editais Ativos no Ciclo:</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-tight shadow-sm shadow-emerald-500/20">
                                                                {cycleConflict.edital?.name.split(' - ')[0]}
                                                            </span>
                                                            {cycleConflict.action !== 'replace' && cycleConflict.currentOrigins.filter((o: any) => o.id !== cycleConflict.edital?.id).map((o: any) => (
                                                                <span key={o.id || 'manual'} className="px-2.5 py-1 bg-white/5 rounded-lg text-[9px] font-black text-content-muted/60 border border-white/5 uppercase tracking-tight">
                                                                    {'isManual' in o ? 'Matérias Avulsas' : o.name.split(' - ')[0]}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Rodapé - Lateral 2cm, Vertical 1cm */}
                            <div className="px-8 py-4 border-t border-white/[0.08] bg-white dark:bg-[#18181A] sticky bottom-0 z-[60]">
                                {cycleConflict.step === 'select' ? (
                                    cycleConflict.existingIds.length === 0 ? (
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => handleCycleConflictAction('replace')}
                                                disabled={isMerging}
                                                className="group w-[180px] h-[48px] rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 text-center transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {isMerging ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Plus size={16} />
                                                )}
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="text-[11px] font-black uppercase tracking-wider leading-none mb-0.5">INICIAR CICLO</span>
                                                    <span className="text-[9px] text-emerald-100/80 font-bold leading-none">Criar base de estudos</span>
                                                </div>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => setCycleConflict(prev => ({ ...prev, step: 'preview', action: 'replace' }))}
                                                className="group w-[180px] py-3 rounded-xl bg-[#3F1D24]/40 border border-[#5C2B36] hover:bg-[#4C242D]/60 text-center transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                <RefreshCw size={16} className="text-[#F87171]" />
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="text-[11px] font-black text-[#F87171] uppercase tracking-wider leading-none mb-0.5">SUBSTITUIR</span>
                                                    <span className="text-[9px] text-[#FCA5A5] font-bold leading-none">Começar do zero</span>
                                                </div>
                                            </button>

                                            <button
                                                onClick={handleHybridPreview}
                                                disabled={isMerging}
                                                className="group w-[180px] py-3 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 text-center transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                <Plus size={16} />
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="text-[11px] font-black uppercase tracking-wider leading-none mb-0.5">MESCLAR</span>
                                                    <span className="text-[9px] text-emerald-100/80 font-bold leading-none">Manter progresso</span>
                                                </div>
                                            </button>
                                        </div>
                                    )
                                ) : cycleConflict.step === 'preview' ? (
                                    <div className="flex flex-col gap-3">
                                        {/* Aviso: tópicos serão agrupados, não unificados */}
                                        {(cycleConflict.action === 'merge' || cycleConflict.action === 'hybrid') && cycleConflict.existingIds.length > 0 && (
                                            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                                                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-snug">
                                                    <span className="font-black">Agrupamento sem unificação.</span> Matérias com o mesmo nome de editais diferentes permanecerão como entradas separadas no seu ciclo. Para unificar os tópicos, use "Processar Tópicos" ao lado.
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-end gap-3">
                                            {(cycleConflict.action === 'merge' || cycleConflict.action === 'hybrid') && (
                                                <button
                                                    onClick={() => handleTopicPreview(true)}
                                                    disabled={isMerging || isAnalyzingTopics}
                                                    className="flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 hover:bg-sky-500/20 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {isAnalyzingTopics ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                                    <div className="flex flex-col items-start text-left">
                                                        <span className="text-[11px] font-black uppercase tracking-wider leading-none mb-0.5">PROCESSAR TÓPICOS</span>
                                                        <span className="text-[9px] text-sky-500/80 font-bold leading-none">Avançar análise com IA</span>
                                                    </div>
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleCycleConflictAction(cycleConflict.action!)}
                                                disabled={isMerging || (cycleConflict.edital && processingId === cycleConflict.edital.id)}
                                                className="flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                            >
                                                {isMerging ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                <div className="flex flex-col items-start text-left">
                                                    <span className="text-[11px] font-black uppercase tracking-wider leading-none mb-0.5">
                                                        {cycleConflict.existingIds.length === 0 ? 'CRIAR CICLO' : 'FINALIZAR DIRETO'}
                                                    </span>
                                                    <span className="text-[9px] text-emerald-100/80 font-bold leading-none">
                                                        {cycleConflict.existingIds.length === 0 ? 'Concluir' : '(Pular mesclagem de tópicos)'}
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                ) : cycleConflict.step === 'topic-preview' ? (
                                    <div className="flex items-center justify-end">
                                        <button
                                            onClick={() => handleCycleConflictAction('merge')}
                                            disabled={isMerging || (cycleConflict.edital && processingId === cycleConflict.edital.id)}
                                            className="flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                        >
                                            {isMerging ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                            <div className="flex flex-col items-start text-left">
                                                <span className="text-[11px] font-black uppercase tracking-wider leading-none mb-0.5">
                                                    SALVAR MESCLAGEM
                                                </span>
                                                <span className="text-[9px] text-emerald-100/80 font-bold leading-none">
                                                    Matérias + Tópicos
                                                </span>
                                            </div>
                                        </button>
                                    </div>
                                ) : cycleConflict.step === 'success' ? (
                                    <button
                                        onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null, showIASuggestionsOnly: false })}
                                        className="w-full py-4 rounded-xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                                    >
                                        Finalizar e Ver Ciclo
                                    </button>
                                ) : null}
                            </div>
                        </motion.div>
                    </div>
                </>
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
