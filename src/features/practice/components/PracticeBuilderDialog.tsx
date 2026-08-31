import { useEffect, useMemo, useState } from "react";
import { BookOpen, Layers3, ListChecks, Sparkles, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  PracticeFormat,
  PracticeMode,
} from "@/features/practice/services/practiceService";
import type {
  PracticeSubjectOption,
} from "@/features/practice/hooks/usePracticeTopicOptions";
import { usePracticeTopics } from "@/features/practice/hooks/usePracticeTopicOptions";

type BuilderGoal = "reinforce" | "subject" | "topic";

type PracticeBuilderDialogProps = {
  open: boolean;
  mode: "manual" | "deepening";
  userId?: string;
  subjects: PracticeSubjectOption[];
  isStarting?: boolean;
  isGenerating?: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (input: {
    mode: PracticeMode;
    format: PracticeFormat;
    quantity: number;
    topicId?: string;
    subjectId?: string;
  }) => void;
  onGenerate: (topicId: string) => void;
  onBackToManual?: () => void;
  initialGoal?: BuilderGoal;
  initialSubjectId?: string;
  initialTopicId?: string;
  initialSubjectName?: string;
  initialTopicName?: string;
  initialFormat?: PracticeFormat;
};

const goals: Array<{ value: BuilderGoal; label: string; detail: string }> = [
  { value: "subject", label: "Por matéria", detail: "Pratique itens de uma matéria escolhida." },
  { value: "topic", label: "Por tópico", detail: "Foque um assunto específico." },
];

const formatOptions: Array<{ value: PracticeFormat; label: string; icon: typeof ListChecks }> = [
  { value: "questions", label: "Questões", icon: ListChecks },
  { value: "flashcards", label: "Flashcards", icon: Layers3 },
  { value: "mixed", label: "Misto", icon: Sparkles },
];

