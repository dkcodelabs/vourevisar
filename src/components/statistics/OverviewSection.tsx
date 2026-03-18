import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Target,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface OverviewSectionProps {
  data: {
    totalSubjects: number;
    completedSubjects: number;
    inProgressSubjects: number;
    notStartedSubjects: number;
    totalTopics: number;
    completedTopics: number;
    inProgressTopics: number;
    notStartedTopics: number;
    totalReviews: number;
    completedReviews: number;
    pendingReviews: number;
    delayedReviews: number;
    overallProgress: number;
    totalStudyTime: number;
    averageDailyTime: number;
  };
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ data }) => {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const cards = [
    {
      title: 'Progresso Geral',
      value: `${data.overallProgress}%`,
      subtitle: `${data.completedTopics} de ${data.totalTopics} tópicos`,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      progress: data.overallProgress,
    },
    {
      title: 'Matérias',
      value: data.totalSubjects.toString(),
      subtitle: `${data.completedSubjects} concluídas`,
      icon: BookOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      progress: data.totalSubjects > 0 ? (data.completedSubjects / data.totalSubjects) * 100 : 0,
    },
    {
      title: 'Revisões Pendentes',
      value: data.pendingReviews.toString(),
      subtitle: `${data.delayedReviews} atrasadas`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      progress: data.totalReviews > 0 ? (data.completedReviews / data.totalReviews) * 100 : 0,
    },
    {
      title: 'Tempo Total',
      value: formatTime(data.totalStudyTime),
      subtitle: `Média: ${formatTime(data.averageDailyTime)}/dia`,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      progress: Math.min((data.averageDailyTime / 120) * 100, 100), // Meta de 2h/dia
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Visão Geral do Progresso</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-content-muted">{card.title}</p>
                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                    <p className="text-sm text-content-muted">{card.subtitle}</p>
                  </div>
                  <div className={`p-3 rounded-full ${card.bgColor} md:light:${card.bgColor} md:dark:bg-white/5`}>
                    <card.icon className={`h-6 w-6 ${card.color} md:dark:text-white`} />
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-content-muted">Progresso</span>
                    <span className="font-medium text-foreground">{Math.round(card.progress)}%</span>
                  </div>
                  <Progress value={card.progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Estatísticas detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Tópicos por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-content-muted">Concluídos</span>
              <span className="font-semibold text-emerald-600">{data.completedTopics}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-content-muted">Em andamento</span>
              <span className="font-semibold text-primary">{data.inProgressTopics}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-content-muted">Não iniciados</span>
              <span className="font-semibold text-content-muted">{data.notStartedTopics}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Matérias por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Concluídas</span>
              <span className="font-semibold text-green-600">{data.completedSubjects}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Em estudo</span>
              <span className="font-semibold text-blue-600">{data.inProgressSubjects}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Novas</span>
              <span className="font-semibold text-gray-600">{data.notStartedSubjects}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Status das Revisões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Concluídas</span>
              <span className="font-semibold text-green-600">{data.completedReviews}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pendentes</span>
              <span className="font-semibold text-blue-600">{data.pendingReviews}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Atrasadas</span>
              <span className="font-semibold text-red-600">{data.delayedReviews}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};