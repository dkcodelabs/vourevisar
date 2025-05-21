import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, ArrowRight, ChevronDown, ChevronUp, SkipForward, Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { Subject } from '@/types';
import { Progress } from '@/components/ui/progress';

const StudyPlan = () => {
  const { subjects, userProfile, fetchSubjects, fetchUserSettings } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [markedTopics, setMarkedTopics] = useState<Record<string, string[]>>({});
  const [currentSubjects, setCurrentSubjects] = useState<Subject[]>([]);
  const [nextSubjects, setNextSubjects] = useState<Subject[]>([]);
  const [completedSubjects, setCompletedSubjects] = useState<string[]>([]);
  const [currentCycleSubjects, setCurrentCycleSubjects] = useState<string[]>([]);
  const [cycleProgress, setCycleProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Buscar dados do usuário ao carregar a página
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setIsLoading(true);
        await fetchSubjects();
        await fetchUserSettings();
        setIsLoading(false);
      };
      
      loadData();
    }
  }, [user]);
  
  // Setup study subjects when user data is loaded
  useEffect(() => {
    if (!isLoading && subjects.length > 0) {
      initializeStudyPlan();
    }
  }, [isLoading, subjects, userProfile]);
  
  // Initialize the study plan
  const initializeStudyPlan = () => {
    // Get the subjectsPerDay from user settings
    const subjectsPerDay = userProfile?.settings?.subjectsPerDay || 3;
    
    // Filter and sort active subjects by priority
    const activeSubjects = subjects
      .filter(subject => subject.status === 'Em Estudo' || subject.status === 'Nova')
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    if (activeSubjects.length === 0) {
      setCurrentSubjects([]);
      setNextSubjects([]);
      return;
    }
    
    // If we don't have any subjects in the current cycle, initialize with all subjects
    if (currentCycleSubjects.length === 0) {
      setCurrentCycleSubjects(activeSubjects.map(subject => subject.id));
    }
    
    // Get subjects for today (that haven't been completed yet)
    const availableSubjects = activeSubjects.filter(
      subject => !completedSubjects.includes(subject.id)
    );
    
    // Sort by the order they appear in the currentCycleSubjects array
    availableSubjects.sort((a, b) => {
      const indexA = currentCycleSubjects.indexOf(a.id);
      const indexB = currentCycleSubjects.indexOf(b.id);
      return indexA - indexB;
    });
    
    // Get subjects for today
    const todaysSubjects = availableSubjects.slice(0, subjectsPerDay);
    
    // Get subjects for tomorrow
    const tomorrowsSubjects = availableSubjects.slice(
      subjectsPerDay, 
      subjectsPerDay * 2
    );
    
    // Calculate cycle progress
    const completedInCycle = currentCycleSubjects.filter(
      id => completedSubjects.includes(id)
    ).length;
    
    const progressPercentage = currentCycleSubjects.length > 0
      ? Math.round((completedInCycle / currentCycleSubjects.length) * 100)
      : 0;
    
    setCurrentSubjects(todaysSubjects);
    setNextSubjects(tomorrowsSubjects);
    setCycleProgress(progressPercentage);
  };
  
  const handleToggleTopic = async (subjectId: string, topicId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('topics')
        .update({ completed })
        .eq('id', topicId);

      if (error) throw error;
      
      // Atualizar localmente
      await fetchSubjects();
    } catch (error) {
      console.error('Erro ao atualizar tópico:', error);
      toast.error("Erro ao atualizar tópico");
    }
  };
  
  const handleMarkTopicForReview = async (subjectId: string, topicId: string) => {
    try {
      // Encontrar o tópico
      const topic = subjects.find(s => s.id === subjectId)?.topics.find(t => t.id === topicId);
      
      if (!topic) {
        toast.error("Tópico não encontrado");
        return;
      }
      
      // Calcular o próximo estágio de revisão
      const nextStage = getNextReviewStage(topic.reviewStage);
      
      // Calcular a próxima data de revisão
      const nextReview = calculateNextReview(nextStage !== 'Concluído' ? nextStage : undefined);
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('topics')
        .update({ 
          review_count: topic.reviewCount + 1,
          next_review: nextStage !== 'Concluído' ? nextReview.toISOString() : null,
          review_stage: nextStage,
          last_reviewed_at: new Date().toISOString()
        })
        .eq('id', topicId);

      if (error) throw error;
      
      // Atualizar localmente
      setMarkedTopics(prev => {
        const updatedTopics = { ...prev };
        
        if (!updatedTopics[subjectId]) {
          updatedTopics[subjectId] = [];
        }
        
        if (!updatedTopics[subjectId].includes(topicId)) {
          updatedTopics[subjectId] = [...updatedTopics[subjectId], topicId];
        }
        
        return updatedTopics;
      });
      
      await fetchSubjects();
      toast.success(`Tópico marcado para revisão em ${nextStage !== 'Concluído' ? nextStage : 'Concluído'}`);
    } catch (error) {
      console.error('Erro ao marcar tópico para revisão:', error);
      toast.error("Erro ao marcar tópico para revisão");
    }
  };

  const handleCancelTopicReview = async (subjectId: string, topicId: string) => {
    try {
      // Remover a próxima revisão
      const { error } = await supabase
        .from('topics')
        .update({ 
          next_review: null,
          review_stage: null
        })
        .eq('id', topicId);

      if (error) throw error;
      
      // Atualizar localmente
      setMarkedTopics(prev => {
        const updatedTopics = { ...prev };
        
        if (updatedTopics[subjectId]) {
          updatedTopics[subjectId] = updatedTopics[subjectId].filter(id => id !== topicId);
        }
        
        return updatedTopics;
      });
      
      await fetchSubjects();
      toast.info("Revisão cancelada");
    } catch (error) {
      console.error('Erro ao cancelar revisão:', error);
      toast.error("Erro ao cancelar revisão");
    }
  };

  const handleToggleExpand = (subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null); // Collapse if already expanded
    } else {
      setExpandedSubject(subjectId); // Expand if not already expanded
    }
    if (expandedSubject !== subjectId) {
      toast.info("Estudo iniciado");
    }
  };

  const handleSkipSubject = (subjectId: string) => {
    // Get all active cycle subjects that haven't been completed yet
    const remainingSubjects = currentCycleSubjects.filter(
      id => !completedSubjects.includes(id)
    );
    
    // Remove the skipped subject and push it to the end
    const updatedOrder = [
      ...remainingSubjects.filter(id => id !== subjectId),
      subjectId
    ];
    
    // Create new current cycle with the completed subjects at the start and the new order
    const completedIds = currentCycleSubjects.filter(
      id => completedSubjects.includes(id)
    );
    
    setCurrentCycleSubjects([...completedIds, ...updatedOrder]);
    toast.info("Matéria pulada para o final da sequência");
    
    // Reinitialize the study plan with the new order
    setTimeout(() => {
      initializeStudyPlan();
    }, 100);
  };

  const launchConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleCompleteSubject = (subjectId: string) => {
    // Mark the subject as completed
    setCompletedSubjects(prev => [...prev, subjectId]);
    toast.success("Sessão de estudo concluída");
    setExpandedSubject(null);
    setMarkedTopics(prev => {
      const updated = { ...prev };
      delete updated[subjectId];
      return updated;
    });
    
    // Check if all subjects in the cycle are completed
    const updatedCompletedSubjects = [...completedSubjects, subjectId];
    const allCompleted = currentCycleSubjects.every(id => 
      updatedCompletedSubjects.includes(id)
    );
    
    if (allCompleted) {
      setTimeout(() => {
        launchConfetti();
        toast.success("Parabéns! Você concluiu todas as matérias deste ciclo!");
      }, 500);
    }
    
    // Refresh the study plan
    setTimeout(() => {
      initializeStudyPlan();
    }, 100);
  };

  const handleNextCycle = () => {
    // Check if all subjects in the cycle are completed
    const allCompleted = currentCycleSubjects.every(id => 
      completedSubjects.includes(id)
    );
    
    if (allCompleted) {
      toast.success("Iniciando próximo ciclo de estudos");
      // Reset completed subjects for the new cycle
      setCompletedSubjects([]);
      // Reset the cycle subjects so they initialize from scratch
      setCurrentCycleSubjects([]);
      launchConfetti();
      
      // Reinitialize the study plan
      setTimeout(() => {
        initializeStudyPlan();
      }, 100);
    } else {
      toast.error("Complete todas as matérias do ciclo antes de avançar");
    }
  };

  const handleResetCycle = () => {
    // Reset the study cycle
    setCompletedSubjects([]);
    setCurrentCycleSubjects([]);
    setExpandedSubject(null);
    setMarkedTopics({});
    toast.info("Ciclo reiniciado");
    
    // Reinitialize the study plan
    setTimeout(() => {
      initializeStudyPlan();
    }, 100);
  };

  const hasMarkedTopics = (subjectId: string) => {
    return markedTopics[subjectId] && markedTopics[subjectId].length > 0;
  };

  const getTopicStatus = (topic) => {
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

  const getTopicReviewStage = (topic) => {
    if (!topic.reviewStage) return "";
    return topic.reviewStage;
  };

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
        {currentCycleSubjects.length > 0 && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleNextCycle}
              disabled={!currentCycleSubjects.every(id => completedSubjects.includes(id))}
              className="flex items-center gap-2"
            >
              Próximo Ciclo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline"
              onClick={handleResetCycle}
            >
              Reiniciar Ciclo
            </Button>
          </div>
        )}
      </div>
      
      {/* Cycle Progress */}
      {currentCycleSubjects.length > 0 && (
        <Card className="bg-slate-50">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Progresso do Ciclo</h3>
              <span className="text-sm font-medium">
                {completedSubjects.length}/{currentCycleSubjects.length} matérias estudadas
              </span>
            </div>
            <Progress value={cycleProgress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Current Subjects */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-app-blue" />
          Matérias de Hoje
        </h2>
        
        {currentSubjects.length > 0 ? (
          currentSubjects.map((subject) => (
            <Card 
              key={subject.id} 
              className={completedSubjects.includes(subject.id) 
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
                    {subject.name}
                    {expandedSubject === subject.id ? (
                      <ChevronUp className="ml-2 h-5 w-5" />
                    ) : (
                      <ChevronDown className="ml-2 h-5 w-5" />
                    )}
                  </CardTitle>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    {subject.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {expandedSubject === subject.id ? (
                  <div className="space-y-4">
                    {/* Topics for expanded subject */}
                    {subject.topics.length > 0 ? (
                      subject.topics.map(topic => {
                        const topicStatus = getTopicStatus(topic);
                        const reviewStage = getTopicReviewStage(topic);
                        const isMarkedForReview = markedTopics[subject.id]?.includes(topic.id);
                        
                        return (
                          <div key={topic.id} className="flex items-center space-x-3 border p-3 rounded-lg">
                            <Checkbox 
                              id={topic.id} 
                              checked={topic.completed}
                              onCheckedChange={(checked) => 
                                handleToggleTopic(subject.id, topic.id, checked === true)
                              }
                            />
                            <label 
                              htmlFor={topic.id}
                              className="flex-1 font-medium"
                            >
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
                                  disabled={topic.reviewStage === 'Concluído' || (topic.nextReview && !isToday(new Date(topic.nextReview)))}
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
                      })
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Esta matéria não possui tópicos cadastrados.</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between gap-2 mt-4">
                      <Button 
                        className="bg-app-blue hover:bg-app-light-blue"
                        onClick={() => handleCompleteSubject(subject.id)}
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
                        variant="outline"
                        onClick={() => handleSkipSubject(subject.id)}
                        className="flex items-center"
                      >
                        <SkipForward className="h-4 w-4 mr-1" />
                        Pular Matéria
                      </Button>
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
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Não há matérias para estudar hoje.</p>
              {subjects.length === 0 ? (
                <Button 
                  className="mt-4 bg-app-blue hover:bg-app-light-blue" 
                  onClick={() => navigate('/materias')}
                >
                  Adicionar Matérias
                </Button>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Todas as matérias deste ciclo foram concluídas. Clique em "Próximo Ciclo" para continuar.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Next Subjects */}
      {nextSubjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <ArrowRight className="mr-2 h-5 w-5 text-app-blue" />
            Próximas Matérias
          </h2>
          
          <div className="space-y-2">
            {nextSubjects.map(subject => (
              <Card key={subject.id} className="hover:shadow-md">
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{subject.name}</h3>
                    <p className="text-sm text-gray-500">{subject.topics.length} tópicos</p>
                  </div>
                  
                  <Badge variant="outline" className="bg-gray-100 text-gray-800">
                    {subject.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Complete cycle message */}
      {currentCycleSubjects.length > 0 && 
       currentCycleSubjects.every(id => completedSubjects.includes(id)) && (
        <div className="mt-8 text-center p-8 border-2 border-green-300 rounded-lg bg-green-50">
          <h3 className="text-xl font-bold text-green-800">Parabéns! 🎉</h3>
          <p className="mt-2 text-gray-700">Você concluiu todas as matérias deste ciclo!</p>
          <Button 
            className="mt-4 bg-app-blue hover:bg-app-light-blue" 
            onClick={handleNextCycle}
          >
            Iniciar Próximo Ciclo
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudyPlan;
