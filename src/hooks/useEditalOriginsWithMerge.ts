import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCycleState } from '@/hooks/useCycleState';
import { mergeService } from '@/services/mergeService';
import type { SubjectMerge, TopicMerge } from '@/types/merges';
import type { PostgrestError } from '@supabase/supabase-js';

interface EditalOriginData {
    id: string;
    name: string;
    subject_ids: string[];
    active_subject_ids: string[];
    is_imported: boolean;
    merged_into_cycle: boolean;
    source_id?: string;
    organ?: string;
    position?: string;
    year?: string;
}

type OriginInfo = { name: string; organ?: string; isImported: boolean; sourceId?: string };

export const useEditalOriginsWithMerge = () => {
    const { user } = useAuth();
    const { userCycle, isLoading: isCycleLoading } = useCycleState();
    const [editaisData, setEditaisData] = useState<EditalOriginData[]>([]);
    const [subjectMerges, setSubjectMerges] = useState<SubjectMerge[]>([]);
    const [topicMerges, setTopicMerges] = useState<TopicMerge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const editaisTable = useCallback(() => supabase.from('user_editais'), []);

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
            console.log('[useEditalOriginsWithMerge] Carregando editais para:', user.id);
            const { data, error } = await supabase.from('user_editais')
                .select('id, name, subject_ids, active_subject_ids, is_imported, merged_into_cycle, source_id, organ, position, year')
                .eq('user_id', user.id);

            if (error) throw error;
            
            const parsedEditais = (data || []).map((row) => ({
                id: row.id,
                name: row.name,
                subject_ids: row.subject_ids || [],
                active_subject_ids: row.active_subject_ids || [],
                is_imported: row.is_imported,
                merged_into_cycle: row.merged_into_cycle || false,
                source_id: row.source_id,
                organ: row.organ,
                position: row.position,
                year: row.year,
            }));
            
            console.log('[useEditalOriginsWithMerge] Editais carregados:', parsedEditais.length);
            setEditaisData(parsedEditais);
        } catch (err) {
            console.error('[useEditalOriginsWithMerge] Erro ao buscar origens:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    // Unification map fetch removed - now handled via subject_merges and topic_merges tables
    // functionally replaced by dynamic unification mapping in consumers.

    useEffect(() => { fetchEditais(); }, [fetchEditais]);
    useEffect(() => { loadMerges(); }, [loadMerges]);

    useEffect(() => {
        const handler = () => { 
            fetchEditais(); 
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
    }, [fetchEditais, loadMerges]);

    const getAllOriginalSubjectIds = useCallback((subjectId: string): string[] => {
        // Consultar tabela subject_merges (Single Source of Truth)
        for (const merge of subjectMerges) {
            if (merge.primary_subject_id === subjectId) {
                return [merge.primary_subject_id, ...(merge.merged_subject_ids || [])];
            }
            if (merge.merged_subject_ids?.includes(subjectId)) {
                return [merge.primary_subject_id, ...merge.merged_subject_ids];
            }
        }
        return [subjectId];
    }, [subjectMerges]);

    const originsMap = useMemo(() => {
        const map = new Map<string, { name: string; organ?: string; isImported: boolean; sourceId?: string }[]>();
        
        
        // Primeiro: adicionar origens baseadas nos editais carregados
        for (const edital of editaisData) {
            for (const subjectId of edital.subject_ids) {
                const existing = map.get(subjectId) || [];
                if (!existing.some(e => e.name === edital.name)) {
                    map.set(subjectId, [...existing, { 
                        name: edital.name, 
                        organ: edital.organ,
                        isImported: edital.is_imported, 
                        sourceId: edital.source_id 
                    }]);
                }
            }
        }
        
        // Segundo: para subjects mesclados, propagar origens de TODOS os IDs do grupo
        for (const merge of subjectMerges) {
            const primaryId = merge.primary_subject_id;
            const mergedIds = merge.merged_subject_ids || [];
            const allIdsInMerge = [primaryId, ...mergedIds];
            
            // Coletar todas as origens de todos os IDs envolvidos
            const allOrigins: OriginInfo[] = [];
            
            // 1. Origens mapeadas via subject_ids nos editais (Scan inicial)
            for (const id of allIdsInMerge) {
                const existingOrigins = map.get(id) || [];
                for (const origin of existingOrigins) {
                    if (!allOrigins.some(o => o.name === origin.name)) {
                        allOrigins.push(origin);
                    }
                }
            }

            // 2. Origens explícitas no registro de merge (Source of Truth)
            if (Array.isArray(merge.source_edital_ids) && merge.source_edital_ids.length > 0) {
                for (const editalId of merge.source_edital_ids) {
                    const edital = editaisData.find(e => e.id === editalId);
                    if (edital && !allOrigins.some(o => o.name === edital.name)) {
                        allOrigins.push({ 
                            name: edital.name, 
                            organ: edital.organ,
                            isImported: edital.is_imported, 
                            sourceId: edital.source_id 
                        });
                    }
                }
            }
            
            // 3. Fallback: Se ainda vazio ou para garantir completude, varrer editais manualmente pelos IDs
            for (const id of allIdsInMerge) {
                for (const edital of editaisData) {
                    if ((edital.subject_ids || []).includes(id) && !allOrigins.some(o => o.name === edital.name)) {
                        allOrigins.push({
                            name: edital.name,
                            organ: edital.organ,
                            isImported: edital.is_imported,
                            sourceId: edital.source_id
                        });
                    }
                }
            }
            
            // Aplicar este conjunto de origens para TODOS os IDs envolvidos no merge
            for (const id of allIdsInMerge) {
                map.set(id, allOrigins);
            }
            
            // PROPAGAR para TODOS os IDs do grupo de mesclagem
            for (const id of allIdsInMerge) {
                map.set(id, allOrigins);
            }
        }

        // NOVO: Agregação reversa baseada em Topic Merges
        // Se uma matéria não está explicitamente mesclada, mas seus tópicos estão, 
        // ela deve mostrar as origens desses tópicos também.
        for (const tm of topicMerges) {
            // Encontrar o subject_id do tópico primário (precisamos do acesso aos subjects, mas podemos inferir se tivermos o mapeamento de editais)
            // Como este hook é focado em origens, vamos ver se o tópico primário pertence a um edital diferente do tópico mesclado
            const allTopicIds = [tm.primary_topic_id, ...(tm.merged_topic_ids || [])];
            const topicOrigins: string[] = tm.source_edital_ids || [];
            
            if (topicOrigins.length > 1) {
                // Tópico mesclado de múltiplos editais. Precisamos encontrar as matérias donas desses tópicos.
                // Infelizmente no hook não temos a lista de subjects completa, mas temos editaisData.subject_ids.
                // Mas as matérias (subjects) podem não ser as mesmas.
                // O fallback já ocorre no getOriginsForTopic. No Subjects.tsx, ele usa getOriginsForSubject.
            }
        }
        
        return map;
    }, [editaisData, subjectMerges, topicMerges]);

    const topicOriginsMap = useMemo(() => {
        const map = new Map<string, { name: string; organ?: string; isImported: boolean; sourceId?: string }[]>();
        
        for (const merge of topicMerges) {
            const primaryId = merge.primary_topic_id;
            const mergedIds = merge.merged_topic_ids || [];
            const allIdsInMerge = [primaryId, ...mergedIds];
            
            const allOrigins: OriginInfo[] = [];

            // 1. Origens explícitas no registro de merge de tópico
            if (merge.source_edital_ids && merge.source_edital_ids.length > 0) {
                for (const editalId of merge.source_edital_ids) {
                    const edital = editaisData.find(e => e.id === editalId);
                    if (edital && !allOrigins.some(o => o.name === edital.name)) {
                        allOrigins.push({ name: edital.name, organ: edital.organ, isImported: edital.is_imported, sourceId: edital.source_id });
                    }
                }
            }

            // Se o merge de tópico for herdeiro de um merge de matéria, podemos tentar buscar as origens da matéria
            // mas o getOriginsForTopic já faz esse fallback. Aqui focamos em consolidar as origens ESPECÍFICAS do merge de tópico.

            if (allOrigins.length > 0) {
                for (const id of allIdsInMerge) {
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
                return [{ name: edital.name, organ: edital.organ, isImported: edital.is_imported, sourceId: edital.source_id }];
            }
        }
        
        return origins;
    }, [editaisData, originsMap]);

    const getOriginsForTopic = useCallback((topicId: string, subjectId: string, editalId?: string) => {
        // 1. Tentar mapa de tópicos (se houve merge de tópico no banco)
        const topicOrigins = topicOriginsMap.get(topicId);
        if (topicOrigins && topicOrigins.length > 0) return topicOrigins;

        // 2. Se temos editalId específico do tópico (não mesclado)
        if (editalId) {
            const edital = editaisData.find(e => e.id === editalId);
            if (edital) {
                return [{ name: edital.name, organ: edital.organ, isImported: edital.is_imported, sourceId: edital.source_id }];
            }
        }

        // 3. Fallback: Usar as origens da matéria pai (Subjects.tsx padrão)
        return getOriginsForSubject(subjectId);
    }, [topicOriginsMap, getOriginsForSubject, editaisData]);

    // Um edital está "no ciclo" se: 
    // 1. Está marcado como merged_into_cycle 
    // 2. O ciclo_atual contém pelo menos uma de suas matérias (ativas ou totais)
    const editaisNoCiclo = useMemo(() => {
        if (!userCycle?.ciclo_atual || userCycle.ciclo_atual.length === 0) return [];

        const cicloSet = new Set(userCycle.ciclo_atual);
        
        // Mapear unificações para abranger matérias que "estão" no ciclo por herança
        return editaisData.filter(e => {
            if (!e.merged_into_cycle) return false;
            
            const idsToCheck = e.active_subject_ids.length > 0 ? e.active_subject_ids : e.subject_ids;
            
            return idsToCheck.some(id => {
                // Caso 1: ID Direto está no ciclo
                if (cicloSet.has(id)) return true;
                
                // Caso 2: ID unificado com matéria que está no ciclo
                // (Se a matéria A unificou com B, e B está no ciclo, o edital de A deve ser considerado "no ciclo")
                const merge = subjectMerges.find(m => 
                    m.primary_subject_id === id || m.merged_subject_ids?.includes(id)
                );
                
                if (merge) {
                    const allMergeIds = [merge.primary_subject_id, ...(merge.merged_subject_ids || [])];
                    return allMergeIds.some(mid => cicloSet.has(mid));
                }
                
                return false;
            });
        });
    }, [editaisData, userCycle?.ciclo_atual, subjectMerges]);

    const activeSubjectIdsSet = useMemo(() => {
        const set = new Set<string>();
        
        // 1. Matérias dos editais considerados "no ciclo"
        for (const edital of editaisNoCiclo) {
            const actives = edital.active_subject_ids.length > 0 ? edital.active_subject_ids : edital.subject_ids;
            for (const id of actives) set.add(id);
        }

        // 2. Expansão de Unificação: se uma matéria está no set (é ativa), 
        // e ela faz parte de um merge, os IDs "irmãos" também devem estar no set.
        // Isso é CRÍTICO para que o Subjects.tsx não filtre matérias secundárias
        for (const merge of subjectMerges) {
            const allMergeIds = [merge.primary_subject_id, ...(merge.merged_subject_ids || [])];
            if (allMergeIds.some(id => set.has(id))) {
                allMergeIds.forEach(id => set.add(id));
            }
        }
        
        return set;
    }, [editaisNoCiclo, subjectMerges]);

    return { 
        originsMap, 
        topicOriginsMap, 
        editaisData, 
        editaisNoCiclo, 
        activeSubjectIdsSet, 
        getOriginsForSubject, 
        getOriginsForTopic,
        refresh: fetchEditais,
        isLoading: isLoading || isCycleLoading
    };
};
