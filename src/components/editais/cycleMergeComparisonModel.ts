import type { Subject } from '@/types';
import type { CycleUnificationMap, UnifiedTopicMapping } from '@/types/cycleMergeTypes';

export interface CycleMergeComparisonTopic {
    id: string;
    name: string;
    isUnified: boolean;
    matchType?: 'exact' | 'semantic' | 'manual';
}

export interface CycleMergeComparisonSubject {
    id: string;
    name: string;
    isUnified: boolean;
    sourceEditalIds: string[];
    sourceCount: number;
    topics: CycleMergeComparisonTopic[];
}

export interface CycleMergeComparison {
    individualSubjects: CycleMergeComparisonSubject[];
    unifiedSubjects: CycleMergeComparisonSubject[];
}

type ManualTopicEquivalenceInput = {
    displayName?: string;
    subjectGroupId: string;
    topicIds: string[];
};

const sortByName = <T extends { name: string; id: string }>(items: T[]): T[] => (
    items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || a.id.localeCompare(b.id))
);

const getUniqueEditalIds = (subjects: Subject[]): string[] => (
    [...new Set(subjects.map(subject => subject.edital_id).filter((id): id is string => Boolean(id)))]
);

export function buildIndividualCycleMap(
    existingSubjectIds: string[],
    newSubjectIds: string[],
    editalIds: string[],
): CycleUnificationMap {
    return {
        version: 1,
        createdAt: new Date().toISOString(),
        editalIds: [...new Set(editalIds)],
        unifiedSubjects: [],
        standaloneSubjectIds: [...new Set([...existingSubjectIds, ...newSubjectIds])],
    };
}

export function buildCycleMergeComparison(
    subjects: Subject[],
    unificationMap: CycleUnificationMap,
): CycleMergeComparison {
    const subjectById = new Map(subjects.map(subject => [subject.id, subject]));
    const involvedSubjectIds = new Set([
        ...unificationMap.standaloneSubjectIds,
        ...unificationMap.unifiedSubjects.flatMap(subject => subject.originalSubjectIds),
    ]);

    const individualSubjects = sortByName(
        [...involvedSubjectIds].flatMap(subjectId => {
            const subject = subjectById.get(subjectId);
            if (!subject) return [];

            return [{
                id: subject.id,
                name: subject.name,
                isUnified: false,
                sourceEditalIds: subject.edital_id ? [subject.edital_id] : [],
                sourceCount: 1,
                topics: sortByName((subject.topics || []).map(topic => ({
                    id: topic.id,
                    name: topic.name,
                    isUnified: false,
                    matchType: undefined,
                }))),
            }];
        }),
    );

    const unifiedSubjects = unificationMap.unifiedSubjects.map(subjectMapping => {
        const sourceSubjects = subjectMapping.originalSubjectIds
            .map(subjectId => subjectById.get(subjectId))
            .filter((subject): subject is Subject => Boolean(subject));
        const mappedTopicIds = new Set(subjectMapping.topicMappings.flatMap(topic => topic.originalTopicIds));
        const mappedTopics = subjectMapping.topicMappings.map(topic => ({
            id: topic.originalTopicIds.join(':'),
            name: topic.displayName,
            isUnified: topic.originalTopicIds.length > 1,
            matchType: topic.matchType,
        }));
        const individualTopics = sourceSubjects.flatMap(subject => (
            (subject.topics || [])
                .filter(topic => !mappedTopicIds.has(topic.id))
                .map(topic => ({ id: topic.id, name: topic.name, isUnified: false, matchType: undefined }))
        ));

        return {
            id: subjectMapping.originalSubjectIds.join(':'),
            name: subjectMapping.displayNameOverride || subjectMapping.displayName,
            isUnified: subjectMapping.originalSubjectIds.length > 1,
            sourceEditalIds: getUniqueEditalIds(sourceSubjects),
            sourceCount: subjectMapping.originalSubjectIds.length,
            topics: sortByName([...mappedTopics, ...individualTopics]),
        };
    });

    for (const subjectId of unificationMap.standaloneSubjectIds) {
        const subject = subjectById.get(subjectId);
        if (!subject) continue;
        unifiedSubjects.push({
            id: subject.id,
            name: subject.name,
            isUnified: false,
            sourceEditalIds: subject.edital_id ? [subject.edital_id] : [],
            sourceCount: 1,
            topics: sortByName((subject.topics || []).map(topic => ({
                id: topic.id,
                name: topic.name,
                isUnified: false,
                matchType: undefined,
            }))),
        });
    }

    return {
        individualSubjects,
        unifiedSubjects: sortByName(unifiedSubjects),
    };
}

const getSubjectGroupId = (subjectIds: string[]) => subjectIds.join(':');

