
import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, BookOpen, Star, Trophy } from 'lucide-react';

interface StatisticsSectionProps {
  totalSubjectsWithAllTopicsCompleted: number;
  totalSubjects: number;
  completionPercentage: number;
  totalCompletedTopics: number;
  totalTopics: number;
  topicsCompletionPercentage: number;
  totalFullyCompletedTopics: number;
  topicsDominationPercentage: number;
  fullyCompletedSubjectsCount: number;
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

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({
  totalSubjectsWithAllTopicsCompleted,
  totalSubjects,
  completionPercentage,
  totalCompletedTopics,
  totalTopics,
  topicsCompletionPercentage,
  totalFullyCompletedTopics,
  topicsDominationPercentage,
  fullyCompletedSubjectsCount
}) => {
  return (
    <motion.div variants={itemVariants}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matérias Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalSubjectsWithAllTopicsCompleted}</div>
            <p className="text-xs text-muted-foreground">
              de {totalSubjects} matérias ({completionPercentage}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tópicos Concluídos</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalCompletedTopics}</div>
            <p className="text-xs text-muted-foreground">
              de {totalTopics} tópicos ({topicsCompletionPercentage}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tópicos Dominados</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalFullyCompletedTopics}</div>
            <p className="text-xs text-muted-foreground">
              de {totalTopics} tópicos ({topicsDominationPercentage}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matérias 100% Dominadas</CardTitle>
            <Trophy className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{fullyCompletedSubjectsCount}</div>
            <p className="text-xs text-muted-foreground">
              completamente finalizadas
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};
