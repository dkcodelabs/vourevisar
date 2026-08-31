import { CircleAlert, Layers3, ListChecks, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PracticeMaterialTopic } from "@/features/practice/services/practiceService";

export type PracticeGenerationState = "preparing" | "ready" | "failed";

type PracticeGenerationDialogProps = {
  open: boolean;
  state: PracticeGenerationState;
  topic: PracticeMaterialTopic | null;
  onOpenChange: (open: boolean) => void;
  onPracticeQuestions: () => void;
  onPracticeFlashcards: () => void;
  onChooseAnotherTopic: () => void;
  openingFormat?: "questions" | "flashcards" | null;
};

const countLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

export const PracticeGenerationDialog = ({
  open,
  state,
  topic,
  onOpenChange,
  onPracticeQuestions,
  onPracticeFlashcards,
  onChooseAnotherTopic,
  openingFormat = null,
}: PracticeGenerationDialogProps) => {
  const subjectName = topic?.subjectName ?? "Tópico selecionado";
  const topicName = topic?.name ?? "Aguardando os detalhes do tópico";
  const topicIdentity = (
    <div className="mt-4 border-l-2 border-primary/35 pl-3">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-content-muted">{subjectName}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{topicName}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] rounded-2xl sm:max-w-lg">
        {state === "preparing" ? (
          <>
            <DialogHeader className="text-left">
              <div className="mb-2 grid size-11 place-items-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
              </div>
              <DialogTitle>Preparando material</DialogTitle>
              {topicIdentity}
              <DialogDescription className="mt-4 leading-relaxed">
                O lote será salvo em Seu material. Você pode escolher como praticar agora ou voltar depois.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Decidir depois</Button>
            </div>
          </>
        ) : state === "failed" ? (
          <>
            <DialogHeader className="text-left">
              <div className="mb-2 grid size-11 place-items-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
                <CircleAlert aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle>Não foi possível concluir o lote</DialogTitle>
              {topicIdentity}
              <DialogDescription className="leading-relaxed">
                Nenhum material novo ficou disponível. Escolha o tópico novamente para revisar a solicitação antes de tentar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Decidir depois</Button>
              <Button variant="outline" onClick={onChooseAnotherTopic}>Escolher e tentar de novo</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-left">
              <div className="mb-2 grid size-11 place-items-center rounded-full border border-success/25 bg-success/10 text-success shadow-[0_0_0_6px_hsl(var(--success)/0.06)]">
                <Sparkles aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle>Material pronto para praticar</DialogTitle>
              {topicIdentity}
              <DialogDescription className="mt-4 leading-relaxed">Seu lote está salvo. Escolha um formato agora ou volte quando quiser.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Material criado">
              <p className="inline-flex items-center gap-2 text-content-muted"><ListChecks aria-hidden="true" className="size-4 text-foreground/70" /><span className="font-semibold tabular-nums text-foreground">{countLabel(topic?.questionCount ?? 0, "questão", "questões")}</span></p>
              <p className="inline-flex items-center gap-2 text-content-muted"><Layers3 aria-hidden="true" className="size-4 text-foreground/70" /><span className="font-semibold tabular-nums text-foreground">{countLabel(topic?.flashcardCount ?? 0, "flashcard", "flashcards")}</span></p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="h-11 w-full sm:w-auto" disabled={!topic?.questionCount || Boolean(openingFormat)} onClick={onPracticeQuestions}>
                <ListChecks className="size-4" /> {openingFormat === "questions" ? "Abrindo questões…" : "Resolver questões agora"}
              </Button>
              <Button variant="outline" className="h-11 w-full sm:w-auto" disabled={!topic?.flashcardCount || Boolean(openingFormat)} onClick={onPracticeFlashcards}>
                <Layers3 className="size-4" /> {openingFormat === "flashcards" ? "Abrindo flashcards…" : "Praticar flashcards"}
              </Button>
            </div>
            <div className="flex justify-end"><Button variant="ghost" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Decidir depois</Button></div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
