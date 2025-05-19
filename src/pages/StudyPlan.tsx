
import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const StudyPlan = () => {
  const { subjects } = useApp();
  const [expandedSubject, setExpandedSubject] = useState<string | null>('1');
  
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
                  onClick={() => setExpandedSubject(expandedSubject === subject.id ? null : subject.id)}
                >
                  {subject.name} {expandedSubject === subject.id ? '(Hoje)' : ''}
                </CardTitle>
                {expandedSubject === subject.id && (
                  <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    Status: {subject.status}
                  </span>
                )}
              </div>
            </CardHeader>

            {expandedSubject === subject.id && (
              <CardContent>
                <div className="space-y-4">
                  {subject.topics.map(topic => (
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
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Marcar Revisão
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end gap-2 mt-4">
                    <Button 
                      variant="outline"
                    >
                      Pular Matéria
                    </Button>
                    <Button 
                      className="bg-app-blue hover:bg-app-light-blue"
                    >
                      Concluir Sessão
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
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
