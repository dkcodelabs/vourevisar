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
  
  // Get the subjectsPerDay from user settings
  const subjectsPerDay = userProfile?.settings?.subjectsPerDay || 3;
  
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
      const initialDisciplinas = currentSubjects.slice(0, subjectsPerDay).map(s => s.id);
      
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
  }, [user, subjects.length, userProfile?.settings]);
  
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

  // Matérias do dia baseadas no banco de dados
  const dailySubjects = subjects.filter(
    s => disciplinasDoDia.includes(s.id) && !cicloAtual.includes(s.id)
  );

  // Próximas matérias (pendentes que não estão no dia)
  const materiasPendentes = subjects
    .filter(subject => 
      (subject.status === 'Em Estudo' || subject.status === 'Nova') && 
      !userCycle?.ciclo_atual.includes(subject.id) &&
      !userCycle?.disciplinas_do_dia.includes(subject.id)
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
      setCicloAtual(prev => prev.includes(subjectId) ? prev : [...prev, subjectId]);
      setDisciplinasDoDia(prev => prev.filter(id => id !== subjectId));
      setExpandedSubject(null);
      setTempMarkedTopics(prev => {
        const updated = { ...prev };
        delete updated[subjectId];
        return updated;
      });
      // Atualizar ciclo no banco
      await supabase.from('user_cycles').upsert([
        {
          user_id: user.id,
          ciclo_atual: Array.isArray(cicloAtual) ? [...cicloAtual, subjectId] : [subjectId],
          disciplinas_do_dia: disciplinasDoDia.filter(id => id !== subjectId),
          atualizado_em: new Date().toISOString()
        }
      ], { onConflict: 'user_id' });
      // Se todas as matérias do ciclo foram concluídas, reinicia ciclo e mostra banner
      const todasMatConcluidas = subjects
        .filter(subject => subject.status === 'Em Estudo' || subject.status === 'Nova')
        .every(subject => cicloAtual.includes(subject.id) || subject.id === subjectId);
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
          supabase.from('user_cycles').upsert([
            {
              user_id: user.id,
              ciclo_atual: [],
              disciplinas_do_dia: [],
              ciclos_realizados: (userCycle?.ciclos_realizados || 0) + 1,
              data_inicio_ciclo: new Date().toISOString(),
              data_fim_ciclo: new Date().toISOString(),
              atualizado_em: new Date().toISOString()
            }
          ], { onConflict: 'user_id' });
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

  return (
    <motion.div 
      className="container mx-auto p-2 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50"
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
            className="flex items-center justify-between bg-white/70 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20"
            variants={itemVariants}
          >
            <div className="flex items-center gap-2">
              <GraduationCap size={24} className="text-app-blue" weight="duotone" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-app-blue to-purple-600 bg-clip-text text-transparent">
                Plano de Estudo Diário
              </h1>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleNextDay}
                className="flex items-center gap-2 hover:bg-blue-50 transition-colors text-sm px-2 py-1"
                disabled={materiasPendentes.length === 0}
              >
                Próximo Dia
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline"
                onClick={handleResetCycle}
                className="hover:bg-red-50 transition-colors text-sm px-2 py-1"
              >
                <ArrowClockwise className="h-4 w-4 mr-2" />
                Reiniciar Ciclo
              </Button>
            </div>
          </motion.div>

          {/* Informações do ciclo */}
          <motion.div variants={itemVariants}>
            <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
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
                        Disciplinas concluídas: <span className="font-semibold text-app-blue">{userCycle.ciclo_atual.length}</span>
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
          </motion.div>

          {/* Current Subjects */}
          <AnimatePresence>
            {dailySubjects.length > 0 && !dailySubjects.every(subject => completedSessions.includes(subject.id)) && (
              <motion.div className="space-y-2" variants={containerVariants}>
                {dailySubjects.map((subject, index) => (
                  <motion.div
                    key={subject.id}
                    variants={itemVariants}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 100 }}
                  >
                    <Card 
                      className={`bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 ${
                        completedSessions.includes(subject.id) 
                          ? 'border-green-300 bg-green-50/50' 
                          : expandedSubject === subject.id 
                            ? 'border-app-blue' 
                            : ''
                      }`}
                    >
                      <CardHeader className="p-3 pb-2">
                        <div className="flex justify-between items-center">
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
                          <Badge className="bg-blue-100/80 backdrop-blur-sm text-blue-800 hover:bg-blue-100 transition-colors text-xs">
                            Status: {subject.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
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
                                const reviewStage = getTopicReviewStage(topic);
                                const isMarkedForReview = tempMarkedTopics[subject.id]?.includes(topic.id);
                                const isTopicCompleted = topic.reviewStage === 'Concluído';
                                return (
                                  <motion.div 
                                    key={topic.id} 
                                    className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm p-2 rounded-lg border border-white/20 hover:shadow-md transition-all"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                  >
                                    <label className="flex-1 font-medium text-sm">
                                      {topic.name}
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <Badge variant={topicStatus.variant} className="mr-1 backdrop-blur-sm text-xs">
                                        {topicStatus.label}
                                      </Badge>
                                      {reviewStage && (
                                        <Badge variant="outline" className="mr-1 bg-purple-50/80 text-purple-700 border-purple-300 backdrop-blur-sm text-xs">
                                          {reviewStage}
                                        </Badge>
                                      )}
                                    </div>
                                    {!isMarkedForReview ? (
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-green-600 hover:text-green-800 border border-green-200 hover:bg-green-50 transition-colors text-xs px-2 py-1"
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
                                        className="text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 transition-colors text-xs px-2 py-1"
                                        onClick={() => handleCancelTopicReview(subject.id, topic.id)}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Cancelar
                                      </Button>
                                    )}
                                  </motion.div>
                                );
                              })}
                              <Button 
                                className="bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1 mt-2"
                                onClick={() => handleCompleteSession(subject.id)}
                                disabled={completedSessions.includes(subject.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-2" />
                                Concluir Sessão
                              </Button>
                            </motion.div>
                          ) : (
                            <div className="flex justify-between">
                              <span className="text-xs text-gray-500">
                                {subject.topics.length} tópicos disponíveis
                              </span>
                              <div className="flex gap-2">
                                <Button 
                                  className="bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1"
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
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next Subjects */}
          <motion.div className="mt-6" variants={itemVariants}>
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
                >
                  <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-2 flex justify-between items-center">
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
          </motion.div>

          {/* Empty State */}
          <motion.div 
            className="text-center py-6 bg-white/70 backdrop-blur-lg rounded-xl shadow-lg border border-white/20"
            variants={itemVariants}
          >
            <BookOpen size={32} className="mx-auto text-app-blue mb-2" weight="duotone" />
            <p className="text-base text-gray-600">Não há matérias para estudar hoje.</p>
            <Button 
              className="mt-2 bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1"
              onClick={() => navigate('/materias')}
            >
              Adicionar Matérias
            </Button>
          </motion.div>

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
                className="mt-6 text-center p-4 bg-blue-50/70 backdrop-blur-lg rounded-xl shadow-lg border-2 border-blue-300"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <ArrowClockwise size={32} className="mx-auto text-blue-500 mb-2" weight="fill" />
                <h3 className="text-lg font-bold text-blue-800">Novo ciclo iniciado! 🔄</h3>
                <p className="mt-1 text-gray-700 text-sm">Você concluiu todas as matérias do ciclo. As disciplinas foram reiniciadas na ordem definida.</p>
                <Button 
                  className="mt-2 bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 text-xs px-3 py-1"
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
