
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StudyPlanHeader from './StudyPlanHeader';
import NewCycleMessage from './NewCycleMessage';
import AllStudiesCompletedMessage from './AllStudiesCompletedMessage';
import AllTopicsInReviewMessage from './AllTopicsInReviewMessage';
import CycleCompletedMessage from './CycleCompletedMessage';
import DayCompletedMessage from './DayCompletedMessage';
import StudyPlanEmptyState from './StudyPlanEmptyState';
import StudyPlanMainView from './StudyPlanMainView';
import StudyPlanLoadingState from './StudyPlanLoadingState';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import { useApp } from '@/contexts/AppContext';

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

const StudyPlanContent = () => {
  const navigate = useNavigate();
  const { subjects, isLoading: isAppLoading } = useApp();
  
  const {
    expandedSubject,
    tempMarkedTopics,
    showNewCycleMessage,
    userCycle,
    dailySubjects,
    nextSubjects,
    subjectsByStatus,
    allDaySubjectsCompleted,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    allStudiesCompleted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    disciplinasIniciadasCiclo,
    isCycleCompleted,
    handleStartNewCycle,
    isNextDayLoading,
    showNewCycleStarted,
    allTopicsInReview,
    isCycleLoading
  } = useStudyPlanLogic();

  console.log('📊 StudyPlan render - Estado detalhado:', {
    isAppLoading,
    isCycleLoading,
    allDaySubjectsCompleted,
    hasAvailableSubjects,
    dailySubjectsLength: dailySubjects.length,
    nextSubjectsLength: nextSubjects.length,
    isCycleCompleted,
    allTopicsInReview,
    userCycle: userCycle ? {
      disciplinas_do_dia: userCycle.disciplinas_do_dia,
      ciclo_atual: userCycle.ciclo_atual,
      disciplinas_do_dia_length: userCycle.disciplinas_do_dia?.length,
      ciclo_atual_length: userCycle.ciclo_atual?.length
    } : null,
    showNewCycleMessage,
    allStudiesCompleted,
    disciplinasIniciadas: disciplinasIniciadas.length,
    disciplinasNaoIniciadas: disciplinasNaoIniciadas.length,
    disciplinasIniciadasCiclo,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    dailySubjects: dailySubjects.map(s => s.name),
    nextSubjects: nextSubjects.map(s => s.subject.name)
  });

  // Mostrar loading enquanto dados estão carregando
  if (isAppLoading || isCycleLoading || !userCycle) {
    return <StudyPlanLoadingState />;
  }

  const hasSubjects = dailySubjects.length > 0 || nextSubjects.length > 0;
  const hasTopics = subjects.some(s => s.topics && s.topics.length > 0);

  return (
    <div className="w-full">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <StudyPlanHeader onNextDay={handleNextDay} />
        
        <NewCycleMessage isVisible={showNewCycleStarted} onHide={() => {}} />
        
        {allStudiesCompleted ? (
          <motion.div variants={itemVariants}>
            <AllStudiesCompletedMessage />
          </motion.div>
        ) : allTopicsInReview ? (
          <motion.div variants={itemVariants}>
            <AllTopicsInReviewMessage />
          </motion.div>
        ) : isCycleCompleted ? (
          <motion.div variants={itemVariants}>
            <CycleCompletedMessage onStartNewCycle={handleStartNewCycle} />
          </motion.div>
        ) : !hasAvailableSubjects ? (
          <StudyPlanEmptyState type="no-subjects" />
        ) : allDaySubjectsCompleted ? (
          <motion.div variants={itemVariants}>
            <DayCompletedMessage 
              onNextDay={handleNextDay} 
              onStartNewCycle={() => {}} 
              isLoading={isNextDayLoading}
              hasMoreSubjectsInCycle={nextSubjects.length > 0}
            />
          </motion.div>
        ) : dailySubjects.length === 0 && nextSubjects.length > 0 ? (
          <StudyPlanEmptyState 
            type="no-subjects-but-pending" 
            onNextDay={handleNextDay}
            isNextDayLoading={isNextDayLoading}
          />
        ) : dailySubjects.length === 0 ? (
          <StudyPlanEmptyState type="no-subjects-for-today" />
        ) : (
          <StudyPlanMainView
            userCycle={userCycle!}
            dailySubjects={dailySubjects}
            nextSubjects={nextSubjects}
            subjectsByStatus={subjectsByStatus}
            expandedSubject={expandedSubject}
            tempMarkedTopics={tempMarkedTopics}
            disciplinasConcluidas={disciplinasConcluidas}
            totalDisciplinasCiclo={totalDisciplinasCiclo}
            disciplinasIniciadasCiclo={disciplinasIniciadasCiclo}
            disciplinasNaoIniciadas={disciplinasNaoIniciadas.length}
            showNewCycleStarted={showNewCycleStarted}
            allDaySubjectsCompleted={allDaySubjectsCompleted}
            isCycleCompleted={isCycleCompleted}
            allTopicsInReview={allTopicsInReview}
            onToggleExpand={handleToggleExpand}
            onMarkTopicForReview={handleMarkTopicForReview}
            onCancelTopicReview={handleCancelTopicReview}
            onCompleteSession={handleCompleteSession}
          />
        )}

        {!hasTopics && hasSubjects && (
          <StudyPlanEmptyState type="no-topics" />
        )}
      </motion.div>
    </div>
  );
};

export default StudyPlanContent;
