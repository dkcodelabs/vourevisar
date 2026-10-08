import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardMetricsBar } from './DashboardMetricsBar';

describe('DashboardMetricsBar', () => {
  it('renders all four metrics correctly with formatted values', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardMetricsBar
        metrics={{
          totalStudyMinutes: 155, // 2h 35m
          dailyAverageMinutes: 45, // 45m / dia
          activeStudyDays: 14,
          totalPracticeItems: 280,
        }}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText('Tempo total')).toBeInTheDocument();
    expect(screen.getByText('2h 35m')).toBeInTheDocument();

    expect(screen.getByText('Média diária')).toBeInTheDocument();
    expect(screen.getByText('45m / dia')).toBeInTheDocument();

    expect(screen.getByText('Dias estudados')).toBeInTheDocument();
    expect(screen.getByText('14 dias')).toBeInTheDocument();

    expect(screen.getByText('Total de questões')).toBeInTheDocument();
    expect(screen.getByText('280')).toBeInTheDocument();
  });

  it('triggers onNavigate callbacks when cards are clicked', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardMetricsBar
        metrics={{
          totalStudyMinutes: 60,
          dailyAverageMinutes: 30,
          activeStudyDays: 2,
          totalPracticeItems: 10,
        }}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByText('Tempo total').closest('button')!);
    expect(onNavigate).toHaveBeenCalledWith('/ciclo-estudos');

    fireEvent.click(screen.getByText('Total de questões').closest('button')!);
    expect(onNavigate).toHaveBeenCalledWith('/treino');
  });

  it('renders 0h 00m gracefully when totalStudyMinutes is 0', () => {
    render(
      <DashboardMetricsBar
        metrics={{
          totalStudyMinutes: 0,
          dailyAverageMinutes: 0,
          activeStudyDays: 0,
          totalPracticeItems: 0,
        }}
      />,
    );

    expect(screen.getByText('0h 00m')).toBeInTheDocument();
    expect(screen.getByText('0m / dia')).toBeInTheDocument();
    expect(screen.getByText('0 dias')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
