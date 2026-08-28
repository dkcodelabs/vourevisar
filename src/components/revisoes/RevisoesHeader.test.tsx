import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RevisoesHeader } from './RevisoesHeader';
import type { StudyCyclePaceMetrics } from '@/utils/studyCycleMetrics';

const mockStats = {
  today: 0,
  overdue: 0,
  future: 0,
  completedTopicsCount: 0,
  completedReviews: 0,
  totalScheduledReviews: 0,
};

describe('RevisoesHeader', () => {
  it('renders "Definir data" button and volume stats when pace needs exam date', () => {
    const onOpenExamDateEditor = vi.fn();
    const paceNeedsDate: StudyCyclePaceMetrics = {
      state: 'missing_exam_date',
      explanation: 'Defina uma data de prova para calcular o ritmo necessário.',
      daysRemaining: null,
      unstartedTopics: 103,
      pendingReviews: 0,
      futureReviewsInWindow: 0,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      recentFirstContact: {
        state: 'insufficient_data',
        topicsStarted: 0,
        windowDays: 7,
        topicsPerDay: null,
        projectedDaysToFirstContact: null,
        averageStudyMinutes: null,
      },
    };

    render(
      <RevisoesHeader
        stats={mockStats}
        isCollapsed={false}
        onToggle={() => undefined}
        pace={paceNeedsDate}
        onOpenExamDateEditor={onOpenExamDateEditor}
      />
    );

    expect(screen.getByText('Definir data da prova')).toBeInTheDocument();
    expect(screen.getByText('103 novos')).toBeInTheDocument();
    expect(screen.getByText('0 hoje')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Definir data da prova'));
    expect(onOpenExamDateEditor).toHaveBeenCalledTimes(1);
  });

  it('renders "Alterar data" and calculated pace when pace is ready', () => {
    const onOpenExamDateEditor = vi.fn();
    const paceReady: StudyCyclePaceMetrics = {
      state: 'ready',
      explanation: '60 dias para a prova.',
      daysRemaining: 60,
      unstartedTopics: 100,
      pendingReviews: 50,
      futureReviewsInWindow: 20,
      totalPlannedReviews: 400,
      newTopicsPerDay: 1.7,
      reviewsPerDay: 6.7,
      totalDailyWorkload: 8.4,
      recentFirstContact: {
        state: 'ready',
        topicsStarted: 10,
        windowDays: 7,
        topicsPerDay: 1.4,
        projectedDaysToFirstContact: 71,
        averageStudyMinutes: 45,
      },
    };

    render(
      <RevisoesHeader
        stats={mockStats}
        isCollapsed={false}
        onToggle={() => undefined}
        pace={paceReady}
        onOpenExamDateEditor={onOpenExamDateEditor}
      />
    );

    expect(screen.getByText('Alterar data')).toBeInTheDocument();
    expect(screen.getByText('1,7/dia')).toBeInTheDocument();
    expect(screen.getByText('6,7/dia')).toBeInTheDocument();
    expect(screen.getByText('~8,4/dia')).toBeInTheDocument();
  });

  it('renders cycleTitle in the header when provided', () => {
    render(
      <RevisoesHeader
        stats={mockStats}
        isCollapsed={false}
        onToggle={() => undefined}
        cycleTitle="MAPA + IBAMA (2 editais unificados)"
      />
    );

    expect(screen.getByText('· MAPA + IBAMA (2 editais unificados)')).toBeInTheDocument();
  });
});
