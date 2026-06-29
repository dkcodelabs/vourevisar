import type { Subject } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

export interface CycleMergeComparisonTopic {
    id: string;
    name: string;
    isUnified: boolean;
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
        }));
        const individualTopics = sourceSubjects.flatMap(subject => (
            (subject.topics || [])
                .filter(topic => !mappedTopicIds.has(topic.id))
                .map(topic => ({ id: topic.id, name: topic.name, isUnified: false }))
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
            }))),
        });
    }

    return {
        individualSubjects,
        unifiedSubjects: sortByName(unifiedSubjects),
    };
}
