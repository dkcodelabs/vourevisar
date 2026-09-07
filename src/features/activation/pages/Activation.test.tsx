import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logMethodSelection: vi.fn(),
  useActivationJourney: vi.fn(),
}));

vi.mock('@/features/activation/hooks/useActivationJourney', () => ({
  useActivationJourney: mocks.useActivationJourney,
}));

vi.mock('@/features/activation/hooks/useActivationTelemetry', () => ({
  useActivationTelemetry: () => ({ logMethodSelection: mocks.logMethodSelection }),
}));

import Activation from './Activation';

describe('Activation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useActivationJourney.mockReturnValue({
      journey: {
        kind: 'no_edital',
        activeStep: 0,
        completedSteps: 0,
        title: 'Transforme seu edital em uma rotina que sabe o próximo passo.',
        description: 'O vouRevisar organiza seu estudo.',
        primaryActionLabel: 'Escolher edital no catálogo',
        primaryHref: '/meus-editais',
        primaryState: { openImportModal: true, importTab: 'ready' },
        edital: null,
        cycleName: null,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('makes catalog primary while keeping AI and manual entry honest', () => {
    render(<MemoryRouter><Activation /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /transforme seu edital/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /catálogo/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /importar pdf com ia/i })).toHaveAttribute('href', '/meus-editais');
    expect(screen.getByRole('link', { name: /criar manualmente/i })).toHaveAttribute('href', '/meus-editais');
    expect(screen.getByLabelText('0 de 3 etapas concluídas')).toBeInTheDocument();
  });

  it('lists every eligible edital instead of choosing one silently', () => {
    mocks.useActivationJourney.mockReturnValue({
      journey: {
        kind: 'edital_selection_required',
        activeStep: 1,
        completedSteps: 1,
        title: 'Escolha seu edital.',
        description: 'Nada será carregado automaticamente.',
        primaryActionLabel: 'Escolher meu edital',
        primaryHref: '#editais-prontos',
        edital: null,
        eligibleEditais: [
          { id: 'trt', name: 'TRT 2026', subjectCount: 8 },
          { id: 'tj', name: 'TJ 2026', subjectCount: 12 },
        ],
        cycleName: null,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<MemoryRouter><Activation /></MemoryRouter>);

    expect(screen.getByRole('link', { name: /trt 2026/i })).toHaveAttribute('href', '/meus-editais?sourceId=trt');
    expect(screen.getByRole('link', { name: /tj 2026/i })).toHaveAttribute('href', '/meus-editais?sourceId=tj');
  });
});
