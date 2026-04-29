import { isToday, isBefore, startOfDay, differenceInDays } from 'date-fns';
import { Topic } from '@/types';

export interface TopicStatusInfo {
  label: string;
  type: 'atrasado' | 'hoje' | 'futuro' | 'concluido' | 'novo';
  colorClass: string;
}

/**
 * Retorna informações unificadas sobre o status de um tópico para exibição em badges.
 * Prioridade: Concluído > Primeiro Contato > Atrasado > Hoje > Futuro
 */
export const getTopicStatusInfo = (topic: Topic): TopicStatusInfo => {
  // 1. Concluído
  if (topic.completed || topic.is_completed) {
    return { 
      label: 'Concluído', 
      type: 'concluido',
      colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
    };
  }

  // 2. Primeiro Contato (Não iniciado)
  // Verificamos diversas flags possíveis dependendo de como o dado foi carregado/transformado
  const wasStudied = !!(
    topic.firstStudiedAt || 
    topic.first_studied_at || 
    (topic.reviewCount > 0) || 
    (topic.review_count > 0)
  );
  
  if (!wasStudied) {
    return { 
      label: 'Primeiro Contato', 
      type: 'novo',
      colorClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400'
    };
  }

  // 3. Verificação de data para revisões
  const nextReviewValue = topic.nextReview || topic.next_review;
  
  if (!nextReviewValue) {
    return { 
      label: 'Em estudo', 
      type: 'futuro',
      colorClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
    };
  }

  const today = startOfDay(new Date());
  const nextReviewDate = new Date(nextReviewValue);
  const reviewDate = startOfDay(nextReviewDate);

  // 4. Atrasado
  if (isBefore(reviewDate, today)) {
    return {
      label: 'Atrasado',
      type: 'atrasado',
      colorClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400'
    };
  } 
  
  // 5. Hoje
  if (isToday(reviewDate)) {
    return {
      label: 'Hoje',
      type: 'hoje',
      colorClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400'
    };
  } 

  // 6. Futuro
  const diffDays = differenceInDays(reviewDate, today);
  
  return {
    label: diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`,
    type: 'futuro',
    colorClass: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
  };
};
