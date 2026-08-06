import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StudyCycleWorkspace } from './StudyCycleWorkspace';

vi.mock('@/components/study-cycle/CycleWorkspaceHeaderSection', () => ({
  CycleWorkspaceHeaderSection: () => <div data-testid="workspace-header" />,
}));

vi.mock('@/components/study-cycle/CycleVerticalWorkspaceSection', () => ({
  CycleVerticalWorkspaceSection: () => <div data-testid="vertical-workspace" />,
}));

vi.mock('@/components/study-cycle/CycleQueueList', () => ({
  CycleQueueList: () => <div data-testid="cycle-queue-list" />,
}));

vi.mock('@/components/study-cycle/StrategicPanelSection', () => ({
  StrategicPanelSection: () => <div data-testid="strategic-panel" />,
}));

vi.mock('@/components/study-cycle/CycleFirstContactFinishedPanel', () => ({
  CycleFirstContactFinishedPanel: ({ variant }: { variant?: string }) => (
    <div data-testid="first-contact-finished">{variant}</div>
  ),
}));

vi.mock('@/components/study-cycle/CycleEmptyState', () => ({
  CycleEmptyState: ({ state }: { state: { kind: string } }) => (
    <div data-testid="cycle-empty-state">{state.kind}</div>
  ),
}));

const makeProps = (
  overrides: Partial<ComponentProps<typeof StudyCycleWorkspace>> = {},
): ComponentProps<typeof StudyCycleWorkspace> => ({
  activeTab: 'all',
  cycleTransitionSummary: {} as ComponentProps<typeof StudyCycleWorkspace>['cycleTransitionSummary'],
  cycleEntryState: { kind: 'ready' },
  dataLoaded: true,
  displayListLength: 1,
  dndContextProps: {},
  firstContactFormatStudyMinutes: (minutes) => `${minutes} min`,
  hasActiveCycle: true,
  hasMore: false,
  isCycleFullyStudied: false,
  isLoading: false,
  localSubjectsCount: 1,
  onGoToEditais: vi.fn(),
  onOpenImport: vi.fn(),
  onLoadMore: vi.fn(),
  onNavigate: vi.fn(),
  onStartNextCycle: vi.fn(),
  queueProps: {} as ComponentProps<typeof StudyCycleWorkspace>['queueProps'],
  remainingItemsCount: 0,
  strategicPanelProps: {} as ComponentProps<typeof StudyCycleWorkspace>['strategicPanelProps'],
  verticalWorkspaceProps: {} as ComponentProps<typeof StudyCycleWorkspace>['verticalWorkspaceProps'],
  workspaceHeaderProps: {
    activeTab: 'all',
    cycleDisplayName: 'Ciclo',
    cycleSearchQuery: '',
    expandedSubjectIds: [],
    filteredSubjectIds: [],
    inputRef: { current: null },
    isReorderingCycle: false,
    onActivateSearch: vi.fn(),
    onClearSearch: vi.fn(),
    onSearchChange: vi.fn(),
    onToggleAll: vi.fn(),
    onToggleReorder: vi.fn(),
    onToggleViewMode: vi.fn(),
    verticalSubjectIds: [],
  },
  ...overrides,
});

describe('StudyCycleWorkspace', () => {
  it('renders the vertical workspace without the cycle queue panel', () => {
    render(<StudyCycleWorkspace {...makeProps({ activeTab: 'vertical' })} />);

    expect(screen.getByTestId('workspace-header')).toBeInTheDocument();
    expect(screen.getByTestId('vertical-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('cycle-queue-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('strategic-panel')).not.toBeInTheDocument();
  });

  it('renders the empty state with search context when the queue has no visible item', () => {
    render(<StudyCycleWorkspace {...makeProps({
      displayListLength: 0,
      workspaceHeaderProps: {
        ...makeProps().workspaceHeaderProps,
        cycleSearchQuery: 'constitucional',
      },
    })} />);

    expect(screen.getByTestId('cycle-empty-state')).toHaveTextContent('ready');
    expect(screen.queryByTestId('cycle-queue-list')).not.toBeInTheDocument();
  });

  it('renders queue, strategic panel and load-more action in cycle mode', async () => {
    const onLoadMore = vi.fn();

    render(<StudyCycleWorkspace {...makeProps({
      hasMore: true,
      onLoadMore,
      remainingItemsCount: 3,
    })} />);

    expect(screen.getByTestId('cycle-queue-list')).toBeInTheDocument();
    expect(screen.getByTestId('strategic-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ver mais matérias/i }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
