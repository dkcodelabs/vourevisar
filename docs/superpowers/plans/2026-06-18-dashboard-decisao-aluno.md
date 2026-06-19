# Dashboard de Decisao do Aluno Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium, responsive student Dashboard that shows the active cycle edital, the next best action, a short action queue, exam pace, reminders, and study trajectory using only real calculated data.

**Architecture:** Move Dashboard decision rules into focused domain utilities and a Dashboard view-model hook. The page should compose shadcn/Tailwind components and existing study/review hooks instead of running direct Supabase queries and priority logic inside `src/pages/Dashboard.tsx`.

**Tech Stack:** Vite, React 18, TypeScript, React Router DOM, TanStack Query, Supabase, Tailwind CSS, shadcn/ui, Radix UI, Lucide React, Vitest.

---

## Reference Documents

- Design spec: `docs/superpowers/specs/2026-06-18-dashboard-decisao-aluno-design.md`
- Living product plan: `docs/study-cycle-strategic-page-plan.md`
- Current dashboard: `src/pages/Dashboard.tsx`
- Reviews source of truth: `src/hooks/useReviewsData.tsx`
- Cycle source of truth: `src/hooks/useStudyCycleData.tsx`
- Existing activity card: `src/components/dashboard-v2/DashboardCalendar.tsx`
- Existing consistency strip: `src/components/dashboard-v2/ConsistencyCalendar.tsx`
- Existing reminders modal/data table: `src/components/GeneralNotesModal.tsx`, `general_reminders`

## Planned File Structure

- Create `src/types/dashboardDecision.ts`
  - Shared types for Dashboard actions, review summaries, cycle summaries, reminders, activity days, pace states, and full view model.
- Create `src/utils/dashboardDecision.ts`
  - Pure decision logic: review grouping, next cycle topic, charge coverage state, next best action, action queue, pace calculation, activity aggregation.
- Create `src/utils/dashboardDecision.test.ts`
  - Unit tests for no-invented-data behavior and priority ordering.
- Create `src/hooks/useDashboardDecisionModel.ts`
  - Combines existing hooks/services and small Supabase queries into one Dashboard view model.
- Create `src/components/dashboard-decision/DashboardHeroContext.tsx`
  - Premium contextual header with active edital, date state, and pace summary.
- Create `src/components/dashboard-decision/NextBestActionCard.tsx`
  - Main action card with one primary CTA and one detail CTA.
- Create `src/components/dashboard-decision/ActionQueueCard.tsx`
  - Short queue of up to 3 follow-up actions.
- Create `src/components/dashboard-decision/ExamPaceCard.tsx`
  - Honest pace block, including missing date/data states.
- Create `src/components/dashboard-decision/ContinueCycleCard.tsx`
  - Two or three next cycle items, respecting cycle order.
- Create `src/components/dashboard-decision/RecentRemindersCard.tsx`
  - Student-created reminders from `general_reminders`.
- Create `src/components/dashboard-decision/StudyActivityCard.tsx`
  - Premium 7/14/month activity view, with day detail callback.
- Create `src/components/dashboard-decision/TrajectorySummary.tsx`
  - Compact progress/evolution summary that embeds the existing `DifficultyEvolutionWidget` once, without recreating its calculation.
- Modify `src/pages/Dashboard.tsx`
  - Replace the current composition with the new Dashboard view model and components.
- Modify `src/hooks/useReviewsData.tsx`
  - Export its internal `Topic` type as `ReviewTopic` if needed by the Dashboard model.
- Leave `src/components/dashboard/StreakCalendarModal.tsx` unchanged in the first implementation pass.
  - The new activity card should show its own compact day details. Reuse the modal only in a later task if visual validation shows the compact detail is insufficient.

## Implementation Notes

- Do not add a new Supabase table or migration.
- Do not alter revision algorithms.
- Do not reorder the study cycle.
- Do not create fake placeholders to make empty states look full.
- Use `/revisoes?topicId=<id>` for review/topic focus when the item belongs to reviews.
- Use `/ciclo-estudos` for cycle context. If a specific topic/subject focus parameter is added, it must be supported by `Subjects.tsx` in the same task.
- Keep the old Dashboard components available until the new page is verified; remove unused imports only after replacement.

---

### Task 1: Define Dashboard Decision Types

**Files:**
- Create: `src/types/dashboardDecision.ts`

- [ ] **Step 1: Create shared types**

Create `src/types/dashboardDecision.ts`:

