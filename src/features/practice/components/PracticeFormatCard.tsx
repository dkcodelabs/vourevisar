import { Layers3, ListChecks, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PracticeFormat } from "@/features/practice/services/practiceService";

type PracticeFormatCardProps = {
  format: PracticeFormat;
  selected: boolean;
  questions: number;
  flashcards: number;
  dueFlashcards: number;
  disabled?: boolean;
  onSelect: (format: PracticeFormat) => void;
};

const formatContent = {
  questions: {
    title: "Questões",
    detail: "Resolva e confira sua aplicação.",
    Icon: ListChecks,
  },
  flashcards: {
    title: "Flashcards",
    detail: "Recupere a resposta antes de revelar.",
    Icon: Layers3,
  },
  mixed: {
    title: "Misto",
    detail: "Intercale questões e recuperação.",
    Icon: Sparkles,
  },
} as const;

const QuestionPreview = () => (
  <div aria-hidden="true" className="relative h-20 overflow-hidden rounded-xl border border-primary/15 bg-primary/[0.055] p-3">
    <span className="block h-1.5 w-4/5 rounded-full bg-primary/45" />
    <span className="mt-2 block h-1.5 w-3/5 rounded-full bg-primary/20" />
    <div className="mt-3 flex gap-1.5">
      {["A", "B", "C"].map((letter, index) => <span key={letter} className={cn("grid size-5 place-items-center rounded-md text-[10px] font-bold", index === 1 ? "bg-primary text-primary-foreground" : "bg-card text-primary")}>{letter}</span>)}
    </div>
  </div>
);

const FlashcardPreview = () => (
  <div aria-hidden="true" className="relative h-20 overflow-hidden rounded-xl bg-[linear-gradient(140deg,hsl(var(--activity-selected)/0.18),hsl(var(--activity-selected)/0.045))]">
    <span className="absolute right-3 top-3 h-12 w-20 rotate-[8deg] rounded-lg border border-[hsl(var(--activity-selected)/0.22)] bg-card/65" />
    <span className="absolute left-4 top-4 flex h-12 w-20 -rotate-[5deg] items-center justify-center rounded-lg border border-[hsl(var(--activity-selected)/0.35)] bg-card text-xs font-semibold text-[hsl(var(--activity-selected))] shadow-sm">Lembre</span>
  </div>
);

const MixedPreview = () => (
  <div aria-hidden="true" className="relative h-20 overflow-hidden rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary)/0.11),hsl(var(--activity-selected)/0.12))]">
    <span className="absolute bottom-3 left-3 h-9 w-14 rounded-lg border border-primary/25 bg-card p-2"><i className="block h-1 w-full rounded-full bg-primary/50" /><i className="mt-1 block h-1 w-2/3 rounded-full bg-primary/25" /></span>
    <span className="absolute right-4 top-3 flex h-11 w-16 items-center justify-center rounded-lg border border-[hsl(var(--activity-selected)/0.3)] bg-card text-[10px] font-semibold text-[hsl(var(--activity-selected))]">Revele</span>
  </div>
);

const Preview = ({ format }: Pick<PracticeFormatCardProps, "format">) => format === "questions"
  ? <QuestionPreview />
  : format === "flashcards"
    ? <FlashcardPreview />
    : <MixedPreview />;

export const PracticeFormatCard = ({
  format,
  selected,
  questions,
  flashcards,
  dueFlashcards,
  disabled = false,
  onSelect,
}: PracticeFormatCardProps) => {
  const { title, detail, Icon } = formatContent[format];
  const availability = format === "questions"
    ? `${questions} ${questions === 1 ? "questão pronta" : "questões prontas"}`
    : format === "flashcards"
      ? `${flashcards} ${flashcards === 1 ? "flashcard pronto" : "flashcards prontos"}`
      : `${questions + flashcards} itens prontos`;

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect(format)}
      className={cn(
        "group relative flex min-h-[220px] flex-col rounded-2xl border bg-card p-3 text-left shadow-sm transition-[transform,border-color,box-shadow,background-color] duration-200 motion-reduce:transition-none sm:p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-55",
        "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_28px_-22px_hsl(var(--primary)/0.55)] active:translate-y-0",
        selected ? "border-primary bg-primary/[0.035] shadow-[0_0_0_1px_hsl(var(--primary)/0.22),0_16px_32px_-26px_hsl(var(--primary)/0.65)]" : "border-border",
      )}
    >
      <Preview format={format} />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground"><Icon className="size-4" /></span>
          <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-content-muted">{detail}</p>
        </div>
        {selected ? <span className="mt-1 size-2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]" aria-label="Formato selecionado" /> : null}
      </div>
      <div className="mt-auto pt-4 text-xs font-medium text-content-muted">
        {disabled && format === "mixed" ? "Escolha um foco com questões e flashcards" : format === "flashcards" && dueFlashcards > 0 ? <span className="text-warning">{dueFlashcards} {dueFlashcards === 1 ? "vencido hoje" : "vencidos hoje"}</span> : availability}
      </div>
    </button>
  );
};
