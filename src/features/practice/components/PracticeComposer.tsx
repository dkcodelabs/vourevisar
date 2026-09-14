import { BookOpenCheck, CheckCircle2, Clock3, Layers3, ListChecks, Sparkles, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ActionAlert } from "@/components/ui/action-alert";
import { PracticeFormatCard } from "@/features/practice/components/PracticeFormatCard";
import type { PracticeComposerState } from "@/features/practice/hooks/usePracticeComposer";
import type { PracticeSubjectOption } from "@/features/practice/hooks/usePracticeTopicOptions";

type PracticeComposerProps = {
  composer: PracticeComposerState;
  subjects: PracticeSubjectOption[];
  isLoading?: boolean;
  isStarting?: boolean;
  onStart: () => void;
  onRequestGeneration: (topicId: string) => void;
};

const quantityOptions = [3, 5, 10];

const ComposerStepHeading = ({
  icon: Icon,
  title,
  description,
  tone = "primary",
}: {
  icon: typeof BookOpenCheck;
  title: string;
  description: string;
  tone?: "primary" | "violet" | "neutral";
}) => {
  const iconTone = tone === "violet"
    ? "bg-[hsl(var(--activity-selected)/0.12)] text-[hsl(var(--activity-selected))]"
    : tone === "neutral"
      ? "bg-card text-content-muted"
      : "bg-primary/10 text-primary";

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/35 px-4 py-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${iconTone}`} aria-hidden="true"><Icon className="size-4" /></span>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-title-section">{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-content-muted">{description}</p>
      </div>
    </div>
  );
};

export const PracticeComposer = ({
  composer,
  subjects,
  isLoading = false,
  isStarting = false,
  onStart,
  onRequestGeneration,
}: PracticeComposerProps) => {
  const subjectOptions = subjects.map((subject) => ({ value: subject.id, label: subject.name }));
  const topicOptions = composer.topics.map((topic) => ({ value: topic.id, label: topic.name }));
  const quantityChoices = quantityOptions.includes(composer.quantity)
    ? quantityOptions
    : [composer.quantity, ...quantityOptions].sort((left, right) => left - right);
  const isDueQueue = composer.dueCycleQueue && composer.recommendationActive;
  const focusDescription = isDueQueue
    ? "Todas as matérias · fila do ciclo"
    : composer.selectedTopicName
      ? `${composer.selectedTopicName}${composer.selectedSubjectName ? ` · ${composer.selectedSubjectName}` : ""}`
      : composer.selectedSubjectName;
  const actionLabel = composer.canGenerate
    ? "Gerar material deste tópico"
    : isDueQueue
      ? `Revisar ${composer.sessionQuantity} ${composer.sessionQuantity === 1 ? "flashcard" : "flashcards"}`
      : composer.format === "questions"
        ? `Iniciar ${composer.sessionQuantity} ${composer.sessionQuantity === 1 ? "questão" : "questões"}`
        : composer.format === "flashcards"
          ? `Praticar ${composer.sessionQuantity} ${composer.sessionQuantity === 1 ? "flashcard" : "flashcards"}`
          : `Iniciar treino misto com ${composer.sessionQuantity} itens`;
  const actionDisabled = isLoading || isStarting || (!composer.canStart && !composer.canGenerate);

  return (
    <section id="practice-composer" tabIndex={-1} aria-labelledby="practice-composer-title" className={isLoading ? "pointer-events-none opacity-60" : ""}>
      <div className="mb-6">
        <h1 id="practice-composer-title" className="text-2xl font-bold tracking-tight text-title-page sm:text-3xl">Treino</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-content-muted">Escolha onde e como praticar agora.</p>
      </div>

      {composer.recommendationActive && composer.recommendationReason ? (
        <ActionAlert
          className="mb-5"
          variant="warning"
          title={isDueQueue
            ? "Revisão recomendada"
            : <span className="text-base font-bold tracking-tight">Sugestão de reforço</span>}
          description={isDueQueue
            ? <span>Flashcards vencidos na fila do ciclo. Esta revisão atualiza a próxima data de cada cartão.</span>
            : <span className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-1"><strong className="text-right">Matéria:</strong><span>{composer.selectedSubjectName}</span><strong className="text-right">Tópico:</strong><em>{composer.selectedTopicName}</em><span className="col-span-2 mt-1 border-t border-warning/25 pt-2"><span className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2"><strong className="text-right">Motivo:</strong><span>{composer.recommendationReason}</span></span></span></span>}
          actionLabel="Montar treino livre"
          onAction={composer.clearRecommendation}
        />
      ) : null}

      {composer.recommendationAvailable ? (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-border bg-secondary/35 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-content-muted">Você está montando um treino livre.</p>
          <Button type="button" variant="ghost" className="h-9 px-2 text-xs" onClick={composer.restoreRecommendation}>Ver sugestão de reforço</Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_45px_-38px_rgba(15,23,42,0.32)]">
        <div className="p-5 sm:p-7">
          <ComposerStepHeading icon={BookOpenCheck} title="Onde quer treinar?" description="A matéria define seu foco. Escolha um tópico só se quiser aprofundar." />

          {isDueQueue ? (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/[0.06] px-4 py-3 text-sm text-foreground"><Layers3 className="size-4 text-warning" /><span><strong>Todas as matérias · fila do ciclo</strong><span className="mt-0.5 block text-xs text-content-muted">Esta revisão atualiza a próxima data de cada flashcard.</span></span></div>
          ) : (
            <div className="mt-5">
              <label htmlFor="practice-composer-subject" className="mb-2 block text-sm font-medium text-foreground">Matéria</label>
              <Combobox id="practice-composer-subject" options={subjectOptions} value={composer.subjectId} onValueChange={composer.chooseSubject} placeholder="Escolha a matéria" searchPlaceholder="Pesquisar matéria…" className="h-11 bg-control" />
              {composer.subjectId && !composer.topicPickerOpen ? <Button type="button" variant="ghost" className="mt-2 h-9 px-0 text-xs text-primary hover:bg-transparent hover:text-primary" onClick={composer.focusTopicSelection}>Focar em um tópico</Button> : null}
              {composer.topicPickerOpen ? <div className="mt-4 border-l border-border pl-4 sm:ml-2"><label htmlFor="practice-composer-topic" className="mb-2 block text-sm font-medium text-foreground">Tópico <span className="font-normal text-content-muted">(opcional)</span></label><Combobox id="practice-composer-topic" options={topicOptions} value={composer.topicId} onValueChange={composer.chooseTopic} placeholder={composer.topicsLoading ? "Carregando tópicos…" : "Escolha o tópico"} searchPlaceholder="Pesquisar tópico…" disabled={!composer.subjectId} className="h-11 bg-control" /><Button type="button" variant="ghost" className="mt-2 h-8 px-0 text-xs text-content-muted hover:bg-transparent" onClick={() => { composer.chooseTopic(""); composer.setTopicPickerOpen(false); }}>Usar toda a matéria</Button></div> : null}
            </div>
          )}

          <div className="mt-8">
            <ComposerStepHeading icon={Sparkles} tone="violet" title="Como quer treinar?" description="Escolha o método que faz sentido para este momento." />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <PracticeFormatCard format="questions" selected={composer.format === "questions"} questions={composer.material.questions} flashcards={composer.material.flashcards} dueFlashcards={composer.material.dueFlashcards} onSelect={composer.chooseFormat} />
              <PracticeFormatCard format="flashcards" selected={composer.format === "flashcards"} questions={composer.material.questions} flashcards={composer.material.flashcards} dueFlashcards={composer.material.dueFlashcards} onSelect={composer.chooseFormat} />
              <PracticeFormatCard format="mixed" selected={composer.format === "mixed"} questions={composer.material.questions} flashcards={composer.material.flashcards} dueFlashcards={composer.material.dueFlashcards} disabled={!composer.mixedIsAvailable} onSelect={composer.chooseFormat} />
            </div>
          </div>

          {!isDueQueue ? <div className="mt-7"><ComposerStepHeading icon={ListChecks} tone="neutral" title="Quantos itens?" description="Defina um ritmo rápido para esta sessão." /><div className="mt-3 flex flex-wrap gap-2" aria-label="Quantidade de itens">{quantityChoices.map((value) => <Button key={value} type="button" variant={composer.quantity === value ? "default" : "outline"} className="h-10 min-w-12 px-3 text-sm tabular-nums" onClick={() => composer.chooseQuantity(value)}>{value}</Button>)}</div></div> : null}

          <div className="mt-6 flex flex-wrap gap-2" aria-label="Material disponível">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"><ListChecks className="size-3.5" /> {composer.material.questions} {composer.material.questions === 1 ? "questão pronta" : "questões prontas"}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--activity-selected)/0.12)] px-3 py-1.5 text-xs font-medium text-[hsl(var(--activity-selected))]"><Layers3 className="size-3.5" /> {composer.material.flashcards} {composer.material.flashcards === 1 ? "flashcard pronto" : "flashcards prontos"}</span>
            {composer.material.dueFlashcards > 0 ? <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning"><Clock3 className="size-3.5" /> {composer.material.dueFlashcards} {composer.material.dueFlashcards === 1 ? "vencido hoje" : "vencidos hoje"}</span> : null}
          </div>
        </div>

        <div className="border-t border-border bg-secondary/35 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-7">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Pronto para iniciar</p>
            {composer.canStart ? <p className="mt-1 text-sm leading-relaxed text-content-muted">{isDueQueue ? `Você vai revisar ${composer.sessionQuantity} ${composer.sessionQuantity === 1 ? "flashcard" : "flashcards"} da fila do ciclo.` : `Você vai ${composer.format === "questions" ? "resolver" : composer.format === "flashcards" ? "praticar" : "combinar"} ${composer.sessionQuantity} ${composer.format === "questions" ? "questões" : composer.format === "flashcards" ? "flashcards" : "itens"}${focusDescription ? ` de ${focusDescription}` : ""}.${composer.sessionQuantity < composer.quantity ? ` Há ${composer.sessionQuantity} disponíveis agora.` : ""}`}</p> : composer.canGenerate ? <p className="mt-1 text-sm leading-relaxed text-content-muted">Ainda não há material neste tópico. A IA criará questões e flashcards privados para você.</p> : <p className="mt-1 text-sm leading-relaxed text-content-muted">{composer.needsTopicForGeneration ? "Escolha um tópico para gerar material novo." : composer.hasSelectedFocus ? "Não há itens disponíveis neste formato agora." : "Escolha uma matéria para montar sua sessão."}</p>}
            {composer.recommendationActive && composer.estimatedMinutes ? <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-content-muted"><Clock3 className="size-3.5" /> Cerca de {composer.estimatedMinutes} min</p> : null}
            {!isDueQueue && composer.subjectId && !composer.recommendationActive && composer.format !== "questions" ? <p className="mt-2 text-xs text-content-muted">Prática livre — não altera o agendamento de repetição espaçada.</p> : null}
          </div>
          <Button type="button" className="mt-4 h-11 w-full shrink-0 px-5 text-sm sm:mt-0 sm:w-auto" disabled={actionDisabled} onClick={() => composer.canGenerate && composer.topicId ? onRequestGeneration(composer.topicId) : onStart()}>{composer.canGenerate ? <WandSparkles className="size-4" /> : <Sparkles className="size-4" />}{isStarting ? "Montando sessão…" : actionLabel}</Button>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-content-muted"><CheckCircle2 className="size-3.5 text-success" /> Respostas, autoavaliação e feedback ficam no seu histórico privado.</p>
    </section>
  );
};
