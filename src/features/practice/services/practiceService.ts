import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import type { PracticeFeedbackReason } from '@/features/practice/types/practice';

export type PracticeMode = 'questions' | 'flashcards_due' | 'quick';
export type PracticeFormat = 'questions' | 'flashcards' | 'mixed';
export type PracticeOrigin = 'daily_recommendation' | 'manual' | 'post_study';
export type PracticeItemType = 'flashcard' | 'multiple_choice' | 'true_false';
export type PracticeAttemptResult = 'correct' | 'incorrect' | 'skipped' | 'recalled' | 'effortful' | 'forgotten';

export type PracticeOption = {
  id: string;
  label: string;
};

export type PracticeSessionItem = {
  id: string;
  type: PracticeItemType;
  prompt: string;
  options: PracticeOption[];
  learningObjective: string | null;
  depth: string | null;
  targetDifficulty: string | null;
  position: number;
  servedReason: string;
};

export type PracticeSession = {
  id: string;
  mode: PracticeMode;
  status: 'active' | 'completed' | 'abandoned';
  topicId: string | null;
  items: PracticeSessionItem[];
};

export type PracticeAnswer = {
  itemType: PracticeItemType;
  answerKey: Record<string, unknown>;
  explanation: string;
  sourceCitations: unknown[];
};

export type PracticeAttempt = {
  attemptId: string;
  result: PracticeAttemptResult;
  sessionCompleted: boolean;
  nextDueAt: string | null;
};

export type GeneratePracticePackageInput = {
  topicId: string;
  idempotencyKey: string;
  trigger?: 'explicit' | 'replacement';
};

export type GeneratePracticePackageResult = {
  status: 'ready' | 'preparing';
  generationId: string;
  packageId: string | null;
  reused: boolean;
};

export type PracticeRecommendationReason = 'overdue_review' | 'review_due_today' | 'recent_failure' | 'recorded_difficulty' | 'available_topic';
export type PracticeScopeStatus = 'active' | 'no_edital' | 'no_active_edital';

export type PracticeOverviewTopic = {
  id: string;
  subjectId: string;
  subjectName: string;
  name: string;
  nextReview: string | null;
  difficultyLevel: number | null;
  lastReviewedAt: string | null;
  recentFailureCount?: number;
  incidenceScore?: number | null;
  subjectWeight?: number | null;
  reason?: PracticeRecommendationReason;
  questionCount?: number;
  flashcardCount?: number;
  isGenerating?: boolean;
  hasReadyPackage?: boolean;
};

export type PracticeOverview = {
  scope: {
    status: PracticeScopeStatus;
    subjectIds: string[];
    activeEditalCount: number;
  };
  recommendedTopic: PracticeOverviewTopic | null;
  selectedTopic: PracticeOverviewTopic | null;
  flashcards: { dueCount: number; dueTopicCount: number };
  dailyRecommendation: {
    kind: 'flashcards_due' | 'questions' | 'clear';
    count: number;
    topicCount: number;
    topic?: PracticeOverviewTopic | null;
    reason: PracticeRecommendationReason | 'flashcards_due' | 'clear';
    estimatedMinutes: number;
  };
};

type EdgeFunctionError = {
  error?: string;
};

const safeMessages = new Set([
  'Sessão obrigatória.',
  'Sessão inválida.',
  'Tópico não encontrado.',
  'Item não disponível nesta sessão.',
  'Responda antes de avaliar este item.',
  'Cartão não encontrado.',
  'Dados de treino inválidos.',
  'Resposta inválida.',
  'Avaliação inválida.',
  'Dados de geração inválidos.',
  'Geração indisponível no momento.',
  'A geração está temporariamente indisponível.',
  'A IA atingiu o limite temporário. Tente novamente em alguns minutos.',
  'A IA está temporariamente indisponível. Tente novamente em alguns minutos.',
  'A IA demorou mais do que o esperado. Tente novamente em alguns minutos.',
  'Não foi possível gerar um lote confiável. Tente novamente.',
  'Não foi possível gerar o material agora. Tente novamente.',
  'Não foi possível carregar sua prática.',
  'Carregue um edital no Ciclo de Estudos para praticar.',
  'Este conteúdo não faz parte do edital carregado no ciclo.',
]);

const fallbackMessage = 'Não foi possível concluir esta ação agora. Tente novamente.';

const getSafeFunctionError = async (error: unknown) => {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json() as EdgeFunctionError;
      if (body.error && safeMessages.has(body.error)) return body.error;
    } catch {
      return fallbackMessage;
    }
  }

  return fallbackMessage;
};

const invokePracticeFunction = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (!error && data) return data;

  throw new Error(error ? await getSafeFunctionError(error) : fallbackMessage);
};

