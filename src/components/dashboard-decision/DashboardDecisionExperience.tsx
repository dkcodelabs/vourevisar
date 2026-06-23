import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clock3,
  BriefcaseBusiness,
  GraduationCap,
  Info,
  Loader2,
  NotebookPen,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { StudyEmptyState } from '@/components/study/StudyEmptyState';
import { formatPaceRequirement, formatPaceValue, getDashboardActivitySelection, getPaceBannerAction } from '@/utils/dashboardDecision';
import type {
  DashboardAction,
  DashboardActivityDay,
  DashboardChargeSummary,
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

const formatReminderDate = (date?: string | null) => {
  if (!date) return 'Sem data';
  const parsedDate = date.length === 10 ? parseISO(date) : new Date(date);
  if (isToday(parsedDate)) return 'Hoje';
  if (isTomorrow(parsedDate)) return 'Amanhã';
  return format(parsedDate, 'dd/MM/yyyy', { locale: ptBR });
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
  return `${(minutes / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
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
  onDeleteReminder: (id: string) => Promise<void>;
  isAddingReminder: boolean;
  isDeletingReminder: boolean;
}

export const DashboardDecisionExperience = ({
  model,
  activityRange,
  onActivityRangeChange,
  onNavigate,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  isAddingReminder,
  isDeletingReminder,
}: DashboardDecisionExperienceProps) => {
  if (model.isLoading) {
    return <DashboardDecisionSkeleton />;
  }

  if (model.examContext.state === 'missing_cycle') {
    return (
      <StudyEmptyState
        kind="no-cycle"
        variant="center"
        onAction={() => onNavigate('/ciclo-estudos')}
      />
    );
  }

  return (
    <main className="flex w-full flex-col gap-5 pb-10">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
        <DashboardCommandHero model={model} onNavigate={onNavigate} />
        <ProgressSummaryCard model={model} onNavigate={onNavigate} />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.9fr)_minmax(300px,0.8fr)]">
        <NextBestActionCard action={model.nextBestAction} onNavigate={onNavigate} />
        <PriorityQueueCard model={model} onNavigate={onNavigate} />
        <RecentRemindersCard
          reminders={model.reminders}
          onAddReminder={onAddReminder}
          onToggleReminder={onToggleReminder}
          onDeleteReminder={onDeleteReminder}
          isAdding={isAddingReminder}
          isDeleting={isDeletingReminder}
        />
      </section>

      <StudyTrajectoryCard
        model={model}
        onNavigate={onNavigate}
      />

      <StudyConsistencyCard
        model={model}
        activityRange={activityRange}
        onActivityRangeChange={onActivityRangeChange}
        onNavigate={onNavigate}
      />
    </main>
  );
};

const chargeRingStyles = {
  low: {
    color: 'hsl(var(--info))',
    labelClass: 'border-info/20 bg-info/10 text-info',
  },
  medium: {
    color: 'hsl(var(--warning))',
    labelClass: 'border-warning/20 bg-warning/10 text-warning',
  },
  high: {
    color: 'hsl(var(--incidence))',
    labelClass: 'border-incidence/20 bg-incidence/10 text-incidence',
  },
};

const ChargeMapPanel = ({ summary }: { summary: DashboardChargeSummary }) => {
  const distribution = [
    { key: 'low' as const, label: 'Baixa', value: summary.low },
    { key: 'medium' as const, label: 'Média', value: summary.medium },
    { key: 'high' as const, label: 'Alta', value: summary.high },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Mapa de cobrança</p>
          <p className="mt-0.5 text-[10px] text-content-muted">Distribuição dos tópicos já analisados</p>
        </div>
        <CircleAlert className="size-4 text-content-muted" aria-label="Percentuais calculados apenas entre tópicos analisados" />
      </div>

      {summary.analyzedTopics === 0 ? (
        <div className="flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/25 p-4 text-center">
          <Target className="size-5 text-content-muted" />
          <p className="text-xs font-semibold text-foreground">Nenhum tópico classificado ainda</p>
          <p className="text-[10px] leading-relaxed text-content-muted">O mapa aparecerá conforme o edital for analisado.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {distribution.map((item) => (
              <ChargeRing
                key={item.key}
                label={item.label}
                value={item.value}
                total={summary.analyzedTopics}
                tone={item.key}
              />
            ))}
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border/70 pt-3 text-[9px] text-content-muted">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <CheckCircle2 className="size-3.5 text-success" />
              {summary.analyzedTopics} de {summary.totalTopics} analisados
            </span>
            {summary.unanalyzedTopics > 0 ? <span>{summary.unanalyzedTopics} sem análise</span> : null}
          </div>
        </>
      )}
    </div>
  );
};

const ChargeRing = ({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: keyof typeof chargeRingStyles;
}) => {
  const valuePercent = percent(value, total);
  const style = chargeRingStyles[tone];

  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <div
        className="grid size-[68px] place-items-center rounded-full p-[5px] sm:size-[82px]"
        style={{ background: `conic-gradient(${style.color} 0 ${valuePercent}%, hsl(var(--border)) ${valuePercent}% 100%)` }}
        role="img"
        aria-label={`${label}: ${valuePercent}%, ${value} tópico${value === 1 ? '' : 's'}`}
      >
        <div className="grid size-full place-items-center rounded-full bg-card">
          <span className="text-base font-black tabular-nums leading-none text-foreground sm:text-lg">{valuePercent}%</span>
        </div>
      </div>
      <Badge variant="outline" className={cn('max-w-full px-1.5 py-0 text-[9px] sm:text-[10px]', style.labelClass)}>
        {label}
      </Badge>
      <span className="text-[9px] tabular-nums text-content-muted sm:text-[10px]">
        {value} tópico{value === 1 ? '' : 's'}
      </span>
    </div>
  );
};

const DashboardDecisionSkeleton = () => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
    <Skeleton className="h-80 rounded-2xl" />
    <Skeleton className="h-72 rounded-2xl" />
  </div>
);

const DashboardCommandHero = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => {
  const { examContext, totals } = model;
  const daysLabel =
    examContext.state === 'ready' && typeof examContext.daysRemaining === 'number'
      ? `${examContext.daysRemaining}`
      : '--';

  return (
    <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-[radial-gradient(circle_at_38%_-35%,hsl(var(--primary)/0.2),transparent_42%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))] shadow-[0_20px_60px_-42px_hsl(var(--primary)/0.65)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-3">
          <div className="col-span-4 min-w-0">
            <div className="flex min-w-0 items-start gap-2">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary sm:size-[18px]" />
              <h1 className="max-w-3xl break-words text-base font-bold leading-tight text-foreground sm:text-xl">
                {examContext.editalName || 'Nenhum edital carregado no ciclo'}
              </h1>
            </div>
            {examContext.position ? (
              <p className="mt-1.5 flex min-w-0 items-center gap-2 text-xs font-medium text-content-muted sm:text-sm">
                <BriefcaseBusiness className="size-3.5 shrink-0 text-warning sm:size-4" />
                <span className="min-w-0 break-words">{examContext.position}</span>
              </p>
            ) : null}
            {!examContext.editalId ? (
              <Button className="mt-4" variant="outline" size="sm" onClick={() => onNavigate('/ciclo-estudos')}>
                Carregar edital no ciclo
                <ChevronRight data-icon="inline-end" />
              </Button>
            ) : null}
          </div>

          <div className="col-span-1 flex min-w-0 items-center justify-center">
            <ExamCountdownOrbit
              daysLabel={daysLabel}
              examDate={examContext.examDate}
              isMissingDate={examContext.state === 'missing_exam_date'}
            />
          </div>

          <div className="col-span-3 grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
            <HeroMetric
              tone="danger"
              icon={Clock3}
              value={totals.overdueReviews}
              label="Revisões atrasadas"
              onClick={() => onNavigate('/revisoes')}
            />
            <HeroMetric
              tone="warning"
              icon={CalendarClock}
              value={totals.todayReviews}
              label="Revisões para hoje"
              onClick={() => onNavigate('/revisoes')}
            />
            <HeroMetric
              tone="info"
              icon={BookOpen}
              value={totals.unstartedTopics}
              label="Tópicos a iniciar"
              onClick={() => onNavigate('/ciclo-estudos')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProgressSummaryCard = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => (
  <Card className="overflow-hidden rounded-2xl border-primary/15 bg-[radial-gradient(circle_at_85%_5%,hsl(var(--primary)/0.12),transparent_34%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--surface)))] shadow-sm">
    <ProgressPanel model={model} onNavigate={onNavigate} compact />
  </Card>
);

const ExamCountdownOrbit = ({
  daysLabel,
  examDate,
  isMissingDate,
}: {
  daysLabel: string;
  examDate: string | null;
  isMissingDate: boolean;
}) => (
  <div
    className="relative grid size-[76px] shrink-0 place-items-center [filter:drop-shadow(0_0_12px_hsl(var(--primary)/0.24))] sm:size-24"
    role="img"
    aria-label={
      examDate
        ? `${daysLabel} dias para a prova em ${formatExamDate(examDate)}`
        : 'Data da prova não definida'
    }
  >
    <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="dashboard-orbit-gradient" x1="20" y1="18" x2="142" y2="136" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
          <stop offset="0.48" stopColor="hsl(var(--primary))" />
          <stop offset="1" stopColor="hsl(var(--info))" />
        </linearGradient>
      </defs>
      <circle
        cx="80"
        cy="80"
        r="61"
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="3"
        strokeDasharray="283 383"
        strokeLinecap="round"
        opacity="0.5"
        transform="rotate(140 80 80)"
      />
      <path
        d="M 33.3 119.2 A 61 61 0 0 1 35.2 38.6"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeDasharray="1 10"
        strokeLinecap="round"
        opacity="0.72"
      />
      <circle
        cx="80"
        cy="80"
        r="61"
        fill="none"
        stroke="url(#dashboard-orbit-gradient)"
        strokeWidth="7"
        strokeDasharray="195 383"
        strokeDashoffset="-88"
        strokeLinecap="round"
        transform="rotate(140 80 80)"
      />
    </svg>
    <div className="relative z-10 flex w-[70px] max-w-full flex-col items-center justify-center overflow-hidden pt-1 text-center sm:w-[86px]">
      <span className="text-[19px] font-black tabular-nums leading-none text-foreground sm:text-[25px]">{daysLabel}</span>
      <span className="mt-0.5 block max-w-full whitespace-nowrap text-[6.5px] font-semibold leading-none text-content-muted sm:text-[8px]">
        {isMissingDate ? 'Defina a data' : 'Dias para a prova'}
      </span>
      <span className="mt-1 block max-w-full whitespace-nowrap text-[6px] font-medium tabular-nums leading-none text-content-muted/80 sm:text-[7px]">
        {examDate ? formatExamDate(examDate) : 'Sem data'}
      </span>
    </div>
  </div>
);

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
    className="group flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-border/70 bg-card/65 p-1 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:min-h-24 sm:gap-1.5 sm:rounded-xl sm:p-2"
  >
    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full border sm:size-8', toneStyles[tone].soft, toneStyles[tone].glow)}>
      <Icon className="size-3.5 sm:size-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-lg font-black leading-none text-foreground sm:text-xl">{value}</span>
      <span className="mt-0.5 block text-[8px] font-semibold leading-tight text-content-muted sm:text-[10px]">{label}</span>
    </span>
  </button>
);

const NextBestActionCard = ({ action, onNavigate }: { action: DashboardAction; onNavigate: (href: string) => void }) => {
  const tone = toneStyles[action.tone];
  const actionMode = action.kind.includes('review') ? 'O que revisar' : action.kind === 'all_caught_up' ? 'Próximo movimento' : 'O que estudar';
  const cleanedDescription =
    action.target.subjectName && action.description.startsWith(`${action.target.subjectName} • `)
      ? action.description.slice(action.target.subjectName.length + 3)
      : action.description;
  const primarySubjectLabel = action.target.subjectName || action.title;
  const secondaryTopicLabel = action.target.subjectName ? action.target.topicName || action.title : null;
  const statusBadgeLabel =
    cleanedDescription === 'Primeiro contato' || cleanedDescription === 'Estudo em andamento' ? cleanedDescription : null;
  const contextualLabel =
    typeof action.metadata?.daysOverdue === 'number'
      ? `Atrasado há ${action.metadata.daysOverdue} ${action.metadata.daysOverdue === 1 ? 'dia' : 'dias'}`
      : action.dueDate
        ? `Prazo: ${formatDate(action.dueDate)}`
        : cleanedDescription;
  const scientificBasis = action.scientificBasis || 'Ordem calculada com base nos dados atuais.';
  const reasonRows = [
    { label: 'Por que agora', text: action.reason },
    ...(scientificBasis.trim() !== action.reason.trim() ? [{ label: 'Base científica', text: scientificBasis }] : []),
  ];
  const showContextLine = !statusBadgeLabel && contextualLabel.trim().length > 0;

  return (
    <Card className={cn('overflow-hidden rounded-2xl border-primary/25 bg-[radial-gradient(circle_at_86%_36%,hsl(var(--primary)/0.34),transparent_26%),radial-gradient(circle_at_94%_10%,hsl(var(--info)/0.20),transparent_28%),linear-gradient(135deg,hsl(220_46%_7%),hsl(212_72%_13%)_52%,hsl(214_95%_18%))] text-white shadow-[0_22px_70px_hsl(214_80%_8%/0.32)] dark:border-primary/30', tone.glow)}>
      <CardContent className="p-0">
        <div className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute -right-12 top-7 hidden size-56 rounded-full border border-primary/20 bg-primary/10 blur-2xl lg:block" />
          <img
            src="/images/dashboard/next-best-action-brain.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-5 top-16 hidden size-24 object-contain opacity-40 drop-shadow-[0_0_24px_hsl(var(--primary)/0.65)] sm:block"
          />

          <div className="grid grid-cols-1">
            <div className="flex min-w-0 flex-col p-4 pb-2 sm:pr-28">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-sm font-extrabold text-white sm:text-base">Melhor próxima ação</h2>
                <Badge className="border-primary/40 bg-primary/12 px-2 py-0 text-[10px] font-semibold text-primary shadow-[0_0_18px_hsl(var(--primary)/0.18)]" variant="outline">
                  Prioridade máxima
                </Badge>
                <Badge className={cn('border px-2 py-0 text-[10px]', tone.soft)} variant="outline">
                  {getActionLabel(action.kind)}
                </Badge>
                {statusBadgeLabel ? (
                  <Badge className="border-white/20 bg-white/10 px-2 py-0 text-[10px] font-semibold text-white/88" variant="outline">
                    {statusBadgeLabel}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-4 flex min-w-0 flex-col gap-2">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">{actionMode}</p>
                <h3
                  className="max-w-[24rem] text-pretty break-words text-[1.08rem] font-extrabold leading-[1.15] text-white sm:text-xl"
                  title={primarySubjectLabel}
                >
                  {primarySubjectLabel}
                </h3>
                {secondaryTopicLabel ? (
                  <p className="flex min-w-0 items-center gap-2 text-xs text-white/72">
                    <BookOpen className="size-3.5 shrink-0" />
                    <span className="truncate" title={secondaryTopicLabel}>{secondaryTopicLabel}</span>
                  </p>
                ) : null}
                {showContextLine ? (
                  <p className="flex min-w-0 items-center gap-2 text-[11px] text-white/62">
                    <Clock3 className="size-3.5 shrink-0" />
                    <span className="truncate">{contextualLabel}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="min-w-0 px-4 pb-3 pt-2">
              <div className="relative flex flex-col gap-2.5 pl-7">
                <span className="absolute bottom-2 left-[9px] top-2 w-px bg-white/18" />
                {reasonRows.map((item, index) => (
                  <div key={`${item.label}:${item.text}`} className="relative text-[10px] leading-relaxed text-white/82 sm:text-[11px]">
                    <span className="absolute -left-[25px] top-0.5 grid size-4 place-items-center rounded-full border border-white/25 bg-slate-950/70">
                      <span className="size-2 rounded-full bg-primary/60" />
                    </span>
                    <span className="font-semibold text-white">{item.label}: </span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 border-t border-white/10 bg-slate-950/20 p-4 backdrop-blur">
            <Button className="h-9 min-w-0 rounded-xl bg-primary px-2 text-xs text-primary-foreground shadow-[0_12px_28px_hsl(var(--primary)/0.28)] hover:bg-primary/90" onClick={() => onNavigate(action.primaryHref)}>
              {action.primaryLabel}
              <ArrowRight data-icon="inline-end" />
            </Button>
            {action.secondaryHref ? (
              <Button className="h-9 min-w-0 rounded-xl border-white/18 bg-white/[0.035] px-2 text-xs text-white hover:bg-white/10" variant="outline" onClick={() => onNavigate(action.secondaryHref)}>
                {action.secondaryLabel || 'Abrir tópico'}
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const getPrimaryQueueAction = (model: DashboardDecisionModel, kinds: DashboardAction['kind'][]) =>
  [model.nextBestAction, ...model.actionQueue, ...model.continueCycleItems].find((action) => kinds.includes(action.kind));

const PriorityQueueCard = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => {
  const overdue = getPrimaryQueueAction(model, ['review_overdue']);
  const today = getPrimaryQueueAction(model, ['review_today']);
  const cycle = getPrimaryQueueAction(model, ['start_cycle_topic', 'continue_cycle_topic']);
  const strategic = getPrimaryQueueAction(model, ['strategic_high_charge']);

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
      disabled: !overdue,
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
      disabled: !today,
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
      disabled: !cycle,
    },
    {
      key: 'charge',
      label: 'Cobrança alta',
      count: model.chargeSummary.high,
      tone: 'success' as const,
      icon: Sparkles,
      title: strategic?.target.subjectName || 'Sem alerta de alta cobrança',
      description: strategic?.target.topicName || strategic?.title || 'Nada crítico para destacar com os dados atuais.',
      meta: strategic ? 'Alta' : model.chargeSummary.high > 0 ? 'Mapeada' : 'Sem dado',
      href: strategic?.primaryHref || '/ciclo-estudos',
      disabled: !strategic,
    },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-900/10 bg-[linear-gradient(145deg,hsl(220_40%_8%),hsl(213_44%_12%)_58%,hsl(213_50%_10%))] text-white shadow-[0_18px_54px_hsl(216_58%_6%/0.30)] dark:border-primary/15">
      <CardHeader className="flex-row items-center justify-between gap-3 px-4 pb-2.5 pt-4">
        <CardTitle className="text-sm font-extrabold text-white sm:text-base">Fila de prioridade</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10 hover:text-primary" onClick={() => onNavigate('/revisoes')}>
          Ver todas
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
    tone: keyof typeof toneStyles;
    icon: typeof CircleAlert;
    title: string;
    description: string;
    meta: string;
    href: string;
    disabled: boolean;
  };
  onNavigate: (href: string) => void;
}) => {
  const Icon = row.icon;
  const palette = {
    danger: {
      bar: 'bg-destructive',
      shell: 'border-destructive/20 bg-[linear-gradient(90deg,hsl(var(--destructive)/0.18),hsl(var(--destructive)/0.07)_34%,hsl(var(--primary)/0.05))]',
      text: 'text-destructive',
      icon: 'bg-destructive/16 text-destructive',
    },
    warning: {
      bar: 'bg-warning',
      shell: 'border-warning/20 bg-[linear-gradient(90deg,hsl(var(--warning)/0.18),hsl(var(--warning)/0.07)_34%,hsl(var(--primary)/0.05))]',
      text: 'text-warning',
      icon: 'bg-warning/16 text-warning',
    },
    info: {
      bar: 'bg-primary',
      shell: 'border-primary/20 bg-[linear-gradient(90deg,hsl(var(--primary)/0.20),hsl(var(--primary)/0.08)_34%,hsl(var(--info)/0.05))]',
      text: 'text-primary',
      icon: 'bg-primary/16 text-primary',
    },
    success: {
      bar: 'bg-success',
      shell: 'border-success/20 bg-[linear-gradient(90deg,hsl(var(--success)/0.20),hsl(var(--success)/0.08)_34%,hsl(var(--primary)/0.05))]',
      text: 'text-success',
      icon: 'bg-success/16 text-success',
    },
    neutral: {
      bar: 'bg-muted-foreground',
      shell: 'border-white/10 bg-white/[0.04]',
      text: 'text-white/70',
      icon: 'bg-white/10 text-white/70',
    },
  }[row.tone];

  return (
    <button
      type="button"
      onClick={() => onNavigate(row.href)}
      className={cn(
        'group grid min-h-[66px] w-full grid-cols-[4px_minmax(0,1fr)_auto] overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_hsl(215_62%_5%/0.24)]',
        palette.shell,
        row.disabled && 'opacity-75 hover:translate-y-0',
      )}
    >
      <span className={palette.bar} />
      <span className="min-w-0 px-3 py-2">
        <span className={cn('mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.07em]', palette.text)}>
          <span className={cn('grid size-4 place-items-center rounded-full', palette.icon)}>
            <Icon className="size-3" />
          </span>
          {row.label} ({row.count})
        </span>
        <span className="block truncate text-xs font-bold leading-tight text-white">{row.title}</span>
        <span className="mt-0.5 block truncate text-[10px] text-white/66">{row.description}</span>
      </span>
      <span className="flex items-center gap-2 px-2.5 text-[10px] text-white/72">
        <span className="hidden tabular-nums sm:block">{row.meta}</span>
        <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
      </span>
    </button>
  );
};

const ExamPacePanel = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => {
  const { pace } = model;
  const hasPace = pace.state === 'ready';
  const recentDays = model.activityDays.slice(-7);
  const periodDivisor = Math.max(recentDays.length, 1);
  const studiedTopics = recentDays.reduce((total, day) => total + day.studiedCount, 0);
  const completedReviews = recentDays.reduce((total, day) => total + day.reviewedCount, 0);
  const currentTopicsAverage = Number((studiedTopics / periodDivisor).toFixed(1));
  const currentReviewsAverage = Number((completedReviews / periodDivisor).toFixed(1));
  const paceBannerAction = getPaceBannerAction(pace.state);

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            Seu ritmo até a prova
            <Info className="size-4 text-content-muted" />
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="text-right text-[10px] leading-tight text-content-muted transition-colors hover:text-primary">
              <span className="block">Com base nos seus dados reais</span>
              <span className="mt-0.5 block font-semibold text-primary">Entenda o cálculo</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-2">
              <p className="font-semibold text-foreground">Como o ritmo foi calculado</p>
              <p className="text-sm text-content-muted">
                O painel mostra sua média real recente e compara com a meta diária necessária até a prova.
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
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <IntelligentPaceMetric
            label="Tópicos novos"
            required={pace.newTopicsPerDay}
            current={currentTopicsAverage}
            hasActivity={studiedTopics > 0}
            color="hsl(var(--primary))"
            completedLabel="tópicos iniciados"
            data={recentDays.map((day) => ({
              date: day.date,
              value: day.studiedCount,
            }))}
          />
          <IntelligentPaceMetric
            label="Revisões"
            required={pace.reviewsPerDay}
            current={currentReviewsAverage}
            hasActivity={completedReviews > 0}
            color="hsl(var(--warning))"
            completedLabel="revisões concluídas"
            data={recentDays.map((day) => ({
              date: day.date,
              value: day.reviewedCount,
            }))}
          />
        </div>

        <div className="flex min-h-14 items-center gap-3 rounded-xl border border-warning/25 bg-warning/[0.055] px-3 py-2.5 text-left">
          <Info className="size-4 shrink-0 text-content-muted" />
          <span className="min-w-0 flex-1 text-[10px] leading-relaxed text-content-muted">
            {hasPace
              ? `Cálculo baseado em ${pace.daysRemaining} dias restantes, ${pace.unstartedTopics} tópicos pendentes e ${pace.pendingReviews} revisões previstas.`
              : pace.explanation}
          </span>
          {paceBannerAction ? (
            <button
              type="button"
              onClick={() => onNavigate(paceBannerAction.href)}
              className="flex max-w-[108px] shrink-0 items-center gap-1 rounded-lg border border-warning/30 bg-card px-2.5 py-2 text-center text-[10px] font-semibold leading-tight text-foreground shadow-sm transition-colors hover:bg-warning/[0.08]"
            >
              {paceBannerAction.label}
              <ChevronRight className="size-3.5 shrink-0" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const IntelligentPaceMetric = ({
  label,
  required,
  current,
  hasActivity,
  color,
  completedLabel,
  data,
}: {
  label: string;
  required: number | null;
  current: number;
  hasActivity: boolean;
  color: string;
  completedLabel: string;
  data: Array<{ date: string; value: number }>;
}) => {
  const requiredDisplay = formatPaceRequirement(required);
  const isOnPace = required !== null && hasActivity && current >= required;
  const status = required === null
    ? 'Defina a data para calcular a meta'
    : !hasActivity
      ? 'Ainda sem histórico recente'
      : isOnPace
        ? 'Seu ritmo atual já acompanha a meta'
        : `Sua média ainda está abaixo da meta`;

  return (
    <div className="flex min-h-[210px] flex-col rounded-xl border border-border/70 bg-surface/45 px-3.5 py-3.5 shadow-[inset_0_1px_0_hsl(var(--background)/0.6)]">
      <p className="text-[10px] font-medium text-content-muted">Meta diária · {label}</p>
      <div className="mt-3 flex items-end gap-1.5">
        <strong className="text-4xl font-semibold tabular-nums leading-none text-foreground">
          {requiredDisplay.value}
        </strong>
        {requiredDisplay.cadence ? (
          <span className="max-w-24 pb-0.5 text-[11px] leading-tight text-content-muted">{requiredDisplay.cadence}</span>
        ) : null}
      </div>
      <p className={cn('mt-2 text-[11px] font-semibold', isOnPace ? 'text-success' : 'text-content-muted')}>
        {status}
      </p>

      <div className="mt-auto h-[70px] w-full pt-3" aria-label={`Atividade recente de ${label.toLowerCase()}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%">
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0]?.payload as { date: string; value: number };
                return (
                  <div className="rounded-lg border border-border bg-popover px-2.5 py-2 text-[10px] shadow-lg">
                    <p className="font-semibold text-foreground">{format(parseISO(item.date), 'dd/MM', { locale: ptBR })}</p>
                    <p className="mt-0.5 text-content-muted">{item.value} {completedLabel}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 2, 2]} minPointSize={3} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[9px] text-content-muted">
        Seu ritmo real nos últimos 7 dias: {formatPaceValue(current)}
      </p>
    </div>
  );
};

