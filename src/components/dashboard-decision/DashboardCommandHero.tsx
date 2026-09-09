import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BriefcaseBusiness,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Loader2,
  NotebookPen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { DashboardDecisionModel } from '@/types/dashboardDecision';

const formatExamDate = (date?: string | null) => {
  if (!date) return 'Data não definida';
  return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR });
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
  const { examContext } = model;
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(examContext.editalName || '');
  const daysLabel = examContext.state === 'ready' && typeof examContext.daysRemaining === 'number'
    ? `${examContext.daysRemaining}`
    : '--';
  const canEditCycleName = Boolean(examContext.editalId);
  const needsExamDate = examContext.state === 'missing_exam_date' || examContext.state === 'exam_date_past';
  const examDateActionLabel = examContext.state === 'missing_exam_date'
    ? 'Definir data da prova'
    : examContext.state === 'exam_date_past'
      ? 'Atualizar data da prova'
      : null;

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
    <Card className="dashboard-context-card relative overflow-hidden rounded-2xl border-border/80 bg-card shadow-[0_16px_36px_-28px_hsl(222_47%_11%/0.4)]">
      <CardContent className="p-4 sm:p-5">
        <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-2">
              <span className="dashboard-context-icon mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-primary">
                <GraduationCap className="size-4" />
              </span>
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
                  <h1 className="break-words text-base font-bold leading-tight tracking-[-0.025em] text-foreground sm:text-xl">
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

          <button
            type="button"
            disabled={!needsExamDate}
            onClick={() => needsExamDate && onNavigate('/ciclo-estudos?action=edit-exam-date')}
            className="dashboard-exam-date-control flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] px-3 py-2.5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring/45 disabled:cursor-default sm:min-w-[172px] sm:px-4"
            aria-label={examDateActionLabel ?? undefined}
          >
            <CalendarClock aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <span className="block text-lg font-extrabold leading-none tabular-nums text-foreground">{daysLabel}</span>
              <span className="mt-1 block text-[10px] font-semibold leading-tight text-content-muted">
                {examDateActionLabel ?? 'dias até a prova'}
              </span>
              {examContext.examDate ? <span className="mt-1 block text-[10px] text-content-muted">{formatExamDate(examContext.examDate)}</span> : null}
            </div>
            {needsExamDate ? <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-primary" /> : null}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
