
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
import { BookOpen, Plus, Trophy } from 'lucide-react';
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
    currentCycleCompleted,
    handleNextDay,
    handleCompleteSession,
    handleToggleExpand,
    handleMarkTopicForReview,
    handleCancelTopicReview,
    handleHideNewCycleMessage,
    disciplinasIniciadas,
    disciplinasNaoIniciadas
  } = useStudyPlanLogic();

  console.log('📊 StudyPlan render - PRIORITY CHECK:', {
    '1-allStudiesCompleted': allStudiesCompleted,
    '2-currentCycleCompleted': currentCycleCompleted,
    '3-allDaySubjectsCompleted': allDaySubjectsCompleted,
    '4-hasAvailableSubjects': hasAvailableSubjects,
    dailySubjectsLength: dailySubjects.length,
    nextSubjectsLength: nextSubjects.length,
    userCycle,
    showNewCycleMessage,
    disciplinasConcluidas,
    totalDisciplinasCiclo,
    disciplinasIniciadas
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

          {/* PRIORIDADE 1: Verificar se REALMENTE todos os estudos estão completos */}
          {allStudiesCompleted ? (
            <motion.div variants={itemVariants}>
              <AllStudiesCompletedMessage />
            </motion.div>
          ) : currentCycleCompleted ? (
            /* PRIORIDADE 2: Mensagem de ciclo completo - quando apenas o ciclo atual foi concluído */
            <motion.div variants={itemVariants}>
              <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-4 border-green-300 shadow-xl">
                <CardHeader className="text-center pb-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, type: "spring", bounce: 0.5 }}
                    className="flex justify-center mb-4"
                  >
                    <Trophy className="h-16 w-16 text-green-500 drop-shadow-lg" />
                  </motion.div>
                  
                  <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
                    🎉 CICLO COMPLETO! 🎉
                  </CardTitle>
                  <div className="text-xl md:text-2xl font-bold text-gray-800 mb-3">
                    Parabéns! Você completou este ciclo de estudos!
                  </div>
                  <p className="text-gray-700 text-base leading-relaxed max-w-xl mx-auto mb-4">
                    Excelente trabalho! Você concluiu todas as matérias do seu ciclo atual. 
                    Agora você pode iniciar um novo ciclo ou adicionar mais matérias.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={handleNextDay}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    >
                      Iniciar Novo Ciclo
                    </Button>
                    <Button
                      onClick={() => navigate('/materias')}
                      variant="outline"
                      className="border-2 border-green-400 text-green-700 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Matérias
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* SEMPRE mostrar informações do ciclo quando há um ciclo ativo E matérias disponíveis */}
              {userCycle && hasAvailableSubjects && (
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
                {!hasAvailableSubjects ? (
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
                ) : allDaySubjectsCompleted ? (
                  /* PRIORIDADE 3: Conclusão do dia - quando todas as matérias do dia foram completadas */
                  <motion.div variants={itemVariants}>
                    <DayCompletedMessage onNextDay={handleNextDay} />
                  </motion.div>
                ) : dailySubjects.length > 0 ? (
                  /* Se há matérias do dia para estudar - ordenadas por prioridade */
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
                ) : null}
              </div>

              {/* Mensagem de novo ciclo */}
              <NewCycleMessage 
                isVisible={showNewCycleMessage}
                onHide={handleHideNewCycleMessage}
              />

              {/* CORREÇÃO: Só mostrar próximas matérias se há matérias disponíveis E nextSubjects > 0 */}
              {hasAvailableSubjects && nextSubjects.length > 0 && (
                <motion.div variants={itemVariants}>
                  <NextSubjects nextSubjects={nextSubjects} />
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default StudyPlan;
