export interface CycleMergeSourceInput {
    id?: string;
    name: string;
    position?: string;
    examDate?: string | null;
    isManual?: boolean;
    subjectIds?: string[];
    activeSubjectIds?: string[];
}

export interface CycleMergeSourceOption {
    id: string;
    name: string;
    position?: string;
    examDate?: string | null;
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
            ...(source.examDate ? { examDate: source.examDate } : {}),
        });
    }

    return [...byId.values()];
}

export function buildCycleNameCandidates(sources: CycleMergeSourceOption[]): string[] {
    const names = sources.map(source => normalizeName(source.name)).filter(Boolean);
    const candidates = names.length > 1 ? [names.join(' + '), ...names] : names;

    return [...new Set(candidates)].map(name => name.slice(0, 160));
}

const parseDateOnly = (value?: string | null): Date | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

export function chooseDefaultCycleExamDate(
    sources: Pick<CycleMergeSourceOption, 'examDate'>[],
    referenceDate = new Date(),
): string | null {
    const referenceDay = new Date(referenceDate);
    referenceDay.setHours(0, 0, 0, 0);

    const dates = [...new Set(
        sources
            .map(source => source.examDate)
            .filter((date): date is string => Boolean(parseDateOnly(date))),
    )];

    if (dates.length === 0) return null;

    const futureOrToday = dates
        .filter(date => parseDateOnly(date)!.getTime() >= referenceDay.getTime())
        .sort((a, b) => parseDateOnly(a)!.getTime() - parseDateOnly(b)!.getTime());

    if (futureOrToday.length > 0) return futureOrToday[0];

    return dates.sort((a, b) => parseDateOnly(b)!.getTime() - parseDateOnly(a)!.getTime())[0];
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
