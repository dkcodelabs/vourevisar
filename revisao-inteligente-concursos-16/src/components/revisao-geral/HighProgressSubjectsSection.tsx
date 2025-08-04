
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Calendar, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HighProgressSubjectsSectionProps {
  highProgressSubjects: Subject[];
  isTopicFullyDominated: (topic: Topic) => boolean;
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

export const HighProgressSubjectsSection: React.FC<HighProgressSubjectsSectionProps> = ({
  highProgressSubjects,
  isTopicFullyDominated,
  handleReactivateSubject,
  getLastReviewDate,
  totalCount,
  showAll,
  onToggleShowAll,
  limit
}) => {
  console.log('HighProgressSubjectsSection - Data:', {
    highProgressSubjects: highProgressSubjects.map(s => s.name),
    totalCount,
    showAll,
    limit
  });

  if (highProgressSubjects.length === 0) return null;

  const hasMoreItems = totalCount > limit;

  return (
    <motion.div variants={itemVariants}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-600" />
            Matérias com Alto Progresso
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
              {totalCount}
            </Badge>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Matérias com todos os tópicos concluídos, mas ainda com revisões futuras agendadas
          </p>
        </div>
        {hasMoreItems && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleShowAll}
            className="flex items-center gap-2 text-xs"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                +{totalCount - limit}
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-3 mb-6">
        {highProgressSubjects.map((subject) => {
          const lastReviewDate = getLastReviewDate(subject);
          
          // Função auxiliar para normalizar nextReview
          const hasTopicPendingReviews = (topic: Topic): boolean => {
            let normalizedNextReview = topic.nextReview;
            if (normalizedNextReview === undefined || 
                (typeof normalizedNextReview === 'object' && normalizedNextReview !== null && Object.keys(normalizedNextReview).length === 0)) {
              normalizedNextReview = null;
            }
            return normalizedNextReview !== null;
          };
          
          const isTopicCompleted = (topic: Topic): boolean => {
            return topic.reviewStage === 'Concluído' || topic.completed === true;
          };
          
          const pendingReviews = subject.topics.filter(hasTopicPendingReviews).length;
          const completedTopics = subject.topics.filter(isTopicCompleted).length;
          const dominatedTopics = subject.topics.filter(isTopicFullyDominated).length;
          
          console.log(`HighProgress Subject ${subject.name}:`, {
            completedTopics,
            dominatedTopics,
            pendingReviews,
            totalTopics: subject.topics.length
          });
          
          return (
            <motion.div key={subject.id} variants={itemVariants}>
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4 text-orange-600" />
                        {subject.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm">
                        {completedTopics}/{subject.topics.length} concluídos, {dominatedTopics} dominados, {pendingReviews} revisões
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                        Alto Progresso
                      </Badge>
                      {lastReviewDate && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {format(lastReviewDate, "dd/MM", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-600 flex-1 mr-3">
                      <div className="flex flex-wrap gap-1">
                        {subject.topics.slice(0, 3).map(topic => (
                          <Badge key={topic.id} variant="outline" className="text-xs px-1 py-0">
                            {topic.name}
                          </Badge>
                        ))}
                        {subject.topics.length > 3 && (
                          <span className="text-xs text-gray-500">+{subject.topics.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReactivateSubject(subject.id)}
                      className="text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50 text-xs h-7"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reativar
                    </Button>
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
