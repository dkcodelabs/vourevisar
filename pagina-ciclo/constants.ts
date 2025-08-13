
import React from 'react';
import { SubjectStatus } from './types';
import type { ReactNode } from 'react';
import { CycleIcon, CheckCircleIcon, ListIcon, FinishIcon } from './components/Icons';

export const STATUS_CONFIG: Record<Partial<SubjectStatus>, { title: string; bgColor: string; borderColor: string; icon: ReactNode }> = {
  [SubjectStatus.ACTIVE]: {
    title: 'Ciclo de Estudos',
    bgColor: 'bg-sky-50 dark:bg-sky-900/50',
    borderColor: 'border-sky-500',
    icon: React.createElement(CycleIcon),
  },
  [SubjectStatus.COMPLETED_CYCLE]: {
    title: 'Ciclo Concluído',
    bgColor: 'bg-amber-50 dark:bg-amber-900/50',
    borderColor: 'border-amber-500',
    icon: React.createElement(CheckCircleIcon),
  },
  [SubjectStatus.FINISHED]: {
    title: 'Revisão Finalizada',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/50',
    borderColor: 'border-emerald-500',
    icon: React.createElement(FinishIcon),
  },
};