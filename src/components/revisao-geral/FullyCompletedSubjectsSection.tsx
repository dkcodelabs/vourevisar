
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FullyCompletedSubjectsSectionProps {
  fullyCompletedSubjects: Subject[];
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

export const FullyCompletedSubjectsSection: React.FC<FullyCompletedSubjectsSectionProps> = ({
  fullyCompletedSubjects,
  isTopicFullyDominated,
  handleReactivateSubject,
  getLastReviewDate,
  totalCount,
  showAll,
  onToggleShowAll,
  limit
}) => {
  if (fullyCompletedSubjects.length === 0) return null;

  const hasMoreItems = totalCount > limit;

  return (
    <motion.div variants={itemVariants}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Matérias Concluídas
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
            {totalCount}
          </Badge>
        </h2>
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
        {fullyCompletedSubjects.map((subject) => {
          const lastReviewDate = getLastReviewDate(subject);
          const dominatedTopics = subject.topics.filter(isTopicFullyDominated).length;
          
          return (
            <motion.div key={subject.id} variants={itemVariants}>
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {subject.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-sm">
                        {dominatedTopics}/{subject.topics.length} tópicos 100% dominados
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        100% Concluída
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
