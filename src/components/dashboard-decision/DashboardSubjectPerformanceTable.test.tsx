import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardSubjectPerformanceTable } from './DashboardSubjectPerformanceTable';
import type { DashboardSubjectPerformance } from '@/types/dashboardDecision';

describe('DashboardSubjectPerformanceTable', () => {
  const sampleData: DashboardSubjectPerformance[] = [
    {
      subjectId: 'sub-1',
      subjectName: 'Direito Constitucional',
      color: '#3B82F6',
      completedTopics: 12,
      totalTopics: 20,
      overdueReviewsCount: 0,
      correct: 42,
      incorrect: 8,
      skipped: 2,
      totalMinutes: 320,
      accuracyPercentage: 84,
    },
    {
      subjectId: 'sub-2',
      subjectName: 'Língua Portuguesa',
      color: '#EC4899',
      completedTopics: 5,
      totalTopics: 15,
      overdueReviewsCount: 2,
      correct: 18,
      incorrect: 12,
      skipped: 0,
      totalMinutes: 180,
      accuracyPercentage: 60,
    },
    {
      subjectId: 'sub-3',
      subjectName: 'Raciocínio Lógico',
      color: null,
      completedTopics: 0,
      totalTopics: 10,
      overdueReviewsCount: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0,
      totalMinutes: 60,
      accuracyPercentage: null,
    },
  ];

  it('renders table columns, subject rows, accuracy percentages and totals', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardSubjectPerformanceTable
        performance={sampleData}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText('Desempenho por Matéria')).toBeInTheDocument();
    expect(screen.getByText('Ciclo')).toBeInTheDocument();
    expect(screen.getByText('Revisões')).toBeInTheDocument();
    expect(screen.getByText('Questões')).toBeInTheDocument();

    expect(screen.getByText('Direito Constitucional')).toBeInTheDocument();
    expect(screen.getByText('Língua Portuguesa')).toBeInTheDocument();
    expect(screen.getByText('Raciocínio Lógico')).toBeInTheDocument();

    // Ciclo progress
    expect(screen.getByText(/12 \/ 20/)).toBeInTheDocument();
    expect(screen.getByText(/5 \/ 15/)).toBeInTheDocument();

    // Revisões status badges
    expect(screen.getAllByText('Em dia')).toHaveLength(2);
    expect(screen.getByText('2 atrasadas')).toBeInTheDocument();

    expect(screen.getByText('84%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // sem questoes

    expect(screen.getByText((_, element) => element?.textContent === '3 matérias')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver em Estatísticas/i }));
    expect(onNavigate).toHaveBeenCalledWith('/estatisticas');
  });

  it('renders an empty state when performance list is empty', () => {
    const onNavigate = vi.fn();
    render(
      <DashboardSubjectPerformanceTable
        performance={[]}
        onNavigate={onNavigate}
      />,
    );

    expect(screen.getByText('Nenhuma matéria no ciclo ativo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Carregar edital/i }));
    expect(onNavigate).toHaveBeenCalledWith('/meus-editais');
  });
});