```ts
export type DashboardActionKind =
  | 'review_overdue'
  | 'review_today'
  | 'start_cycle_topic'
  | 'continue_cycle_topic'
  | 'strategic_high_charge'
  | 'configure_exam_date'
  | 'load_cycle'
  | 'all_caught_up';

export type DashboardActionTone = 'danger' | 'warning' | 'success' | 'info' | 'neutral';

export interface DashboardActionTarget {
  subjectId?: string;
  subjectName?: string;
  topicId?: string;
  topicName?: string;
  editalId?: string;
  reminderId?: string;
}

export interface DashboardAction {
  id: string;
  kind: DashboardActionKind;
  tone: DashboardActionTone;
  title: string;
  description: string;
  reason: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  target: DashboardActionTarget;
  priorityScore: number;
}

export interface DashboardReviewTopic {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  nextReview: string | null;
  reviewCount: number;
  difficultyLevel?: number | null;
  memoryStability?: number | null;
  currentInterval?: number | null;
}

export interface DashboardCycleTopic {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  firstStudiedAt?: string | null;
  reviewCount?: number | null;
  completed?: boolean | null;
  nextReview?: string | null;
  totalVolume?: number | null;
}

export interface DashboardCycleSubject {
  id: string;
  name: string;
  cyclePosition: number;
  isCompletedInCycle: boolean;
  topics: DashboardCycleTopic[];
}

export type ChargeCoverageState = 'none' | 'partial' | 'sufficient';

export interface DashboardExamContext {
  editalName: string | null;
  editalId?: string;
  examDate: string | null;
  daysRemaining: number | null;
  state: 'ready' | 'missing_cycle' | 'missing_exam_date' | 'exam_date_past';
}

export interface DashboardPace {
  state: 'ready' | 'missing_cycle' | 'missing_exam_date' | 'exam_date_past' | 'insufficient_data';
  daysRemaining: number | null;
  newTopicsPerDay: number | null;
  reviewsPerDay: number | null;
  unstartedTopics: number;
  pendingReviews: number;
  explanation: string;
}

export interface DashboardReminder {
  id: string;
  text: string;
  reminderDate: string | null;
  completed: boolean;
  href: string;
}

export interface DashboardActivityDay {
  date: string;
  studiedCount: number;
  reviewedCount: number;
  totalDurationMinutes: number;
  difficultyAverage: number | null;
  topicIds: string[];
}

export interface DashboardDecisionModel {
  isLoading: boolean;
  error: unknown;
  examContext: DashboardExamContext;
  pace: DashboardPace;
  nextBestAction: DashboardAction;
  actionQueue: DashboardAction[];
  continueCycleItems: DashboardAction[];
  reminders: DashboardReminder[];
  activityDays: DashboardActivityDay[];
  chargeCoverage: ChargeCoverageState;
  totals: {
    overdueReviews: number;
    todayReviews: number;
    futureReviews: number;
    unstartedTopics: number;
    startedTopics: number;
    totalTopics: number;
  };
}
```

- [ ] **Step 2: Run typecheck through build**

Run:

```bash
npm run build
```

Expected: build may fail because the types are unused only if the project has unrelated existing errors. If it fails, capture the first error before changing anything.

- [ ] **Step 3: Commit**

```bash
git add src/types/dashboardDecision.ts
git commit -m "feat: define dashboard decision types"
```

---

### Task 2: Add Pure Decision Utilities With Tests

**Files:**
- Create: `src/utils/dashboardDecision.ts`
- Create: `src/utils/dashboardDecision.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/dashboardDecision.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  buildDashboardPace,
  buildNextBestAction,
  getChargeCoverageState,
  getNextCycleActions,
  splitReviewsByDueDate,
} from './dashboardDecision';
import type { DashboardCycleSubject, DashboardReviewTopic } from '@/types/dashboardDecision';

const today = new Date('2026-06-18T12:00:00.000Z');

const reviewTopic = (overrides: Partial<DashboardReviewTopic>): DashboardReviewTopic => ({
  id: 'topic-review-1',
  name: 'Controle de Constitucionalidade',
  subjectId: 'subject-1',
  subjectName: 'Direito Constitucional',
  nextReview: '2026-06-17T09:00:00.000Z',
  reviewCount: 2,
  ...overrides,
});

const cycleSubject = (overrides: Partial<DashboardCycleSubject> = {}): DashboardCycleSubject => ({
  id: 'subject-1',
  name: 'Direito Constitucional',
  cyclePosition: 1,
  isCompletedInCycle: false,
  topics: [
    {
      id: 'topic-new-1',
      name: 'Atos Administrativos',
      subjectId: 'subject-1',
      subjectName: 'Direito Constitucional',
      firstStudiedAt: null,
      reviewCount: 0,
      completed: false,
      totalVolume: null,
    },
  ],
  ...overrides,
});

describe('splitReviewsByDueDate', () => {
  it('separates overdue, today, and future reviews by calendar day', () => {
    const result = splitReviewsByDueDate(
      [
        reviewTopic({ id: 'overdue', nextReview: '2026-06-17T09:00:00.000Z' }),
        reviewTopic({ id: 'today', nextReview: '2026-06-18T20:00:00.000Z' }),
        reviewTopic({ id: 'future', nextReview: '2026-06-19T09:00:00.000Z' }),
      ],
      today,
    );

    expect(result.overdue.map((topic) => topic.id)).toEqual(['overdue']);
    expect(result.today.map((topic) => topic.id)).toEqual(['today']);
    expect(result.future.map((topic) => topic.id)).toEqual(['future']);
  });
});

describe('getNextCycleActions', () => {
  it('respects cycle order and returns the first unstarted topic from the first eligible subject', () => {
    const actions = getNextCycleActions([
      cycleSubject({
        id: 'subject-done',
        name: 'Português',
        cyclePosition: 1,
        isCompletedInCycle: true,
      }),
      cycleSubject({
        id: 'subject-2',
        name: 'Direito Administrativo',
        cyclePosition: 2,
        topics: [
          {
            id: 'topic-started',
            name: 'Organização Administrativa',
            subjectId: 'subject-2',
            subjectName: 'Direito Administrativo',
            firstStudiedAt: '2026-06-10T10:00:00.000Z',
            reviewCount: 1,
            completed: false,
            totalVolume: null,
          },
          {
            id: 'topic-new',
            name: 'Atos Administrativos',
            subjectId: 'subject-2',
            subjectName: 'Direito Administrativo',
            firstStudiedAt: null,
            reviewCount: 0,
            completed: false,
            totalVolume: null,
          },
        ],
      }),
    ]);

    expect(actions[0]).toMatchObject({
      kind: 'start_cycle_topic',
      target: {
        subjectName: 'Direito Administrativo',
        topicName: 'Atos Administrativos',
      },
      primaryLabel: 'Iniciar estudo',
      primaryHref: '/ciclo-estudos',
    });
  });
});

describe('getChargeCoverageState', () => {
  it('returns none when no topic has analyzed charge volume', () => {
    expect(getChargeCoverageState([cycleSubject()])).toBe('none');
  });

  it('returns partial when only some topics have analyzed charge volume', () => {
    expect(
      getChargeCoverageState([
        cycleSubject({
          topics: [
            {
              id: 'topic-a',
              name: 'Licitações',
              subjectId: 'subject-1',
              subjectName: 'Direito Administrativo',
              firstStudiedAt: null,
              reviewCount: 0,
              completed: false,
              totalVolume: 20,
            },
            {
              id: 'topic-b',
              name: 'Contratos',
              subjectId: 'subject-1',
              subjectName: 'Direito Administrativo',
              firstStudiedAt: null,
              reviewCount: 0,
              completed: false,
              totalVolume: null,
            },
          ],
        }),
      ]),
    ).toBe('partial');
  });
});

describe('buildNextBestAction', () => {
  it('prioritizes overdue review before cycle topic', () => {
    const action = buildNextBestAction({
      overdueReviews: [reviewTopic({ id: 'overdue' })],
      todayReviews: [],
      cycleActions: getNextCycleActions([cycleSubject()]),
      strategicActions: [],
      hasActiveCycle: true,
    });

    expect(action).toMatchObject({
      kind: 'review_overdue',
      primaryLabel: 'Revisar agora',
      primaryHref: '/revisoes?topicId=overdue',
    });
  });

  it('uses cycle topic when there are no urgent reviews', () => {
    const action = buildNextBestAction({
      overdueReviews: [],
      todayReviews: [],
      cycleActions: getNextCycleActions([cycleSubject()]),
      strategicActions: [],
      hasActiveCycle: true,
    });

    expect(action.kind).toBe('start_cycle_topic');
  });
});

describe('buildDashboardPace', () => {
  it('does not invent pace without exam date', () => {
    const pace = buildDashboardPace({
      examDate: null,
      today,
      totalUnstartedTopics: 12,
      overdueReviews: 2,
      todayReviews: 3,
      futureReviewsInWindow: 4,
      hasActiveCycle: true,
    });

    expect(pace).toMatchObject({
      state: 'missing_exam_date',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
    });
  });

  it('calculates daily topic and review pace when date exists', () => {
    const pace = buildDashboardPace({
      examDate: '2026-06-28',
      today,
      totalUnstartedTopics: 10,
      overdueReviews: 2,
      todayReviews: 3,
      futureReviewsInWindow: 5,
      hasActiveCycle: true,
    });

    expect(pace).toMatchObject({
      state: 'ready',
      daysRemaining: 10,
      newTopicsPerDay: 1,
      reviewsPerDay: 1,
      pendingReviews: 10,
    });
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```bash
npm run test:run -- src/utils/dashboardDecision.test.ts
```

Expected: FAIL because `src/utils/dashboardDecision.ts` does not exist.

- [ ] **Step 3: Implement pure utilities**

Create `src/utils/dashboardDecision.ts`:

```ts
import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type {
  ChargeCoverageState,
  DashboardAction,
  DashboardCycleSubject,
  DashboardCycleTopic,
  DashboardPace,
  DashboardReviewTopic,
} from '@/types/dashboardDecision';

