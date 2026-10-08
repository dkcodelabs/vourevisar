import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardWeeklyPlanningCard } from './DashboardWeeklyPlanningCard';
import type { DashboardWeeklyPlanning } from '@/types/dashboardDecision';

describe('DashboardWeeklyPlanningCard', () => {
  const samplePlanning: DashboardWeeklyPlanning = {
    currentWeekMinutes: 720, // 12h 00m
    weeklyGoalHours: 20,
    days: [
      { date: '2026-10-05', dayLabel: 'Segunda', shortDay: 'S', reviewCount: 4, studyMinutes: 120, isToday: false, hasOverdue: false, isFuture: false },
      { date: '2026-10-06', dayLabel: 'Terça', shortDay: 'T', reviewCount: 2, studyMinutes: 60, isToday: false, hasOverdue: false, isFuture: false },
      { date: '2026-10-07', dayLabel: 'Quarta', shortDay: 'Q', reviewCount: 5, studyMinutes: 180, isToday: true, hasOverdue: true, isFuture: false },
      { date: '2026-10-08', dayLabel: 'Quinta', shortDay: 'Q', reviewCount: 3, studyMinutes: 0, isToday: false, hasOverdue: false, isFuture: true },
      { date: '2026-10-09', dayLabel: 'Sexta', shortDay: 'S', reviewCount: 0, studyMinutes: 0, isToday: false, hasOverdue: false, isFuture: true },
      { date: '2026-10-10', dayLabel: 'Sábado', shortDay: 'S', reviewCount: 1, studyMinutes: 0, isToday: false, hasOverdue: false, isFuture: true },
      { date: '2026-10-11', dayLabel: 'Domingo', shortDay: 'D', reviewCount: 0, studyMinutes: 0, isToday: false, hasOverdue: false, isFuture: true },
    ],
  };

  it('renders progress hours, goal, 7 days and total reviews', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardWeeklyPlanningCard
        planning={samplePlanning}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText('Planejamento')).toBeInTheDocument();
    expect(screen.getByText(/12h 00m/)).toBeInTheDocument();
    expect(screen.getByText(/\/ 20h/)).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument(); // 720 / 1200 = 60%
    expect(screen.getByText('Hoje')).toBeInTheDocument();

    // Total reviews = 4 + 2 + 5 + 3 + 0 + 1 + 0 = 15
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('revisões agendadas')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver todas/i }));
    expect(onNavigate).toHaveBeenCalledWith('/revisoes');
  });

  it('allows opening the goal editor popover when onUpdateWeeklyGoal is passed', async () => {
    const onUpdateGoal = vi.fn().mockResolvedValue(undefined);
    render(
      <DashboardWeeklyPlanningCard
        planning={samplePlanning}
        onUpdateWeeklyGoal={onUpdateGoal}
      />,
    );

    const editBtn = screen.getByRole('button', { name: /Editar meta semanal/i });
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    expect(screen.getByLabelText(/Meta semanal de horas/i)).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /Salvar/i });
    fireEvent.click(saveBtn);

    expect(onUpdateGoal).toHaveBeenCalledWith(20);
  });

  it('navigates to /revisoes?tab=today when clicking today or overdue day', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardWeeklyPlanningCard
        planning={samplePlanning}
        onNavigate={onNavigate}
      />,
    );

    const todayButton = screen.getByRole('button', { name: /Ver revisões de Quarta/i });
    fireEvent.click(todayButton);
    expect(onNavigate).toHaveBeenCalledWith('/revisoes?tab=today');
  });

  it('navigates to /revisoes?tab=future when clicking a future day', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardWeeklyPlanningCard
        planning={samplePlanning}
        onNavigate={onNavigate}
      />,
    );

    const futureButton = screen.getByRole('button', { name: /Ver revisões de Quinta/i });
    fireEvent.click(futureButton);
    expect(onNavigate).toHaveBeenCalledWith('/revisoes?tab=future');
  });

  it('navigates to /revisoes when clicking a past day', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardWeeklyPlanningCard
        planning={samplePlanning}
        onNavigate={onNavigate}
      />,
    );

    const pastButton = screen.getByRole('button', { name: /Ver revisões de Segunda/i });
    fireEvent.click(pastButton);
    expect(onNavigate).toHaveBeenCalledWith('/revisoes');
  });
});
