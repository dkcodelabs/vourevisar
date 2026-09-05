import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EvolutionCycleComparison } from '@/components/statistics/EvolutionCycleComparison';
import type { CycleComparisonData } from '@/types/cycleComparison';

const comparison: CycleComparisonData = {
  comparability: 'full',
  previous: {
    id: 'previous',
    cycleNumber: 1,
    startedAt: '2026-08-01T10:00:00.000Z',
    completedAt: '2026-08-04T10:00:00.000Z',
    durationDays: 3,
    subjectCount: 4,
    studiedSubjectCount: 4,
    topicsStartedCount: 3,
    topicsCompletedCount: 1,
    cycleSubjectIds: ['a', 'b', 'c', 'd'],
    startPacePerDay: 1,
    consolidationPacePerDay: 1 / 3,
  },
  latest: {
    id: 'latest',
    cycleNumber: 2,
    startedAt: '2026-08-04T10:00:00.000Z',
    completedAt: '2026-08-06T10:00:00.000Z',
    durationDays: 2,
    subjectCount: 4,
    studiedSubjectCount: 4,
    topicsStartedCount: 4,
    topicsCompletedCount: 2,
    cycleSubjectIds: ['a', 'b', 'c', 'd'],
    startPacePerDay: 2,
    consolidationPacePerDay: 1,
  },
  deltas: {
    durationDays: { absolute: -1, percentage: -33.3 },
    studiedSubjectCount: { absolute: 0, percentage: 0 },
    topicsStartedCount: { absolute: 1, percentage: 33.3 },
    topicsCompletedCount: { absolute: 1, percentage: 100 },
    startPacePerDay: { absolute: 1, percentage: 100 },
    consolidationPacePerDay: { absolute: 2 / 3, percentage: 200 },
  },
};

describe('EvolutionCycleComparison', () => {
  it('renders the latest two completed rotations without ranking them', () => {
    render(<EvolutionCycleComparison comparison={comparison} isLoading={false} isError={false} isRetrying={false} onRetry={vi.fn()} />);

    expect(screen.getByText('Último giro × giro anterior')).toBeInTheDocument();
    expect(screen.getByText(/Giro 1/)).toBeInTheDocument();
    expect(screen.getByText(/Giro 2/)).toBeInTheDocument();
    expect(screen.getByText('Você iniciou 1,0 tópico a mais por dia no último giro.')).toBeInTheDocument();
    expect(screen.queryByText(/melhor/i)).not.toBeInTheDocument();
  });

  it('shows an honest compact state before two rotations exist', () => {
    render(<EvolutionCycleComparison comparison={null} isLoading={false} isError={false} isRetrying={false} onRetry={vi.fn()} />);

    expect(screen.getByText('A comparação aparece depois de concluir mais um giro')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('keeps query errors local and retries on demand', () => {
    const onRetry = vi.fn();
    render(<EvolutionCycleComparison comparison={undefined} isLoading={false} isError isRetrying={false} onRetry={onRetry} />);

    expect(screen.getByText('Comparação indisponível agora')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('warns when the subject scope changed and suppresses pace conclusions', () => {
    render(<EvolutionCycleComparison comparison={{ ...comparison, comparability: 'scope_changed' }} isLoading={false} isError={false} isRetrying={false} onRetry={vi.fn()} />);

    expect(screen.getByText(/O ciclo mudou entre os giros/)).toBeInTheDocument();
    expect(screen.getByText(/composição diferente impede uma leitura direta/)).toBeInTheDocument();
    expect(screen.queryByText(/tópico a mais por dia/)).not.toBeInTheDocument();
  });
});
