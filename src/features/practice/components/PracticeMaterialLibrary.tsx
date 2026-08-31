import { Layers3, ListChecks, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PracticeMaterialTopic } from "@/features/practice/services/practiceService";

type PracticeMaterialLibraryProps = {
  topics: PracticeMaterialTopic[];
  onPracticeQuestions: (topic: PracticeMaterialTopic) => void;
  onPracticeFlashcards: (topic: PracticeMaterialTopic) => void;
  onReviewDueFlashcards: (topic: PracticeMaterialTopic) => void;
  excludeTopicId?: string;
};

const countLabel = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

export const PracticeMaterialLibrary = ({
  topics,
  onPracticeQuestions,
  onPracticeFlashcards,
  onReviewDueFlashcards,
  excludeTopicId,
}: PracticeMaterialLibraryProps) => {
  const visibleTopics = topics.filter((topic) => topic.id !== excludeTopicId);
  if (!visibleTopics.length) return null;

  return (
    <section aria-labelledby="practice-material-title" className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-content-muted">Seu material</p>
        <h2 id="practice-material-title" className="mt-1 text-lg font-semibold tracking-tight">Continue de onde parou</h2>
        <p className="mt-1 text-sm leading-relaxed text-content-muted">Itens privados preparados para os tópicos do seu ciclo atual.</p>
      </div>
      <div className="mt-5 divide-y divide-border">
        {visibleTopics.map((topic) => (
          <div key={topic.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-content-muted">{topic.subjectName}</p>
              <h3 className="mt-1 truncate text-sm font-semibold" title={topic.name}>{topic.name}</h3>
              {topic.isGenerating && !topic.hasReadyPackage ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary"><LoaderCircle aria-hidden="true" className="size-3 animate-spin" /> Preparando novo material</p>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-content-muted tabular-nums">
                  <span className="inline-flex items-center gap-1.5"><ListChecks aria-hidden="true" className="size-3.5 text-foreground/65" />{countLabel(topic.questionCount, "questão", "questões")}</span>
                  <span className="inline-flex items-center gap-1.5"><Layers3 aria-hidden="true" className="size-3.5 text-foreground/65" />{countLabel(topic.flashcardCount, "flashcard", "flashcards")}</span>
                  {topic.isGenerating && <span className="inline-flex items-center gap-1.5 text-primary"><LoaderCircle aria-hidden="true" className="size-3 animate-spin" />Preparando novo lote</span>}
                </div>
              )}
            </div>
            {topic.hasReadyPackage && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {topic.questionCount > 0 && <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => onPracticeQuestions(topic)}><ListChecks className="size-3.5" /> Questões</Button>}
                {topic.dueFlashcardCount > 0 ? (
                  <Button variant="outline" className="h-9 border-warning/35 bg-warning/[0.06] px-3 text-xs text-warning hover:bg-warning/[0.12] hover:text-warning" onClick={() => onReviewDueFlashcards(topic)}><Layers3 className="size-3.5" /> Revisar {countLabel(topic.dueFlashcardCount, "flashcard", "flashcards")}</Button>
                ) : topic.flashcardCount > 0 ? (
                  <Button variant="outline" className="h-9 px-3 text-xs" onClick={() => onPracticeFlashcards(topic)}><Layers3 className="size-3.5" /> Flashcards</Button>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
