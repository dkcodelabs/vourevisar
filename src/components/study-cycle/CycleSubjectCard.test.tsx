import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CycleSubjectCard } from './CycleSubjectCard';
import type { Subject } from '@/types';

vi.mock('@/components/SortableItem', () => ({
  SortableItem: ({ children }: { children: (props: { listeners: object; attributes: object }) => React.ReactNode }) => (
    <div>{children({ listeners: {}, attributes: {} })}</div>
  ),
}));

const subject = {
  id: 'subject-1',
  name: 'direito constitucional',
  topics: [],
} as Subject;

const baseProps = {
  activeTab: 'all' as const,
  children: null,
  hasTopics: false,
  isClosedInCycle: false,
  isCompletedInEdital: false,
  isExpanded: false,
  isHighlighted: false,
  isReorderingCycle: false,
  isWeightLineActive: false,
  itemId: 'subject-1-cycle-0',
  needsCycleClosure: false,
  onManageSubject: vi.fn(),
  onMarkStudied: vi.fn(),
  onReturnToQueue: vi.fn(),
  onToggleExpand: vi.fn(),
  renderCycleTooltip: (_content: React.ReactNode, trigger: React.ReactElement) => trigger,
  subject,
  subjectActionState: { kind: 'mark_studied' as const, tooltip: 'Marcar como estudada' },
  subjectDisplayName: 'Direito Constitucional',
  subjectTopicSummaryLabel: '0/1 tópicos iniciados',
  weightControl: <span>Peso baixo</span>,
};

describe('CycleSubjectCard', () => {
  it('shows a clear merged subject chip and opens merge reversion from it', () => {
    const onOpenRevertMerge = vi.fn();

    render(
      <CycleSubjectCard
        {...baseProps}
        isMerged
        onOpenRevertMerge={onOpenRevertMerge}
      />,
    );

    const chip = screen.getByRole('button', {
      name: 'Direito Constitucional é uma matéria unificada. Clique para revisar ou desfazer a mesclagem.',
    });

    expect(screen.getByText('Unificada')).toBeInTheDocument();

    fireEvent.click(chip);

    expect(onOpenRevertMerge).toHaveBeenCalledTimes(1);
    expect(baseProps.onToggleExpand).not.toHaveBeenCalled();
  });
});
