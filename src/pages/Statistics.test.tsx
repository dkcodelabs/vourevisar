import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Statistics from '@/pages/Statistics';
import type { CycleStatisticsData } from '@/types/cycleStatistics';

const navigate = vi.fn();
const useCycleStatistics = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

vi.mock('@/hooks/useCycleStatistics', () => ({
  useCycleStatistics: (period: number) => useCycleStatistics(period),
}));

vi.mock('recharts', () => ({
  Bar: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const statistics: CycleStatisticsData = {
  cycleId: 'cycle-1',
  cycleName: 'Reta final',
  editalLabel: 'TRF 2026',
  examDate: '2026-10-18',
  combinedEditaisCount: 1,
  progress: {
    total: 20,
    notStarted: 8,
    started: 12,
    inDevelopment: 9,
    completed: 3,
    coveragePercentage: 60,
    completionPercentage: 15,
  },
  memory: {
    eligible: 12,
    learning: 5,
    fixing: 4,
    mastering: 3,
    overdue: 2,
    dueToday: 1,
    future: 6,
    unscheduled: 0,
  },
  time: {
    totalMinutes: 430,
    averagePerActiveDay: 86,
    activeDays: 5,
    periodDays: 7,
    currentStreak: 3,
    bestStreak: 5,
    isAllCycle: false,
    previousPeriodMinutes: 300,
    comparisonPercentage: 43,
    daily: [
      { date: '2026-08-25', label: '25/08', minutes: 90, isActive: true },
    ],
  },
  subjects: [
    {
      id: 'subject-1',
      name: 'Direito Constitucional',
      color: '#2563eb',
      totalTopics: 10,
      startedTopics: 8,
      completedTopics: 2,
      overdueReviews: 2,
      studyMinutes: 250,
      coveragePercentage: 80,
      weightLabel: '20 questões',
      hasWeight: true,
    },
  ],
  insight: {
    id: 'overdue-reviews',
    tone: 'critical',
    title: 'Recupere as revisões vencidas',
    description: 'A fila vencida é o ponto mais urgente do ciclo.',
    evidence: '2 revisões vencidas em Direito Constitucional.',
    actionLabel: 'Abrir revisões',
    actionHref: '/revisoes',
    focusSubjectId: 'subject-1',
  },
  hasStudyTime: true,
};

describe('Statistics', () => {
  beforeEach(() => {
    navigate.mockReset();
    useCycleStatistics.mockReset();
    useCycleStatistics.mockReturnValue({
      data: statistics,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it('renders the real-data evolution hierarchy without legacy controls', () => {
    render(<Statistics />);

    expect(screen.getByRole('heading', { level: 1, name: 'Evolução' })).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('Maturidade do conteúdo')).toBeInTheDocument();
    expect(screen.getByText('Ritmo registrado')).toBeInTheDocument();
    expect(screen.getByText('Direito Constitucional')).toBeInTheDocument();
    expect(screen.queryByText(/migrar difficulty/i)).not.toBeInTheDocument();
  });

  it('changes the analysis period and preserves the focused action context', () => {
    render(<Statistics />);

    fireEvent.click(screen.getByRole('button', { name: '14 dias' }));
    expect(useCycleStatistics).toHaveBeenLastCalledWith(14);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir revisões' }));
    expect(navigate).toHaveBeenCalledWith('/revisoes', {
      state: { focusSubjectId: 'subject-1' },
    });
  });
});
