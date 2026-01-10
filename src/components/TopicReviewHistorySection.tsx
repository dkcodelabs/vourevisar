import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CheckCircle2, Clock, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react';
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
    <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-lg">
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

      {/* Grid de Cards com Setas */}
      <div className="flex items-center gap-2 overflow-x-auto p-2 pb-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent md:[&::-webkit-scrollbar]:hidden md:[-ms-overflow-style:'none'] md:[scrollbar-width:'none']">
        {/* Primeiro Estudo */}
        {history.firstContact && (
          <>
            <div className="flex flex-col items-center justify-center p-2.5 bg-white dark:bg-slate-800 rounded-md border-l-4 border-l-blue-500 dark:border-l-blue-400 border-y border-r border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all flex-1 min-w-[100px] min-h-[75px]">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  1º Estudo
                </p>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {format(history.firstContact, 'dd/MM/yy', { locale: ptBR })}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500">
                {format(history.firstContact, 'HH:mm', { locale: ptBR })}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 flex-shrink-0" />
          </>
        )}

        {/* Revisões */}
        {history.reviews.map((review, index) => {
          const isCompleted = review.isCompleted;
          const isOverdue = review.isOverdue;
          const isToday = review.isToday;

          // Definir cores baseado no estado
          const borderColor = isCompleted
            ? 'border-l-green-500 dark:border-l-green-400'
            : isOverdue
              ? 'border-l-red-500 dark:border-l-red-400'
              : isToday
                ? 'border-l-orange-500 dark:border-l-orange-400'
                : 'border-l-slate-300 dark:border-l-slate-600';

          const textColor = isCompleted
            ? 'text-slate-900 dark:text-slate-100'
            : isOverdue
              ? 'text-slate-900 dark:text-slate-100'
              : isToday
                ? 'text-slate-900 dark:text-slate-100'
                : 'text-slate-600 dark:text-slate-400';

          const iconColor = isCompleted
            ? 'text-green-600 dark:text-green-400'
            : isOverdue
              ? 'text-red-600 dark:text-red-400'
              : isToday
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-slate-400 dark:text-slate-500';

          return (
            <div key={`${review.stage}-${index}`} className="contents">
              <div className={`flex flex-col items-center justify-center p-2.5 bg-white dark:bg-slate-800 rounded-md border-l-4 ${borderColor} border-y border-r border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-all flex-1 min-w-[100px] min-h-[75px]`}>
                <div className="flex items-center gap-1 mb-1">
                  {isCompleted ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 ${iconColor}`} />
                  ) : isOverdue ? (
                    <AlertCircle className={`w-3.5 h-3.5 ${iconColor}`} />
                  ) : isToday ? (
                    <AlertCircle className={`w-3.5 h-3.5 ${iconColor}`} />
                  ) : (
                    <Clock className={`w-3.5 h-3.5 ${iconColor}`} />
                  )}
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                    Rev {review.stage}
                  </p>
                </div>

                {review.reviewedAt ? (
                  <>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {format(review.reviewedAt, 'dd/MM/yy', { locale: ptBR })}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500">
                      {format(review.reviewedAt, 'HH:mm', { locale: ptBR })}
                    </p>
                    {review.studyDuration !== undefined && (
                      <p className="flex items-center justify-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {review.studyDuration}m
                      </p>
                    )}
                  </>
                ) : isOverdue ? (
                  <>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {review.daysOverdue}d atraso
                    </p>
                    {review.expectedDate && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-500">
                        Era: {format(review.expectedDate, 'dd/MM/yy', { locale: ptBR })}
                      </p>
                    )}
                  </>
                ) : isToday ? (
                  <>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Hoje
                    </p>
                    <p className="text-[10px] text-transparent">--:--</p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Pendente
                    </p>
                    <p className="text-[10px] text-transparent">--:--</p>
                  </>
                )}
              </div>
              {index < history.reviews.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
