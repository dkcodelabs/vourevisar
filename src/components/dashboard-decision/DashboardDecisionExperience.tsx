import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  BriefcaseBusiness,
  GraduationCap,
  Info,
  ListChecks,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type {
  ChargeCoverageState,
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

      <ChargeMapCard summary={model.chargeSummary} onNavigate={onNavigate} />

      <StudyTrajectoryCard
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

const ChargeMapCard = ({
  summary,
  onNavigate,
}: {
  summary: DashboardChargeSummary;
  onNavigate: (href: string) => void;
}) => {
  const distribution = [
    { key: 'low' as const, label: 'Baixa', value: summary.low },
    { key: 'medium' as const, label: 'Média', value: summary.medium },
    { key: 'high' as const, label: 'Alta', value: summary.high },
  ];
  const priorityRows = [
    summary.highOverdue.count > 0
      ? {
          key: 'overdue',
          icon: Clock3,
          title: 'Alta cobrança + revisão atrasada',
          description: 'Revisão vencida em conteúdo de alto impacto.',
          count: summary.highOverdue.count,
          href: summary.highOverdue.topicId ? `/revisoes?topicId=${summary.highOverdue.topicId}` : '/revisoes',
          action: 'Revisar agora',
          iconClass: 'border-destructive/25 bg-destructive/10 text-destructive',
          actionClass: 'border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15',
        }
      : null,
    summary.highUnstarted.count > 0
      ? {
          key: 'unstarted',
          icon: BookOpen,
          title: 'Alta cobrança + não iniciada',
          description: 'Ainda sem primeiro contato no ciclo.',
          count: summary.highUnstarted.count,
          href: '/ciclo-estudos',
          action: 'Começar',
          iconClass: 'border-warning/25 bg-warning/10 text-warning',
          actionClass: 'border-warning/25 bg-warning/10 text-warning hover:bg-warning/15',
        }
      : null,
    summary.highInReview.count > 0
      ? {
          key: 'reviewing',
          icon: RefreshCw,
          title: 'Alta cobrança + em revisão',
          description: 'Conteúdo importante com estudo em andamento.',
          count: summary.highInReview.count,
          href: summary.highInReview.topicId ? `/revisoes?topicId=${summary.highInReview.topicId}` : '/ciclo-estudos',
          action: 'No ritmo',
          iconClass: 'border-info/25 bg-info/10 text-info',
          actionClass: 'border-info/25 bg-info/10 text-info hover:bg-info/15',
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: typeof Clock3;
    title: string;
    description: string;
    count: number;
    href: string;
    action: string;
    iconClass: string;
    actionClass: string;
  }>;

  return (
    <Card className="overflow-hidden rounded-2xl border-incidence/15 bg-[radial-gradient(circle_at_90%_0%,hsl(var(--incidence)/0.11),transparent_30%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]">
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-incidence/20 bg-incidence/10 text-incidence sm:size-10">
              <Target className="size-[18px] sm:size-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Mapa de cobrança</CardTitle>
              <CardDescription className="mt-0.5 text-xs sm:text-sm">
                Sinal da prova cruzado com seu estágio de estudo.
              </CardDescription>
            </div>
          </div>
          <CircleAlert className="size-5 shrink-0 text-content-muted" aria-label="Percentuais calculados apenas entre tópicos analisados" />
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 pt-0 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-background/25 p-3 sm:p-4">
          {summary.analyzedTopics === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
              <Target className="size-6 text-content-muted" />
              <p className="text-sm font-semibold text-foreground">Nenhum tópico classificado ainda</p>
              <p className="max-w-sm text-xs leading-relaxed text-content-muted">
                O mapa aparece conforme os tópicos do edital recebem nível de cobrança.
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-[11px] font-semibold text-content-muted sm:text-xs">
                Distribuição entre os tópicos analisados
              </p>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border/70 pt-3 text-[10px] text-content-muted sm:text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                  <CheckCircle2 className="size-3.5 text-success" />
                  {summary.analyzedTopics} de {summary.totalTopics} analisados
                </span>
                {summary.unanalyzedTopics > 0 ? (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>{summary.unanalyzedTopics} ainda sem análise</span>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-1 flex-col divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-background/20">
            {priorityRows.length > 0 ? (
              priorityRows.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.href)}
                    className="group grid min-h-[74px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45 sm:px-4"
                  >
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl border', item.iconClass)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-xs font-semibold leading-snug text-foreground sm:text-sm">{item.title}</span>
                        <Badge variant="outline" className="border-incidence/20 bg-incidence/10 px-1.5 py-0 text-[9px] text-incidence sm:text-[10px]">
                          {item.count}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-content-muted sm:text-xs">{item.description}</span>
                    </span>
                    <span className={cn('hidden min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold sm:inline-flex', item.actionClass)}>
                      {item.action}
                      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 p-5 text-center">
                <CheckCircle2 className="size-6 text-success" />
                <p className="text-sm font-semibold text-foreground">Nenhuma prioridade de alta cobrança pendente</p>
                <p className="max-w-md text-xs leading-relaxed text-content-muted">
                  Os tópicos classificados como alta cobrança não estão atrasados nem aguardando primeiro contato.
                </p>
              </div>
            )}
          </div>

          <Button className="mt-3 min-h-11 w-full text-xs sm:text-sm" onClick={() => onNavigate('/ciclo-estudos')}>
            <Target data-icon="inline-start" />
            Ver tópicos de alta cobrança
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>
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
      : '--';

  return (
    <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-[radial-gradient(circle_at_38%_-35%,hsl(var(--primary)/0.2),transparent_42%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))] shadow-[0_20px_60px_-42px_hsl(var(--primary)/0.65)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-3 lg:grid-cols-[minmax(280px,1.1fr)_172px_minmax(390px,1.15fr)] lg:items-center lg:gap-6">
          <div className="col-span-4 min-w-0 lg:col-span-1">
            <div className="flex min-w-0 items-start gap-2">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary sm:size-[18px] lg:size-5" />
              <h1 className="max-w-3xl break-words text-base font-bold leading-tight text-foreground sm:text-lg lg:text-2xl">
                {examContext.editalName || 'Nenhum edital carregado no ciclo'}
              </h1>
            </div>
            {examContext.position ? (
              <p className="mt-1.5 flex min-w-0 items-center gap-2 text-xs font-medium text-content-muted sm:text-sm lg:mt-2 lg:text-base">
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

          <div className="col-span-3 grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2 lg:col-span-1 lg:gap-3">
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
    className="relative grid size-[76px] shrink-0 place-items-center [filter:drop-shadow(0_0_12px_hsl(var(--primary)/0.24))] sm:size-24 lg:size-40 lg:[filter:drop-shadow(0_0_18px_hsl(var(--primary)/0.24))]"
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
    <div className="relative z-10 flex w-[70px] max-w-full flex-col items-center justify-center overflow-hidden pt-1 text-center sm:w-[86px] lg:w-[126px] lg:pt-2">
      <span className="text-[19px] font-black tabular-nums leading-none text-foreground sm:text-[25px] lg:text-[2.65rem]">{daysLabel}</span>
      <span className="mt-0.5 block max-w-full whitespace-nowrap text-[6.5px] font-semibold leading-none text-content-muted sm:text-[8px] lg:mt-1 lg:text-xs">
        {isMissingDate ? 'Defina a data' : 'Dias para a prova'}
      </span>
      <span className="mt-1 block max-w-full whitespace-nowrap text-[6px] font-medium tabular-nums leading-none text-content-muted/80 sm:text-[7px] lg:mt-1.5 lg:text-[11px]">
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
    className="group flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-border/70 bg-card/65 p-1 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:min-h-24 sm:gap-1.5 sm:rounded-xl sm:p-2 lg:min-h-20 lg:flex-row lg:justify-start lg:gap-3 lg:p-3 lg:text-left"
  >
    <span className={cn('grid size-7 shrink-0 place-items-center rounded-full border sm:size-8 lg:size-10', toneStyles[tone].soft, toneStyles[tone].glow)}>
      <Icon className="size-3.5 sm:size-4 lg:size-5" />
    </span>
    <span className="min-w-0">
      <span className="block text-lg font-black leading-none text-foreground sm:text-xl lg:text-2xl">{value}</span>
      <span className="mt-0.5 block text-[8px] font-semibold leading-tight text-content-muted sm:text-[10px] lg:mt-1 lg:text-xs">{label}</span>
    </span>
  </button>
);

const NextBestActionCard = ({ action, onNavigate }: { action: DashboardAction; onNavigate: (href: string) => void }) => {
  const tone = toneStyles[action.tone];
  const reasons = [
    action.reason,
    action.scientificBasis || 'Ordem calculada com base nos dados atuais.',
    'Ao concluir, a fila recalcula automaticamente.',
  ];

  return (
    <Card className={cn('overflow-hidden rounded-2xl border-primary/20 bg-[radial-gradient(circle_at_82%_18%,hsl(var(--primary)/0.16),transparent_32%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]', tone.glow)}>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.75fr)]">
          <div className="flex min-w-0 flex-col p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-bold text-foreground sm:text-lg">Melhor próxima ação</h2>
              <Badge className={cn('border px-2 py-0 text-[10px]', tone.soft)} variant="outline">
                {getActionLabel(action.kind)}
              </Badge>
            </div>

            <div className="mt-4 flex min-w-0 flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-muted">
                {action.kind.includes('review') ? 'O que revisar' : 'O que estudar'}
              </p>
              <h3 className="max-w-2xl text-pretty break-words text-xl font-extrabold leading-[1.15] text-foreground sm:text-2xl">
                {action.target.topicName || action.title}
              </h3>
              {action.target.subjectName ? (
                <p className="flex min-w-0 items-center gap-2 text-xs text-content-muted">
                  <BookOpen className="size-4 shrink-0" />
                  <span className="truncate">{action.target.subjectName}</span>
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-content-muted">{action.description}</p>
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4">
              <div className="flex min-w-0 items-start gap-2.5">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-content-muted">Base da recomendação</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-foreground">{action.scientificBasis || action.reason}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button size="sm" onClick={() => onNavigate(action.primaryHref)}>
                  {action.primaryLabel}
                  <ArrowRight data-icon="inline-end" />
                </Button>
                {action.secondaryHref ? (
                  <Button size="sm" variant="outline" onClick={() => onNavigate(action.secondaryHref)}>
                    {action.secondaryLabel || 'Abrir'}
                  </Button>
                ) : null}
              </div>
            </div>

            <details className="group mt-3 border-t border-border/70 pt-3 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-foreground">
                <Brain className="size-4 text-primary" />
                Por que esta ação agora?
                <ChevronRight className="ml-auto size-4 text-content-muted transition-transform group-open:rotate-90" />
              </summary>
              <div className="relative mt-3 flex flex-col gap-2.5 pl-5">
                <span className="absolute bottom-1 left-[5px] top-1 w-px bg-border" />
                {reasons.map((item, index) => (
                  <div key={`mobile:${index}:${item}`} className="relative text-[11px] leading-relaxed text-content-muted">
                    <span className={cn('absolute -left-[18px] top-1 size-2.5 rounded-full border-2 border-card', tone.accent)} />
                    {item}
                  </div>
                ))}
              </div>
            </details>
          </div>

          <div className="hidden border-t border-border/70 bg-background/25 p-4 sm:p-5 lg:block lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col justify-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="size-[18px] text-primary" />
                <h4 className="text-sm font-bold text-foreground">Por que agora?</h4>
              </div>
              <div className="relative flex flex-col gap-3 pl-5">
                <span className="absolute bottom-1.5 left-[5px] top-1.5 w-px bg-border" />
                {reasons.map((item, index) => (
                  <div key={`${index}:${item}`} className="relative text-xs leading-relaxed text-content-muted">
                    <span className={cn('absolute -left-[18px] top-1 size-2.5 rounded-full border-2 border-card', tone.accent)} />
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
  <Card className="overflow-hidden rounded-2xl">
    <CardHeader className="flex-row items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div>
        <CardTitle className="text-base sm:text-lg">Hoje, em ordem</CardTitle>
        <CardDescription className="mt-0.5 text-xs">Ações prioritárias para manter o cronograma.</CardDescription>
      </div>
      <Button variant="ghost" size="sm" className="shrink-0 text-primary" onClick={() => onNavigate('/revisoes')}>
        Ver todas
        <ChevronRight data-icon="inline-end" />
      </Button>
    </CardHeader>
    <CardContent className="p-0">
      {actions.length === 0 ? (
        <div className="border-t border-success/20 bg-success/10 p-4 text-sm text-success">
          Tudo em dia por aqui. Avance o próximo estudo do ciclo.
        </div>
      ) : (
        <div className="divide-y divide-border/70 border-t border-border/70">
          {actions.map((action) => <QueueActionRow key={action.id} action={action} onNavigate={onNavigate} />)}
        </div>
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
      className="group grid w-full grid-cols-[3px_minmax(0,1fr)_auto] bg-card/40 text-left transition-colors hover:bg-muted/35 sm:grid-cols-[3px_minmax(0,1fr)_auto_auto]"
    >
      <span className={tone.accent} />
      <span className="min-w-0 px-3 py-3.5 sm:px-4">
        <span className="mb-1 flex min-w-0 items-center gap-2">
          <Badge variant="outline" className={cn('shrink-0 border px-1.5 py-0 text-[9px]', tone.soft)}>
            {getActionLabel(action.kind)}
          </Badge>
          <span className="truncate text-sm font-bold text-foreground">{action.title}</span>
        </span>
        <span className="block truncate text-[11px] text-content-muted sm:text-xs">{action.description}</span>
      </span>
      <span className="hidden items-center px-3 py-3 text-xs tabular-nums text-content-muted sm:flex">
        {action.dueDate ? formatDate(action.dueDate) : action.kind === 'start_cycle_topic' ? 'Primeiro contato' : 'Sem data'}
      </span>
      <span className="hidden items-center gap-1.5 px-4 py-3 text-xs font-semibold text-primary sm:flex">
        {action.primaryLabel}
        <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
      </span>
      <span className="flex items-center px-3 text-primary sm:hidden">
        <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
      </span>
    </button>
  );
};

const ExamPaceCard = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => {
  const { pace, chargeCoverage } = model;
  const hasPace = pace.state === 'ready';

  return (
    <Card className="overflow-hidden rounded-2xl border-primary/15 bg-[radial-gradient(circle_at_8%_24%,hsl(var(--success)/0.12),transparent_28%),linear-gradient(145deg,hsl(var(--card)),hsl(var(--surface)))]">
      <CardHeader className="flex-row items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="size-[18px] text-primary" /> Ritmo até a prova
          </CardTitle>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs text-primary">
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
      <CardContent className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="grid items-center gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
          <div
            className="mx-auto grid size-[104px] place-items-center rounded-full p-[7px] shadow-[0_0_28px_hsl(var(--primary)/0.13)]"
            style={{
              background:
                'conic-gradient(from 205deg, hsl(var(--success)) 0 25%, hsl(var(--primary)) 25% 78%, hsl(var(--border)) 78% 100%)',
            }}
            role="img"
            aria-label={hasPace ? `${pace.daysRemaining} dias restantes até a prova` : pace.explanation}
          >
            <div className="grid size-full place-items-center rounded-full bg-card shadow-[inset_0_0_20px_hsl(var(--primary)/0.06)]">
              <div className="text-center">
                <div className="text-2xl font-black tabular-nums leading-none text-foreground">{pace.daysRemaining ?? '--'}</div>
                <div className="mt-1 text-[10px] font-medium leading-tight text-content-muted">
                  {pace.daysRemaining === null ? 'Sem data' : 'dias restantes'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-border/70 sm:border-l sm:pl-4">
            <PaceMetric label="Tópicos a iniciar" value={pace.unstartedTopics} />
            <PaceMetric
              label="Ritmo necessário"
              value={pace.newTopicsPerDay === null ? '--' : pace.newTopicsPerDay}
              detail="tópicos/dia"
              highlight
            />
            <PaceMetric label="Revisões até a prova" value={pace.pendingReviews} />
            <PaceMetric
              label="Ritmo necessário"
              value={pace.reviewsPerDay === null ? '--' : pace.reviewsPerDay}
              detail="revisões/dia"
              highlight
            />
          </div>
        </div>

        {!hasPace ? (
          <button
            type="button"
            onClick={() => onNavigate('/ciclo-estudos')}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 text-left text-xs text-content-muted transition-colors hover:bg-primary/10"
          >
            <Info className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">{pace.explanation}</span>
            <span className="shrink-0 font-semibold text-primary">Definir data</span>
            <ChevronRight className="size-4 shrink-0 text-primary" />
          </button>
        ) : null}

        <ChargeCoverageNotice state={chargeCoverage} onNavigate={onNavigate} />
      </CardContent>
    </Card>
  );
};

const PaceMetric = ({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: number | string;
  detail?: string;
  highlight?: boolean;
}) => (
  <div className="min-w-0">
    <p className="truncate text-[10px] text-content-muted">{label}</p>
    <p className={cn('mt-0.5 text-xl font-black tabular-nums leading-none text-foreground', highlight && 'text-primary')}>{value}</p>
    {detail ? <p className="mt-1 text-[10px] font-medium text-content-muted">{detail}</p> : null}
  </div>
);

const ChargeCoverageNotice = ({ state, onNavigate }: { state: ChargeCoverageState; onNavigate: (href: string) => void }) => {
  if (state === 'sufficient') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/[0.07] px-3 py-2 text-[11px] text-success">
        <Check className="size-4 shrink-0" /> Análise de cobrança suficiente para alertas estratégicos.
      </div>
    );
  }

  if (state === 'partial') {
    return (
      <button
        type="button"
        onClick={() => onNavigate('/meus-editais')}
        className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/[0.07] px-3 py-2 text-left text-[11px] text-warning"
      >
        <AlertTriangle className="size-4 shrink-0" /> Análise de cobrança parcial. Seu ritmo pode mudar.
        <ChevronRight className="ml-auto size-4 shrink-0" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onNavigate('/meus-editais')}
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-[11px] text-content-muted"
    >
      <Info className="size-4 shrink-0" /> Sem dados de cobrança. Ciclo e revisões seguem como fonte principal.
      <ChevronRight className="ml-auto size-4 shrink-0" />
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
    <Card className="overflow-hidden rounded-2xl border-primary/15 bg-[radial-gradient(circle_at_78%_8%,hsl(var(--primary)/0.12),transparent_26%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]">
      <CardHeader className="border-b border-border/70 px-4 py-4 sm:px-5">
        <div>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="size-[18px] text-primary" /> Sua trajetória
          </CardTitle>
          <CardDescription className="mt-0.5 text-xs">Atividade, progresso e dificuldade com base nas suas marcações.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 divide-y divide-border/70 p-0 xl:grid-cols-[minmax(0,1.18fr)_minmax(250px,0.72fr)_minmax(300px,0.9fr)] xl:divide-x xl:divide-y-0">
        <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Atividade dos últimos {activityRange} dias</p>
              <p className="mt-0.5 text-[11px] text-content-muted">
                {formatMinutes(totalMinutes)} registrados · {model.activityDays.filter((day) => day.totalDurationMinutes > 0).length} dias ativos
              </p>
            </div>
            <ToggleGroup
              type="single"
              size="sm"
              value={String(activityRange)}
              onValueChange={(value) => {
                if (value === '7' || value === '14' || value === '30') onActivityRangeChange(Number(value) as 7 | 14 | 30);
              }}
              className="shrink-0 rounded-lg border border-border/70 bg-background/30 p-0.5"
            >
              <ToggleGroupItem className="h-7 px-2 text-[10px]" value="7">7 dias</ToggleGroupItem>
              <ToggleGroupItem className="h-7 px-2 text-[10px]" value="14">14 dias</ToggleGroupItem>
              <ToggleGroupItem className="h-7 px-2 text-[10px]" value="30">Mês</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <ActivityBars days={model.activityDays} onNavigate={onNavigate} />
        </div>

        <ProgressPanel model={model} onNavigate={onNavigate} />
        <DifficultyPanel summary={model.difficultySummary} onNavigate={onNavigate} />
      </CardContent>
    </Card>
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

const ActivityBars = ({ days, onNavigate }: { days: DashboardActivityDay[]; onNavigate: (href: string) => void }) => {
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
          <BarChart data={data} margin={{ top: 22, right: 4, bottom: 4, left: 4 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 4" opacity={0.55} />
            <YAxis hide domain={[0, 'dataMax + 30']} />
            <XAxis
              dataKey="weekday"
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
              interval={0}
              height={38}
              tick={(props) => <ActivityAxisTick {...props} data={data} />}
            />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.35)', radius: 6 }}
              content={<ActivityChartTooltip onNavigate={onNavigate} />}
              wrapperStyle={{ outline: 'none', zIndex: 30 }}
            />
            <Bar dataKey="minutes" radius={[6, 6, 3, 3]} maxBarSize={30} minPointSize={4}>
              <LabelList
                dataKey="minutes"
                position="top"
                formatter={(value: number) => formatBarMinutes(value)}
                className="fill-foreground text-[10px] font-semibold"
              />
              {data.map((item) => (
                <Cell key={item.date} fill={item.fill} />
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
  onNavigate,
}: {
  active?: boolean;
  payload?: Array<{ payload: ActivityChartDatum }>;
  onNavigate: (href: string) => void;
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
      <button
        type="button"
        onClick={() => onNavigate(`/estatisticas?date=${datum.date}`)}
        className="flex w-full items-center justify-between border-t border-border/70 px-3 py-2 text-[11px] font-semibold text-primary hover:bg-primary/[0.06]"
      >
        Ver detalhes do dia
        <ArrowRight className="size-3.5" />
      </button>
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

const ProgressPanel = ({ model, onNavigate }: { model: DashboardDecisionModel; onNavigate: (href: string) => void }) => (
  <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
    <div className="flex items-start justify-between gap-2">
      <div>
      <p className="text-sm font-semibold text-foreground">Progresso do edital</p>
        <p className="mt-0.5 text-[10px] text-content-muted">{model.progressSummary.totalTopics} tópicos no ciclo</p>
      </div>
    </div>

    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[108px_minmax(0,1fr)] sm:gap-4">
      <div
        className="mx-auto grid size-[108px] place-items-center rounded-full p-[9px] shadow-[0_0_24px_hsl(var(--primary)/0.14)]"
        style={{
          background: `conic-gradient(hsl(var(--primary)) 0 ${model.progressSummary.editalProgressPercentage}%, hsl(var(--border)) ${model.progressSummary.editalProgressPercentage}% 100%)`,
        }}
        role="img"
        aria-label={`${model.progressSummary.editalProgressPercentage}% do edital iniciado`}
      >
        <div className="grid size-full place-items-center rounded-full bg-card">
          <div className="text-center">
            <span className="block text-2xl font-black tabular-nums leading-none text-foreground">
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

    <Button variant="ghost" size="sm" className="h-8 justify-start px-0 text-xs text-primary hover:bg-transparent" onClick={() => onNavigate('/ciclo-estudos')}>
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
