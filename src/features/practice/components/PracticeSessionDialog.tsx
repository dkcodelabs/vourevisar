import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  Lightbulb,
  Play,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PracticeItemRating } from "@/features/practice/components/PracticeItemRating";
import type {
  PracticeAnswer,
  PracticeAttempt,
  PracticeAttemptResult,
  PracticeSession,
} from "@/features/practice/services/practiceService";
import type { PracticeFeedbackReason } from "@/features/practice/types/practice";
import { cn } from "@/lib/utils";

export type PracticeMode = "questions" | "flashcards" | "mixed";

type PracticeSessionDialogProps = {
  mode: PracticeMode | null;
  session: PracticeSession | null;
  unavailableReason?:
    "no_package" | "no_eligible_item" | "no_due_flashcard" | null;
  unavailableScope?: "topic" | "subject";
  preparingAnotherSession?: boolean;
  onOpenChange: (open: boolean) => void;
  onReveal: (sessionId: string, itemId: string) => Promise<PracticeAnswer>;
  onSubmitAttempt: (input: {
    sessionId: string;
    itemId: string;
    clientAttemptId: string;
    responseTimeMs: number;
    answer:
      | { kind: "objective_answer"; optionId: string }
      | {
          kind: "flashcard_recall";
          rating: "forgotten" | "effortful" | "recalled";
        };
  }) => Promise<{ attempt: PracticeAttempt; answer: PracticeAnswer }>;
  onRate: (input: {
    sessionId: string;
    itemId: string;
    rating: 1 | -1;
    reason?: PracticeFeedbackReason;
  }) => Promise<unknown>;
  onStartAnother: (prefill?: {
    goal?: "reinforce" | "subject" | "topic";
    subjectId?: string;
    topicId?: string;
    format?: PracticeFormat;
  }) => void;
  onGenerateMaterial?: () => void;
  isGeneratingMaterial?: boolean;
  generateMaterialLabel?: string;
};

const recallOptions = [
  { value: "forgotten", label: "Não lembrei", detail: "Rever em breve" },
  { value: "effortful", label: "Com esforço", detail: "Ainda instável" },
  { value: "recalled", label: "Lembrei", detail: "Pode espaçar" },
] as const;

const optionTone = (label: string) =>
  /^certo$/i.test(label)
    ? "success"
    : /^errado$/i.test(label)
      ? "destructive"
      : "primary";

