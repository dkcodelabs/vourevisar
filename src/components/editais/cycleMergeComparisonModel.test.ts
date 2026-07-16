import { describe, expect, it } from 'vitest';

import {
    addManualTopicEquivalence,
    buildCycleMergeComparison,
    buildIndividualCycleMap,
    removeManualTopicEquivalence,
} from '@/components/editais/cycleMergeComparisonModel';
import type { Subject } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

const makeSubject = (id: string, name: string, topics: Array<{ id: string; name: string }>, editalId?: string): Subject => ({
    id,
    name,
    status: 'Nova',
    edital_id: editalId,
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
            ], 'edital-a'),
            makeSubject('subject-b', 'Matematica', [
                { id: 'percentage-b', name: 'Porcentagem' },
                { id: 'rule-three-b', name: 'Regra de tres' },
            ], 'edital-b'),
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
        expect(result.individualSubjects.map(subject => subject.sourceEditalIds)).toEqual([['edital-a'], ['edital-b']]);
        expect(result.unifiedSubjects).toHaveLength(1);
        expect(result.unifiedSubjects[0].sourceEditalIds).toEqual(['edital-a', 'edital-b']);
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

    it('adds manual topic equivalence inside an already unified subject group', () => {
        const subjects = [
            makeSubject('subject-a', 'Direito Constitucional', [
                { id: 'rights-a', name: 'Direitos fundamentais' },
            ], 'edital-a'),
            makeSubject('subject-b', 'Direito Constitucional', [
                { id: 'rights-b', name: 'Direitos e garantias fundamentais' },
                { id: 'rights-c', name: 'Direitos humanos fundamentais' },
            ], 'edital-b'),
        ];
        const map: CycleUnificationMap = {
            version: 1,
            createdAt: '2026-06-22T00:00:00.000Z',
            editalIds: ['edital-a', 'edital-b'],
            standaloneSubjectIds: [],
            unifiedSubjects: [{
                displayName: 'Direito Constitucional',
                originalSubjectIds: ['subject-a', 'subject-b'],
                matchType: 'exact',
                topicMappings: [
                    {
                        displayName: 'Direitos fundamentais',
                        originalTopicIds: ['rights-a'],
                        originalSubjectIds: ['subject-a'],
                        sourceEditalIds: ['edital-a'],
                        matchType: 'exact',
                    },
                    {
                        displayName: 'Direitos e garantias fundamentais',
                        originalTopicIds: ['rights-b'],
                        originalSubjectIds: ['subject-b'],
                        sourceEditalIds: ['edital-b'],
                        matchType: 'exact',
                    },
                    {
                        displayName: 'Direitos humanos fundamentais',
                        originalTopicIds: ['rights-c'],
                        originalSubjectIds: ['subject-b'],
                        sourceEditalIds: ['edital-b'],
                        matchType: 'exact',
                    },
                ],
            }],
        };

        const firstManual = addManualTopicEquivalence(map, subjects, {
            subjectGroupId: 'subject-a:subject-b',
            topicIds: ['rights-a', 'rights-b'],
        });
        const secondManual = addManualTopicEquivalence(firstManual, subjects, {
            subjectGroupId: 'subject-a:subject-b',
            topicIds: ['rights-a', 'rights-c'],
        });

        expect(secondManual.unifiedSubjects[0].topicMappings).toEqual([expect.objectContaining({
            displayName: 'Direitos fundamentais',
            matchType: 'manual',
            originalSubjectIds: ['subject-a', 'subject-b'],
            originalTopicIds: ['rights-a', 'rights-b', 'rights-c'],
            sourceEditalIds: ['edital-a', 'edital-b'],
        })]);
    });

    it('persists the student-selected display name for a manual topic equivalence', () => {
        const subjects = [
            makeSubject('subject-a', 'Direito', [
                { id: 'topic-a', name: 'Lei penal no tempo' },
            ], 'edital-a'),
            makeSubject('subject-b', 'Direito', [
                { id: 'topic-b', name: 'Teoria tripartida' },
            ], 'edital-b'),
        ];
        const map: CycleUnificationMap = {
            version: 1,
            createdAt: '2026-06-22T00:00:00.000Z',
            editalIds: ['edital-a', 'edital-b'],
            standaloneSubjectIds: [],
            unifiedSubjects: [{
                displayName: 'Direito',
                originalSubjectIds: ['subject-a', 'subject-b'],
                matchType: 'exact',
                topicMappings: [],
            }],
        };

        const result = addManualTopicEquivalence(map, subjects, {
            displayName: '  Teoria tripartida   ',
            subjectGroupId: 'subject-a:subject-b',
            topicIds: ['topic-a', 'topic-b'],
        });

        expect(result.unifiedSubjects[0].topicMappings).toEqual([expect.objectContaining({
            displayName: 'Teoria tripartida',
            displayNameOverride: 'Teoria tripartida',
            matchType: 'manual',
            originalTopicIds: ['topic-a', 'topic-b'],
        })]);
    });

    it('does not let manual equivalence override an automatic topic mapping', () => {
        const subjects = [
            makeSubject('subject-a', 'Matematica', [
                { id: 'percentage-a', name: 'Porcentagem' },
                { id: 'interest-a', name: 'Juros' },
            ], 'edital-a'),
            makeSubject('subject-b', 'Matematica', [
                { id: 'percentage-b', name: 'Porcentagem' },
                { id: 'interest-b', name: 'Juros simples' },
            ], 'edital-b'),
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

        const result = addManualTopicEquivalence(map, subjects, {
            subjectGroupId: 'subject-a:subject-b',
            topicIds: ['percentage-a', 'interest-b'],
        });

        expect(result).toEqual(map);
    });

    it('removes only manual topic equivalence and preserves automatic mappings', () => {
        const map: CycleUnificationMap = {
            version: 1,
            createdAt: '2026-06-22T00:00:00.000Z',
            editalIds: ['edital-a', 'edital-b'],
            standaloneSubjectIds: [],
            unifiedSubjects: [{
                displayName: 'Matematica',
                originalSubjectIds: ['subject-a', 'subject-b'],
                matchType: 'exact',
                topicMappings: [
                    {
                        displayName: 'Porcentagem',
                        originalTopicIds: ['percentage-a', 'percentage-b'],
                        originalSubjectIds: ['subject-a', 'subject-b'],
                        matchType: 'exact',
                    },
                    {
                        displayName: 'Juros',
                        originalTopicIds: ['interest-a', 'interest-b'],
                        originalSubjectIds: ['subject-a', 'subject-b'],
                        matchType: 'manual',
                    },
                ],
            }],
        };

        const result = removeManualTopicEquivalence(map, {
            subjectGroupId: 'subject-a:subject-b',
            topicIds: ['interest-a', 'interest-b'],
        });

        expect(result.unifiedSubjects[0].topicMappings).toEqual([expect.objectContaining({
            displayName: 'Porcentagem',
            matchType: 'exact',
        })]);
    });
});
