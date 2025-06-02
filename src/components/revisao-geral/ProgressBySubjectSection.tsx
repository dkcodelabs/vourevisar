
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Calendar, RotateCcw } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProgressBySubjectSectionProps {
  subjectsWithDominatedTopics: Array<Subject & {
    dominatedTopics: Topic[];
    completedTopics: Topic[];
    hasDominatedTopics: boolean;
    hasCompletedTopics: boolean;
  }>;
  isTopicFullyDominated: (topic: Topic) => boolean;
  isTopicCompleted: (topic: Topic) => boolean;
  handleReactivateSubject: (subjectId: string) => void;
  getLastReviewDate: (subject: Subject) => Date | null;
}

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

export const ProgressBySubjectSection: React.FC<ProgressBySubjectSectionProps> = ({
  subjectsWithDominatedTopics,
  isTopicFullyDominated,
  isTopicCompleted,
  handleReactivateSubject,
  getLastReviewDate
}) => {
  return (
    <motion.div variants={itemVariants}>
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Star className="h-6 w-6 text-blue-600" />
        Progresso por Matéria
      </h2>

      {subjectsWithDominatedTopics.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhum tópico concluído ainda
            </h3>
            <p className="text-gray-500 text-sm">
              Continue estudando para concluir seus tópicos!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 mb-8">
          {subjectsWithDominatedTopics.map((subject) => {
            const lastReviewDate = getLastReviewDate(subject);
            
            return (
              <motion.div key={subject.id} variants={itemVariants}>
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-blue-600" />
                          {subject.name}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {subject.completedTopics.length} de {subject.topics.length} tópicos concluídos
                          {subject.dominatedTopics.length > 0 && (
                            <span className="text-green-600 font-medium">
                              {" "}• {subject.dominatedTopics.length} dominados
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {Math.round((subject.completedTopics.length / subject.topics.length) * 100)}% Concluída
                        </Badge>
                        {subject.dominatedTopics.length > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {subject.dominatedTopics.length} Dominados
                          </Badge>
                        )}
                        {lastReviewDate && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {format(lastReviewDate, "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {subject.completedTopics.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <strong>Tópicos concluídos:</strong>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {subject.completedTopics.map(topic => (
                              <Badge 
                                key={topic.id} 
                                variant="outline" 
                                className={
                                  isTopicFullyDominated(topic) 
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }
                              >
                                {topic.name}
                                {isTopicFullyDominated(topic) && " ★"}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {subject.topics.length > subject.completedTopics.length && (
                        <div className="text-sm text-gray-500">
                          <strong>Tópicos restantes:</strong>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {subject.topics
                              .filter(topic => !isTopicCompleted(topic))
                              .map(topic => (
                                <Badge key={topic.id} variant="outline" className="bg-gray-50 text-gray-600">
                                  {topic.name}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivateSubject(subject.id)}
                          className="text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reativar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
