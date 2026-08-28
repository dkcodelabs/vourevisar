import { useState } from "react";
import { ArrowRight, CheckCircle2, Layers3, ListChecks, Play, Sparkles, WandSparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { StudyEmptyState } from "@/components/study/StudyEmptyState";
import { PracticeBuilderDialog } from "@/features/practice/components/PracticeBuilderDialog";
import { PracticeSessionDialog, type PracticeMode as DialogPracticeMode } from "@/features/practice/components/PracticeSessionDialog";
import { usePracticeSessionActions } from "@/features/practice/hooks/usePracticeSessionActions";
import { usePracticeOverview } from "@/features/practice/hooks/usePracticeOverview";
import { usePracticeSubjects } from "@/features/practice/hooks/usePracticeTopicOptions";
import type { BuildPracticeSessionInput, BuildPracticeSessionResult, PracticeFormat, PracticeSession } from "@/features/practice/services/practiceService";

type SessionState = {
  mode: DialogPracticeMode;
  session: PracticeSession | null;
  unavailableReason?: Extract<BuildPracticeSessionResult, { status: "needs_material" }>["reason"];
};

const dialogModeFor = (format: PracticeFormat): DialogPracticeMode =>
  format === "flashcards" ? "flashcards" : format === "mixed" ? "mixed" : "questions";

const reasonCopy = (reason: string) => {
  if (reason === "overdue_review") return "Revisão atrasada";
  if (reason === "review_due_today") return "Revisão prevista para hoje";
  if (reason === "recent_failure") return "Falha recente para reforçar";
  if (reason === "recorded_difficulty") return "Dificuldade registrada";
  return "Tópico pronto para praticar";
};

const PracticeHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionState | null>(null);
  const [builderMode, setBuilderMode] = useState<"manual" | "deepening" | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const overviewQuery = usePracticeOverview(user?.id);
  const subjectsQuery = usePracticeSubjects(user?.id, overviewQuery.data?.scope.subjectIds);
  const { buildSession, generatePackage, revealItem, submitAttempt, rateItem } = usePracticeSessionActions();
  const recommendation = overviewQuery.data?.dailyRecommendation;

  const launch = async (input: BuildPracticeSessionInput, format: PracticeFormat) => {
    setLaunchError(null);
    try {
      const result = await buildSession.mutateAsync(input);
      if (result.status === "ready") {
        setBuilderMode(null);
        setSession({ mode: dialogModeFor(format), session: result.session });
      } else {
        setSession({ mode: dialogModeFor(format), session: null, unavailableReason: result.reason });
      }
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : "Não foi possível montar o treino.");
    }
  };

  const launchDaily = () => {
    if (!recommendation || recommendation.kind === "clear") return;
    const isFlashcards = recommendation.kind === "flashcards_due";
    void launch({
      mode: isFlashcards ? "flashcards_due" : "questions",
      ...(recommendation.topic?.id ? { topicId: recommendation.topic.id } : {}),
      format: isFlashcards ? "flashcards" : "questions",
      origin: "daily_recommendation",
      quantity: isFlashcards ? Math.min(recommendation.count, 6) : Math.min(recommendation.count, 3),
      idempotencyKey: crypto.randomUUID(),
    }, isFlashcards ? "flashcards" : "questions");
  };

  const generate = async (topicId: string) => {
    setLaunchError(null);
    try {
      await generatePackage.mutateAsync({ topicId, idempotencyKey: crypto.randomUUID(), trigger: "explicit" });
      setBuilderMode(null);
      await overviewQuery.refetch();
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : "Não foi possível gerar o material agora.");
    }
  };

  const isLoading = overviewQuery.isLoading;
  const isClear = !isLoading && (!recommendation || recommendation.kind === "clear");
  const isFlashcards = recommendation?.kind === "flashcards_due";
  const scopeStatus = overviewQuery.data?.scope.status;

  if (!isLoading && (scopeStatus === "no_edital" || scopeStatus === "no_active_edital")) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <StudyEmptyState
          kind={scopeStatus === "no_edital" ? "no-edital" : "no-cycle"}
          variant="center"
          onAction={() => navigate("/meus-editais")}
        />
        <p className="mx-auto -mt-14 max-w-xl px-4 text-center text-sm leading-relaxed text-content-muted sm:-mt-12">
          Seu histórico de prática permanece privado, mas só o conteúdo do edital carregado pode entrar na recomendação e no treino livre.
        </p>
      </main>
    );
  }
  const title = isLoading
    ? "Lendo sua prática"
    : isClear
      ? "Sua prática está em dia"
      : isFlashcards
        ? `Revisar ${recommendation.count} ${recommendation.count === 1 ? "flashcard vencido" : "flashcards vencidos"}`
        : recommendation?.topic?.name ?? "Praticar agora";
  const description = isLoading
    ? "Estamos organizando a próxima ação com base no seu histórico."
    : isClear
      ? "Você não tem uma pendência de prática agora. Escolha um treino livre ou aprofunde um tópico quando quiser."
      : isFlashcards
        ? "Recupere os cartões que chegaram à data de revisão; esta sessão atualiza a agenda individual deles."
        : "Uma sessão curta agora transforma o sinal do seu estudo em recuperação ativa.";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section aria-labelledby="daily-practice-title" className="rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/[0.10] via-card to-violet-500/[0.08] p-5 shadow-[0_18px_48px_-34px_hsl(var(--primary)/0.55)] sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary"><Sparkles className="size-4" /> Agora para você</p>
            {!isClear && recommendation?.topic && <p className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><Layers3 className="size-3.5" /> {recommendation.topic.subjectName}</p>}
            <h1 id="daily-practice-title" className="mt-2 max-w-2xl text-balance text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-content-muted">{description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {isClear ? <>
                <Button className="h-10 px-4 text-xs" onClick={() => setBuilderMode("manual")}><ListChecks className="size-3.5" /> Montar treino</Button>
                <Button variant="outline" className="h-10 px-4 text-xs" onClick={() => setBuilderMode("deepening")}><WandSparkles className="size-3.5" /> Aprofundar com IA</Button>
              </> : <Button className="h-10 px-4 text-xs" disabled={isLoading || buildSession.isPending} onClick={launchDaily}><Play className="size-3.5" /> {buildSession.isPending ? "Montando sessão…" : "Começar agora"}</Button>}
            </div>
          </div>
          <aside className="rounded-2xl border border-primary/15 bg-card/75 p-5 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-content-muted">{isClear ? "Estado atual" : "Por que agora"}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-full border-4 border-primary/20 bg-primary/10 text-base font-bold text-primary">{isClear ? "✓" : recommendation?.count ?? "…"}</div>
              <div><p className="text-sm font-semibold">{isClear ? "Sem pendências" : reasonCopy(String(recommendation?.reason))}</p><p className="mt-1 text-xs text-content-muted">{isFlashcards ? `${recommendation?.topicCount ?? 0} ${recommendation?.topicCount === 1 ? "tópico" : "tópicos"} envolvidos` : recommendation?.topic ? recommendation.topic.subjectName : "Escolha seu próximo treino"}</p></div>
            </div>
            <div className="mt-5 border-t border-border pt-4 text-sm text-content-muted"><div className="flex justify-between"><span>Duração</span><strong className="text-foreground">{isClear ? "—" : `~${recommendation?.estimatedMinutes ?? 2} min`}</strong></div><div className="mt-2 flex justify-between"><span>Formato</span><strong className="text-foreground">{isFlashcards ? "Flashcards" : isClear ? "Livre" : "Questões"}</strong></div></div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="free-training-title" className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary"><ListChecks className="size-4" /> Treino livre</p><h2 id="free-training-title" className="mt-2 text-lg font-semibold tracking-tight">Pratique do seu jeito</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-content-muted">Reforce falhas, revise pendências ou escolha matéria e tópico. Isso não muda a recomendação do dia.</p></div>
          <Button variant="outline" className="h-10 shrink-0 px-4 text-xs" onClick={() => setBuilderMode("manual")}><ListChecks className="size-3.5" /> Montar treino <ArrowRight className="size-3.5" /></Button>
        </div>
      </section>

      {launchError && <div role="alert" className="mt-4 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{launchError}</div>}
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-content-muted"><CheckCircle2 className="size-4 text-success" /> Respostas, autoavaliação e feedback ficam no seu histórico privado.</div>

      <PracticeBuilderDialog open={Boolean(builderMode)} mode={builderMode ?? "manual"} userId={user?.id} subjects={subjectsQuery.data ?? []} isStarting={buildSession.isPending} isGenerating={generatePackage.isPending} onOpenChange={(open) => !open && setBuilderMode(null)} onStart={(input) => void launch({ ...input, origin: "manual", idempotencyKey: crypto.randomUUID() }, input.format)} onGenerate={(topicId) => void generate(topicId)} />
      <PracticeSessionDialog mode={session?.mode ?? null} session={session?.session ?? null} unavailableReason={session?.unavailableReason} preparingAnotherSession={buildSession.isPending} onOpenChange={(open) => { if (!open) { setSession(null); void overviewQuery.refetch(); } }} onReveal={(sessionId, itemId) => revealItem.mutateAsync({ sessionId, itemId })} onSubmitAttempt={async (input) => { const result = await submitAttempt.mutateAsync(input); void overviewQuery.refetch(); return result; }} onRate={(input) => rateItem.mutateAsync(input)} onStartAnother={() => setBuilderMode("manual")} />
    </main>
  );
};

export default PracticeHome;
