import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  Layers3,
  ListChecks,
  LoaderCircle,
  PartyPopper,
  Play,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { StudyEmptyState } from "@/components/study/StudyEmptyState";
import { PracticeBuilderDialog } from "@/features/practice/components/PracticeBuilderDialog";
import {
  PracticeGenerationDialog,
  type PracticeGenerationState,
} from "@/features/practice/components/PracticeGenerationDialog";
import { PracticeMaterialLibrary } from "@/features/practice/components/PracticeMaterialLibrary";
import {
  PracticeSessionDialog,
  type PracticeMode as DialogPracticeMode,
} from "@/features/practice/components/PracticeSessionDialog";
import { usePracticeSessionActions } from "@/features/practice/hooks/usePracticeSessionActions";
import { usePracticeOverview } from "@/features/practice/hooks/usePracticeOverview";
import { usePracticeSubjects } from "@/features/practice/hooks/usePracticeTopicOptions";
import type {
  BuildPracticeSessionInput,
  BuildPracticeSessionResult,
  PracticeFormat,
  PracticeMaterialTopic,
  PracticeSession,
} from "@/features/practice/services/practiceService";

type SessionState = {
  mode: DialogPracticeMode;
  session: PracticeSession | null;
  unavailableReason?: Extract<
    BuildPracticeSessionResult,
    { status: "needs_material" }
  >["reason"];
  unavailableTopicId?: string | null;
  unavailableSubjectId?: string | null;
};

const dialogModeFor = (format: PracticeFormat): DialogPracticeMode =>
  format === "flashcards"
    ? "flashcards"
    : format === "mixed"
      ? "mixed"
      : "questions";

const reasonCopy = (reason: string) => {
  if (reason === "overdue_review") return "Revisão atrasada";
  if (reason === "review_due_today") return "Revisão prevista para hoje";
  if (reason === "recent_failure") return "Falha recente para reforçar";
  if (reason === "recorded_difficulty") return "Dificuldade registrada";
  if (reason === "practice_inactive") return "Hora de retomar a prática";
  return "Tópico pronto para praticar";
};

const PracticeHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionState | null>(null);
  const [builderMode, setBuilderMode] = useState<"manual" | "deepening" | null>(
    null,
  );
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [generationTopicId, setGenerationTopicId] = useState<string | null>(
    null,
  );
  const [generationState, setGenerationState] =
    useState<PracticeGenerationState | null>(null);
  const [openingGeneratedFormat, setOpeningGeneratedFormat] = useState<
    "questions" | "flashcards" | null
  >(null);
  const [builderPrefill, setBuilderPrefill] = useState<{
    goal?: "reinforce" | "subject" | "topic";
    subjectId?: string;
    topicId?: string;
    subjectName?: string;
    topicName?: string;
    format?: PracticeFormat;
  }>({});
  const overviewQuery = usePracticeOverview(user?.id);
  const generatedTopicQuery = usePracticeOverview(
    user?.id,
    generationTopicId ?? undefined,
    Boolean(generationTopicId),
    generationState === "preparing",
  );
  const subjectsQuery = usePracticeSubjects(
    user?.id,
    overviewQuery.data?.scope.subjectIds,
  );
  const { buildSession, generatePackage, revealItem, submitAttempt, rateItem } =
    usePracticeSessionActions();
  const recommendation = overviewQuery.data?.dailyRecommendation;
  const generatedMaterialTopic =
    generatedTopicQuery.data?.materialTopics.find(
      (topic) => topic.id === generationTopicId,
    ) ?? null;

  useEffect(() => {
    if (generationState !== "preparing" || !generatedMaterialTopic) return;
    if (generatedMaterialTopic.hasReadyPackage) {
      setGenerationState("ready");
      void overviewQuery.refetch();
      return;
    }
    if (!generatedMaterialTopic.isGenerating) setGenerationState("failed");
  }, [generatedMaterialTopic, generationState, overviewQuery]);

  const launch = async (
    input: BuildPracticeSessionInput,
    format: PracticeFormat,
  ) => {
    setLaunchError(null);
    try {
      const result = await buildSession.mutateAsync(input);
      if (result.status === "ready") {
        setBuilderMode(null);
        setSession({ mode: dialogModeFor(format), session: result.session });
        return true;
      } else {
        setSession({
          mode: dialogModeFor(format),
          session: null,
          unavailableReason: result.reason,
          unavailableTopicId: result.topicId,
          unavailableSubjectId: input.subjectId,
        });
        return false;
      }
    } catch (error) {
      setLaunchError(
        error instanceof Error
          ? error.message
          : "Não foi possível montar o treino.",
      );
      return false;
    }
  };

  const launchDaily = () => {
    if (!recommendation || recommendation.kind === "clear") return;
    const isFlashcards =
      recommendation.kind === "flashcards_due" ||
      recommendation.kind === "flashcards_new";
    void launch(
      {
        mode: isFlashcards ? "flashcards_due" : "questions",
        ...(recommendation.kind === "flashcards_new"
          ? { flashcardPurpose: "new" as const }
          : recommendation.kind === "flashcards_due"
            ? { flashcardPurpose: "review" as const }
            : {}),
        // A fila diária de flashcards é do ciclo ativo. O tópico exibido explica
        // o primeiro cartão da fila, mas não pode limitar a consulta a ele.
        ...(!isFlashcards && recommendation.topic?.id
          ? { topicId: recommendation.topic.id }
          : {}),
        format: isFlashcards ? "flashcards" : "questions",
        origin: "daily_recommendation",
        quantity: isFlashcards
          ? Math.min(recommendation.count, 6)
          : Math.min(recommendation.count, 3),
        idempotencyKey: crypto.randomUUID(),
      },
      isFlashcards ? "flashcards" : "questions",
    );
  };

  const generate = async (topicId: string) => {
    setLaunchError(null);
    setGenerationTopicId(topicId);
    setGenerationState("preparing");
    setBuilderMode(null);
    try {
      await generatePackage.mutateAsync({
        topicId,
        idempotencyKey: crypto.randomUUID(),
        trigger: "explicit",
      });
      await overviewQuery.refetch();
    } catch (error) {
      setGenerationState("failed");
      setLaunchError(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o material agora.",
      );
    }
  };

  const launchMaterialQuestions = (topic: PracticeMaterialTopic) =>
    launch(
      {
        mode: "questions",
        topicId: topic.id,
        format: "questions",
        origin: "manual",
        quantity: Math.min(topic.questionCount, 3),
        idempotencyKey: crypto.randomUUID(),
      },
      "questions",
    );

  const launchMaterialFlashcards = (topic: PracticeMaterialTopic) =>
    launch(
      {
        mode: "quick",
        topicId: topic.id,
        format: "flashcards",
        origin: "manual",
        quantity: Math.min(topic.flashcardCount, 6),
        idempotencyKey: crypto.randomUUID(),
      },
      "flashcards",
    );

  const launchGeneratedMaterial = async (
    topic: PracticeMaterialTopic,
    format: "questions" | "flashcards",
  ) => {
    setOpeningGeneratedFormat(format);
    const opened = format === "questions"
      ? await launchMaterialQuestions(topic)
      : await launchMaterialFlashcards(topic);
    setGenerationState(null);
    setOpeningGeneratedFormat(null);
    return opened;
  };

  const prepareGenerationFromUnavailableSession = () => {
    if (session?.unavailableTopicId) {
      const topicId = session.unavailableTopicId;
      setSession(null);
      void generate(topicId);
      return;
    }
    if (session?.unavailableSubjectId) {
      setSession(null);
      setBuilderPrefill({ goal: "topic", subjectId: session.unavailableSubjectId });
      setBuilderMode("deepening");
    }
  };

  const launchDueFlashcards = (topic: PracticeMaterialTopic) => {
    void launch(
      {
        mode: "flashcards_due",
        topicId: topic.id,
        format: "flashcards",
        origin: "daily_recommendation",
        flashcardPurpose: "review",
        quantity: Math.min(topic.dueFlashcardCount, 6),
        idempotencyKey: crypto.randomUUID(),
      },
      "flashcards",
    );
  };

  const isLoading = overviewQuery.isLoading;
  const isClear =
    !isLoading &&
    !overviewQuery.isError &&
    (!recommendation || recommendation.kind === "clear");
  const isFlashcards =
    recommendation?.kind === "flashcards_due" ||
    recommendation?.kind === "flashcards_new";
  const isNewFlashcards = recommendation?.kind === "flashcards_new";
  const studyAction = overviewQuery.data?.studyAction;
  const clearActionTargetsReviews =
    studyAction?.kind === "reviews" && Boolean(studyAction.topic?.id);
  const clearActionLabel = clearActionTargetsReviews
    ? "Abrir revisão pendente"
    : "Continuar pelo Ciclo";
  const clearActionDescription = clearActionTargetsReviews
    ? studyAction?.reason === "overdue_review"
      ? "Você tem uma revisão atrasada para retomar antes de escolher outro treino."
      : "Há uma revisão prevista para hoje no seu plano."
    : "Siga a sequência do seu ciclo; quando surgir um sinal de reforço, o Treino volta a orientar sua prática.";
  const scopeStatus = overviewQuery.data?.scope.status;
  const statusVisual = isLoading
    ? {
        Icon: Sparkles,
        className:
          "border-primary/25 bg-primary/10 text-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.06)]",
      }
    : isClear
      ? {
          Icon: PartyPopper,
          className:
            "border-success/25 bg-success/10 text-success shadow-[0_0_0_6px_hsl(var(--success)/0.06)]",
        }
      : isFlashcards
        ? {
            Icon: BrainCircuit,
            className:
              "border-warning/25 bg-warning/10 text-warning shadow-[0_0_0_6px_hsl(var(--warning)/0.06)]",
          }
        : {
            Icon: CircleAlert,
            className:
              "border-primary/25 bg-primary/10 text-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.06)]",
          };
  const StatusIcon = statusVisual.Icon;
  const statusHeading = isLoading
    ? "Carregando"
    : isClear
      ? "Próximo passo"
      : "Ação de hoje";
  const recommendationCountLabel =
    recommendation?.count === 1
      ? isFlashcards
        ? "1 flashcard"
        : "1 questão"
      : `${recommendation?.count ?? 0} ${isFlashcards ? "flashcards" : "questões"}`;
  const pendingCount =
    recommendation?.pendingCount ?? recommendation?.count ?? 0;
  const availabilityLabel =
    pendingCount === 1
      ? `1 ${isFlashcards ? "flashcard pendente hoje" : "questão disponível neste tópico"}`
      : `${pendingCount} ${isFlashcards ? "flashcards pendentes hoje" : "questões disponíveis neste tópico"}`;
  const recommendedTopic =
    recommendation?.topic ??
    (isFlashcards
      ? (overviewQuery.data?.materialTopics.find(
          (topic) => topic.dueFlashcardCount > 0,
        ) ?? overviewQuery.data?.materialTopics[0])
      : undefined);

  if (overviewQuery.isError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <section
          aria-labelledby="practice-load-error-title"
          className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5 sm:p-6"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
              <CircleAlert aria-hidden="true" className="size-5" />
            </div>
            <div className="min-w-0">
              <h1
                id="practice-load-error-title"
                className="text-lg font-semibold tracking-tight"
              >
                Não foi possível carregar seu treino
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-content-muted">
                Não vamos considerar sua prática em dia sem consultar a fila e o
                material do ciclo atual.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-9 px-3 text-xs"
                disabled={overviewQuery.isFetching}
                onClick={() => void overviewQuery.refetch()}
              >
                {overviewQuery.isFetching
                  ? "Tentando novamente…"
                  : "Tentar novamente"}
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (
    !isLoading &&
    (scopeStatus === "no_edital" || scopeStatus === "no_active_edital")
  ) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <StudyEmptyState
          kind={scopeStatus === "no_edital" ? "no-edital" : "no-cycle"}
          variant="center"
          onAction={() => navigate("/meus-editais")}
        />
        <p className="mx-auto -mt-14 max-w-xl px-4 text-center text-sm leading-relaxed text-content-muted sm:-mt-12">
          Seu histórico de prática permanece privado, mas só o conteúdo do
          edital carregado pode entrar na recomendação e no treino livre.
        </p>
      </main>
    );
  }
  const title = isLoading
    ? "Preparando seu treino recomendado"
    : isClear
      ? "Prática em dia. Continue seu plano."
      : isFlashcards
        ? `${isNewFlashcards ? "Conhecer" : "Revisar"} ${recommendation.count} ${recommendation.count === 1 ? "flashcard" : "flashcards"}`
        : `Praticar ${recommendation?.count ?? 0} ${recommendation?.count === 1 ? "questão" : "questões"}`;
  const description = isLoading
    ? "Consultando sua fila e o material do ciclo. Esta tela libera as ações quando os dados estiverem prontos."
    : isClear
      ? "Não há treino indicado para reforçar agora. Sua próxima decisão continua no plano de estudos — não no material que estiver disponível."
      : isFlashcards
        ? isNewFlashcards
          ? "Estes cartões foram preparados depois do seu estudo neste tópico. Conheça-os agora; depois da primeira resposta, cada cartão ganha sua própria data de revisão."
          : "Você já respondeu estes cartões antes. A data definida pela sua resposta chegou e eles precisam de nova recuperação."
        : recommendation?.reason === "practice_inactive"
          ? "Você já tem histórico de treino, mas sua prática recente perdeu ritmo. Retome com uma sessão curta neste tópico já estudado."
          : "Responda às questões recomendadas para reforçar este tópico.";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section
        aria-busy={isLoading}
        aria-labelledby="daily-practice-title"
        className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/[0.10] via-card to-violet-500/[0.08] p-5 shadow-[0_18px_48px_-34px_hsl(var(--primary)/0.55)] sm:p-7"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Sparkles className="size-4" />{" "}
              {isFlashcards
                ? isNewFlashcards
                  ? "Primeiro contato · flashcards"
                  : "Revisão de flashcards"
                : "Sua próxima ação · recomendado"}
            </p>
            {!isClear && recommendedTopic && (
              <div className="mt-5 space-y-1 text-xs">
                <p className="inline-flex items-center gap-1.5 font-semibold text-primary">
                  <Layers3 className="size-3.5" />{" "}
                  {recommendedTopic.subjectName}
                </p>
                <p className="max-w-2xl pl-5 leading-relaxed text-content-muted">
                  {recommendedTopic.name}
                </p>
              </div>
            )}
            <h1
              id="daily-practice-title"
              className="mt-2 max-w-2xl text-balance text-xl font-bold tracking-tight sm:text-2xl"
            >
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-content-muted">
              {description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {isClear ? (
                <Button
                  className="h-10 px-4 text-xs"
                  onClick={() =>
                    navigate(
                      clearActionTargetsReviews
                        ? `/revisoes?topicId=${studyAction?.topic?.id}`
                        : "/ciclo-estudos",
                    )
                  }
                >
                  <BookOpen className="size-3.5" /> {clearActionLabel}
                </Button>
              ) : (
                <Button
                  className="h-10 px-4 text-xs"
                  disabled={isLoading || buildSession.isPending}
                  onClick={launchDaily}
                >
                  <Play className="size-3.5" />{" "}
                  {buildSession.isPending
                    ? "Montando sessão…"
                    : "Começar treino recomendado"}
                </Button>
              )}
            </div>
          </div>
          <aside
            role={isLoading ? "status" : undefined}
            aria-live={isLoading ? "polite" : undefined}
            className="rounded-2xl border border-primary/15 bg-card/75 p-5 shadow-sm backdrop-blur-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-content-muted">
              {statusHeading}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div
                data-testid="practice-status-icon"
                className={`grid size-12 shrink-0 place-items-center rounded-full border-2 ${statusVisual.className}`}
              >
                {isLoading ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-5 animate-spin"
                  />
                ) : (
                  <StatusIcon aria-hidden="true" className="size-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isLoading
                    ? "Carregando treino"
                    : isClear
                      ? "Sem treino pendente"
                      : `${recommendationCountLabel} agora`}
                </p>
                <p className="mt-1 text-xs text-content-muted">
                  {isLoading
                    ? "Consultando sua fila e seu ciclo…"
                    : isClear
                      ? clearActionDescription
                      : isFlashcards
                        ? isNewFlashcards
                          ? "Seu primeiro contato com estes cartões"
                          : "Já chegou a data de revisá-los"
                        : availabilityLabel}
                </p>
                {!isLoading && !isClear && (
                  <p className="mt-1 text-xs leading-relaxed text-content-muted">
                    {isFlashcards
                      ? isNewFlashcards
                        ? "Após responder, eles entram na sua agenda individual."
                        : "Agenda própria do Treino; revisões do Ciclo continuam em Revisões."
                      : `${reasonCopy(String(recommendation?.reason))}${recommendedTopic ? ` · ${recommendedTopic.subjectName}` : ` · ${recommendation?.topicCount ?? 0} ${recommendation?.topicCount === 1 ? "tópico" : "tópicos"}`}`}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 border-t border-border pt-4 text-sm text-content-muted">
              <div className="flex justify-between">
                <span>{isClear ? "Destino" : "Duração"}</span>
                <strong className="text-foreground">
                  {isClear
                    ? clearActionTargetsReviews
                      ? "Revisões"
                      : "Ciclo"
                    : `~${recommendation?.estimatedMinutes ?? 2} min`}
                </strong>
              </div>
              <div className="mt-2 flex justify-between">
                <span>{isClear ? "Treino" : "Formato"}</span>
                <strong className="text-foreground">
                  {isClear
                    ? "Sem pendência"
                    : isFlashcards
                      ? "Flashcards"
                      : "Questões"}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        aria-labelledby="free-training-title"
        className={`mt-5 rounded-2xl border border-border/80 bg-card/60 p-5 shadow-sm sm:p-6 ${isLoading ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">
              <ListChecks className="size-4" /> Por escolha · prática livre
            </p>
            <h2
              id="free-training-title"
              className="mt-2 text-lg font-semibold tracking-tight"
            >
              Pratique o material disponível
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-content-muted">
              Escolha matéria, tópico e formato para praticar questões e
              flashcards que já existem. Esta ação não altera a agenda dos seus
              flashcards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="h-9 w-fit shrink-0 px-3 text-xs"
              disabled={isLoading}
              onClick={() => setBuilderMode("manual")}
            >
              <ListChecks className="size-3.5" /> Praticar material disponível{" "}
              <ArrowRight className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              className="h-9 w-fit shrink-0 px-3 text-xs text-content-muted hover:text-foreground"
              disabled={isLoading}
              onClick={() => setBuilderMode("deepening")}
            >
              <WandSparkles className="size-3.5" /> Gerar novas questões e
              flashcards
            </Button>
          </div>
        </div>
        <p className="mt-4 border-t border-border/80 pt-4 text-xs leading-relaxed text-content-muted">
          <span className="font-semibold text-foreground">
            Gerar novas questões e flashcards
          </span>{" "}
          usa IA para criar material privado sobre o tópico que você seleciona.
          Faça isso depois de estudar o tópico ou quando a recomendação indicar
          falta de material.
        </p>
      </section>

      <PracticeMaterialLibrary
        topics={overviewQuery.data?.materialTopics ?? []}
        excludeTopicId={
          recommendation?.kind === "questions"
            ? recommendation.topic?.id
            : undefined
        }
        onPracticeQuestions={launchMaterialQuestions}
        onPracticeFlashcards={launchMaterialFlashcards}
        onReviewDueFlashcards={launchDueFlashcards}
      />

      {launchError && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {launchError}
        </div>
      )}
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-content-muted">
        <CheckCircle2 className="size-4 text-success" /> Respostas,
        autoavaliação e feedback ficam no seu histórico privado.
      </div>

      <PracticeBuilderDialog
        open={Boolean(builderMode)}
        mode={builderMode ?? "manual"}
        userId={user?.id}
        subjects={subjectsQuery.data ?? []}
        isStarting={buildSession.isPending}
        isGenerating={generatePackage.isPending}
        initialGoal={builderPrefill.goal}
        initialSubjectId={builderPrefill.subjectId}
        initialTopicId={builderPrefill.topicId}
        initialSubjectName={builderPrefill.subjectName}
        initialTopicName={builderPrefill.topicName}
        initialFormat={builderPrefill.format}
        onOpenChange={(open) => {
          if (!open) {
            setBuilderMode(null);
            setBuilderPrefill({});
          }
        }}
        onStart={(input) =>
          void launch(
            { ...input, origin: "manual", idempotencyKey: crypto.randomUUID() },
            input.format,
          )
        }
        onGenerate={(topicId) => void generate(topicId)}
        onBackToManual={() => setBuilderMode("manual")}
      />
      <PracticeGenerationDialog
        open={Boolean(generationState)}
        state={generationState ?? "preparing"}
        topic={generatedMaterialTopic}
        onOpenChange={(open) => {
          if (!open) {
            setGenerationState(null);
            setGenerationTopicId(null);
          }
        }}
        onPracticeQuestions={() => {
          if (!generatedMaterialTopic) return;
          void launchGeneratedMaterial(generatedMaterialTopic, "questions");
        }}
        onPracticeFlashcards={() => {
          if (!generatedMaterialTopic) return;
          void launchGeneratedMaterial(generatedMaterialTopic, "flashcards");
        }}
        onChooseAnotherTopic={() => {
          setGenerationState(null);
          setGenerationTopicId(null);
          setBuilderMode("deepening");
        }}
        openingFormat={openingGeneratedFormat}
      />
      <PracticeSessionDialog
        mode={session?.mode ?? null}
        session={session?.session ?? null}
        unavailableReason={session?.unavailableReason}
        unavailableScope={
          session?.unavailableTopicId
            ? "topic"
            : session?.unavailableSubjectId
              ? "subject"
              : "topic"
        }
        preparingAnotherSession={buildSession.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setSession(null);
            void overviewQuery.refetch();
          }
        }}
        onReveal={(sessionId, itemId) =>
          revealItem.mutateAsync({ sessionId, itemId })
        }
        onSubmitAttempt={async (input) => {
          const result = await submitAttempt.mutateAsync(input);
          void overviewQuery.refetch();
          return result;
        }}
        onRate={(input) => rateItem.mutateAsync(input)}
        onStartAnother={(prefill) => {
          const topic = session?.session?.topicId
            ? (overviewQuery.data?.materialTopics.find(
                (item) => item.id === session.session?.topicId,
              ) ?? overviewQuery.data?.recommendedTopic)
            : null;
          setBuilderPrefill({
            ...(prefill ?? {}),
            subjectId: topic?.subjectId,
            topicId: topic?.id,
            subjectName: topic?.subjectName,
            topicName: topic?.name,
          });
          setBuilderMode("manual");
        }}
        onGenerateMaterial={
          session?.unavailableReason !== "no_due_flashcard" &&
          (session?.unavailableTopicId || session?.unavailableSubjectId)
            ? prepareGenerationFromUnavailableSession
            : undefined
        }
        isGeneratingMaterial={generatePackage.isPending}
        generateMaterialLabel={
          session?.unavailableTopicId
            ? "Gerar questões e flashcards"
            : "Escolher tópico para gerar material"
        }
      />
    </main>
  );
};

export default PracticeHome;
