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
      className="dashboard-next-action min-w-0 self-start overflow-hidden rounded-2xl border-0 bg-[hsl(220_52%_11%)] text-white shadow-[0_22px_46px_-30px_hsl(220_52%_7%/0.72)]"
    >
      <CardContent className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={titleId} className="text-sm font-semibold tracking-[-0.015em] text-white/85">Melhor próxima ação</h2>
          <Badge variant="outline" className="gap-1.5 border-white/15 bg-white/[0.07] text-xs font-medium text-white">
            <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${statusColors[action.tone]}`} />
            {actionLabels[action.kind]}
          </Badge>
        </div>

        <div className="mt-5 min-w-0">
          <h3 className="max-w-[30ch] break-words text-xl font-bold leading-snug tracking-[-0.03em] [overflow-wrap:anywhere] sm:text-2xl" title={subjectLabel}>
            {subjectLabel}
          </h3>
          {topicLabel ? (
            <p className="mt-1.5 flex items-start gap-2 text-sm leading-relaxed text-white/85">
              <BookOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]" title={topicLabel}>{topicLabel}</span>
            </p>
          ) : (
            <p className="mt-1.5 break-words text-sm leading-relaxed text-white/85 [overflow-wrap:anywhere]">{action.description}</p>
          )}
          <p className="mt-3 max-w-[65ch] break-words text-xs leading-relaxed text-white/72 [overflow-wrap:anywhere]">{action.reason}</p>
        </div>

        <div className="pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="h-auto min-h-11 max-w-full whitespace-normal bg-primary px-4 py-2 text-left text-sm shadow-[0_12px_20px_-14px_hsl(215_100%_59%/0.9)] hover:bg-primary/90"
              onClick={() => onNavigate(action.primaryHref, action.target)}
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{action.primaryLabel}</span>
              <ArrowRight aria-hidden="true" />
            </Button>
            {secondaryHref ? (
              <Button
                variant="ghost"
                className="h-auto min-h-11 max-w-full whitespace-normal px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10 hover:text-white"
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
                  className="group min-h-11 h-auto max-w-full justify-start whitespace-normal px-0 text-left text-xs text-white/70 hover:bg-transparent hover:text-white"
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
                <p className="break-words border-t border-white/15 pt-3 text-xs leading-relaxed text-white/75 [overflow-wrap:anywhere]">{explanation}</p>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