export const RecentRemindersCard = ({
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  isAdding,
  isDeleting,
}: {
  reminders: DashboardReminder[];
  onAddReminder: (text: string, reminderDate: string | null) => Promise<void>;
  onToggleReminder: (id: string, completed: boolean) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  isAdding: boolean;
  isDeleting: boolean;
}) => {
  const [text, setText] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAll, setShowAll] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<DashboardReminder | null>(null);
  const visibleReminders = showAll ? reminders : reminders.filter((reminder) => !reminder.completed).slice(0, 4);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await onAddReminder(trimmed, date || null);
    setText('');
  };

  const handleDelete = async () => {
    if (!reminderToDelete) return;
    await onDeleteReminder(reminderToDelete.id);
    setReminderToDelete(null);
  };

  return (
    <>
      <Card id="lembretes" className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-3 px-4 pb-1.5 pt-4">
        <CardTitle className="text-sm font-extrabold text-foreground sm:text-base">Últimos lembretes</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-1.5 text-[10px] font-semibold text-primary"
          onClick={() => setShowAll((current) => !current)}
        >
          {showAll ? 'Ver recentes' : 'Ver todos'}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 pb-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_30px] items-center gap-1.5 border-b border-border/65 py-1 transition-colors focus-within:border-primary/45">
          <div className="relative min-w-0">
            <Plus className="pointer-events-none absolute left-0 top-1/2 size-3 -translate-y-1/2 text-primary" />
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleSubmit();
              }}
              placeholder="Adicionar lembrete..."
              aria-label="Texto do novo lembrete"
              className="h-7 border-0 bg-transparent px-0 pl-4 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="h-7 gap-1 px-1.5 text-[9px] font-medium text-content-muted hover:bg-muted/50 hover:text-foreground"
                aria-label="Selecionar data do lembrete"
              >
                <Calendar className="size-3" />
                {date ? format(parseISO(date), 'dd/MM', { locale: ptBR }) : 'Data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={date ? parseISO(date) : undefined}
                onSelect={(selectedDate) => setDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')}
                classNames={{
                  day_today:
                    'relative font-bold ring-2 ring-warning ring-offset-2 ring-offset-popover after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-warning',
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            aria-label="Adicionar lembrete"
            onClick={() => void handleSubmit()}
            disabled={isAdding || !text.trim()}
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 rounded-md text-primary hover:bg-primary/10"
          >
            {isAdding ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          </Button>
        </div>

        <div
          data-testid="reminders-list"
          className={cn('flex min-w-0 flex-col overflow-x-hidden', showAll && 'max-h-[330px] overflow-y-auto pr-1')}
        >
          {visibleReminders.length === 0 ? (
            <div className="flex min-h-[210px] flex-col items-center justify-center px-4 py-5 text-center">
              <div className="relative grid size-24 place-items-center sm:size-28">
                <div className="absolute inset-3 grid place-items-center rounded-[28px] bg-primary/8 text-primary">
                  <NotebookPen className="size-9" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <img
                  src="/images/dashboard/reminders-empty-state.png"
                  alt="Bloco de notas vazio com lápis"
                  className="relative h-full w-full object-contain drop-shadow-[0_12px_18px_hsl(var(--primary)/0.12)]"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <p className="mt-1 text-xs font-bold text-foreground">Sua lista está livre</p>
              <p className="mt-1 text-[10px] leading-relaxed text-content-muted">Adicione algo quando precisar.</p>
            </div>
          ) : (
            visibleReminders.map((reminder, index) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                index={index}
                onToggleReminder={onToggleReminder}
                onRequestDelete={setReminderToDelete}
                isDeleting={isDeleting}
              />
            ))
          )}
        </div>
      </CardContent>
      </Card>
      <ConfirmModal
        isOpen={Boolean(reminderToDelete)}
        onClose={() => {
          if (!isDeleting) setReminderToDelete(null);
        }}
        onConfirm={() => void handleDelete()}
        title="Excluir lembrete definitivamente?"
        description={
          reminderToDelete
            ? `“${reminderToDelete.text}” será removido do banco de dados e não poderá ser recuperado.`
            : ''
        }
        confirmText="Excluir definitivamente"
        cancelText="Cancelar"
        isLoading={isDeleting}
        variant="destructive"
        icon={Trash2}
      />
    </>
  );
};

const ReminderRow = ({
  reminder,
  index,
  onToggleReminder,
  onRequestDelete,
  isDeleting,
}: {
  reminder: DashboardReminder;
  index: number;
  onToggleReminder: (id: string, completed: boolean) => Promise<void>;
  onRequestDelete: (reminder: DashboardReminder) => void;
  isDeleting: boolean;
}) => {
  const colors = ['bg-primary', 'bg-warning', 'bg-success', 'bg-border'];

  return (
    <div className="grid min-h-[52px] min-w-0 grid-cols-[3px_24px_minmax(0,1fr)_20px] items-center gap-2.5 border-b border-border/55 last:border-b-0">
      <span className={cn('h-9 w-[3px] rounded-full', colors[index % colors.length])} />
      <Checkbox
        aria-label={reminder.completed ? `Reabrir lembrete: ${reminder.text}` : `Concluir lembrete: ${reminder.text}`}
        checked={reminder.completed}
        onCheckedChange={(checked) => void onToggleReminder(reminder.id, Boolean(checked))}
        className="size-5 rounded-full border-2 border-foreground/45 bg-transparent shadow-none ring-1 ring-inset ring-foreground/10 data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:border-foreground/60 [&_svg]:size-3"
      />
      <div className="min-w-0 py-2">
        <p className={cn('truncate text-[11px] font-semibold leading-tight text-foreground', reminder.completed && 'text-content-muted line-through')}>
          {reminder.text}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[9px] leading-none text-content-muted">
          <Calendar className="size-3" />
          {formatReminderDate(reminder.reminderDate)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Excluir lembrete: ${reminder.text}`}
        disabled={isDeleting}
        onClick={() => onRequestDelete(reminder)}
        className="size-5 justify-self-end rounded-full p-0 text-content-muted/70 hover:bg-transparent hover:text-destructive focus-visible:ring-1 [&_svg]:!size-3"
      >
        <X strokeWidth={1.75} />
      </Button>
    </div>
  );
};

const StudyTrajectoryCard = ({
  model,
  onNavigate,
}: {
  model: DashboardDecisionModel;
  onNavigate: (href: string) => void;
}) => (
  <Card className="overflow-hidden rounded-2xl border-primary/15 bg-[radial-gradient(circle_at_78%_8%,hsl(var(--primary)/0.12),transparent_26%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]">
    <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5">
      <div>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <BarChart3 className="size-[18px] text-primary" /> Sua trajetória
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs">Ritmo, dificuldade e cobrança para orientar suas próximas decisões.</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="grid grid-cols-1 divide-y divide-border/70 p-0 xl:grid-cols-[minmax(430px,1.25fr)_minmax(260px,0.78fr)_minmax(260px,0.78fr)] xl:divide-x xl:divide-y-0">
      <ExamPacePanel model={model} onNavigate={onNavigate} />
      <DifficultyPanel summary={model.difficultySummary} onNavigate={onNavigate} />
      <ChargeMapPanel summary={model.chargeSummary} />
    </CardContent>
  </Card>
);

const StudyConsistencyCard = ({
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
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const selection = getDashboardActivitySelection(model.activityDays, selectedDate);
  const effectiveDate = selection.day?.date ?? null;
  const availableDates = useMemo(() => new Set(model.activityDays.map((day) => day.date)), [model.activityDays]);

  return (
    <Card className="overflow-hidden rounded-2xl border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="size-[18px] text-primary" /> Consistência recente
          </CardTitle>
          <CardDescription className="mt-0.5 text-xs">
            {formatMinutes(totalMinutes)} registrados · {model.activityDays.filter((day) => day.totalDurationMinutes > 0).length} dias ativos
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            value={String(activityRange)}
            onValueChange={(value) => {
              if (value === '7' || value === '14' || value === '30') {
                setSelectedDate(null);
                onActivityRangeChange(Number(value) as 7 | 14 | 30);
              }
            }}
            className="rounded-lg border border-border/70 bg-background/30 p-0.5"
          >
            <ToggleGroupItem className="h-7 px-2 text-[10px]" value="7">7 dias</ToggleGroupItem>
            <ToggleGroupItem className="h-7 px-2 text-[10px]" value="14">14 dias</ToggleGroupItem>
            <ToggleGroupItem className="h-7 px-2 text-[10px]" value="30">Mês</ToggleGroupItem>
          </ToggleGroup>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="size-8 shrink-0" aria-label="Selecionar dia da atividade">
                <Calendar className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={effectiveDate ? parseISO(effectiveDate) : undefined}
                onSelect={(date) => {
                  setSelectedDate(date ? format(date, 'yyyy-MM-dd') : null);
                }}
                disabled={(date) => !availableDates.has(format(date, 'yyyy-MM-dd'))}
                classNames={{
                  day_today: 'border border-primary/70 bg-primary/10 font-bold text-primary',
                }}
                initialFocus
              />
              <div className="flex items-center justify-between border-t border-border/70 p-2">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={() => setSelectedDate(null)}>
                  Limpar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px] font-semibold text-primary"
                  onClick={() => setSelectedDate(todayDate)}
                >
                  Hoje
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 divide-y divide-border/70 p-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)] lg:divide-x lg:divide-y-0">
        <div className="min-w-0 p-4 sm:p-5">
          <ActivityBars
            days={model.activityDays}
            selectedDate={effectiveDate}
            onSelectDate={(date) => setSelectedDate((current) => (current === date ? null : date))}
          />
        </div>
        {selection.day ? (
          <ActivityDayDetails selection={selection} onNavigate={onNavigate} />
        ) : (
          <ActivityPeriodSummary days={model.activityDays} range={activityRange} />
        )}
      </CardContent>
    </Card>
  );
};

const ActivityDayDetails = ({
  selection,
  onNavigate,
}: {
  selection: ReturnType<typeof getDashboardActivitySelection>;
  onNavigate: (href: string) => void;
}) => {
  const day = selection.day;
  const hasActivity = selection.studies.length > 0 || selection.reviews.length > 0;

  if (!day) {
    return (
      <div className="flex min-h-64 items-center justify-center p-5 text-center text-xs text-content-muted">
        Selecione um dia no gráfico ou no calendário para ver os estudos e revisões.
      </div>
    );
  }

  const formattedDate = format(parseISO(day.date), "EEEE, dd 'de' MMMM", { locale: ptBR })
    .replace('-feira', '')
    .replace(/^./, (character) => character.toUpperCase());

  return (
    <div className="min-w-0 p-4 sm:p-5">
      <div className="flex min-h-[272px] flex-col overflow-hidden rounded-xl border border-border/80 bg-background/35 shadow-[0_8px_26px_hsl(var(--foreground)/0.05)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/35 px-3.5 py-3">
          <p className="min-w-0 truncate text-xs font-bold text-foreground">
            {formattedDate}
          </p>
          <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium tabular-nums text-content-muted">
            {formatMinutes(day.totalDurationMinutes)} totais
            <ChevronUp className="size-3.5" />
          </span>
        </div>

        {hasActivity ? (
          <div className="flex max-h-[230px] flex-1 flex-col gap-4 overflow-y-auto px-3.5 py-3">
            <ActivityDetailGroup
              icon={BookOpen}
              title="Estudados"
              entries={selection.studies}
              tone="bg-primary/10 text-primary"
              countLabel={selection.studies.length === 1 ? 'tópico' : 'tópicos'}
            />
            <ActivityDetailGroup
              icon={RefreshCw}
              title="Revisados"
              entries={selection.reviews}
              tone="bg-warning/10 text-warning"
              countLabel={selection.reviews.length === 1 ? 'revisão' : 'revisões'}
            />
          </div>
        ) : (
          <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 px-4 py-5 text-center">
            <Calendar className="size-5 text-content-muted" />
            <p className="text-xs font-semibold text-foreground">Nenhum estudo ou revisão registrado</p>
            <p className="max-w-xs text-[10px] leading-relaxed text-content-muted">Escolha outro dia no gráfico ou no calendário.</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="mt-auto h-9 justify-center rounded-none border-t border-border/70 px-3 text-[10px] font-semibold text-primary hover:bg-primary/[0.05]"
          onClick={() => onNavigate(`/estatisticas?date=${day.date}`)}
        >
          Ver tudo
        </Button>
      </div>
    </div>
  );
};

export const ActivityPeriodSummary = ({
  days,
  range,
}: {
  days: DashboardActivityDay[];
  range: 7 | 14 | 30;
}) => {
  const [expanded, setExpanded] = useState(false);
  const entries = days.flatMap((day) => day.entries);
  const studies = entries.filter((entry) => entry.type === 'study');
  const reviews = entries.filter((entry) => entry.type === 'review');
  const visibleStudies = expanded ? studies : studies.slice(0, 2);
  const visibleReviews = expanded ? reviews : reviews.slice(0, 2);
  const hasHiddenEntries = studies.length > visibleStudies.length || reviews.length > visibleReviews.length;
  const totalMinutes = days.reduce((total, day) => total + day.totalDurationMinutes, 0);
  const activeDays = days.filter((day) => day.totalDurationMinutes > 0).length;
  const hasActivity = studies.length > 0 || reviews.length > 0;

  return (
    <div className="min-w-0 p-4 sm:p-5">
      <div
        data-testid="activity-period-card"
        className="flex h-[272px] flex-col overflow-hidden rounded-xl border border-border/80 bg-background/35 shadow-[0_8px_26px_hsl(var(--foreground)/0.05)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-muted/35 px-3.5 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-foreground">Resumo dos últimos {range} dias</p>
            <p className="mt-0.5 text-[9px] text-content-muted">{activeDays} dias ativos</p>
          </div>
          <span className="shrink-0 text-[10px] font-medium tabular-nums text-content-muted">{formatMinutes(totalMinutes)} totais</span>
        </div>

        {hasActivity ? (
          <div
            data-testid="activity-period-list"
            className={cn(
              'flex min-h-0 flex-1 flex-col gap-4 px-3.5 py-3',
              expanded ? 'overflow-y-auto' : 'overflow-hidden',
            )}
          >
            <ActivityDetailGroup
              icon={BookOpen}
              title="Estudados"
              entries={visibleStudies}
              summaryEntries={studies}
              tone="bg-primary/10 text-primary"
              countLabel={studies.length === 1 ? 'tópico' : 'tópicos'}
            />
            <ActivityDetailGroup
              icon={RefreshCw}
              title="Revisados"
              entries={visibleReviews}
              summaryEntries={reviews}
              tone="bg-warning/10 text-warning"
              countLabel={reviews.length === 1 ? 'revisão' : 'revisões'}
            />
          </div>
        ) : (
          <div className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 px-4 py-5 text-center">
            <BarChart3 className="size-5 text-content-muted" />
            <p className="text-xs font-semibold text-foreground">Nenhuma atividade neste período</p>
            <p className="max-w-xs text-[10px] leading-relaxed text-content-muted">Os estudos e revisões aparecerão aqui conforme forem registrados.</p>
          </div>
        )}

        {(expanded || hasHiddenEntries) && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-auto h-9 shrink-0 justify-center rounded-none border-t border-border/70 px-3 text-[10px] font-semibold text-primary hover:bg-primary/[0.05]"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
          >
            {expanded ? 'Recolher' : 'Ver tudo'}
          </Button>
        )}
      </div>
    </div>
  );
};

const ActivityDetailGroup = ({
  icon: Icon,
  title,
  entries,
  summaryEntries = entries,
  tone,
  countLabel,
}: {
  icon: typeof BookOpen;
  title: string;
  entries: DashboardActivityDay['entries'];
  summaryEntries?: DashboardActivityDay['entries'];
  tone: string;
  countLabel: string;
}) => {
  if (entries.length === 0) return null;
  const totalMinutes = summaryEntries.reduce((total, entry) => total + entry.durationMinutes, 0);

  return (
    <section className="min-w-0">
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <span className={cn('grid size-5 shrink-0 place-items-center rounded-md', tone)}>
          <Icon className="size-3.5" />
        </span>
        <p className="min-w-0 flex-1 text-[11px] font-bold text-foreground">{title}</p>
        <span className="shrink-0 text-[9px] font-medium tabular-nums text-content-muted">
          {summaryEntries.length} {countLabel} · {formatMinutes(totalMinutes)}
        </span>
      </div>
      <div className="space-y-2 pl-7">
        {entries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-[5px_minmax(0,1fr)_48px] items-start gap-2 text-[10px] leading-4">
            <span className="mt-[6px] size-1 rounded-full bg-content-muted/75" />
            <p className="min-w-0 truncate text-foreground/75" title={`${entry.subjectName ? `${entry.subjectName} — ` : ''}${entry.topicName}`}>
              {entry.subjectName ? `${entry.subjectName} · ` : ''}{entry.topicName}
            </p>
            <span className="w-12 text-right font-medium tabular-nums text-foreground">{formatMinutes(entry.durationMinutes)}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

interface ActivityChartDatum {
  date: string;
  weekday: string;
  shortDate: string;
  minutes: number;
  fill: string;
  day: DashboardActivityDay;
}

const getActivityColor = (minutes: number) => {
  if (minutes >= 180) return 'hsl(var(--primary))';
  if (minutes >= 60) return 'hsl(var(--success))';
  if (minutes > 0) return 'hsl(var(--warning))';
  return 'hsl(var(--muted-foreground) / 0.35)';
};

const ActivityBars = ({
  days,
  selectedDate,
  onSelectDate,
}: {
  days: DashboardActivityDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) => {
  const data = days.map<ActivityChartDatum>((day) => ({
    date: day.date,
    weekday: format(parseISO(day.date), 'EEE', { locale: ptBR })
      .replace('.', '')
      .replace(/^./, (character) => character.toUpperCase()),
    shortDate: format(parseISO(day.date), 'dd/MM', { locale: ptBR }),
    minutes: day.totalDurationMinutes,
    fill: getActivityColor(day.totalDurationMinutes),
    day,
  }));
  const minWidth = days.length <= 7 ? '100%' : `${days.length * 54}px`;

  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="h-[190px]" style={{ minWidth }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 22, right: 4, bottom: 8, left: 4 }}
            barCategoryGap="24%"
            className="cursor-pointer"
            onClick={(state) => {
              const datum = state.activePayload?.[0]?.payload as ActivityChartDatum | undefined;
              if (datum) onSelectDate(datum.date);
            }}
          >
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 4" opacity={0.55} />
            <YAxis hide domain={[0, 'dataMax + 30']} />
            <XAxis
              dataKey="weekday"
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              tickMargin={8}
              interval={0}
              height={44}
              tick={(props) => <ActivityAxisTick {...props} data={data} />}
            />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.35)', radius: 6 }}
              content={<ActivityChartTooltip />}
              offset={24}
              wrapperStyle={{ outline: 'none', zIndex: 30, pointerEvents: 'none' }}
            />
            <Bar dataKey="minutes" radius={[6, 6, 3, 3]} maxBarSize={30} minPointSize={4}>
              <LabelList
                dataKey="minutes"
                position="top"
                formatter={(value: number) => formatBarMinutes(value)}
                className="fill-foreground text-[10px] font-semibold"
              />
              {data.map((item) => (
                <Cell
                  key={item.date}
                  fill={item.date === selectedDate ? 'hsl(var(--activity-selected))' : item.fill}
                  fillOpacity={item.date === selectedDate ? 1 : 0.82}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-2 text-[9px] text-content-muted">
        <ActivityLegend color="bg-primary" label="≥ 3h" />
        <ActivityLegend color="bg-success" label="1–2,9h" />
        <ActivityLegend color="bg-warning" label="< 1h" />
        <ActivityLegend color="bg-muted-foreground/40" label="0h" />
      </div>
    </div>
  );
};

const ActivityAxisTick = ({
  x,
  y,
  payload,
  data,
}: {
  x?: number;
  y?: number;
  payload?: { index: number; value: string };
  data: ActivityChartDatum[];
}) => {
  if (x === undefined || y === undefined || !payload) return null;
  const item = data[payload.index];
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="hsl(var(--content-muted))" fontSize="9" fontWeight="600">
        {payload.value}
      </text>
      <text y="13" textAnchor="middle" fill="hsl(var(--content-muted))" fontSize="8">
        {item?.shortDate}
      </text>
    </g>
  );
};

const ActivityLegend = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1">
    <span className={cn('size-1.5 rounded-sm', color)} />
    {label}
  </span>
);

const ActivityChartTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ActivityChartDatum }>;
}) => {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;

  const minutesByType = datum.day.entries.reduce(
    (acc, entry) => {
      acc[entry.type] += entry.durationMinutes;
      return acc;
    },
    { study: 0, review: 0, questions: 0 },
  );

  return (
    <div className="w-60 overflow-hidden rounded-xl border border-primary/20 bg-popover/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
        <p className="text-xs font-bold capitalize text-foreground">
          {format(parseISO(datum.date), "EEEE, dd/MM", { locale: ptBR })}
        </p>
        <span className="text-xs font-bold tabular-nums text-foreground">{formatMinutes(datum.minutes)}</span>
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <TooltipMetric color="bg-primary" label="Estudo de tópicos" value={minutesByType.study} />
        <TooltipMetric color="bg-success" label="Revisões" value={minutesByType.review} />
        <TooltipMetric color="bg-warning" label="Questões" value={minutesByType.questions} />
      </div>
    </div>
  );
};

const TooltipMetric = ({ color, label, value }: { color: string; label: string; value: number }) => (
  <div className="flex items-center gap-2 text-[10px]">
    <span className={cn('size-2 rounded-sm', color)} />
    <span className="flex-1 text-content-muted">{label}</span>
    <span className="font-semibold tabular-nums text-foreground">{formatMinutes(value)}</span>
  </div>
);

const ProgressPanel = ({
  model,
  onNavigate,
  compact = false,
}: {
  model: DashboardDecisionModel;
  onNavigate: (href: string) => void;
  compact?: boolean;
}) => (
  <div className={cn('flex min-w-0 flex-col p-4 sm:p-5', compact ? 'gap-3' : 'gap-4')}>
    <div className="flex items-start justify-between gap-2">
      <div>
      <p className="text-sm font-semibold text-foreground">Progresso do edital</p>
        <p className="mt-0.5 text-[10px] text-content-muted">{model.progressSummary.totalTopics} tópicos no ciclo</p>
      </div>
    </div>

    <div className={cn('grid items-center gap-3', compact ? 'grid-cols-[86px_minmax(0,1fr)] sm:grid-cols-[96px_minmax(0,1fr)]' : 'grid-cols-[96px_minmax(0,1fr)] sm:grid-cols-[108px_minmax(0,1fr)] sm:gap-4')}>
      <div
        className={cn('mx-auto grid place-items-center rounded-full shadow-[0_0_24px_hsl(var(--primary)/0.14)]', compact ? 'size-[86px] p-[7px] sm:size-24' : 'size-[108px] p-[9px]')}
        style={{
          background: `conic-gradient(hsl(var(--primary)) 0 ${model.progressSummary.editalProgressPercentage}%, hsl(var(--border)) ${model.progressSummary.editalProgressPercentage}% 100%)`,
        }}
        role="img"
        aria-label={`${model.progressSummary.editalProgressPercentage}% do edital iniciado`}
      >
        <div className="grid size-full place-items-center rounded-full bg-card">
          <div className="text-center">
            <span className={cn('block font-black tabular-nums leading-none text-foreground', compact ? 'text-xl' : 'text-2xl')}>
              {model.progressSummary.editalProgressPercentage}%
            </span>
            <span className="mt-1 block text-[9px] text-content-muted">edital iniciado</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <ProgressLegend color="bg-primary" label="Iniciados" value={model.progressSummary.startedTopics} />
        <ProgressLegend color="bg-warning" label="Em andamento" value={model.progressSummary.inProgressTopics} />
        <ProgressLegend color="bg-muted-foreground/45" label="Não iniciados" value={model.totals.unstartedTopics} />
        <div className="flex items-center justify-between border-t border-border/70 pt-2 text-[10px]">
          <span className="text-content-muted">Total de tópicos</span>
          <span className="font-bold tabular-nums text-foreground">{model.progressSummary.totalTopics}</span>
        </div>
      </div>
    </div>

    <Button variant="ghost" size="sm" className="h-7 justify-start px-0 text-[10px] text-primary hover:bg-transparent" onClick={() => onNavigate('/ciclo-estudos')}>
      Ver progresso por matéria
      <ArrowRight data-icon="inline-end" />
    </Button>
  </div>
);

const ProgressLegend = ({ color, label, value }: { color: string; label: string; value: number }) => (
  <div className="flex items-center gap-2 text-[10px]">
    <span className={cn('size-2 rounded-sm', color)} />
    <span className="min-w-0 flex-1 truncate text-content-muted">{label}</span>
    <span className="font-bold tabular-nums text-foreground">{value}</span>
  </div>
);

const DifficultyPanel = ({ summary, onNavigate }: { summary: DashboardDifficultySummary; onNavigate: (href: string) => void }) => {
  const items = [
    { label: 'Fácil', value: summary.easy, tone: 'success' as const },
    { label: 'Médio', value: summary.medium, tone: 'warning' as const },
    { label: 'Difícil', value: summary.hard, tone: 'danger' as const },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Mapa de dificuldade</p>
          <p className="mt-0.5 text-[10px] text-content-muted">Com base nas suas marcações</p>
        </div>
        <CircleAlert className="size-4 text-content-muted" />
      </div>

      {summary.totalRated === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed text-content-muted">
          Ainda não há tópicos avaliados. O mapa aparece quando você marcar dificuldade ao estudar ou revisar.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <DifficultyRing key={item.label} label={item.label} value={item.value} total={summary.totalRated} tone={item.tone} />
          ))}
        </div>
      )}

      <Button variant="ghost" size="sm" className="h-8 justify-start px-0 text-xs text-primary hover:bg-transparent" onClick={() => onNavigate('/ciclo-estudos')}>
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
    <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <div
        className="grid size-[68px] place-items-center rounded-full p-[5px] sm:size-[76px]"
        style={{ background: `conic-gradient(${color} 0 ${valuePercent}%, hsl(var(--border)) ${valuePercent}% 100%)` }}
      >
        <div className="grid size-full place-items-center rounded-full bg-card">
          <span className="text-base font-black tabular-nums text-foreground sm:text-lg">{valuePercent}%</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className={cn('text-[10px] font-semibold', toneStyles[tone].soft, 'rounded-full border px-2 py-0.5')}>{label}</p>
        <p className="mt-1 whitespace-nowrap text-[9px] tabular-nums text-content-muted">{value} tópicos</p>
      </div>
    </div>
  );
};
