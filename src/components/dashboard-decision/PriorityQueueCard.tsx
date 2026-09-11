import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpen, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { DashboardActionKind, DashboardActionTone, DashboardDecisionModel, DashboardNavigate } from '@/types/dashboardDecision';

const labels: Record<DashboardActionKind, string> = {
  review_overdue: 'Revisão atrasada',
  review_today: 'Revisão de hoje',
  start_cycle_topic: 'Primeiro contato',
  continue_cycle_topic: 'Continuar ciclo',
  configure_exam_date: 'Configurar prova',
  load_cycle: 'Configurar ciclo',
  all_caught_up: 'Tudo em dia',
};

const tones: Record<DashboardActionTone, { badge: string; led: string; glow: string }> = {
  danger: {
    badge: 'border-destructive/30 bg-destructive/10 text-destructive',
    led: 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.6)]',
    glow: 'from-destructive/10 to-transparent',
  },
  warning: {
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    led: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    glow: 'from-amber-500/10 to-transparent',
  },
  success: {
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    led: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    glow: 'from-emerald-500/10 to-transparent',
  },
  info: {
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    led: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
    glow: 'from-blue-500/10 to-transparent',
  },
  neutral: {
    badge: 'border-border bg-muted/50 text-muted-foreground',
    led: 'bg-muted-foreground',
    glow: 'from-muted/20 to-transparent',
  },
};

const icons: Record<DashboardActionKind, typeof BookOpen> = {
  review_overdue: CircleAlert,
  review_today: CalendarClock,
  start_cycle_topic: BookOpen,
  continue_cycle_topic: BookOpen,
  configure_exam_date: CalendarClock,
  load_cycle: BookOpen,
  all_caught_up: CheckCircle2,
};

export const PriorityQueueCard = ({
  model,
  onNavigate,
  className,
}: {
  model: DashboardDecisionModel;
  onNavigate: DashboardNavigate;
  className?: string;
}) => {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const action = model.nextBestAction;
  const Icon = icons[action.kind];
  const toneConfig = tones[action.tone];
  const explanation = action.scientificBasis?.trim();
  const secondaryHref = action.secondaryHref !== action.primaryHref ? action.secondaryHref : undefined;

  const seen = new Set([action.id]);
  const nextActions = [...model.actionQueue, ...model.continueCycleItems].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 2);

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      className={cn(
        'overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] dark:border-white/[0.06] dark:shadow-[0_4px_28px_-8px_rgba(0,0,0,0.4)]',
        className
      )}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-4 sm:px-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Seu próximo passo
          </p>
          <h2 id={titleId} className="mt-0.5 text-base font-black tracking-[-0.02em] text-foreground sm:text-lg">
            Agora e depois
          </h2>
        </div>

        <Badge
          variant="outline"
          className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold', toneConfig.badge)}
        >
          <span className={cn('size-1.5 rounded-full animate-pulse', toneConfig.led)} />
          {labels[action.kind]}
        </Badge>
      </div>

      {/* Main Priority Action Box */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="p-4 sm:p-5"
      >
        <div className="flex items-start gap-3.5">
          {/* Glowing Ambient Icon Container */}
          <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent border border-blue-500/25 text-blue-500 shadow-[0_0_15px_-3px_rgba(59,130,246,0.25)]">
            <Icon className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="break-words text-lg font-black leading-snug tracking-[-0.025em] text-foreground sm:text-xl">
              {action.target.subjectName || action.title}
            </h3>

            {action.target.topicName ? (
              <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-foreground/85">
                <BookOpen className="size-3.5 mt-0.5 shrink-0 text-primary" />
                <span className="break-words">{action.target.topicName}</span>
              </p>
            ) : null}

            <p className="mt-2 max-w-[68ch] text-xs leading-relaxed text-muted-foreground">
              {action.reason}
            </p>
          </div>
        </div>

        {/* Buttons: Sleek High-End CTA instead of ugly box */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Button
            className="group/btn h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_4px_18px_rgba(37,99,235,0.38)] hover:shadow-[0_6px_22px_rgba(37,99,235,0.55)] transition-all duration-200 inline-flex items-center gap-2"
            onClick={() => onNavigate(action.primaryHref, action.target)}
          >
            <Sparkles className="size-3.5 text-blue-200" />
            <span>{action.primaryLabel}</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
          </Button>

          {secondaryHref ? (
            <Button
              variant="outline"
              className="h-11 px-4 rounded-xl border-border/80 bg-background/50 hover:bg-muted/60 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onNavigate(secondaryHref, action.target)}
            >
              {action.secondaryLabel || 'Ver detalhes'}
            </Button>
          ) : null}
        </div>

        {/* Collapsible details */}
        {explanation && explanation !== action.reason.trim() ? (
          <Collapsible className="mt-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="group min-h-8 px-0 text-xs font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                Como foi definida
                <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground mt-1">
                {explanation}
              </p>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </motion.div>

      {/* "Depois" Section with Modern Pill Rows */}
      {nextActions.length ? (
        <div className="border-t border-border/50 bg-muted/20 px-4 py-3.5 sm:px-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
            Depois
          </p>
          <div className="space-y-1.5">
            {nextActions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.primaryHref, item.target)}
                className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={cn(
                      'size-2 shrink-0 rounded-full',
                      item.tone === 'danger'
                        ? 'bg-destructive shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                        : item.tone === 'warning'
                          ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                          : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.target.subjectName || item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {item.target.topicName || item.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden text-[10px] font-semibold text-muted-foreground sm:block">
                    {labels[item.kind]}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};
