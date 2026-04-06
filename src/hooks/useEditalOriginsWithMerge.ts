import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { mergeService } from '@/services/mergeService';
import type { SubjectMerge, TopicMerge } from '@/types/merges';

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
    const [topicMerges, setTopicMerges] = useState<TopicMerge[]>([]);

    const editaisTable = useCallback(() => (supabase as any).from('user_editais'), []);

    const loadMerges = useCallback(async () => {
        if (!user) return;
        try {
            const [sMerges, tMerges] = await Promise.all([
                mergeService.getActiveSubjectMerges(user.id),
                mergeService.getActiveTopicMerges(user.id)
            ]);
            setSubjectMerges(sMerges);
            setTopicMerges(tMerges);
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
        
        // Primeiro: adicionar origens baseadas nos editais carregados
        for (const edital of editaisData) {
            for (const subjectId of edital.subject_ids) {
                const existing = map.get(subjectId) || [];
                if (!existing.some(e => e.name === edital.name)) {
                    map.set(subjectId, [...existing, { name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id }]);
                }
            }
        }
        
        // Segundo: para subjects mesclados, propagar origens de TODOS os IDs do grupo
        for (const merge of subjectMerges) {
            const primaryId = merge.primary_subject_id;
            const mergedIds = merge.merged_subject_ids || [];
            const sourceEditalIdsFromMerge = merge.source_edital_ids || []; 
            const allIds = [primaryId, ...mergedIds];
            
            const allOrigins: { name: string; isImported: boolean; sourceId?: string }[] = [];
            
            if (sourceEditalIdsFromMerge.length > 0) {
                for (const editalId of sourceEditalIdsFromMerge) {
                    const edital = editaisData.find(e => e.id === editalId);
                    if (edital) {
                        if (!allOrigins.some(e => e.name === edital.name)) {
                            allOrigins.push({ name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id });
                        }
                    }
                }
            }

            for (const id of allIds) {
                const origins = map.get(id) || [];
                for (const origin of origins) {
                    if (!allOrigins.some(e => e.name === origin.name)) {
                        allOrigins.push(origin);
                    }
                }
            }
            
            if (allOrigins.length === 0 && mergedIds.length > 0) {
                for (const id of allIds) {
                    for (const edital of editaisData) {
                        if (edital.subject_ids.includes(id)) {
                            if (!allOrigins.some(e => e.name === edital.name)) {
                                allOrigins.push({ name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id });
                            }
                        }
                    }
                }
            }
            
            // PROPAGAR para TODOS os IDs do grupo
            if (allOrigins.length > 0) {
                for (const id of allIds) {
                    map.set(id, allOrigins);
                }
            }
        }
        
        return map;
    }, [editaisData, subjectMerges]);

    const topicOriginsMap = useMemo(() => {
        const map = new Map<string, { name: string; isImported: boolean; sourceId?: string }[]>();
        
        for (const edital of editaisData) {
            // Tópicos não têm ID no user_edital, então a descoberta é via IDs de matérias se não houver merge
        }

        for (const merge of topicMerges) {
            const primaryId = merge.primary_topic_id;
            const mergedIds = merge.merged_topic_ids || [];
            const sourceEditalIdsFromMerge = merge.source_edital_ids || [];
            const allIds = [primaryId, ...mergedIds];

            const allOrigins: { name: string; isImported: boolean; sourceId?: string }[] = [];

            if (sourceEditalIdsFromMerge.length > 0) {
                for (const editalId of sourceEditalIdsFromMerge) {
                    const edital = editaisData.find(e => e.id === editalId);
                    if (edital) {
                        if (!allOrigins.some(e => e.name === edital.name)) {
                            allOrigins.push({ name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id });
                        }
                    }
                }
            }

            if (allOrigins.length > 0) {
                for (const id of allIds) {
                    map.set(id, allOrigins);
                }
            }
        }
        return map;
    }, [editaisData, topicMerges]);

    const getOriginsForSubject = useCallback((subjectId: string, contextualEditalId?: string) => {
        const origins = originsMap.get(subjectId) || [];
        
        if (origins.length === 0 && contextualEditalId) {
            const edital = editaisData.find(e => e.id === contextualEditalId);
            if (edital) {
                return [{ name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id }];
            }
        }
        
        return origins;
    }, [editaisData, originsMap]);

    const getOriginsForTopic = useCallback((topicId: string, subjectId: string) => {
        // 1. Tentar mapa de tópicos (se houve merge de tópico no banco)
        const topicOrigins = topicOriginsMap.get(topicId);
        if (topicOrigins && topicOrigins.length > 0) return topicOrigins;

        // 2. Fallback: Usar as origens da matéria pai (Subjects.tsx padrão)
        return getOriginsForSubject(subjectId);
    }, [topicOriginsMap, getOriginsForSubject]);

    const editaisNoCiclo = useMemo(() => editaisData.filter(e => e.merged_into_cycle), [editaisData]);

    const activeSubjectIdsSet = useMemo(() => {
        const set = new Set<string>();
        for (const edital of editaisNoCiclo) {
            const actives = edital.active_subject_ids.length > 0 ? edital.active_subject_ids : edital.subject_ids;
            for (const id of actives) set.add(id);
        }
        return set;
    }, [editaisNoCiclo]);

    return { 
        originsMap, 
        topicOriginsMap, 
        editaisData, 
        editaisNoCiclo, 
        activeSubjectIdsSet, 
        getOriginsForSubject, 
        getOriginsForTopic,
        refresh: fetchEditais 
    };
};
