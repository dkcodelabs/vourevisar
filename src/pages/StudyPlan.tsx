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
import { BookOpen, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    disciplinasNaoIniciadas
  } = useStudyPlanLogic();

  console.log('StudyPlan render:', {
    allDaySubjectsCompleted,
    hasAvailableSubjects,
    dailySubjectsLength: dailySubjects.length,
    nextSubjectsLength: nextSubjects.length,
    userCycle,
    showNewCycleMessage,
    allStudiesCompleted,
    disciplinas_do_dia: userCycle?.disciplinas_do_dia,
    ciclo_atual: userCycle?.ciclo_atual
  });

  return (
    <motion.div 
      className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {isLoading ? (
        <motion.div 
          className="flex justify-center items-center h-64"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      ) : (
        <motion.div className="space-y-4" variants={containerVariants}>
          <StudyPlanHeader onNextDay={handleNextDay} />

          {userCycle && hasAvailableSubjects && !allStudiesCompleted && (
            <motion.div variants={itemVariants}>
              <CycleInfo 
                userCycle={userCycle}
                disciplinasConcluidas={disciplinasConcluidas}
                totalDisciplinasCiclo={totalDisciplinasCiclo}
                isNewCycleStarted={isNewCycleStarted}
                disciplinasIniciadas={disciplinasIniciadas}
                disciplinasNaoIniciadas={disciplinasNaoIniciadas}
              />
            </motion.div>
          )}

          <div className="space-y-4">
            {/* PRIORIDADE 1: Conclusão TOTAL dos estudos */}
            {allStudiesCompleted ? (
              <motion.div variants={itemVariants}>
                <AllStudiesCompletedMessage />
              </motion.div>
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
                      Você ainda não adicionou matérias para estudar ou todas já foram concluídas.
                    </p>
                    <Button onClick={() => navigate('/materias')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Matérias
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Se há matérias, mostrar o plano de estudos normal */
              <>
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
                ) : allDaySubjectsCompleted ? (
                  /* PRIORIDADE 2: Conclusão do dia (só se não for conclusão total) */
                  <motion.div variants={itemVariants}>
                    <DayCompletedMessage onNextDay={handleNextDay} />
                  </motion.div>
                ) : null}
              </>
            )}
          </div>

          {/* PRIORIDADE 3: Mensagem de novo ciclo (só se não for conclusão total) */}
          {!allStudiesCompleted && (
            <NewCycleMessage 
              isVisible={showNewCycleMessage}
              onHide={handleHideNewCycleMessage}
            />
          )}

          {hasAvailableSubjects && nextSubjects.length > 0 && !allStudiesCompleted && (
            <motion.div variants={itemVariants}>
              <NextSubjects nextSubjects={nextSubjects} />
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StudyPlan;
