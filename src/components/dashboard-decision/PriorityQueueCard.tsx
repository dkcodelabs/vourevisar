import { BookOpen, CalendarClock, ChevronRight, CircleAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { DashboardAction, DashboardActionTarget, DashboardActionTone, DashboardDecisionModel, DashboardNavigate } from '@/types/dashboardDecision';

const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });

const getPrimaryQueueAction = (model: DashboardDecisionModel, kinds: DashboardAction['kind'][]) =>
  [model.nextBestAction, ...model.actionQueue, ...model.continueCycleItems].find((action) => kinds.includes(action.kind));

export const PriorityQueueCard = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: DashboardNavigate }) => {
  const overdue = getPrimaryQueueAction(model, ['review_overdue']);
  const today = getPrimaryQueueAction(model, ['review_today']);
  const cycle = getPrimaryQueueAction(model, ['start_cycle_topic', 'continue_cycle_topic']);

  const rows = [
    {
      key: 'overdue',
      label: 'Atrasadas',
      count: model.totals.overdueReviews,
      tone: 'danger' as const,
      icon: CircleAlert,
      title: overdue?.target.subjectName || 'Nenhuma revisão atrasada',
      description: overdue?.target.topicName || overdue?.title || 'Você não tem revisões vencidas agora.',
      meta:
        typeof overdue?.metadata?.daysOverdue === 'number'
          ? `Há ${overdue.metadata.daysOverdue} ${overdue.metadata.daysOverdue === 1 ? 'dia' : 'dias'}`
          : overdue?.dueDate
            ? formatDate(overdue.dueDate)
            : 'Em dia',
      href: overdue?.primaryHref || '/revisoes',
      target: overdue?.target,
    },
    {
      key: 'today',
      label: 'Para hoje',
      count: model.totals.todayReviews,
      tone: 'warning' as const,
      icon: CalendarClock,
      title: today?.target.subjectName || 'Nenhuma revisão para hoje',
      description: today?.target.topicName || today?.title || 'O cronograma de hoje está livre.',
      meta: today ? 'Hoje' : 'Livre',
      href: today?.primaryHref || '/revisoes',
      target: today?.target,
    },
    {
      key: 'cycle',
      label: 'Ciclo de estudos',
      count: model.totals.unstartedTopics,
      tone: 'info' as const,
      icon: BookOpen,
      title: cycle?.target.subjectName || 'Ciclo sem próximo tópico',
      description: cycle?.target.topicName || cycle?.title || 'Carregue ou organize um edital no ciclo.',
      meta: cycle ? 'Próximo' : 'Configurar',
      href: cycle?.primaryHref || '/ciclo-estudos',
      target: cycle?.target,
    },
  ];

  return (
    <Card className="dashboard-priority-card overflow-hidden rounded-2xl border-border/80 bg-card shadow-[0_16px_36px_-28px_hsl(222_47%_11%/0.4)]">
      <CardHeader className="flex-row items-center justify-between gap-3 px-4 pb-2.5 pt-4">
        <CardTitle className="text-sm font-extrabold text-foreground sm:text-base">Fila de prioridade</CardTitle>
        <Button variant="ghost" size="sm" className="min-h-11 h-auto shrink-0 px-2 text-xs font-semibold text-primary hover:bg-primary/5 hover:text-primary" onClick={() => onNavigate('/revisoes')}>
          Ver revisões
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 pb-4">
        {rows.map((row) => (
          <PriorityQueueRow key={row.key} row={row} onNavigate={onNavigate} />
        ))}
      </CardContent>
    </Card>
  );
};

const PriorityQueueRow = ({
  row,
  onNavigate,
}: {
  row: {
    label: string;
    count: number;
    tone: DashboardActionTone;
    icon: typeof CircleAlert;
    title: string;
    description: string;
    meta: string;
    href: string;
    target?: DashboardActionTarget;
  };
  onNavigate: DashboardNavigate;
}) => {
  const Icon = row.icon;
  const palette = {
    danger: {
      bar: 'bg-destructive',
      shell: 'border-destructive/15 bg-destructive/[0.045] hover:bg-destructive/[0.075]',
      icon: 'bg-destructive/12 text-destructive',
    },
    warning: {
      bar: 'bg-warning',
      shell: 'border-warning/20 bg-warning/[0.055] hover:bg-warning/[0.085]',
      icon: 'bg-warning/15 text-warning',
    },
    info: {
      bar: 'bg-primary',
      shell: 'border-primary/20 bg-primary/[0.055] hover:bg-primary/[0.085]',
      icon: 'bg-primary/12 text-primary',
    },
    success: {
      bar: 'bg-success',
      shell: 'border-success/20 bg-success/[0.055] hover:bg-success/[0.085]',
      icon: 'bg-success/12 text-success',
    },
    neutral: {
      bar: 'bg-muted-foreground',
      shell: 'border-border/80 bg-muted/40 hover:bg-muted/65',
      icon: 'bg-muted text-content-muted',
    },
  }[row.tone];

  return (
    <button
      type="button"
      onClick={() => onNavigate(row.href, row.target)}
      className={cn(
        'group grid min-h-[66px] w-full grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-xl border text-left transition-[background-color,border-color,transform] duration-200 ease-out hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2',
        palette.shell,
      )}
    >
      <span className="min-w-0 px-3 py-2">
        <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <span className={cn('grid size-4 place-items-center rounded-full', palette.icon)}>
            <Icon aria-hidden="true" className="size-3" />
          </span>
          {row.label} ({row.count})
        </span>
        <span title={row.title} className="block truncate text-xs font-bold leading-tight text-foreground">{row.title}</span>
        <span title={row.description} className="mt-0.5 block truncate text-[11px] text-content-muted">{row.description}</span>
      </span>
      <span className="flex items-center gap-2 px-2.5 text-[11px] text-content-muted">
        <span className="hidden tabular-nums sm:block">{row.meta}</span>
        <ChevronRight aria-hidden="true" className="size-4" />
      </span>
    </button>
  );
};
