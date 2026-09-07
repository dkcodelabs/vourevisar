import { Check, FileStack, Orbit, Play } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const steps = [
  { label: 'Edital organizado', icon: FileStack },
  { label: 'Ciclo montado', icon: Orbit },
  { label: 'Primeiro estudo', icon: Play },
] as const;

export function ActivationTrack({ completedSteps }: { completedSteps: number }) {
  const reduceMotion = useReducedMotion();
  const progress = Math.min(100, Math.max(0, (completedSteps / steps.length) * 100));

  return (
    <div className="relative" aria-label={`${completedSteps} de 3 etapas concluídas`}>
      <div className="absolute bottom-5 left-5 top-5 w-px bg-white/[0.12] sm:bottom-auto sm:left-5 sm:right-5 sm:top-5 sm:h-px sm:w-auto" />
      <motion.div
        className="absolute bottom-5 left-5 top-5 w-px origin-top bg-[hsl(var(--activation-lime))] sm:hidden"
        initial={reduceMotion ? false : { scaleY: 0 }}
        animate={{ scaleY: progress / 100 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute left-5 top-5 hidden h-px w-[calc(100%-2.5rem)] origin-left bg-[hsl(var(--activation-lime))] sm:block"
        initial={reduceMotion ? false : { scaleX: 0 }}
        animate={{ scaleX: progress / 100 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />

      <ol className="relative grid gap-6 sm:grid-cols-3 sm:gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const complete = index < completedSteps;
          const active = index === completedSteps;
          return (
            <li key={step.label} className="flex items-center gap-3 sm:flex-col sm:items-start">
              <div
                className={cn(
                  'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl border text-white transition-colors',
                  complete && 'border-[hsl(var(--activation-lime))]/60 bg-[hsl(var(--activation-lime))] text-[hsl(var(--activation-ink))]',
                  active && 'border-primary/70 bg-primary text-white shadow-[0_10px_30px_-14px_hsl(var(--primary)/0.8)]',
                  !complete && !active && 'border-white/[0.15] bg-[hsl(var(--activation-ink-raised))] text-white/[0.45]',
                )}
              >
                {complete ? <Check className="size-4 stroke-[3]" /> : <Icon className="size-4" />}
              </div>
              <div>
                <p className={cn(
                  'text-sm font-bold leading-5',
                  complete || active ? 'text-white' : 'text-white/[0.48]',
                )}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-white/[0.45]">
                  {complete ? 'Concluído' : active ? 'Próximo passo' : 'Vem depois'}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
