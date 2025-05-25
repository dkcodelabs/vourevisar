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
    isAllDaySubjectsCompleted,
    fetchUserCycle 
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
          
          // Keep congratulations message if no subjects for today
          const today = format(new Date(), 'yyyy-MM-dd');
          localStorage.setItem('lastCongratulationsDay', today);
          setLastCongratulationsDay(today);
        }
      } else {
        // Continue with next subjects in current cycle
        const nextDailySubjects = remainingSubjects.slice(0, subjectsPerDay);
        
        await updateUserCycle({
          ciclo_atual: allCompletedSubjects,
          disciplinas_do_dia: nextDailySubjects.map(s => s.id)
        });

        // Clear congratulations day
        localStorage.removeItem('lastCongratulationsDay');
        setLastCongratulationsDay(null);
      }
      
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
    <div className="container mx-auto p-2">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
          📚 Plano de Estudo Diário
        </h1>
        <Button onClick={handleNextDay} className="bg-blue-600 hover:bg-blue-700">
          Próximo Dia →
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-1">
            <span>⭐</span>
            <span className="font-medium text-sm">Ciclos realizados:</span>
            <span className="font-bold text-blue-600">{userCycle?.ciclos_realizados || 0}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span>📖</span>
            <span className="font-medium text-sm">Disciplinas concluídas:</span>
            <span className="font-bold text-blue-600">0/4</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🆕</span>
            <span className="text-sm text-purple-600 font-medium">Novo ciclo iniciado!</span>
            <span className="text-xs text-gray-500 ml-auto">Início: 25/05/2025 14:24</span>
          </div>
        </div>
      </div>

      {showCongratulations && (
        <div className="mb-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎉</div>
              <div>
                <h3 className="text-lg font-bold text-green-800">
                  Parabéns! Você completou todas as matérias do dia!
                </h3>
                <p className="text-green-700 text-sm">
                  Excelente trabalho! Continue assim para manter seu progresso.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          → Próximas Disciplinas
        </h2>
        <div className="grid gap-3">
          {nextSubjects.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-gray-500">
                Todas as matérias foram programadas! Complete as matérias do dia para continuar.
              </p>
            </div>
          ) : (
            nextSubjects.map((subject) => {
              const completedTopics = subject.topics.filter(t => t.completed).length;
              const totalTopics = subject.topics.length;
              
              return (
                <div key={subject.id} className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">📘</span>
                      <span className="font-medium">{subject.name}</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {completedTopics} tópicos
                      </span>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      Em Espera
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;