export interface ReviewBuckets {
  overdue: DashboardReviewTopic[];
  today: DashboardReviewTopic[];
  future: DashboardReviewTopic[];
}

const dayKey = (date: Date) => format(startOfDay(date), 'yyyy-MM-dd');

const isStarted = (topic: DashboardCycleTopic) =>
  Boolean(topic.firstStudiedAt) || Boolean(topic.reviewCount && topic.reviewCount > 0);

export function splitReviewsByDueDate(topics: DashboardReviewTopic[], today = new Date()): ReviewBuckets {
  const todayKey = dayKey(today);

  return topics.reduce<ReviewBuckets>(
    (acc, topic) => {
      if (!topic.nextReview) return acc;
      const reviewKey = dayKey(new Date(topic.nextReview));

      if (reviewKey < todayKey) acc.overdue.push(topic);
      else if (reviewKey === todayKey) acc.today.push(topic);
      else acc.future.push(topic);

      return acc;
    },
    { overdue: [], today: [], future: [] },
  );
}

export function getNextCycleActions(subjects: DashboardCycleSubject[], limit = 3): DashboardAction[] {
  const sortedSubjects = [...subjects].sort((a, b) => a.cyclePosition - b.cyclePosition);
  const actions: DashboardAction[] = [];

  for (const subject of sortedSubjects) {
    if (subject.isCompletedInCycle) continue;

    const nextTopic = subject.topics.find((topic) => !topic.completed && !isStarted(topic));
    const continueTopic = subject.topics.find((topic) => !topic.completed && isStarted(topic));
    const topic = nextTopic || continueTopic;
    if (!topic) continue;

    const startsNewTopic = !isStarted(topic);

    actions.push({
      id: `${startsNewTopic ? 'start' : 'continue'}:${topic.id}`,
      kind: startsNewTopic ? 'start_cycle_topic' : 'continue_cycle_topic',
      tone: 'info',
      title: `${subject.name}: ${topic.name}`,
      description: startsNewTopic
        ? 'Proximo topico da sua fila do ciclo.'
        : 'Topico ja iniciado na sua fila do ciclo.',
      reason: startsNewTopic
        ? 'Respeita a ordem que voce definiu no Ciclo de Estudos.'
        : 'Mantem continuidade no ciclo sem trocar sua ordem.',
      primaryLabel: startsNewTopic ? 'Iniciar estudo' : 'Continuar estudo',
      primaryHref: '/ciclo-estudos',
      secondaryLabel: 'Ver no ciclo',
      secondaryHref: '/ciclo-estudos',
      target: {
        subjectId: subject.id,
        subjectName: subject.name,
        topicId: topic.id,
        topicName: topic.name,
      },
      priorityScore: startsNewTopic ? 60 : 50,
    });

    if (actions.length >= limit) break;
  }

  return actions;
}