const unique = <T,>(items: T[]): T[] => [...new Set(items)];

const getTopicLookup = (subjects: Subject[]) => {
    const topicById = new Map<string, {
        editalId?: string;
        name: string;
        subjectId: string;
    }>();

    for (const subject of subjects) {
        for (const topic of subject.topics || []) {
            topicById.set(topic.id, {
                editalId: topic.edital_id || subject.edital_id || undefined,
                name: topic.name,
                subjectId: topic.subject_id || subject.id,
            });
        }
    }

    return topicById;
};

const mappingContainsAnyTopic = (mapping: UnifiedTopicMapping, topicIds: Set<string>) => (
    mapping.originalTopicIds.some(topicId => topicIds.has(topicId))
);

const sanitizeDisplayName = (displayName?: string): string | undefined => {
    const normalized = displayName?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
};

export function addManualTopicEquivalence(
    unificationMap: CycleUnificationMap,
    subjects: Subject[],
    input: ManualTopicEquivalenceInput,
): CycleUnificationMap {
    const topicIds = unique(input.topicIds).filter(Boolean);
    if (topicIds.length < 2) return unificationMap;

    const topicById = getTopicLookup(subjects);
    const selectedTopics = topicIds.map(topicId => topicById.get(topicId));
    if (selectedTopics.some(topic => !topic)) return unificationMap;

    const selectedEditalIds = unique(
        selectedTopics
            .map(topic => topic?.editalId)
            .filter((id): id is string => Boolean(id)),
    );
    if (selectedEditalIds.length < 2) return unificationMap;

    let changed = false;
    const selectedTopicIdSet = new Set(topicIds);

    const unifiedSubjects = unificationMap.unifiedSubjects.map(subjectMapping => {
        if (getSubjectGroupId(subjectMapping.originalSubjectIds) !== input.subjectGroupId) {
            return subjectMapping;
        }

        const automaticConflict = subjectMapping.topicMappings.some(mapping => (
            mapping.matchType !== 'manual'
            && mapping.originalTopicIds.length > 1
            && mappingContainsAnyTopic(mapping, selectedTopicIdSet)
        ));
        if (automaticConflict) return subjectMapping;

        const existingManualMapping = subjectMapping.topicMappings.find(mapping => (
            mapping.matchType === 'manual' && mappingContainsAnyTopic(mapping, selectedTopicIdSet)
        ));
        const nextManualTopicIds = unique([
            ...(existingManualMapping?.originalTopicIds || []),
            ...topicIds,
        ]);

        const nextManualTopics = nextManualTopicIds
            .map(topicId => topicById.get(topicId))
            .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));
        const nextManualEditalIds = unique(
            nextManualTopics
                .map(topic => topic.editalId)
                .filter((id): id is string => Boolean(id)),
        );
        if (nextManualEditalIds.length < 2) return subjectMapping;

        const manualMapping: UnifiedTopicMapping = {
            displayName: sanitizeDisplayName(input.displayName) || existingManualMapping?.displayNameOverride || existingManualMapping?.displayName || nextManualTopics[0].name,
            displayNameOverride: sanitizeDisplayName(input.displayName) || existingManualMapping?.displayNameOverride,
            originalTopicIds: nextManualTopicIds,
            originalSubjectIds: unique(nextManualTopics.map(topic => topic.subjectId)),
            sourceEditalIds: nextManualEditalIds,
            matchType: 'manual',
        };

        changed = true;
        return {
            ...subjectMapping,
            topicMappings: [
                ...subjectMapping.topicMappings.filter(mapping => (
                    mapping !== existingManualMapping
                    && !mappingContainsAnyTopic(mapping, new Set(nextManualTopicIds))
                )),
                manualMapping,
            ],
        };
    });

    return changed ? { ...unificationMap, unifiedSubjects } : unificationMap;
}

export function removeManualTopicEquivalence(
    unificationMap: CycleUnificationMap,
    input: ManualTopicEquivalenceInput,
): CycleUnificationMap {
    const topicIdSet = new Set(input.topicIds);
    if (topicIdSet.size === 0) return unificationMap;

    let changed = false;
    const unifiedSubjects = unificationMap.unifiedSubjects.map(subjectMapping => {
        if (getSubjectGroupId(subjectMapping.originalSubjectIds) !== input.subjectGroupId) {
            return subjectMapping;
        }

        const topicMappings = subjectMapping.topicMappings.filter(mapping => {
            const shouldRemove = mapping.matchType === 'manual' && mappingContainsAnyTopic(mapping, topicIdSet);
            if (shouldRemove) changed = true;
            return !shouldRemove;
        });

        return changed ? { ...subjectMapping, topicMappings } : subjectMapping;
    });

    return changed ? { ...unificationMap, unifiedSubjects } : unificationMap;
}
