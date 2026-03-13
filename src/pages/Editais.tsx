import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
    Search, Plus, Library, Trash2, Play, Eye, CalendarDays, Clock,
    BookOpen, AlertTriangle, Merge, Unlink, X, CheckCircle2, RefreshCw, ArrowRight, Sparkles, Send
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EditalCard } from '@/components/editais/EditalCard';
import { EditalSubjectsModal } from '@/components/editais/EditalSubjectsModal';
import { SyncReviewModal } from '@/components/editais/SyncReviewModal';
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import { Subject } from '@/types';
import { errorService } from '@/lib/errors/errorService';

// ─── Tipos ─────────────────────────────────────────────────────────────────
export interface UserEdital {
    id: string;
    name: string;
    examDate?: string;
    createdAt: string;
    updatedAt: string; // Added this
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
    examDate: (row.exam_date as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string, // Added this
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
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importModalTab, setImportModalTab] = useState<'ready' | 'ia' | 'manual'>('ready');
    const [subjectsModal, setSubjectsModal] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });
    const [cycleConflict, setCycleConflict] = useState<{
        isOpen: boolean;
        edital: UserEdital | null;
        existingIds: string[];
        currentOrigins: string[];
    }>({ isOpen: false, edital: null, existingIds: [], currentOrigins: [] });
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
    const [suggestionName, setSuggestionName] = useState('');
    const [isSendingSuggestion, setIsSendingSuggestion] = useState(false);
    const [syncReview, setSyncReview] = useState<{
        isOpen: boolean;
        edital: UserEdital | null;
        localSubjects: Subject[];
        sourceSubjects: any[];
    }>({ isOpen: false, edital: null, localSubjects: [], sourceSubjects: [] });

    // ── Efeito para abrir modal baseado no estado de navegação ──
    useEffect(() => {
        if (location.state?.openImportModal) {
            setIsImportModalOpen(true);
            if (location.state?.importTab) {
                setImportModalTab(location.state.importTab);
            }
            // Limpa o estado para evitar que reabra ao atualizar a página
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // ── Fetch editais do Supabase ──
    const fetchEditais = useCallback(async () => {
        if (!user) return;
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
    }, [user]);

    const [searchParams] = useSearchParams();
    const highlightedSourceId = searchParams.get('sourceId');
    const [scrolledTo, setScrolledTo] = useState(false);

    const [publicEditais, setPublicEditais] = useState<any[]>([]);

    const fetchPublicEditais = useCallback(async () => {
        try {
            const { data, error } = await (supabase as any)
                .from('public_editais')
                .select('id, updated_at');
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
    }, [editais, searchQuery, activeFilter]);

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
        // Se ainda não temos subjects carregados, mostramos zeros mas permitimos que o React renderize novamente assim que chegarem
        if (!subjects || subjects.length === 0) {
            return { totalTopics: 0, completedTopics: 0, totalStudyMinutes: 0, subjectsCount: 0 };
        }
        
        // Garantir que edital.subjectIds seja tratado sempre como array
        const ids = Array.isArray(edital.subjectIds) ? edital.subjectIds : [];
        const editalSubjects = subjects.filter(s => ids.includes(s.id));
        
        // Se temos IDs mas não encontramos no global, pode ser delay de cache/refresh
        // Mas se o subjectsCount for zero aqui, o card mostrará vazio.
        
        const totalTopics = editalSubjects.reduce((acc, s) => acc + (s.topics?.length || 0), 0);
        const completedTopics = editalSubjects.reduce((acc, s) => acc + (s.topics?.filter(t => t.completed).length || 0), 0);
        const totalStudyMinutes = editalSubjects.reduce((acc, s) =>
            acc + (s.topics?.reduce((tAcc, t) => tAcc + (t.review_count || 0) * 25, 0) || 0), 0);
        
        return { 
            totalTopics, 
            completedTopics, 
            totalStudyMinutes, 
            subjectsCount: editalSubjects.length 
        };
    }, [subjects]);

    // ── CRUD Operations ──
    const handleDeleteEdital = useCallback(async (edital: UserEdital) => {
        setProcessingId(edital.id);
        try {
            const subjectIds = edital.subjectIds || [];
            if (subjectIds.length > 0) {
                // Identificar matérias exclusivas deste edital (não compartilhadas com outros)
                const { data: otherEditais } = await (supabase as any)
                    .from('user_editais')
                    .select('subject_ids')
                    .neq('id', edital.id)
                    .eq('user_id', user!.id);

                const allOtherIds = new Set((otherEditais || []).flatMap((e: any) => e.subject_ids || []));
                const idsToDelete = subjectIds.filter(id => !allOtherIds.has(id));

                if (idsToDelete.length > 0) {
                    // 1. Deletar tópicos ANTES das matérias (FK constraint)
                    const { error: topicsErr } = await supabase
                        .from('topics')
                        .delete()
                        .in('subject_id', idsToDelete);
                    if (topicsErr) throw topicsErr;

                    // 2. Deletar as matérias
                    const { error: subjectsErr } = await supabase
                        .from('subjects')
                        .delete()
                        .in('id', idsToDelete)
                        .eq('user_id', user!.id);
                    if (subjectsErr) throw subjectsErr;
                }
            }

            // 3. Deletar o edital
            const { error } = await editaisTable()
                .delete()
                .eq('id', edital.id)
                .eq('user_id', user!.id);
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

            // Desmarca do ciclo E zera active_subject_ids
            await editaisTable()
                .update({ merged_into_cycle: false, active_subject_ids: [] } as any)
                .eq('id', edital.id);

            setEditais(prev => prev.map(e =>
                e.id === edital.id
                    ? { ...e, mergedIntoCycle: false, activeSubjectIds: [] }
                    : e
            ));
            toast.success(`"${edital.name}" removido do seu ciclo.`);
            // Dispara atualização global para Subjects.tsx e outros
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('cycleUpdated'));
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'unloadCycle', userMessage: 'Erro ao remover edital do ciclo.' });
        } finally {
            setProcessingId(null);
        }
    }, [user]);

    const handleLoadCycle = useCallback(async (edital: UserEdital) => {
        if (!user || edital.subjectIds.length === 0) {
            toast.info('Este edital não possui matérias vinculadas.');
            return;
        }

        // Verificar se já está mesclado
        if (edital.mergedIntoCycle) {
            toast.info(`"${edital.name}" já está carregado no ciclo.`);
            return;
        }

        setProcessingId(edital.id);
        try {
            const { data: existingCycle } = await supabase
                .from('user_cycles')
                .select('id, ciclo_atual')
                .eq('user_id', user.id)
                .single();

            const existingIds = (existingCycle?.ciclo_atual as string[] | null) || [];

            // Se ciclo vazio ou não existe → carrega direto
            if (!existingCycle || existingIds.length === 0) {
                await executeCycleLoad(edital.subjectIds, 'replace');
                await markEditalMerged(edital.id, edital.subjectIds);
                toast.success(`${edital.subjectIds.length} matérias de "${edital.name}" carregadas no Ciclo de Estudos!`);
                return;
            }

            // Encontrar quais editais já estão no ciclo
            const currentOrigins: string[] = [];
            for (const e of editais) {
                if (e.id === edital.id) continue;
                const hasCommon = e.subjectIds.some(id => existingIds.includes(id));
                if (hasCommon) currentOrigins.push(e.name);
            }
            if (currentOrigins.length === 0) currentOrigins.push('Manual');

            setCycleConflict({ isOpen: true, edital, existingIds, currentOrigins });
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'loadCycle', userMessage: 'Erro ao carregar ciclo.' });
        } finally {
            setProcessingId(null);
        }
    }, [user, editais]);

    const executeCycleLoad = useCallback(async (subjectIds: string[], mode: 'replace' | 'merge') => {
        if (!user) return;
        try {
            const { data: existingCycle } = await supabase
                .from('user_cycles')
                .select('id')
                .eq('user_id', user.id)
                .single();

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
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'loadCycle', userMessage: 'Erro ao carregar ciclo.' });
        }
    }, [user]);

    const markEditalMerged = useCallback(async (editalId: string, subjectIds: string[]) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    const handleCycleConflictAction = useCallback(async (action: 'replace' | 'merge') => {
        if (!cycleConflict.edital) return;
        const edital = cycleConflict.edital;

        if (action === 'replace') {
            await executeCycleLoad(edital.subjectIds, 'replace');
            // Desmarcar todos os editais antigos como merged
            const oldMerged = editais.filter(e => e.mergedIntoCycle && e.id !== edital.id);
            for (const e of oldMerged) {
                await editaisTable().update({ merged_into_cycle: false, active_subject_ids: [] } as any).eq('id', e.id);
            }
            await markEditalMerged(edital.id, edital.subjectIds);
            toast.success(`Ciclo substituído com ${edital.subjectIds.length} matérias de "${edital.name}".`);
        } else {
            const merged = [...new Set([...cycleConflict.existingIds, ...edital.subjectIds])];
            await executeCycleLoad(merged, 'merge');
            await markEditalMerged(edital.id, edital.subjectIds);
            const newCount = merged.length - cycleConflict.existingIds.length;
            toast.success(`${newCount} nova(s) matéria(s) adicionadas ao ciclo. Total: ${merged.length}.`);
        }

        setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [] });
        await fetchEditais();
    }, [cycleConflict, executeCycleLoad, editais, markEditalMerged, fetchEditais]);

    /**
     * Importação de edital: cria matérias e tópicos REAIS no Supabase,
     * coleta os UUIDs retornados e salva o edital com esses IDs.
     */
    const handleImportDone = useCallback(async (importedSubjects: Subject[], editalName?: string, isImported: boolean = true, sourceId?: string) => {
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
                    .map(t => ({
                        subject_id: newSubject.id,
                        name: t.name,
                        completed: false,
                        review_count: 0,
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

            const { error: editalErr } = await editaisTable().insert({
                user_id: user.id,
                name: finalName,
                is_imported: isImported,
                source_id: sourceId,
                subject_ids: realSubjectIds,
                active_subject_ids: realSubjectIds,
                merged_into_cycle: false,
            } as any);
            if (editalErr) throw editalErr;

            // 4. Atualizar tudo
            await fetchEditais();
            await refreshData(); 
            
            // Forçamos o despacho do evento para garantir que outros componentes saibam da mudança
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('topicUpdated'));
            
            setIsImportModalOpen(false);
            toast.success(`Edital "${finalName}" com ${realSubjectIds.length} matéria(s) importado com sucesso!`);
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
            // 1. Buscar edital oficial
            const { data: source, error: sourceErr } = await (supabase as any)
                .from('public_editais')
                .select('*')
                .eq('id', edital.sourceId)
                .single();
            
            if (sourceErr || !source) throw new Error('Edital original não encontrado');

            // 2. Refetch preventivo: Garantir que temos as matérias/tópicos locais mais recentes
            // Isso evita descompasso caso o cache do useApp esteja frio
            console.log('Refetching local data for edital sync:', edital.id);
            const { data: localSubjects, error: localErr } = await supabase
                .from('subjects')
                .select('id, name, status, topics(id, name, completed, review_count)')
                .in('id', edital.subjectIds || []);

            if (localErr) {
                console.error('Erro no refetch local:', localErr);
            }

            setSyncReview({
                isOpen: true,
                edital: edital,
                localSubjects: (localSubjects as unknown as Subject[]) || [],
                sourceSubjects: source.subjects || []
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

            // 1. Processar Matérias Novas
            for (const ss of addedSubjects) {
                const { data: newSubj, error: nSubjErr } = await supabase
                    .from('subjects')
                    .insert({ 
                        user_id: user.id, 
                        name: ss.name || ss.title, 
                        status: 'Nova' 
                    } as any)
                    .select('id')
                    .single();
                
                if (nSubjErr || !newSubj) throw nSubjErr;
                finalSubjectIds.push(newSubj.id);

                const topicsToInsert = (ss.topics || []).map((ts: any) => ({
                    subject_id: newSubj.id,
                    name: typeof ts === 'string' ? ts : ts.name,
                    completed: false,
                    review_count: 0
                }));
                
                if (topicsToInsert.length > 0) {
                    await supabase.from('topics').insert(topicsToInsert as any);
                }
            }

            // 2. Processar Tópicos Novos em Matérias Existentes
            for (const [subjId, topics] of Object.entries(addedTopics)) {
                const topicsToInsert = topics.map(tName => ({
                    subject_id: subjId,
                    name: tName,
                    completed: false,
                    review_count: 0
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
                await supabase.from('topics').delete().in('subject_id', removedSubjIds);
                await supabase.from('subjects').delete().in('id', removedSubjIds);
                
                const idsToRemoveSet = new Set(removedSubjIds);
                const updatedFinalIds = finalSubjectIds.filter(id => !idsToRemoveSet.has(id));
                finalSubjectIds.length = 0;
                finalSubjectIds.push(...updatedFinalIds);
            }

            // 5. Finalizar atualização do edital local
            const { error: updErr } = await editaisTable().update({
                subject_ids: finalSubjectIds,
                active_subject_ids: finalSubjectIds,
                updated_at: new Date().toISOString()
            } as any).eq('id', edital.id);
            
            if (updErr) throw updErr;

            toast.success('Edital atualizado com sucesso!');
            await fetchEditais();
            await refreshData();
            window.dispatchEvent(new CustomEvent('subjectUpdated'));
            window.dispatchEvent(new CustomEvent('topicUpdated'));

        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'sync-apply', userMessage: 'Erro ao aplicar atualizações.' });
        } finally {
            setProcessingId(null);
            setSyncReview(prev => ({ ...prev, isOpen: false }));
        }
    };

    // ── Loading ──
    if (isLoading || loadingEditais) return <LoadingSpinner size="large" />;

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6">
            {/* ── Cabeçalho Principal ── */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Filtros e Busca */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                        {/* Busca */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar edital..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-zinc-900/40 border border-white/5 rounded-2xl pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-primary/40 transition-all text-content-main placeholder:text-content-muted/50"
                            />
                        </div>

                        {/* Filtros de Tipo */}
                        <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-white/5 h-11">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'imported', label: 'Importados' },
                                { id: 'manual', label: 'Criados' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFilter(f.id as any)}
                                    className={`px-4 h-full rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeFilter === f.id 
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                            : 'text-content-muted hover:text-content-main'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-3 shrink-0">
                        <AnimatePresence>
                            {selectedIds.size >= 2 && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={handleMerge}
                                    disabled={isMerging}
                                    className="flex items-center gap-2 h-11 px-5 bg-violet-500 hover:bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
                                >
                                    {isMerging ? (
                                        <RefreshCw size={16} className="animate-spin" />
                                    ) : (
                                        <Merge size={16} />
                                    )}
                                    Mesclar ({selectedIds.size})
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                            <Plus size={18} />
                            Adicionar Edital
                        </button>
                    </div>
                </div>

                {/* Sub-header info (opcional, bem discreto agora) */}
                <div className="flex items-center gap-4 text-[10px] font-bold text-content-muted uppercase tracking-[0.2em] px-1">
                    <span>{filteredEditais.length} Concursos Encontrados</span>
                    {selectedIds.size > 0 && (
                        <span className="text-violet-400">• {selectedIds.size} selecionados</span>
                    )}
                </div>
            </div>

            {/* ── Grid de Cards / Empty State ── */}
            {filteredEditais.length === 0 ? (
                <div className="glow-card p-12 md:p-20 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <Library className="text-primary" size={36} />
                    </div>
                    {editais.length === 0 || searchQuery.trim() ? (
                        <>
                            <h2 className="text-xl font-bold text-foreground tracking-tight mb-2">
                                Não encontramos concursos para "{searchQuery}"
                            </h2>
                            <p className="text-sm text-content-muted mb-8 max-w-md font-medium">
                                Se você não encontrou o concurso que procura, pode sugerir a inclusão para nossa equipe!
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
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
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    <Plus size={18} />
                                    Cadastrar Manualmente
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold text-foreground tracking-tight mb-2">
                                Nenhum edital cadastrado
                            </h2>
                            <p className="text-sm text-content-muted mb-6 max-w-md font-medium">
                                Importe um edital pronto da plataforma, use nossa IA para estruturar ou crie manualmente para começar a estudar.
                            </p>
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Plus size={18} />
                                Importar/Cadastrar editais
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredEditais.map(edital => {
                        const metrics = getEditalMetrics(edital);
                        const daysLeft = getDaysUntilExam(edital.examDate);
                        
                        // Verificar se há atualização na fonte (comparação robusta com timestamp numérico)
                        const source = publicEditais.find(p => p.id === edital.sourceId);
                        const sourceTime = source ? new Date(source.updated_at).getTime() : 0;
                        const localCreatedTime = new Date(edital.createdAt).getTime();
                        const localUpdatedTime = edital.updatedAt ? new Date(edital.updatedAt).getTime() : localCreatedTime;
                        
                        const hasUpdate = source && sourceTime > localCreatedTime && sourceTime > localUpdatedTime;

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
                                    isHighlighted={edital.sourceId === highlightedSourceId || edital.id === highlightedSourceId}
                                    onToggleSelect={() => setSelectedIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(edital.id)) next.delete(edital.id);
                                        else next.add(edital.id);
                                        return next;
                                    })}
                                    onViewSubjects={() => setSubjectsModal({ isOpen: true, edital })}
                                    onLoadCycle={() => handleLoadCycle(edital)}
                                    onUnloadCycle={() => handleUnloadCycle(edital)}
                                    onDelete={() => setDeleteConfirm({ isOpen: true, edital })}
                                    onSync={() => handleSyncEdital(edital)}
                                    hasUpdate={!!hasUpdate}
                                    isProcessing={processingId === edital.id}
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
                            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-zinc-950 border-l border-white/10 z-[120] p-6 shadow-2xl overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                                        <Sparkles className="text-primary" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white tracking-tight">Sugerir Edital</h2>
                                        <p className="text-xs text-zinc-400">Solicite a inclusão de um concurso</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsSuggestionOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors"
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
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">
                                        Nome do Concurso/Edital
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: PC-ES 2024, INSS, Receita Federal..."
                                        value={suggestionName}
                                        onChange={(e) => setSuggestionName(e.target.value)}
                                        className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm text-white focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all"
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
                onClose={() => setIsImportModalOpen(false)}
                initialTab={importModalTab}
                subjects={subjects}
                onImport={handleImportDone}
            />

            {/* ── Modal Ver Matérias ── */}
            {subjectsModal.edital && (
                <EditalSubjectsModal
                    isOpen={subjectsModal.isOpen}
                    onClose={() => setSubjectsModal({ isOpen: false, edital: null })}
                    edital={subjectsModal.edital}
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
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[28px] p-8 shadow-2xl"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                    <Trash2 className="text-red-400" size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-content-main tracking-tight">Excluir Edital</h3>
                                    <p className="text-xs text-content-muted mt-0.5">
                                        {deleteConfirm.edital.isImported
                                            ? 'O edital original da plataforma não será afetado.'
                                            : 'Esta ação é permanente e não pode ser desfeita.'}
                                    </p>
                                </div>
                            </div>
                                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                                    Tem certeza que deseja excluir o edital <strong>"{deleteConfirm.edital.name}"</strong>?
                                    <br /><br />
                                    {deleteConfirm.edital.isImported ? (
                                        <span className="text-sky-400/90 flex items-start gap-2">
                                            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                                            Este edital foi importado do sistema e poderá ser importado novamente mais tarde se desejar.
                                        </span>
                                    ) : (
                                        <span className="text-amber-400/90 flex items-start gap-2">
                                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                            Este edital foi criado manualmente. A exclusão removerá permanentemente todos os registros de estudo vinculados.
                                        </span>
                                    )}
                                </p>
                                <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm({ isOpen: false, edital: null })}
                                    disabled={processingId === deleteConfirm.edital.id}
                                    className="flex-1 py-3 bg-zinc-800 text-content-muted font-bold rounded-xl hover:bg-zinc-700 transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDeleteEdital(deleteConfirm.edital!)}
                                    disabled={processingId === deleteConfirm.edital.id}
                                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processingId === deleteConfirm.edital.id ? (
                                        <RefreshCw size={16} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                    Excluir
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* ── Modal: Conflito de Ciclo ── */}
                {cycleConflict.isOpen && cycleConflict.edital && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [] })}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[28px] shadow-2xl p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="text-amber-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Ciclo já possui matérias</h3>
                                </div>
                            </div>

                            {/* Info: o que já está no ciclo */}
                            <div className="mb-4 p-3 rounded-xl bg-zinc-800/60 border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-content-muted uppercase tracking-widest font-bold">Atualmente no ciclo</span>
                                    <span className="text-[11px] font-bold text-zinc-300">{cycleConflict.existingIds.length} matérias</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1 max-h-40 overflow-y-auto custom-scrollbar">
                                    {subjects.filter(s => cycleConflict.existingIds.includes(s.id)).map(s => (
                                        <span key={s.id} className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Info: o que será adicionado */}
                            <div className="mb-5 p-4 rounded-xl bg-zinc-800/60 border border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-content-muted uppercase tracking-widest font-bold">Novo edital</span>
                                    <span className="text-[11px] font-bold text-zinc-300">{cycleConflict.edital.subjectIds.length} matérias</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[10px] font-bold text-emerald-300/80 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/15 inline-block">
                                        {cycleConflict.edital.name}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto no-scrollbar pt-1 border-t border-white/5">
                                    {cycleConflict.edital.subjectIds.map(sid => {
                                        const s = subjects.find(subj => subj.id === sid);
                                        return s ? (
                                            <span key={sid} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-content-muted border border-white/5">
                                                {s.name}
                                            </span>
                                        ) : null;
                                    })}
                                    {cycleConflict.edital.subjectIds.length === 0 && (
                                        <span className="text-[9px] text-content-muted italic">Nenhuma matéria encontrada</span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2.5 mb-5">
                                <button
                                    onClick={() => handleCycleConflictAction('replace')}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-zinc-800 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                                        <RefreshCw size={16} className="text-red-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <span className="text-sm font-bold text-zinc-100 block">Substituir</span>
                                        <span className="text-[11px] text-content-muted">Remove as matérias atuais e carrega as do edital</span>
                                    </div>
                                    <ArrowRight size={14} className="text-content-muted group-hover:text-red-400 transition-colors" />
                                </button>

                                <button
                                    onClick={() => handleCycleConflictAction('merge')}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-zinc-800 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                        <Merge size={16} className="text-emerald-400" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <span className="text-sm font-bold text-zinc-100 block">Mesclar</span>
                                        <span className="text-[11px] text-content-muted">Adiciona as novas matérias sem remover as existentes</span>
                                    </div>
                                    <ArrowRight size={14} className="text-content-muted group-hover:text-emerald-400 transition-colors" />
                                </button>
                            </div>

                            <button
                                onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [] })}
                                className="w-full py-2.5 text-xs font-bold text-content-muted hover:text-zinc-100 transition-colors uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
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
        </div>
    );
};

export default Editais;
