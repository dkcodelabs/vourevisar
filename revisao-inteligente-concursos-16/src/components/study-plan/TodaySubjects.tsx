import React from 'react';
import { ChevronDown, ChevronUp, BookOpen, Play } from 'lucide-react';
import { Subject } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import TopicsList from './TopicsList';

interface TodaySubjectsProps {
  subjects: Subject[];
  expandedSubject: string;
  tempMarkedTopics: Record<string, string[]>;
  onToggleExpand: (subjectId: string) => void;
  onMarkTopicForReview: (subjectId: string, topicId: string) => void;
  onCancelTopicReview: (subjectId: string, topicId: string) => void;
  onCompleteSession: (subjectId: string) => void;
}

const TodaySubjects: React.FC<TodaySubjectsProps> = ({
  subjects,
  expandedSubject,
  tempMarkedTopics,
  onToggleExpand,
  onMarkTopicForReview,
  onCancelTopicReview,
  onCompleteSession
}) => {
  const getSubjectProgress = (subject: Subject) => {
    const totalTopics = subject.topics?.length || 0;
    const completedTopics = subject.topics?.filter(topic => {
      const reviewCount = topic.reviewCount || topic.review_count || 0;
      return reviewCount > 0;
    }).length || 0;
    
    return { completed: completedTopics, total: totalTopics };
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  if (subjects.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Título da seção */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Matérias para hoje
        </h2>
      </div>

      {/* Lista de matérias */}
      <div className="space-y-3">
        {subjects.map((subject) => {
          const { completed, total } = getSubjectProgress(subject);
          const progressPercentage = getProgressPercentage(completed, total);
          const isExpanded = expandedSubject === subject.id;

          return (
            <Card key={subject.id} className="border border-gray-200 shadow-sm">
              <CardContent className="p-0">
                {/* Header do card */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onToggleExpand(subject.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center">
                      <Play className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">
                        {subject.name}
                        {subject.status === 'Hoje' && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Hoje
                          </span>
                        )}
                      </h3>
                      <p className="text-sm font-medium text-gray-500">
                        {completed} de {total} tópicos concluídos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Barra de progresso */}
                    <div className="w-48 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-sky-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    
                    {/* Ícone de expansão */}
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    <div className="p-4">
                      <TopicsList
                        subject={subject}
                        tempMarkedTopics={tempMarkedTopics}
                        onMarkTopicForReview={onMarkTopicForReview}
                        onCancelTopicReview={onCancelTopicReview}
                      />
                      
                      {/* Botão de ação */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Pular Matéria
                          </Button>
                          
                          <Button
                            onClick={() => onCompleteSession(subject.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={!tempMarkedTopics[subject.id]?.length}
                          >
                            {tempMarkedTopics[subject.id]?.length > 0 
                              ? `Concluir (${tempMarkedTopics[subject.id].length} tópicos)`
                              : 'Iniciar Estudo'
                            }
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TodaySubjects;