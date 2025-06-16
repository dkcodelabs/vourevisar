
import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import StudyPlanLoadingState from '@/components/study-plan/StudyPlanLoadingState';
import StudyPlanContent from '@/components/study-plan/StudyPlanContent';
import StudyPlanEmptyState from '@/components/study-plan/StudyPlanEmptyState';

const StudyPlan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshData, subjects, isLoading: isAppLoading } = useApp();
  
  // Recarregar dados sempre que a página for acessada
  useEffect(() => {
    console.log('📄 StudyPlan - Página acessada, recarregando dados...');
    if (user) {
      refreshData();
    }
  }, []); // Executa apenas na montagem da página

  // Não renderizar nada até que os dados iniciais estejam carregados
  if (isAppLoading) {
    return <StudyPlanLoadingState />;
  }

  // Se não há matérias e não está carregando, mostrar estado vazio
  if (subjects.length === 0 && !isAppLoading) {
    return (
      <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8">
        <div className="py-8 space-y-6">
          <StudyPlanEmptyState type="no-subjects" />
        </div>
      </div>
    );
  }

  return <StudyPlanContent />;
};

export default StudyPlan;
