import { BookOpen, Clock3, ListChecks, RefreshCw, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CycleStatisticsContactType, CycleStatisticsSelectedDay } from '@/types/cycleStatistics';
import { formatStudyMinutes } from '@/utils/cycleStatistics';

type EvolutionDayDetailProps = {
  day: CycleStatisticsSelectedDay;
  onClear: () => void;
  onRetryContacts: () => void;
  isRetryingContacts: boolean;
};

const contactPresentation: Record<CycleStatisticsContactType, {
  label: string;
  icon: typeof BookOpen;
  className: string;
}> = {
  study: { label: 'Estudo', icon: BookOpen, className: 'bg-primary/10 text-primary' },
  review: { label: 'Revisão', icon: RefreshCw, className: 'bg-warning/10 text-warning' },
  questions: { label: 'Questões', icon: ListChecks, className: 'bg-success/10 text-success' },
};

export function EvolutionDayDetail({
  day,
  onClear,
  onRetryContacts,
  isRetryingContacts,
}: EvolutionDayDetailProps) {
  return (
    <section className="app-surface min-w-0 rounded-2xl p-4 sm:p-5" aria-labelledby="evolution-day-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="app-type-eyebrow text-primary">Dia selecionado</p>
          <h2 id="evolution-day-title" className="mt-1 app-type-section-title app-title-section">
            {day.label}
          </h2>
          <p className="mt-1 app-type-caption text-content-muted">
            O tempo vem apenas do cronômetro. Os contatos abaixo explicam o que aconteceu e não são somados ao total.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="w-fit shrink-0" onClick={onClear}>
          <X className="size-3.5" aria-hidden="true" />
          Voltar ao período
        </Button>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-xl border border-border/80 bg-background/35 p-4">
          <div className="flex items-center gap-2 text-content-muted">
            <Clock3 className="size-4 text-primary" aria-hidden="true" />
            <span className="app-type-caption">Tempo do cronômetro</span>
          </div>
          <strong className="mt-2 block text-2xl font-extrabold tracking-tight text-foreground">
            {formatStudyMinutes(day.sessionMinutes)}
          </strong>

          {day.subjectMinutes.length > 0 ? (
            <div className="mt-4 space-y-2 border-t app-hairline pt-3">
              {day.subjectMinutes.map(subject => (
                <div key={subject.subjectId} className="flex min-w-0 items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: subject.color ?? 'hsl(var(--primary))' }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{subject.subjectName}</span>
                  </span>
                  <strong className="shrink-0 tabular-nums">{formatStudyMinutes(subject.minutes)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 app-type-caption text-content-muted">Nenhuma sessão cronometrada neste dia.</p>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-border/80 bg-background/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="app-type-card-title text-foreground">Contatos registrados</h3>
            <span className="app-type-caption tabular-nums text-content-muted">
              {day.contacts.length} {day.contacts.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {day.contactsUnavailable ? (
            <div className="mt-3 flex min-h-28 flex-col items-center justify-center rounded-lg border border-warning/25 bg-warning/[0.055] px-4 text-center">
              <WifiOff className="size-5 text-warning" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-foreground">Contatos do dia indisponíveis</p>
              <p className="mt-1 app-type-caption text-content-muted">
                O tempo do cronômetro continua válido. Tente recarregar apenas o contexto deste dia.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={isRetryingContacts}
                onClick={onRetryContacts}
              >
                <RefreshCw className={cn('size-3.5', isRetryingContacts && 'animate-spin')} aria-hidden="true" />
                {isRetryingContacts ? 'Tentando novamente' : 'Tentar novamente'}
              </Button>
            </div>
          ) : day.contacts.length > 0 ? (
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {day.contacts.map(contact => {
                const presentation = contactPresentation[contact.type];
                const Icon = presentation.icon;
                return (
                  <div key={contact.id} className="flex min-w-0 items-start gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                    <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg', presentation.className)}>
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground" title={`${contact.subjectName} — ${contact.topicName}`}>
                        {contact.topicName}
                      </p>
                      <p className="mt-0.5 truncate app-type-caption text-content-muted">{contact.subjectName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block app-type-caption font-semibold text-foreground">{presentation.label}</span>
                      {contact.durationMinutes > 0 ? (
                        <span className="app-type-caption tabular-nums text-content-muted">
                          registro: {formatStudyMinutes(contact.durationMinutes)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border/80 px-4 text-center">
              <BookOpen className="size-5 text-content-muted" aria-hidden="true" />
              <p className="mt-2 text-xs font-semibold text-foreground">Nenhum contato registrado</p>
              <p className="mt-1 app-type-caption text-content-muted">O dia pode ter tempo cronometrado sem um registro de tópico associado.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
