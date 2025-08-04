import { lazy } from 'react';

// Lazy loading de componentes pesados
export const LazyDashboard = lazy(() => import('@/pages/Dashboard'));
export const LazySubjects = lazy(() => import('@/pages/Subjects'));
export const LazyStudyPlan = lazy(() => import('@/pages/StudyPlan'));
export const LazyRevisoes = lazy(() => import('@/pages/Revisoes'));
export const LazyQuestoes = lazy(() => import('@/pages/Questoes'));
export const LazyTopics = lazy(() => import('@/pages/Topics'));
export const LazyStatistics = lazy(() => import('@/pages/Statistics'));
export const LazyQuestionsStatistics = lazy(() => import('@/pages/QuestionsStatistics'));

// Componentes de loading
export const ComponentLoader = () => (
  <div className="flex justify-center items-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Hook para preload de componentes críticos
export const usePreloadComponents = () => {
  const preloadDashboard = () => import('@/pages/Dashboard');
  const preloadStudyPlan = () => import('@/pages/StudyPlan');
  const preloadRevisoes = () => import('@/pages/Revisoes');
  
  return {
    preloadDashboard,
    preloadStudyPlan,
    preloadRevisoes,
  };
};