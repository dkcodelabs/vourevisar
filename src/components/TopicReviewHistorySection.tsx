import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, TrendingUp, TrendingDown, Minus, AlertCircle, ChevronRight } from 'lucide-react';
import { useTopicReviewHistory } from '@/hooks/useTopicReviewHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { TopicEvolutionChart } from '@/components/topics/TopicEvolutionChart';

interface TopicReviewHistorySectionProps {
  topicId: string;
}

export const TopicReviewHistorySection: React.FC<TopicReviewHistorySectionProps> = ({
  topicId,
}) => {
  const { history, isLoading, error } = useTopicReviewHistory(topicId);

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

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Histórico de Estudos
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">
            {history.firstContact ? '✔ Estudado' : 'Não estudado'}
          </span>
          {history.firstContact && (
            <span className="text-muted-foreground font-medium">(Cobertura Ativa)</span>
          )}
        </div>
      </div>

      {/* Grid de Cards com Setas */}
      <div className="flex items-center gap-2 overflow-x-auto p-2 pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Primeiro Estudo */}
        {history.firstContact && (
          <>
            <div className="flex flex-col items-center justify-center p-2.5 bg-card rounded-md border-l-4 border-l-primary border border-border shadow-sm hover:shadow-md transition-all flex-1 min-w-[100px] min-h-[75px]">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-medium text-foreground">1º Estudo</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {format(history.firstContact, 'dd/MM/yy', { locale: ptBR })}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {format(history.firstContact, 'HH:mm', { locale: ptBR })}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          </>
        )}

        {/* Revisões */}
        {history.reviews.map((review, index) => {
          const isCompleted = review.isCompleted;
          const isOverdue = review.isOverdue;
          const isToday = review.isToday;

          const borderColor = isCompleted
            ? 'border-l-emerald-500'
            : isOverdue
              ? 'border-l-rose-500'
              : isToday
                ? 'border-l-amber-500'
                : 'border-l-border';

          const iconColor = isCompleted
            ? 'text-emerald-500'
            : isOverdue
              ? 'text-rose-500'
              : isToday
                ? 'text-amber-500'
                : 'text-muted-foreground/50';

          return (
            <div key={`${review.stage}-${index}`} className="contents">
              <div className={`flex flex-col items-center justify-center p-2.5 bg-card rounded-md border-l-4 ${borderColor} border border-border shadow-sm hover:shadow-md transition-all flex-1 min-w-[100px] min-h-[75px]`}>
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
                  <p className="text-xs font-medium text-foreground">
                    Rev {review.stage}
                  </p>
                </div>

                {review.reviewedAt ? (
                  <>
                    <p className="text-[11px] text-muted-foreground">
                      {format(review.reviewedAt, 'dd/MM/yy', { locale: ptBR })}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {format(review.reviewedAt, 'HH:mm', { locale: ptBR })}
                    </p>
                    {review.studyDuration !== undefined && (
                      <p className="flex items-center justify-center gap-1 text-[10px] text-primary font-medium mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {review.studyDuration}m
                      </p>
                    )}
                  </>
                ) : isOverdue ? (
                  <>
                    <p className="text-[11px] text-rose-500 font-semibold">
                      {review.daysOverdue}d atraso
                    </p>
                    {review.expectedDate && (
                      <p className="text-[10px] text-muted-foreground/60">
                        Era: {format(review.expectedDate, 'dd/MM/yy', { locale: ptBR })}
                      </p>
                    )}
                  </>
                ) : isToday ? (
                  <>
                    <p className="text-[11px] text-amber-500 font-semibold">Hoje!</p>
                    <p className="text-[10px] text-muted-foreground/50">Faça agora</p>
                  </>
                ) : (
                  <>
                    {/* Card pendente: mostrar data prevista pelo SRS */}
                    {review.expectedDate ? (
                      <p className="text-[11px] text-muted-foreground">
                        {format(review.expectedDate, 'dd/MM/yy', { locale: ptBR })}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/50 italic">Adaptive</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/40">
                      {review.daysUntil > 0 ? `em ${review.daysUntil}d` : 'Pendente'}
                    </p>
                  </>
                )}
              </div>
              {index < history.reviews.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Nota explicativa do SRS adaptativo */}
      {history.nextReviews?.length > 0 && (
        <div className="mt-3 bg-card p-3 rounded-lg border border-border text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">
            ℹ️ Próximas revisões são calculadas automaticamente
          </p>
          <ul className="list-disc list-inside opacity-80 pl-1 space-y-0.5">
            <li>Se for <span className="text-emerald-500 font-medium">Fácil</span>: intervalo aumenta (mais dias).</li>
            <li>Se for <span className="text-rose-500 font-medium">Difícil</span>: intervalo encurta (menos dias).</li>
            <li>A data mostrada é a previsão atual — será recalculada após cada avaliação.</li>
          </ul>
        </div>
      )}

      {/* Tendência recente */}
      {history.latestTrendLabel && (
        <div className="mt-3 flex items-center gap-2 px-2 py-2 bg-card rounded-lg border border-border">
          {history.latestTrendLabel === 'Melhorando' && (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          )}
          {history.latestTrendLabel === 'Piorando' && (
            <TrendingDown className="w-4 h-4 text-rose-500" />
          )}
          {(history.latestTrendLabel === 'Estável' || history.latestTrendLabel === 'Sem histórico suficiente') && (
            <Minus className="w-4 h-4 text-muted-foreground/50" />
          )}
          <span
            className={`text-xs font-semibold cursor-help ${
              history.latestTrendLabel === 'Melhorando' ? 'text-emerald-500' :
              history.latestTrendLabel === 'Piorando' ? 'text-rose-500' :
              'text-muted-foreground'
            }`}
            title="Baseado nas últimas avaliações de dificuldade registradas."
          >
            Tendência recente: {history.latestTrendLabel}
          </span>
          {history.latestTrendDelta != null && (
            <span className="text-[10px] text-muted-foreground/50">
              (Δ {history.latestTrendDelta > 0 ? '+' : ''}{history.latestTrendDelta.toFixed(1)})
            </span>
          )}
        </div>
      )}

      {/* Gráfico de Evolução de Dificuldade */}
      {history.rawEntries && history.rawEntries.length >= 2 && (
        <div className="mt-3 p-3 bg-card rounded-lg border border-border">
          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            Evolução da Dificuldade
          </p>
          <TopicEvolutionChart history={history.rawEntries} />
        </div>
      )}
    </div>
  );
};
