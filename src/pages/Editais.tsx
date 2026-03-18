import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
    Search, Plus, Library, Trash2, Play, Eye, CalendarDays, Clock,
    BookOpen, AlertTriangle, Merge, Unlink, X, CheckCircle2, RefreshCw, ArrowRight, Sparkles, Send, Loader2,
    AlertCircle, Info, GraduationCap, Target
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

// ─── Tipos ─────────────────────────────────────────────────────────────────
export interface UserEdital {
    id: string;
    name: string;
    organ?: string; // Added
    position?: string; // Added
    year?: string; // Added
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
    organ: (row.organ as string) || undefined, // Added
    position: (row.position as string) || undefined, // Added
    year: (row.year as string) || undefined, // Added
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
        currentOrigins: string[];
        step: 'select' | 'preview';
        action: 'merge' | 'replace' | null;
    }>({ 
        isOpen: false, 
        edital: null, 
        existingIds: [], 
        currentOrigins: [], 
        step: 'select', 
        action: null 
    });
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
    const [editModal, setEditModal] = useState<{ isOpen: boolean; edital: UserEdital | null }>({ isOpen: false, edital: null });

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
            const subjectIds = edital.subjectIds || [];
            if (subjectIds.length > 0) {
                // Identificar matérias exclusivas deste edital (não compartilhadas com outros)
                const { data: otherEditais } = await editaisTable()
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
            const origins = new Set<string>();
            for (const e of editais) {
                if (e.id === edital.id) continue;
                // Se algum subject ID do edital 'e' está no ciclo atual, ele é uma origem
                const hasCommon = e.subjectIds.some(id => realExistingIds.includes(id));
                if (hasCommon) {
                    origins.add(e.name);
                }
            }
            
            // Se há IDs existentes no ciclo mas nenhuma origem de edital foi encontrada, é "Manual"
            if (origins.size === 0 && realExistingIds.length > 0) {
                origins.add('Manual');
            }

            // SEMPRE mostrar o modal (seja conflito ou carga inicial) para confirmação
            setCycleConflict({
                isOpen: true,
                edital: edital,
                existingIds: realExistingIds,
                currentOrigins: Array.from(origins),
                step: realExistingIds.length > 0 ? 'select' : 'preview',
                action: realExistingIds.length > 0 ? null : 'replace'
            });
        } catch (err) {
            errorService.report(err, { module: 'editais', action: 'loadCycle', userMessage: 'Erro ao preparar carga do ciclo.' });
        } finally {
            setProcessingId(null);
        }
    }, [user, editais, subjects]);

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
        // Sempre incluímos as existentes para poder mostrar o "diff" (o que sai e o que entra)
        return [...new Set([...cycleConflict.existingIds, ...cycleConflict.edital.subjectIds])];
    }, [cycleConflict]);

    const handleCycleConflictAction = useCallback(async (action: 'replace' | 'merge') => {
        if (!cycleConflict.edital) return;
        const edital = cycleConflict.edital;
        setProcessingId(edital.id);

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
                    .eq('user_id', user!.id);

                toast.success(`Ciclo substituído com sucesso por "${edital.name}".`);
            } else {
                // Mescla: une os IDs atuais com os novos
                const mergedIds = [...new Set([...cycleConflict.existingIds, ...edital.subjectIds])];
                await markEditalMerged(edital.id, edital.subjectIds);
                const addedCount = mergedIds.length - cycleConflict.existingIds.length;
                toast.success(`${addedCount} nova(s) matérias mescladas ao seu ciclo.`);
            }
            
            setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null });
            await fetchEditais();
            await refreshData();
        } catch (err) {
            errorService.report(err, { module: 'cycle', action: 'conflict_resolution', userMessage: 'Erro ao processar ação no ciclo.' });
        } finally {
            setProcessingId(null);
        }
    }, [cycleConflict, executeCycleLoad, editais, markEditalMerged, fetchEditais, refreshData]);

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

            const { data: newEditalRow, error: editalErr } = await editaisTable().insert({
                user_id: user.id,
                name: finalName,
                is_imported: isImported,
                source_id: sourceId,
                subject_ids: realSubjectIds,
                active_subject_ids: realSubjectIds,
                merged_into_cycle: false,
            } as any).select().single();

            if (editalErr) throw editalErr;

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
                                className="w-full h-11 bg-secondary border border-border dark:border-white/5 rounded-2xl pl-12 pr-4 text-sm font-medium focus:outline-none focus:border-primary/40 transition-all text-foreground placeholder:text-content-muted/50 shadow-sm"
                            />
                        </div>

                        {/* Filtros de Tipo */}
                        <div className="flex bg-secondary p-1 rounded-xl border border-border h-11">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'imported', label: 'Importados' },
                                { id: 'manual', label: 'Criados' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFilter(f.id as 'all' | 'imported' | 'manual')}
                                    className={`px-4 h-full rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeFilter === f.id 
                                            ? 'bg-card text-foreground shadow-sm' 
                                            : 'text-content-muted hover:text-foreground'
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
            
            {/* Banner de Alerta Amigável (Ciclo Vazio) */}
            {editais.length > 0 && !editais.some(e => e.mergedIntoCycle) && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4 text-orange-600 dark:text-orange-400 animate-pulse-subtle"
                >
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold leading-tight">
                            Você tem editais cadastrados, mas nenhum está carregado no seu ciclo ativo de estudos.
                        </p>
                        <p className="text-xs font-medium opacity-80">
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
                    className="glow-card p-12 md:p-24 flex flex-col items-center justify-center text-center border border-border bg-card shadow-xl rounded-[2.5rem] overflow-hidden relative"
                >
                    {/* Elementos Decorativos de Fundo */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />

                    <div className="relative">
                        <div className="w-24 h-24 bg-secondary dark:bg-white/5 rounded-3xl flex items-center justify-center mb-8 mx-auto rotate-3 shadow-inner group-hover:rotate-0 transition-transform duration-500">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-sm">
                                <Library className="text-primary" size={40} />
                            </div>
                        </div>
                    </div>

                    {editais.length === 0 ? (
                        <div className="max-w-xl mx-auto space-y-6 relative">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight mb-4">
                                    Vamos começar sua aprovação?
                                </h2>
                                <p className="text-base text-content-muted leading-relaxed font-medium">
                                    Parece que você ainda não tem nenhum edital. <br className="hidden md:block" />
                                    Importe um edital pronto da nossa biblioteca ou use nossa IA para estruturar um do zero!
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-500/25 hover:-translate-y-1 active:scale-95"
                                >
                                    <Plus size={20} />
                                    Importar Primeiro Edital
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setSuggestionName("");
                                        setIsSuggestionOpen(true);
                                    }}
                                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-secondary dark:bg-white/5 text-foreground hover:bg-secondary/80 border border-border dark:border-white/10 text-sm font-black uppercase tracking-widest rounded-2xl transition-all hover:-translate-y-1 active:scale-95"
                                >
                                    <Sparkles className="text-primary" size={18} />
                                    Sugerir Concurso
                                </button>
                            </div>

                            <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { icon: GraduationCap, title: 'Foco Total', desc: 'Conteúdo organizado' },
                                    { icon: Target, title: 'Ciclos IA', desc: 'Estudo adaptativo' },
                                    { icon: Clock, title: 'Evolução', desc: 'Acompanhe seu progresso' }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-secondary dark:bg-white/5 flex items-center justify-center mb-1">
                                            <item.icon size={14} className="text-primary/60" />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">{item.title}</h3>
                                        <p className="text-[10px] text-content-muted font-medium">{item.desc}</p>
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
                        
                        // Verificar se há atualização na fonte (comparação robusta com timestamp numérico)
                        const source = publicEditais.find(p => p.id === edital.sourceId);
                        const sourceTime = source ? new Date(source.updated_at).getTime() : 0;
                        const localCreatedTime = new Date(edital.createdAt).getTime();
                        const localUpdatedTime = edital.updatedAt ? new Date(edital.updatedAt).getTime() : localCreatedTime;
                        
                        const hasUpdate = source && sourceTime > localCreatedTime && sourceTime > localUpdatedTime;

                        // Variáveis para o SyncReviewModal (para evitar o erro de lint)
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
                                    onSync={() => setSyncReview({ 
                                        isOpen: true, 
                                        edital, 
                                        localSubjects: editalSubjects, 
                                        sourceSubjects: source?.subjects || [] 
                                    })}
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
                onClose={() => setIsImportModalOpen(false)}
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
                                    <Unlink className="text-amber-400" size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-content-main tracking-tight">Remover do Ciclo</h3>
                                    <p className="text-xs text-content-muted mt-0.5">
                                        As matérias deste edital deixarão de aparecer no seu ciclo de estudos.
                                    </p>
                                </div>
                            </div>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
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
                            </p>
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
                            onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null })}
                            className="absolute inset-0 bg-black/40 dark:bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-2xl bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-[28px] shadow-2xl p-7 flex flex-col gap-6"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cycleConflict.step === 'preview' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                        {cycleConflict.step === 'preview' ? (
                                            <CheckCircle2 className="text-emerald-400" size={24} />
                                        ) : (
                                            <AlertTriangle className="text-amber-400" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                                            {cycleConflict.existingIds.length === 0 
                                                ? 'Novo Ciclo' 
                                                : (cycleConflict.step === 'select' ? 'Gerenciar Ciclo' : 'Confirmar Ação')}
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
                                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                {cycleConflict.existingIds.length} matérias
                                            </span>
                                        </div>
                                        <div className="p-3.5 rounded-2xl bg-secondary border border-border space-y-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                {cycleConflict.currentOrigins.map((origin, i) => (
                                                    <span key={i} className="text-[9px] font-bold text-content-muted bg-card px-2 py-1 rounded-lg border border-border">
                                                        {origin}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {subjects.filter(s => cycleConflict.existingIds.includes(s.id)).slice(0, 8).map(s => (
                                                    <span key={s.id} className="text-[9px] font-medium text-content-muted bg-card/50 px-1.5 py-0.5 rounded-md border border-border/10">
                                                        {s.name}
                                                    </span>
                                                ))}
                                                {cycleConflict.existingIds.length > 8 && (
                                                    <span className="text-[9px] font-bold text-content-muted/60 px-1.5 py-0.5">+{cycleConflict.existingIds.length - 8}</span>
                                                )}
                                            </div>
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
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                                <span className="text-xs font-bold text-foreground uppercase">{cycleConflict.edital.name}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {cycleConflict.edital.subjectIds.slice(0, 10).map(sid => {
                                                    const s = subjects.find(subj => subj.id === sid);
                                                    return s ? (
                                                        <span key={sid} className="text-[9px] font-medium text-emerald-400/70 bg-emerald-400/5 px-2 py-0.5 rounded-md border border-emerald-500/10">
                                                            {s.name}
                                                        </span>
                                                    ) : null;
                                                })}
                                                {cycleConflict.edital.subjectIds.length > 10 && (
                                                    <span className="text-[9px] font-bold text-emerald-600/60 px-1.5 py-0.5">+{cycleConflict.edital.subjectIds.length - 10}</span>
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
                                            <p className="text-[10px] text-content-muted italic">
                                                {cycleConflict.existingIds.length === 0
                                                    ? 'Carregando matérias do edital selecionado.'
                                                    : (cycleConflict.action === 'merge' 
                                                        ? 'Unindo as matérias atuais com as do novo edital.'
                                                        : 'Limpando o ciclo atual e carregando as matérias do novo edital.')}
                                            </p>
                                        </div>

                                        {/* Seção: Origem da Mudança (Resumo dos Editais) */}
                                        <div className="px-4 py-3 rounded-2xl bg-secondary border border-border space-y-2">
                                            {cycleConflict.action === 'merge' ? (
                                                <div className="flex flex-col gap-1.5">
                                                    {cycleConflict.existingIds.length > 0 && (
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[9px] font-black text-content-muted uppercase tracking-[0.2em] w-20 shrink-0">Atualmente</span>
                                                            <span className="text-[10px] text-foreground font-medium truncate">
                                                                {cycleConflict.currentOrigins.map(o => o.replace(/\s-\s/g, ' • ')).join(' + ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] w-20 shrink-0">Resultado</span>
                                                        <span className="text-[10px] text-foreground font-black truncate uppercase tracking-tight">
                                                            {[...cycleConflict.currentOrigins.map(o => o.replace(/\s-\s/g, ' • ')), cycleConflict.edital.name.replace(/\s-\s/g, ' • ')].join(' + ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1.5">
                                                    {cycleConflict.existingIds.length > 0 && (
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[9px] font-black text-content-muted uppercase tracking-[0.2em] w-20 shrink-0">Saindo</span>
                                                            <span className="text-[10px] text-rose-500/70 font-medium truncate">
                                                                {cycleConflict.currentOrigins.length > 0 
                                                                    ? cycleConflict.currentOrigins.map(o => o.replace(/\s-\s/g, ' • ')).join(' + ') 
                                                                    : 'Manual'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] w-20 shrink-0">Entrando</span>
                                                        <span className="text-[10px] text-foreground font-black truncate uppercase tracking-tight">
                                                            {cycleConflict.edital.name.replace(/\s-\s/g, ' • ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 rounded-2xl bg-secondary dark:bg-zinc-800/30 border border-border dark:border-white/5 flex flex-wrap gap-1.5">
                                            {subjects.filter(s => finalPreviewIds.includes(s.id)).map(s => {
                                                const isNew = cycleConflict.edital?.subjectIds.includes(s.id);
                                                const isCurrent = cycleConflict.existingIds.includes(s.id);
                                                
                                                let style = 'bg-secondary dark:bg-zinc-800/50 border-border dark:border-white/5 text-content-muted';
                                                
                                                if (cycleConflict.action === 'replace') {
                                                    if (isNew && !isCurrent) {
                                                        style = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                                                    } else if (!isNew && isCurrent) {
                                                        style = 'bg-red-500/10 border-red-500/20 text-red-400/80 line-through';
                                                    } else if (isNew && isCurrent) {
                                                        style = 'bg-secondary/80 dark:bg-zinc-800/80 border-border dark:border-white/10 text-foreground/70';
                                                    }
                                                } else {
                                                    // Merge
                                                    if (isNew && !isCurrent) {
                                                        style = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                                                    }
                                                }

                                                return (
                                                    <span key={s.id} className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all ${style}`}>
                                                        {s.name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2.5">
                                {cycleConflict.step === 'select' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setCycleConflict(prev => ({ ...prev, step: 'preview', action: 'merge' }))}
                                            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Merge size={18} />
                                                <span className="text-sm font-black uppercase tracking-wider">Mesclar</span>
                                            </div>
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleCycleConflictAction(cycleConflict.action!)}
                                            disabled={processingId === cycleConflict.edital.id}
                                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                        >
                                            {processingId === cycleConflict.edital.id ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <CheckCircle2 size={18} />
                                            )}
                                            {cycleConflict.existingIds.length === 0 
                                                ? 'Criar Ciclo de Estudos' 
                                                : (cycleConflict.action === 'merge' ? 'Confirmar Mesclagem' : 'Confirmar Substituição')}
                                        </button>
                                        
                                        {cycleConflict.existingIds.length > 0 && (
                                            <button
                                                onClick={() => setCycleConflict(prev => ({ ...prev, step: 'select', action: null }))}
                                                className="w-full py-3 text-xs font-bold text-content-muted hover:text-foreground transition-colors uppercase tracking-widest"
                                            >
                                                Voltar e Alterar Escolha
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Progress Preservation Note */}
                            <div className="p-3 rounded-2xl bg-secondary dark:bg-zinc-800/20 border border-border dark:border-white/5 flex gap-3">
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

                            <button
                                onClick={() => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null })}
                                className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-content-muted hover:text-foreground transition-colors"
                            >
                                Cancelar e Fechar
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
