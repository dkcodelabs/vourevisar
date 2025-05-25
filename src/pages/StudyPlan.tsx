
import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Award, RotateCcw, Play, Pause, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { AnimatedTitle } from '@/components/ui';
import { format, startOfDay, isAfter } from 'date-fns';
import { useCycleState } from '@/hooks/useCycleState';

interface Subject {
  id: string;
  name: string;
  priority: number;
  status: string;
  topics: Topic[];
}

interface Topic {
  id: string;
  name: string;
  completed: boolean;
  reviewCount: number;
}

interface StudySession {
  duration: number;
  isActive: boolean;
  subjectId: string | null;
}

const StudyPlan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile, fetchSubjects, fetchUserSettings } = useApp();
  const { 
    userCycle, 
    updateUserCycle, 
    createInitialUserCycle, 
    isAllDaySubjectsCompleted 
  } = useCycleState();

  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [dailySubjects, setDailySubjects] = useState<Subject[]>([]);
  const [nextSubjects, setNextSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectsPerDay, setSubjectsPerDay] = useState(2);
  const [studySession, setStudySession] = useState<StudySession>({
    duration: 0,
    isActive: false,
    subjectId: null
  });
  const [lastCongratulationsDay, setLastCongratulationsDay] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  // Listen for settings changes and update accordingly
  useEffect(() => {
    if (userProfile?.settings?.subjectsPerDay && userProfile.settings.subjectsPerDay !== subjectsPerDay) {
      setSubjectsPerDay(userProfile.settings.subjectsPerDay);
      // Refresh data when settings change
      loadSubjectsData();
    }
  }, [userProfile?.settings?.subjectsPerDay]);

  // Listen for subject changes and update the display
  useEffect(() => {
    loadSubjectsData();
  }, [subjectsPerDay, userCycle]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // Load user settings first
      await fetchUserSettings();
      
      // Load subjects data
      await loadSubjectsData();
      
      // Get last congratulations day from localStorage
      const lastDay = localStorage.getItem('lastCongratulationsDay');
      setLastCongratulationsDay(lastDay);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubjectsData = async () => {
    if (!user) return;

    try {
      // Fetch subjects with their topics, ordered by priority
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          priority,
          status,
          topics (
            id,
            name,
            completed,
            review_count
          )
        `)
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

      if (subjectsError) throw subjectsError;

      const processedSubjects = (subjectsData || []).map(subject => ({
        id: subject.id,
        name: subject.name,
        priority: subject.priority,
        status: subject.status,
        topics: subject.topics.map((topic: any) => ({
          id: topic.id,
          name: topic.name,
          completed: topic.completed,
          reviewCount: topic.review_count
        }))
      }));

      setAllSubjects(processedSubjects);

      // Initialize user cycle if it doesn't exist
      if (!userCycle && processedSubjects.length > 0) {
        await createInitialUserCycle(subjectsPerDay, processedSubjects);
        return;
      }

      // Set daily and next subjects based on current cycle state
      if (userCycle) {
        const dailySubjectIds = userCycle.disciplinas_do_dia || [];
        const daily = processedSubjects.filter(s => dailySubjectIds.includes(s.id));
        setDailySubjects(daily);

        // Get next subjects (subjects not yet in daily rotation)
        const remainingSubjects = processedSubjects.filter(s => !dailySubjectIds.includes(s.id));
        setNextSubjects(remainingSubjects.slice(0, subjectsPerDay));
      }

    } catch (error) {
      console.error('Erro ao carregar matérias:', error);
      toast.error("Erro ao carregar matérias");
    }
  };

  const handleCompleteSubject = async (subjectId: string) => {
    if (!userCycle) return;

    try {
      const updatedCicloAtual = [...(userCycle.ciclo_atual || []), subjectId];
      
      await updateUserCycle({
        ciclo_atual: updatedCicloAtual
      });

      toast.success("Matéria concluída!");

      // Check if all day subjects are completed
      const allCompleted = userCycle.disciplinas_do_dia.every(id => 
        updatedCicloAtual.includes(id)
      );

      if (allCompleted) {
        // Save congratulations day
        const today = format(new Date(), 'yyyy-MM-dd');
        localStorage.setItem('lastCongratulationsDay', today);
        setLastCongratulationsDay(today);
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        toast.success("Parabéns! Você completou todas as matérias do dia!");
      }
    } catch (error) {
      console.error('Erro ao completar matéria:', error);
      toast.error("Erro ao completar matéria");
    }
  };

  const handleNextDay = async () => {
    if (!userCycle) return;

    try {
      const allCompletedSubjects = [...(userCycle.ciclo_atual || []), ...(userCycle.disciplinas_do_dia || [])];
      const remainingSubjects = allSubjects.filter(s => !allCompletedSubjects.includes(s.id));
      
      let newCyclesCount = userCycle.ciclos_realizados;
      let isNewCycle = false;

      // Check if we need to start a new cycle
      if (remainingSubjects.length < subjectsPerDay) {
        newCyclesCount += 1;
        isNewCycle = true;
        
        // Use all available subjects for new cycle
        const nextDailySubjects = allSubjects.slice(0, subjectsPerDay);
        
        await updateUserCycle({
          ciclo_atual: [],
          disciplinas_do_dia: nextDailySubjects.map(s => s.id),
          ciclos_realizados: newCyclesCount,
          data_inicio_ciclo: new Date().toISOString()
        });

        if (isNewCycle && newCyclesCount > 0) {
          toast.success(`Novo ciclo iniciado! Ciclo ${newCyclesCount}`);
        }
      } else {
        // Continue with next subjects in current cycle
        const nextDailySubjects = remainingSubjects.slice(0, subjectsPerDay);
        
        await updateUserCycle({
          ciclo_atual: allCompletedSubjects,
          disciplinas_do_dia: nextDailySubjects.map(s => s.id)
        });
      }

      // Clear congratulations day
      localStorage.removeItem('lastCongratulationsDay');
      setLastCongratulationsDay(null);
      
      // Refresh data
      await loadSubjectsData();
      
      toast.success("Próximas matérias carregadas!");
    } catch (error) {
      console.error('Erro ao avançar para próximo dia:', error);
      toast.error("Erro ao carregar próximas matérias");
    }
  };

  const isSubjectCompleted = (subjectId: string) => {
    return userCycle?.ciclo_atual?.includes(subjectId) || false;
  };

  // Check if we should show congratulations
  const shouldShowCongratulations = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Show congratulations if all day subjects are completed AND
    // either it's the same day as last congratulations OR we haven't shown it today
    if (isAllDaySubjectsCompleted()) {
      return lastCongratulationsDay === today || !lastCongratulationsDay;
    }
    
    return false;
  };

  const showCongratulations = shouldShowCongratulations();

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <AnimatedTitle icon={<Play size={32} />}>
          Plano de Estudo Diário
        </AnimatedTitle>
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>
      </motion.div>

      <AnimatePresence>
        {showCongratulations && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="mb-6"
            variants={itemVariants}
          >
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Award className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-green-800 mb-2">
                      🎉 Parabéns! Você completou todas as matérias do dia!
                    </h3>
                    <p className="text-green-700">
                      Excelente trabalho! Continue assim para manter seu progresso.
                    </p>
                  </div>
                  <Button 
                    onClick={handleNextDay}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <SkipForward className="mr-2 h-4 w-4" />
                    Próximo Dia
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Subjects */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Matérias do Dia ({dailySubjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailySubjects.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhuma matéria programada para hoje.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {dailySubjects.map((subject) => {
                  const completed = isSubjectCompleted(subject.id);
                  const completedTopics = subject.topics.filter(t => t.completed).length;
                  const totalTopics = subject.topics.length;
                  
                  return (
                    <motion.div
                      key={subject.id}
                      layout
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        completed 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-800">{subject.name}</h3>
                        <Badge variant={completed ? "default" : "secondary"}>
                          {completed ? "Concluída" : "Pendente"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>Tópicos: {completedTopics}/{totalTopics}</span>
                        <span>Prioridade: {subject.priority}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/topicos/${subject.id}`)}
                          variant="outline"
                          className="flex-1"
                        >
                          Ver Tópicos
                        </Button>
                        
                        {!completed && (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteSubject(subject.id)}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Concluir
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Next Subjects - Always show */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <SkipForward className="h-5 w-5 text-blue-600" />
              Próximas Matérias ({nextSubjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextSubjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">
                  Todas as matérias foram programadas! Complete as matérias do dia para continuar.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {nextSubjects.map((subject) => {
                  const completedTopics = subject.topics.filter(t => t.completed).length;
                  const totalTopics = subject.topics.length;
                  
                  return (
                    <motion.div
                      key={subject.id}
                      className="p-4 rounded-lg border-2 border-gray-100 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-700">{subject.name}</h3>
                        <Badge variant="outline">Em Espera</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <span>Tópicos: {completedTopics}/{totalTopics}</span>
                        <span>Prioridade: {subject.priority}</span>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => navigate(`/topicos/${subject.id}`)}
                        variant="outline"
                        className="w-full"
                      >
                        Ver Tópicos
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default StudyPlan;
