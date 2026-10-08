import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardConsistencyHeatmap } from './DashboardConsistencyHeatmap';
import type { DashboardHeatmapDay } from '@/types/dashboardDecision';

describe('DashboardConsistencyHeatmap', () => {
  const sampleDays: DashboardHeatmapDay[] = [
    {
      date: '2026-10-01',
      intensity: 'completed',
      studyMinutes: 45,
      reviewsCount: 3,
      practiceCount: 10,
      isToday: false,
    },
    {
      date: '2026-10-02',
      intensity: 'exceeded',
      studyMinutes: 90,
      reviewsCount: 6,
      practiceCount: 20,
      isToday: false,
    },
    {
      date: '2026-10-03',
      intensity: 'none',
      studyMinutes: 0,
      reviewsCount: 0,
      practiceCount: 0,
      isToday: false,
    },
    {
      date: '2026-10-07',
      intensity: 'partial',
      studyMinutes: 20,
      reviewsCount: 1,
      practiceCount: 5,
      isToday: true,
    },
  ];

  it('renders heading, active days count and current streak', () => {
    render(
      <DashboardConsistencyHeatmap
        heatmap={{
          days: sampleDays,
          currentStreak: 5,
          totalActiveDays: 3,
        }}
      />,
    );

    expect(screen.getByText('Consistência')).toBeInTheDocument();
    expect(screen.getByText('3 dias ativos')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('dias')).toBeInTheDocument();
  });

  it('renders clear Portuguese legend and weekday labels without crashing', () => {
    render(
      <DashboardConsistencyHeatmap
        heatmap={{
          days: sampleDays,
          currentStreak: 0,
          totalActiveDays: 0,
        }}
      />,
    );

    expect(screen.getByText('Sem estudo')).toBeInTheDocument();
    expect(screen.getByText('Parcial')).toBeInTheDocument();
    expect(screen.getByText('Meta batida')).toBeInTheDocument();
    expect(screen.getByText('Hoje')).toBeInTheDocument();

    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Qua')).toBeInTheDocument();
    expect(screen.getByText('Sex')).toBeInTheDocument();
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByText(/Histórico diário por semana \(Seg a Dom\)/i)).toBeInTheDocument();
  });

  it('renders today day element with today indicator styling', () => {
    const todayNoneStudy: DashboardHeatmapDay[] = [
      {
        date: '2026-10-07',
        intensity: 'none',
        studyMinutes: 0,
        reviewsCount: 0,
        practiceCount: 0,
        isToday: true,
      },
    ];

    render(
      <DashboardConsistencyHeatmap
        heatmap={{
          days: todayNoneStudy,
          currentStreak: 0,
          totalActiveDays: 0,
        }}
      />,
    );

    const todayButton = screen.getByRole('button', { name: /2026-10-07: 0m estudados/i });
    expect(todayButton).toBeInTheDocument();
    expect(todayButton).toHaveClass('ring-blue-500');
    expect(todayButton).toHaveClass('bg-blue-500/20');
  });
});
