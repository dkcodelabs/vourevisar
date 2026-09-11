import { useId } from 'react';
import { ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { DashboardAction, DashboardActionKind, DashboardActionTone, DashboardNavigate } from '@/types/dashboardDecision';

const actionLabels: Record<DashboardActionKind, string> = {
  review_overdue: 'Atrasado',
  review_today: 'Hoje',
  start_cycle_topic: 'Primeiro contato',
  continue_cycle_topic: 'Continuar',
  configure_exam_date: 'Configurar',
  load_cycle: 'Configurar',
  all_caught_up: 'Em dia',
};

const statusColors: Record<DashboardActionTone, string> = {
  danger: 'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
  info: 'bg-primary',
  neutral: 'bg-muted-foreground',
};

type NextBestActionCardProps = {
  action: DashboardAction;
  onNavigate: DashboardNavigate;
};

/** Presentation only: selecting an action must not start or record a study session. */
export function NextBestActionCard({ action, onNavigate }: NextBestActionCardProps) {
  const titleId = useId();
  const subjectLabel = action.target.subjectName || action.title;
  const topicLabel = action.target.subjectName ? action.target.topicName || action.title : null;
  const explanation = action.scientificBasis?.trim();
  const hasExplanation = Boolean(explanation && explanation !== action.reason.trim());
  const secondaryHref = action.secondaryHref !== action.primaryHref ? action.secondaryHref : undefined;

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="dashboard-next-action min-w-0 self-start overflow-hidden rounded-2xl"
    >
      <CardContent className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={titleId} className="text-sm font-semibold tracking-[-0.015em] text-foreground/80 dark:text-white/85">Melhor próxima ação</h2>
          <Badge variant="outline" className="gap-1.5 border-primary/25 bg-primary/10 text-xs font-semibold text-primary dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300">
            <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${statusColors[action.tone]} shadow-[0_0_8px_currentColor]`} />
            {actionLabels[action.kind]}
          </Badge>
        </div>

        <div className="mt-5 min-w-0">
          <h3 className="max-w-[30ch] break-words text-xl font-extrabold leading-snug tracking-[-0.03em] text-foreground [overflow-wrap:anywhere] sm:text-2xl dark:text-white" title={subjectLabel}>
            {subjectLabel}
          </h3>
          {topicLabel ? (
            <p className="mt-1.5 flex items-start gap-2 text-sm leading-relaxed text-content-muted dark:text-zinc-200">
              <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]" title={topicLabel}>{topicLabel}</span>
            </p>
          ) : (
            <p className="mt-1.5 break-words text-sm leading-relaxed text-content-muted [overflow-wrap:anywhere] dark:text-zinc-200">{action.description}</p>
          )}
          <p className="mt-3 max-w-[65ch] break-words text-xs leading-relaxed text-content-muted [overflow-wrap:anywhere] dark:text-zinc-400">{action.reason}</p>
        </div>

        <div className="pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-auto min-h-11 max-w-full whitespace-normal bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-left text-sm font-bold text-white shadow-[0_4px_18px_rgba(37,99,235,0.45)] transition-all hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_6px_22px_rgba(37,99,235,0.6)]"
              onClick={() => onNavigate(action.primaryHref, action.target)}
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{action.primaryLabel}</span>
              <ArrowRight aria-hidden="true" />
            </Button>
            {secondaryHref ? (
              <Button
                variant="ghost"
                className="h-auto min-h-11 max-w-full whitespace-normal px-3 py-2 text-left text-sm text-foreground/80 hover:bg-muted dark:text-white/85 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => onNavigate(secondaryHref, action.target)}
              >
                {action.secondaryLabel || 'Abrir tópico'}
              </Button>
            ) : null}
          </div>

          {hasExplanation ? (
            <Collapsible key={action.id} className="mt-2">
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="group min-h-11 h-auto max-w-full justify-start whitespace-normal px-0 text-left text-xs text-content-muted hover:bg-transparent hover:text-foreground dark:text-white/70 dark:hover:text-white"
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.currentTarget.click();
                  }}
                >
                  Como foi definida
                  <ChevronDown aria-hidden="true" className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <p className="break-words border-t border-border/60 pt-3 text-xs leading-relaxed text-content-muted [overflow-wrap:anywhere] dark:border-white/15 dark:text-white/75">{explanation}</p>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
