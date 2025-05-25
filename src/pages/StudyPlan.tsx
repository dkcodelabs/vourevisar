import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { Topic, RevisionStage } from '@/types';
import { addDays, format, isAfter, isBefore, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  GraduationCap, 
  Sparkle,
  ArrowClockwise,
  Calendar
} from '@phosphor-icons/react';

interface UserCycle {
  id: string;
  user_id: string;
  ciclo_atual: string[];
  disciplinas_do_dia: string[];
  ciclos_realizados: number;
  data_inicio_ciclo: string;
  data_fim_ciclo: string | null;
  atualizado_em: string;
  created_at: string;
}

const StudyPlan = () => {
  const { subjects, userProfile, fetchSubjects, fetchUserSettings } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tempMarkedTopics, setTempMarkedTopics] = useState<Record<string, string[]>>({});
  const isFirstRender = useRef(true);
  const [userCycle, setUserCycle] = useState<UserCycle | null>(null);
  const [novoCicloBanner, setNovoCicloBanner] = useState(false);
  const [cicloAtual, setCicloAtual] = useState<string[]>([]);
  const [disciplinasDoDia, setDisciplinasDoDia] = useState<string[]>([]);
  
  // Get the subjectsPerDay from user settings, with proper fallback
  const subjectsPerDay = userProfile?.settings?.subjectsPerDay || 3;
  
  console.log('subjectsPerDay from settings:', subjectsPerDay);
  console.log('userProfile:', userProfile);
  
  // Filter subjects that are in progress
  const currentSubjects = subjects.filter(subject => 
    subject.status === 'Em Estudo' || subject.status === 'Nova'
  ).sort((a, b) => (a.priority || 0) - (b.priority || 0));

  // Função para buscar o ciclo do usuário
  const fetchUserCycle = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar ciclo do usuário:', error);
        return;
      }

      if (data) {
        setUserCycle(data);
        if (Array.isArray(data.ciclo_atual)) setCicloAtual(data.ciclo_atual);
        if (Array.isArray(data.disciplinas_do_dia)) setDisciplinasDoDia(data.disciplinas_do_dia);
      } else {
        // Se não existe ciclo, cria um novo
        await createInitialUserCycle();
      }
    } catch (error) {
      console.error('Erro ao buscar ciclo:', error);
    }
  };

  // Função para criar ciclo inicial
  const createInitialUserCycle = async () => {
    if (!user) return;

    try {
      console.log('Creating initial cycle with subjectsPerDay:', subjectsPerDay);
      const initialDisciplinas = currentSubjects.slice(0, subjectsPerDay).map(s => s.id);
      console.log('Initial disciplinas:', initialDisciplinas);
      
      const { data, error } = await supabase
        .from('user_cycles')
        .insert([{
          user_id: user.id,
          ciclo_atual: [],
          disciplinas_do_dia: initialDisciplinas,
          ciclos_realizados: 0,
          data_inicio_ciclo: new Date().toISOString(),
          data_fim_ciclo: null,
          atualizado_em: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar ciclo inicial:', error);
        return;
      }

      setUserCycle(data);
      if (Array.isArray(data.ciclo_atual)) setCicloAtual(data.ciclo_atual);
      if (Array.isArray(data.disciplinas_do_dia)) setDisciplinasDoDia(data.disciplinas_do_dia);
    } catch (error) {
      console.error('Erro ao criar ciclo inicial:', error);
    }
  };

  // Função para atualizar ciclo no banco
  const updateUserCycle = async (updates: Partial<UserCycle>) => {
    if (!user || !userCycle) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .update({
          ...updates,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar ciclo:', error);
        return;
      }

      setUserCycle(data);
      if (Array.isArray(data.ciclo_atual)) setCicloAtual(data.ciclo_atual);
      if (Array.isArray(data.disciplinas_do_dia)) setDisciplinasDoDia(data.disciplinas_do_dia);
    } catch (error) {
      console.error('Erro ao atualizar ciclo:', error);
    }
  };
  
  // Buscar dados do usuário ao carregar a página
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Carrega os dados apenas se não estiverem já carregados
        if (subjects.length === 0) {
          await fetchSubjects();
        }
        if (!userProfile?.settings) {
          await fetchUserSettings();
        }
        
        await fetchUserCycle();
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error("Erro ao carregar dados. Por favor, tente novamente.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Atualizar disciplinas do dia quando as configurações mudarem
  useEffect(() => {
    if (userProfile?.settings?.subjectsPerDay && userCycle && currentSubjects.length > 0) {
      const newSubjectsPerDay = userProfile.settings.subjectsPerDay;
      console.log('Settings changed, updating disciplinas do dia to:', newSubjectsPerDay);
      
      // Se o número de matérias por dia mudou, atualiza as disciplinas do dia
      if (disciplinasDoDia.length !== newSubjectsPerDay) {
        const availableSubjects = currentSubjects.filter(s => !cicloAtual.includes(s.id));
        const newDisciplinasDoDia = availableSubjects.slice(0, newSubjectsPerDay).map(s => s.id);
        
        console.log('Updating disciplinas do dia from', disciplinasDoDia, 'to', newDisciplinasDoDia);
        
        updateUserCycle({
          disciplinas_do_dia: newDisciplinasDoDia
        });
      }
    }
  }, [userProfile?.settings?.subjectsPerDay, currentSubjects.length, cicloAtual]);
  
  // Função para calcular a próxima data de revisão com base no estágio atual
  const calculateNextReview = (stage: RevisionStage | undefined): Date => {
    const now = new Date();
    
    switch(stage) {
      case '24h':
        return addDays(now, 1);
      case '7dias':
        return addDays(now, 7);
      case '30dias':
        return addDays(now, 30);
      default:
        return addDays(now, 1); // Primeira revisão (24h)
    }
  };

  // Função para avançar para o próximo estágio de revisão
  const getNextReviewStage = (currentStage: RevisionStage | undefined): RevisionStage => {
    switch(currentStage) {
      case '24h':
        return '7dias';
      case '7dias':
        return '30dias';
      case '30dias':
        return 'Concluído';
      default:
        return '24h'; // Primeira revisão
    }
  };

  // Limpar marcações temporárias ao sair da página
  useEffect(() => {
    const handleBeforeUnload = () => {
      setTempMarkedTopics({});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setTempMarkedTopics({});
    };
  }, []);

  // Ao expandir uma matéria, inicializa marcações temporárias se necessário
  useEffect(() => {
    if (expandedSubject && !tempMarkedTopics[expandedSubject]) {
      setTempMarkedTopics(prev => ({ ...prev, [expandedSubject]: [] }));
    }
  }, [expandedSubject]);

  // Marcar revisão (apenas local)
  const handleMarkTopicForReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => {
      const updated = { ...prev };
      if (!updated[subjectId]) updated[subjectId] = [];
      if (!updated[subjectId].includes(topicId)) {
        updated[subjectId] = [...updated[subjectId], topicId];
      }
      return updated;
    });
  };

  // Cancelar marcação (apenas local)
  const handleCancelTopicReview = (subjectId: string, topicId: string) => {
    setTempMarkedTopics(prev => {
      const updated = { ...prev };
      if (updated[subjectId]) {
        updated[subjectId] = updated[subjectId].filter(id => id !== topicId);
      }
      return updated;
    });
  };

  // Calcular as disciplinas do dia baseado na configuração atual
  const dailySubjects = subjects.filter(
    s => disciplinasDoDia.includes(s.id) && !cicloAtual.includes(s.id)
  );

  console.log('Daily subjects:', dailySubjects.length, 'Expected:', subjectsPerDay);
  console.log('disciplinasDoDia:', disciplinasDoDia);
  console.log('cicloAtual:', cicloAtual);

  // Próximas matérias (pendentes que não estão no dia atual nem no ciclo)
  const materiasPendentes = subjects
    .filter(subject => 
      (subject.status === 'Em Estudo' || subject.status === 'Nova') && 
      !cicloAtual.includes(subject.id) &&
      !disciplinasDoDia.includes(subject.id)
    )
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));

  const nextSubjects = materiasPendentes.slice(0, subjectsPerDay);

  // Função para avançar para o próximo dia
  const handleNextDay = async () => {
    if (!userCycle || materiasPendentes.length === 0) return;

    const novasDisciplinas = materiasPendentes.slice(0, subjectsPerDay).map(s => s.id);
    
    await updateUserCycle({
      disciplinas_do_dia: novasDisciplinas
    });
    
    setCompletedSessions([]);
    setExpandedSubject(null);
    toast.info("Novo dia iniciado!");
  };

  // Função para resetar o ciclo manualmente
  const handleResetCycle = async () => {
    if (!userCycle) return;

    const novasDisciplinas = currentSubjects.slice(0, subjectsPerDay).map(s => s.id);
    
    await updateUserCycle({
      ciclo_atual: [],
      disciplinas_do_dia: novasDisciplinas,
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null
    });
    
    setCompletedSessions([]);
    setCurrentSubjectIndex(0);
    setExpandedSubject(null);
    setNovoCicloBanner(false);
    toast.info("Ciclo reiniciado");
  };

  // Função para completar sessão
  const handleCompleteSession = async (subjectId: string) => {
    const topicsToUpdate = tempMarkedTopics[subjectId] || [];
    try {
      for (const topicId of topicsToUpdate) {
        const topic = subjects.find(s => s.id === subjectId)?.topics.find(t => t.id === topicId);
        if (!topic) continue;
        const nextStage = getNextReviewStage(topic.reviewStage);
        let updateData: any = {
          review_count: topic.reviewCount + 1,
          last_reviewed_at: new Date().toISOString()
        };
        if (nextStage === 'Concluído') {
          updateData.completed = true;
          updateData.next_review = null;
          updateData.review_stage = 'Concluído';
        } else {
          updateData.next_review = calculateNextReview(nextStage).toISOString();
          updateData.review_stage = nextStage;
        }
        await supabase.from('topics').update(updateData).eq('id', topicId);
      }
      
      await fetchSubjects();
      setCompletedSessions(prev => [...prev, subjectId]);
      
      // Atualizar arrays locais
      const newCicloAtual = [...cicloAtual, subjectId];
      const newDisciplinasDoDia = disciplinasDoDia.filter(id => id !== subjectId);
      
      setCicloAtual(newCicloAtual);
      setDisciplinasDoDia(newDisciplinasDoDia);
      setExpandedSubject(null);
      setTempMarkedTopics(prev => {
        const updated = { ...prev };
        delete updated[subjectId];
        return updated;
      });
      
      // Atualizar ciclo no banco
      await updateUserCycle({
        ciclo_atual: newCicloAtual,
        disciplinas_do_dia: newDisciplinasDoDia
      });
      
      // Se todas as matérias do ciclo foram concluídas, reinicia ciclo e mostra banner
      const todasMatConcluidas = currentSubjects.every(subject => newCicloAtual.includes(subject.id));
      
      if (todasMatConcluidas) {
        setTimeout(() => {
          launchConfetti();
          setNovoCicloBanner(true);
          setCicloAtual([]);
          setDisciplinasDoDia([]);
          setCompletedSessions([]);
          setCurrentSubjectIndex(0);
          setExpandedSubject(null);
          
          // Atualizar ciclo no banco: novo ciclo
          updateUserCycle({
            ciclo_atual: [],
            disciplinas_do_dia: [],
            ciclos_realizados: (userCycle?.ciclos_realizados || 0) + 1,
            data_inicio_ciclo: new Date().toISOString(),
            data_fim_ciclo: new Date().toISOString()
          });
        }, 500);
        return;
      }
    } catch (error) {
      toast.error("Erro ao salvar revisões. Tente novamente.");
    }
  };

  const handleToggleExpand = (subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectId);
    }
    if (expandedSubject !== subjectId) {
      toast.info("Estudo iniciado");
    }
  };

  const launchConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const getTopicStatus = (topic: Topic) => {
    if (topic.completed && (!topic.nextReview || topic.reviewStage === 'Concluído')) {
      return { label: "Concluído", variant: "outline" as const };
    }
    
    if (!topic.nextReview) {
      return { label: "Primeira Revisão", variant: "outline" as const };
    }
    
    const reviewDate = new Date(topic.nextReview);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(reviewDate, today)) {
      return { label: "Atrasado", variant: "destructive" as const };
    } else if (isToday(reviewDate)) {
      return { label: "Hoje", variant: "secondary" as const };
    } else {
      const formattedDate = format(reviewDate, 'dd/MM');
      return { label: `Próxima: ${formattedDate}`, variant: "secondary" as const };
    }
  };

  const getTopicReviewStage = (topic: Topic) => {
    if (!topic.reviewStage) return "";
    return topic.reviewStage;
  };

  // Salvar disciplinasDoDia e cicloAtual no localStorage sempre que mudarem
  useEffect(() => {
    localStorage.setItem('disciplinasDoDia', JSON.stringify(disciplinasDoDia));
  }, [disciplinasDoDia]);

  useEffect(() => {
    localStorage.setItem('cicloAtual', JSON.stringify(cicloAtual));
  }, [cicloAtual]);

  // Restaurar disciplinasDoDia e cicloAtual do localStorage ao carregar a página
  useEffect(() => {
    const savedDisciplinas = localStorage.getItem('disciplinasDoDia');
    if (savedDisciplinas) {
      try {
        const parsed = JSON.parse(savedDisciplinas);
        if (Array.isArray(parsed)) setDisciplinasDoDia(parsed);
      } catch {}
    }
    const savedCiclo = localStorage.getItem('cicloAtual');
    if (savedCiclo) {
      try {
        const parsed = JSON.parse(savedCiclo);
        if (Array.isArray(parsed)) setCicloAtual(parsed);
      } catch {}
    }
  }, []);

  // Atualizar ciclo no banco sempre que mudar
  useEffect(() => {
    if (!user) return;
    supabase.from('user_cycles').upsert([
      {
        user_id: user.id,
        ciclo_atual: Array.isArray(cicloAtual) ? cicloAtual : [],
        disciplinas_do_dia: Array.isArray(disciplinasDoDia) ? disciplinasDoDia : [],
        atualizado_em: new Date().toISOString()
      }
    ], { onConflict: 'user_id' });
  }, [user, cicloAtual, disciplinasDoDia]);

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

  // Calcular total de disciplinas no ciclo atual (não estudadas)
  const totalDisciplinasCiclo = currentSubjects.length;
  const disciplinasConcluidas = cicloAtual.length;

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
          <motion.div 
            className="flex flex-col md:flex-row md:items-center md:justify-between bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20 gap-2"
            variants={itemVariants}
          >
            <div className="flex items-center gap-2">
              <GraduationCap size={24} className="text-app-blue" weight="duotone" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-app-blue to-purple-600 bg-clip-text text-transparent">
                Plano de Estudo Diário
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={handleNextDay}
                className="flex items-center gap-2 hover:bg-blue-50 transition-colors text-sm px-2 py-1 w-full sm:w-auto"
                disabled={materiasPendentes.length === 0}
              >
                Próximo Dia
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                onClick={handleResetCycle}
                className="hover:bg-red-50 transition-colors text-sm px-2 py-1 w-full sm:w-auto"
              >
                <ArrowClockwise className="h-4 w-4 mr-2" />
                Reiniciar Ciclo
              </Button>
            </div>
          </motion.div>

          {/* Informações do ciclo */}
          {userCycle && (
            <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow w-full">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkle size={16} className="text-yellow-500" weight="fill" />
                      <p className="text-xs text-gray-600">
                        Ciclos realizados: <span className="font-semibold text-app-blue">{userCycle.ciclos_realizados}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" weight="fill" />
                      <p className="text-xs text-gray-600">
                        Disciplinas concluídas: <span className="font-semibold text-app-blue">{disciplinasConcluidas}/{totalDisciplinasCiclo}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar size={16} className="text-purple-500" weight="fill" />
                    Início: {format(new Date(userCycle.data_inicio_ciclo), 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Subjects */}
          <div className="space-y-4">
            {dailySubjects.length === 0 ? (
              <motion.div 
                className="flex flex-col items-center justify-center py-6 bg-white/70 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 w-full"
                variants={itemVariants}
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={32} className="text-app-blue" weight="duotone" />
                  <span className="text-base text-gray-600">Não há matérias para estudar hoje.</span>
                </div>
              </motion.div>
            ) : (
              dailySubjects.map((subject, index) => (
                <motion.div key={subject.id} variants={itemVariants} className="w-full">
                  <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow w-full">
                    <CardHeader className="p-3 pb-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <CardTitle 
                          className="text-base font-bold text-app-blue cursor-pointer flex items-center group"
                          onClick={() => handleToggleExpand(subject.id)}
                        >
                          <BookOpen size={18} className="mr-2 text-app-blue group-hover:rotate-12 transition-transform" weight="duotone" />
                          {subject.name} {expandedSubject === subject.id ? '(Hoje)' : ''}
                          <motion.div
                            animate={{ rotate: expandedSubject === subject.id ? 180 : 0 }}
                            transition={{ type: "spring", stiffness: 200 }}
                          >
                            {expandedSubject === subject.id ? (
                              <ChevronUp className="ml-2 h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-2 h-4 w-4" />
                            )}
                          </motion.div>
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <AnimatePresence>
                        {expandedSubject === subject.id ? (
                          <motion.div 
                            className="space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            {subject.topics.map(topic => {
                              const topicStatus = getTopicStatus(topic);
                              let reviewStage = getTopicReviewStage(topic);
                              if (!reviewStage) reviewStage = 'Não Iniciado';
                              const isMarkedForReview = tempMarkedTopics[subject.id]?.includes(topic.id);
                              const isTopicCompleted = topic.reviewStage === 'Concluído';
                              return (
                                <motion.div key={topic.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-2 rounded bg-white/60">
                                  <div className="flex flex-col gap-1 w-full">
                                    <span className="text-sm font-medium text-gray-800">{topic.name}</span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
                                    <span className="text-xs px-2 py-1 rounded-lg bg-blue-100/80 text-blue-800 font-medium whitespace-nowrap">{reviewStage}</span>
                                    {!isMarkedForReview ? (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-green-600 hover:text-green-800 border border-green-200 hover:bg-green-50 transition-colors text-xs px-2 py-1 h-7 min-w-[110px] w-full sm:w-auto"
                                        onClick={() => handleMarkTopicForReview(subject.id, topic.id)}
                                        disabled={isTopicCompleted}
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Marcar Revisão
                                      </Button>
                                    ) : (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 transition-colors text-xs px-2 py-1 h-7 min-w-[110px] w-full sm:w-auto"
                                        onClick={() => handleCancelTopicReview(subject.id, topic.id)}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancelar
                                      </Button>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                            <Button 
                              className="bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1 mt-2 w-full sm:w-auto h-7"
                              onClick={() => handleCompleteSession(subject.id)}
                              disabled={completedSessions.includes(subject.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-2" />
                              Concluir Sessão
                            </Button>
                          </motion.div>
                        ) : (
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {subject.topics.length} tópicos disponíveis
                            </span>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button 
                                className="bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1 w-full sm:w-auto h-7"
                                onClick={() => handleToggleExpand(subject.id)}
                              >
                                <BookOpen className="h-3 w-3 mr-2" />
                                Iniciar Estudo
                              </Button>
                            </div>
                          </div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {/* Next Subjects */}
          <h2 className="text-lg font-bold mb-2 flex items-center">
            <ArrowRight className="mr-2 h-4 w-4" />
            Próximas Disciplinas
          </h2>
          <div className="space-y-1">
            {nextSubjects.map(subject => (
              <motion.div
                key={subject.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full"
              >
                <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-all w-full">
                  <CardContent className="p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen size={16} className="text-app-blue" weight="duotone" />
                      <h3 className="font-medium text-sm">{subject.name}</h3>
                      <p className="text-xs text-gray-500">{subject.topics.length} tópicos</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Completion State */}
          <AnimatePresence>
            {dailySubjects.length > 0 && 
             dailySubjects.every(subject => completedSessions.includes(subject.id)) && !novoCicloBanner && (
              <motion.div 
                className="mt-6 text-center p-4 bg-green-50/70 backdrop-blur-lg rounded-xl shadow-lg border-2 border-green-300"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Sparkle size={32} className="mx-auto text-yellow-500 mb-2" weight="fill" />
                <h3 className="text-lg font-bold text-green-800">Parabéns! 🎉</h3>
                <p className="mt-1 text-gray-700 text-sm">Você concluiu todas as matérias do dia!</p>
                <Button 
                  className="mt-2 bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1"
                  onClick={handleNextDay}
                >
                  Avançar para o próximo dia
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New Cycle Banner */}
          <AnimatePresence>
            {novoCicloBanner && (
              <motion.div 
                className="mt-6 text-center p-4 bg-blue-50/70 backdrop-blur-lg rounded-xl shadow-lg border-2 border-blue-300 w-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <ArrowClockwise size={32} className="mx-auto text-blue-500 mb-2" weight="fill" />
                <h3 className="text-lg font-bold text-blue-800">Novo ciclo iniciado! 🔄</h3>
                <p className="mt-1 text-gray-700 text-sm">Você concluiu todas as matérias do ciclo. As disciplinas foram reiniciadas na ordem definida.</p>
                <Button 
                  className="mt-2 bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1 w-full sm:w-auto"
                  onClick={() => setNovoCicloBanner(false)}
                >
                  Continuar
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StudyPlan;