export const PracticeSessionDialog = ({
  mode,
  session,
  unavailableReason = null,
  unavailableScope = "topic",
  preparingAnotherSession = false,
  onOpenChange,
  onReveal,
  onSubmitAttempt,
  onRate,
  onStartAnother,
  onGenerateMaterial,
  isGeneratingMaterial = false,
  generateMaterialLabel = "Gerar questões e flashcards",
}: PracticeSessionDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{
    attempt: PracticeAttempt;
    answer: PracticeAnswer;
  } | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState<PracticeAnswer | null>(
    null,
  );
  const [recallRating, setRecallRating] = useState<
    "forgotten" | "effortful" | "recalled" | null
  >(null);
  const [completed, setCompleted] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [questionResults, setQuestionResults] = useState<
    Record<string, PracticeAttemptResult>
  >({});
  const [recallHistory, setRecallHistory] = useState<
    Record<string, PracticeAttemptResult>
  >({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const attemptIdsRef = useRef<Record<string, string>>({});
  const prefetchedAnswersRef = useRef<Record<string, PracticeAnswer>>({});
  const prefetchingAnswersRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef(Date.now());

  const reset = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setSubmission(null);
    setRevealedAnswer(null);
    setRecallRating(null);
    setCompleted(false);
    setCorrectAnswers(0);
    setQuestionResults({});
    setRecallHistory({});
    setActionError(null);
    setIsSubmitting(false);
    setIsRevealing(false);
    attemptIdsRef.current = {};
    prefetchedAnswersRef.current = {};
    prefetchingAnswersRef.current.clear();
    startedAtRef.current = Date.now();
  };

  useEffect(() => reset(), [mode, session?.id]);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [currentIndex, session?.id]);

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const startAnother = (prefill?: {
    goal?: "reinforce" | "subject" | "topic";
    subjectId?: string;
    topicId?: string;
    format?: PracticeFormat;
  }) => {
    reset();
    onOpenChange(false);
    onStartAnother(prefill);
  };

  const items = session?.items ?? [];
  const activeItem = items[currentIndex] ?? null;
  const isQuestions = activeItem
    ? activeItem.type !== "flashcard"
    : mode !== "flashcards";
  const isMixed = mode === "mixed";
  useEffect(() => {
    if (
      !session ||
      !activeItem ||
      isQuestions ||
      prefetchedAnswersRef.current[activeItem.id] ||
      prefetchingAnswersRef.current.has(activeItem.id)
    )
      return;
    prefetchingAnswersRef.current.add(activeItem.id);
    void Promise.resolve(onReveal(session.id, activeItem.id))
      .then((answer) => {
        prefetchedAnswersRef.current[activeItem.id] = answer;
      })
      .catch(() => undefined)
      .finally(() => {
        prefetchingAnswersRef.current.delete(activeItem.id);
      });
  }, [activeItem, isQuestions, onReveal, session]);
  const sessionLabel = isMixed
    ? "Treino misto"
    : isQuestions
      ? "Questões rápidas"
      : "Flashcards";
  const total = items.length;
  const completedItems = completed ? total : currentIndex;
  const answeredItems = completedItems + (submission ? 1 : 0);
  const progress = total > 0 ? (answeredItems / total) * 100 : 0;
  const correctOptionId =
    typeof submission?.answer.answerKey.correctOptionId === "string"
      ? submission.answer.answerKey.correctOptionId
      : null;
  const correctOptionLabel = activeItem?.options.find(
    (option) => option.id === correctOptionId,
  )?.label;
  const isCorrect = submission?.attempt.result === "correct";

  const attemptIdFor = (itemId: string) => {
    if (!attemptIdsRef.current[itemId])
      attemptIdsRef.current[itemId] = crypto.randomUUID();
    return attemptIdsRef.current[itemId];
  };

  const advance = (result: PracticeAttemptResult) => {
    if (!activeItem) return;
    if (result === "correct") setCorrectAnswers((count) => count + 1);
    if (
      result === "correct" ||
      result === "incorrect" ||
      result === "skipped"
    ) {
      setQuestionResults((history) => ({
        ...history,
        [activeItem.id]: result,
      }));
    }
    if (
      result === "recalled" ||
      result === "effortful" ||
      result === "forgotten"
    ) {
      setRecallHistory((history) => ({ ...history, [activeItem.id]: result }));
    }
    if (currentIndex === total - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedOption(null);
    setSubmission(null);
    setRevealedAnswer(null);
    setRecallRating(null);
    setActionError(null);
  };

  const handleObjectiveSubmit = async () => {
    if (!session || !activeItem || !selectedOption) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      setSubmission(
        await onSubmitAttempt({
          sessionId: session.id,
          itemId: activeItem.id,
          clientAttemptId: attemptIdFor(activeItem.id),
          responseTimeMs: Math.max(0, Date.now() - startedAtRef.current),
          answer: { kind: "objective_answer", optionId: selectedOption },
        }),
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível corrigir a resposta.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReveal = async () => {
    if (!session || !activeItem) return;
    const prefetchedAnswer = prefetchedAnswersRef.current[activeItem.id];
    if (prefetchedAnswer) {
      setRevealedAnswer(prefetchedAnswer);
      return;
    }
    setIsRevealing(true);
    setActionError(null);
    try {
      setRevealedAnswer(await onReveal(session.id, activeItem.id));
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível revelar a resposta.",
      );
    } finally {
      setIsRevealing(false);
    }
  };

  const handleFlashcardAdvance = async () => {
    if (!session || !activeItem || !recallRating) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      const result = await onSubmitAttempt({
        sessionId: session.id,
        itemId: activeItem.id,
        clientAttemptId: attemptIdFor(activeItem.id),
        responseTimeMs: Math.max(0, Date.now() - startedAtRef.current),
        answer: { kind: "flashcard_recall", rating: recallRating },
      });
      advance(result.attempt.result);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar sua lembrança.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const recallCounts = recallOptions.reduce<Record<string, number>>(
    (counts, option) => {
      counts[option.value] = Object.values(recallHistory).filter(
        (value) => value === option.value,
      ).length;
      return counts;
    },
    {},
  );
  const unavailableCopy =
    unavailableReason === "no_due_flashcard"
      ? "Você não tem flashcards pendentes agora. Quando um cartão vencer, ele aparecerá aqui."
      : unavailableScope === "subject"
        ? "Ainda não há material de prática pronto para esta matéria. Escolha um tópico para gerar questões e flashcards."
      : "Ainda não há material de prática pronto para este tópico. Gere questões e flashcards se quiser praticá-lo agora.";
  const hasReinforcementSignal = isQuestions
    ? correctAnswers < total
    : Object.values(recallHistory).some(
        (result) => result === "forgotten" || result === "effortful",
      );
  const incorrectAnswers = Object.values(questionResults).filter(
    (result) => result === "incorrect",
  ).length;
  const skippedQuestions = Object.values(questionResults).filter(
    (result) => result === "skipped",
  ).length;
  const answeredQuestions = correctAnswers + incorrectAnswers;
  const accuracy = answeredQuestions
    ? Math.round((correctAnswers / answeredQuestions) * 100)
    : 0;

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className={cn(
          "min-w-0 max-w-[calc(100vw-1.5rem)] gap-0 rounded-2xl border-border bg-card p-0 shadow-xl sm:max-w-4xl",
          isQuestions
            ? "max-h-[min(720px,calc(100dvh-1rem))] overflow-y-auto"
            : "max-h-[min(680px,calc(100dvh-1rem))] flex flex-col overflow-hidden",
        )}
        hideCloseButton
      >
        <DialogHeader className="min-w-0 border-b border-border px-5 py-3 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle>{sessionLabel}</DialogTitle>
              <DialogDescription className="mt-1 truncate text-xs">
                {completed
                  ? isMixed
                    ? "Treino concluído"
                    : isQuestions
                      ? "Questões concluídas"
                      : "Flashcards concluídos"
                  : session
                    ? `${Math.min(currentIndex + 1, total)} de ${total}`
                    : "Preparação de material"}
              </DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[11px] font-medium tabular-nums text-content-muted">
                {isMixed ? "~4 min" : isQuestions ? "~2 min" : "~3 min"}
              </span>
              <Button
                type="button"
                variant="quiet"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={close}
              >
                Fechar
              </Button>
            </div>
          </div>
          {session && !completed ? (
            <div
              className="mt-3 h-1 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label="Progresso do treino"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={Math.min(answeredItems, total)}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </DialogHeader>

        {!session ? (
          <div className="p-5 sm:p-6">
            <div className="rounded-2xl border border-border bg-secondary/25 p-5 text-center">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                <Lightbulb className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight">
                Material ainda não disponível
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-content-muted">
                {unavailableCopy}
              </p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {onGenerateMaterial ? (
                <Button
                  type="button"
                  disabled={isGeneratingMaterial}
                  className="h-9 text-xs"
                  onClick={onGenerateMaterial}
                >
                  {isGeneratingMaterial
                    ? "Gerando questões e flashcards…"
                    : generateMaterialLabel}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-9 text-xs"
                onClick={close}
              >
                Voltar ao treino
              </Button>
            </div>
          </div>
        ) : completed ? (
          <div className="p-5 sm:p-6">
            <div className="rounded-2xl border border-success/20 bg-success/[0.07] p-5 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold tracking-tight">
                Treino concluído
              </h2>
              {isMixed ? (
                <p className="mt-2 text-sm text-content-muted">
                  Você concluiu {total} itens e acertou {correctAnswers}{" "}
                  questões.
                </p>
              ) : isQuestions ? (
                <>
                  <p className="mt-2 text-sm text-content-muted">
                    {accuracy >= 70
                      ? "Bom resultado. Registre a rodada e siga para a próxima ação."
                      : "Este tópico merece reforço, mas a escolha é sua."}
                  </p>
                  <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2 text-left">
                    <div className="rounded-lg bg-card/70 px-3 py-2">
                      <span className="block text-[11px] text-content-muted">
                        Acertos
                      </span>
                      <strong className="mt-0.5 block text-base tabular-nums text-success">
                        {correctAnswers}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-card/70 px-3 py-2">
                      <span className="block text-[11px] text-content-muted">
                        Erros
                      </span>
                      <strong className="mt-0.5 block text-base tabular-nums text-destructive">
                        {incorrectAnswers}
                      </strong>
                    </div>
                    <div className="rounded-lg bg-card/70 px-3 py-2">
                      <span className="block text-[11px] text-content-muted">
                        Aproveitamento
                      </span>
                      <strong className="mt-0.5 block text-base tabular-nums text-foreground">
                        {accuracy}%
                      </strong>
                    </div>
                  </div>
                  {skippedQuestions > 0 ? (
                    <p className="mt-3 text-xs text-content-muted">
                      {skippedQuestions}{" "}
                      {skippedQuestions === 1
                        ? "questão pulada"
                        : "questões puladas"}{" "}
                      não entrou no aproveitamento.
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2 text-left">
                  {recallOptions.map((option) => (
                    <div
                      key={option.value}
                      className="rounded-lg bg-card/70 px-3 py-2"
                    >
                      <span className="block text-[11px] text-content-muted">
                        {option.label}
                      </span>
                      <strong className="mt-0.5 block text-base tabular-nums text-foreground">
                        {recallCounts[option.value] ?? 0}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {!isQuestions && activeItem ? (
              <div className="mx-auto mt-5 max-w-md text-left">
                <PracticeItemRating
                  itemLabel="flashcard"
                  onRate={(rating, reason) =>
                    onRate({
                      sessionId: session.id,
                      itemId: activeItem.id,
                      rating,
                      reason,
                    })
                  }
                />
              </div>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {hasReinforcementSignal ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={preparingAnotherSession}
                  onClick={() =>
                    startAnother({
                      goal: "reinforce",
                      topicId: session?.topicId ?? undefined,
                      format: !isQuestions ? "flashcards" : "questions",
                    })
                  }
                >
                  <Play className="h-3.5 w-3.5" />{" "}
                  {preparingAnotherSession
                    ? "Montando sessão…"
                    : "Reforçar este tópico"}
                </Button>
              ) : null}
              <Button type="button" className="h-9 text-xs" onClick={close}>
                Concluir e voltar
              </Button>
            </div>
          </div>
        ) : isQuestions && activeItem ? (
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-content-muted">
              Leia com atenção e decida antes de conferir.
            </p>
            <h2 className="mt-3 text-lg font-semibold leading-relaxed text-foreground sm:text-xl">
              {activeItem.prompt}
            </h2>
            <div
              className="mx-auto mt-7 flex max-w-2xl flex-col gap-2.5"
              role="radiogroup"
              aria-label="Alternativas"
            >
              {activeItem.options.map((option, index) => {
                const tone = optionTone(option.label);
                const selected = selectedOption === option.id;
                const correctOption = Boolean(
                  submission && option.id === correctOptionId,
                );
                const wrongSelection = Boolean(
                  submission && selected && !correctOption,
                );
                const badge =
                  tone === "success"
                    ? "C"
                    : tone === "destructive"
                      ? "E"
                      : String.fromCharCode(65 + index);
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={Boolean(submission) || isSubmitting}
                    onClick={() => setSelectedOption(option.id)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-sm font-medium transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default disabled:opacity-100",
                      tone === "success" &&
                        !submission &&
                        "border-success/30 bg-success/[0.04] hover:border-success/55 hover:bg-success/[0.10]",
                      tone === "destructive" &&
                        !submission &&
                        "border-destructive/30 bg-destructive/[0.04] hover:border-destructive/55 hover:bg-destructive/[0.10]",
                      tone === "primary" &&
                        !submission &&
                        "border-primary/25 bg-primary/[0.04] hover:border-primary/55 hover:bg-primary/[0.10]",
                      selected &&
                        !submission &&
                        tone === "success" &&
                        "border-success bg-success/[0.12]",
                      selected &&
                        !submission &&
                        tone === "destructive" &&
                        "border-destructive bg-destructive/[0.12]",
                      selected &&
                        !submission &&
                        tone === "primary" &&
                        "border-primary bg-primary/[0.12]",
                      correctOption && "border-success/40 bg-success/[0.08]",
                      wrongSelection &&
                        "border-destructive/40 bg-destructive/[0.08]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 place-items-center rounded-md border text-xs font-semibold uppercase",
                        tone === "success" && "border-success/40 text-success",
                        tone === "destructive" &&
                          "border-destructive/40 text-destructive",
                        tone === "primary" && "border-primary/40 text-primary",
                        selected &&
                          !submission &&
                          tone === "success" &&
                          "bg-success text-success-foreground",
                        selected &&
                          !submission &&
                          tone === "destructive" &&
                          "bg-destructive text-destructive-foreground",
                        selected &&
                          !submission &&
                          tone === "primary" &&
                          "bg-primary text-primary-foreground",
                        correctOption &&
                          "border-success bg-success text-success-foreground",
                        wrongSelection &&
                          "border-destructive bg-destructive text-destructive-foreground",
                      )}
                    >
                      {badge}
                    </span>
                    <span className="min-w-0 leading-relaxed">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {!submission ? (
              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  disabled={!selectedOption || isSubmitting}
                  onClick={() => void handleObjectiveSubmit()}
                  className="h-9 px-4 text-xs disabled:opacity-45"
                >
                  {isSubmitting ? "Corrigindo…" : "Confirmar resposta"}{" "}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="mt-5 space-y-4" aria-live="polite">
                <div
                  className={cn(
                    "flex gap-3 rounded-lg border p-3",
                    isCorrect
                      ? "border-success/25 bg-success/[0.06]"
                      : "border-destructive/25 bg-destructive/[0.06]",
                  )}
                >
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {isCorrect
                        ? "Resposta correta"
                        : `A resposta correta é ${correctOptionLabel ?? "a alternativa indicada"}`}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-content-muted">
                      {submission.answer.explanation}
                    </p>
                  </div>
                </div>
                <PracticeItemRating
                  key={activeItem.id}
                  onRate={(rating, reason) =>
                    onRate({
                      sessionId: session.id,
                      itemId: activeItem.id,
                      rating,
                      reason,
                    })
                  }
                />
                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    type="button"
                    onClick={() => advance(submission.attempt.result)}
                    className="h-9 px-4 text-xs"
                  >
                    {currentIndex === total - 1
                      ? "Ver resultado"
                      : "Próxima questão"}{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
            {actionError && (
              <p
                className="mt-3 text-sm font-medium text-destructive"
                role="alert"
              >
                {actionError}
              </p>
            )}
          </div>
        ) : activeItem ? (
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
            <div className="mx-auto min-w-0 max-w-3xl">
              {!revealedAnswer ? (
                <button
                  type="button"
                  aria-label="Revelar resposta"
                  disabled={isRevealing}
                  onClick={() => void handleReveal()}
                  className="group flex h-[360px] min-w-0 w-full flex-col overflow-hidden rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-left shadow-sm transition-[background-color,border-color,box-shadow] duration-200 hover:border-primary/40 hover:bg-secondary/[0.12] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-wait disabled:opacity-80 sm:h-[380px] sm:px-5 sm:py-4"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">
                    Frente
                  </span>
                  <h2 className="mt-6 text-pretty text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
                    {activeItem.prompt}
                  </h2>
                  <span className="mb-7 mt-auto self-center text-center text-content-muted transition-colors group-hover:text-foreground">
                    <span className="inline-flex items-center text-sm">
                      <Eye className="mr-2 h-4 w-4" />{" "}
                      {isRevealing
                        ? "Abrindo resposta salva…"
                        : "Revelar resposta"}
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-content-muted">
                      Busca o verso já salvo. Não usa IA.
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex h-[360px] min-w-0 flex-col overflow-hidden rounded-2xl border border-dashed border-border bg-card shadow-sm sm:h-[380px]">
                  <div className="flex h-1/2 min-h-0 min-w-0 shrink-0 flex-col items-stretch justify-start px-4 py-4 sm:px-5 sm:py-5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-primary">
                      Frente
                    </span>
                    <h2 className="mt-6 text-pretty text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
                      {activeItem.prompt}
                    </h2>
                  </div>
                  <div
                    className="animate-in fade-in-0 slide-in-from-bottom-1 h-1/2 min-h-0 shrink-0 overflow-y-auto border-t border-border bg-secondary/20 px-4 py-4 duration-200 sm:px-5"
                    aria-live="polite"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                      Verso
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-foreground">
                      {revealedAnswer.explanation}
                    </p>
                  </div>
                </div>
              )}
              {revealedAnswer && (
                <div className="sticky bottom-0 mt-4 border-t border-border bg-card/95 pt-4 backdrop-blur-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <fieldset className="min-w-0 flex-1">
                      <legend className="text-[13px] font-semibold">
                        Como foi lembrar?
                      </legend>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {recallOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={recallRating === option.value}
                            onClick={() => setRecallRating(option.value)}
                            className={cn(
                              "min-h-12 rounded-xl px-3 py-2 text-left ring-1 transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/50",
                              recallRating === option.value &&
                                option.value === "forgotten" &&
                                "bg-destructive text-destructive-foreground ring-destructive",
                              recallRating === option.value &&
                                option.value === "effortful" &&
                                "bg-warning text-warning-foreground ring-warning",
                              recallRating === option.value &&
                                option.value === "recalled" &&
                                "bg-success text-success-foreground ring-success",
                              recallRating !== option.value &&
                                option.value === "forgotten" &&
                                "bg-card text-foreground ring-border hover:bg-destructive/10 hover:ring-destructive/25",
                              recallRating !== option.value &&
                                option.value === "effortful" &&
                                "bg-card text-foreground ring-border hover:bg-warning/10 hover:ring-warning/25",
                              recallRating !== option.value &&
                                option.value === "recalled" &&
                                "bg-card text-foreground ring-border hover:bg-success/10 hover:ring-success/25",
                            )}
                          >
                            <span className="block text-[13px] font-semibold">
                              {option.label}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 block text-[11px]",
                                recallRating === option.value
                                  ? "text-current/80"
                                  : "text-content-muted",
                              )}
                            >
                              {option.detail}
                            </span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <Button
                      type="button"
                      disabled={!recallRating || isSubmitting}
                      onClick={() => void handleFlashcardAdvance()}
                      className="h-9 shrink-0 px-4 text-xs disabled:opacity-45"
                    >
                      {isSubmitting
                        ? "Salvando…"
                        : currentIndex === total - 1
                          ? "Ver resultado"
                          : "Próximo cartão"}{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
              {actionError && (
                <p
                  className="mt-3 text-sm font-medium text-destructive"
                  role="alert"
                >
                  {actionError}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
