import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { motion } from 'framer-motion';
import { toast } from '@/lib/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdvancedStatistics } from '@/hooks/useAdvancedStatistics';
import { migrateDifficultyLevels } from '@/utils/migrateDifficultyLevels';
import { Button } from '@/components/ui/button';
import {
  OverviewSection,
  SpacedReviewsSection,
  SubjectPerformanceSection,
  StudyHabitsSection,
  EvolutionSection,
  InsightsSection,
  RealDataIndicator,
  DifficultyStatsSection
} from '@/components/statistics';
import {
  BarChart3,
  RefreshCw,
  Award,
  Activity,
  TrendingUp,
  Lightbulb,
  Star,
  WifiOff
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { errorService } from '@/lib/errors/errorService';
import { useAuth } from '@/contexts/AuthContext';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { StudyEmptyState } from '@/components/study/StudyEmptyState';
import { PremiumStateCard } from '@/components/ui/PremiumStateCard';
import { getStudyEmptyStateKind } from '@/utils/studyEntryState';

const Statistics = () => {
  const navigate = useNavigate();
  const { subjects, fetchSubjects } = useApp();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [statsFilter, setStatsFilter] = useState<{ type: 'all' | 'cycle' | 'edital'; id?: string }>({ type: 'cycle' });
  const statisticsData = useAdvancedStatistics(statsFilter);
  const { userCycle, isLoading: cycleLoading } = useCycleState();
  const { editaisData } = useEditalOriginsWithMerge();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        await fetchSubjects();
        setIsLoading(false);
      } catch (error) {
        await errorService.report(
          error,
          {
            module: 'Statistics',
            action: 'loadData',
            userMessage: 'Erro ao carregar dados estatísticos.',
            severity: 'high',
            scope: 'core',
            userId: user?.id
          }
        );
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchSubjects, user]);

  if (isLoading || cycleLoading) {
    return <LoadingSpinner size="large" message="Analisando seus dados de estudo" fullPage />;
  }

  if (hasError) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
        <PremiumStateCard
          icon={WifiOff}
          label="Conexão interrompida"
          title="Seus estudos estão salvos. Só falta reconectar."
          description="A tela de estatísticas precisa consultar o Supabase, mas o navegador está sem conexão no momento. Assim que a internet voltar, tente carregar os dados novamente."
          actionLabel="Tentar novamente"
          actionIcon={RefreshCw}
          requiresOnline
          onAction={() => window.location.reload()}
          helperText="Quando a conexão voltar, seus dados aparecem aqui."
        />
      </div>
    );
  }

  // Verificar se há dados disponíveis (se existe um ciclo ativo)
  const hasActiveCycle = userCycle?.ciclo_atual && userCycle.ciclo_atual.length > 0;
  const hasAnyEdital = editaisData.length > 0 || subjects.length > 0;
  const hasData = hasActiveCycle;

  if (!hasData) {
    const emptyStateKind = getStudyEmptyStateKind({
      editalCount: editaisData.length || (hasAnyEdital ? 1 : 0),
      editaisWithContentCount: editaisData.filter(edital => edital.subject_ids.length > 0).length,
      hasAnyContent: subjects.length > 0,
      hasActiveCycle: false,
    });

    return (
      <div className="w-full">
        <div className="container mx-auto p-4">
          <StudyEmptyState
            kind={emptyStateKind ?? 'no-edital'}
            variant="center"
            onAction={() => navigate('/meus-editais')}
          />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <div className="mt-0 px-4 md:px-6 py-4 mb-6 bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Dashboard de Estatísticas
              </h1>
              <p className="text-sm text-content-muted mt-1">
                Análise completa do seu progresso de estudos com insights inteligentes
              </p>
            </div>

            {/* Header Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/estatisticas/tendencia')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Análise de Tendência
              </Button>

              <Button
                onClick={async () => {
                  try {
                    toast.info('Iniciando migração de difficulty_level...');
                    const result = await migrateDifficultyLevels();
                    if (result.success) {
                      toast.success(`Migração concluída! ${result.migratedCount} tópicos migrados.`);
                      window.location.reload();
                    } else {
                      await errorService.report(
                        new Error('Migration failed logically'),
                        {
                          module: 'Statistics',
                          action: 'migrateDifficultyLevels',
                          userMessage: 'Erro na migração de dificuldade.',
                          severity: 'medium',
                          scope: 'core',
                          userId: user?.id,
                          metadata: { result }
                        }
                      );
                    }
                  } catch (error) {
                    await errorService.report(
                      error,
                      {
                        module: 'Statistics',
                        action: 'migrateDifficultyLevels',
                        userMessage: 'Erro crítico na migração de dificuldade.',
                        severity: 'high',
                        scope: 'core',
                        userId: user?.id
                      }
                    );
                  }
                }}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
              >
                🔧 Migrar Difficulty
              </Button>
            </div>
          </div>
        </div>

        {/* Cabeçalho de Filtros */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card p-4 rounded-2xl border border-border mx-4 md:mx-6 md:light:bg-card md:dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Escopo da Análise</h3>
              <p className="text-xs text-content-muted">Dados do {statsFilter.type === 'cycle' ? 'ciclo atual' : 'histórico completo'}</p>
            </div>
          </div>
          <div className="flex gap-2 bg-secondary p-1 rounded-xl border border-border md:light:bg-secondary md:dark:bg-black/20">
            <button
              onClick={() => setStatsFilter({ type: 'cycle' })}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${statsFilter.type === 'cycle' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-foreground'}`}
            >
              Ciclo Atual
            </button>
            <button
              onClick={() => setStatsFilter({ type: 'all' })}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${statsFilter.type === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-content-muted hover:text-foreground'}`}
            >
              Histórico Total
            </button>
          </div>
        </div>

        {/* Indicador de Dados Reais */}
        <RealDataIndicator
          lastUpdated={new Date()}
          totalSessions={statisticsData.studyHabits.averageTopicsPerDay * 30} // Estimativa
          isLoading={isLoading}
        />

        {/* Tabs Navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 h-auto p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Revisões</span>
            </TabsTrigger>
            <TabsTrigger
              value="subjects"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Disciplinas</span>
            </TabsTrigger>
            <TabsTrigger
              value="habits"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Hábitos</span>
            </TabsTrigger>
            <TabsTrigger
              value="evolution"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Evolução</span>
            </TabsTrigger>
            <TabsTrigger
              value="difficulty"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Dificuldade</span>
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="flex items-center gap-2 py-3 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
            >
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <div className="mt-8">
            <TabsContent value="overview" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <OverviewSection data={statisticsData.overview} />
              </motion.div>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <SpacedReviewsSection data={statisticsData.spacedReviews} />
              </motion.div>
            </TabsContent>

            <TabsContent value="subjects" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <SubjectPerformanceSection data={statisticsData.subjectPerformance} />
              </motion.div>
            </TabsContent>

            <TabsContent value="habits" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <StudyHabitsSection data={statisticsData.studyHabits} />
              </motion.div>
            </TabsContent>

            <TabsContent value="evolution" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <EvolutionSection data={statisticsData.evolution} />
              </motion.div>
            </TabsContent>

            <TabsContent value="difficulty" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <DifficultyStatsSection data={statisticsData.difficultyStats} />
              </motion.div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <InsightsSection data={statisticsData.insights} />
              </motion.div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </TooltipProvider >
  );
};

export default Statistics;