export const PracticeBuilderDialog = ({
  open,
  mode,
  userId,
  subjects,
  isStarting = false,
  isGenerating = false,
  onOpenChange,
  onStart,
  onGenerate,
  onBackToManual,
  initialGoal = "topic",
  initialSubjectId = "",
  initialTopicId = "",
  initialSubjectName = "",
  initialTopicName = "",
  initialFormat = "questions",
}: PracticeBuilderDialogProps) => {
  const [goal, setGoal] = useState<BuilderGoal>(initialGoal);
  const [format, setFormat] = useState<PracticeFormat>("questions");
  const [quantity, setQuantity] = useState(3);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [confirmGeneration, setConfirmGeneration] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGoal(initialGoal);
    setFormat(initialFormat);
    setQuantity(3);
    setSubjectId(initialSubjectId);
    setTopicId(initialTopicId);
  }, [initialFormat, initialGoal, initialSubjectId, initialTopicId, mode, open]);

  const subjectOptions = useMemo(
    () => subjects.map((subject) => ({ value: subject.id, label: subject.name })),
    [subjects],
  );
  const topicsQuery = usePracticeTopics(userId, subjectId || undefined);
  const topicOptions = useMemo(
    () => (topicsQuery.data ?? []).map((topic) => ({ value: topic.id, label: topic.name })),
    [topicsQuery.data],
  );
  const needsSubject = goal === "subject" || goal === "topic";
  const needsTopic = goal === "topic";
  const canStart = !needsSubject || (needsTopic ? Boolean(topicId) : Boolean(subjectId));
  const isDeepening = mode === "deepening";

  const start = () => {
    const selectedMode: PracticeMode = format === "questions" ? "questions" : "quick";
    onStart({
      mode: selectedMode,
      format,
      quantity,
      ...(goal === "topic" || (goal === "reinforce" && initialTopicId)
        ? { topicId: goal === "topic" ? topicId : initialTopicId }
        : goal === "subject"
          ? { subjectId }
          : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {isDeepening ? "Gerar questões e flashcards com IA" : "Praticar material disponível"}
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            {isDeepening
              ? "Escolha um tópico para gerar questões e flashcards privados. A geração só acontece após sua confirmação."
              : "Escolha uma matéria ou tópico para praticar questões e flashcards já disponíveis. Falhas e pendências aparecem como recomendação quando existirem."}
          </DialogDescription>
        </DialogHeader>

        {isDeepening ? (
          <div className="space-y-3">
            <label htmlFor="deepening-subject" className="block text-sm font-medium">Matéria</label>
            <Combobox
              id="deepening-subject"
              options={subjectOptions}
              value={subjectId}
              onValueChange={(value) => { setSubjectId(value); setTopicId(""); }}
              placeholder="Escolha a matéria"
              searchPlaceholder="Pesquisar matéria…"
              className="h-11"
            />
            <label htmlFor="deepening-topic" className="block text-sm font-medium">Tópico</label>
            <Combobox
              id="deepening-topic"
              options={topicOptions}
              value={topicId}
              onValueChange={setTopicId}
              placeholder={topicsQuery.isLoading ? "Carregando tópicos…" : "Escolha o tópico"}
              searchPlaceholder="Pesquisar tópico…"
              disabled={!subjectId}
              className="h-11"
            />
            <Button className="mt-3 h-11 w-full" disabled={!topicId || isGenerating} onClick={() => setConfirmGeneration(true)}>
              <WandSparkles className="size-4" /> {isGenerating ? "Gerando questões e flashcards…" : "Gerar questões e flashcards"}
            </Button>
            {onBackToManual ? <Button type="button" variant="ghost" className="h-10 w-full text-xs" onClick={onBackToManual}>Voltar para material disponível</Button> : null}
          </div>
        ) : (
          <div className="space-y-6">
            <fieldset>
              <legend className="text-sm font-medium">O que você quer praticar?</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {goals.map((option) => (
                  <button key={option.value} type="button" onClick={() => setGoal(option.value)} className={`rounded-xl border p-3 text-left transition-colors ${goal === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}>
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-content-muted">{option.detail}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {initialTopicId && initialTopicName ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-primary">Foco deste reforço</span>
                <span className="mt-1 block leading-relaxed">{initialSubjectName || "Matéria selecionada"}</span>
                <span className="mt-0.5 block leading-relaxed text-content-muted">{initialTopicName}</span>
              </div>
            ) : null}

            {needsSubject && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="practice-builder-subject" className="mb-1.5 block text-sm font-medium">Matéria</label>
                  <Combobox id="practice-builder-subject" options={subjectOptions} value={subjectId} onValueChange={(value) => { setSubjectId(value); setTopicId(""); }} placeholder="Escolha a matéria" searchPlaceholder="Pesquisar matéria…" className="h-11" />
                </div>
                {needsTopic && <div>
                  <label htmlFor="practice-builder-topic" className="mb-1.5 block text-sm font-medium">Tópico</label>
                  <Combobox id="practice-builder-topic" options={topicOptions} value={topicId} onValueChange={setTopicId} placeholder={topicsQuery.isLoading ? "Carregando tópicos…" : "Escolha o tópico"} searchPlaceholder="Pesquisar tópico…" disabled={!subjectId} className="h-11" />
                </div>}
              </div>
            )}

            <fieldset>
              <legend className="text-sm font-medium">Formato</legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {formatOptions.map((option) => {
                  const Icon = option.icon;
                  return <Button key={option.value} type="button" variant={format === option.value ? "default" : "outline"} className="h-10 text-xs" onClick={() => setFormat(option.value)}><Icon className="size-3.5" />{option.label}</Button>;
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium">Tamanho</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {[3, 5, 10].map((value) => <Button key={value} type="button" size="sm" variant={quantity === value ? "default" : "outline"} onClick={() => setQuantity(value)}>{value} itens</Button>)}
              </div>
              <p className="mt-2 text-xs text-content-muted">A disponibilidade real será confirmada antes de a sessão abrir.</p>
            </fieldset>

            <Button className="h-11 w-full" disabled={!canStart || isStarting} onClick={start}>
              <BookOpen className="size-4" /> {isStarting ? "Montando sessão…" : "Começar treino"}
            </Button>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={confirmGeneration} onOpenChange={setConfirmGeneration}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar um lote privado deste tópico?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação chama a IA uma vez para criar 4 flashcards e 6 questões. Depois, praticar e revelar respostas só usam o material salvo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isGenerating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isGenerating} onClick={() => topicId && onGenerate(topicId)}>Gerar lote</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
