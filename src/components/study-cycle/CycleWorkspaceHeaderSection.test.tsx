import { createRef } from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cycleWorkspaceHeader: vi.fn(() => <div data-testid="workspace-header" />),
}));

vi.mock('./CycleWorkspaceHeader', () => ({
  CycleWorkspaceHeader: (props: unknown) => mocks.cycleWorkspaceHeader(props),
}));

import { CycleWorkspaceHeaderSection } from './CycleWorkspaceHeaderSection';

describe('CycleWorkspaceHeaderSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds the cycle-mode header with the current cycle title and filtered count', () => {
    render(
      <CycleWorkspaceHeaderSection
        activeTab="all"
        cycleDisplayName="Ciclo Alfa"
        cycleSearchQuery="constitucional"
        expandedSubjectIds={['subject-1']}
        filteredSubjectIds={['subject-1', 'subject-2']}
        inputRef={createRef<HTMLInputElement>()}
        isReorderingCycle={true}
        onActivateSearch={vi.fn()}
        onClearSearch={vi.fn()}
        onSearchChange={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleReorder={vi.fn()}
        onToggleViewMode={vi.fn()}
        verticalSubjectIds={['subject-1', 'subject-2', 'subject-3']}
      />,
    );

    expect(screen.getByTestId('workspace-header')).toBeInTheDocument();
    expect(mocks.cycleWorkspaceHeader).toHaveBeenCalledWith(expect.objectContaining({
      allExpanded: false,
      canToggleAll: true,
      count: 2,
      isCycleMode: true,
      title: 'Ciclo Alfa',
    }));

    const workspaceHeaderProps = mocks.cycleWorkspaceHeader.mock.calls[0][0] as {
      reorderControl: ReactElement;
      searchControl: ReactElement;
      viewModeControl: ReactElement;
    };

    expect(workspaceHeaderProps.reorderControl.props).toEqual(expect.objectContaining({
      isReorderingCycle: true,
      reorderDisabled: false,
    }));
    expect(workspaceHeaderProps.searchControl.props).toEqual(expect.objectContaining({
      query: 'constitucional',
    }));
    expect(workspaceHeaderProps.viewModeControl.props).toEqual(expect.objectContaining({
      activeTab: 'all',
    }));
  });

  it('switches to the vertical-mode title and count', () => {
    render(
      <CycleWorkspaceHeaderSection
        activeTab="vertical"
        cycleDisplayName=""
        cycleSearchQuery=""
        expandedSubjectIds={['subject-1', 'subject-2']}
        filteredSubjectIds={['subject-1']}
        inputRef={createRef<HTMLInputElement>()}
        isReorderingCycle={false}
        onActivateSearch={vi.fn()}
        onClearSearch={vi.fn()}
        onSearchChange={vi.fn()}
        onToggleAll={vi.fn()}
        onToggleReorder={vi.fn()}
        onToggleViewMode={vi.fn()}
        verticalSubjectIds={['subject-1', 'subject-2']}
      />,
    );

    expect(mocks.cycleWorkspaceHeader).toHaveBeenCalledWith(expect.objectContaining({
      allExpanded: true,
      canToggleAll: true,
      count: 2,
      isCycleMode: false,
      title: 'Edital Verticalizado',
    }));

    const workspaceHeaderProps = mocks.cycleWorkspaceHeader.mock.calls[0][0] as {
      reorderControl: ReactElement;
      viewModeControl: ReactElement;
    };

    expect(workspaceHeaderProps.reorderControl.props).toEqual(expect.objectContaining({
      reorderDisabled: true,
    }));
    expect(workspaceHeaderProps.viewModeControl.props).toEqual(expect.objectContaining({
      activeTab: 'vertical',
    }));
  });
});
