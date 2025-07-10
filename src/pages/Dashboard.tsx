import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, RotateCcw, Calendar, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { PageTitle } from '@/components/PageTitle';

// Função para calcular estatísticas
const calculateStatistics = (subjects: any[]) => {
  const stats = {
    subjects: {
      total: subjects.length,
      notStarted: 0,
      inProgress: 0,
      completed: 0
    },
    topics: {
      total: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0
    },
    reviews: {
      today: 0,
      overdue: 0,
      future: 0
    }
  };

  subjects.forEach(subject => {
    // Calcular status da matéria baseado nos tópicos
    const totalTopics = subject.topics.length;
    const completedTopics = subject.topics.filter((topic: any) => topic.reviewStage === 'Concluído').length;
    
    if (totalTopics === 0) {
      stats.subjects.notStarted++;
    } else if (completedTopics === totalTopics) {
      stats.subjects.completed++;
    } else {
      stats.subjects.inProgress++;
    }

    // Calcular estatísticas dos tópicos
    subject.topics.forEach((topic: any) => {
      stats.topics.total++;
      
      if (topic.reviewStage === 'Concluído') {
        stats.topics.completed++;
      } else if (topic.reviewCount > 0 || topic.reviewStage) {
        stats.topics.inProgress++;
      } else {
        stats.topics.notStarted++;
      }

      // Calcular revisões
      if (topic.nextReview) {
        const nextReviewDate = new Date(topic.nextReview);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        nextReviewDate.setHours(0, 0, 0, 0);

        if (nextReviewDate.getTime() === today.getTime()) {
          stats.reviews.today++;
        } else if (nextReviewDate < today) {
          stats.reviews.overdue++;
        } else {
          stats.reviews.future++;
        }
      }
    });
  });

  return stats;
};

// Função para obter revisões de hoje
const getReviewsForToday = (subjects: any[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const reviewsToday: any[] = [];
  
  subjects.forEach(subject => {
    subject.topics.forEach((topic: any) => {
      if (topic.nextReview) {
        const nextReviewDate = new Date(topic.nextReview);
        nextReviewDate.setHours(0, 0, 0, 0);
        
        if (nextReviewDate.getTime() === today.getTime()) {
          reviewsToday.push({
            ...topic,
            subjectName: subject.name,
            subjectId: subject.id
          });
        }
      }
    });
  });
  
  return reviewsToday;
};

// Função para verificar se uma revisão está atrasada
const isOverdue = (nextReview: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const reviewDate = new Date(nextReview);
  reviewDate.setHours(0, 0, 0, 0);
  return reviewDate < today;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { subjects, isLoading } = useApp();

  const stats = calculateStatistics(subjects);
  const reviewsToday = getReviewsForToday(subjects);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário';
  const greeting = `Olá, ${userName}!`;
  const currentDate = format(new Date(), "EEEE, d 'de' MMMM", { locale: pt });

  return (
    <div>
      <PageTitle title={greeting} subtitle={currentDate} />
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Matérias Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matérias</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Não iniciada: <span className="font-medium">{stats.subjects.notStarted}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Concluídas: <span className="font-medium">{stats.subjects.completed}</span> de {stats.subjects.total}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tópicos Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tópicos</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Target className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Não iniciado: <span className="font-medium">{stats.topics.notStarted}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Concluídos: <span className="font-medium">{stats.topics.completed}</span> de {stats.topics.total}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revisões Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revisões</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <RotateCcw className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Hoje: <span className="font-medium">{stats.reviews.today}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Atrasadas: <span className="font-medium text-red-600">{stats.reviews.overdue}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Futuras: <span className="font-medium">{stats.reviews.future}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revisões de Hoje */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Revisões de Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewsToday.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma revisão programada para hoje
              </p>
            ) : (
              <div className="space-y-2">
                {reviewsToday.slice(0, 5).map((topic) => (
                  <div key={topic.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{topic.name}</p>
                      <p className="text-xs text-muted-foreground">{topic.subjectName}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Revisão {topic.reviewCount + 1}
                    </div>
                  </div>
                ))}
                {reviewsToday.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{reviewsToday.length - 5} mais revisões
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendário de Revisões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Calendário em desenvolvimento</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