export function getChargeCoverageState(subjects: DashboardCycleSubject[]): ChargeCoverageState {
  const topics = subjects.flatMap((subject) => subject.topics);
  if (topics.length === 0) return 'none';

  const analyzed = topics.filter((topic) => typeof topic.totalVolume === 'number' && topic.totalVolume > 0).length;
  if (analyzed === 0) return 'none';

  const coverage = analyzed / topics.length;
  return coverage >= 0.7 ? 'sufficient' : 'partial';
}

export function getStrategicHighChargeActions(subjects: DashboardCycleSubject[], limit = 2): DashboardAction[] {
  const coverage = getChargeCoverageState(subjects);
  if (coverage === 'none') return [];

  return subjects
    .flatMap((subject) =>
      subject.topics
        .filter((topic) => !topic.completed && !isStarted(topic) && typeof topic.totalVolume === 'number' && topic.totalVolume > 0)
        .map((topic) => ({
          subject,
          topic,
          volume: topic.totalVolume || 0,
        })),
    )
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit)
    .map(({ subject, topic, volume }) => ({
      id: `charge:${topic.id}`,
      kind: 'strategic_high_charge',
      tone: 'warning',
      title: `${subject.name}: ${topic.name}`,
      description: coverage === 'partial'
        ? 'Alta cobranca entre os topicos ja analisados.'
        : 'Alta cobranca no edital analisado.',
      reason: `Sinal de cobranca: ${volume}. Use como alerta, sem alterar automaticamente seu ciclo.`,
      primaryLabel: 'Ver no ciclo',
      primaryHref: '/ciclo-estudos',
      secondaryLabel: 'Abrir detalhes',
      secondaryHref: `/revisoes?topicId=${topic.id}`,
      target: {
        subjectId: subject.id,
        subjectName: subject.name,
        topicId: topic.id,
        topicName: topic.name,
      },
      priorityScore: 40,
    }));
}

const reviewAction = (topic: DashboardReviewTopic, kind: 'review_overdue' | 'review_today'): DashboardAction => ({
  id: `${kind}:${topic.id}`,
  kind,
  tone: kind === 'review_overdue' ? 'danger' : 'warning',
  title: `${topic.subjectName}: ${topic.name}`,
  description: kind === 'review_overdue' ? 'Revisao atrasada.' : 'Revisao vence hoje.',
  reason: kind === 'review_overdue'
    ? 'Revisoes atrasadas aparecem primeiro para proteger retencao.'
    : 'Revisar hoje evita criar atraso no cronograma.',
  primaryLabel: 'Revisar agora',
  primaryHref: `/revisoes?topicId=${topic.id}`,
  secondaryLabel: 'Abrir topico',
  secondaryHref: `/revisoes?topicId=${topic.id}`,
  target: {
    subjectId: topic.subjectId,
    subjectName: topic.subjectName,
    topicId: topic.id,
    topicName: topic.name,
  },
  priorityScore: kind === 'review_overdue' ? 100 : 90,
});

export function buildNextBestAction(input: {
  overdueReviews: DashboardReviewTopic[];
  todayReviews: DashboardReviewTopic[];
  cycleActions: DashboardAction[];
  strategicActions: DashboardAction[];
  hasActiveCycle: boolean;
}): DashboardAction {
  if (!input.hasActiveCycle) {
    return {
      id: 'load-cycle',
      kind: 'load_cycle',
      tone: 'info',
      title: 'Carregue um edital no Ciclo de Estudos',
      description: 'A Dashboard precisa de um ciclo ativo para montar decisoes confiaveis.',
      reason: 'Sem ciclo ativo, o sistema nao deve escolher materia ou topico por voce.',
      primaryLabel: 'Ir para Ciclo',
      primaryHref: '/ciclo-estudos',
      secondaryLabel: 'Meus editais',
      secondaryHref: '/meus-editais',
      target: {},
      priorityScore: 10,
    };
  }

  if (input.overdueReviews.length > 0) return reviewAction(input.overdueReviews[0], 'review_overdue');
  if (input.todayReviews.length > 0) return reviewAction(input.todayReviews[0], 'review_today');
  if (input.cycleActions.length > 0) return input.cycleActions[0];
  if (input.strategicActions.length > 0) return input.strategicActions[0];

  return {
    id: 'all-caught-up',
    kind: 'all_caught_up',
    tone: 'success',
    title: 'Tudo em dia por aqui',
    description: 'Sem revisoes urgentes e sem topico novo encontrado no ciclo.',
    reason: 'Use este momento para revisar seu ciclo, registrar lembretes ou descansar com tranquilidade.',
    primaryLabel: 'Ver ciclo',
    primaryHref: '/ciclo-estudos',
    secondaryLabel: 'Ver revisoes',
    secondaryHref: '/revisoes',
    target: {},
    priorityScore: 1,
  };
}

export function buildActionQueue(input: {
  overdueReviews: DashboardReviewTopic[];
  todayReviews: DashboardReviewTopic[];
  cycleActions: DashboardAction[];
  strategicActions: DashboardAction[];
  nextBestActionId: string;
  limit?: number;
}): DashboardAction[] {
  const reviewActions = [
    ...input.overdueReviews.map((topic) => reviewAction(topic, 'review_overdue')),
    ...input.todayReviews.map((topic) => reviewAction(topic, 'review_today')),
  ];

  return [...reviewActions, ...input.cycleActions, ...input.strategicActions]
    .filter((action) => action.id !== input.nextBestActionId)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, input.limit ?? 3);
}

