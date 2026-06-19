import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Info,
  ListChecks,
  Plus,
  Sparkles,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type {
  ChargeCoverageState,
  DashboardAction,
  DashboardActivityDay,
  DashboardDecisionModel,
  DashboardDifficultySummary,
  DashboardReminder,
} from '@/types/dashboardDecision';

const toneStyles = {
  danger: {
    accent: 'bg-destructive',
    soft: 'bg-destructive/10 text-destructive border-destructive/20',
    glow: 'shadow-[0_0_34px_hsl(var(--destructive)/0.2)]',
    ring: 'from-destructive/25',
  },
  warning: {
    accent: 'bg-warning',
    soft: 'bg-warning/10 text-warning border-warning/20',
    glow: 'shadow-[0_0_34px_hsl(var(--warning)/0.18)]',
    ring: 'from-warning/25',
  },
  success: {
    accent: 'bg-success',
    soft: 'bg-success/10 text-success border-success/20',
    glow: 'shadow-[0_0_34px_hsl(var(--success)/0.18)]',
    ring: 'from-success/25',
  },
  info: {
    accent: 'bg-primary',
    soft: 'bg-primary/10 text-primary border-primary/20',
    glow: 'shadow-[0_0_34px_hsl(var(--primary)/0.2)]',
    ring: 'from-primary/25',
  },
  neutral: {
    accent: 'bg-muted-foreground',
    soft: 'bg-muted text-muted-foreground border-border',
    glow: 'shadow-lg',
    ring: 'from-muted',
  },
};

const formatDate = (date?: string | null) => {
  if (!date) return 'Sem data';
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
};

const formatExamDate = (date?: string | null) => {
  if (!date) return 'Data não definida';
  return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
};

