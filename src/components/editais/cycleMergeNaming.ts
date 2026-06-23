export interface CycleMergeSourceInput {
    id?: string;
    name: string;
    position?: string;
    isManual?: boolean;
    subjectIds?: string[];
    activeSubjectIds?: string[];
}

export interface CycleMergeSourceOption {
    id: string;
    name: string;
    position?: string;
}

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ');

export function buildCycleMergeSources(
    currentOrigins: CycleMergeSourceInput[],
    selectedEdital: CycleMergeSourceInput,
): CycleMergeSourceOption[] {
    const sources = [...currentOrigins, selectedEdital];
    const byId = new Map<string, CycleMergeSourceOption>();

    for (const source of sources) {
        const name = normalizeName(source.name || '');
        if (!name) continue;

        const id = source.id || (source.isManual ? 'manual' : name.toLowerCase());
        if (byId.has(id)) continue;

        byId.set(id, {
            id,
            name,
            ...(source.position ? { position: normalizeName(source.position) } : {}),
        });
    }

    return [...byId.values()];
}

export function buildCycleNameCandidates(sources: CycleMergeSourceOption[]): string[] {
    const names = sources.map(source => normalizeName(source.name)).filter(Boolean);
    const candidates = names.length > 1 ? [names.join(' + '), ...names] : names;

    return [...new Set(candidates)].map(name => name.slice(0, 160));
}

export function buildCycleOriginSources<T extends CycleMergeSourceInput>({
    editais,
    selectedEditalId,
    cycleSubjectIds,
}: {
    editais: T[];
    selectedEditalId: string;
    cycleSubjectIds: string[];
}): T[] {
    const activeIds = new Set(cycleSubjectIds);

    return editais.filter(edital => {
        if (!edital.id || edital.id === selectedEditalId) return false;

        const subjectIds = [...(edital.activeSubjectIds || []), ...(edital.subjectIds || [])];
        return subjectIds.some(subjectId => activeIds.has(subjectId));
    });
}