export function buildDashboardPace(input: {
  examDate: string | null;
  today?: Date;
  totalUnstartedTopics: number;
  overdueReviews: number;
  todayReviews: number;
  futureReviewsInWindow: number;
  hasActiveCycle: boolean;
}): DashboardPace {
  if (!input.hasActiveCycle) {
    return {
      state: 'missing_cycle',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics: input.totalUnstartedTopics,
      pendingReviews: input.overdueReviews + input.todayReviews + input.futureReviewsInWindow,
      explanation: 'Carregue um edital no ciclo para calcular ritmo.',
    };
  }

  if (!input.examDate) {
    return {
      state: 'missing_exam_date',
      daysRemaining: null,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics: input.totalUnstartedTopics,
      pendingReviews: input.overdueReviews + input.todayReviews + input.futureReviewsInWindow,
      explanation: 'Defina uma data real ou aproximada da prova para calcular o ritmo.',
    };
  }

  const today = startOfDay(input.today ?? new Date());
  const examDate = startOfDay(new Date(`${input.examDate}T12:00:00`));
  const daysRemaining = differenceInCalendarDays(examDate, today);

  if (daysRemaining < 0) {
    return {
      state: 'exam_date_past',
      daysRemaining,
      newTopicsPerDay: null,
      reviewsPerDay: null,
      unstartedTopics: input.totalUnstartedTopics,
      pendingReviews: input.overdueReviews + input.todayReviews + input.futureReviewsInWindow,
      explanation: 'A data da prova ja passou. Atualize a data para recalcular o ritmo.',
    };
  }

  const divisor = Math.max(1, daysRemaining);
  const pendingReviews = input.overdueReviews + input.todayReviews + input.futureReviewsInWindow;

  return {
    state: 'ready',
    daysRemaining,
    newTopicsPerDay: Math.ceil(input.totalUnstartedTopics / divisor),
    reviewsPerDay: Math.ceil(pendingReviews / divisor),
    unstartedTopics: input.totalUnstartedTopics,
    pendingReviews,
    explanation: 'Calculado a partir do ciclo ativo, data da prova e revisoes pendentes/proximas.',
  };
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:run -- src/utils/dashboardDecision.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/dashboardDecision.ts src/utils/dashboardDecision.test.ts
git commit -m "feat: add dashboard decision rules"
```

---

### Task 3: Create the Dashboard View Model Hook

**Files:**
- Create: `src/hooks/useDashboardDecisionModel.ts`
- Modify: `src/hooks/useReviewsData.tsx`

- [ ] **Step 1: Export the reviews topic type**

Modify the `Topic` interface in `src/hooks/useReviewsData.tsx`:

```ts
export interface ReviewTopic {
  id: string;
  name: string;
  subject_id: string;
  subject_name: string;
  review_stage: string;
  next_review: string | null;
  review_count: number;
  first_studied_at: string | null;
  last_reviewed_at: string | null;
  completed: boolean;
  subjects?: {
    id: string;
    name: string;
    color: string;
  };
  difficulty_level?: number;
  memory_stability?: number;
  current_interval?: number;
  learningStatus?: LearningStatus;
}

type Topic = ReviewTopic;
```

- [ ] **Step 2: Create the hook**

Create `src/hooks/useDashboardDecisionModel.ts`:

```ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudyCycleData } from '@/hooks/useStudyCycleData';
import { useReviewsData } from '@/hooks/useReviewsData';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import {
  buildActionQueue,
  buildDashboardPace,
  buildNextBestAction,
  getChargeCoverageState,
  getNextCycleActions,
  getStrategicHighChargeActions,
  splitReviewsByDueDate,
} from '@/utils/dashboardDecision';
import type {
  DashboardActivityDay,
  DashboardCycleSubject,
  DashboardDecisionModel,
  DashboardReminder,
  DashboardReviewTopic,
} from '@/types/dashboardDecision';

const formatEditalName = (edital: { name: string; organ?: string | null; position?: string | null }) => {
  const parts = [edital.organ, edital.position].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : edital.name.split('-').join(' • ');
};

const normalizeReviewTopic = (topic: any): DashboardReviewTopic => ({
  id: topic.id,
  name: topic.name,
  subjectId: topic.subject_id,
  subjectName: topic.subject_name,
  nextReview: topic.next_review,
  reviewCount: topic.review_count ?? 0,
  difficultyLevel: topic.difficulty_level,
  memoryStability: topic.memory_stability,
  currentInterval: topic.current_interval,
});

const normalizeCycleSubjects = (subjects: any[]): DashboardCycleSubject[] =>
  subjects.map((subject, index) => ({
    id: subject.id,
    name: subject.name,
    cyclePosition: subject.cyclePosition ?? index + 1,
    isCompletedInCycle: subject.status === 'Concluída no Ciclo' || subject.status === 'COMPLETED_CYCLE',
    topics: (subject.topics || []).map((topic: any) => ({
      id: topic.id,
      name: topic.name,
      subjectId: subject.id,
      subjectName: subject.name,
      firstStudiedAt: topic.firstStudiedAt ?? topic.first_studied_at ?? null,
      reviewCount: topic.reviewCount ?? topic.review_count ?? 0,
      completed: topic.completed ?? topic.reviewStatus === 'Concluído',
      nextReview: topic.nextReviewDate ?? topic.next_review ?? null,
      totalVolume: topic.totalVolume ?? topic.total_volume ?? null,
    })),
  }));

const aggregateActivityDays = (rows: any[]): DashboardActivityDay[] => {
  const map = new Map<string, DashboardActivityDay>();

  rows.forEach((row) => {
    const date = new Date(row.reviewed_at).toISOString().slice(0, 10);
    const current = map.get(date) ?? {
      date,
      studiedCount: 0,
      reviewedCount: 0,
      totalDurationMinutes: 0,
      difficultyAverage: null,
      topicIds: [],
    };

    current.reviewedCount += 1;
    current.totalDurationMinutes += row.study_duration_minutes ?? 0;
    if (row.topic_id) current.topicIds.push(row.topic_id);

    const difficulties = rows
      .filter((item) => new Date(item.reviewed_at).toISOString().slice(0, 10) === date)
      .map((item) => item.difficulty_numeric)
      .filter((value) => typeof value === 'number');

    current.difficultyAverage = difficulties.length
      ? difficulties.reduce((sum, value) => sum + value, 0) / difficulties.length
      : null;

    map.set(date, current);
  });

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
};

