import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { RevisionStatus, type RevisionItem } from '@/types/revision';
import { RevisoesList } from './RevisoesList';

vi.mock('@/hooks/useMentorInsights', () => ({
  useMentorInsights: () => ({
    gargaloByTopic: new Map(),
    trendByTopic: new Map(),
  }),
}));

const makeItem = (overrides: Partial<RevisionItem> = {}): RevisionItem => ({
  id: 'topic-1',
  topic: 'Crase',
  subject: 'PORTUGUÊS',
  subjectId: 'subject-1',
  difficulty: 2,
  dueDate: '2026-07-13T00:00:00.000Z',
  notes: '',
  status: RevisionStatus.TODAY,
  ownerImage: '',
  reviewCount: 1,
  maxReviews: 4,
  ...overrides,
});

const renderList = (item: RevisionItem) => render(
  <MemoryRouter>
    <RevisoesList
      activeTab="ALL"
      groupedItems={{ [RevisionStatus.TODAY]: [item] }}
      collapsedGroups={{}}
      setCollapsedGroups={() => undefined}
      stats={{
        today: 1,
        overdue: 0,
        future: 0,
        totalTopics: 1,
        totalSubjects: 1,
        startedTopicsCount: 1,
      }}
      activeTimer={null}
      highlightedTopicId={null}
      loadingActions={{}}
      handleMarkCompleted={() => undefined}
      handleAiAssist={() => undefined}
      openNotesModal={() => undefined}
      setSearchTerm={() => undefined}
      setReviewStageFilter={() => undefined}
    />
  </MemoryRouter>,
);

describe('RevisoesList origin traceability', () => {
  it('renders the compact origin line when review origin should be shown', () => {
    renderList(makeItem({
      originSummary: 'Teste A - Cargo A + Teste B - Cargo B',
      originLabels: ['Teste A - Cargo A', 'Teste B - Cargo B'],
      isMergedOrigin: true,
      showOrigin: true,
    }));

    expect(screen.getByText('Origem: Teste A - Cargo A + Teste B - Cargo B')).toBeInTheDocument();
  });

  it('keeps single-cycle origin metadata out of the visible row', () => {
    renderList(makeItem({
      originSummary: 'Teste A - Cargo A',
      originLabels: ['Teste A - Cargo A'],
      showOrigin: false,
    }));

    expect(screen.queryByText('Origem: Teste A - Cargo A')).not.toBeInTheDocument();
  });
});
