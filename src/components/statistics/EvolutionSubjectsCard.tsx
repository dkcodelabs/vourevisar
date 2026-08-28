import { ArrowUpRight, BookOpenCheck, Clock3, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CycleStatisticsSubject } from '@/types/cycleStatistics';
import { formatStudyMinutes } from '@/utils/cycleStatistics';

type EvolutionSubjectsCardProps = {
  subjects: CycleStatisticsSubject[];
  onOpenSubject: (subjectId: string) => void;
};

export function EvolutionSubjectsCard({ subjects, onOpenSubject }: EvolutionSubjectsCardProps) {
  return (
    <section className="app-surface overflow-hidden rounded-2xl" aria-labelledby="evolution-subjects-title">
      <div className="flex items-start justify-between gap-3 border-b app-hairline px-4 py-3.5 sm:px-5">
        <div>
          <p className="app-type-eyebrow text-primary">Matérias</p>
          <h2 id="evolution-subjects-title" className="mt-1 app-type-section-title app-title-section">
            Onde o esforço está virando avanço
          </h2>
        </div>
        <span className="app-type-caption text-content-muted">{subjects.length} no ciclo</span>
      </div>

      <div className="divide-y divide-border/60">
        {subjects.map(subject => (
          <article key={subject.id} className="px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full bg-primary"
                style={subject.color ? { backgroundColor: subject.color } : undefined}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="app-type-card-title text-foreground">{subject.name}</h3>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 app-type-caption text-content-muted">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3" aria-hidden="true" />
                        {formatStudyMinutes(subject.studyMinutes)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BookOpenCheck className="size-3" aria-hidden="true" />
                        {subject.startedTopics}/{subject.totalTopics} iniciados
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Scale className="size-3" aria-hidden="true" />
                        {subject.weightLabel}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="quiet"
                    size="sm"
                    className="h-8 w-full justify-center px-2 text-xs text-primary sm:w-auto"
                    onClick={() => onOpenSubject(subject.id)}
                    aria-label={`Abrir ${subject.name} no ciclo`}
                  >
                    Ver no ciclo
                    <ArrowUpRight aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-info"
                      style={{ width: `${subject.coveragePercentage}%` }}
                    />
                  </div>
                  <span className="w-9 text-right app-type-caption font-bold text-foreground">
                    {subject.coveragePercentage}%
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 app-type-caption">
                  <span className="text-success">{subject.completedTopics} consolidados</span>
                  {subject.overdueReviews > 0 ? (
                    <span className="text-destructive">{subject.overdueReviews} vencidas</span>
                  ) : (
                    <span className="text-content-muted">Revisões em dia</span>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
