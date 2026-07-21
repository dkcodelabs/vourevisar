import React from 'react';
import { ArrowRight, BookOpen, FileText, Info, LucideIcon, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type StudyEmptyStateVariant = 'banner' | 'center';
type StudyEmptyStateKind = 'no-edital' | 'empty-edital' | 'no-cycle';

interface StudyEmptyStateProps {
  kind: StudyEmptyStateKind;
  variant?: StudyEmptyStateVariant;
  className?: string;
  onAction: () => void;
  actionLabel?: string;
}

const stateCopy: Record<StudyEmptyStateKind, {
  icon: LucideIcon;
  badge: string;
  title: string;
  description: string;
  actionLabel: string;
}> = {
  'no-edital': {
    icon: Info,
    badge: 'Primeiro acesso',
    title: 'Você ainda não possui nenhum edital cadastrado.',
    description: 'Importe ou crie seu primeiro edital para organizar sua preparação.',
    actionLabel: 'Adicionar edital',
  },
  'empty-edital': {
    icon: FileText,
    badge: 'Conteúdo pendente',
    title: 'Seu edital ainda não tem matérias ou tópicos.',
    description: 'Abra Meus Editais para importar o conteúdo ou cadastrar a primeira matéria.',
    actionLabel: 'Completar edital',
  },
  'no-cycle': {
    icon: Target,
    badge: 'Ciclo pendente',
    title: 'Nenhum edital carregado no Ciclo de Estudos.',
    description: 'Você já possui edital cadastrado. Carregue-o no ciclo para iniciar seus estudos, revisões e estatísticas.',
    actionLabel: 'Carregar edital no ciclo',
  },
};

export const StudyEmptyState = ({
  kind,
  variant = 'banner',
  className,
  onAction,
  actionLabel,
}: StudyEmptyStateProps) => {
  const copy = stateCopy[kind];
  const Icon = copy.icon;
  const label = actionLabel || copy.actionLabel;

  if (variant === 'center') {
    return (
      <div className={cn(
        'flex min-h-[55vh] w-full flex-col items-center justify-center px-4 py-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500',
        className
      )}>
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Icon size={30} />
        </div>
        <span className="mb-3 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
          {copy.badge}
        </span>
        <h2 className="max-w-xl text-2xl font-black tracking-tight text-foreground">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-lg text-sm font-medium leading-6 text-content-muted">
          {copy.description}
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-[12px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/15 transition-colors hover:bg-emerald-600"
        >
          <BookOpen size={16} />
          {label}
        </button>
      </div>
    );
  }

  return (
    <section
      className={cn(
        'w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/12 via-cyan-500/8 to-transparent px-4 py-4 shadow-sm animate-in fade-in duration-500',
        className
      )}
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/12 text-emerald-400">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black leading-5 text-foreground">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs font-medium leading-5 text-content-muted">
              {copy.description}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400 transition-colors hover:bg-emerald-500 hover:text-white"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {label}
          <ArrowRight size={13} />
        </button>
      </div>
    </section>
  );
};
