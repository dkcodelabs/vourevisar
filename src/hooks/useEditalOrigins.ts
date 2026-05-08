import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

/**
 * Hook que retorna:
 * - originsMap: Map<subjectId, string[]> — nomes de editais de cada matéria
 * - editaisData: dados brutos dos editais do usuário
 * - editaisNoCiclo: editais com merged_into_cycle = true
 * - activeSubjectIdsSet: Set<subjectId> com IDs das matérias ativas (visíveis no Ciclo de Estudos)
 * - refresh: re-fetch
 */
export const useEditalOrigins = () => {
    const { user } = useAuth();
    const [editaisData, setEditaisData] = useState<EditalOriginData[]>([]);

    const editaisTable = useCallback(() =>
        (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from('user_editais'),
        []);

    const fetchEditais = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await editaisTable()
                .select('id, name, subject_ids, active_subject_ids, is_imported, merged_into_cycle, organ, position, year')
                .eq('user_id', user.id);

            if (error) throw error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parsedEditais = ((data || []) as any[]).map((row) => ({
                id: row.id as string,
                name: row.name as string,
                subject_ids: (row.subject_ids as string[]) || [],
                active_subject_ids: (row.active_subject_ids as string[]) || [],
                is_imported: row.is_imported as boolean,
                merged_into_cycle: row.merged_into_cycle as boolean || false,
                source_id: row.source_id as string,
                organ: row.organ as string,
                position: row.position as string,
                year: row.year as string,
            }));

            setEditaisData(parsedEditais);
        } catch (err) {
            console.error('[useEditalOrigins] Error fetching origins:', err);
        }
    }, [user, editaisTable]);

    useEffect(() => { fetchEditais(); }, [fetchEditais]);

    // Re-busca automaticamente quando qualquer operação de matéria/edital acontecer
    useEffect(() => {
        const handler = () => fetchEditais();
        window.addEventListener('subjectUpdated', handler);
        return () => window.removeEventListener('subjectUpdated', handler);
    }, [fetchEditais]);

    /** Map<subjectId, {name, isImported, sourceId}[]> — somente as origens de editais carregados no ciclo */
    const originsMap = useMemo(() => {
        const map = new Map<string, { name: string; isImported: boolean; sourceId?: string }[]>();
        for (const edital of editaisData) {
            // Somente incluir se o edital estiver carregado no ciclo
            if (!edital.merged_into_cycle) continue;

            for (const subjectId of edital.subject_ids) {
                const existing = map.get(subjectId) || [];
                if (!existing.some(e => e.name === edital.name)) {
                    map.set(subjectId, [...existing, { name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id }]);
                }
            }
        }
        return map;
    }, [editaisData]);

    /** 
     * Retorna os nomes e metadados dos editais de uma matéria. 
     * Se contextualEditalId for passado, verifica se a matéria pertence especificamente àquela origem.
     */
    const getOriginsForSubject = useCallback((subjectId: string, contextualEditalId?: string) => {
        if (contextualEditalId) {
            const edital = editaisData.find(e => e.id === contextualEditalId);
            if (edital && edital.subject_ids.includes(subjectId) && edital.merged_into_cycle) {
                return [{ name: edital.name, isImported: edital.is_imported, sourceId: edital.source_id }];
            }
        }
        return originsMap.get(subjectId) || [];
    }, [editaisData, originsMap]);

    /** Editais que estão marcados como carregados no ciclo */
    const editaisNoCiclo = useMemo(() =>
        editaisData.filter(e => e.merged_into_cycle),
        [editaisData]);

    /**
     * Set com todos os subject IDs "ativos" (visíveis no Ciclo de Estudos).
     * Um subject é ativo se estiver em active_subject_ids de algum edital no ciclo.
     */
    const activeSubjectIdsSet = useMemo(() => {
        const set = new Set<string>();
        for (const edital of editaisNoCiclo) {
            const actives = edital.active_subject_ids.length > 0
                ? edital.active_subject_ids
                : edital.subject_ids; // fallback: se active_subject_ids vazio, usa o subject_ids completo
            for (const id of actives) set.add(id);
        }
        return set;
    }, [editaisNoCiclo]);

    return { 
        originsMap, 
        editaisData, 
        editaisNoCiclo, 
        activeSubjectIdsSet, 
        getOriginsForSubject,
        refresh: fetchEditais 
    };
};
