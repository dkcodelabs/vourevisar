
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import StudyPlanHeader from '@/components/study-plan/StudyPlanHeader';
import CycleInfo from '@/components/study-plan/CycleInfo';
import SubjectCard from '@/components/study-plan/SubjectCard';
import NextSubjects from '@/components/study-plan/NextSubjects';
import DayCompletedMessage from '@/components/study-plan/DayCompletedMessage';
import NewCycleMessage from '@/components/study-plan/NewCycleMessage';
import AllStudiesCompletedMessage from '@/components/study-plan/AllStudiesCompletedMessage';
import AllTopicsInReviewMessage from '@/components/study-plan/AllTopicsInReviewMessage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import CycleCompletedMessage from '@/components/study-plan/CycleCompletedMessage';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

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

const StudyPlan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshData } = useApp();
  
  // Recarregar dados sempre que a página for acessada
  useEffect(() => {
    console.log('📄 StudyPlan - Página acessada, recarregando dados...');
    if (user) {
      refreshData();
    }
  }, []); // Executa apenas na montagem da página

  const {
    isLoading,
    expandedSubject,
    tempMarkedTopics,
    showNewCycleMessage,
    userCycle,
    dailySubjects,
    nextSubjects,
    allDaySubjectsCompleted,
    hasAvailableSubjects,
    totalDisciplinasCiclo,
    disciplinasConcluidas,
    isNewCycleStarted,
    allStudiesCompleted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    handleHideNewCycleMessage,
    disciplinasIniciadas,
    disciplinasNaoIniciadas,
    disciplinasIniciadasCiclo,
    isCycleCompleted,
    handleStartNewCycle,
    isNextDayLoading,
    isCycleLoading,
    showNewCycleStarted,
    allTopicsInReview
  } = useStudyPlanLogic();
  const { subjects } = useApp();

  // Não renderizar nada até que os dados iniciais estejam carregados OU o ciclo esteja carregando
  if (isLoading || isCycleLoading) {
    return (
      <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (userCycle === null) {
    if (subjects.length === 0 && !isLoading && !isCycleLoading) {
      return (
        <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="py-8 space-y-6"
          >
            <motion.div variants={itemVariants}>
              <Card className="text-center">
                <CardHeader>
                  <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <CardTitle>Nenhuma matéria para estudar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Você ainda não adicionou matérias para estudar.
                  </p>
                  <Button onClick={() => navigate('/materias')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Matérias
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      );
    } else {
      return (
        <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      );
    }
  }

  console.log('📊 StudyPlan render - Estado detalhado:', {
    isLoading,
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
    nextSubjects: nextSubjects.map(s => s.name)
  });

  const hasSubjects = dailySubjects.length > 0 || nextSubjects.length > 0;
  const hasTopics = subjects.some(s => s.topics && s.topics.length > 0);
  const hasTopicsToReview = subjects.some(s => s.topics && s.topics.some(t => !t.completed));

  return (
    <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="py-8 space-y-6"
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
          <motion.div variants={itemVariants}>
            <Card className="text-center">
              <CardHeader>
                <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <CardTitle>Nenhuma matéria para estudar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Você ainda não adicionou matérias para estudar.
                </p>
                <Button onClick={() => navigate('/materias')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Matérias
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : allDaySubjectsCompleted ? (
          <motion.div variants={itemVariants}>
            <DayCompletedMessage 
              onNextDay={handleNextDay} 
              isLoading={isNextDayLoading}
              hasMoreSubjectsInCycle={nextSubjects.length > 0}
            />
          </motion.div>
        ) : dailySubjects.length === 0 && nextSubjects.length > 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="text-center">
              <CardHeader>
                <BookOpen className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                <CardTitle>Nenhuma matéria programada para hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Você não tem matérias para estudar hoje, mas há matérias pendentes no ciclo atual.
                </p>
                <Button onClick={handleNextDay} className="bg-blue-500 hover:bg-blue-600" disabled={isNextDayLoading}>
                  {isNextDayLoading ? <LoadingSpinner className="h-5 w-5" /> : 'Carregar próximas matérias'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : dailySubjects.length === 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="text-center">
              <CardHeader>
                <BookOpen className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                <CardTitle>Nenhuma matéria programada para hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Você não tem matérias para estudar hoje. Fique atento às próximas revisões!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            <motion.div variants={itemVariants}>
              <CycleInfo 
                userCycle={userCycle}
                disciplinasConcluidas={disciplinasConcluidas}
                totalDisciplinasCiclo={totalDisciplinasCiclo}
                isNewCycleStarted={showNewCycleStarted}
                disciplinasIniciadasCiclo={disciplinasIniciadasCiclo}
                disciplinasNaoIniciadas={disciplinasNaoIniciadas.length}
              />
            </motion.div>
            <div className="space-y-4">
              {dailySubjects.map((subject) => (
                <motion.div key={subject.id} variants={itemVariants}>
                  <SubjectCard
                    subject={subject}
                    isExpanded={expandedSubject === subject.id}
                    tempMarkedTopics={tempMarkedTopics}
                    onToggleExpand={handleToggleExpand}
                    onMarkTopicForReview={handleMarkTopicForReview}
                    onCancelTopicReview={handleCancelTopicReview}
                    onCompleteSession={handleCompleteSession}
                    isDaySubject={true}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}

        {!hasTopics && hasSubjects && (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md mt-8">
            <span className="text-4xl mb-4">📚</span>
            <h2 className="text-xl font-bold mb-2">Adicione tópicos para começar a estudar esta matéria</h2>
            <p className="text-gray-600 mb-4">Você já adicionou matérias, mas elas ainda não têm tópicos cadastrados.</p>
            <Button onClick={() => navigate('/materias')} className="mt-2">Adicionar Tópicos</Button>
          </div>
        )}

        {nextSubjects.length > 0 && !allDaySubjectsCompleted && !isCycleCompleted && !allTopicsInReview && dailySubjects.length > 0 && (
          <motion.div variants={itemVariants}>
            <NextSubjects nextSubjects={nextSubjects} />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default StudyPlan;
