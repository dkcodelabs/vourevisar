import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
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
  Star
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const Statistics = () => {
  const navigate = useNavigate();
  const { subjects, fetchSubjects } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const statisticsData = useAdvancedStatistics();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        await fetchSubjects();
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        setHasError(true);
        setIsLoading(false);
        toast.error("Erro ao carregar dados estatísticos");
      }
    };

    loadData();
  }, [fetchSubjects]);

  if (isLoading) {
    return <LoadingSpinner message="Analisando seus dados de estudo" />;
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="p-4 rounded-full bg-red-100">
              <BarChart3 className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-600">Erro ao Carregar Dados</h2>
            <p className="text-gray-600 text-center max-w-md">
              Não foi possível carregar os dados estatísticos. Verifique sua conexão e tente novamente.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verificar se há dados disponíveis
  const hasData = subjects.length > 0;

  if (!hasData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Ícone Principal */}
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <span className="text-5xl">📈</span>
            </div>

            {/* Título */}
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Seu Painel de Controle Completo
            </h2>

            {/* Descrição Principal */}
            <p className="text-gray-600 max-w-lg mx-auto mb-6 leading-relaxed">
              Acompanhe sua evolução com dados reais e tome decisões inteligentes sobre seus estudos.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto mb-8">
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                <span className="text-lg">📊</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Visão Geral</span>
              </div>
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                <span className="text-lg">🔄</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Revisões</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                <span className="text-lg">🏆</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Disciplinas</span>
              </div>
              <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
                <span className="text-lg">⏰</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Hábitos</span>
              </div>
              <div className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2 rounded-lg">
                <span className="text-lg">📈</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Evolução</span>
              </div>
              <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 px-3 py-2 rounded-lg">
                <span className="text-lg">💡</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Insights</span>
              </div>
            </div>

            {/* Frase Motivacional */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 border border-indigo-100 dark:border-indigo-800/30 px-5 py-3 rounded-2xl mb-8 shadow-sm">
              <span className="text-xl flex-shrink-0">🎯</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Quem mensura seus estudos, acelera seus resultados!
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => navigate('/materias')}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Começar Agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        {/* Header */}
        {/* Header */}
        <div className="mt-[15px] px-4 md:px-8 pt-6 pb-6 mb-6 bg-white rounded-2xl border border-gray-200 shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Dashboard de Estatísticas
              </h1>
              <p className="text-sm text-gray-500 mt-1">
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
                  toast.info('Iniciando migração de difficulty_level...');
                  const result = await migrateDifficultyLevels();
                  if (result.success) {
                    toast.success(`Migração concluída! ${result.migratedCount} tópicos migrados.`);
                    window.location.reload(); // Recarregar para ver os dados atualizados
                  } else {
                    toast.error('Erro na migração. Verifique o console.');
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

        {/* Indicador de Dados Reais */}
        <RealDataIndicator
          lastUpdated={new Date()}
          totalSessions={statisticsData.studyHabits.averageTopicsPerDay * 30} // Estimativa
          isLoading={isLoading}
        />

        {/* Tabs Navigation */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 h-auto p-1 bg-gray-100 rounded-xl">
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