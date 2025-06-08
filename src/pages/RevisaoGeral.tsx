
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ModernStatisticsSection } from '@/components/revisao-geral/ModernStatisticsSection';
import { HighProgressSubjectsSection } from '@/components/revisao-geral/HighProgressSubjectsSection';
import { FullyCompletedSubjectsSection } from '@/components/revisao-geral/FullyCompletedSubjectsSection';
import { TipsSection } from '@/components/revisao-geral/TipsSection';
import { 
  checkAllStudiesCompleted, 
  isTopicDominated, 
  getHighProgressSubjects, 
  getFullyCompletedSubjects 
} from '@/utils/studiesCompletionChecker';
import { toast } from 'sonner';
import { isAfter, isBefore, isToday } from 'date-fns';
import { useState } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    }
  }
};

const RevisaoGeral = () => {
  const { subjects, isLoading } = useApp();
  const { user } = useAuth();
  const [showAllHighProgress, setShowAllHighProgress] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  // Query para buscar métricas de sessões de estudo
  const { data: studyMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['study-metrics', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      const userSubjectIds = subjects.map(s => s.id);
      const { data: dominatedTopics, error: topicsError } = await supabase
        .from('topics')
        .select('id, review_stage, subject_id')
        .eq('review_stage', 'Concluído');

      if (topicsError) throw topicsError;

      const userDominatedTopics = dominatedTopics?.filter(topic => 
        userSubjectIds.includes(topic.subject_id)
      ) || [];

      let consecutiveDays = 0;
      if (sessionsData && sessionsData.length > 0) {
        const today = new Date();
        const sortedSessions = sessionsData.sort((a, b) => 
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        );
        
        let currentDate = new Date(today);
        for (const session of sortedSessions) {
          const sessionDate = new Date(session.session_date);
          const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 1) {
            consecutiveDays++;
            currentDate = sessionDate;
          } else {
            break;
          }
        }
      }

      return {
        totalSessions: sessionsData?.length || 0,
        consecutiveDays,
        dominatedTopicsCount: userDominatedTopics.length
      };
    },
    enabled: !!user && subjects.length > 0
  });

  // Calcular estatísticas dos tópicos
  const calculateTopicStats = () => {
    let completedTopics = 0;
    let dominatedTopics = 0;
    let delayedTopics = 0;
    let futureTopics = 0;
    let totalTopics = 0;

    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        totalTopics++;
        
        if (topic.completed || topic.reviewStage) {
          completedTopics++;
        }
        
        if (isTopicDominated(topic)) {
          dominatedTopics++;
        }
        
        if (topic.nextReview) {
          const reviewDate = new Date(topic.nextReview);
          if (isToday(reviewDate)) {
            // Para hoje, não contamos como atrasado nem futuro
          } else if (isBefore(reviewDate, new Date())) {
            delayedTopics++;
          } else if (isAfter(reviewDate, new Date())) {
            futureTopics++;
          }
        }
      });
    });

    return {
      totalTopics,
      completedTopics,
      dominatedTopics,
      delayedTopics,
      futureTopics
    };
  };

  const topicStats = calculateTopicStats();
  const completedSubjects = getFullyCompletedSubjects(subjects);
  const highProgressSubjects = getHighProgressSubjects(subjects);

  const handleReactivateSubject = async (subjectId: string) => {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ status: 'Em Estudo' })
        .eq('id', subjectId);

      if (error) throw error;

      toast.success('Matéria reativada com sucesso!');
      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error('Error reactivating subject:', error);
      toast.error('Erro ao reativar matéria');
    }
  };

  const getLastReviewDate = (subject: any): Date | null => {
    const lastDates = subject.topics
      .map((topic: any) => topic.last_reviewed_at)
      .filter(Boolean)
      .map((date: string) => new Date(date));
    
    return lastDates.length > 0 ? new Date(Math.max(...lastDates.map(d => d.getTime()))) : null;
  };

  const highProgressLimit = 3;
  const completedLimit = 5;

  const displayedHighProgress = showAllHighProgress 
    ? highProgressSubjects 
    : highProgressSubjects.slice(0, highProgressLimit);

  const displayedCompleted = showAllCompleted 
    ? completedSubjects 
    : completedSubjects.slice(0, completedLimit);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div 
        className="space-y-8"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🎯 Revisão Geral dos Estudos
          </h1>
          <p className="text-lg text-gray-600">Acompanhe seu progresso e conquistas acadêmicas</p>
        </motion.div>

        {/* Métricas Principais com Cards Destacados */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 rounded-xl border border-green-200 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{completedSubjects.length}</div>
            <h3 className="text-lg font-semibold text-green-800 mb-1">Matérias Dominadas</h3>
            <p className="text-sm text-green-600">100% concluídas</p>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-6 rounded-xl border border-blue-200 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{topicStats.dominatedTopics}</div>
            <h3 className="text-lg font-semibold text-blue-800 mb-1">Tópicos Dominados</h3>
            <p className="text-sm text-blue-600">totalmente dominados</p>
          </div>

          <div className="bg-gradient-to-br from-purple-100 to-violet-100 p-6 rounded-xl border border-purple-200 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">{studyMetrics?.consecutiveDays || 0}</div>
            <h3 className="text-lg font-semibold text-purple-800 mb-1">Dias Consecutivos</h3>
            <p className="text-sm text-purple-600">estudando sem parar</p>
          </div>
        </motion.div>

        {/* Estatísticas Detalhadas */}
        <ModernStatisticsSection 
          totalSubjects={subjects.length}
          completedSubjects={completedSubjects.length}
          totalTopics={topicStats.totalTopics}
          completedTopics={topicStats.completedTopics}
          delayedTopics={topicStats.delayedTopics}
          futureTopics={topicStats.futureTopics}
          dominatedTopics={topicStats.dominatedTopics}
          isLoading={isLoading || metricsLoading}
        />

        {/* Matérias com Alto Progresso - só mostrar se houver */}
        {highProgressSubjects.length > 0 && (
          <HighProgressSubjectsSection
            highProgressSubjects={displayedHighProgress}
            isTopicFullyDominated={isTopicDominated}
            handleReactivateSubject={handleReactivateSubject}
            getLastReviewDate={getLastReviewDate}
            totalCount={highProgressSubjects.length}
            showAll={showAllHighProgress}
            onToggleShowAll={() => setShowAllHighProgress(!showAllHighProgress)}
            limit={highProgressLimit}
          />
        )}

        {/* Matérias Totalmente Concluídas */}
        {completedSubjects.length > 0 && (
          <FullyCompletedSubjectsSection
            fullyCompletedSubjects={displayedCompleted}
            isTopicFullyDominated={isTopicDominated}
            handleReactivateSubject={handleReactivateSubject}
            getLastReviewDate={getLastReviewDate}
            totalCount={completedSubjects.length}
            showAll={showAllCompleted}
            onToggleShowAll={() => setShowAllCompleted(!showAllCompleted)}
            limit={completedLimit}
          />
        )}

        {/* Dicas para Estudos */}
        <TipsSection />
      </motion.div>
    </div>
  );
};

export default RevisaoGeral;
