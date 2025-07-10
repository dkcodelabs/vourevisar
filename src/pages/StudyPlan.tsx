
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
  const { forceRefresh, subjects, isLoading: isAppLoading, isDataLoaded } = useApp();
  
  // Recarregar dados sempre que a página for acessada
  useEffect(() => {
    console.log('📄 StudyPlan - Página acessada, recarregando dados...');
    if (user) {
      forceRefresh();
    }
  }, []); // Executa apenas na montagem da página

  // NOVO: Verificar mudança de dia e atualizar automaticamente
  useEffect(() => {
    if (!user) return;

    const checkDayChange = () => {
      const now = new Date();
      const currentDay = now.toDateString();
      const lastCheckDay = localStorage.getItem('lastStudyPlanDay');
      
      if (lastCheckDay && lastCheckDay !== currentDay) {
        console.log('📅 Detectada mudança de dia, atualizando dados...');
        forceRefresh();
      }
      
      localStorage.setItem('lastStudyPlanDay', currentDay);
    };

    // Verificar mudança de dia ao montar
    checkDayChange();

    // Verificar mudança de dia a cada minuto
    const interval = setInterval(checkDayChange, 60000);

    return () => clearInterval(interval);
  }, [user, forceRefresh]);

  // Debug log
  useEffect(() => {
    console.log('📄 StudyPlan - Estado atual:', {
      isAppLoading,
      isDataLoaded,
      subjectsCount: subjects.length,
      subjects: subjects.map(s => ({ 
        name: s.name, 
        topicsCount: s.topics?.length || 0 
      }))
    });
  }, [isAppLoading, isDataLoaded, subjects]);

  // Mostrar loading enquanto dados estão carregando
  if (isAppLoading || !isDataLoaded) {
    return <StudyPlanLoadingState />;
  }

  // Se não há matérias e os dados foram carregados, mostrar estado vazio
  if (subjects.length === 0 && isDataLoaded) {
    return (
      <div className="space-y-6">
        <StudyPlanEmptyState type="no-subjects" />
      </div>
    );
  }

  return <StudyPlanContent />;
};

export default StudyPlan;
