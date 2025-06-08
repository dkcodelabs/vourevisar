import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from '@/contexts/AppContext';
import { BarChart, BookOpenCheck, BrainCircuit, CalendarClock, CheckCircle2, GraduationCap, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PageContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="container mx-auto p-6">
      {children}
    </div>
  );
};

const StatisticsSection = ({ studyProgress, isLoading }: { studyProgress: any, isLoading: boolean }) => {
  if (isLoading) {
    return <p>Carregando estatísticas...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estatísticas Gerais</CardTitle>
        <CardDescription>Visão geral do seu progresso</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Matérias Concluídas</p>
            <div className="text-2xl font-bold">{studyProgress.completedSubjects} / {studyProgress.totalSubjects}</div>
          </div>
          <div>
            <p className="text-sm font-medium">Tópicos Concluídos</p>
            <div className="text-2xl font-bold">{studyProgress.completedTopics} / {studyProgress.totalTopics}</div>
          </div>
          <div>
            <p className="text-sm font-medium">Tópicos Atrasados</p>
            <div className="text-2xl font-bold">{studyProgress.delayedTopics}</div>
          </div>
          <div>
            <p className="text-sm font-medium">Tópicos para Hoje</p>
            <div className="text-2xl font-bold">{studyProgress.todayTopics}</div>
          </div>
          <div>
            <p className="text-sm font-medium">Tópicos Futuros</p>
            <div className="text-2xl font-bold">{studyProgress.futureTopics}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProgressBySubjectSection = ({ subjects, isLoading }: { subjects: any[], isLoading: boolean }) => {
  if (isLoading) {
    return <p>Carregando progresso por matéria...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progresso por Matéria</CardTitle>
        <CardDescription>Seu progresso detalhado em cada matéria</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full">
          <div className="space-y-4">
            {subjects.map((subject) => (
              <div key={subject.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpenCheck className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{subject.name}</span>
                  </div>
                  <Badge variant="secondary">{subject.status}</Badge>
                </div>
                <Progress value={(subject.topics.filter((topic: { completed: any; }) => topic.completed).length / subject.topics.length) * 100} />
                <div className="text-sm text-gray-500">
                  {subject.topics.filter((topic: { completed: any; }) => topic.completed).length} / {subject.topics.length} Tópicos Concluídos
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const HighProgressSubjectsSection = ({ subjects, isLoading }: { subjects: any[], isLoading: boolean }) => {
  if (isLoading) {
    return <p>Carregando matérias com alto progresso...</p>;
  }

  const highProgressSubjects = subjects.filter((subject: { topics: any; }) =>
    subject.topics.length > 0 && (subject.topics.filter((topic: { completed: any; }) => topic.completed).length / subject.topics.length) > 0.75
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matérias com Alto Progresso</CardTitle>
        <CardDescription>Matérias que você está quase concluindo</CardDescription>
      </CardHeader>
      <CardContent>
        {highProgressSubjects.length > 0 ? (
          <ul className="list-disc pl-4">
            {highProgressSubjects.map((subject: { id: any; name: any; }) => (
              <li key={subject.id}>{subject.name}</li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma matéria com alto progresso no momento.</p>
        )}
      </CardContent>
    </Card>
  );
};

const FullyCompletedSubjectsSection = ({ subjects, isLoading }: { subjects: any[], isLoading: boolean }) => {
  if (isLoading) {
    return <p>Carregando matérias totalmente concluídas...</p>;
  }

  const completedSubjects = subjects.filter((subject: { status: string; }) => subject.status === 'Concluída');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matérias Totalmente Concluídas</CardTitle>
        <CardDescription>Parabéns pelas matérias que você já dominou!</CardDescription>
      </CardHeader>
      <CardContent>
        {completedSubjects.length > 0 ? (
          <ul className="list-disc pl-4">
            {completedSubjects.map((subject: { id: any; name: any; }) => (
              <li key={subject.id}>{subject.name}</li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma matéria totalmente concluída ainda.</p>
        )}
      </CardContent>
    </Card>
  );
};

const TipsSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dicas para Melhorar seus Estudos</CardTitle>
        <CardDescription>Sugestões para otimizar seu aprendizado</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc pl-4 space-y-2">
          <li>Revise os tópicos mais difíceis regularmente.</li>
          <li>Varie os métodos de estudo para manter o interesse.</li>
          <li>Estabeleça metas realistas e celebre suas conquistas.</li>
          <li>Use flashcards para memorização.</li>
          <li>Ensine o que você aprendeu para reforçar o conhecimento.</li>
        </ul>
      </CardContent>
    </Card>
  );
};

const RevisaoGeral = () => {
  const { subjects, studyProgress, isLoading } = useApp();
  const { user } = useAuth();

  // Query para buscar métricas de sessões de estudo
  const { data: studyMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['study-metrics', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      // Buscar sessões de estudo
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Buscar matérias concluídas
      const { data: completedSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name, status, completed_at, created_at')
        .eq('user_id', user.id)
        .eq('status', 'Concluída');

      if (subjectsError) throw subjectsError;

      // Buscar total de tópicos dominados
      const { data: dominatedTopics, error: topicsError } = await supabase
        .from('topics')
        .select('id, review_stage, subject_id')
        .eq('review_stage', 'Concluído');

      if (topicsError) throw topicsError;

      // Filtrar tópicos que pertencem ao usuário
      const userSubjectIds = subjects.map(s => s.id);
      const userDominatedTopics = dominatedTopics?.filter(topic => 
        userSubjectIds.includes(topic.subject_id)
      ) || [];

      // Calcular dias estudando consecutivos
      let consecutiveDays = 0;
      if (sessionsData && sessionsData.length > 0) {
        const today = new Date();
        const sortedSessions = sessionsData.sort((a, b) => 
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        );
        
        let currentDate = new Date(today);
        for (const session of sortedSessions) {
          const sessionDate = new Date(session.session_date);
          const diffDays = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 1) {
            consecutiveDays++;
            currentDate = sessionDate;
          } else {
            break;
          }
        }
      }

      // Calcular tempo total de estudo estimado
      const totalStudyTime = sessionsData?.reduce((sum, session) => 
        sum + (session.session_duration_minutes || 0), 0) || 0;

      return {
        totalSessions: sessionsData?.length || 0,
        totalStudyTime,
        completedSubjectsCount: completedSubjects?.length || 0,
        dominatedTopicsCount: userDominatedTopics.length,
        consecutiveDays,
        lastStudyDate: sessionsData?.[0]?.session_date || null,
        completedSubjects: completedSubjects || []
      };
    },
    enabled: !!user && subjects.length > 0
  });

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Revisão Geral dos Estudos</h1>
          <p className="text-gray-600">Acompanhe seu progresso e conquistas</p>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">Matérias Dominadas</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {studyMetrics?.completedSubjectsCount || 0}
              </div>
              <p className="text-sm text-gray-600">Matérias 100% concluídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">Tópicos Dominados</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {studyMetrics?.dominatedTopicsCount || 0}
              </div>
              <p className="text-sm text-gray-600">Tópicos totalmente dominados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">Dias Consecutivos</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {studyMetrics?.consecutiveDays || 0}
              </div>
              <p className="text-sm text-gray-600">Estudando sem parar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-center">Sessões de Estudo</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {studyMetrics?.totalSessions || 0}
              </div>
              <p className="text-sm text-gray-600">Sessões realizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Seções existentes */}
        <StatisticsSection 
          studyProgress={studyProgress}
          isLoading={isLoading}
        />

        <ProgressBySubjectSection 
          subjects={subjects}
          isLoading={isLoading}
        />

        <HighProgressSubjectsSection 
          subjects={subjects}
          isLoading={isLoading}
        />

        <FullyCompletedSubjectsSection 
          subjects={subjects}
          isLoading={isLoading}
        />

        <TipsSection />
      </div>
    </PageContainer>
  );
};

export default RevisaoGeral;
