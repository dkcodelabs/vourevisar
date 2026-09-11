import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { DashboardDecisionModel } from '@/types/dashboardDecision';

const formatExamDate = (date?: string | null) => {
  if (!date) return 'Definir data';
  return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
};

export type DashboardCommandHeroProps = {
  model: DashboardDecisionModel;
  onNavigate: (href: string) => void;
  onUpdateCycleName: (name: string) => Promise<void>;
  isUpdatingCycleName: boolean;
  onUpdateExamDate?: (date: string | null) => Promise<void>;
  isUpdatingExamDate?: boolean;
  onUpdatePosition?: (position: string) => Promise<void>;
  isUpdatingPosition?: boolean;
};

export function DashboardCommandHero({
  model,
  onNavigate,
  onUpdateCycleName,
  isUpdatingCycleName,
  onUpdateExamDate,
  isUpdatingExamDate = false,
  onUpdatePosition,
  isUpdatingPosition = false,
}: DashboardCommandHeroProps) {
  const { examContext, progressSummary, pace } = model;

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(examContext.editalName || '');

  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [positionDraft, setPositionDraft] = useState(examContext.position || '');

  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [dateDraft, setDateDraft] = useState(examContext.examDate || '');
  const [isSavingDate, setIsSavingDate] = useState(false);

  const daysLabel = examContext.state === 'ready' && typeof examContext.daysRemaining === 'number'
    ? `${examContext.daysRemaining}`
    : '--';
  const canEditCycleName = Boolean(examContext.editalId);
  const canEditPosition = Boolean(examContext.editalId) && Boolean(onUpdatePosition);
  const needsExamDate = examContext.state === 'missing_exam_date' || examContext.state === 'exam_date_past';
  const examDateActionLabel = examContext.state === 'missing_exam_date'
    ? 'Definir data da prova'
    : examContext.state === 'exam_date_past'
      ? 'Atualizar data da prova'
      : null;

  useEffect(() => {
    if (!isEditingName) setNameDraft(examContext.editalName || '');
  }, [examContext.editalName, isEditingName]);

  useEffect(() => {
    if (!isEditingPosition) setPositionDraft(examContext.position || '');
  }, [examContext.position, isEditingPosition]);

  useEffect(() => {
    if (!isDatePopoverOpen) setDateDraft(examContext.examDate || '');
  }, [examContext.examDate, isDatePopoverOpen]);

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

  const startEditingPosition = () => {
    if (!canEditPosition) return;
    setPositionDraft(examContext.position || '');
    setIsEditingPosition(true);
  };

  const savePosition = async () => {
    if (!onUpdatePosition) return;
    await onUpdatePosition(positionDraft.trim());
    setIsEditingPosition(false);
  };

  const handleSaveDate = async () => {
    if (!onUpdateExamDate) return;
    setIsSavingDate(true);
    try {
      await onUpdateExamDate(dateDraft ? dateDraft.trim() : null);
      setIsDatePopoverOpen(false);
    } finally {
      setIsSavingDate(false);
    }
  };

  const handleClearDate = async () => {
    if (!onUpdateExamDate) return;
    setIsSavingDate(true);
    try {
      await onUpdateExamDate(null);
      setDateDraft('');
      setIsDatePopoverOpen(false);
    } finally {
      setIsSavingDate(false);
    }
  };

  const handleDateTriggerClick = (e: React.MouseEvent) => {
    if (!onUpdateExamDate) {
      e.preventDefault();
      if (needsExamDate) {
        onNavigate('/ciclo-estudos?action=edit-exam-date');
      }
    }
  };

  const hasTopics = progressSummary.totalTopics > 0;
  const progressPercentage = Math.round(progressSummary.editalProgressPercentage || 0);
  const showDailyPace = pace.state === 'ready' && typeof pace.newTopicsPerDay === 'number' && pace.newTopicsPerDay > 0;
  const roundedDailyPace = showDailyPace ? Math.ceil(pace.newTopicsPerDay) : null;
  const dailyPaceLabel = roundedDailyPace
    ? `Meta: ~${roundedDailyPace} ${roundedDailyPace === 1 ? 'tópico/dia' : 'tópicos/dia'}`
    : null;

  return (
    <div className="dashboard-command-hero rounded-2xl border border-border/80 bg-card p-4 sm:p-5 md:p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:shadow-[0_4px_28px_-8px_rgba(0,0,0,0.4)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Contexto do concurso */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Visão de hoje
          </p>

          {/* Nome do Concurso / Ciclo */}
          {isEditingName ? (
            <div className="mt-1.5 flex min-w-0 max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={nameDraft}
                onChange={event => setNameDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void saveCycleName();
                  if (event.key === 'Escape') setIsEditingName(false);
                }}
                maxLength={160}
                autoFocus
                className="h-10 border-border/80 bg-background text-base font-bold text-foreground sm:text-lg"
                aria-label="Nome do ciclo"
              />
              <div className="flex shrink-0 items-center gap-1.5">
                <Button type="button" size="sm" onClick={() => void saveCycleName()} disabled={isUpdatingCycleName || !nameDraft.trim()} className="h-9 px-3">
                  {isUpdatingCycleName ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                  Salvar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingName(false)} disabled={isUpdatingCycleName} className="h-9 px-3">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditingName}
              disabled={!canEditCycleName}
              className="group mt-1 inline-flex min-w-0 max-w-full items-center gap-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-default"
              title={canEditCycleName ? 'Editar nome do ciclo' : undefined}
            >
              <h1 className="max-w-3xl break-words text-xl font-black leading-tight tracking-[-0.025em] text-foreground sm:text-2xl lg:text-[1.65rem]">
                {examContext.editalName || 'Nenhum edital carregado no ciclo'}
              </h1>
              {canEditCycleName ? (
                <Pencil className="size-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              ) : null}
            </button>
          )}

          {/* Cargo / Posição */}
          {isEditingPosition ? (
            <div className="mt-2 flex min-w-0 max-w-md flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={positionDraft}
                onChange={event => setPositionDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') void savePosition();
                  if (event.key === 'Escape') setIsEditingPosition(false);
                }}
                placeholder="Ex: Perito Criminal Oficial"
                maxLength={100}
                autoFocus
                className="h-8 border-border/80 bg-background text-xs font-semibold text-foreground sm:text-sm"
                aria-label="Cargo do concurso"
              />
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" size="sm" onClick={() => void savePosition()} disabled={isUpdatingPosition} className="h-8 px-2.5 text-xs">
                  {isUpdatingPosition ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                  Salvar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsEditingPosition(false)} disabled={isUpdatingPosition} className="h-8 px-2.5 text-xs">
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              {examContext.position ? (
                <button
                  type="button"
                  onClick={startEditingPosition}
                  disabled={!canEditPosition}
                  className="group inline-flex min-w-0 items-center gap-1.5 text-left text-xs font-semibold text-muted-foreground/90 transition-colors hover:text-foreground focus-visible:outline-none disabled:cursor-default"
                  title={canEditPosition ? 'Editar cargo' : undefined}
                >
                  <BriefcaseBusiness className="size-3.5 shrink-0 text-muted-foreground/70 group-hover:text-primary transition-colors" />
                  <span className="min-w-0 break-words">{examContext.position}</span>
                  {canEditPosition ? (
                    <Pencil className="size-2.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                  ) : null}
                </button>
              ) : canEditPosition ? (
                <button
                  type="button"
                  onClick={startEditingPosition}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground/70 hover:text-primary transition-colors"
                >
                  <BriefcaseBusiness className="size-3.5 shrink-0" />
                  <span className="underline decoration-dotted underline-offset-4">+ Adicionar cargo</span>
                </button>
              ) : null}
            </div>
          )}

          {!examContext.editalId ? (
            <Button className="mt-3" variant="outline" size="sm" onClick={() => onNavigate('/meus-editais')}>
              Carregar edital no ciclo
              <ChevronRight data-icon="inline-end" />
            </Button>
          ) : null}
        </div>

        {/* HUD Telemetria Cockpit: Progresso + Contagem de Missão (Sem Caixas Presas) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 rounded-2xl border border-border/70 bg-secondary/30 dark:bg-white/[0.02] p-3.5 sm:px-5 sm:py-3.5 backdrop-blur-md shrink-0">
          {/* 1. Radar de Progresso Circular + Métricas */}
          {hasTopics ? (
            <div className="dashboard-progress-summary flex items-center gap-3.5 min-w-[210px]">
              {/* Anel Circular Futurista com Gradiente Luminoso */}
              <div className="relative flex size-12 shrink-0 items-center justify-center">
                <svg className="size-full -rotate-90 transform" viewBox="0 0 48 48">
                  <circle
                    className="text-muted/60 dark:text-white/10"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="transparent"
                    r="20"
                    cx="24"
                    cy="24"
                  />
                  <circle
                    className="transition-all duration-1000 ease-out"
                    strokeWidth="3.5"
                    strokeDasharray={125.66}
                    strokeDashoffset={125.66 - (125.66 * Math.min(100, Math.max(0, progressPercentage))) / 100}
                    strokeLinecap="round"
                    stroke="url(#heroProgressGradient)"
                    fill="transparent"
                    r="20"
                    cx="24"
                    cy="24"
                  />
                  <defs>
                    <linearGradient id="heroProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute text-[11px] font-black tabular-nums text-foreground">
                  {progressPercentage}%
                </span>
              </div>

              {/* Informações de Progresso e Ritmo */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Progresso do edital
                  </span>
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="h-1.5 w-full min-w-[110px] overflow-hidden rounded-full bg-muted/60 dark:bg-white/10">
                  <div
                    className="dashboard-progress-summary__fill h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                    style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
                  <span className="truncate text-foreground/90 font-semibold">
                    {dailyPaceLabel ?? 'Conteúdo'}
                  </span>
                  <span className="tabular-nums font-semibold text-foreground/80 shrink-0">
                    <span className="font-bold text-foreground">{progressSummary.startedTopics}</span> de {progressSummary.totalTopics} tópicos iniciados
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">O progresso aparece quando o ciclo tiver tópicos.</p>
          )}

          {/* Divisor vertical suave */}
          {hasTopics ? (
            <div className="hidden sm:block h-11 w-px bg-gradient-to-b from-transparent via-border/80 to-transparent shrink-0" />
          ) : null}

          {/* 2. Data da Prova & Contagem Regressiva Interativa (Estilo Mission Control) */}
          <div className="shrink-0">
            <Popover open={onUpdateExamDate ? isDatePopoverOpen : false} onOpenChange={setIsDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={handleDateTriggerClick}
                  className="dashboard-exam-date-control dashboard-command-hero__signal group relative flex items-center gap-3.5 text-left focus-visible:ring-2 focus-visible:ring-ring/45 cursor-pointer rounded-xl transition-all duration-200"
                  aria-label={examDateActionLabel ?? 'dias até a prova'}
                >
                  <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-500/25 text-blue-500 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)] transition-all duration-300 group-hover:scale-105 group-hover:border-blue-500/40 group-hover:shadow-[0_0_20px_-2px_rgba(59,130,246,0.5)]">
                    <CalendarClock aria-hidden="true" className="size-5 transition-transform duration-300 group-hover:rotate-6" />
                  </div>

                  <div className="min-w-0 pr-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black leading-none tabular-nums tracking-tight text-foreground transition-colors group-hover:text-blue-500">
                        {daysLabel}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                          {examDateActionLabel ?? 'dias até a prova'}
                        </span>
                        {examContext.daysRemaining !== null && typeof examContext.daysRemaining === 'number' && (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest mt-0.5 ${
                            examContext.daysRemaining <= 45
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}>
                            <span className={`size-1.5 rounded-full ${
                              examContext.daysRemaining <= 45
                                ? 'bg-amber-500 animate-ping'
                                : 'bg-emerald-500'
                            }`} />
                            {examContext.daysRemaining <= 45 ? 'RETA FINAL' : 'FASE DE RITMO'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="block text-xs font-semibold text-muted-foreground/90 group-hover:text-foreground transition-colors">
                        {examContext.examDate ? formatExamDate(examContext.examDate) : 'Definir data'}
                      </span>
                      {onUpdateExamDate ? (
                        <Pencil className="size-2.5 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
                      ) : null}
                    </div>
                  </div>
                </button>
              </PopoverTrigger>

              {onUpdateExamDate ? (
                <PopoverContent className="w-80 p-4" align="end" sideOffset={8}>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-foreground">Data da prova</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setIsDatePopoverOpen(false)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ajuste a data para recalcular os dias restantes e o ritmo do seu ciclo.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Input
                        type="date"
                        value={dateDraft}
                        onChange={event => setDateDraft(event.target.value)}
                        className="h-10 text-sm font-semibold"
                        aria-label="Nova data da prova"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                      {examContext.examDate ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void handleClearDate()}
                          disabled={isSavingDate || isUpdatingExamDate}
                        >
                          Sem data
                        </Button>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => setIsDatePopoverOpen(false)}
                          disabled={isSavingDate || isUpdatingExamDate}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-3 text-xs font-bold"
                          onClick={() => void handleSaveDate()}
                          disabled={isSavingDate || isUpdatingExamDate}
                        >
                          {isSavingDate || isUpdatingExamDate ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3" />
                          )}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              ) : null}
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
