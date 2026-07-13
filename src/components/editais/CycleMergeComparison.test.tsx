import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CycleMergeComparison } from '@/components/editais/CycleMergeComparison';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import type { Subject } from '@/types';

const subjects: Subject[] = [
    {
        id: 'subject-a',
        name: 'Matematica',
        status: 'Nova',
        edital_id: 'edital-a',
        topics: [{ id: 'topic-a', name: 'Porcentagem', completed: false, reviewCount: 0, review_count: 0 }],
    },
    {
        id: 'subject-b',
        name: 'Matematica',
        status: 'Nova',
        edital_id: 'edital-b',
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
        expect(screen.getAllByText('PMES - Soldado').length).toBeGreaterThan(0);
        expect(screen.getByText('Soldado Combatente')).toBeInTheDocument();
        expect(screen.getAllByText('PCES - OIP').length).toBeGreaterThan(0);
        expect(screen.getByText('Oficial Investigador')).toBeInTheDocument();
        expect(screen.getByText('A cor verde mostra apenas o que será unificado.')).toBeInTheDocument();
        expect(screen.getByTestId('cycle-merge-context-panel')).toHaveClass('border-primary/15', 'from-primary/10');
        expect(screen.getByTestId('individual-subject-edital-subject-a')).toHaveTextContent('PMES - Soldado');
        expect(screen.getByTestId('individual-subject-edital-subject-b')).toHaveTextContent('PCES - OIP');
        expect(screen.getByTestId('unified-subject-edital-subject-a:subject-b')).toHaveTextContent('PMES - Soldado + PCES - OIP');
        expect(screen.getByTestId('individual-subject-subject-a')).toHaveClass('shrink-0');

        expect(screen.getByTestId('cycle-merge-preview-grid')).toHaveClass('pb-20');

        const unifiedColumn = screen.getByTestId('unified-preview-column');
        expect(unifiedColumn).not.toHaveClass('bg-success/[0.045]');
        expect(screen.getByTestId('unified-subject-header-subject-a:subject-b')).toHaveClass('bg-success/[0.07]');
        expect(screen.getByTestId('unified-topic-topic-a:topic-b')).not.toHaveClass('bg-success/[0.12]', 'border-success/35', 'text-success');
        expect(within(screen.getByTestId('unified-topic-topic-a:topic-b')).getByText('Porcentagem')).not.toHaveClass('truncate');
        expect(within(screen.getByTestId('unified-topic-topic-a:topic-b')).getByText('Porcentagem')).toHaveClass('text-success');
        expect(within(screen.getByTestId('individual-topics-subject-a')).getByText('Porcentagem')).toHaveClass('text-foreground/75');
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

    it('lets the student add and undo a manual topic equivalence', () => {
        const onUnificationMapChange = vi.fn();
        const manualSubjects: Subject[] = [
            {
                id: 'subject-a',
                name: 'Direito Constitucional',
                status: 'Nova',
                edital_id: 'edital-a',
                topics: [{ id: 'topic-a', name: 'Direitos fundamentais', completed: false, reviewCount: 0, review_count: 0 }],
            },
            {
                id: 'subject-b',
                name: 'Direito Constitucional',
                status: 'Nova',
                edital_id: 'edital-b',
                topics: [{ id: 'topic-b', name: 'Direitos e garantias fundamentais', completed: false, reviewCount: 0, review_count: 0 }],
            },
        ];
        const manualMap: CycleUnificationMap = {
            version: 1,
            createdAt: '2026-06-22T00:00:00.000Z',
            editalIds: ['edital-a', 'edital-b'],
            standaloneSubjectIds: [],
            unifiedSubjects: [{
                displayName: 'Direito Constitucional',
                originalSubjectIds: ['subject-a', 'subject-b'],
                matchType: 'exact',
                topicMappings: [],
            }],
        };

        const { rerender } = render(
            <CycleMergeComparison
                subjects={manualSubjects}
                unificationMap={manualMap}
                editalName="PMES - Soldado"
                onKeepIndividual={vi.fn()}
                onUnify={vi.fn()}
                onUnificationMapChange={onUnificationMapChange}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Escolher equivalente para Direitos fundamentais' }));
        fireEvent.change(screen.getByRole('searchbox', { name: 'Pesquisar tópico equivalente' }), {
            target: { value: 'garantias' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Selecionar Direitos e garantias fundamentais como equivalente' }));
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar equivalência manual' }));

        const nextMap = onUnificationMapChange.mock.calls[0][0] as CycleUnificationMap;
        expect(nextMap.unifiedSubjects[0].topicMappings).toEqual([expect.objectContaining({
            matchType: 'manual',
            originalTopicIds: ['topic-a', 'topic-b'],
        })]);

        rerender(
            <CycleMergeComparison
                subjects={manualSubjects}
                unificationMap={nextMap}
                editalName="PMES - Soldado"
                onKeepIndividual={vi.fn()}
                onUnify={vi.fn()}
                onUnificationMapChange={onUnificationMapChange}
            />,
        );

        expect(screen.getByText('Manual')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Desfazer equivalência manual de Direitos fundamentais' }));

        const removedMap = onUnificationMapChange.mock.calls[1][0] as CycleUnificationMap;
        expect(removedMap.unifiedSubjects[0].topicMappings).toEqual([]);
    });
});
