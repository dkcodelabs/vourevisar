
import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';  // Add this import
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, ArrowRight, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const StudyPlan = () => {
  const { subjects, userProfile } = useApp();
  const navigate = useNavigate(); // Add this hook
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [markedTopics, setMarkedTopics] = useState<Record<string, string[]>>({});
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [currentSubjectIndex, setCurrentSubjectIndex] = useState(0);
  
  // Get the subjectsPerDay from user settings
  const subjectsPerDay = userProfile?.settings?.subjectsPerDay || 3;
  
  // Filter subjects that are in progress
  const currentSubjects = subjects.filter(subject => 
    subject.status === 'Em Estudo' || subject.status === 'Nova'
  );
  
  // Current subject to display (respect settings)
  const dailySubjects = currentSubjects.slice(0, subjectsPerDay);
  
  // Current subject to display
  const currentSubject = dailySubjects[currentSubjectIndex];
  
  // Next subjects to display (excluding the current one)
  const nextSubjects = dailySubjects.filter(subject => 
    subject.id !== (currentSubject?.id || '')
  );

  const handleToggleTopic = (subjectId: string, topicId: string, completed: boolean) => {
    // In a real app, this would update the topic's completion status
    console.log(`Toggle topic ${topicId} in subject ${subjectId} to ${completed}`);
  };

  const handleMarkTopicForReview = (subjectId: string, topicId: string) => {
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
    
    toast.success("Tópico marcado para revisão");
  };

  const handleCancelTopicReview = (subjectId: string, topicId: string) => {
    setMarkedTopics(prev => {
      const updatedTopics = { ...prev };
      
      if (updatedTopics[subjectId]) {
        updatedTopics[subjectId] = updatedTopics[subjectId].filter(id => id !== topicId);
      }
      
      return updatedTopics;
    });
    
    toast.info("Revisão cancelada");
  };

  const handleStartStudy = (subjectId: string) => {
    setExpandedSubject(subjectId);
    toast.info("Estudo iniciado");
  };

  const handleSkipSubject = () => {
    // Move to the next subject in the sequence
    const nextIndex = (currentSubjectIndex + 1) % dailySubjects.length;
    setCurrentSubjectIndex(nextIndex);
    setExpandedSubject(null);
    toast.info("Matéria pulada");
  };

  const launchConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleCompleteSession = (subjectId: string) => {
    // Mark the session as completed
    setCompletedSessions(prev => [...prev, subjectId]);
    toast.success("Sessão de estudo concluída");
    setExpandedSubject(null);
    setMarkedTopics(prev => {
      const updated = { ...prev };
      delete updated[subjectId];
      return updated;
    });
    
    // Check if all sessions are completed
    const updatedCompletedSessions = [...completedSessions, subjectId];
    if (updatedCompletedSessions.length === dailySubjects.length) {
      setTimeout(() => {
        launchConfetti();
        toast.success("Parabéns! Você concluiu todas as matérias do dia!");
      }, 500);
    }
  };

  const handleNextDay = () => {
    // Check if all sessions for today are completed
    const allCompleted = dailySubjects.every(subject => 
      completedSessions.includes(subject.id)
    );
    
    if (allCompleted) {
      toast.success("Avançando para o próximo dia");
      // Reset completed sessions for the new day
      setCompletedSessions([]);
      setCurrentSubjectIndex(0);
      launchConfetti();
    } else {
      toast.error("Complete todas as matérias do dia antes de avançar");
    }
  };

  const handleResetCycle = () => {
    // Reset the study cycle
    setCompletedSessions([]);
    setCurrentSubjectIndex(0);
    setExpandedSubject(null);
    setMarkedTopics({});
    toast.info("Ciclo reiniciado");
  };

  const hasMarkedTopics = (subjectId: string) => {
    return markedTopics[subjectId] && markedTopics[subjectId].length > 0;
  };

  const getTopicStatus = (topic: any) => {
    if (topic.completed) return { label: "Concluído", variant: "outline" as const };
    
    // This would be determined by the review schedule in a real app
    // Now we'll keep them consistent based on the topic ID to avoid changing
    const topicId = parseInt(topic.id.split('-')[1], 10) || 0;
    const statuses = [
      { label: "Revisão Pendente", variant: "secondary" as const },
      { label: "Revisão para Hoje", variant: "destructive" as const },
      { label: "Próxima Revisão: 25/05", variant: "secondary" as const },
      { label: "Revisado", variant: "outline" as const }
    ];
    
    // Determine status based on the topic ID to keep it consistent
    const index = topicId % statuses.length;
    return statuses[index];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Plano de Estudo Diário</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleNextDay}
            disabled={!dailySubjects.every(subject => completedSessions.includes(subject.id))}
            className="flex items-center gap-2"
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

      {/* Current Subject */}
      {currentSubject && (
        <Card key={currentSubject.id} className={expandedSubject === currentSubject.id ? 'border-app-blue' : ''}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold text-app-blue cursor-pointer flex items-center">
                {currentSubject.name} {expandedSubject === currentSubject.id ? '(Hoje)' : ''}
                {expandedSubject === currentSubject.id && <ChevronDown className="ml-2 h-5 w-5" />}
              </CardTitle>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                Status: {currentSubject.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {expandedSubject === currentSubject.id ? (
              <div className="space-y-4">
                {currentSubject.topics.map(topic => {
                  const topicStatus = getTopicStatus(topic);
                  const isMarkedForReview = markedTopics[currentSubject.id]?.includes(topic.id);
                  
                  return (
                    <div key={topic.id} className="flex items-center space-x-3 border p-3 rounded-lg">
                      <Checkbox 
                        id={topic.id} 
                        checked={topic.completed}
                        onCheckedChange={(checked) => 
                          handleToggleTopic(currentSubject.id, topic.id, checked === true)
                        }
                      />
                      <label 
                        htmlFor={topic.id}
                        className="flex-1 font-medium"
                      >
                        {topic.name}
                      </label>
                      
                      <Badge variant={topicStatus.variant} className="mr-2">
                        {topicStatus.label}
                      </Badge>
                      
                      <div className="flex gap-2">
                        {!isMarkedForReview ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600 hover:text-green-800 border border-green-200"
                            onClick={() => handleMarkTopicForReview(currentSubject.id, topic.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Marcar Revisão
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-800 border border-red-200"
                            onClick={() => handleCancelTopicReview(currentSubject.id, topic.id)}
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
                    variant="outline"
                    onClick={handleSkipSubject}
                  >
                    Pular Matéria
                  </Button>
                  <Button 
                    className="bg-app-blue hover:bg-app-light-blue"
                    onClick={() => handleCompleteSession(currentSubject.id)}
                    disabled={!hasMarkedTopics(currentSubject.id)}
                  >
                    Concluir Sessão
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <Button 
                  className="bg-app-blue hover:bg-app-light-blue"
                  onClick={() => handleStartStudy(currentSubject.id)}
                >
                  Iniciar Estudo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
              <Card key={subject.id} className={completedSessions.includes(subject.id) ? 'border-green-300 bg-green-50' : 'hover:shadow-md'}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{subject.name}</h3>
                    <p className="text-sm text-gray-500">{subject.topics.length} tópicos</p>
                  </div>
                  
                  {completedSessions.includes(subject.id) && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      Concluída
                    </Badge>
                  )}
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
       dailySubjects.every(subject => completedSessions.includes(subject.id)) && (
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
    </div>
  );
};

export default StudyPlan;
