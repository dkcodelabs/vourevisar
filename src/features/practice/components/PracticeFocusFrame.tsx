import type { ReactNode } from 'react';
import { ArrowLeft, BrainCircuit, Layers3 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

type PracticeFocusFrameProps = {
  kind: 'questions' | 'flashcards';
  current: number;
  total: number;
  children: ReactNode;
};

export const PracticeFocusFrame = ({ kind, current, total, children }: PracticeFocusFrameProps) => {
  const isFlashcard = kind === 'flashcards';

  return (
    <div
      className={cn(
        'min-h-dvh bg-background text-foreground',
        isFlashcard
          ? 'bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--success)/0.18),transparent_38%)]'
          : 'bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.2),transparent_38%)]',
      )}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          to="/treino"
          className="group flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm font-semibold text-content-muted transition-colors duration-200 hover:bg-card/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Sair do modo treino</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className={cn(
            'grid h-9 w-9 place-items-center rounded-xl',
            isFlashcard ? 'bg-success/12 text-success' : 'bg-primary/12 text-primary',
          )}>
            {isFlashcard ? <Layers3 className="h-4 w-4" /> : <BrainCircuit className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{isFlashcard ? 'Recordação ativa' : 'Questões rápidas'}</p>
            <p className="mt-0.5 text-[11px] text-content-muted">Atos administrativos</p>
          </div>
        </div>

        <div className="min-w-24 text-right">
          <p className="text-xs font-semibold tabular-nums text-foreground">{current} de {total}</p>
          <div className="mt-2 flex justify-end gap-1" aria-label={`Progresso: ${current} de ${total}`}>
            {Array.from({ length: total }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1.5 w-6 rounded-full transition-colors duration-200',
                  index < current
                    ? isFlashcard ? 'bg-success' : 'bg-primary'
                    : 'bg-border',
                )}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-2 sm:px-6 sm:pt-5 lg:px-8">
        {children}
      </main>
    </div>
  );
};

