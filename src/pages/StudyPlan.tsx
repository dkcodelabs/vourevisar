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
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
    showNewCycleStarted
  } = useStudyPlanLogic();
  const { subjects } = useApp();

  // Botão temporário para resetar ciclo
  const handleResetCycle = async () => {
    if (!user) return;
    // Buscar matérias válidas
    const validSubjects = subjects.filter(s => s.status !== 'Concluída' && s.topics && s.topics.length > 0);
    const cycleSubjectIds = validSubjects.map(s => s.id);

    // Buscar o valor de matérias por dia das configurações
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('subjects_per_day')
      .eq('user_id', user.id)
      .single();
    const subjectsPerDay = userSettings?.subjects_per_day || 3;

    // Deletar ciclo antigo
    await supabase.from('user_cycles').delete().eq('user_id', user.id);
    // Criar novo ciclo
    await supabase.from('user_cycles').insert({
      user_id: user.id,
      ciclo_atual: cycleSubjectIds,
      disciplinas_do_dia: cycleSubjectIds.slice(0, subjectsPerDay),
      data_inicio_ciclo: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    });
    window.location.reload();
  };

  // Não renderizar nada até que os dados iniciais estejam carregados OU o ciclo esteja carregando
  if (isLoading || isCycleLoading) {
    return (
      <div className="container mx-auto min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-2 sm:px-4 md:px-8 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Só mostrar a mensagem se ciclo carregado, matérias carregadas e não houver nenhuma matéria
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
      // Se ciclo ainda não carregou mas já há matérias, mostrar loading
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
      {/* Botão temporário para resetar ciclo */}
      <div className="mb-4">
        <button onClick={handleResetCycle} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Resetar Ciclo (TEMPORÁRIO)
        </button>
      </div>
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
                {nextSubjects.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Próximas Revisões:</h3>
                    <ul className="text-sm text-gray-600">
                      {nextSubjects.map((subject) => (
                        <li key={subject.id}>{subject.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={handleNextDay} className="bg-blue-500 hover:bg-blue-600" disabled={isNextDayLoading}>
                  {isNextDayLoading ? <LoadingSpinner className="h-5 w-5" /> : 'Carregar próximas matérias'}
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
      </motion.div>
    </div>
  );
};

export default StudyPlan;
