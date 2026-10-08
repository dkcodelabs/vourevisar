import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { StudyEmptyState } from "@/components/study/StudyEmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { PracticeComposer } from "@/features/practice/components/PracticeComposer";
import { PracticeGenerationDialog, type PracticeGenerationState, type PracticeGenerationTopic } from "@/features/practice/components/PracticeGenerationDialog";
import { PracticeSessionDialog, type PracticeMode as DialogPracticeMode } from "@/features/practice/components/PracticeSessionDialog";
import { usePracticeComposer } from "@/features/practice/hooks/usePracticeComposer";
import { usePracticeSessionActions } from "@/features/practice/hooks/usePracticeSessionActions";
import { usePracticeOverview } from "@/features/practice/hooks/usePracticeOverview";
import { usePracticeSubjects } from "@/features/practice/hooks/usePracticeTopicOptions";
import type { BuildPracticeSessionInput, BuildPracticeSessionResult, PracticeFormat, PracticeSession } from "@/features/practice/services/practiceService";

type SessionState = {
  mode: DialogPracticeMode;
  session: PracticeSession | null;
  isPreparing?: boolean;
  unavailableReason?: Extract<BuildPracticeSessionResult, { status: "needs_material" }>["reason"];
  unavailableTopicId?: string | null;
  unavailableSubjectId?: string | null;
};

type PendingGenerationInput = Omit<BuildPracticeSessionInput, "idempotencyKey">;

const dialogModeFor = (format: PracticeFormat): DialogPracticeMode => format === "flashcards" ? "flashcards" : format === "mixed" ? "mixed" : "questions";

const PracticeHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionState | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [generationTopicId, setGenerationTopicId] = useState<string | null>(null);
  const [generationState, setGenerationState] = useState<PracticeGenerationState | null>(null);
  const [generationInput, setGenerationInput] = useState<PendingGenerationInput | null>(null);
  const [generationSubmitted, setGenerationSubmitted] = useState(false);
  const [generationTopicSnapshot, setGenerationTopicSnapshot] = useState<PracticeGenerationTopic | null>(null);
  const [autoStartInput, setAutoStartInput] = useState<PendingGenerationInput | null>(null);
  const launchRequestRef = useRef(0);
  const overviewQuery = usePracticeOverview(user?.id);
  const refetchOverview = overviewQuery.refetch;
  const subjectsQuery = usePracticeSubjects(user?.id, overviewQuery.data?.scope.subjectIds);
  const composer = usePracticeComposer({ userId: user?.id, overview: overviewQuery.data, subjects: subjectsQuery.data ?? [] });
  const generatedTopicQuery = usePracticeOverview(user?.id, generationTopicId ?? undefined, Boolean(generationTopicId), generationState === "preparing");
  const { buildSession, generatePackage, revealItem, submitAttempt, rateItem } = usePracticeSessionActions();
  const generatedMaterialTopic = generatedTopicQuery.data?.materialTopics.find((topic) => topic.id === generationTopicId) ?? null;
  const generationDisplayTopic = generatedMaterialTopic ?? generationTopicSnapshot;
  const launch = useCallback(async (input: BuildPracticeSessionInput, format: PracticeFormat) => {
    setLaunchError(null);
    const launchRequestId = ++launchRequestRef.current;
    setSession({ mode: dialogModeFor(format), session: null, isPreparing: true });
    try {
      const result = await buildSession.mutateAsync(input);
      if (launchRequestId !== launchRequestRef.current) return false;
      if (result.status === "ready") {
        setSession({ mode: dialogModeFor(format), session: result.session });
        return true;
      }
      setSession({ mode: dialogModeFor(format), session: null, unavailableReason: result.reason, unavailableTopicId: result.topicId, unavailableSubjectId: input.subjectId });
      return false;
    } catch (error) {
      if (launchRequestId !== launchRequestRef.current) return false;
      setSession(null);
      setLaunchError(error instanceof Error ? error.message : "Não foi possível montar o treino.");
      return false;
    }
  }, [buildSession]);

  const launchComposer = () => {
    const input = composer.buildInput();
    if (input) void launch({ ...input, idempotencyKey: crypto.randomUUID() }, composer.format);
  };

  const generate = async () => {
    const input = composer.buildInputAfterGeneration();
    if (!input?.topicId) return;
    setLaunchError(null);
    setGenerationInput(input);
    setGenerationTopicId(input.topicId);
    setGenerationTopicSnapshot({
      subjectName: composer.selectedSubjectName || "Matéria selecionada",
      name: composer.selectedTopicName || "Tópico selecionado",
    });
    setGenerationState("preparing");
    setGenerationSubmitted(false);
    try {
      await generatePackage.mutateAsync({
        topicId: input.topicId,
        idempotencyKey: crypto.randomUUID(),
        trigger: composer.selectedFormatIsExhausted ? "replacement" : "explicit",
      });
      setGenerationSubmitted(true);
      await overviewQuery.refetch();
    } catch (error) {
      setGenerationState("failed");
      setLaunchError(error instanceof Error ? error.message : "Não foi possível gerar o material agora.");
    }
  };

  useEffect(() => {
    if (generationState !== "preparing" || !generationSubmitted || !generatedMaterialTopic) return;
    if (generatedMaterialTopic.hasReadyPackage && !generatedMaterialTopic.isGenerating && generationInput) {
      const input = generationInput;
      setGenerationState(null);
      setGenerationTopicId(null);
      setGenerationInput(null);
      setGenerationSubmitted(false);
      setGenerationTopicSnapshot(null);
      setAutoStartInput(input);
      void refetchOverview();
    } else if (!generatedMaterialTopic.isGenerating) {
      setGenerationState("failed");
    }
  }, [generatedMaterialTopic, generationInput, generationState, generationSubmitted, refetchOverview]);

  useEffect(() => {
    if (!autoStartInput) return;
    setAutoStartInput(null);
    void launch({ ...autoStartInput, idempotencyKey: crypto.randomUUID() }, autoStartInput.format ?? "questions");
  }, [autoStartInput, launch]);

  const focusComposer = () => requestAnimationFrame(() => document.getElementById("practice-composer")?.focus());

  if (overviewQuery.isError) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"><section aria-labelledby="practice-load-error-title" className="rounded-2xl border border-destructive/25 bg-destructive/5 p-5 sm:p-6" role="alert"><div className="flex items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"><CircleAlert aria-hidden="true" className="size-5" /></div><div><h1 id="practice-load-error-title" className="text-lg font-semibold tracking-tight">Não foi possível carregar seu treino</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-content-muted">Não vamos considerar sua prática em dia sem consultar a fila e o material do ciclo atual.</p><Button type="button" variant="outline" className="mt-4 h-9 px-3 text-xs" disabled={overviewQuery.isFetching} onClick={() => void overviewQuery.refetch()}>{overviewQuery.isFetching ? "Tentando novamente…" : "Tentar novamente"}</Button></div></div></section></main>;
  }

  const scopeStatus = overviewQuery.data?.scope.status;
  if (!overviewQuery.isLoading && (scopeStatus === "no_edital" || scopeStatus === "no_active_edital")) {
    return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"><StudyEmptyState kind={scopeStatus === "no_edital" ? "no-edital" : "no-cycle"} variant="center" onAction={() => navigate("/meus-editais")} /><p className="mx-auto -mt-14 max-w-xl px-4 text-center text-sm leading-relaxed text-content-muted sm:-mt-12">Seu histórico de prática permanece privado, mas só o conteúdo do edital carregado pode entrar no treino.</p></main>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {overviewQuery.isLoading ? <div className="mb-5 flex items-center gap-2 text-sm text-content-muted" role="status"><LoaderCircle className="size-4 animate-spin text-primary" /> Preparando seu treino…</div> : null}
      <PracticeComposer composer={composer} subjects={subjectsQuery.data ?? []} isLoading={overviewQuery.isLoading} isStarting={buildSession.isPending} isGeneratingMaterial={generationState === "preparing"} onStart={launchComposer} onRequestGeneration={() => { void generate(); }} />
      {launchError ? <div role="alert" className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{launchError}</div> : null}

      <PracticeGenerationDialog open={Boolean(generationState)} state={generationState ?? "preparing"} topic={generationDisplayTopic} onOpenChange={(open) => { if (!open && generationState !== "preparing") { setGenerationState(null); setGenerationTopicId(null); setGenerationInput(null); setGenerationSubmitted(false); setGenerationTopicSnapshot(null); } }} onRetry={() => { void generate(); }} />
      <PracticeSessionDialog mode={session?.mode ?? null} session={session?.session ?? null} isPreparingSession={session?.isPreparing} unavailableReason={session?.unavailableReason} unavailableScope={session?.unavailableTopicId ? "topic" : "subject"} preparingAnotherSession={buildSession.isPending} onOpenChange={(open) => { if (!open) { launchRequestRef.current += 1; setSession(null); void overviewQuery.refetch(); focusComposer(); } }} onReveal={(sessionId, itemId) => revealItem.mutateAsync({ sessionId, itemId })} onSubmitAttempt={async (input) => { const result = await submitAttempt.mutateAsync(input); void overviewQuery.refetch(); return result; }} onRate={(input) => rateItem.mutateAsync(input)} onStartAnother={(prefill) => { const topic = session?.session?.topicId ? overviewQuery.data?.materialTopics.find((item) => item.id === session.session?.topicId) ?? overviewQuery.data?.recommendedTopic : null; composer.applySessionPrefill({ ...prefill, subjectId: topic?.subjectId, topicId: topic?.id }); setSession(null); focusComposer(); }} onGenerateMaterial={session?.unavailableReason !== "no_due_flashcard" && composer.canGenerate ? () => { void generate(); } : session?.unavailableSubjectId ? () => { setSession(null); composer.focusTopicSelection(); focusComposer(); } : undefined} isGeneratingMaterial={generationState === "preparing"} generateMaterialLabel={composer.selectedFormatIsExhausted ? "Gerar mais material" : "Gerar material para treinar"} />
    </main>
  );
};

export default PracticeHome;
