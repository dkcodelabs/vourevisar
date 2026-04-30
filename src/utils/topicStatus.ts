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
      colorClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    };
  }

  // 2. Primeiro Contato (Não iniciado)
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
      colorClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    };
  }

  // 3. Verificação de data para revisões
  const nextReviewValue = topic.nextReview || topic.next_review;
  
  if (!nextReviewValue) {
    return { 
      label: 'Em estudo', 
      type: 'futuro',
      colorClass: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
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
      colorClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };
  } 
  
  // 5. Hoje
  if (isToday(reviewDate)) {
    return {
      label: 'Hoje',
      type: 'hoje',
      colorClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    };
  } 

  // 6. Futuro
  const diffDays = differenceInDays(reviewDate, today);
  
  return {
    label: diffDays === 1 ? 'Amanhã' : `Em ${diffDays} dias`,
    type: 'futuro',
    colorClass: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
  };
};