const formatMinutes = (minutes: number) => {
  if (minutes <= 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}min`;
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
};

const formatBarMinutes = (minutes: number) => {
  if (minutes <= 0) return '0h';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest > 0 ? `${hours}h${rest}` : `${hours}h`;
};

const getActionLabel = (kind: DashboardAction['kind']) => {
  if (kind === 'review_overdue') return 'Atrasado';
  if (kind === 'review_today') return 'Hoje';
  if (kind === 'start_cycle_topic') return 'A iniciar';
  if (kind === 'continue_cycle_topic') return 'Continuar';
  if (kind === 'strategic_high_charge') return 'Estratégico';
  if (kind === 'all_caught_up') return 'Em dia';
  return 'Configurar';
};

const percent = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

interface DashboardDecisionExperienceProps {
  model: DashboardDecisionModel;
  activityRange: 7 | 14 | 30;
  onActivityRangeChange: (range: 7 | 14 | 30) => void;
  onNavigate: (href: string) => void;
  onAddReminder: (text: string, reminderDate: string | null) => Promise<void>;
  onToggleReminder: (id: string, completed: boolean) => Promise<void>;
  isAddingReminder: boolean;
}

export const DashboardDecisionExperience = ({
  model,
  activityRange,
  onActivityRangeChange,
  onNavigate,
  onAddReminder,
  onToggleReminder,
  isAddingReminder,
}: DashboardDecisionExperienceProps) => {
  if (model.isLoading) {
    return <DashboardDecisionSkeleton />;
  }

  return (
    <main className="flex w-full flex-col gap-5 pb-10">
      <DashboardCommandHero model={model} onNavigate={onNavigate} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <div className="flex flex-col gap-5">
          <NextBestActionCard action={model.nextBestAction} onNavigate={onNavigate} />
          <ActionQueueCard actions={model.actionQueue} onNavigate={onNavigate} />
        </div>
        <div className="flex flex-col gap-5">
          <ExamPaceCard model={model} onNavigate={onNavigate} />
          <RecentRemindersCard
            reminders={model.reminders}
            onAddReminder={onAddReminder}
            onToggleReminder={onToggleReminder}
            isAdding={isAddingReminder}
          />
        </div>
      </section>

      <StudyTrajectoryCard
        model={model}
        activityRange={activityRange}
        onActivityRangeChange={onActivityRangeChange}
        onNavigate={onNavigate}
      />
    </main>
  );
};

const DashboardDecisionSkeleton = () => (
  <div className="flex flex-col gap-5">
    <Skeleton className="h-32 rounded-2xl" />
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
    <Skeleton className="h-80 rounded-2xl" />
  </div>
);

const DashboardCommandHero = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => {
  const { examContext, totals } = model;
  const daysLabel =
    examContext.state === 'ready' && typeof examContext.daysRemaining === 'number'
      ? `${examContext.daysRemaining}`
      : examContext.state === 'missing_exam_date'
        ? '--'
        : '0';

  return (
    <Card className="overflow-hidden rounded-2xl border-primary/20 bg-[radial-gradient(circle_at_18%_20%,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]">
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(340px,1.25fr)_140px_minmax(360px,1fr)] lg:items-center">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Concurso ativo</p>
              <h1 className="mt-1 max-w-3xl break-words text-lg font-bold leading-tight text-foreground sm:text-xl">
                {examContext.editalName || 'Nenhum edital carregado no ciclo'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => onNavigate(examContext.editalId ? '/meus-editais' : '/ciclo-estudos')}>
                {examContext.editalId ? 'Ver detalhes do edital' : 'Carregar edital'}
                <ChevronRight data-icon="inline-end" />
              </Button>
              <span className="inline-flex items-center gap-2 text-xs text-content-muted">
                <span className="size-2 rounded-full bg-success" />
                {examContext.examDate ? `Prova em ${formatExamDate(examContext.examDate)}` : 'Defina uma data para calcular o ritmo'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-start lg:justify-center">
            <div className="relative grid size-28 place-items-center rounded-full border-[6px] border-primary/45 bg-card shadow-[0_0_30px_hsl(var(--primary)/0.18)]">
              <div className="grid size-full place-items-center rounded-full text-center">
                <div>
                  <div className="text-3xl font-black leading-none text-foreground">{daysLabel}</div>
                  <div className="mt-1 text-xs font-medium text-content-muted">dias</div>
                  <div className="text-[11px] text-content-muted">para a prova</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <HeroMetric
              tone="danger"
              icon={Clock3}
              value={totals.overdueReviews}
              label="revisões atrasadas"
              onClick={() => onNavigate('/revisoes')}
            />
            <HeroMetric
              tone="warning"
              icon={CalendarClock}
              value={totals.todayReviews}
              label="revisões para hoje"
              onClick={() => onNavigate('/revisoes')}
            />
            <HeroMetric
              tone="info"
              icon={BookOpen}
              value={totals.unstartedTopics}
              label="tópicos a iniciar"
              onClick={() => onNavigate('/ciclo-estudos')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const HeroMetric = ({
  icon: Icon,
  value,
  label,
  tone,
  onClick,
}: {
  icon: typeof Clock3;
  value: number;
  label: string;
  tone: keyof typeof toneStyles;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex min-h-20 items-center gap-3 rounded-xl border border-border/70 bg-card/65 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
  >
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-full border', toneStyles[tone].soft, toneStyles[tone].glow)}>
      <Icon />
    </span>
    <span className="min-w-0">
      <span className="block text-2xl font-black leading-none text-foreground">{value}</span>
      <span className="mt-1 block text-xs font-semibold text-content-muted">{label}</span>
    </span>
    <ChevronRight className="ml-auto opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
  </button>
);

const NextBestActionCard = ({ action, onNavigate }: { action: DashboardAction; onNavigate: (href: string) => void }) => {
  const tone = toneStyles[action.tone];

  return (
    <Card className={cn('overflow-hidden rounded-2xl border-primary/20 bg-[radial-gradient(circle_at_78%_28%,hsl(var(--primary)/0.22),transparent_30%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]', tone.glow)}>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
          <div className="flex flex-col gap-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-foreground sm:text-xl">Melhor próxima ação</h2>
              <Badge className={cn('border', tone.soft)} variant="outline">
                {getActionLabel(action.kind)}
              </Badge>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-content-muted">
                {action.kind.includes('review') ? 'O que revisar' : 'O que estudar'}
              </p>
              <h3 className="max-w-2xl break-words text-2xl font-black leading-tight text-foreground sm:text-3xl">
                {action.target.topicName || action.title}
              </h3>
              {action.target.subjectName ? (
                <p className="flex items-center gap-2 text-sm text-content-muted">
                  <BookOpen /> {action.target.subjectName}
                </p>
              ) : null}
              <p className="text-sm text-content-muted">{action.description}</p>
            </div>

            <div className="grid gap-3 rounded-xl border border-border/70 bg-background/40 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 text-primary" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-content-muted">Base da recomendação</p>
                  <p className="mt-1 text-sm text-foreground">{action.scientificBasis || action.reason}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => onNavigate(action.primaryHref)}>
                  {action.primaryLabel}
                  <ArrowRight data-icon="inline-end" />
                </Button>
                {action.secondaryHref ? (
                  <Button variant="outline" onClick={() => onNavigate(action.secondaryHref)}>
                    {action.secondaryLabel || 'Abrir'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-t border-border/70 bg-background/30 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col justify-center gap-4">
              <div className="flex items-center gap-3">
                <Brain className="text-primary" />
                <h4 className="font-bold text-foreground">Por que esta ação agora?</h4>
              </div>
              <div className="relative flex flex-col gap-4 pl-6">
                <span className="absolute bottom-2 left-2 top-2 w-px bg-border" />
                {[action.reason, action.scientificBasis || 'Ordem calculada com base nos dados atuais.', 'Ao concluir, a fila recalcula automaticamente.'].map((item) => (
                  <div key={item} className="relative text-sm text-content-muted">
                    <span className={cn('absolute -left-[22px] top-1.5 size-3 rounded-full', tone.accent)} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ActionQueueCard = ({ actions, onNavigate }: { actions: DashboardAction[]; onNavigate: (href: string) => void }) => (
  <Card className="rounded-2xl">
    <CardHeader className="flex-row items-center justify-between gap-3">
      <div>
        <CardTitle>Hoje, em ordem</CardTitle>
        <CardDescription>Siga a ordem sugerida para manter o cronograma.</CardDescription>
      </div>
      <Button variant="outline" size="sm" onClick={() => onNavigate('/revisoes')}>
        Ver todas
        <ChevronRight data-icon="inline-end" />
      </Button>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      {actions.length === 0 ? (
        <div className="rounded-xl border border-success/20 bg-success/10 p-4 text-sm text-success">
          Tudo em dia por aqui. Avance o próximo estudo do ciclo.
        </div>
      ) : (
        actions.map((action) => <QueueActionRow key={action.id} action={action} onNavigate={onNavigate} />)
      )}
    </CardContent>
  </Card>
);

const QueueActionRow = ({ action, onNavigate }: { action: DashboardAction; onNavigate: (href: string) => void }) => {
  const tone = toneStyles[action.tone];

  return (
    <button
      type="button"
      onClick={() => onNavigate(action.primaryHref)}
      className="group grid grid-cols-[4px_minmax(0,1fr)] overflow-hidden rounded-xl border border-border/70 bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:grid-cols-[4px_minmax(0,1fr)_auto_auto]"
    >
      <span className={tone.accent} />
      <span className="min-w-0 p-4">
        <Badge variant="outline" className={cn('mb-2 border', tone.soft)}>
          {getActionLabel(action.kind)}
        </Badge>
        <span className="block truncate text-base font-bold text-foreground">{action.title}</span>
        <span className="mt-1 block text-sm text-content-muted">{action.description}</span>
      </span>
      <span className="hidden items-center p-4 text-sm text-content-muted sm:flex">
        {action.dueDate ? formatDate(action.dueDate) : action.kind === 'start_cycle_topic' ? 'Primeiro contato' : 'Sem data'}
      </span>
      <span className="hidden items-center gap-2 p-4 text-sm font-semibold text-primary sm:flex">
        {action.primaryLabel}
        <ChevronRight className="transition group-hover:translate-x-0.5" />
      </span>
    </button>
  );
};

const ExamPaceCard = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => {
  const { pace, chargeCoverage } = model;

  return (
    <Card className="overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_20%_10%,hsl(var(--success)/0.14),transparent_32%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 /> Ritmo até a prova
          </CardTitle>
          <CardDescription>{pace.explanation}</CardDescription>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              Entenda
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Como o ritmo foi calculado</p>
              <p className="text-sm text-content-muted">
                O painel divide os tópicos ainda não iniciados e as revisões previstas até a prova pelos dias restantes.
              </p>
              <p className="text-sm text-content-muted">
                Base atual: {pace.unstartedTopics} tópicos e {pace.pendingReviews} revisões
                {pace.daysRemaining !== null ? ` em ${pace.daysRemaining} dias` : ''}.
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('/ciclo-estudos')}>
                Abrir Ciclo de Estudos
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
          <div className="relative grid size-28 place-items-center rounded-full border-[7px] border-primary/35 bg-card shadow-[0_0_28px_hsl(var(--primary)/0.14)]">
            <div className="grid size-full place-items-center rounded-full text-center">
              <div>
                <div className="text-2xl font-black text-foreground">{pace.daysRemaining ?? '--'}</div>
                <div className="text-xs text-content-muted">{pace.daysRemaining === null ? 'Definir data' : 'dias restantes'}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PaceMetric label="Tópicos a iniciar" value={pace.unstartedTopics} detail={pace.newTopicsPerDay === null ? 'sem ritmo' : `${pace.newTopicsPerDay} tópicos/dia`} />
            <PaceMetric label="Revisões previstas" value={pace.pendingReviews} detail={pace.reviewsPerDay === null ? 'sem ritmo' : `${pace.reviewsPerDay} revisões/dia`} />
          </div>
        </div>

        <ChargeCoverageNotice state={chargeCoverage} onNavigate={onNavigate} />
      </CardContent>
    </Card>
  );
};

const PaceMetric = ({ label, value, detail }: { label: string; value: number; detail: string }) => (
  <div className="rounded-xl border border-border/70 bg-background/40 p-3">
    <p className="text-xs text-content-muted">{label}</p>
    <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
    <p className="text-xs font-medium text-primary">{detail}</p>
  </div>
);

const ChargeCoverageNotice = ({ state, onNavigate }: { state: ChargeCoverageState; onNavigate: (href: string) => void }) => {
  if (state === 'sufficient') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/10 p-3 text-sm text-success">
        <Check /> Análise de cobrança suficiente para alertas estratégicos.
      </div>
    );
  }

  if (state === 'partial') {
    return (
      <button
        type="button"
        onClick={() => onNavigate('/meus-editais')}
        className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/10 p-3 text-left text-sm text-warning"
      >
        <AlertTriangle /> Análise de cobrança parcial. Seu ritmo pode mudar conforme o edital for processado.
        <ChevronRight className="ml-auto" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate('/meus-editais')}
      className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 text-left text-sm text-content-muted"
    >
      <Info /> Sem dados de cobrança ainda. O painel vai usar ciclo e revisões como fonte principal.
      <ChevronRight className="ml-auto" />
    </button>
  );
};

const RecentRemindersCard = ({
  reminders,
  onAddReminder,
  onToggleReminder,
  isAdding,
}: {
  reminders: DashboardReminder[];
  onAddReminder: (text: string, reminderDate: string | null) => Promise<void>;
  onToggleReminder: (id: string, completed: boolean) => Promise<void>;
  isAdding: boolean;
}) => {
  const [text, setText] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await onAddReminder(trimmed, date || null);
    setText('');
  };

  return (
    <Card id="lembretes" className="rounded-2xl">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks /> Últimos lembretes
          </CardTitle>
          <CardDescription>Captura rápida sem sair do fluxo.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-border/70 bg-background/40 p-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
          <Input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSubmit();
            }}
            placeholder="Adicionar lembrete..."
          />
          <Input aria-label="Data do lembrete" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Button onClick={() => void handleSubmit()} disabled={isAdding || !text.trim()}>
            <Plus data-icon="inline-start" />
            Adicionar
          </Button>
        </div>

        <div className="flex flex-col divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
          {reminders.length === 0 ? (
            <div className="p-4 text-sm text-content-muted">Nenhum lembrete pendente. Quando surgir algo, registre aqui.</div>
          ) : (
            reminders.map((reminder, index) => (
              <ReminderRow key={reminder.id} reminder={reminder} index={index} onToggleReminder={onToggleReminder} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ReminderRow = ({
  reminder,
  index,
  onToggleReminder,
}: {
  reminder: DashboardReminder;
  index: number;
  onToggleReminder: (id: string, completed: boolean) => Promise<void>;
}) => {
  const colors = ['bg-primary', 'bg-warning', 'bg-success', 'bg-muted-foreground'];

  return (
    <div className="grid grid-cols-[4px_auto_minmax(0,1fr)] items-center gap-3 bg-card">
      <span className={cn('h-full min-h-14', colors[index % colors.length])} />
      <Checkbox
        aria-label={reminder.completed ? `Reabrir lembrete: ${reminder.text}` : `Concluir lembrete: ${reminder.text}`}
        checked={reminder.completed}
        onCheckedChange={(checked) => void onToggleReminder(reminder.id, Boolean(checked))}
      />
      <div className="min-w-0 py-3">
        <p className={cn('truncate text-sm font-semibold text-foreground', reminder.completed && 'text-content-muted line-through')}>
          {reminder.text}
        </p>
        <p className="mt-0.5 text-xs text-content-muted">{reminder.reminderDate ? formatDate(reminder.reminderDate) : 'Sem data'}</p>
      </div>
    </div>
  );
};

const StudyTrajectoryCard = ({
  model,
  activityRange,
  onActivityRangeChange,
  onNavigate,
}: {
  model: DashboardDecisionModel;
  activityRange: 7 | 14 | 30;
  onActivityRangeChange: (range: 7 | 14 | 30) => void;
  onNavigate: (href: string) => void;
}) => {
  const totalMinutes = model.activityDays.reduce((sum, day) => sum + day.totalDurationMinutes, 0);

  return (
    <Card className="overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_78%_12%,hsl(var(--primary)/0.14),transparent_26%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]">
      <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 /> Sua trajetória
          </CardTitle>
          <CardDescription>Atividade, progresso e dificuldade com base nas suas marcações.</CardDescription>
        </div>
        <ToggleGroup
          type="single"
          value={String(activityRange)}
          onValueChange={(value) => {
            if (value === '7' || value === '14' || value === '30') onActivityRangeChange(Number(value) as 7 | 14 | 30);
          }}
        >
          <ToggleGroupItem value="7">7 dias</ToggleGroupItem>
          <ToggleGroupItem value="14">14 dias</ToggleGroupItem>
          <ToggleGroupItem value="30">Mês</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.7fr)_minmax(320px,0.9fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Atividade dos últimos {activityRange} dias</p>
              <p className="text-xs text-content-muted">{formatMinutes(totalMinutes)} registrados</p>
            </div>
            <Badge variant="outline">{model.activityDays.filter((day) => day.totalDurationMinutes > 0).length} dias ativos</Badge>
          </div>
          <ActivityBars days={model.activityDays} />
        </div>

        <ProgressPanel model={model} onNavigate={onNavigate} />
        <DifficultyPanel summary={model.difficultySummary} onNavigate={onNavigate} />
      </CardContent>
    </Card>
  );
};

const ActivityBars = ({ days }: { days: DashboardActivityDay[] }) => {
  const maxMinutes = Math.max(1, ...days.map((day) => day.totalDurationMinutes));

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-background/30 p-3">
      <div
        className="grid min-h-44 items-end gap-2"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(28px, 1fr))`,
          minWidth: `${Math.max(7, days.length) * 36}px`,
        }}
      >
        {days.map((day) => {
          const height = Math.max(10, Math.round((day.totalDurationMinutes / maxMinutes) * 128));
          return (
            <Popover key={day.date}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Ver atividade de ${format(parseISO(day.date), "dd 'de' MMMM", { locale: ptBR })}`}
                  className="group flex min-w-0 flex-col items-center gap-2"
                >
                  <span className="text-[10px] font-semibold leading-none text-content-muted">{formatBarMinutes(day.totalDurationMinutes)}</span>
                  <span
                    className={cn(
                      'w-full max-w-10 rounded-t-lg transition group-hover:brightness-110',
                      day.totalDurationMinutes === 0
                        ? 'bg-muted'
                        : day.difficultyAverage && day.difficultyAverage >= 2.5
                          ? 'bg-warning'
                          : 'bg-primary',
                    )}
                    style={{ height }}
                  />
                  <span className="flex flex-col items-center gap-0.5 text-[10px] leading-none text-content-muted">
                    {days.length > 7 ? (
                      format(parseISO(day.date), 'dd/MM', { locale: ptBR })
                    ) : (
                      <>
                        <span className="uppercase">{format(parseISO(day.date), 'EEEEE', { locale: ptBR })}</span>
                        <span>{format(parseISO(day.date), 'dd', { locale: ptBR })}</span>
                      </>
                    )}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{format(parseISO(day.date), "EEEE, dd/MM", { locale: ptBR })}</p>
                    <Badge variant="outline">{formatMinutes(day.totalDurationMinutes)}</Badge>
                  </div>
                  {day.entries.length === 0 ? (
                    <p className="text-sm text-content-muted">Sem registro nesse dia.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {day.entries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="rounded-lg bg-muted/50 p-2">
                          <p className="truncate text-sm font-semibold text-foreground">{entry.topicName}</p>
                          <p className="text-xs text-content-muted">
                            {entry.subjectName || 'Matéria'} • {formatMinutes(entry.durationMinutes)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
};

const ProgressPanel = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => (
  <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/30 p-4">
    <div>
      <p className="text-sm font-semibold text-foreground">Progresso do edital</p>
      <p className="text-xs text-content-muted">{model.progressSummary.totalTopics} tópicos no ciclo</p>
    </div>
    <div className="grid gap-3">
      <div className="flex items-end justify-between">
        <span className="text-4xl font-black text-foreground">{model.progressSummary.editalProgressPercentage}%</span>
        <span className="text-sm text-content-muted">iniciado</span>
      </div>
      <Progress value={model.progressSummary.editalProgressPercentage} className="h-3" />
      <div className="grid grid-cols-3 gap-2 text-xs">
        <MiniStat label="Iniciados" value={model.progressSummary.startedTopics} />
        <MiniStat label="Em andamento" value={model.progressSummary.inProgressTopics} />
        <MiniStat label="Não iniciados" value={model.totals.unstartedTopics} />
      </div>
    </div>
    <Button variant="outline" size="sm" onClick={() => onNavigate('/ciclo-estudos')}>
      Ver progresso por matéria
      <ArrowRight data-icon="inline-end" />
    </Button>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg bg-muted/50 p-2">
    <p className="font-bold text-foreground">{value}</p>
    <p className="text-content-muted">{label}</p>
  </div>
);

const DifficultyPanel = ({ summary, onNavigate }: { summary: DashboardDifficultySummary; onNavigate: (href: string) => void }) => {
  const items = [
    { label: 'Fácil', value: summary.easy, tone: 'success' as const },
    { label: 'Médio', value: summary.medium, tone: 'warning' as const },
    { label: 'Difícil', value: summary.hard, tone: 'danger' as const },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-background/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Mapa de dificuldade</p>
          <p className="text-xs text-content-muted">Com base nas suas marcações</p>
        </div>
        <CircleAlert className="text-content-muted" />
      </div>

      {summary.totalRated === 0 ? (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-content-muted">
          Ainda não há tópicos avaliados. O mapa aparece quando você marcar dificuldade ao estudar ou revisar.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <DifficultyRing key={item.label} label={item.label} value={item.value} total={summary.totalRated} tone={item.tone} />
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => onNavigate('/ciclo-estudos')}>
        Ver por matéria
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
};

const DifficultyRing = ({ label, value, total, tone }: { label: string; value: number; total: number; tone: keyof typeof toneStyles }) => {
  const valuePercent = percent(value, total);
  const color =
    tone === 'success'
      ? 'hsl(var(--success))'
      : tone === 'warning'
        ? 'hsl(var(--warning))'
        : tone === 'danger'
          ? 'hsl(var(--destructive))'
          : 'hsl(var(--primary))';

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="grid size-20 place-items-center rounded-full p-1.5" style={{ background: `conic-gradient(${color} 0 ${valuePercent}%, hsl(var(--border)) ${valuePercent}% 100%)` }}>
        <div className="grid size-full place-items-center rounded-full bg-card">
          <span className="text-lg font-black text-foreground">{valuePercent}%</span>
        </div>
      </div>
      <div>
        <p className={cn('font-semibold', toneStyles[tone].soft, 'rounded-full border px-2 py-0.5')}>{label}</p>
        <p className="mt-1 text-xs text-content-muted">{value} tópicos</p>
      </div>
    </div>
  );
};
