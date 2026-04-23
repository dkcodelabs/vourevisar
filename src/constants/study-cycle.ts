import React from 'react';
import { SubjectStatus } from '@/types/study-cycle';
import type { ReactNode } from 'react';
import { CycleIcon, CheckCircleIcon, FinishIcon } from '@/components/study-cycle/Icons';

export const STATUS_CONFIG: Record<SubjectStatus, { title: string; bgColor: string; borderColor: string; icon: ReactNode }> = {
  [SubjectStatus.ACTIVE]: {
    title: 'Pendentes no Ciclo',
    bgColor: 'bg-sky-50 dark:bg-sky-900/50',
    borderColor: 'border-sky-500',
    icon: React.createElement(CycleIcon),
  },
  [SubjectStatus.COMPLETED_CYCLE]: {
    title: 'Estudadas no Ciclo',
    bgColor: 'bg-amber-50 dark:bg-amber-900/50',
    borderColor: 'border-amber-500',
    icon: React.createElement(CheckCircleIcon),
  },
  [SubjectStatus.FINISHED]: {
    title: 'Finalizadas (100% Concluído)',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/50',
    borderColor: 'border-emerald-500',
    icon: React.createElement(FinishIcon),
  },
};