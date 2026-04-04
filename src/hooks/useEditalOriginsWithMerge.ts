import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { mergeService } from '@/services/mergeService';
import type { SubjectMerge } from '@/types/merges';

interface EditalOriginData {
    id: string;
    name: string;
    subject_ids: string[];
    active_subject_ids: string[];
    is_imported: boolean;
    merged_into_cycle: boolean;
    source_id?: string;
}

export const useEditalOriginsWithMerge = () => {
    const { user } = useAuth();
    const [editaisData, setEditaisData] = useState<EditalOriginData[]>([]);
    const [unificationMap, setUnificationMap] = useState<any>(null);
    const [subjectMerges, setSubjectMerges] = useState<SubjectMerge[]>([]);

    const editaisTable = useCallback(() => (supabase as any).from('user_editais'), []);

    const loadMerges = useCallback(async () => {
        if (!user) return;
        try {
            const merges = await mergeService.getActiveSubjectMerges(user.id);
            setSubjectMerges(merges);
        } catch (err) {
            console.error('[useEditalOriginsWithMerge] Error fetching merges:', err);
        }
    }, [user]);

    const fetchEditais = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await editaisTable()
                .select('id, name, subject_ids, active_subject_ids, is_imported, merged_into_cycle, source_id')
                .eq('user_id', user.id);

            if (error) throw error;
            const parsedEditais = (data || []).map((row: any) => ({
                id: row.id,
                name: row.name,
                subject_ids: row.subject_ids || [],
                active_subject_ids: row.active_subject_ids || [],
                is_imported: row.is_imported,
                merged_into_cycle: row.merged_into_cycle || false,
                source_id: row.source_id,
            }));
            setEditaisData(parsedEditais);
        } catch (err) {
            console.error('[useEditalOriginsWithMerge] Error fetching origins:', err);
        }
    }, [user, editaisTable]);

    const fetchUnificationMap = useCallback(async () => {
        if (!user) return;
        try {
            const { data } = await (supabase as any)
                .from('user_cycles')
                .select('unification_map')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .limit(1)
                .maybeSingle();
            setUnificationMap(data?.unification_map || null);
        } catch (err) {
            console.error('[useEditalOriginsWithMerge] Error fetching unification map:', err);
        }
    }, [user]);

    useEffect(() => { fetchEditais(); }, [fetchEditais]);
    useEffect(() => { fetchUnificationMap(); }, [fetchUnificationMap]);
    useEffect(() => { loadMerges(); }, [loadMerges]);

    useEffect(() => {
        const handler = () => { 
            fetchEditais(); 
            fetchUnificationMap(); 
            loadMerges();
        };
        window.addEventListener('subjectUpdated', handler);
        window.addEventListener('mergeUpdated', handler);
        window.addEventListener('cycleUpdated', handler);
        return () => {
            window.removeEventListener('subjectUpdated', handler);
            window.removeEventListener('mergeUpdated', handler);
            window.removeEventListener('cycleUpdated', handler);
        };
    }, [fetchEditais, fetchUnificationMap, loadMerges]);

    const getAllOriginalSubjectIds = useCallback((subjectId: string): string[] => {
        // Primeiro, verificar na tabela subject_merges (nova forma)
        for (const merge of subjectMerges) {
            if (merge.primary_subject_id === subjectId) {
                return [merge.primary_subject_id, ...(merge.merged_subject_ids || [])];
            }
            if (merge.merged_subject_ids?.includes(subjectId)) {
                return [merge.primary_subject_id, ...merge.merged_subject_ids];
            }
        }
        // Fallback para unification_map (forma antiga)
        if (!unificationMap?.unifiedSubjects) return [subjectId];
        for (const unified of unificationMap.unifiedSubjects) {
            if (unified.originalSubjectIds?.includes(subjectId)) {
                return unified.originalSubjectIds;
            }
        }
        return [subjectId];
    }, [subjectMerges, unificationMap]);

    const originsMap = useMemo(() => {
        const map = new Map<string, { name: string; isImported: boolean; sourceId?: string }[]>();
        
        // Adicionar origens de TODOS os editais carregados (não filtrar por merged_into_cycle)
        for (const edital of editaisData) {
            for (const subjectId of edital.subject_ids) {
                const existing = map.get(subjectId) || [];
                if (!existing.some(e => e.name === edital.name)) {
                    map.set(subjectId, [...existing, { name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id }]);
                }
            }
        }
        
        // Segundo, para subjects mesclados, propagar origens para o ID primário
        for (const merge of subjectMerges) {
            const primaryId = merge.primary_subject_id;
            const mergedIds = merge.merged_subject_ids || [];
            const allIds = [primaryId, ...mergedIds];
            
            // Coletar todas as origens de todos os IDs do grupo
            const allOrigins: { name: string; isImported: boolean; sourceId?: string }[] = [];
            for (const id of allIds) {
                const origins = map.get(id) || [];
                for (const origin of origins) {
                    if (!allOrigins.some(e => e.name === origin.name)) {
                        allOrigins.push(origin);
                    }
                }
            }
            
            // Associar todas as origens ao ID primário
            if (allOrigins.length > 0) {
                map.set(primaryId, allOrigins);
            }
        }
        
        return map;
    }, [editaisData, subjectMerges]);

    const getOriginsForSubject = useCallback((subjectId: string, contextualEditalId?: string) => {
        // Obter TODOS os IDs originais desta matéria (considerando mesclagem)
        const allOriginalIds = getAllOriginalSubjectIds(subjectId);
        
        // Buscar origens para TODOS os IDs originais do grupo mesclado
        const allOrigins: { name: string; isImported: boolean; sourceId?: string }[] = [];
        for (const originalId of allOriginalIds) {
            const origins = originsMap.get(originalId) || [];
            for (const origin of origins) {
                if (!allOrigins.some(e => e.name === origin.name)) {
                    allOrigins.push(origin);
                }
            }
        }
        
        // Se tem contextualEditalId e ainda não encontrou origens, adicionar esse edital
        if (allOrigins.length === 0 && contextualEditalId) {
            const edital = editaisData.find(e => e.id === contextualEditalId);
            if (edital) {
                return [{ name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id }];
            }
        }
        
        return allOrigins;
    }, [editaisData, originsMap, getAllOriginalSubjectIds]);

    const editaisNoCiclo = useMemo(() => editaisData.filter(e => e.merged_into_cycle), [editaisData]);

    const activeSubjectIdsSet = useMemo(() => {
        const set = new Set<string>();
        for (const edital of editaisNoCiclo) {
            const actives = edital.active_subject_ids.length > 0 ? edital.active_subject_ids : edital.subject_ids;
            for (const id of actives) set.add(id);
        }
        return set;
    }, [editaisNoCiclo]);

    return { originsMap, editaisData, editaisNoCiclo, activeSubjectIdsSet, getOriginsForSubject, refresh: fetchEditais };
};
