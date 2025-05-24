
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
  const dailySubjects = subjects.filter(s => userCycle?.disciplinas_do_dia.includes(s.id) || false);

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
        // Encontrar o tópico
        const topic = subjects.find(s => s.id === subjectId)?.topics.find(t => t.id === topicId);
        if (!topic) continue;
        
        // Calcular o próximo estágio de revisão
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
      
      if (!userCycle) return;
      
      // Atualizar ciclo_atual no banco
      const novoCicloAtual = [...userCycle.ciclo_atual, subjectId];
      
      // Verificar se todas as matérias do ciclo foram concluídas
      const todasMatConcluidas = currentSubjects.every(subject => 
        novoCicloAtual.includes(subject.id)
      );
      
      if (todasMatConcluidas) {
        // Completou o ciclo
        await updateUserCycle({
          ciclo_atual: [],
          ciclos_realizados: userCycle.ciclos_realizados + 1,
          data_fim_ciclo: new Date().toISOString(),
          data_inicio_ciclo: new Date().toISOString(),
          disciplinas_do_dia: currentSubjects.slice(0, subjectsPerDay).map(s => s.id)
        });
        
        setTimeout(() => {
          launchConfetti();
          setNovoCicloBanner(true);
          setCompletedSessions([]);
          setCurrentSubjectIndex(0);
          setExpandedSubject(null);
        }, 500);
      } else {
        // Apenas atualizar ciclo_atual
        await updateUserCycle({
          ciclo_atual: novoCicloAtual
        });
      }
      
      setExpandedSubject(null);
      setTempMarkedTopics(prev => {
        const updated = { ...prev };
        delete updated[subjectId];
        return updated;
      });
      
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Plano de Estudo Diário</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleNextDay}
            className="flex items-center gap-2"
            disabled={materiasPendentes.length === 0}
          >
            Próximo Dia
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline"
            onClick={handleResetCycle}
          >
            Reiniciar Ciclo
          </Button>
        </div>
      </div>

      {/* Informações do ciclo */}
      {userCycle && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Ciclos realizados: <span className="font-semibold">{userCycle.ciclos_realizados}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Disciplinas concluídas no ciclo atual: <span className="font-semibold">{userCycle.ciclo_atual.length}</span>
                </p>
              </div>
              <div className="text-sm text-gray-600">
                Início do ciclo: {format(new Date(userCycle.data_inicio_ciclo), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subjects */}
      {dailySubjects.length > 0 && !dailySubjects.every(subject => completedSessions.includes(subject.id)) && (
        <div className="space-y-4">
          {dailySubjects.map((subject, index) => (
            <Card 
              key={subject.id} 
              className={completedSessions.includes(subject.id) 
                ? 'border-green-300 bg-green-50' 
                : expandedSubject === subject.id 
                  ? 'border-app-blue' 
                  : ''
              }
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle 
                    className="text-xl font-bold text-app-blue cursor-pointer flex items-center"
                    onClick={() => handleToggleExpand(subject.id)}
                  >
                    {subject.name} {expandedSubject === subject.id ? '(Hoje)' : ''}
                    {expandedSubject === subject.id ? (
                      <ChevronUp className="ml-2 h-5 w-5" />
                    ) : (
                      <ChevronDown className="ml-2 h-5 w-5" />
                    )}
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    Status: {subject.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {expandedSubject === subject.id ? (
                  <div className="space-y-4">
                    {subject.topics.map(topic => {
                      const topicStatus = getTopicStatus(topic);
                      const reviewStage = getTopicReviewStage(topic);
                      const isMarkedForReview = tempMarkedTopics[subject.id]?.includes(topic.id);
                      const isTopicCompleted = topic.reviewStage === 'Concluído';
                      return (
                        <div key={topic.id} className="flex items-center space-x-3 border p-3 rounded-lg">
                          <label className="flex-1 font-medium">
                            {topic.name}
                          </label>
                          <div className="flex items-center gap-2">
                            <Badge variant={topicStatus.variant} className="mr-2">
                              {topicStatus.label}
                            </Badge>
                            {reviewStage && (
                              <Badge variant="outline" className="mr-2 bg-purple-50 text-purple-700 border-purple-300">
                                {reviewStage}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {!isMarkedForReview ? (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-green-600 hover:text-green-800 border border-green-200"
                                onClick={() => handleMarkTopicForReview(subject.id, topic.id)}
                                disabled={isTopicCompleted}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Marcar Revisão
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-600 hover:text-red-800 border border-red-200"
                                onClick={() => handleCancelTopicReview(subject.id, topic.id)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-between gap-2 mt-4">
                      <Button 
                        className="bg-app-blue hover:bg-app-light-blue"
                        onClick={() => handleCompleteSession(subject.id)}
                        disabled={completedSessions.includes(subject.id)}
                      >
                        Concluir Sessão
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">
                      {subject.topics.length} tópicos disponíveis
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        className="bg-app-blue hover:bg-app-light-blue"
                        onClick={() => handleToggleExpand(subject.id)}
                      >
                        Iniciar Estudo
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Next Subjects */}
      {nextSubjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <ArrowRight className="mr-2 h-5 w-5" />
            Próximas Disciplinas
          </h2>
          
          <div className="space-y-2">
            {nextSubjects.map(subject => (
              <Card key={subject.id} className="hover:shadow-md">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{subject.name}</h3>
                    <p className="text-sm text-gray-500">{subject.topics.length} tópicos</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {dailySubjects.length === 0 && (
        <div className="text-center py-8">
          <p className="text-xl text-gray-600">Não há matérias para estudar hoje.</p>
          <Button className="mt-4 bg-app-blue hover:bg-app-light-blue" onClick={() => navigate('/materias')}>
            Adicionar Matérias
          </Button>
        </div>
      )}
      
      {/* Show confetti and message when all sessions are completed */}
      {dailySubjects.length > 0 && 
       dailySubjects.every(subject => completedSessions.includes(subject.id)) && !novoCicloBanner && (
        <div className="mt-8 text-center p-8 border-2 border-green-300 rounded-lg bg-green-50">
          <h3 className="text-xl font-bold text-green-800">Parabéns! 🎉</h3>
          <p className="mt-2 text-gray-700">Você concluiu todas as matérias do dia!</p>
          <Button 
            className="mt-4 bg-app-blue hover:bg-app-light-blue" 
            onClick={handleNextDay}
          >
            Avançar para o próximo dia
          </Button>
        </div>
      )}
      
      {/* Banner de novo ciclo */}
      {novoCicloBanner && (
        <div className="mt-8 text-center p-8 border-2 border-blue-300 rounded-lg bg-blue-50">
          <h3 className="text-xl font-bold text-blue-800">Novo ciclo iniciado! 🔄</h3>
          <p className="mt-2 text-gray-700">Você concluiu todas as matérias do ciclo. As disciplinas foram reiniciadas na ordem definida.</p>
          <Button 
            className="mt-4 bg-app-blue hover:bg-app-light-blue"
            onClick={() => setNovoCicloBanner(false)}
          >
            Continuar
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudyPlan;
