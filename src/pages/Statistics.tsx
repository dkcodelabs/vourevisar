import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
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
  Loader2,
  Star
} from 'lucide-react';

const Statistics = () => {
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
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-700">Carregando estatísticas...</h2>
            <p className="text-gray-500">Analisando seus dados de estudo</p>
          </div>
        </div>
      </div>
    );
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
          <div className="flex flex-col items-center justify-center h-96 space-y-6">
            <div className="p-6 rounded-full bg-blue-100">
              <BarChart3 className="h-16 w-16 text-blue-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">Estatísticas de Estudo</h2>
              <p className="text-lg text-gray-600">Nenhum dado disponível para análise</p>
              <p className="text-gray-500 max-w-md">
                Adicione matérias e tópicos para começar a ver suas estatísticas detalhadas e insights inteligentes.
              </p>
            </div>
            <button 
              onClick={() => window.location.href = '/subjects'} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Adicionar Matérias
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 rounded-full bg-blue-100">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">
                Dashboard de Estatísticas
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Análise completa do seu progresso de estudos com insights inteligentes e métricas detalhadas
            </p>
            
            {/* Botão temporário de migração */}
            <div className="flex justify-center">
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
                variant="outline"
                size="sm"
                className="text-xs"
              >
                🔧 Migrar Difficulty Levels
              </Button>
            </div>
          </motion.div>

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
      </div>
    </TooltipProvider>
  );
};

export default Statistics;