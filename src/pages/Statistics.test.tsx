import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import Statistics from '@/pages/Statistics';
import type { CycleStatisticsData } from '@/types/cycleStatistics';

const navigate = vi.fn();
const useCycleStatistics = vi.fn();
const setSearchParams = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
    useSearchParams: () => [searchParams, setSearchParams],
  };
});

vi.mock('@/hooks/useCycleStatistics', () => ({
  useCycleStatistics: (period: number | 'all', selectedDate: string | null) => useCycleStatistics(period, selectedDate),
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
      difficulty: {
        ratedTopics: 7,
        easyTopics: 2,
        mediumTopics: 3,
        hardTopics: 2,
      },
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
  selectedDay: null,
};

describe('Statistics', () => {
  beforeEach(() => {
    navigate.mockReset();
    setSearchParams.mockReset();
    searchParams = new URLSearchParams();
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
    expect(screen.getByText(/Dificuldade vem das suas marcações/)).toBeInTheDocument();
    expect(screen.getByText('2 difíceis')).toBeInTheDocument();
    expect(screen.getByText('7/10 avaliados')).toBeInTheDocument();
    expect(screen.queryByText('3 altas')).not.toBeInTheDocument();
    expect(screen.queryByText('8/10 analisados')).not.toBeInTheDocument();
    expect(screen.queryByText(/migrar difficulty/i)).not.toBeInTheDocument();
  });

  it('changes the analysis period and preserves the focused action context', () => {
    render(<Statistics />);

    fireEvent.click(screen.getByRole('button', { name: '14 dias' }));
    expect(useCycleStatistics).toHaveBeenLastCalledWith(14, null);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir revisões' }));
    expect(navigate).toHaveBeenCalledWith('/revisoes', {
      state: { focusSubjectId: 'subject-1' },
    });
  });

  it('opens a linked day and clears the date when returning to the period', () => {
    const selectedDate = format(new Date(), 'yyyy-MM-dd');
    searchParams = new URLSearchParams(`date=${selectedDate}`);
    useCycleStatistics.mockReturnValue({
      data: {
        ...statistics,
        selectedDay: {
          date: selectedDate,
          label: 'Sexta, 29 de agosto',
          sessionMinutes: 40,
          subjectMinutes: [{
            subjectId: 'subject-1',
            subjectName: 'Direito Constitucional',
            color: '#2563eb',
            minutes: 40,
          }],
          contacts: [{
            id: 'contact-1',
            topicId: 'topic-1',
            topicName: 'Controle de constitucionalidade',
            subjectId: 'subject-1',
            subjectName: 'Direito Constitucional',
            durationMinutes: 90,
            reviewedAt: `${selectedDate}T10:00:00.000Z`,
            type: 'review',
          }],
          contactsUnavailable: false,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<Statistics />);

    expect(useCycleStatistics).toHaveBeenLastCalledWith(7, selectedDate);
    expect(screen.getByRole('heading', { name: 'Sexta, 29 de agosto' })).toBeInTheDocument();
    expect(screen.getAllByText('40 min')).toHaveLength(2);
    expect(screen.getByText('Controle de constitucionalidade')).toBeInTheDocument();
    expect(screen.getByText('registro: 1h 30min')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao período' }));
    expect(setSearchParams).toHaveBeenCalledWith({}, { replace: true });
  });

  it('keeps canonical statistics visible when only the daily contacts fail', () => {
    const selectedDate = format(new Date(), 'yyyy-MM-dd');
    const refetch = vi.fn();
    searchParams = new URLSearchParams(`date=${selectedDate}`);
    useCycleStatistics.mockReturnValue({
      data: {
        ...statistics,
        selectedDay: {
          date: selectedDate,
          label: 'Sexta, 29 de agosto',
          sessionMinutes: 40,
          subjectMinutes: [],
          contacts: [],
          contactsUnavailable: true,
        },
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch,
    });

    render(<Statistics />);

    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('Contatos do dia indisponíveis')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum contato registrado')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
