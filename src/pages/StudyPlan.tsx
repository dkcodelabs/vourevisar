
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, Trophy, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GlassCard, AnimatedTitle, GradientButton } from '@/components/ui';
import { useCycleState } from '@/hooks/useCycleState';

interface SubjectInfo {
  id: string;
  name: string;
  topics: TopicInfo[];
}

interface TopicInfo {
  id: string;
  name: string;
  completed: boolean;
  reviewStage: string | null;
  nextReview: Date | null;
}

interface StudySession {
  subject: SubjectInfo;
  topic: TopicInfo;
  completed: boolean;
}

const StudyPlan = () => {
  const { user } = useAuth();
  const { cycleState, loadCycleData, updateCycleState } = useCycleState();
  const [dailySubjects, setDailySubjects] = useState<SubjectInfo[]>([]);
  const [nextSubjects, setNextSubjects] = useState<SubjectInfo[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailySubjectsCompleted, setDailySubjectsCompleted] = useState(false);
  const [congratulationsShown, setCongratulationsShown] = useState(false);

  const loadStudyPlan = async (loadNext = false) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Buscar configurações do usuário
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('subjects_per_day')
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Erro ao buscar configurações:', settingsError);
        return;
      }

      const subjectsPerDay = userSettings?.subjects_per_day || 3;

      // Buscar matérias do usuário que existem no banco
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          topics (
            id,
            name,
            completed,
            review_stage,
            next_review
          )
        `)
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

      if (subjectsError) {
        console.error('Erro ao buscar matérias:', subjectsError);
        return;
      }

      const validSubjects = (subjectsData || []).filter(subject => subject.topics && subject.topics.length > 0);

      if (validSubjects.length === 0) {
        setDailySubjects([]);
        setNextSubjects([]);
        setStudySessions([]);
        setCongratulationsShown(false);
        setDailySubjectsCompleted(false);
        setIsLoading(false);
        return;
      }

      // Buscar dados do ciclo atual
      const { data: cycleData, error: cycleError } = await supabase
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (cycleError && cycleError.code !== 'PGRST116') {
        console.error('Erro ao buscar ciclo:', cycleError);
      }

      let dailySubjectsFromDb = cycleData?.disciplinas_do_dia || [];
      
      // Se for para carregar próximas matérias ou não há matérias do dia
      if (loadNext || dailySubjectsFromDb.length === 0) {
        // Selecionar as próximas matérias baseado na prioridade
        const selectedSubjects = validSubjects.slice(0, Math.min(subjectsPerDay, validSubjects.length));
        const selectedSubjectIds = selectedSubjects.map(s => s.id);
        
        // Atualizar no banco de dados
        await supabase
          .from('user_cycles')
          .upsert({
            user_id: user.id,
            disciplinas_do_dia: selectedSubjectIds,
            data_inicio_ciclo: cycleData?.data_inicio_ciclo || new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          });

        dailySubjectsFromDb = selectedSubjectIds;
        setCongratulationsShown(false);
        setDailySubjectsCompleted(false);
      }

      // Filtrar matérias que ainda existem no banco
      const existingDailySubjects = validSubjects.filter(subject => 
        dailySubjectsFromDb.includes(subject.id)
      );

      // Verificar se todas as matérias do dia foram completadas
      const allCompleted = existingDailySubjects.length > 0 && 
        existingDailySubjects.every(subject => 
          subject.topics.every(topic => topic.completed)
        );

      setDailySubjects(existingDailySubjects);
      setDailySubjectsCompleted(allCompleted);
      
      // Se todas foram completadas e ainda não mostrou parabéns
      if (allCompleted && !congratulationsShown) {
        setCongratulationsShown(true);
      }

      // Sempre mostrar próximas matérias
      const remainingSubjects = validSubjects.filter(subject => 
        !dailySubjectsFromDb.includes(subject.id)
      ).slice(0, 3);
      
      setNextSubjects(remainingSubjects);

      // Criar sessões de estudo
      const sessions: StudySession[] = [];
      existingDailySubjects.forEach(subject => {
        subject.topics.forEach(topic => {
          sessions.push({
            subject,
            topic: {
              id: topic.id,
              name: topic.name,
              completed: topic.completed,
              reviewStage: topic.review_stage,
              nextReview: topic.next_review ? new Date(topic.next_review) : null
            },
            completed: topic.completed
          });
        });
      });

      setStudySessions(sessions);
      await loadCycleData();

    } catch (error) {
      console.error('Erro ao carregar plano de estudo:', error);
      toast.error('Erro ao carregar plano de estudo');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextDay = async () => {
    await loadStudyPlan(true);
    setCongratulationsShown(false);
    setDailySubjectsCompleted(false);
  };

  const completeStudySession = async (topicId: string) => {
    try {
      const now = new Date();
      const nextReview = addDays(now, 1); // Próxima revisão em 24h

      const { error } = await supabase
        .from('topics')
        .update({
          completed: true,
          review_stage: '24h',
          next_review: nextReview.toISOString(),
          last_reviewed_at: now.toISOString(),
          review_count: 1,
          updated_at: now.toISOString()
        })
        .eq('id', topicId);

      if (error) throw error;

      // Atualizar estado local
      setStudySessions(prev => prev.map(session => 
        session.topic.id === topicId 
          ? { ...session, completed: true, topic: { ...session.topic, completed: true } }
          : session
      ));

      // Verificar se todas as sessões foram completadas
      const updatedSessions = studySessions.map(session => 
        session.topic.id === topicId 
          ? { ...session, completed: true }
          : session
      );

      const allSessionsCompleted = updatedSessions.every(session => session.completed);
      
      if (allSessionsCompleted) {
        setDailySubjectsCompleted(true);
        setCongratulationsShown(true);
        
        // Atualizar contador de matérias concluídas do ciclo
        const newCompletedCount = cycleState.completedSubjects + 1;
        await updateCycleState(newCompletedCount);
      }

      toast.success('Sessão de estudo concluída!');
    } catch (error) {
      console.error('Erro ao completar sessão:', error);
      toast.error('Erro ao completar sessão de estudo');
    }
  };

  useEffect(() => {
    loadStudyPlan();
  }, [user]);

  const getProgressPercentage = () => {
    if (studySessions.length === 0) return 0;
    const completedSessions = studySessions.filter(session => session.completed).length;
    return (completedSessions / studySessions.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AnimatedTitle>Plano de Estudo Diário</AnimatedTitle>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* Informações do Ciclo */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <h3 className="font-medium">Progresso do Ciclo</h3>
          </div>
          <div className="text-sm text-gray-600">
            Ciclos Concluídos: {cycleState.completedCycles}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span>Disciplinas concluídas: {cycleState.completedSubjects}/{cycleState.totalSubjects}</span>
          <span>{cycleState.totalSubjects > 0 ? Math.round((cycleState.completedSubjects / cycleState.totalSubjects) * 100) : 0}%</span>
        </div>
        
        <Progress 
          value={cycleState.totalSubjects > 0 ? (cycleState.completedSubjects / cycleState.totalSubjects) * 100 : 0} 
          className="mt-2"
        />

        {cycleState.isNewCycle && cycleState.completedSubjects === 1 && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">🎉 Novo ciclo iniciado!</p>
          </div>
        )}
      </GlassCard>

      {/* Progresso do Dia */}
      {dailySubjects.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium">Progresso de Hoje</h3>
            </div>
            <span className="text-sm text-gray-600">
              {studySessions.filter(s => s.completed).length}/{studySessions.length} concluídas
            </span>
          </div>
          
          <Progress value={getProgressPercentage()} className="mb-4" />
          
          {congratulationsShown && dailySubjectsCompleted ? (
            <div className="text-center py-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">Parabéns! 🎉</h3>
              <p className="text-green-700 mb-4">Você concluiu todas as matérias do dia!</p>
              <GradientButton onClick={loadNextDay}>
                Carregar próximas matérias
              </GradientButton>
            </div>
          ) : (
            <div className="space-y-3">
              {studySessions.map((session) => (
                <div key={session.topic.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-white/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm">{session.subject.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 ml-6">{session.topic.name}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {session.completed ? (
                      <span className="text-sm text-green-600 font-medium">✓ Concluído</span>
                    ) : (
                      <GradientButton
                        size="sm"
                        onClick={() => completeStudySession(session.topic.id)}
                      >
                        Concluir Sessão
                      </GradientButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Próximas Matérias */}
      {nextSubjects.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ChevronRight className="h-5 w-5 text-gray-500" />
            <h3 className="font-medium">Próximas Matérias</h3>
          </div>
          
          <div className="space-y-2">
            {nextSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center justify-between p-3 bg-white/30 rounded-lg border border-white/20">
                <div>
                  <span className="font-medium text-sm">{subject.name}</span>
                  <p className="text-xs text-gray-600">{subject.topics.length} tópicos</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {dailySubjects.length === 0 && nextSubjects.length === 0 && (
        <GlassCard className="text-center py-10">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Você ainda não tem matérias cadastradas com tópicos.</p>
          <p className="text-sm text-gray-400">Adicione matérias e tópicos para começar a estudar!</p>
        </GlassCard>
      )}
    </div>
  );
};

export default StudyPlan;
