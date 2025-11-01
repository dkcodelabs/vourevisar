import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Plus, Flame, Notebook } from 'lucide-react';
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
import { StreakVisualBar } from '@/components/dashboard/StreakVisualBar';
import { StreakCalendarModal } from '@/components/dashboard/StreakCalendarModal';
import { CompactSubjectAccordion } from '@/components/dashboard/CompactSubjectAccordion';
import GeneralNotesModal from '@/components/GeneralNotesModal';
import NotesModal from '@/components/reviews/NotesModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';

const Dashboard = () => {
  const { subjects, isDataLoaded, isLoading, error } = useApp();
  const { isLoading: cycleLoading } = useCycleState();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [isGeneralNotesModalOpen, setIsGeneralNotesModalOpen] = useState(false);
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
  const [shouldReopenGeneralNotes, setShouldReopenGeneralNotes] = useState(false);

  // Reabrir modal de anotações gerais quando necessário
  React.useEffect(() => {
    if (shouldReopenGeneralNotes) {
      setIsGeneralNotesModalOpen(true);
      setShouldReopenGeneralNotes(false);
    }
  }, [shouldReopenGeneralNotes]);

  // Buscar dados de revisões para o calendário
  const { data: reviewData } = useQuery({
    queryKey: ['dashboard-reviews', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          review_stage,
          next_review,
          subject_id
        `)
        .not('next_review', 'is', null);

      if (topicsError) throw topicsError;
      if (!topicsData || topicsData.length === 0) return [];

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;

      const userSubjectIds = (subjectsData || []).map(s => s.id);
      const filteredTopics = topicsData.filter(topic =>
        userSubjectIds.includes(topic.subject_id)
      );

      return filteredTopics.map(topic => {
        const subject = subjectsData?.find(s => s.id === topic.subject_id);
        return {
          id: topic.id,
          name: topic.name,
          subject_name: subject?.name || 'Sem disciplina',
          review_stage: topic.review_stage,
          next_review: topic.next_review,
        };
      });
    },
    enabled: !!user
  });

  // Estados de loading e erro simplificados
  if (isLoading || cycleLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-300" />
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

  // Calcular streak simples
  const currentStreak = 2; // Valor fixo por enquanto

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Header com saudação e streak */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                Olá, {user?.user_metadata?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário'}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Aqui está um resumo dos seus estudos
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentStreak > 0
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600'
                }`}>
                <Flame className="h-4 w-4" />
                <span className="font-medium">
                  Streak: {currentStreak} dias
                </span>
              </div>
              <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Progresso: {progressPercentage}%</span>
              </div>
              <Button
                onClick={() => setIsGeneralNotesModalOpen(true)}
                variant="outline"
                className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 transition-colors border-green-300"
              >
                <Notebook className="h-4 w-4" />
                <span className="font-medium">Anotações</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Se não há matérias, mostrar estado vazio */}
        {subjects.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 shadow-sm border text-center">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-bold text-card-foreground mb-3">Bem-vindo ao Sistema de Estudos!</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Comece adicionando suas primeiras matérias para organizar seus estudos e acompanhar seu progresso.
            </p>
            <Button
              onClick={() => navigate('/materias')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold"
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

            <StreakVisualBar
              subjects={subjects}
              onDayClick={(date) => setSelectedCalendarDate(date)}
            />

            <CalendarAndStats subjects={subjects} reviewData={reviewData} />

            <CompactSubjectAccordion subjects={subjects} />
          </div>
        )}

        {/* Modals */}
        <StreakCalendarModal
          isOpen={!!selectedCalendarDate}
          onClose={() => setSelectedCalendarDate(null)}
          subjects={subjects}
          selectedDate={selectedCalendarDate || undefined}
        />

        <GeneralNotesModal
          isOpen={isGeneralNotesModalOpen}
          onClose={() => setIsGeneralNotesModalOpen(false)}
          onOpenTopicNotes={(topicId, topicName, subjectName) => {
            setTopicNotesModal({
              isOpen: true,
              topicId,
              topicName,
              subjectName
            });
          }}
          onOpenSubjectNotes={(subjectId, subjectName) => {
            setSubjectNotesModal({
              isOpen: true,
              subjectId,
              subjectName
            });
          }}

        />

        <NotesModal
          isOpen={topicNotesModal.isOpen}
          onClose={() => setTopicNotesModal({ isOpen: false, topicId: '', topicName: '', subjectName: '' })}
          topicId={topicNotesModal.topicId}
          topicName={topicNotesModal.topicName}
          subjectName={topicNotesModal.subjectName}
        />

        <SubjectNotesModal
          isOpen={subjectNotesModal.isOpen}
          onClose={() => setSubjectNotesModal({ isOpen: false, subjectId: '', subjectName: '' })}
          subjectId={subjectNotesModal.subjectId}
          subjectName={subjectNotesModal.subjectName}
        />
      </div>
    </div>
  );
};

export default Dashboard;