type RawPracticeOption = { id?: unknown; label?: unknown };

const toPracticeOptions = (value: unknown): PracticeOption[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((option: RawPracticeOption) => (
    typeof option?.id === 'string' && typeof option.label === 'string'
      ? [{ id: option.id, label: option.label }]
      : []
  ));
};

const toPracticeAnswer = (value: Record<string, unknown>): PracticeAnswer => ({
  itemType: value.item_type as PracticeItemType,
  answerKey: (value.answer_key ?? {}) as Record<string, unknown>,
  explanation: typeof value.explanation === 'string' ? value.explanation : '',
  sourceCitations: Array.isArray(value.source_citations) ? value.source_citations : [],
});

export type BuildPracticeSessionInput = {
  mode: PracticeMode;
  topicId?: string;
  subjectId?: string;
  format?: PracticeFormat;
  origin?: PracticeOrigin;
  quantity: number;
  idempotencyKey: string;
};

type RawSessionItem = Omit<PracticeSessionItem, 'options'> & { options: unknown };
type RawPracticeSession = Omit<PracticeSession, 'items'> & { items: RawSessionItem[] };

export type BuildPracticeSessionResult =
  | { status: 'ready'; session: PracticeSession; reused: boolean }
  | { status: 'needs_material'; topicId: string | null; reason: 'no_package' | 'no_eligible_item' | 'no_due_flashcard' };

export const buildPracticeSession = async (
  input: BuildPracticeSessionInput,
): Promise<BuildPracticeSessionResult> => {
  const response = await invokePracticeFunction<{
    status: BuildPracticeSessionResult['status'];
    session?: RawPracticeSession;
    reused?: boolean;
    topicId?: string | null;
    reason?: 'no_package' | 'no_eligible_item' | 'no_due_flashcard';
  }>('build-practice-session', input);

  if (response.status === 'needs_material') {
    return {
      status: 'needs_material',
      topicId: response.topicId ?? null,
      reason: response.reason ?? 'no_eligible_item',
    };
  }

  if (!response.session?.items?.length) throw new Error(fallbackMessage);

  return {
    status: 'ready',
    reused: Boolean(response.reused),
    session: {
      ...response.session,
      mode: response.session.mode as PracticeMode,
      status: response.session.status as PracticeSession['status'],
      items: response.session.items.map((item) => ({
        ...item,
        type: item.type as PracticeItemType,
        options: toPracticeOptions(item.options),
      })),
    },
  };
};

export const generatePracticePackage = async (
  input: GeneratePracticePackageInput,
): Promise<GeneratePracticePackageResult> => {
  const response = await invokePracticeFunction<GeneratePracticePackageResult>(
    'generate-practice-package',
    input,
  );

  if (!response.generationId || !['ready', 'preparing'].includes(response.status)) {
    throw new Error(fallbackMessage);
  }

  return {
    status: response.status,
    generationId: response.generationId,
    packageId: response.packageId ?? null,
    reused: Boolean(response.reused),
  };
};

export const getPracticeOverview = (topicId?: string): Promise<PracticeOverview> =>
  invokePracticeFunction<PracticeOverview>('get-practice-overview', topicId ? { topicId } : {});

export const revealPracticeItem = async (sessionId: string, itemId: string) => {
  const response = await invokePracticeFunction<{ answer: Record<string, unknown> }>(
    'reveal-practice-item',
    { sessionId, itemId },
  );

  return toPracticeAnswer(response.answer);
};

export type SubmitPracticeAttemptInput = {
  sessionId: string;
  itemId: string;
  clientAttemptId: string;
  responseTimeMs: number;
  answer:
    | { kind: 'objective_answer'; optionId: string }
    | { kind: 'flashcard_recall'; rating: 'forgotten' | 'effortful' | 'recalled' };
};

export const submitPracticeAttempt = async (input: SubmitPracticeAttemptInput) => {
  const response = await invokePracticeFunction<{
    attempt: Record<string, unknown>;
    answer: Record<string, unknown>;
  }>('submit-practice-attempt', input);

  return {
    attempt: {
      attemptId: response.attempt.attempt_id as string,
      result: response.attempt.result as PracticeAttemptResult,
      sessionCompleted: Boolean(response.attempt.session_completed),
      nextDueAt: typeof response.attempt.next_due_at === 'string' ? response.attempt.next_due_at : null,
    } satisfies PracticeAttempt,
    answer: toPracticeAnswer(response.answer),
  };
};

export const ratePracticeItem = (input: {
  sessionId: string;
  itemId: string;
  rating: 1 | -1;
  reason?: PracticeFeedbackReason;
}) => invokePracticeFunction<{
  rating: 1 | -1;
  hiddenFromFutureSessions: boolean;
}>('rate-practice-item', input);
