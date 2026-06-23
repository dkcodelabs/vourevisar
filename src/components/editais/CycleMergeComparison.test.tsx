import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CycleMergeComparison } from '@/components/editais/CycleMergeComparison';
import type { Subject } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

const subjects: Subject[] = [
    {
        id: 'subject-a',
        name: 'Matematica',
        status: 'Nova',
        topics: [{ id: 'topic-a', name: 'Porcentagem', completed: false, reviewCount: 0, review_count: 0 }],
    },
    {
        id: 'subject-b',
        name: 'Matematica',
        status: 'Nova',
        topics: [{ id: 'topic-b', name: 'Porcentagem', completed: false, reviewCount: 0, review_count: 0 }],
    },
];

const unificationMap: CycleUnificationMap = {
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
            originalTopicIds: ['topic-a', 'topic-b'],
            originalSubjectIds: ['subject-a', 'subject-b'],
            matchType: 'exact',
        }],
    }],
};

describe('CycleMergeComparison', () => {
    it('shows both visual outcomes and requires an explicit choice', () => {
        const onKeepIndividual = vi.fn();
        const onUnify = vi.fn();

        render(
            <CycleMergeComparison
                subjects={subjects}
                unificationMap={unificationMap}
                editalName="PMES - Soldado"
                position="Soldado Combatente"
                editalSources={[
                    { id: 'edital-a', name: 'PMES - Soldado', position: 'Soldado Combatente' },
                    { id: 'edital-b', name: 'PCES - OIP', position: 'Oficial Investigador' },
                ]}
                onKeepIndividual={onKeepIndividual}
                onUnify={onUnify}
            />,
        );

        expect(screen.getByRole('heading', { name: 'Manter itens individuais' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Unificar equivalentes' })).toBeInTheDocument();
        expect(screen.getByText('PMES - Soldado')).toBeInTheDocument();
        expect(screen.getByText('Soldado Combatente')).toBeInTheDocument();
        expect(screen.getByText('PCES - OIP')).toBeInTheDocument();
        expect(screen.getByText('Oficial Investigador')).toBeInTheDocument();
        expect(screen.getByText('A cor verde mostra apenas o que será unificado.')).toBeInTheDocument();
        expect(screen.getByTestId('cycle-merge-context-panel')).toHaveClass('border-primary/15', 'from-primary/10');

        const unifiedColumn = screen.getByTestId('unified-preview-column');
        expect(unifiedColumn).not.toHaveClass('bg-success/[0.045]');
        expect(screen.getByTestId('unified-subject-header-subject-a:subject-b')).toHaveClass('bg-success/[0.07]');
        expect(screen.getByTestId('unified-topic-topic-a:topic-b')).not.toHaveClass('bg-success/[0.12]', 'border-success/35', 'text-success');
        expect(within(screen.getByTestId('unified-topic-topic-a:topic-b')).getByText('Porcentagem')).toHaveClass('text-success');
        expect(screen.getByTestId('unified-topics-subject-a:subject-b')).toHaveClass('pt-0.5', 'gap-0.5');

        fireEvent.click(screen.getByRole('button', { name: 'Recolher matérias nas duas prévias' }));
        expect(screen.queryAllByText('Porcentagem')).toHaveLength(0);
        expect(screen.getByRole('button', { name: 'Abrir matérias nas duas prévias' })).toBeInTheDocument();

        const actions = screen.getByTestId('cycle-merge-actions');
        expect(actions).toHaveClass('sticky', 'bottom-0', 'grid-cols-2');
        expect(within(actions).getByRole('button', { name: 'Manter materias e topicos individuais' })).toHaveClass('border-primary/25', 'bg-primary/10', 'text-primary');
        expect(within(actions).getByRole('button', { name: 'Unificar materias e topicos equivalentes' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Manter materias e topicos individuais' }));
        fireEvent.click(screen.getByRole('button', { name: 'Unificar materias e topicos equivalentes' }));

        expect(onKeepIndividual).toHaveBeenCalledOnce();
        expect(onUnify).toHaveBeenCalledOnce();
    });
});
