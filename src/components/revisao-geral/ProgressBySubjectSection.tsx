
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProgressBySubjectSectionProps {
  subjectsWithDominatedTopics: (Subject & {
    dominatedTopics: Topic[];
    completedTopics: Topic[];
    hasDominatedTopics: boolean;
    hasCompletedTopics: boolean;
  })[];
  isTopicFullyDominated: (topic: Topic) => boolean;
  isTopicCompleted: (topic: Topic) => boolean;
  handleReactivateSubject: (subjectId: string) => void;
  getLastReviewDate: (subject: Subject) => Date | null;
  totalCount: number;
  showAll: boolean;
  onToggleShowAll: () => void;
  limit: number;
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
  getLastReviewDate,
  totalCount,
  showAll,
  onToggleShowAll,
  limit
}) => {
  if (subjectsWithDominatedTopics.length === 0) return null;

  const hasMoreItems = totalCount > limit;

  return (
    <motion.div variants={itemVariants}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          Progresso por Matéria ({totalCount})
        </h2>
        {hasMoreItems && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleShowAll}
            className="flex items-center gap-2"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Mostrar Menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Ver Mais ({totalCount - limit} restantes)
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-4 mb-8">
        {subjectsWithDominatedTopics.map((subject) => {
          const lastReviewDate = getLastReviewDate(subject);
          const pendingReviews = subject.topics.filter(topic => topic.nextReview !== null).length;
          
          return (
            <motion.div key={subject.id} variants={itemVariants}>
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        {subject.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {subject.completedTopics.length} de {subject.topics.length} tópicos concluídos, 
                        {subject.dominatedTopics.length} dominados, {pendingReviews} revisões pendentes
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        {subject.dominatedTopics.length > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {subject.dominatedTopics.length} Dominados
                          </Badge>
                        )}
                        {subject.completedTopics.length > subject.dominatedTopics.length && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            {subject.completedTopics.length - subject.dominatedTopics.length} Em Revisão
                          </Badge>
                        )}
                      </div>
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
                    {/* Tópicos Dominados */}
                    {subject.dominatedTopics.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-green-700 mb-2">
                          Tópicos Dominados ({subject.dominatedTopics.length}):
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {subject.dominatedTopics.map(topic => (
                            <Badge key={topic.id} variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              {topic.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Tópicos Em Revisão */}
                    {subject.completedTopics.length > subject.dominatedTopics.length && (
                      <div>
                        <h4 className="text-sm font-medium text-blue-700 mb-2">
                          Tópicos Em Revisão ({subject.completedTopics.length - subject.dominatedTopics.length}):
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {subject.completedTopics
                            .filter(topic => !isTopicFullyDominated(topic))
                            .map(topic => (
                              <Badge key={topic.id} variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
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
    </motion.div>
  );
};
