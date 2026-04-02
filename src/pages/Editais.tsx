import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
    Search, Plus, Library, Trash2, Play, Eye, CalendarDays, Clock,
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
import { Subject } from '@/types';
import { errorService } from '@/lib/errors/errorService';
import { toastGate } from '@/lib/errors/toastGate';
import { performHybridMerge, saveUnificationMap, performFullTopicMerge, applyTopicMergeToMap } from '@/services/cycleMergeService';
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
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
        step: 'select' | 'preview' | 'topic-preview';
        action: 'merge' | 'replace' | 'hybrid' | null;
        unificationMap?: CycleUnificationMap;
        finalSubjectIds?: string[];
        hybridResult?: HybridMergeResult;
        aiStatus?: 'success' | 'error' | 'timeout';
        topicMergeResult?: TopicMergePhaseResult;
        subjectDisplayNameOverrides?: Record<string, string>; // subjectId → custom name
    }>({ 
        isOpen: false, 
        edital: null, 
        existingIds: [], 
        currentOrigins: [], 
        step: 'select', 
        action: null 
    });
    const [isAnalyzingTopics, setIsAnalyzingTopics] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
    const [expandedPreviewSubjects, setExpandedPreviewSubjects] = useState<Set<string>>(new Set());

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
    const handleSaveEdital = useCallback(async (id: string, updates: { organ: string; position: string; year: string }) => {
        try {
            const { error } = await editaisTable()
                .update({
                    organ: updates.organ,
                    position: updates.position,
                    year: updates.year,
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

    useEffect(() => { 
        fetchEditais(); 
        fetchPublicEditais();
    }, [fetchEditais, fetchPublicEditais]);

    // Escuta evento de atualização de matérias/tópicos para refresh
    useEffect(() => {
        const handleExternalUpdate = () => {
            fetchEditais();
        };
        window.addEventListener('subjectUpdated', handleExternalUpdate);
        return () => window.removeEventListener('subjectUpdated', handleExternalUpdate);
    }, [fetchEditais]);

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
            // 1. Limpar Histórico de Revisão globalmente para este Edital
            const { error: historyErr } = await supabase
                .from('topic_review_history')
                .delete()
                .eq('edital_id', edital.id);
            if (historyErr) console.error('Erro ao limpar histórico:', historyErr);

            // 1.1 Limpar Sessões de Estudo globalmente para este Edital
            const { error: sessionsErr } = await supabase
                .from('study_sessions')
                .delete()
                .eq('edital_id', edital.id);
            if (sessionsErr) console.error('Erro ao limpar sessões:', sessionsErr);

            // 2. Deletar Tópicos vinculados a este Edital
            const { error: topicsErr } = await supabase
                .from('topics')
                .delete()
                .eq('edital_id', edital.id);
            if (topicsErr) console.error('Erro ao deletar tópicos:', topicsErr);

            // 3. Deletar Matérias vinculadas a este Edital
            const { error: subjectsErr } = await supabase
                .from('subjects')
                .delete()
                .eq('edital_id', edital.id)
                .eq('user_id', user!.id);
            if (subjectsErr) console.error('Erro ao deletar matérias:', subjectsErr);

            // 4. Remover Matérias do Ciclo de Estudos (user_cycles) — Evita dados órfãos na página de Revisões
            const { data: currentCycle } = await supabase
                .from('user_cycles')
                .select('id, ciclo_atual')
                .eq('user_id', user!.id)
                .maybeSingle();
            
            if (currentCycle && currentCycle.ciclo_atual) {
                const currentIds = (currentCycle.ciclo_atual as string[]) || [];
                const subjectIdsToRemove = new Set(edital.subjectIds);
                const newCycleIds = currentIds.filter(id => !subjectIdsToRemove.has(id));
                
                if (newCycleIds.length !== currentIds.length) {
                    await supabase
                        .from('user_cycles')
                        .update({ ciclo_atual: newCycleIds, atualizado_em: new Date().toISOString() })
                        .eq('id', currentCycle.id);
                    window.dispatchEvent(new CustomEvent('cycleUpdated'));
                }
            }

            // 5. Deletar o Edital em si
            const { error } = await editaisTable().delete().eq('id', edital.id);
            if (error) throw error;

            setEditais(prev => prev.filter(e => e.id !== edital.id));
            setDeleteConfirm({ isOpen: false, edital: null });

            const cleanName = edital.name.length > 50 ? `${edital.name.substring(0, 50)}...` : edital.name;
            toast.success(`Edital "${cleanName}" removido com sucesso.`);

            // Sincroniza a página de Matérias
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
        } finally {
            setProcessingId(null);
        }
    }, [user]);

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
        try {
            const { data: existingCycle } = await supabase
                .from('user_cycles')
                .select('id, ciclo_atual')
                .eq('user_id', user.id)
                .single();

            if (existingCycle) {
                const currentIds = (existingCycle.ciclo_atual as string[]) || [];
                const newIds = currentIds.filter(id => !edital.subjectIds.includes(id));

                const { error: cycleErr } = await supabase
                    .from('user_cycles')
                    .update({
                        ciclo_atual: newIds,
                        atualizado_em: new Date().toISOString(),
                    } as any)
                    .eq('user_id', user.id);

                if (cycleErr) throw cycleErr;
            }

            // ─── 4. Resetar campos SRS nos tópicos (Ponto Crítico: Remove da página de Revisões) ───
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
                    .in('subject_id', edital.subjectIds);
                
                // ─── 5. Purgar logs de estudo e histórico de revisão (Aggressive Cleanup) ───
                // 5a. Deletar sessões de estudo PARA ESTE EDITAL
                await (supabase as any).from('study_sessions').delete().eq('edital_id', edital.id);

                // 5b. Deletar histórico de revisão de tópicos (topic_review_history) PARA ESTE EDITAL
                await (supabase as any).from('topic_review_history').delete().eq('edital_id', edital.id);
                
                // 5c. Caso o edital tenha tópicos órfãos ou inconsistentes (precaução extra)
                const { data: topicsToClear } = await supabase
                    .from('topics')
                    .select('id')
                    .in('subject_id', edital.subjectIds);
                
                if (topicsToClear && topicsToClear.length > 0) {
                    const topicIds = topicsToClear.map(t => t.id);
                    await (supabase as any).from('topic_review_history').delete().in('topic_id', topicIds);
                }
            }

            // ─── 6. Purgar logs do ciclo (Comentado: tabela não existe no schema atual) ───
            // await (supabase as any).from('cycle_logs').delete().eq('user_id', user.id).eq('edital_id', edital.id);

            // ─── 7. Atualizar Estado do Edital ──────────────────────────────
            await editaisTable()
                .update({ merged_into_cycle: false, active_subject_ids: [] } as any)
                .eq('id', edital.id);

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
        }
    }, [user, refreshData]);

    const handleLoadCycle = useCallback(async (edital: UserEdital) => {
        if (!user) return;
        setProcessingId(edital.id);

        try {
            const { data: existingCycle } = await supabase
                .from('user_cycles')
                .select('id, ciclo_atual')
                .eq('user_id', user.id)
                .single();

            const existingIds = (existingCycle?.ciclo_atual as string[] | null) || [];

            // CORREÇÃO: Filtrar apenas IDs que realmente existem no sistema para evitar "fantasmas" no preview
            const realExistingIds = existingIds.filter(id => subjects.some(s => s.id === id));

            // CORREÇÃO: Encontrar quais editais já estão no ciclo (origens) 
            // Buscamos em TODO o array 'editais' (estado) para ignorar filtros de busca/tipo ativos
            const origins: (UserEdital | { name: string; isManual: boolean })[] = [];
            for (const e of editais) {
                if (e.id === edital.id) continue;
                // Se algum subject ID do edital 'e' está no ciclo atual, ele é uma origem
                const hasCommon = e.subjectIds.some(id => realExistingIds.includes(id));
                if (hasCommon) {
                    origins.push(e);
                }
            }
            
            // Se há IDs existentes no ciclo mas nenhuma origem de edital foi encontrada, é "Manual"
            if (origins.length === 0 && realExistingIds.length > 0) {
                origins.push({ name: 'Manual', isManual: true });
            }

            // BUSCAR TODAS AS MATÉRIAS E TÓPICOS DO EDITAL para garantir visibilidade no modal
            const { data: editalSubjectsData } = await supabase
                .from('subjects')
                .select('*, topics(*)')
                .in('id', edital.subjectIds);
            
            if (editalSubjectsData) {
                setLoadedEditalSubjects(editalSubjectsData as any);
            }

            // SEMPRE mostrar o modal (seja conflito ou carga inicial) para confirmação
            setCycleConflict({
                isOpen: true,
                edital: edital,
                existingIds: realExistingIds,
                currentOrigins: origins,
                step: realExistingIds.length > 0 ? 'select' : 'preview',
                action: realExistingIds.length > 0 ? null : 'replace'
            });
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'loadCycle', userMessage: 'Erro ao preparar carga do ciclo.' });
        } finally {
            setProcessingId(null);
        }
    }, [user, editais, subjects, refreshData]);

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
        try {
            const edital = cycleConflict.edital;
            const existingSubs = subjects.filter(s => cycleConflict.existingIds.includes(s.id));
            const newSubs = subjects.filter(s => edital.subjectIds.includes(s.id));

            const existingEditalIds = editais
                .filter(e => e.mergedIntoCycle && e.id !== edital.id)
                .map(e => e.id);

            const result = await performHybridMerge(
                existingSubs,
                newSubs,
                existingEditalIds,
                edital.id
            );

            setCycleConflict(prev => ({ 
                ...prev, 
                step: 'preview', 
                action: 'merge',
                hybridResult: result,
                unificationMap: result.unificationMap,
                finalSubjectIds: result.finalSubjectIds,
                aiStatus: result.stats.aiStatus,
                subjectDisplayNameOverrides: {},
                topicMergeResult: undefined,
            }));

            if (result.stats.aiStatus === 'error') {
                toastGate.notifyError('IA Indisponível no momento. A mesclagem usará apenas nomes idênticos.', 'IA-03', { severity: 'medium' });
            }
        } catch (err) {
            errorService.report(err, { module: 'cycle', action: 'merge_preview', userMessage: 'Erro ao gerar prévia da mesclagem via IA.' });
        } finally {
            setIsMerging(false);
        }
    }, [cycleConflict, subjects, editais, user]);

    const handleTopicPreview = useCallback(async (useAI: boolean) => {
        if (!cycleConflict.unificationMap) return;
        setIsAnalyzingTopics(true);
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
                useAI
            );

            setCycleConflict(prev => ({
                ...prev,
                step: 'topic-preview',
                unificationMap: mapWithOverrides,
                topicMergeResult: topicResult,
            }));
        } catch (err) {
            errorService.report(err, { module: 'cycle', action: 'topic_preview', userMessage: 'Erro ao analisar tópicos.' });
        } finally {
            setIsAnalyzingTopics(false);
        }
    }, [cycleConflict, subjects]);

    const handleCycleConflictAction = useCallback(async (action: 'replace' | 'merge' | 'hybrid') => {
        if (!cycleConflict.edital || !user) return;
        const edital = cycleConflict.edital;
        setProcessingId(edital.id);
        // Apply topic merge results into the unification map if available
        if (cycleConflict.topicMergeResult && cycleConflict.unificationMap) {
            const finalMap = applyTopicMergeToMap(cycleConflict.unificationMap, cycleConflict.topicMergeResult);
            setCycleConflict(prev => ({ ...prev, unificationMap: finalMap }));
        }

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

                toast.success(`Ciclo substituído com sucesso por "${edital.name}".`);
            } else {
                // Se já temos o mapa calculado da prévia, usamos. Senão (fallback), calculamos.
                let unificationMap = cycleConflict.unificationMap || cycleConflict.hybridResult?.unificationMap;
                let finalSubjectIds = cycleConflict.finalSubjectIds || cycleConflict.hybridResult?.finalSubjectIds;
                let result: HybridMergeResult | null = cycleConflict.hybridResult || null;

                if (!unificationMap || !finalSubjectIds) {
                    const existingSubs = subjects.filter(s => cycleConflict.existingIds.includes(s.id));
                    const newSubs = subjects.filter(s => edital.subjectIds.includes(s.id));
                    const existingEditalIds = editais
                        .filter(e => e.mergedIntoCycle && e.id !== edital.id)
                        .map(e => e.id);

                    const resultData = await performHybridMerge(existingSubs, newSubs, existingEditalIds, edital.id);
                    unificationMap = resultData.unificationMap;
                    finalSubjectIds = resultData.finalSubjectIds;
                    // We don't need to set result locally here if we use resultData below
                    result = resultData; 
                }

                // Persist unification map to user_cycles in database
                await saveUnificationMap(user.id, unificationMap);

                // Load merged cycle
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
            
            setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null });
            await fetchEditais();
            await refreshData();
        } catch (err) {
            errorService.report(err, { module: 'cycle', action: 'conflict_resolution', userMessage: 'Erro ao processar ação no ciclo.' });
        } finally {
            setProcessingId(null);
        }
    }, [cycleConflict, executeCycleLoad, editais, markEditalMerged, fetchEditais, refreshData, user, subjects]);

    /**
     * Importação de edital: cria matérias e tópicos REAIS no Supabase,
     * coleta os UUIDs retornados e salva o edital com esses IDs.
     */
    const handleImportDone = useCallback(async (
        importedSubjects: Subject[], 
        editalName?: string, 
        isImported: boolean = true, 
        sourceId?: string,
        extraInfo?: { organ: string; position: string; year: string }
    ) => {
        if (!user || isSaving) return;
        setIsSaving(true);

        try {
            const realSubjectIds: string[] = [];

            for (const subj of importedSubjects) {
                // 1. Criar matéria no Supabase
                const { data: newSubject, error: subjErr } = await supabase
                    .from('subjects')
                    .insert({
                        user_id: user.id,
                        name: subj.name,
                        status: 'Nova',
                    } as any)
                    .select('id')
                    .single();

                if (subjErr) throw subjErr;
                if (!newSubject) continue;

                realSubjectIds.push(newSubject.id);

                // 2. Criar tópicos da matéria (se houver)
                const topicsToInsert = subj.topics
                    .filter(t => t.name?.trim())
                    .map((t, idx) => ({
                        subject_id: newSubject.id,
                        name: t.name,
                        completed: false,
                        review_count: 0,
                        position: t.position ?? idx
                    }));

                if (topicsToInsert.length > 0) {
                    const { error: topicErr } = await supabase
                        .from('topics')
                        .insert(topicsToInsert as any);
                    if (topicErr) throw topicErr;
                }
            }

            // 3. Nome do edital: usar editalName (do concurso) ou fallback
            const finalName = editalName || 'Novo Edital';

            const { data: newEditalRow, error: editalErr } = await editaisTable().insert({
                user_id: user.id,
                name: finalName,
                is_imported: isImported,
                source_id: sourceId,
                organ: extraInfo?.organ,
                position: extraInfo?.position,
                year: extraInfo?.year,
                subject_ids: realSubjectIds,
                active_subject_ids: realSubjectIds,
                merged_into_cycle: false,
            } as any).select().single();

            if (editalErr) throw editalErr;

            // 3b. Atualizar matérias e tópicos com edital_id
            if (realSubjectIds.length > 0) {
                await supabase
                    .from('subjects')
                    .update({ edital_id: newEditalRow.id } as any)
                    .in('id', realSubjectIds);
            }

            const allTopicIds: string[] = [];
            for (const subjId of realSubjectIds) {
                const { data: topicRows } = await supabase
                    .from('topics')
                    .select('id')
                    .eq('subject_id', subjId);
                if (topicRows) {
                    allTopicIds.push(...topicRows.map((t: any) => t.id));
                }
            }
            if (allTopicIds.length > 0) {
                await supabase
                    .from('topics')
                    .update({ edital_id: newEditalRow.id } as any)
                    .in('id', allTopicIds);
            }

            // 4. Atualizar tudo
            await fetchEditais();
            await refreshData(); 
            
            // Forçamos o despacho do evento para garantir que outros componentes saibam da mudança
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('topicUpdated'));
            
            setIsImportModalOpen(false);
            const finalEdital = rowToEdital(newEditalRow);
            
            // Abrir automaticamente o modal de matérias se for criação manual 
            // ou se o usuário desejar (no caso manual é obrigatório abrir agora)
            if (!isImported) {
                setSubjectsModal({ isOpen: true, edital: finalEdital });
                toast.success(`Edital "${finalName}" criado! Agora adicione as matérias.`);
            } else {
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
                        status: 'Nova' 
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
                                        className={`px-2 h-full rounded-md text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                                            activeFilter === f.id 
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
                        <div className="max-w-md mx-auto space-y-4">
                            <h2 className="text-lg font-semibold text-foreground tracking-tight">
                                Nenhum edital disponível nos filtros ativos
                            </h2>
                            <p className="text-sm text-content-muted font-medium mb-6">
                                Mude os filtros acima ou importe um novo edital.
                            </p>
                            <button
                                onClick={() => {
                                    setActiveFilter('all');
                                    setSearchQuery("");
                                }}
                                className="px-6 py-3 bg-secondary text-foreground text-sm font-bold rounded-xl border border-border"
                            >
                                Resetar Filtros
                            </button>
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
                                    onClick={() => setUnloadConfirm({ isOpen: false, edital: null })}
                                    className="flex-1 py-3 bg-secondary dark:bg-zinc-800 text-content-muted font-bold rounded-xl hover:bg-secondary/80 dark:hover:bg-zinc-700 transition-all text-xs uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
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

            {/* ── Modal: Gerenciar Ciclo (Carga e Conflito) ── */}
            <AnimatePresence>
                {cycleConflict.isOpen && cycleConflict.edital && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isMerging && setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null })}
                            className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-2xl bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-[28px] shadow-2xl p-7 flex flex-col gap-6 overflow-hidden"
                        >
                            {/* Overlay de Processamento com IA */}
                            {isMerging && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
                                    <div className="flex flex-col items-center gap-6 text-center max-w-[280px]">
                                        <div className="relative">
                                            <div className="absolute -inset-4 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                                            <div className="relative bg-emerald-500/10 p-5 rounded-full border border-emerald-500/20">
                                                <Loader2 size={32} className="text-emerald-500 animate-spin" />
                                            </div>
                                            <Merge size={16} className="absolute -bottom-1 -right-1 text-emerald-500 bg-background rounded-full p-0.5 border border-emerald-500/20" />
                                        </div>
                                        
                                        <div className="space-y-2.5">
                                            <h3 className="text-base font-black text-foreground uppercase tracking-tight leading-tight">
                                                Processamento Inteligente
                                            </h3>
                                            <div className="flex flex-col gap-1">
                                                <p className="text-xs text-content-muted font-medium px-4">
                                                    Nossa IA está analisando a compatibilidade entre as matérias...
                                                </p>
                                                <div className="flex flex-col gap-1 items-center mt-2 opacity-60">
                                                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse">Analisando nomes exatos</span>
                                                    <span className="text-[9px] font-bold text-sky-500 uppercase tracking-widest animation-delay-500">Mapeando tópicos equivalentes</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden border border-border/50">
                                            <div className="h-full bg-emerald-500 w-1/2 rounded-full animate-[progress_2s_ease-in-out_infinite]" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cycleConflict.step === 'preview' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                        {cycleConflict.step === 'preview' ? (
                                            <CheckCircle2 className="text-emerald-400" size={24} />
                                        ) : (
                                            <AlertTriangle className="text-sky-400" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                                            {cycleConflict.existingIds.length === 0 
                                                ? 'Novo Ciclo' 
                                                : (cycleConflict.step === 'select' ? 'Carregar Ciclo' : 'Confirmar Ação')}
                                        </h3>
                                        <p className="text-xs text-content-muted font-medium">
                                            {cycleConflict.existingIds.length === 0
                                                ? 'Prepare seu novo ciclo de estudos'
                                                : (cycleConflict.step === 'select' 
                                                    ? 'Escolha como carregar este edital' 
                                                    : `Revise como ficará seu ciclo ao ${cycleConflict.action === 'merge' ? 'mesclar' : 'substituir'}`)
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null })}
                                    className="p-2 hover:bg-secondary dark:hover:bg-white/5 rounded-xl transition-colors text-content-muted"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
                                {/* Seção: Ciclo Atual (SÓ MOSTRA NO PASSO 1) */}
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
                                                
                                                // Filtrar matérias que pertencem a esta origem
                                                // Se for manual, pegamos as matérias que NÃO pertencem a nenhum dos outros editais na lista
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
                                                                {!isManual && (
                                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[8px] font-bold text-sky-500 tracking-wider uppercase">
                                                                        SISTEMA . {editalOrigin?.isImported ? 'IA' : 'MANUAL'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!isManual && (editalOrigin?.position || editalOrigin?.organ) && (
                                                                <div className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex flex-col gap-0.5">
                                                                    {editalOrigin.organ && <span className="text-[10px] font-bold text-sky-600/80 dark:text-sky-400/80 uppercase tracking-wider">{editalOrigin.organ}</span>}
                                                                    {editalOrigin.position && <span className="text-[9px] font-medium text-content-muted/70 leading-tight italic">{editalOrigin.position}</span>}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-col gap-1.5">
                                                            {originSubjects.map(s => {
                                                                const isExpanded = expandedPreviewSubjects.has(s.id);
                                                                return (
                                                                    <div key={s.id} className="flex flex-col gap-1 text-left">
                                                                        <button 
                                                                            onClick={() => togglePreviewSubjectExpansion(s.id)}
                                                                            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-card/80 border border-border/50 transition-all group"
                                                                        >
                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-sky-500' : 'text-content-muted/40'}`} />
                                                                                <span className="text-sm font-bold text-foreground truncate">{s.name}</span>
                                                                            </div>
                                                                            <span className="text-[8px] font-bold text-content-muted/40 uppercase tracking-tighter shrink-0">{s.topics?.length || 0} tópicos</span>
                                                                        </button>
                                                                        {isExpanded && s.topics && s.topics.length > 0 && (
                                                                            <div className="mx-2 p-2 rounded-lg border border-white/5 space-y-1 animate-in slide-in-from-top-1 duration-200">
                                                                                {s.topics.map(t => (
                                                                                    <div key={t.id} className="flex items-center gap-2 text-[11px] text-content-muted/70 leading-tight px-2 py-1.5 rounded-md hover:bg-sky-500/10 transition-colors">
                                                                                        <div className="w-1 h-1 rounded-full bg-sky-500/30 shrink-0" />
                                                                                        <span className="truncate">{t.name}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Seção: Novo Edital (SÓ MOSTRA NO PASSO 1) */}
                                {cycleConflict.step === 'select' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">NOVO EDITAL SELECIONADO</span>
                                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                {cycleConflict.edital.subjectIds.length} matérias
                                            </span>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                                    <span className="text-xs font-bold text-foreground uppercase tracking-tight">{cycleConflict.edital.name}</span>
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-500 tracking-wider uppercase">
                                                        SISTEMA . {cycleConflict.edital.isImported ? 'IA' : 'MANUAL'}
                                                    </span>
                                                </div>
                                                {(cycleConflict.edital.position || cycleConflict.edital.organ) && (
                                                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-0.5">
                                                        {cycleConflict.edital.organ && <span className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">{cycleConflict.edital.organ}</span>}
                                                        {cycleConflict.edital.position && <span className="text-[9px] font-medium text-content-muted/70 leading-tight italic">{cycleConflict.edital.position}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                {cycleConflict.edital.subjectIds.map(sid => {
                                                    // Priorizar dados carregados explicitamente (que contêm tópicos)
                                                    const s = loadedEditalSubjects.find(subj => subj.id === sid) || subjects.find(subj => subj.id === sid);
                                                    if (!s) return null;
                                                    const isExpanded = expandedPreviewSubjects.has(s.id);
                                                    return (
                                                        <div key={sid} className="flex flex-col gap-1 text-left">
                                                            <button 
                                                                onClick={() => togglePreviewSubjectExpansion(s.id)}
                                                                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 transition-all group"
                                                            >
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-emerald-500' : 'text-emerald-500/30'}`} />
                                                                    <span className="text-sm font-bold text-emerald-600/90 dark:text-emerald-400/90 truncate">{s.name}</span>
                                                                </div>
                                                                <span className="text-[8px] font-bold text-emerald-600/40 uppercase tracking-tighter shrink-0">{(s as any).topics?.length || 0} tópicos</span>
                                                            </button>
                                                            {isExpanded && s.topics && s.topics.length > 0 && (
                                                                <div className="mx-2 p-2 rounded-lg border border-emerald-500/10 space-y-1 animate-in slide-in-from-top-1 duration-200">
                                                                    {s.topics.map(t => (
                                                                        <div key={t.id} className="flex items-center gap-2 text-[11px] text-emerald-600/70 dark:text-emerald-400/70 leading-tight px-2 py-1.5 rounded-md hover:bg-emerald-500/10 transition-colors">
                                                                            <div className="w-1 h-1 rounded-full bg-emerald-500/30 shrink-0" />
                                                                            <span className="truncate">{t.name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Seção: Resultado (Preview) - SÓ MOSTRA SE FOR PREVIEW */}
                                {cycleConflict.step === 'preview' && (
                                    <>
                                        {cycleConflict.aiStatus && cycleConflict.aiStatus !== 'success' && (
                                    <div className="mx-1 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                            <AlertCircle className="text-amber-500" size={20} />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-tight">IA Indisponível no Momento</h4>
                                            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 leading-relaxed font-medium">
                                                Não foi possível realizar a unificação semântica inteligente. 
                                                O sistema mesclou o edital usando apenas <strong>nomes idênticos</strong> como critério.
                                            </p>
                                            <button 
                                                onClick={() => handleHybridPreview()}
                                                className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 underline decoration-amber-500/30 hover:decoration-amber-500 transition-all"
                                            >
                                                Tentar Inteligência Artificial novamente
                                            </button>
                                        </div>
                                    </div>
                                )}

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
                                                    {finalPreviewIds.length < 3 && cycleConflict.edital && (
                                                        <span className="ml-2 bg-sky-500 text-white px-1.5 rounded-sm uppercase text-[8px] font-black">
                                                            {cycleConflict.edital.organ} • {cycleConflict.edital.position}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>

                                            {/* Nome do Edital e Cargo (Abaixo do contador de matérias) */}
                                            {cycleConflict.edital && (
                                                <div className="flex flex-col mt-0.5">
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground/90">
                                                        <FileText size={12} className="text-sky-500" />
                                                        <span>{cycleConflict.edital.organ}</span>
                                                        <span className="text-content-muted/40">•</span>
                                                        <span className="text-sky-500">{cycleConflict.edital.position}</span>
                                                        {cycleConflict.edital.year && (
                                                            <>
                                                                <span className="text-content-muted/40">•</span>
                                                                <span className="text-content-muted">{cycleConflict.edital.year}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-[10px] text-content-muted italic">
                                                {cycleConflict.existingIds.length === 0
                                                    ? 'Carregando matérias do edital selecionado.'
                                                    : (cycleConflict.action === 'merge' 
                                                        ? 'Unindo as matérias atuais com as do novo edital.'
                                                        : 'Limpando o ciclo atual e carregando as matérias do novo edital.')}
                                            </p>
                                        </div>
                                        <div className="relative p-4 rounded-2xl bg-secondary dark:bg-zinc-800/30 border border-border dark:border-white/5 space-y-2 max-h-[40vh] overflow-y-auto">
                                            {/* Overlay de carregamento da IA */}
                                            {isMerging && (
                                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl animate-in fade-in duration-300">
                                                    <Loader2 className="w-8 h-8 text-sky-500 animate-spin mb-3" />
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-xs font-black text-sky-500 uppercase tracking-widest">Processando IA</span>
                                                        <span className="text-[10px] text-content-muted animate-pulse">Analisando similaridades semânticas...</span>
                                                    </div>
                                                </div>
                                            )}

                                            {(cycleConflict.action === 'merge' || cycleConflict.action === 'hybrid') && cycleConflict.unificationMap ? (
                                                <div className="flex flex-col gap-2">
                                                    {/* Unified Subjects */}
                                                    {cycleConflict.unificationMap.unifiedSubjects.map((us: UnifiedSubjectMapping) => {
                                                        const primaryId = us.originalSubjectIds[0];
                                                        const overrideValue = cycleConflict.subjectDisplayNameOverrides?.[primaryId] ?? (us.displayNameOverride || us.displayName);
                                                        const originalInfo = us.originalSubjectIds
                                                            .map((id: string) => {
                                                                const subj = subjects.find(s => s.id === id);
                                                                if (!subj) return null;
                                                                let editalName = 'Ciclo Atual';
                                                                if (cycleConflict.edital?.subjectIds.includes(id)) {
                                                                    editalName = cycleConflict.edital.name;
                                                                } else {
                                                                    const origin = editais.find(e => e.mergedIntoCycle && e.id !== cycleConflict.edital?.id && e.subjectIds.includes(id));
                                                                    if (origin) editalName = origin.name;
                                                                }
                                                                return { name: subj.name, editalName };
                                                            })
                                                            .filter(Boolean) as {name: string, editalName: string}[];
                                                        
                                                        const isExpanded = expandedSubjects.has(us.displayName);

                                                        return (
                                                            <div 
                                                                key={primaryId} 
                                                                className={`bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] border border-emerald-500/20 rounded-2xl transition-all ${isExpanded ? 'p-3.5 ring-1 ring-emerald-500/30 shadow-lg' : 'p-2.5'}`}
                                                            >
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="space-y-2 overflow-hidden w-full">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="p-1 rounded bg-emerald-500/10 text-emerald-500 shrink-0">
                                                                                <Library size={12} />
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                value={overrideValue}
                                                                                onClick={e => e.stopPropagation()}
                                                                                onChange={e => {
                                                                                    const val = e.target.value;
                                                                                    setCycleConflict(prev => ({
                                                                                        ...prev,
                                                                                        subjectDisplayNameOverrides: { ...prev.subjectDisplayNameOverrides, [primaryId]: val }
                                                                                    }));
                                                                                }}
                                                                                title="Clique para editar o nome da matéria unificada"
                                                                                className="flex-1 min-w-0 text-sm font-bold text-foreground uppercase bg-transparent border-b border-transparent hover:border-emerald-500/30 focus:border-emerald-500 focus:outline-none transition-colors py-0.5 tracking-wide cursor-text"
                                                                            />
                                                                            <button onClick={() => toggleSubjectExpansion(us.displayName)} className="shrink-0">
                                                                                {isExpanded ? <ChevronUp size={12} className="text-emerald-500/50" /> : <ChevronDown size={12} className="text-emerald-500/50" />}
                                                                            </button>
                                                                        </div>
                                                                        <div className="flex flex-col gap-1 pl-6">
                                                                            {originalInfo.map((info, i: number) => (
                                                                                <div key={i} className="flex items-center gap-1.5 flex-wrap">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30 shrink-0" />
                                                                                    <span className="text-[10px] font-bold text-content-muted/80 truncate">
                                                                                        {info.name}
                                                                                    </span>
                                                                                    <span className="text-[8px] font-medium text-content-muted/50 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded shrink-0 truncate">
                                                                                        {info.editalName}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                                        <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                                                                            <Link size={8} />
                                                                            UNIFICADO
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Lista de Tópicos Unificados (Condicional ao Expandir) */}
                                                                {isExpanded && us.topicMappings && us.topicMappings.length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-emerald-500/10 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                                                        <div className="flex items-center gap-1.5 pl-6 mb-1 opacity-50">
                                                                            <span className="text-[8px] font-black uppercase tracking-tighter text-emerald-500/70">
                                                                                Tópicos Unificados ({us.topicMappings.length})
                                                                            </span>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 gap-1 pl-6">
                                                                            {us.topicMappings.map((tm: UnifiedTopicMapping, idx: number) => (
                                                                                <div key={idx} className="flex items-center justify-between gap-2 group/topic hover:bg-emerald-500/10 p-1 rounded-md transition-colors">
                                                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                                                        <div className="w-1 h-1 rounded-full shrink-0 bg-emerald-500/50" />
                                                                                        <span className="text-[11px] font-medium text-emerald-600/90 dark:text-emerald-400/90 truncate py-0.5">
                                                                                            {tm.displayName}
                                                                                        </span>
                                                                                    </div>
                                                                                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1 text-emerald-400 bg-emerald-400/5">
                                                                                        <Link size={7} />
                                                                                        UNIFICADO
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    {/* Standalone Subjects */}
                                                    {subjects.filter(s => cycleConflict.unificationMap?.standaloneSubjectIds.includes(s.id)).map(s => {
                                                        let editalName = 'Ciclo Atual';
                                                        if (cycleConflict.edital?.subjectIds.includes(s.id)) {
                                                            editalName = cycleConflict.edital.name;
                                                        } else {
                                                            const origin = editais.find(e => e.mergedIntoCycle && e.id !== cycleConflict.edital?.id && e.subjectIds.includes(s.id));
                                                            if (origin) editalName = origin.name;
                                                        }

                                                        return (
                                                            <div key={s.id} className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border bg-secondary/80 dark:bg-zinc-800/80 border-border dark:border-white/10 text-foreground/80 opacity-70">
                                                                <div className="flex flex-col overflow-hidden">
                                                                    <span className="text-xs font-bold truncate py-0.5">{s.name}</span>
                                                                    <span className="text-[8px] text-content-muted/60 truncate bg-black/5 dark:bg-white/5 self-start px-1.5 py-0.5 rounded mt-0.5">{editalName}</span>
                                                                </div>
                                                                <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/10 dark:bg-black/30 shrink-0 text-content-muted flex items-center gap-1">
                                                                    <FileText size={8} />
                                                                    MATÉRIA ÚNICA
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    {cycleConflict.unificationMap.unifiedSubjects.every(us => us.matchType !== 'semantic') && (
                                                        <div className="py-4 flex flex-col items-center justify-center opacity-40 grayscale border-t border-emerald-500/5 mt-2">
                                                            <Sparkles size={16} className="text-sky-500/50 mb-1" />
                                                            <span className="text-[8px] font-bold uppercase tracking-widest">Nenhuma unificação por IA sugerida</span>
                                                            <p className="text-[7px] text-center max-w-[150px] mt-0.5">As matérias do novo edital não possuem nomes suficientemente similares às atuais para uma fusão automática via IA.</p>
                                                        </div>
                                                    )}

                                                    {/* Legenda de Status */}
                                                    {cycleConflict.action === 'hybrid' && (
                                                        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-emerald-500/10 mt-2 px-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                <span className="text-[8px] font-bold text-content-muted uppercase tracking-tighter">UNIFICADO</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                                                                <span className="text-[8px] font-bold text-content-muted uppercase tracking-tighter">MATÉRIA ÚNICA</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Replace ou fallback */
                                                <div className="flex flex-col gap-2">
                                                    {subjects.filter(s => finalPreviewIds.includes(s.id)).map(s => {
                                                        const isNew = cycleConflict.edital?.subjectIds.includes(s.id);
                                                        const isCurrent = cycleConflict.existingIds.includes(s.id);
                                                        const originEdital = editais.find(e => e.subjectIds.includes(s.id) && e.mergedIntoCycle);
                                                        const newEdital = cycleConflict.edital;
                                                        const isExpanded = expandedPreviewSubjects.has(s.id);
                                                        
                                                        let style = 'bg-secondary dark:bg-zinc-800/50 border-border dark:border-white/5 text-content-muted';
                                                        let badgeStyle = 'bg-black/20';

                                                        if (cycleConflict.action === 'replace') {
                                                            if (isNew && !isCurrent) {
                                                                style = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                                                                badgeStyle = 'bg-emerald-500/20';
                                                            } else if (!isNew && isCurrent) {
                                                                style = 'bg-red-500/10 border-red-500/20 text-red-400/80 line-through opacity-50 pointer-events-none';
                                                            } else if (isNew && isCurrent) {
                                                                style = 'bg-secondary/80 dark:bg-zinc-800/80 border-border dark:border-white/10 text-foreground/70';
                                                            }
                                                        }
                                                        
                                                        const editalName = isNew && !isCurrent ? newEdital?.name : (originEdital?.name || 'Ciclo Atual');
                                                        const isImported = isNew && !isCurrent ? newEdital?.isImported : (originEdital?.isImported || false);
                                                        const sourceId = isNew && !isCurrent ? newEdital?.sourceId : (originEdital?.sourceId);
                                                        
                                                        // Badge unificado: SISTEMA . IA ou MANUAL
                                                        const typeBadge = sourceId 
                                                            ? `SISTEMA . ${isImported ? 'IA' : 'MANUAL'}` 
                                                            : isImported ? 'IA' : 'MANUAL';

                                                        return (
                                                            <div key={s.id} className="flex flex-col gap-1">
                                                                <button 
                                                                    onClick={() => togglePreviewSubjectExpansion(s.id)}
                                                                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border transition-all text-left group ${style}`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                        {!(!isNew && isCurrent && cycleConflict.action === 'replace') && (
                                                                            <ChevronDown 
                                                                                size={14} 
                                                                                className={`shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-sky-400' : 'text-content-muted group-hover:text-foreground/50'}`} 
                                                                            />
                                                                        )}
                                                                        <span className="text-[10px] font-bold truncate leading-tight">{s.name}</span>
                                                                    </div>
                                                                    <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-1 rounded-md shrink-0 whitespace-nowrap ${badgeStyle}`}>
                                                                        {typeBadge} • {editalName?.split(' - ')[0] || ''}
                                                                    </span>
                                                                </button>

                                                                {/* Tópicos Expandidos */}
                                                                {isExpanded && s.topics && s.topics.length > 0 && (
                                                                    <div className="mx-2 p-3 rounded-xl bg-black/10 dark:bg-white/5 border border-white/5 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                                                        <div className="flex items-center gap-1.5 mb-2 px-1">
                                                                            <BookOpen size={10} className="text-sky-500" />
                                                                            <span className="text-[8px] font-black text-content-muted uppercase tracking-widest">Conteúdo Programático</span>
                                                                        </div>
                                                                        <div className="flex flex-col gap-1">
                                                                            {s.topics.map(t => (
                                                                                <div key={t.id} className="flex items-center gap-2 text-[9px] text-foreground/60 leading-relaxed px-1">
                                                                                    <div className="w-1 h-1 rounded-full bg-sky-500/40 shrink-0" />
                                                                                    <span className="truncate">{t.name}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    </>

                                )}
                            </div>

                                {/* ── ETAPA 2: Topic Preview ── */}
                                {cycleConflict.step === 'topic-preview' && cycleConflict.topicMergeResult && (
                                    <>
                                        <div className="space-y-1 mb-1">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-foreground/90">
                                                Etapa 2 — Prévia de Tópicos
                                            </h4>
                                            <p className="text-[10px] text-content-muted italic">
                                                Revise como os tópicos serão unificados em cada matéria.
                                            </p>
                                        </div>
                                        <div className="relative p-4 rounded-2xl bg-secondary dark:bg-zinc-800/30 border border-border dark:border-white/5 space-y-3 max-h-[45vh] overflow-y-auto">
                                            {cycleConflict.topicMergeResult.groups.map(group => (
                                                <div key={group.subjectDisplayName} className="space-y-1.5">
                                                    <div className="flex items-center gap-2 sticky top-0 bg-secondary dark:bg-zinc-800/30 pb-1 pt-0.5 z-10">
                                                        <Library size={11} className="text-emerald-500 shrink-0" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80 truncate">
                                                            {group.subjectDisplayName}
                                                        </span>
                                                    </div>
                                                    <div className="pl-4 space-y-1">
                                                        {group.topicMappings.map((tm, i) => (
                                                            <div key={i} className="flex items-center gap-2 py-1 border-b border-border/30 last:border-0">
                                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tm.originalTopicIds.length > 1 ? 'bg-emerald-500' : 'bg-content-muted/30'}`} />
                                                                <span className="text-[10px] text-foreground/80 flex-1 truncate">{tm.displayName}</span>
                                                                {tm.originalTopicIds.length > 1 ? (
                                                                    <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                                                                        Unificado
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded shrink-0 bg-zinc-500/10 text-content-muted border border-zinc-500/10">
                                                                        Mantido
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                            {/* Actions */}
                            <div className="flex flex-col gap-2.5">
                                {cycleConflict.step === 'select' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <button
                                            onClick={handleHybridPreview}
                                            disabled={isMerging}
                                            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all group disabled:opacity-50"
                                        >
                                            <div className="flex items-center gap-3">
                                                {isMerging ? <Loader2 size={18} className="animate-spin" /> : <Merge size={18} />}
                                                <span className="text-sm font-black uppercase tracking-wider">
                                                    {isMerging ? 'Analisando...' : 'Mesclar'}
                                                </span>
                                            </div>
                                            {!isMerging && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                                        </button>

                                        <button
                                            onClick={() => setCycleConflict(prev => ({ ...prev, step: 'preview', action: 'replace' }))}
                                            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <RefreshCw size={18} />
                                                <span className="text-sm font-black uppercase tracking-wider">Substituir</span>
                                            </div>
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                ) : cycleConflict.step === 'preview' ? (
                                    // ETAPA 1 preview: confirm subjects, optionally merge topics
                                    <div className="flex flex-col gap-3">
                                        {cycleConflict.action === 'merge' && (
                                            <>
                                                <button
                                                    onClick={() => handleTopicPreview(true)}
                                                    disabled={isAnalyzingTopics}
                                                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all group disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isAnalyzingTopics ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                                        <span className="text-sm font-black uppercase tracking-wider">
                                                            {isAnalyzingTopics ? 'Analisando tópicos...' : 'Confirmar materias e mesclar topicos com IA'}
                                                        </span>
                                                    </div>
                                                    {!isAnalyzingTopics && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                                                </button>
                                                <button
                                                    onClick={() => handleCycleConflictAction('merge')}
                                                    disabled={isAnalyzingTopics || processingId === cycleConflict.edital!.id}
                                                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white transition-all group disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {processingId === cycleConflict.edital!.id
                                                            ? <Loader2 size={18} className="animate-spin" />
                                                            : <CheckCircle2 size={18} />}
                                                        <span className="text-sm font-black uppercase tracking-wider">Confirmar mesclagem das materias</span>
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
                                            className="w-full py-3 text-xs font-bold text-content-muted hover:text-foreground transition-colors uppercase tracking-widest"
                                        >
                                            ← Voltar e Alterar Escolha
                                        </button>
                                    </div>
                                ) : (
                                    // ETAPA 2 topic-preview: confirm final merge
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleCycleConflictAction('merge')}
                                            disabled={processingId === cycleConflict.edital!.id}
                                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                        >
                                            {processingId === cycleConflict.edital!.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                                            Confirmar Mesclagem Completa
                                        </button>
                                        <button
                                            onClick={() => setCycleConflict(prev => ({ ...prev, step: 'preview', topicMergeResult: undefined }))}
                                            className="w-full py-3 text-xs font-bold text-content-muted hover:text-foreground transition-colors uppercase tracking-widest"
                                        >
                                            ← Voltar para Matérias
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Progress Preservation Note */}
                            <div className="p-3.5 rounded-2xl bg-secondary dark:bg-zinc-800/30 border border-border dark:border-white/5 flex gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <Info className="text-emerald-400" size={14} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black text-foreground/90 uppercase tracking-tight">Preservação de Progresso</p>
                                    <p className="text-[10px] text-content-muted leading-snug">
                                        Seu progresso (temas concluídos e revisões) <strong className="text-emerald-500/80">nunca é perdido</strong>. Se uma matéria for removida do ciclo, seu histórico permanece salvo com segurança no banco de dados.
                                    </p>
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