export function useDashboardDecisionModel(): DashboardDecisionModel {
  const { user } = useAuth();
  const {
    studyCycleSubjects,
    userCycle,
    isLoading: isCycleLoading,
  } = useStudyCycleData();
  const {
    topics,
    isLoading: isReviewsLoading,
    error: reviewsError,
  } = useReviewsData();
  const { editaisNoCiclo } = useEditalOriginsWithMerge();

  const hasActiveCycle = Boolean(userCycle?.ciclo_atual?.length);

  const { data: reminders = [], isLoading: isRemindersLoading, error: remindersError } = useQuery({
    queryKey: ['dashboard-reminders', user?.id],
    queryFn: async (): Promise<DashboardReminder[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('general_reminders')
        .select('id,text,reminder_date,completed')
        .eq('user_id', user.id)
        .order('completed', { ascending: true })
        .order('reminder_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        text: item.text,
        reminderDate: item.reminder_date,
        completed: Boolean(item.completed),
        href: '/dashboard?openNotes=reminders',
      }));
    },
    enabled: Boolean(user?.id),
  });

  const { data: activityRows = [], isLoading: isActivityLoading, error: activityError } = useQuery({
    queryKey: ['dashboard-activity-history', user?.id, userCycle?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const since = addDays(new Date(), -45).toISOString();
      let query = supabase
        .from('topic_review_history')
        .select('topic_id,reviewed_at,study_duration_minutes,difficulty_numeric,cycle_id')
        .eq('user_id', user.id)
        .gte('reviewed_at', since)
        .order('reviewed_at', { ascending: false });

      if (userCycle?.id) query = query.eq('cycle_id', userCycle.id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(user?.id),
  });

  return useMemo(() => {
    const cycleSubjects = normalizeCycleSubjects(studyCycleSubjects);
    const reviewTopics = (topics || []).map(normalizeReviewTopic);
    const buckets = splitReviewsByDueDate(reviewTopics);
    const cycleActions = getNextCycleActions(cycleSubjects, 3);
    const strategicActions = getStrategicHighChargeActions(cycleSubjects, 2);
    const nextBestAction = buildNextBestAction({
      overdueReviews: buckets.overdue,
      todayReviews: buckets.today,
      cycleActions,
      strategicActions,
      hasActiveCycle,
    });
    const actionQueue = buildActionQueue({
      overdueReviews: buckets.overdue,
      todayReviews: buckets.today,
      cycleActions,
      strategicActions,
      nextBestActionId: nextBestAction.id,
      limit: 3,
    });

    const activeEdital = editaisNoCiclo?.[0];
    const editalName = activeEdital ? formatEditalName(activeEdital) : null;
    const examDate = activeEdital?.exam_date ?? null;
    const totalTopics = cycleSubjects.reduce((sum, subject) => sum + subject.topics.length, 0);
    const startedTopics = cycleSubjects.reduce(
      (sum, subject) => sum + subject.topics.filter((topic) => Boolean(topic.firstStudiedAt) || Boolean(topic.reviewCount && topic.reviewCount > 0)).length,
      0,
    );
    const unstartedTopics = Math.max(0, totalTopics - startedTopics);

    const pace = buildDashboardPace({
      examDate,
      totalUnstartedTopics: unstartedTopics,
      overdueReviews: buckets.overdue.length,
      todayReviews: buckets.today.length,
      futureReviewsInWindow: buckets.future.filter((topic) => {
        if (!topic.nextReview) return false;
        const due = new Date(topic.nextReview).getTime();
        const limit = addDays(new Date(), 14).getTime();
        return due <= limit;
      }).length,
      hasActiveCycle,
    });

    return {
      isLoading: isCycleLoading || isReviewsLoading || isRemindersLoading || isActivityLoading,
      error: reviewsError || remindersError || activityError,
      examContext: {
        editalName,
        editalId: activeEdital?.id,
        examDate,
        daysRemaining: pace.daysRemaining,
        state: !hasActiveCycle ? 'missing_cycle' : pace.state === 'exam_date_past' ? 'exam_date_past' : examDate ? 'ready' : 'missing_exam_date',
      },
      pace,
      nextBestAction,
      actionQueue,
      continueCycleItems: cycleActions,
      reminders,
      activityDays: aggregateActivityDays(activityRows),
      chargeCoverage: getChargeCoverageState(cycleSubjects),
      totals: {
        overdueReviews: buckets.overdue.length,
        todayReviews: buckets.today.length,
        futureReviews: buckets.future.length,
        unstartedTopics,
        startedTopics,
        totalTopics,
      },
    };
  }, [
    activityError,
    activityRows,
    editaisNoCiclo,
    hasActiveCycle,
    isActivityLoading,
    isCycleLoading,
    isRemindersLoading,
    isReviewsLoading,
    reminders,
    remindersError,
    reviewsError,
    studyCycleSubjects,
    topics,
  ]);
}
```

- [ ] **Step 3: Run focused build**

Run:

```bash
npm run build
```

Expected: PASS or fail only on type mismatches introduced by this task. Fix any introduced type mismatch before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useReviewsData.tsx src/hooks/useDashboardDecisionModel.ts
git commit -m "feat: build dashboard decision model"
```

---

### Task 4: Build Premium Dashboard Components

**Files:**
- Create: `src/components/dashboard-decision/DashboardHeroContext.tsx`
- Create: `src/components/dashboard-decision/NextBestActionCard.tsx`
- Create: `src/components/dashboard-decision/ActionQueueCard.tsx`
- Create: `src/components/dashboard-decision/ExamPaceCard.tsx`
- Create: `src/components/dashboard-decision/ContinueCycleCard.tsx`
- Create: `src/components/dashboard-decision/RecentRemindersCard.tsx`
- Create: `src/components/dashboard-decision/StudyActivityCard.tsx`
- Create: `src/components/dashboard-decision/TrajectorySummary.tsx`

- [ ] **Step 1: Create `DashboardHeroContext`**

Create `src/components/dashboard-decision/DashboardHeroContext.tsx`:

```tsx
import { CalendarClock, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DashboardDecisionModel } from '@/types/dashboardDecision';

interface DashboardHeroContextProps {
  model: DashboardDecisionModel;
  onNavigate: (href: string) => void;
}

export function DashboardHeroContext({ model, onNavigate }: DashboardHeroContextProps) {
  const { examContext, pace, totals } = model;
  const missingCycle = examContext.state === 'missing_cycle';
  const missingDate = examContext.state === 'missing_exam_date';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.20),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.55))] p-5 shadow-sm md:p-7">
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Painel de decisao
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              {examContext.editalName ?? 'Monte seu painel pelo Ciclo de Estudos'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {missingCycle
                ? 'Carregue um edital no ciclo para eu mostrar prioridades reais, sem escolher materia no escuro.'
                : missingDate
                  ? 'Defina uma data real ou aproximada da prova para calcular o ritmo com responsabilidade.'
                  : pace.state === 'ready'
                    ? `Faltam ${pace.daysRemaining} dia${pace.daysRemaining === 1 ? '' : 's'} para a prova.`
                    : pace.explanation}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
          <Metric label="Atrasadas" value={totals.overdueReviews} tone="danger" />
          <Metric label="Hoje" value={totals.todayReviews} tone="warning" />
          <Metric label="A iniciar" value={totals.unstartedTopics} tone="info" />
          <Metric label="Dias" value={pace.daysRemaining ?? 'Definir'} tone="success" />
        </div>
      </div>

      {(missingCycle || missingDate) && (
        <div className="relative mt-5">
          <Button
            variant="confirm"
            onClick={() => onNavigate(missingCycle ? '/ciclo-estudos' : '/meus-editais')}
            className="w-full sm:w-auto"
          >
            {missingCycle ? 'Ir para Ciclo de Estudos' : 'Definir data da prova'}
          </Button>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: 'danger' | 'warning' | 'info' | 'success' }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/65 p-3 backdrop-blur">
      <div
        className={cn(
          'mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg',
          tone === 'danger' && 'bg-rose-500/10 text-rose-500',
          tone === 'warning' && 'bg-amber-500/10 text-amber-500',
          tone === 'info' && 'bg-sky-500/10 text-sky-500',
          tone === 'success' && 'bg-emerald-500/10 text-emerald-500',
        )}
      >
        <Target className="h-3.5 w-3.5" />
      </div>
      <div className="truncate text-xl font-bold text-foreground">{value}</div>
      <div className="mt-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create action cards**

Create `NextBestActionCard.tsx` and `ActionQueueCard.tsx` using `DashboardAction`, `Button`, and `cn`. The primary button must call `onNavigate(action.primaryHref)`, and the secondary button must call `onNavigate(action.secondaryHref)` when present. Use semantic tone classes:

```tsx
const toneClasses = {
  danger: 'border-rose-500/30 bg-rose-500/8',
  warning: 'border-amber-500/30 bg-amber-500/8',
  success: 'border-emerald-500/30 bg-emerald-500/8',
  info: 'border-sky-500/30 bg-sky-500/8',
  neutral: 'border-border bg-card',
};
```

For `NextBestActionCard`, render title, description, reason, subject/topic names from `target`, and buttons. For `ActionQueueCard`, render up to three compact rows and an empty success state.

- [ ] **Step 3: Create pace, cycle, reminders, activity, and trajectory components**

Use the model data only. Do not fetch data inside these components.

Required behavior:

- `ExamPaceCard`
  - `ready`: show `newTopicsPerDay`, `reviewsPerDay`, and explanation.
  - `missing_exam_date`: show one action to `/meus-editais`.
  - `missing_cycle`: show one action to `/ciclo-estudos`.
  - `exam_date_past`: show one action to update date.
  - `insufficient_data`: show explanation only.
- `ContinueCycleCard`
  - show `continueCycleItems.slice(0, 3)`;
  - empty state routes to `/ciclo-estudos`.
- `RecentRemindersCard`
  - show `model.reminders`;
  - completed reminders have softer text;
  - action routes to `reminder.href`.
- `StudyActivityCard`
  - expose segmented buttons `7 dias`, `14 dias`, `Mes`;
  - days use intensity from `studiedCount + reviewedCount`;
  - day click calls `onSelectDate(date)`.
- `TrajectorySummary`
  - show started/total topics progress;
  - embed or link to `DifficultyEvolutionWidget` after confirming it fits without nested cards.

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard-decision
git commit -m "feat: add dashboard decision components"
```

---

### Task 5: Replace Dashboard Page Composition

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Replace direct Dashboard calculations with the model**

In `src/pages/Dashboard.tsx`, keep loading/error wrappers and `StreakCalendarModal` only if still needed. Replace current page body with:

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PremiumStateCard } from '@/components/ui/PremiumStateCard';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useDashboardDecisionModel } from '@/hooks/useDashboardDecisionModel';
import { DashboardHeroContext } from '@/components/dashboard-decision/DashboardHeroContext';
import { NextBestActionCard } from '@/components/dashboard-decision/NextBestActionCard';
import { ActionQueueCard } from '@/components/dashboard-decision/ActionQueueCard';
import { ExamPaceCard } from '@/components/dashboard-decision/ExamPaceCard';
import { ContinueCycleCard } from '@/components/dashboard-decision/ContinueCycleCard';
import { RecentRemindersCard } from '@/components/dashboard-decision/RecentRemindersCard';
import { StudyActivityCard } from '@/components/dashboard-decision/StudyActivityCard';
import { TrajectorySummary } from '@/components/dashboard-decision/TrajectorySummary';

