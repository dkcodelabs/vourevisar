import { describe, expect, it } from 'vitest';

import {
    buildCycleMergeSources,
    buildCycleNameCandidates,
    buildCycleOriginSources,
    chooseDefaultCycleExamDate,
} from '@/components/editais/cycleMergeNaming';

describe('cycleMergeNaming', () => {
    it('builds unique edital sources and puts the combined cycle name first', () => {
        const sources = buildCycleMergeSources(
            [
                { id: 'edital-a', name: 'PMES - Soldado', position: 'Soldado' },
                { id: 'edital-a', name: 'PMES - Soldado duplicado' },
                { name: 'Manual', isManual: true },
            ],
            { id: 'edital-b', name: 'PCES - OIP', position: 'Oficial Investigador' },
        );

        expect(sources).toEqual([
            { id: 'edital-a', name: 'PMES - Soldado', position: 'Soldado' },
            { id: 'manual', name: 'Manual' },
            { id: 'edital-b', name: 'PCES - OIP', position: 'Oficial Investigador' },
        ]);

        expect(buildCycleNameCandidates(sources)).toEqual([
            'PMES - Soldado + Manual + PCES - OIP',
            'PMES - Soldado',
            'Manual',
            'PCES - OIP',
        ]);
    });

    it('keeps only editais with subjects physically present in the active cycle', () => {
        const origins = buildCycleOriginSources({
            editais: [
                { id: 'bombeiros', name: 'Bombeiros', subjectIds: ['subject-outside-cycle'] },
                { id: 'pmes', name: 'PMES', subjectIds: ['subject-in-cycle'] },
                { id: 'pces', name: 'PCES', subjectIds: ['selected-subject'] },
            ],
            selectedEditalId: 'pces',
            cycleSubjectIds: ['subject-in-cycle'],
        });

        expect(origins).toEqual([
            { id: 'pmes', name: 'PMES', subjectIds: ['subject-in-cycle'] },
        ]);
    });

    it('chooses the nearest valid future exam date for a composite cycle', () => {
        const date = chooseDefaultCycleExamDate(
            [
                { examDate: '2026-10-20' },
                { examDate: '2026-08-15' },
                { examDate: 'invalid-date' },
                { examDate: null },
            ],
            new Date('2026-06-26T12:00:00'),
        );

        expect(date).toBe('2026-08-15');
    });

    it('keeps the most recent past date when no future date exists', () => {
        const date = chooseDefaultCycleExamDate(
            [
                { examDate: '2026-01-20' },
                { examDate: '2026-03-15' },
                { examDate: '2025-12-01' },
            ],
            new Date('2026-06-26T12:00:00'),
        );

        expect(date).toBe('2026-03-15');
    });
});
