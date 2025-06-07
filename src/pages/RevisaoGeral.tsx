import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import { Trophy } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { toast } from 'sonner';
import { StatisticsSection } from '@/components/revisao-geral/StatisticsSection';
import { ProgressBySubjectSection } from '@/components/revisao-geral/ProgressBySubjectSection';
import { FullyCompletedSubjectsSection } from '@/components/revisao-geral/FullyCompletedSubjectsSection';
import { HighProgressSubjectsSection } from '@/components/revisao-geral/HighProgressSubjectsSection';
import { TipsSection } from '@/components/revisao-geral/TipsSection';

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
  const { subjects, updateSubject, isDataLoaded, fetchSubjects, studyProgress } = useApp();
  const { isSubjectCompleted, isSubjectReadyToLeaveStudyPlan } = useStudyPlanLogic();
  const [isLoading, setIsLoading] = useState(true);
  const [showAllProgress, setShowAllProgress] = useState(false);
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllHighProgress, setShowAllHighProgress] = useState(false);

  console.log('RevisaoGeral - Current subjects:', subjects);

  // Função melhorada para verificar se um tópico está completamente dominado
  const isTopicFullyDominated = (topic: Topic): boolean => {
    console.log('Checking topic:', topic.name, 'reviewStage:', topic.reviewStage, 'nextReview:', topic.nextReview, 'completed:', topic.completed);
    
    // Um tópico está dominado se:
    // 1. reviewStage é 'Concluído' OU completed é true
    // 2. E não tem próxima revisão agendada (nextReview é null)
    const isDominated = (topic.reviewStage === 'Concluído' || topic.completed === true) && topic.nextReview === null;
    
    console.log('Topic', topic.name, 'is dominated:', isDominated);
    return isDominated;
  };

  // Função para verificar se um tópico está concluído (mesmo que ainda tenha revisões)
  const isTopicCompleted = (topic: Topic): boolean => {
    return topic.reviewStage === 'Concluído' || topic.completed === true;
  };

  // Filtrar matérias completamente dominadas (100% finalizadas - sem revisões pendentes)
  const fullyCompletedSubjects = subjects.filter(isSubjectCompleted);
  console.log('RevisaoGeral - Fully completed subjects:', fullyCompletedSubjects.map(s => s.name));

  // CORRIGIDO: Filtrar matérias com alto progresso EXCLUINDO explicitamente as que já estão 100% dominadas
  const highProgressSubjects = subjects.filter(subject => {
    const isReady = isSubjectReadyToLeaveStudyPlan(subject);
    const isFullyCompleted = isSubjectCompleted(subject);
    
    console.log(`Subject ${subject.name}:`, {
      isReady,
      isFullyCompleted,
      shouldInclude: isReady && !isFullyCompleted
    });
    
    return isReady && !isFullyCompleted;
  });
  console.log('RevisaoGeral - High progress subjects:', highProgressSubjects.map(s => s.name));

  // Mapear matérias com tópicos dominados individualmente
  const subjectsWithDominatedTopics = subjects
    .map(subject => {
      const dominatedTopics = subject.topics.filter(isTopicFullyDominated);
      const completedTopics = subject.topics.filter(isTopicCompleted);
      return {
        ...subject,
        dominatedTopics,
        completedTopics,
        hasDominatedTopics: dominatedTopics.length > 0,
        hasCompletedTopics: completedTopics.length > 0
      };
    })
    .filter(subject => subject.hasDominatedTopics || subject.hasCompletedTopics)
    .sort((a, b) => b.dominatedTopics.length - a.dominatedTopics.length);

  console.log('RevisaoGeral - Subjects with dominated topics:', subjectsWithDominatedTopics.map(s => s.name));

  // Estatísticas
  const totalSubjectsWithAllTopicsCompleted = subjects.filter(isSubjectReadyToLeaveStudyPlan).length;
  
  const totalFullyCompletedTopics = subjects.reduce((acc, subject) => {
    const dominatedTopics = subject.topics.filter(isTopicFullyDominated).length;
    return acc + dominatedTopics;
  }, 0);

  const totalCompletedTopics = subjects.reduce((acc, subject) => {
    const completedTopics = subject.topics.filter(isTopicCompleted).length;
    return acc + completedTopics;
  }, 0);

  const totalTopics = subjects.reduce((acc, subject) => acc + subject.topics.length, 0);
  const totalSubjects = subjects.length;
  const completionPercentage = totalSubjects > 0 ? Math.round((totalSubjectsWithAllTopicsCompleted / totalSubjects) * 100) : 0;
  const topicsCompletionPercentage = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

  const totalDelayedTopics = studyProgress.delayedTopics;
  const totalFutureTopics = studyProgress.futureTopics;

  // Limites para visualização
  const ITEMS_LIMIT = 5;
  const displayedProgressSubjects = showAllProgress 
    ? subjectsWithDominatedTopics 
    : subjectsWithDominatedTopics.slice(0, ITEMS_LIMIT);
  
  const displayedCompletedSubjects = showAllCompleted 
    ? fullyCompletedSubjects 
    : fullyCompletedSubjects.slice(0, ITEMS_LIMIT);
  
  const displayedHighProgressSubjects = showAllHighProgress 
    ? highProgressSubjects 
    : highProgressSubjects.slice(0, ITEMS_LIMIT);

  // Recarregar dados quando necessário
  useEffect(() => {
    if (isDataLoaded) {
      setIsLoading(false);
    }
  }, [isDataLoaded]);

  // Força uma atualização dos dados ao entrar na página
  useEffect(() => {
    const refreshData = async () => {
      try {
        await fetchSubjects();
      } catch (error) {
        console.error('Erro ao atualizar dados:', error);
      }
    };
    
    refreshData();
  }, []);

  const handleReactivateSubject = async (subjectId: string) => {
    try {
      await updateSubject(subjectId, { status: 'Em Estudo' });
      toast.success("Matéria reativada para estudo!");
    } catch (error) {
      toast.error("Erro ao reativar matéria. Tente novamente.");
    }
  };

  const getLastReviewDate = (subject: Subject): Date | null => {
    const lastReviewDates = subject.topics
      .map(topic => topic.lastReviewedAt)
      .filter(date => date !== undefined) as Date[];
    
    if (lastReviewDates.length === 0) return null;
    
    return new Date(Math.max(...lastReviewDates.map(date => date.getTime())));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-2 sm:px-4 md:px-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="space-y-6" variants={containerVariants}>
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-800">Revisão Geral</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Acompanhe suas conquistas e gerencie matérias e tópicos dominados
          </p>
        </motion.div>

        {/* Estatísticas */}
        <StatisticsSection
          totalSubjectsWithAllTopicsCompleted={totalSubjectsWithAllTopicsCompleted}
          totalSubjects={totalSubjects}
          completionPercentage={completionPercentage}
          totalCompletedTopics={totalCompletedTopics}
          totalTopics={totalTopics}
          topicsCompletionPercentage={topicsCompletionPercentage}
          totalDelayedTopics={totalDelayedTopics}
          totalFutureTopics={totalFutureTopics}
        />

        {/* Tópicos Concluídos e Dominados */}
        <ProgressBySubjectSection
          subjectsWithDominatedTopics={displayedProgressSubjects}
          isTopicFullyDominated={isTopicFullyDominated}
          isTopicCompleted={isTopicCompleted}
          handleReactivateSubject={handleReactivateSubject}
          getLastReviewDate={getLastReviewDate}
          totalCount={subjectsWithDominatedTopics.length}
          showAll={showAllProgress}
          onToggleShowAll={() => setShowAllProgress(!showAllProgress)}
          limit={ITEMS_LIMIT}
        />

        {/* Matérias Concluídas */}
        <FullyCompletedSubjectsSection
          fullyCompletedSubjects={displayedCompletedSubjects}
          isTopicFullyDominated={isTopicFullyDominated}
          handleReactivateSubject={handleReactivateSubject}
          getLastReviewDate={getLastReviewDate}
          totalCount={fullyCompletedSubjects.length}
          showAll={showAllCompleted}
          onToggleShowAll={() => setShowAllCompleted(!showAllCompleted)}
          limit={ITEMS_LIMIT}
        />

        {/* Matérias com Alto Progresso */}
        <HighProgressSubjectsSection
          highProgressSubjects={displayedHighProgressSubjects}
          isTopicFullyDominated={isTopicFullyDominated}
          handleReactivateSubject={handleReactivateSubject}
          getLastReviewDate={getLastReviewDate}
          totalCount={highProgressSubjects.length}
          showAll={showAllHighProgress}
          onToggleShowAll={() => setShowAllHighProgress(!showAllHighProgress)}
          limit={ITEMS_LIMIT}
        />

        {/* Dicas de Revisão */}
        <TipsSection />
      </motion.div>
    </motion.div>
  );
};

export default RevisaoGeral;
