import { useState } from 'react';
import {
  Calendar,
  Loader2,
  NotebookPen,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { StudyEmptyState } from '@/components/study/StudyEmptyState';
import { NextBestActionCard } from '@/components/dashboard-decision/NextBestActionCard';
import { PriorityQueueCard } from '@/components/dashboard-decision/PriorityQueueCard';
import { ProgressSummaryCard } from '@/components/dashboard-decision/ProgressSummaryCard';
import { ExamPacePanel } from '@/components/dashboard-decision/ExamPacePanel';
import { DashboardDataIssueNotice } from '@/components/dashboard-decision/DashboardDataIssueNotice';
import { DashboardCommandHero } from '@/components/dashboard-decision/DashboardCommandHero';
import type {
  DashboardDecisionModel,
  DashboardNavigate,
  DashboardDataIssueSource,
  DashboardReminder,
} from '@/types/dashboardDecision';

const formatReminderDate = (date?: string | null) => {
  if (!date) return 'Sem data';
  const parsedDate = date.length === 10 ? parseISO(date) : new Date(date);
  if (isToday(parsedDate)) return 'Hoje';
  if (isTomorrow(parsedDate)) return 'Amanhã';
  return format(parsedDate, 'dd/MM/yyyy', { locale: ptBR });
};

interface DashboardDecisionExperienceProps {
  model: DashboardDecisionModel;
  onNavigate: DashboardNavigate;
  onRetryDataIssue?: (source: DashboardDataIssueSource) => Promise<void>;
  onAddReminder: (text: string, reminderDate: string | null) => Promise<void>;
  onToggleReminder: (id: string, completed: boolean) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  onUpdateCycleName: (name: string) => Promise<void>;
  isAddingReminder: boolean;
  isDeletingReminder: boolean;
  isUpdatingCycleName: boolean;
}

export const DashboardDecisionExperience = ({
  model,
  onNavigate,
  onRetryDataIssue,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onUpdateCycleName,
  isAddingReminder,
  isDeletingReminder,
  isUpdatingCycleName,
}: DashboardDecisionExperienceProps) => {
  if (model.isLoading) {
    return <DashboardDecisionSkeleton />;
  }

  if (model.examContext.state === 'missing_cycle') {
    return (
      <StudyEmptyState
        kind={model.studyEntryState ?? 'no-cycle'}
        variant="center"
        onAction={() => onNavigate('/meus-editais')}
      />
    );
  }

  return (
    <main className="flex w-full flex-col gap-5 pb-10">
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
        <DashboardCommandHero
          model={model}
          onNavigate={onNavigate}
          onUpdateCycleName={onUpdateCycleName}
          isUpdatingCycleName={isUpdatingCycleName}
        />
        <ProgressSummaryCard summary={model.progressSummary} unstartedTopics={model.totals.unstartedTopics} onNavigate={onNavigate} />
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
          isUnavailable={model.dataIssues.includes('reminders')}
          onRetry={() => onRetryDataIssue?.('reminders') ?? Promise.resolve()}
        />
      </section>

      <StudyPaceCard
        model={model}
        onNavigate={onNavigate}
        isActivityUnavailable={model.dataIssues.includes('activity')}
        onRetryActivity={() => onRetryDataIssue?.('activity') ?? Promise.resolve()}
      />
    </main>
  );
};

const DashboardDecisionSkeleton = () => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl xl:h-52" />
    </div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
    <Skeleton className="h-64 rounded-2xl" />
  </div>
);

export const RecentRemindersCard = ({
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  isAdding,
  isDeleting,
  isUnavailable = false,
  onRetry,
}: {
  reminders: DashboardReminder[];
  onAddReminder: (text: string, reminderDate: string | null) => Promise<void>;
  onToggleReminder: (id: string, completed: boolean) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  isAdding: boolean;
  isDeleting: boolean;
  isUnavailable?: boolean;
  onRetry?: () => Promise<void>;
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
              disabled={isUnavailable}
              className="h-7 border-0 bg-transparent px-0 pl-4 text-[11px] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                disabled={isUnavailable}
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
            disabled={isUnavailable || isAdding || !text.trim()}
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
          {isUnavailable ? (
            <div className="py-3">
              <DashboardDataIssueNotice
                title="Não foi possível carregar seus lembretes"
                description="A lista livre só aparece depois que a consulta termina sem erro."
                hasPreviousData={reminders.length > 0}
                onRetry={onRetry}
              />
            </div>
          ) : null}
          {!isUnavailable && visibleReminders.length === 0 ? (
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
          ) : visibleReminders.length > 0 ? (
            visibleReminders.map((reminder, index) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                index={index}
                onToggleReminder={onToggleReminder}
                onRequestDelete={setReminderToDelete}
                isDeleting={isDeleting}
                isReadOnly={isUnavailable}
              />
            ))
          ) : null}
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
  isReadOnly = false,
}: {
  reminder: DashboardReminder;
  index: number;
  onToggleReminder: (id: string, completed: boolean) => Promise<void>;
  onRequestDelete: (reminder: DashboardReminder) => void;
  isDeleting: boolean;
  isReadOnly?: boolean;
}) => {
  const colors = ['bg-primary', 'bg-warning', 'bg-success', 'bg-border'];

  return (
    <div className="grid min-h-[52px] min-w-0 grid-cols-[3px_24px_minmax(0,1fr)_20px] items-center gap-2.5 border-b border-border/55 last:border-b-0">
      <span className={cn('h-9 w-[3px] rounded-full', colors[index % colors.length])} />
      <Checkbox
        aria-label={reminder.completed ? `Reabrir lembrete: ${reminder.text}` : `Concluir lembrete: ${reminder.text}`}
        checked={reminder.completed}
        disabled={isReadOnly}
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
        disabled={isDeleting || isReadOnly}
        onClick={() => onRequestDelete(reminder)}
        className="size-5 justify-self-end rounded-full p-0 text-content-muted/70 hover:bg-transparent hover:text-destructive focus-visible:ring-1 [&_svg]:!size-3"
      >
        <X strokeWidth={1.75} />
      </Button>
    </div>
  );
};

const StudyPaceCard = ({
  model,
  onNavigate,
  isActivityUnavailable,
  onRetryActivity,
}: {
  model: DashboardDecisionModel;
  onNavigate: DashboardNavigate;
  isActivityUnavailable: boolean;
  onRetryActivity: () => Promise<void>;
}) => (
  <Card className="overflow-hidden rounded-2xl border-primary/15 bg-[radial-gradient(circle_at_78%_8%,hsl(var(--primary)/0.12),transparent_26%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--surface)))]">
    <ExamPacePanel
      pace={model.pace}
      activityDays={model.activityDays}
      onNavigate={onNavigate}
      isActivityUnavailable={isActivityUnavailable}
      onRetryActivity={onRetryActivity}
    />
  </Card>
);
