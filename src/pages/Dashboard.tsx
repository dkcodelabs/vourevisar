import React, { useState } from 'react';
import { toast } from '@/lib/toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Plus, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { useNavigate } from 'react-router-dom';
import { startOfDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CompactOverview } from '@/components/dashboard/CompactOverview';
import { SubjectOverview } from '@/components/dashboard/SubjectOverview';
import { CalendarAndStats } from '@/components/dashboard/CalendarAndStats';
import { StreakCalendarModal } from '@/components/dashboard/StreakCalendarModal';
import { CompactSubjectAccordion } from '@/components/dashboard/CompactSubjectAccordion';
import NotesModal from '@/components/reviews/NotesModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';

const Dashboard = () => {
  const { subjects, isDataLoaded, isLoading, error } = useApp();
  const { isLoading: cycleLoading } = useCycleState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [topicNotesModal, setTopicNotesModal] = useState({
    isOpen: false,
    topicId: '',
    topicName: '',
    subjectName: ''
  });
  const [subjectNotesModal, setSubjectNotesModal] = useState({
    isOpen: false,
    subjectId: '',
    subjectName: ''
  });

  // ... (useQuery and loading checks remain same)

  // Buscar histórico de revisões para estatísticas
  const { data: reviewData } = useQuery({
    queryKey: ['dashboard-review-history', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Buscar matérias do usuário
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;
      if (!subjectsData || subjectsData.length === 0) return [];

      const userSubjectIds = subjectsData.map(s => s.id);

      // Buscar histórico de revisões dos tópicos do usuário
      // Nota: topic_review_history não está nos tipos gerados - usando query raw
      // @ts-ignore - tabela existe mas não está nos tipos gerados
      const response = await (supabase as any)
        .from('topic_review_history')
        .select(`
          id,
          topic_id,
          review_stage,
          reviewed_at,
          topics!inner (
            id,
            name,
            subject_id
          )
        `)
        .in('topics.subject_id', userSubjectIds)
        .order('reviewed_at', { ascending: false });

      const historyData = response.data as any[] | null;
      const historyError = response.error;

      if (historyError) throw historyError;
      if (!historyData) return [];

      return historyData.map((review: any) => ({
        id: review.id,
        topic_id: review.topic_id,
        review_stage: review.review_stage,
        reviewed_at: review.reviewed_at,
        topic_name: review.topics?.name,
        subject_id: review.topics?.subject_id
      }));
    },
    enabled: !!user
  });

  // Estados de loading e erro simplificados
  if (isLoading || cycleLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f6f8]">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao carregar dados</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calcular dados básicos
  const today = startOfDay(new Date());
  const overdueCount = subjects.reduce((count, subject) => {
    return count + subject.topics.filter(topic => {
      if (!topic.nextReview) return false;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      return reviewDate < today;
    }).length;
  }, 0);

  const todayCount = subjects.reduce((count, subject) => {
    return count + subject.topics.filter(topic => {
      if (!topic.nextReview) return false;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      return reviewDate.getTime() === today.getTime();
    }).length;
  }, 0);

  const futureCount = subjects.reduce((count, subject) => {
    return count + subject.topics.filter(topic => {
      if (!topic.nextReview) return false;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return reviewDate > today && reviewDate <= nextWeek;
    }).length;
  }, 0);

  const totalTopics = subjects.reduce((total, subject) => total + subject.topics.length, 0);
  const completedTopics = subjects.reduce((total, subject) =>
    total + subject.topics.filter(topic => topic.reviewStage === 'Concluído').length, 0
  );
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header com saudação */}
      {/* Header com saudação */}
      <header className="mt-[15px] px-4 md:px-8 pt-6 pb-6 mb-6 bg-white rounded-2xl border border-gray-200 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-3">
              Olá, {user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'}! 👋
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Aqui está um resumo dos seus estudos
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium">Progresso: {progressPercentage}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Se não há matérias, mostrar estado vazio */}
      {subjects.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 shadow-sm border text-center">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h2 className="text-2xl font-bold text-card-foreground mb-3">Bem-vindo ao Sistema de Estudos!</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Comece adicionando suas primeiras matérias para organizar seus estudos e acompanhar seu progresso.
          </p>
          <Button
            onClick={() => navigate('/foco')}
            className="w-full sm:w-auto sm:min-w-[200px] mx-auto block bg-purple-500 hover:bg-purple-600 text-white font-semibold"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Primeira Matéria
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <CompactOverview
            subjects={subjects}
            overdueCount={overdueCount}
            todayCount={todayCount}
            futureCount={futureCount}
          />

          <CalendarAndStats
            subjects={subjects}
            reviewData={reviewData}
            onDayClick={(date) => setSelectedCalendarDate(date)}
          />

          <CompactSubjectAccordion subjects={subjects} />
        </div>
      )}

      {/* Modals */}
      <StreakCalendarModal
        isOpen={!!selectedCalendarDate}
        onClose={() => setSelectedCalendarDate(null)}
        subjects={subjects}
        selectedDate={selectedCalendarDate || undefined}
        reviewData={reviewData || []}
      />

      <SubjectNotesModal
        isOpen={subjectNotesModal.isOpen}
        onClose={() => setSubjectNotesModal({ isOpen: false, subjectId: '', subjectName: '' })}
        subjectId={subjectNotesModal.subjectId}
        subjectName={subjectNotesModal.subjectName}
      />
    </div>
  );
};

export default Dashboard;