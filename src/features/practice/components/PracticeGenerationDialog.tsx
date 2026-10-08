import { CircleAlert, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export type PracticeGenerationState = "preparing" | "failed";

export type PracticeGenerationTopic = {
  subjectName: string;
  name: string;
};

type PracticeGenerationDialogProps = {
  open: boolean;
  state: PracticeGenerationState;
  topic: PracticeGenerationTopic | null;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
};

export const PracticeGenerationDialog = ({
  open,
  state,
  topic,
  onOpenChange,
  onRetry,
}: PracticeGenerationDialogProps) => {
  const subjectName = topic?.subjectName ?? "Matéria selecionada";
  const topicName = topic?.name ?? "Tópico selecionado";
  const topicIdentity = (
    <div className="mt-5 rounded-xl border border-border bg-secondary/35 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-content-muted">{subjectName}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{topicName}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border-border/80 bg-modal/95 p-0 shadow-2xl shadow-black/25 backdrop-blur-2xl sm:max-w-xl"
        hideCloseButton={state === "preparing"}
        onEscapeKeyDown={(event) => {
          if (state === "preparing") event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (state === "preparing") event.preventDefault();
        }}
      >
        {state === "preparing" ? (
          <>
            <DialogHeader className="relative overflow-hidden px-6 pb-6 pt-7 text-left sm:px-8 sm:pb-7 sm:pt-8">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-primary/70" />
              <div className="grid size-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.8)]">
                <LoaderCircle aria-hidden="true" className="size-5 animate-spin" strokeWidth={2.25} />
              </div>
              <DialogTitle className="mt-5 text-xl tracking-tight">Seu material está sendo preparado</DialogTitle>
              {topicIdentity}
              <DialogDescription className="mt-5 max-w-md leading-relaxed">
                Estamos criando questões e flashcards privados. Quando terminar, você entra direto no treino.
              </DialogDescription>
              <div className="mt-6 h-1 overflow-hidden rounded-full bg-primary/10" aria-label="Geração em andamento" role="progressbar" aria-valuetext="Preparando material">
                <div className="h-full w-2/5 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
            </DialogHeader>
          </>
        ) : state === "failed" ? (
          <>
            <DialogHeader className="px-6 pb-2 pt-7 text-left sm:px-8 sm:pt-8">
              <div className="mb-2 grid size-11 place-items-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
                <CircleAlert aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle>Não foi possível concluir o lote</DialogTitle>
              {topicIdentity}
              <DialogDescription className="leading-relaxed">
                Nenhum material novo ficou disponível. Tente gerar o lote novamente para continuar neste tópico.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 px-6 pb-7 pt-4 sm:flex-row sm:justify-end sm:px-8 sm:pb-8">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Voltar ao treino</Button>
              <Button onClick={onRetry}>Tentar gerar novamente</Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
