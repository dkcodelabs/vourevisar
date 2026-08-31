import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Dashboard from './Dashboard';

const mocks = vi.hoisted(() => ({
  model: { error: new Error('cycle unavailable') },
}));

vi.mock('@/hooks/useDashboardDecisionModel', () => ({
  useDashboardDecisionModel: () => ({
    model: mocks.model,
    addReminder: vi.fn(),
    toggleReminder: vi.fn(),
    deleteReminder: vi.fn(),
    updateCycleName: vi.fn(),
    isAddingReminder: false,
    isDeletingReminder: false,
    isUpdatingCycleName: false,
    navigateToAction: vi.fn(),
    retryDashboardDataIssue: vi.fn(),
  }),
}));

vi.mock('@/components/dashboard-decision/DashboardDecisionExperience', () => ({
  DashboardDecisionExperience: () => <div>Experiência de decisão</div>,
}));

describe('Dashboard critical load state', () => {
  it('shows the connection error instead of rendering an empty decision experience', () => {
    render(<Dashboard />);

    expect(screen.getByText('Seus estudos estão salvos. Só não consegui buscar os dados agora.')).toBeVisible();
    expect(screen.getByText('cycle unavailable')).toBeVisible();
    expect(screen.queryByText('Experiência de decisão')).not.toBeInTheDocument();
  });
});
