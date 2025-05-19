import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const StudyPlan = () => {
  const { subjects } = useApp();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [markedTopics, setMarkedTopics] = useState<Record<string, string[]>>({});
  
  // Filter subjects that are in progress
  const currentSubjects = subjects.filter(subject => 
    subject.status === 'Em Estudo' || subject.status === 'Nova'
  ).slice(0, 3);
  
  const nextSubjects = subjects.filter(subject => 
    subject.status === 'Nova'
  ).slice(3, 6);

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
    // Move current expanded subject to the end of the array
    if (expandedSubject) {
      toast.info("Matéria pulada");
      
      // Find the next subject to expand (in a real app, this would rotate through subjects)
      const currentIndex = currentSubjects.findIndex(subject => subject.id === expandedSubject);
      const nextIndex = (currentIndex + 1) % currentSubjects.length;
      
      if (currentSubjects[nextIndex]) {
        setExpandedSubject(currentSubjects[nextIndex].id);
      } else {
        setExpandedSubject(null);
      }
    }
  };

  const handleCompleteSession = (subjectId: string) => {
    // In a real app, this would save the review session and set next review dates
    toast.success("Sessão de estudo concluída");
    setExpandedSubject(null);
    setMarkedTopics(prev => {
      const updated = { ...prev };
      delete updated[subjectId];
      return updated;
    });
  };

  const hasMarkedTopics = (subjectId: string) => {
    return markedTopics[subjectId] && markedTopics[subjectId].length > 0;
  };

  // This is the function we need to modify
  const getTopicStatus = (topic: any) => {
    if (topic.completed) return { label: "Concluído", variant: "outline" as const };
    
    // This would be determined by the review schedule in a real app
    const statuses = ["Revisão Pendente", "Revisão para Hoje", "Próxima Revisão: 25/05"];
    const randomIndex = Math.floor(Math.random() * statuses.length);
    const status = statuses[randomIndex];
    
    if (status === "Revisão Pendente") return { label: status, variant: "secondary" as const };
    if (status === "Revisão para Hoje") return { label: status, variant: "destructive" as const };
    return { label: status, variant: "secondary" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Plano de Estudo Diário</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            Próximo Dia
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline">
            Reiniciar Ciclo
          </Button>
        </div>
      </div>

      <div className="space-y-6 mt-6">
        {currentSubjects.map(subject => (
          <Card key={subject.id} className={expandedSubject === subject.id ? 'border-app-blue' : ''}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle 
                  className="text-xl font-bold text-app-blue cursor-pointer"
                >
                  {subject.name} {expandedSubject === subject.id ? '(Hoje)' : ''}
                </CardTitle>
                {expandedSubject === subject.id && (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    Status: {subject.status}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {expandedSubject === subject.id ? (
                <div className="space-y-4">
                  {subject.topics.map(topic => {
                    const topicStatus = getTopicStatus(topic);
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
                        
                        <Badge variant={topicStatus.variant} className="mr-2">
                          {topicStatus.label}
                        </Badge>
                        
                        <div className="flex gap-2">
                          {!isMarkedForReview ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-green-600 hover:text-green-800"
                              onClick={() => handleMarkTopicForReview(subject.id, topic.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Marcar Revisão
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-800"
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
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <Button 
                      variant="outline"
                      onClick={handleSkipSubject}
                    >
                      Pular Matéria
                    </Button>
                    <Button 
                      className="bg-app-blue hover:bg-app-light-blue"
                      onClick={() => handleCompleteSession(subject.id)}
                      disabled={!hasMarkedTopics(subject.id)}
                    >
                      Concluir Sessão
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <Button 
                    className="bg-app-blue hover:bg-app-light-blue"
                    onClick={() => handleStartStudy(subject.id)}
                  >
                    Iniciar Estudo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {nextSubjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <ArrowRight className="mr-2 h-5 w-5" />
            Próximas Disciplinas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nextSubjects.map(subject => (
              <Card key={subject.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h3 className="font-medium">{subject.name}</h3>
                  <p className="text-sm text-gray-500">{subject.topics.length} tópicos</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlan;
