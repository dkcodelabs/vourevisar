import { describe, expect, it } from 'vitest';

import {
    buildCycleMergeComparison,
    buildIndividualCycleMap,
} from '@/components/editais/cycleMergeComparisonModel';
import type { Subject } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

const makeSubject = (id: string, name: string, topics: Array<{ id: string; name: string }>): Subject => ({
    id,
    name,
    status: 'Nova',
    topics: topics.map(topic => ({
        ...topic,
        completed: false,
        reviewCount: 0,
        review_count: 0,
        subject_id: id,
    })),
});

describe('buildCycleMergeComparison', () => {
    it('keeps duplicate subjects visible in one cycle and collapses only mapped equivalents', () => {
        const subjects = [
            makeSubject('subject-a', 'Matematica', [
                { id: 'percentage-a', name: 'Porcentagem' },
                { id: 'interest-a', name: 'Juros' },
            ]),
            makeSubject('subject-b', 'Matematica', [
                { id: 'percentage-b', name: 'Porcentagem' },
                { id: 'rule-three-b', name: 'Regra de tres' },
            ]),
        ];
        const map: CycleUnificationMap = {
            version: 1,
            createdAt: '2026-06-22T00:00:00.000Z',
            editalIds: ['edital-a', 'edital-b'],
            standaloneSubjectIds: [],
            unifiedSubjects: [{
                displayName: 'Matematica',
                originalSubjectIds: ['subject-a', 'subject-b'],
                matchType: 'exact',
                topicMappings: [{
                    displayName: 'Porcentagem',
                    originalTopicIds: ['percentage-a', 'percentage-b'],
                    originalSubjectIds: ['subject-a', 'subject-b'],
                    matchType: 'exact',
                }],
            }],
        };

        const result = buildCycleMergeComparison(subjects, map);

        expect(result.individualSubjects.map(subject => subject.name)).toEqual(['Matematica', 'Matematica']);
        expect(result.unifiedSubjects).toHaveLength(1);
        expect(result.unifiedSubjects[0].topics).toEqual([
            expect.objectContaining({ name: 'Juros', isUnified: false }),
            expect.objectContaining({ name: 'Porcentagem', isUnified: true }),
            expect.objectContaining({ name: 'Regra de tres', isUnified: false }),
        ]);
    });

    it('adds the new edital to the same cycle without creating new unifications', () => {
        const map = buildIndividualCycleMap(
            ['existing-a', 'existing-b'],
            ['new-a', 'existing-b'],
            ['current-edital', 'new-edital'],
        );

        expect(map.standaloneSubjectIds).toEqual(['existing-a', 'existing-b', 'new-a']);
        expect(map.editalIds).toEqual(['current-edital', 'new-edital']);
        expect(map.unifiedSubjects).toEqual([]);
    });
});
