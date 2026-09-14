import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BookOpenCheck, Brain, ChevronRight, CircleHelp, Layers3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DashboardDecisionModel, DashboardNavigate } from '@/types/dashboardDecision';

const PulseItem = ({
  label,
  value,
  detail,
  icon: Icon,
  iconContainerClass,
  statusLineClass,
  badge,
  onClick,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Brain;
  iconContainerClass: string;
  statusLineClass?: string;
  badge?: ReactNode;
  onClick: () => void;
  children?: ReactNode;
}) => (
  <motion.button
    type="button"
    whileHover={{ y: -3, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group relative flex min-h-[132px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 text-left shadow-[0_4px_16px_-8px_rgba(0,0,0,0.06)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 dark:border-white/[0.10] dark:bg-gradient-to-b dark:from-[#1c1e26] dark:via-[#181a22] dark:to-[#13141b] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7)] dark:hover:border-white/[0.22] dark:hover:shadow-[0_12px_36px_-8px_rgba(0,0,0,0.85)]"
    style={{
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.09), 0 8px 30px -8px rgba(0, 0, 0, 0.55)',
    }}
  >
    {/* Cabeçalho do Card: Ícone em Box Iluminado + Título + Badge/Chevron */}
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-105',
            iconContainerClass
          )}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="truncate">{label}</span>
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {badge}
        <ChevronRight
          className="hidden size-3.5 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 sm:block"
          aria-hidden="true"
        />
      </div>
    </div>

    {/* Conteúdo Principal: Valor Grande em Negrito + Subtítulo */}
    <div>
      <p className="mt-2 text-2xl font-black leading-none tracking-tight tabular-nums text-foreground sm:text-3xl">
        {value}
      </p>
      <p className="mt-1.5 truncate text-[11px] font-medium text-muted-foreground">
        {detail}
      </p>
    </div>

    {/* Elemento Visual Adicional (Barras de progresso / micro-sparklines) */}
    {children}

    {/* Região 3 do Guia: A FAIXA DE ALERTA (3mm na base que decide o status) */}
    {statusLineClass ? (
      <span
        className={cn('absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-300', statusLineClass)}
        aria-hidden="true"
      />
    ) : null}
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
  const dailyTarget =
    model.pace.state === 'ready' && model.pace.newTopicsPerDay ? Math.max(1, Math.ceil(model.pace.newTopicsPerDay)) : null;
  const targetProgress = dailyTarget ? Math.min(100, Math.round((studiedToday / dailyTarget) * 100)) : 0;
  const practice = model.practicePulse;

  const hasOverdue = model.totals.overdueReviews > 0;
  const hasAccuracy = practice.questions.accuracyPercentage !== null;
  const accuracy = practice.questions.accuracyPercentage ?? 0;

  return (
    <section aria-label="Pulso de estudo" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {/* 1. Estudo Hoje */}
      <PulseItem
        label="Estudo hoje"
        value={dailyTarget ? `${studiedToday} de ${dailyTarget}` : `${studiedToday}`}
        detail={dailyTarget ? 'tópicos da meta diária' : 'tópicos iniciados hoje'}
        icon={BookOpenCheck}
        iconContainerClass="border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)]"
        statusLineClass="bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
        onClick={() => onNavigate('/ciclo-estudos')}
      >
        {dailyTarget ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/60 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-[width] motion-reduce:transition-none"
              style={{ width: `${targetProgress}%` }}
            />
          </div>
        ) : null}
      </PulseItem>

      {/* 2. Revisões (Faixa de Alerta de 3mm com Status Decisivo) */}
      <PulseItem
        label="Revisões"
        value={`${model.totals.overdueReviews + model.totals.todayReviews}`}
        detail={`${model.totals.overdueReviews} atrasadas · ${model.totals.todayReviews} para hoje`}
        icon={Brain}
        iconContainerClass={
          hasOverdue
            ? 'border border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
            : 'border border-purple-500/30 bg-purple-500/15 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
        }
        badge={
          hasOverdue ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.25)]">
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              Atrasadas
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Em dia
            </span>
          )
        }
        statusLineClass={
          hasOverdue
            ? 'bg-gradient-to-r from-red-500 via-amber-500 to-amber-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
            : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
        }
        onClick={() => onNavigate('/revisoes')}
      />

      {/* 3. Questões (Treino) */}
      {practice.status === 'loading' ? (
        <div className="min-h-[132px] rounded-2xl border border-white/[0.10] bg-card p-4">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="mt-3 h-7 w-16 rounded-md" />
          <Skeleton className="mt-2 h-3 w-28 rounded-md" />
        </div>
      ) : practice.status === 'unavailable' ? (
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          onClick={() => void onRetryPractice?.()}
          className="min-h-[132px] rounded-2xl border border-white/[0.10] bg-card p-4 text-left hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        >
          <CircleHelp className="size-4 text-muted-foreground" />
          <p className="mt-3 text-xs font-bold text-foreground">Treino indisponível</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Tentar novamente</p>
        </motion.button>
      ) : (
        <PulseItem
          label="Questões · 7 dias"
          value={practice.questions.accuracyPercentage === null ? '—' : `${practice.questions.accuracyPercentage}%`}
          detail={
            practice.questions.answered
              ? `${practice.questions.correct} acertos · ${practice.questions.incorrect} erros${practice.questions.skipped ? ` · ${practice.questions.skipped} puladas` : ''}`
              : 'Nenhuma questão respondida'
          }
          icon={CircleHelp}
          iconContainerClass="border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
          statusLineClass={
            hasAccuracy && accuracy >= 70
              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              : hasAccuracy
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-muted/40'
          }
          onClick={() => onNavigate('/treino')}
        >
          {hasAccuracy ? (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/60 dark:bg-white/10">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] motion-reduce:transition-none',
                  accuracy >= 70
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400'
                )}
                style={{ width: `${Math.min(100, Math.max(0, accuracy))}%` }}
              />
            </div>
          ) : null}
        </PulseItem>
      )}

      {/* 4. Flashcards */}
      {practice.status === 'loading' ? (
        <div className="min-h-[132px] rounded-2xl border border-white/[0.10] bg-card p-4">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="mt-3 h-7 w-16 rounded-md" />
          <Skeleton className="mt-2 h-3 w-28 rounded-md" />
        </div>
      ) : practice.status === 'unavailable' ? (
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          onClick={() => void onRetryPractice?.()}
          className="min-h-[132px] rounded-2xl border border-white/[0.10] bg-card p-4 text-left hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
        >
          <Layers3 className="size-4 text-muted-foreground" />
          <p className="mt-3 text-xs font-bold text-foreground">Flashcards indisponíveis</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Tentar novamente</p>
        </motion.button>
      ) : (
        <PulseItem
          label="Flashcards"
          value={`${practice.dueFlashcards} devidos`}
          detail={
            practice.flashcards.reviewed
              ? `${practice.flashcards.recalled} lembrei · ${practice.flashcards.effortful} com esforço · ${practice.flashcards.forgotten} esqueci`
              : 'Nenhum cartão revisado em 7 dias'
          }
          icon={Layers3}
          iconContainerClass="border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          badge={
            practice.dueFlashcards > 0 ? (
              <span className="text-[10px] font-bold text-amber-400">{practice.dueFlashcards} hoje</span>
            ) : null
          }
          statusLineClass={
            practice.dueFlashcards > 0
              ? 'bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
          }
          onClick={() => onNavigate('/treino')}
        />
      )}
    </section>
  );
};