const Dashboard = () => {
  const navigate = useNavigate();
  const model = useDashboardDecisionModel();
  const [selectedActivityDate, setSelectedActivityDate] = useState<string | null>(null);

  const go = (href: string) => navigate(href);

  if (model.isLoading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  if (model.error) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8 sm:p-6">
        <PremiumStateCard
          icon={WifiOff}
          label="Conexão interrompida"
          title="Seus estudos estão salvos. Só não consegui buscar os dados agora."
          description="Confira sua conexão e tente novamente para recarregar o painel."
          actionLabel="Tentar novamente"
          actionIcon={RefreshCw}
          onAction={() => window.location.reload()}
          helperText="Se voltar sozinho, é só continuar de onde parou."
          technicalDetail={String(model.error)}
        />
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      <div className="space-y-5 md:space-y-6">
        <DashboardHeroContext model={model} onNavigate={go} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <main className="space-y-5">
            <NextBestActionCard action={model.nextBestAction} onNavigate={go} />
            <ActionQueueCard actions={model.actionQueue} onNavigate={go} />
            <ContinueCycleCard actions={model.continueCycleItems} onNavigate={go} />
            <StudyActivityCard
              days={model.activityDays}
              selectedDate={selectedActivityDate}
              onSelectDate={setSelectedActivityDate}
              onNavigate={go}
            />
          </main>

          <aside className="space-y-5">
            <ExamPaceCard pace={model.pace} chargeCoverage={model.chargeCoverage} onNavigate={go} />
            <RecentRemindersCard reminders={model.reminders} onNavigate={go} />
            <TrajectorySummary model={model} />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

- [ ] **Step 2: Remove unused imports from `Dashboard.tsx`**

Remove old imports that are no longer used:

```ts
useApp
useCycleState
useQuery
useQueryClient
supabase
useAuth
applyUnificationMap
ExamCountdown
DashboardCalendar
DashboardStatsCard
PendingReviewsCard
ProgressConsistencyCard
NeedsFocusCard
QuickWinCard
GoldenHourCard
ReviewForecastCard
DifficultyEvolutionWidget
ConsistencyCalendar
useDashboardStats
useDynamicCapacity
useRealStatistics
StreakCalendarModal
useEditalOriginsWithMerge
useMergeData
useMentorInsights
useUserSettings
StudyEmptyState
```

Keep imports only if a created component still needs them.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: replace dashboard with decision layout"
```

---

### Task 6: Preserve Existing Favorite Dashboard Cards in Components Page

**Files:**
- Inspect first: route/page for `/reveal-cards` or another components showcase.
- Modify: component showcase page only if it exists and is clearly intended for saved UI specimens.

- [ ] **Step 1: Find the components/showcase page**

Run:

```bash
rg -n "RevealCardDemo|components page|componentes|reveal-cards" src
```

Expected: locate the route target for `/reveal-cards`.

- [ ] **Step 2: Add a non-production section for saved Dashboard specimens**

If a showcase page exists, add a section named `Dashboard - cards preservados` with visual references for:

- `Frequência de Estudos`;
- `Calendário`;
- `Evolução Geral da Dificuldade`.

Use existing components where possible. Do not wire this section to production Dashboard data unless the page already does that.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "docs: preserve dashboard card references"
```

---

### Task 7: Verification, Visual QA, and Iteration

**Files:**
- Modify only files needed to fix issues found during verification.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm run test:run -- src/utils/dashboardDecision.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or existing unrelated lint findings documented before changes.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Start local app**

Run:

```bash
npm run dev
```

Expected: Vite serves `http://localhost:8081/`.

- [ ] **Step 5: Browser validation**

Use browser/Playwright to validate:

- `/dashboard` desktop around `1440x900`;
- `/dashboard` tablet around `768x1024`;
- `/dashboard` mobile around `390x844`;
- dark mode;
- light mode;
- no horizontal overflow;
- no clipped button labels;
- no overlapping text;
- primary action navigates to `/revisoes?topicId=...` or `/ciclo-estudos`;
- missing date state routes to edital/date configuration;
- missing cycle state routes to Ciclo;
- activity day click opens or highlights day details;
- reminders open their destination.

- [ ] **Step 6: Compare against approved direction**

Check that the Dashboard still answers in this order:

1. what is overdue;
2. what to do now;
3. what to do next;
4. how the student is evolving.

If the visual is beautiful but the first action is not obvious, fix hierarchy before finishing.

- [ ] **Step 7: Final commit**

```bash
git add src docs
git commit -m "chore: verify dashboard decision experience"
```

---

## Self-Review Notes

- Spec coverage:
  - Active cycle edital: Task 3.
  - Missing cycle/date states: Tasks 2, 3, 4.
  - No invented data: Tasks 2 and 3.
  - Reviews source of truth: Task 3 reuses `useReviewsData`.
  - Cycle order: Task 2 and 3.
  - Charge absence/partial/sufficient: Task 2 and 4.
  - Clickable/actionable items: Tasks 2, 4, 5, 7.
  - Premium responsive UI: Tasks 4, 5, 7.
  - Favorite old cards preserved: Task 6.
- Risk:
  - `StudyCycleSubject.status` may not equal the literal strings used in the first hook draft. During execution, verify against `src/types/study-cycle.ts` and adjust normalization before committing.
  - `editaisNoCiclo` shape may not expose `exam_date`; verify `useEditalOriginsWithMerge` return type during Task 3.
  - The reminder destination may need integration with `GeneralNotesModal`; if no route/action exists, keep the card actionable by opening the existing notes modal from `AppLayout` only if that pattern is already exposed.
