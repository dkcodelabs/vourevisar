import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BookOpenCheck, Brain, ChevronRight, CircleHelp, Layers3, ArrowUpRight, Flame } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DashboardDecisionModel, DashboardNavigate } from '@/types/dashboardDecision';

const PulseItem = ({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  isAttention = false,
  onClick,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Brain;
  tone: 'primary' | 'warning' | 'success' | 'neutral';
  isAttention?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) => (
  <motion.button
    type="button"
    whileHover={{ y: -3, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      'group relative flex min-h-[124px] min-w-0 flex-col justify-between rounded-2xl p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
      isAttention
        ? 'border border-amber-300/80 bg-gradient-to-br from-amber-50/90 to-amber-100/50 shadow-[0_4px_20px_-8px_rgba(245,158,11,0.25)] dark:border-amber-500/30 dark:bg-gradient-to-br dark:from-amber-950/25 dark:to-card'
        : 'border border-border/80 bg-card shadow-[0_4px_16px_-8px_rgba(0,0,0,0.06)] hover:border-border dark:border-white/[0.06] dark:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)]'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105',
            tone === 'primary' && 'bg-primary/10 text-primary',
            tone === 'warning' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
            tone === 'success' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
            tone === 'neutral' && 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="truncate">{label}</span>
      </span>
      {isAttention ? (
        <Flame className="size-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
      ) : (
        <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden="true" />
      )}
    </div>

    <div>
      <p
        className={cn(
          'mt-2.5 text-2xl font-black leading-none tracking-tight tabular-nums sm:text-3xl',
          isAttention ? 'text-amber-950 dark:text-amber-100' : 'text-foreground'
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          'mt-1.5 truncate text-[11px] font-medium',
          isAttention ? 'text-amber-900/80 dark:text-amber-200/80' : 'text-muted-foreground'
        )}
      >
        {detail}
      </p>
    </div>

    {children}
  </motion.button>
);

export const DashboardPulseStrip = ({
  model,
  onNavigate,
  onRetryPractice,
}: {
  model: DashboardDecisionModel;
  onNavigate: DashboardNavigate;
  onRetryPractice?: () => Promise<void>;
}) => {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayActivity = model.activityDays.find((day) => day.date === todayKey);
  const studiedToday = todayActivity?.studiedCount ?? 0;
  const dailyTarget = model.pace.state === 'ready' && model.pace.newTopicsPerDay ? Math.max(1, Math.ceil(model.pace.newTopicsPerDay)) : null;
  const targetProgress = dailyTarget ? Math.min(100, Math.round((studiedToday / dailyTarget) * 100)) : 0;
  const practice = model.practicePulse;

  const hasOverdue = model.totals.overdueReviews > 0;

  return (
    <section aria-label="Pulso de estudo" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {/* 1. Estudo Hoje */}
      <PulseItem
        label="Estudo hoje"
        value={dailyTarget ? `${studiedToday} de ${dailyTarget}` : `${studiedToday}`}
        detail={dailyTarget ? 'tópicos da meta diária' : 'tópicos iniciados hoje'}
        icon={BookOpenCheck}
        tone="primary"
        onClick={() => onNavigate('/ciclo-estudos')}
      >
        {dailyTarget ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-[width] motion-reduce:transition-none"
              style={{ width: `${targetProgress}%` }}
            />
          </div>
        ) : null}
      </PulseItem>

      {/* 2. Revisões (com destaque âmbar se houver atrasadas) */}
      <PulseItem
        label="Revisões"
        value={`${model.totals.overdueReviews + model.totals.todayReviews}`}
        detail={`${model.totals.overdueReviews} atrasadas · ${model.totals.todayReviews} para hoje`}
        icon={Brain}
        tone={hasOverdue ? 'warning' : 'success'}
        isAttention={hasOverdue}
        onClick={() => onNavigate('/revisoes')}
      />

      {/* 3. Questões (Treino) */}
      {practice.status === 'loading' ? (
        <div className="min-h-[124px] rounded-2xl border border-border/80 bg-card p-4">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="mt-3 h-7 w-16 rounded-md" />
          <Skeleton className="mt-2 h-3 w-28 rounded-md" />
        </div>
      ) : practice.status === 'unavailable' ? (
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          onClick={() => void onRetryPractice?.()}
          className="min-h-[124px] rounded-2xl border border-border/80 bg-card p-4 text-left hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        >
          <CircleHelp className="size-4 text-muted-foreground" />
          <p className="mt-3 text-xs font-bold text-foreground">Treino indisponível</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Tentar novamente</p>
        </motion.button>
      ) : (
        <PulseItem
          label="Questões · 7 dias"
          value={practice.questions.accuracyPercentage === null ? '—' : `${practice.questions.accuracyPercentage}%`}
          detail={practice.questions.answered ? `${practice.questions.correct} acertos · ${practice.questions.incorrect} erros${practice.questions.skipped ? ` · ${practice.questions.skipped} puladas` : ''}` : 'Nenhuma questão respondida'}
          icon={CircleHelp}
          tone={practice.questions.accuracyPercentage !== null && practice.questions.accuracyPercentage >= 70 ? 'success' : 'neutral'}
          onClick={() => onNavigate('/treino')}
        />
      )}

      {/* 4. Flashcards */}
      {practice.status === 'loading' ? (
        <div className="min-h-[124px] rounded-2xl border border-border/80 bg-card p-4">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="mt-3 h-7 w-16 rounded-md" />
          <Skeleton className="mt-2 h-3 w-28 rounded-md" />
        </div>
      ) : practice.status === 'unavailable' ? (
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          onClick={() => void onRetryPractice?.()}
          className="min-h-[124px] rounded-2xl border border-border/80 bg-card p-4 text-left hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        >
          <Layers3 className="size-4 text-muted-foreground" />
          <p className="mt-3 text-xs font-bold text-foreground">Flashcards indisponíveis</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Tentar novamente</p>
        </motion.button>
      ) : (
        <PulseItem
          label="Flashcards"
          value={`${practice.dueFlashcards} devidos`}
          detail={practice.flashcards.reviewed ? `${practice.flashcards.recalled} lembrei · ${practice.flashcards.effortful} com esforço · ${practice.flashcards.forgotten} esqueci` : 'Nenhum cartão revisado em 7 dias'}
          icon={Layers3}
          tone={practice.dueFlashcards ? 'warning' : 'success'}
          onClick={() => onNavigate('/treino')}
        />
      )}
    </section>
  );
};
