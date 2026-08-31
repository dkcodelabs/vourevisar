import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  NotebookPen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DashboardDecisionModel } from '@/types/dashboardDecision';

const formatExamDate = (date?: string | null) => {
  if (!date) return 'Data não definida';
  return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
};

const heroMetricIconStyles = {
  danger: 'border-destructive/70 bg-destructive text-destructive-foreground shadow-[0_0_28px_hsl(var(--destructive)/0.2)]',
  warning: 'border-warning/50 bg-warning/12 text-warning shadow-[0_0_28px_hsl(var(--warning)/0.16)]',
  info: 'border-primary/35 bg-primary/10 text-primary shadow-[0_0_28px_hsl(var(--primary)/0.18)]',
};

type DashboardCommandHeroProps = {
  model: DashboardDecisionModel;
  onNavigate: (href: string) => void;
  onUpdateCycleName: (name: string) => Promise<void>;
  isUpdatingCycleName: boolean;
};

export function DashboardCommandHero({
  model,
  onNavigate,
  onUpdateCycleName,
  isUpdatingCycleName,
}: DashboardCommandHeroProps) {
  const { examContext, totals } = model;
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(examContext.editalName || '');
  const daysLabel = examContext.state === 'ready' && typeof examContext.daysRemaining === 'number'
    ? `${examContext.daysRemaining}`
    : '--';
  const canEditCycleName = Boolean(examContext.editalId);

  useEffect(() => {
    if (!isEditingName) setNameDraft(examContext.editalName || '');
  }, [examContext.editalName, isEditingName]);

  const startEditingName = () => {
    if (!canEditCycleName) return;
    setNameDraft(examContext.editalName || '');
    setIsEditingName(true);
  };

  const saveCycleName = async () => {
    const cleanName = nameDraft.trim();
    if (!cleanName) return;
    await onUpdateCycleName(cleanName);
    setIsEditingName(false);
  };

  return (
    <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-[radial-gradient(circle_at_38%_-35%,hsl(var(--primary)/0.2),transparent_42%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))] shadow-[0_20px_60px_-42px_hsl(var(--primary)/0.65)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:gap-x-3">
          <div className="col-span-4 min-w-0">
            <div className="flex min-w-0 items-start gap-2">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary sm:size-[18px]" />
              {isEditingName ? (
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={nameDraft}
                    onChange={event => setNameDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') void saveCycleName();
                      if (event.key === 'Escape') setIsEditingName(false);
                    }}
                    maxLength={160}
                    autoFocus
                    className="h-10 max-w-xl border-primary/30 bg-background text-base font-bold text-foreground sm:text-lg"
                    aria-label="Nome do ciclo"
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <Button type="button" size="sm" onClick={() => void saveCycleName()} disabled={isUpdatingCycleName || !nameDraft.trim()}>
                      {isUpdatingCycleName ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                      Salvar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingName(false)} disabled={isUpdatingCycleName}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startEditingName}
                  disabled={!canEditCycleName}
                  className="group flex min-w-0 max-w-3xl items-start gap-2 rounded-xl text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-default"
                  title={canEditCycleName ? 'Editar nome do ciclo' : undefined}
                >
                  <h1 className="break-words text-base font-bold leading-tight text-foreground sm:text-xl">
                    {examContext.editalName || 'Nenhum edital carregado no ciclo'}
                  </h1>
                  {canEditCycleName ? <NotebookPen className="mt-1 size-3.5 shrink-0 text-content-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" /> : null}
                </button>
              )}
            </div>
            {examContext.position ? (
              <p className="mt-1.5 flex min-w-0 items-center gap-2 text-xs font-medium text-content-muted sm:text-sm">
                <BriefcaseBusiness className="size-3.5 shrink-0 text-warning sm:size-4" />
                <span className="min-w-0 break-words">{examContext.position}</span>
              </p>
            ) : null}
            {!examContext.editalId ? (
              <Button className="mt-4" variant="outline" size="sm" onClick={() => onNavigate('/meus-editais')}>
                Carregar edital no ciclo
                <ChevronRight data-icon="inline-end" />
              </Button>
            ) : null}
          </div>

          <div className="col-span-1 flex min-w-0 items-center justify-center">
            <ExamCountdownOrbit daysLabel={daysLabel} examDate={examContext.examDate} isMissingDate={examContext.state === 'missing_exam_date'} />
          </div>

          <div className="col-span-3 grid min-w-0 grid-cols-3 gap-1.5 sm:gap-2">
            <HeroMetric tone="danger" icon={Clock3} value={totals.overdueReviews} label="Revisões atrasadas" onClick={() => onNavigate('/revisoes')} />
            <HeroMetric tone="warning" icon={CalendarClock} value={totals.todayReviews} label="Revisões para hoje" onClick={() => onNavigate('/revisoes')} />
            <HeroMetric tone="info" icon={BookOpen} value={totals.unstartedTopics} label="Tópicos a iniciar" onClick={() => onNavigate('/ciclo-estudos')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExamCountdownOrbit({ daysLabel, examDate, isMissingDate }: { daysLabel: string; examDate: string | null; isMissingDate: boolean }) {
  return (
    <div
      className="relative grid size-[76px] shrink-0 place-items-center [filter:drop-shadow(0_0_12px_hsl(var(--primary)/0.24))] sm:size-24"
      role="img"
      aria-label={examDate ? `${daysLabel} dias para a prova em ${formatExamDate(examDate)}` : 'Data da prova não definida'}
    >
      <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 160 160">
        <defs>
          <linearGradient id="dashboard-orbit-gradient" x1="20" y1="18" x2="142" y2="136" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
            <stop offset="0.48" stopColor="hsl(var(--primary))" />
            <stop offset="1" stopColor="hsl(var(--info))" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r="61" fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeDasharray="283 383" strokeLinecap="round" opacity="0.5" transform="rotate(140 80 80)" />
        <path d="M 33.3 119.2 A 61 61 0 0 1 35.2 38.6" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeDasharray="1 10" strokeLinecap="round" opacity="0.72" />
        <circle cx="80" cy="80" r="61" fill="none" stroke="url(#dashboard-orbit-gradient)" strokeWidth="7" strokeDasharray="195 383" strokeDashoffset="-88" strokeLinecap="round" transform="rotate(140 80 80)" />
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
}

function HeroMetric({ icon: Icon, value, label, tone, onClick }: { icon: typeof Clock3; value: number; label: string; tone: keyof typeof heroMetricIconStyles; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${value}`}
      onClick={onClick}
      className="group flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-border/70 bg-card/65 p-1 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:min-h-24 sm:gap-1.5 sm:rounded-xl sm:p-2"
    >
      <span data-metric-icon={tone} className={cn('grid size-7 shrink-0 place-items-center rounded-full border sm:size-8', heroMetricIconStyles[tone])}>
        <Icon className="size-3.5 sm:size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-black leading-none text-foreground sm:text-xl">{value}</span>
        <span className="mt-0.5 block text-[8px] font-semibold leading-tight text-content-muted sm:text-[10px]">{label}</span>
      </span>
    </button>
  );
}
