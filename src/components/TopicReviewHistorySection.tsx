import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CheckCircle2, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { useTopicReviewHistory } from '@/hooks/useTopicReviewHistory';
import { ReviewProfile } from '@/types/study';
import { Skeleton } from '@/components/ui/skeleton';

interface TopicReviewHistorySectionProps {
  topicId: string;
  userProfile?: ReviewProfile;
}

export const TopicReviewHistorySection: React.FC<TopicReviewHistorySectionProps> = ({
  topicId,
  userProfile = ReviewProfile.INTERMEDIATE
}) => {
  const { history, isLoading, error } = useTopicReviewHistory(topicId, userProfile);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error || !history) {
    return null;
  }

  const progressPercentage = history.totalReviews > 0
    ? Math.round((history.completedReviews / history.totalReviews) * 100)
    : 0;

  return (
    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Histórico de Estudos
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600 dark:text-slate-400">
            {history.completedReviews}/{history.totalReviews} revisões
          </span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              {progressPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Primeiro Contato */}
      {history.firstContact && (
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Primeiro Contato
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {format(history.firstContact, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      )}

      {/* Lista de Revisões */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 px-1">
          Revisões Programadas
        </p>
        <div className="space-y-1.5">
          {history.reviews.map((review, index) => (
            <div
              key={`${review.stage}-${index}`}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-all ${
                review.isCompleted
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : review.isOverdue
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Lado esquerdo: Ícone + Nome */}
              <div className="flex items-center gap-2.5">
                {/* Ícone */}
                {review.isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : review.isOverdue ? (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                ) : (
                  <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                )}
                
                {/* Nome da revisão */}
                <p className={`text-sm ${
                  review.isCompleted
                    ? 'text-green-900 dark:text-green-100'
                    : review.isOverdue
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {review.stageLabel}
                </p>
              </div>

              {/* Lado direito: Data e Hora */}
              <div className="text-right">
                {review.reviewedAt ? (
                  <>
                    <p className={`text-sm font-semibold ${
                      review.isCompleted
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {format(review.reviewedAt, 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {format(review.reviewedAt, 'HH:mm', { locale: ptBR })}
                    </p>
                  </>
                ) : review.isOverdue ? (
                  <>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      {review.daysOverdue} dia{review.daysOverdue !== 1 ? 's' : ''} atraso
                    </p>
                    {review.expectedDate && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Era: {format(review.expectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Pendente
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Próximas Revisões */}
      {history.nextReviews.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">{history.nextReviews.length}</span> revisão(ões) pendente(s)
          </p>
        </div>
      )}
    </div>
  );
};
