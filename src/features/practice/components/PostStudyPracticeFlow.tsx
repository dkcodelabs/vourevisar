import { useMemo, useState } from "react";
import { ArrowRight, Brain, Layers3, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PracticeSessionDialog,
  type PracticeMode as DialogPracticeMode,
} from "@/features/practice/components/PracticeSessionDialog";
import { usePracticeOverview } from "@/features/practice/hooks/usePracticeOverview";
import { usePracticeSessionActions } from "@/features/practice/hooks/usePracticeSessionActions";
import type {
  PracticeFormat,
  PracticeSession,
} from "@/features/practice/services/practiceService";

export type PostStudyPracticeContext = {
  topicId: string;
  topicName: string;
  subjectName: string;
  contact: "first_contact" | "review";
  difficulty: number;
};

type PostStudyPracticeFlowProps = {
  userId?: string;
  context: PostStudyPracticeContext | null;
  onDismiss: () => void;
};

type SessionState = {
  mode: DialogPracticeMode;
  session: PracticeSession | null;
};

const formatCopy: Record<PracticeFormat, string> = {
  questions: "3 questões",
  flashcards: "3 flashcards",
  mixed: "treino misto",
};

export const PostStudyPracticeFlow = ({
  userId,
  context,
  onDismiss,
}: PostStudyPracticeFlowProps) => {
  const overview = usePracticeOverview(userId, context?.topicId);
  const { buildSession, generatePackage, revealItem, submitAttempt, rateItem } =
    usePracticeSessionActions();
  const [session, setSession] = useState<SessionState | null>(null);
  const [confirmGeneration, setConfirmGeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasActivePracticeScope = overview.data?.scope.status === "active";

  const available = useMemo(() => {
    const topic = overview.data?.selectedTopic;
    const questions = topic?.questionCount ?? 0;
    const flashcards = topic?.flashcardCount ?? 0;
    const primary: PracticeFormat = context?.contact === "first_contact"
      ? "flashcards"
      : context?.difficulty === 3
        ? "questions"
        : "flashcards";
    const alternative: PracticeFormat = primary === "flashcards" ? "questions" : "flashcards";
    const has = (format: PracticeFormat) =>
      format === "questions" ? questions > 0 : flashcards > 0;

    return {
      primary: has(primary) ? primary : has(alternative) ? alternative : null,
      alternative: has(primary) && has(alternative) ? alternative : null,
      hasMaterial: questions > 0 || flashcards > 0,
    };
  }, [context?.contact, context?.difficulty, overview.data?.selectedTopic]);

  if (!context) return null;

  const start = async (format: PracticeFormat) => {
    setError(null);
    try {
      const result = await buildSession.mutateAsync({
        mode: format === "questions" ? "questions" : "quick",
        format,
        origin: "post_study",
        topicId: context.topicId,
        quantity: 3,
        idempotencyKey: crypto.randomUUID(),
      });
      if (result.status === "ready") {
        setSession({
          mode: format === "questions" ? "questions" : "flashcards",
          session: result.session,
        });
        return;
      }
      setError("Esse material não está disponível agora. Você pode preparar um lote privado, se quiser.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível montar o treino agora.");
    }
  };

  const generate = async () => {
    setError(null);
    try {
      await generatePackage.mutateAsync({
        topicId: context.topicId,
        trigger: "explicit",
        idempotencyKey: crypto.randomUUID(),
      });
      setConfirmGeneration(false);
      await overview.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar o material agora.");
    }
  };

  const primaryCopy = context.contact === "first_contact"
    ? "Transforme o primeiro contato em recuperação ativa."
    : context.difficulty === 3
      ? "Você marcou dificuldade alta. Teste a aplicação enquanto o assunto está recente."
      : "Faça uma recuperação curta enquanto o assunto ainda está recente.";

  return <>
    <Dialog open={!session} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] gap-0 rounded-2xl border-border bg-card p-0 shadow-xl sm:max-w-[540px]" hideCloseButton>
        <DialogHeader className="border-b border-border px-5 py-4 text-left sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4" /></div>
            <div className="min-w-0"><p className="text-xs font-semibold text-content-muted">Estudo registrado</p><DialogTitle className="mt-0.5 text-base">Fixar antes de seguir</DialogTitle></div>
          </div>
        </DialogHeader>
        <div className="px-5 py-5 sm:px-6">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><Layers3 className="size-3.5" /> {context.subjectName}</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">{context.topicName}</h2>
          <DialogDescription className="mt-2 text-sm leading-relaxed">{primaryCopy}</DialogDescription>
          {error ? <p role="alert" className="mt-4 text-xs text-destructive">{error}</p> : null}
          {!hasActivePracticeScope ? <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4"><p className="text-sm font-semibold">Este tópico não está no ciclo ativo</p><p className="mt-1 text-xs leading-relaxed text-content-muted">Carregue um edital no Ciclo de Estudos antes de criar ou praticar material.</p></div> : available.primary ? <div className="mt-5 rounded-xl border border-primary/15 bg-primary/[0.04] p-4"><p className="text-sm font-semibold">Sugestão: {formatCopy[available.primary]}</p><p className="mt-1 text-xs leading-relaxed text-content-muted">O conteúdo já existe. Abrir, responder e revelar não chama a IA.</p></div> : <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4"><p className="text-sm font-semibold">Ainda não há material pronto</p><p className="mt-1 text-xs leading-relaxed text-content-muted">Se quiser, prepare um lote privado para este tópico. Isso chama a IA uma única vez.</p></div>}
          <DialogFooter className="mt-5 gap-2 sm:justify-between">
            <Button type="button" variant="quiet" className="h-9 text-xs" onClick={onDismiss}>Agora não</Button>
            {hasActivePracticeScope && <div className="flex flex-wrap justify-end gap-2">
              {available.alternative ? <Button type="button" variant="outline" className="h-9 text-xs" disabled={buildSession.isPending} onClick={() => void start(available.alternative!)}>{formatCopy[available.alternative]}</Button> : null}
              {available.primary ? <Button type="button" className="h-9 text-xs" disabled={buildSession.isPending} onClick={() => void start(available.primary)}>{buildSession.isPending ? "Montando…" : `Praticar ${formatCopy[available.primary]}`}<ArrowRight className="size-3.5" /></Button> : <Button type="button" className="h-9 text-xs" onClick={() => setConfirmGeneration(true)}><Brain className="size-3.5" /> Preparar com IA</Button>}
            </div>}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={confirmGeneration} onOpenChange={setConfirmGeneration}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Preparar prática privada?</AlertDialogTitle><AlertDialogDescription>A IA criará 4 flashcards e 6 questões para {context.topicName}. Depois disso, praticar usa o material salvo.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={generatePackage.isPending}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={generatePackage.isPending} onClick={() => void generate()}>{generatePackage.isPending ? "Preparando…" : "Gerar lote"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <PracticeSessionDialog mode={session?.mode ?? null} session={session?.session ?? null} onOpenChange={(open) => { if (!open) { setSession(null); onDismiss(); void overview.refetch(); } }} onReveal={(sessionId, itemId) => revealItem.mutateAsync({ sessionId, itemId })} onSubmitAttempt={async (input) => submitAttempt.mutateAsync(input)} onRate={(input) => rateItem.mutateAsync(input)} onStartAnother={onDismiss} />
  </>;
};
