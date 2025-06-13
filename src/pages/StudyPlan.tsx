import React from 'react';
import { motion } from 'framer-motion';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import StudyPlanHeader from '@/components/study-plan/StudyPlanHeader';
import CycleInfo from '@/components/study-plan/CycleInfo';
import SubjectCard from '@/components/study-plan/SubjectCard';
import NextSubjects from '@/components/study-plan/NextSubjects';
import DayCompletedMessage from '@/components/study-plan/DayCompletedMessage';
import NewCycleMessage from '@/components/study-plan/NewCycleMessage';
import AllStudiesCompletedMessage from '@/components/study-plan/AllStudiesCompletedMessage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import CycleCompletedMessage from '@/components/study-plan/CycleCompletedMessage';

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
    handleStartNewCycle
  } = useStudyPlanLogic();

  // Não renderizar nada até que os dados iniciais estejam carregados
  if (isLoading) {
    return (
      <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Se não há ciclo, mostrar mensagem para adicionar matérias
  if (!userCycle) {
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
  }

  console.log('📊 StudyPlan render - Estado detalhado:', {
    isLoading,
    allDaySubjectsCompleted,
    hasAvailableSubjects,
    dailySubjectsLength: dailySubjects.length,
    nextSubjectsLength: nextSubjects.length,
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

  return (
    <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="py-8 space-y-6"
      >
        <StudyPlanHeader onNextDay={handleNextDay} />
        
        {isCycleCompleted ? (
          <CycleCompletedMessage onStartNewCycle={handleStartNewCycle} />
        ) : !hasAvailableSubjects ? (
          /* Se não há matérias disponíveis no sistema */
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
        ) : (
          <>
            <motion.div variants={itemVariants}>
              <CycleInfo 
                userCycle={userCycle}
                disciplinasConcluidas={disciplinasConcluidas}
                totalDisciplinasCiclo={totalDisciplinasCiclo}
                isNewCycleStarted={isNewCycleStarted}
                disciplinasIniciadasCiclo={disciplinasIniciadasCiclo}
                disciplinasNaoIniciadas={disciplinasNaoIniciadas.length}
              />
            </motion.div>

            <div className="space-y-4">
              {dailySubjects.length > 0 ? (
                dailySubjects.map((subject) => (
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
                ))
              ) : userCycle && userCycle.ciclo_atual.length > 0 ? (
                <motion.div variants={itemVariants}>
                  <Card className="text-center">
                    <CardHeader>
                      <BookOpen className="h-12 w-12 mx-auto text-blue-400 mb-4" />
                      <CardTitle>Nenhuma matéria programada para hoje</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        Clique no botão abaixo para carregar as próximas matérias do seu ciclo.
                      </p>
                      <Button onClick={handleNextDay} className="bg-blue-500 hover:bg-blue-600">
                        Carregar próximas matérias
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : allDaySubjectsCompleted ? (
                /* Conclusão do dia */
                <motion.div variants={itemVariants}>
                  <DayCompletedMessage onNextDay={handleNextDay} />
                </motion.div>
              ) : null}
            </div>

            {/* Mensagem de novo ciclo */}
            <NewCycleMessage 
              isVisible={showNewCycleMessage}
              onHide={handleHideNewCycleMessage}
            />

            {nextSubjects.length > 0 && (
              <motion.div variants={itemVariants}>
                <NextSubjects nextSubjects={nextSubjects} />
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default StudyPlan;
