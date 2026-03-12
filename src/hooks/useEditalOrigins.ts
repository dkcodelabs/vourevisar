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
}

/**
 * Hook que retorna:
 * - originsMap: Map<subjectId, string[]> — nomes de editais de cada matéria
 * - editaisData: dados brutos dos editais do usuário
 * - editaisNoCiclo: editais com merged_into_cycle = true
 * - activeSubjectIdsSet: Set<subjectId> com IDs das matérias ativas (visíveis na pág. Matérias)
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
                .select('id, name, subject_ids, active_subject_ids, is_imported, merged_into_cycle')
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

    /** Map<subjectId, string[]> — todas as origens de cada matéria (pelo subject_ids completo) */
    const originsMap = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const edital of editaisData) {
            for (const subjectId of edital.subject_ids) {
                const existing = map.get(subjectId) || [];
                if (!existing.includes(edital.name)) {
                    map.set(subjectId, [...existing, edital.name]);
                }
            }
        }
        return map;
    }, [editaisData]);

    /** Editais que estão marcados como carregados no ciclo */
    const editaisNoCiclo = useMemo(() =>
        editaisData.filter(e => e.merged_into_cycle),
        [editaisData]);

    /**
     * Set com todos os subject IDs "ativos" (visíveis na pág. Matérias).
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

    return { originsMap, editaisData, editaisNoCiclo, activeSubjectIdsSet, refresh: fetchEditais };
};
