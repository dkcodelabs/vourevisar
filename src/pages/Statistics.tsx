import { useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EvolutionDayDetail } from '@/components/statistics/EvolutionDayDetail';
import { EvolutionFocus } from '@/components/statistics/EvolutionFocus';
import { EvolutionLoadingState } from '@/components/statistics/EvolutionLoadingState';
import { EvolutionMemoryCard } from '@/components/statistics/EvolutionMemoryCard';
import { EvolutionOverview } from '@/components/statistics/EvolutionOverview';
import { EvolutionStudyTimeCard } from '@/components/statistics/EvolutionStudyTimeCard';
import { EvolutionSubjectsCard } from '@/components/statistics/EvolutionSubjectsCard';
import { StatisticsHeader } from '@/components/statistics/StatisticsHeader';
import { StudyEmptyState } from '@/components/study/StudyEmptyState';
import { PremiumStateCard } from '@/components/ui/PremiumStateCard';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCycleStatistics } from '@/hooks/useCycleStatistics';
import type { CycleStatisticsPeriod } from '@/types/cycleStatistics';
import { resolveStatisticsDateSelection } from '@/utils/cycleStatistics';

export default function Statistics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateSelection = resolveStatisticsDateSelection(searchParams.get('date'));
  const [period, setPeriod] = useState<CycleStatisticsPeriod>(() => dateSelection?.period ?? 7);
  const effectivePeriod = dateSelection?.period ?? period;
  const { data, isLoading, isError, refetch, isFetching } = useCycleStatistics(effectivePeriod, dateSelection?.date ?? null);

  if (isLoading) return <EvolutionLoadingState />;

  if (isError) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
        <PremiumStateCard
          icon={WifiOff}
          label="Leitura interrompida"
          title="Não foi possível montar sua evolução agora."
          description="Os dados continuam salvos. Tente novamente para recarregar o ciclo, as revisões e o tempo registrado."
          actionLabel={isFetching ? 'Tentando novamente' : 'Tentar novamente'}
          actionIcon={RefreshCw}
          requiresOnline
          onAction={() => void refetch()}
          helperText="Nenhuma estatística é estimada enquanto a consulta está indisponível."
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-4 md:px-6">
        <StudyEmptyState
          kind="no-cycle"
          variant="center"
          onAction={() => navigate('/meus-editais')}
        />
      </div>
    );
  }

  const handleInsightAction = () => {
    navigate(data.insight.actionHref, data.insight.focusSubjectId
      ? { state: { focusSubjectId: data.insight.focusSubjectId } }
      : undefined);
  };

  const handlePeriodChange = (nextPeriod: CycleStatisticsPeriod) => {
    if (dateSelection) setSearchParams({}, { replace: true });
    setPeriod(nextPeriod);
  };

  return (
    <TooltipProvider>
      <main className="space-y-4 px-4 py-4 md:px-6 md:py-5">
        <StatisticsHeader data={data} period={effectivePeriod} onPeriodChange={handlePeriodChange} />
        <EvolutionOverview progress={data.progress} time={data.time} />
        <EvolutionFocus insight={data.insight} onAction={handleInsightAction} />

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <EvolutionMemoryCard memory={data.memory} />
          <EvolutionStudyTimeCard time={data.time} />
        </div>

        {data.selectedDay ? (
          <EvolutionDayDetail
            day={data.selectedDay}
            onClear={() => setSearchParams({}, { replace: true })}
            onRetryContacts={() => void refetch()}
            isRetryingContacts={isFetching}
          />
        ) : null}

        <EvolutionSubjectsCard
          subjects={data.subjects}
          onOpenSubject={(focusSubjectId) => navigate('/ciclo-estudos', { state: { focusSubjectId } })}
        />
      </main>
    </TooltipProvider>
  );
}
