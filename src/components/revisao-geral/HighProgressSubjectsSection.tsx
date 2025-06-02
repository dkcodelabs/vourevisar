
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Calendar, RotateCcw } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HighProgressSubjectsSectionProps {
  highProgressSubjects: Subject[];
  isTopicFullyDominated: (topic: Topic) => boolean;
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

export const HighProgressSubjectsSection: React.FC<HighProgressSubjectsSectionProps> = ({
  highProgressSubjects,
  isTopicFullyDominated,
  handleReactivateSubject,
  getLastReviewDate
}) => {
  if (highProgressSubjects.length === 0) return null;

  return (
    <motion.div variants={itemVariants}>
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Target className="h-6 w-6 text-orange-600" />
        Matérias com Alto Progresso ({highProgressSubjects.length})
      </h2>

      <div className="grid gap-4 mb-8">
        {highProgressSubjects.map((subject) => {
          const lastReviewDate = getLastReviewDate(subject);
          const pendingReviews = subject.topics.filter(topic => topic.nextReview !== null).length;
          const completedTopics = subject.topics.filter(topic => topic.reviewStage === 'Concluído').length;
          const dominatedTopics = subject.topics.filter(isTopicFullyDominated).length;
          
          return (
            <motion.div key={subject.id} variants={itemVariants}>
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-600" />
                        {subject.name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {completedTopics} de {subject.topics.length} tópicos concluídos, {dominatedTopics} dominados, {pendingReviews} revisões pendentes
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        Alto Progresso
                      </Badge>
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
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <strong>Tópicos:</strong> {subject.topics.map(topic => topic.name).join(', ')}
                    </div>
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
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
