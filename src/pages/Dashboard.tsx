import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutList, 
  CalendarDays, 
  Calendar, 
  Plus, 
  Book, 
  Settings, 
  TrendingUp, 
  ClipboardCheck, 
  ListChecks,
  Sparkle,
  GraduationCap,
  Clock
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import PageContainer from '@/components/layout/PageContainer';
import { GlassCard, GradientButton, AnimatedTitle } from '@/components/ui';
import { Progress } from '@/components/ui/progress';

export const Dashboard = () => {
  const { studyProgress, subjects } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showRevisionsDialog, setShowRevisionsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [todaysReviews, setTodaysReviews] = useState<any[]>([]);
  const [revisionsByDate, setRevisionsByDate] = useState<Record<number, any[]>>({});
  const [ciclosRealizados, setCiclosRealizados] = useState(0);

  console.log('Dashboard - Study Progress:', studyProgress);
  console.log('Dashboard - Subjects loaded:', subjects.length);

  // Aguardar que os dados do AppContext estejam carregados
  useEffect(() => {
    if (user && subjects.length >= 0) { // >= 0 porque pode ser que não tenha matérias mesmo
      console.log('Dashboard - Loading dashboard-specific data...');
      loadDashboardData();
    }
  }, [user, subjects]);

  // Buscar ciclos realizados do banco de dados
  const fetchCiclosRealizados = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_cycles')
        .select('ciclos_realizados')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user cycles:', error);
        return;
      }

      const ciclos = data?.ciclos_realizados || 0;
      setCiclosRealizados(ciclos);
      console.log('Ciclos realizados from DB:', ciclos);
    } catch (error) {
      console.error('Error fetching cycles:', error);
    }
  };

  // Função para buscar revisões de hoje
  const fetchTodaysReviews = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id);

      if (!subjects) return;

      const subjectIds = subjects.map(s => s.id);

      const { data: topics, error } = await supabase
        .from('topics')
        .select('id, name, next_review, review_stage, subject_id')
        .in('subject_id', subjectIds)
        .gte('next_review', today.toISOString())
        .lt('next_review', tomorrow.toISOString());

      if (error) {
        console.error('Error fetching today\'s reviews:', error);
        return;
      }

      const reviewsWithSubjects = topics?.map(topic => {
        const subject = subjects.find(s => s.id === topic.subject_id);
        return {
          id: topic.id,
          topic: topic.name,
          subject: subject?.name || 'Unknown',
          type: topic.review_stage || 'Primeira Revisão'
        };
      }) || [];

      setTodaysReviews(reviewsWithSubjects);
    } catch (error) {
      console.error('Error fetching today\'s reviews:', error);
    }
  };

  // Função para buscar revisões para o calendário
  const fetchRevisionsForCalendar = async () => {
    if (!user) return;

    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id);

      if (!subjects) return;

      const subjectIds = subjects.map(s => s.id);

      const { data: topics, error } = await supabase
        .from('topics')
        .select('id, name, next_review, review_stage, subject_id')
        .in('subject_id', subjectIds)
        .gte('next_review', startOfMonth.toISOString())
        .lte('next_review', endOfMonth.toISOString());

      if (error) {
        console.error('Error fetching calendar revisions:', error);
        return;
      }

      const revisionsByDateMap: Record<number, any[]> = {};
      
      topics?.forEach(topic => {
        if (topic.next_review) {
          const reviewDate = new Date(topic.next_review);
          const day = reviewDate.getDate();
          const subject = subjects.find(s => s.id === topic.subject_id);
          
          if (!revisionsByDateMap[day]) {
            revisionsByDateMap[day] = [];
          }
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          reviewDate.setHours(0, 0, 0, 0);
          
          let status = 'Futura';
          if (reviewDate < today) {
            status = 'Atrasado';
          } else if (reviewDate.getTime() === today.getTime()) {
            status = 'Hoje';
          }
          
          revisionsByDateMap[day].push({
            id: topic.id,
            topic: topic.name,
            subject: subject?.name || 'Unknown',
            status
          });
        }
      });

      setRevisionsByDate(revisionsByDateMap);
    } catch (error) {
      console.error('Error fetching calendar revisions:', error);
    }
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('Dashboard - Loading specific data (reviews, cycles)...');
      
      // Buscar apenas dados específicos da Dashboard, não matérias (isso é do AppContext)
      await Promise.all([
        fetchTodaysReviews(),
        fetchRevisionsForCalendar(),
        fetchCiclosRealizados()
      ]);

      console.log('Dashboard - Specific data loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Listener para eventos de revisão concluída - recarrega os dados
  useEffect(() => {
    const handleTopicReviewed = () => {
      console.log('Topic reviewed event received, reloading dashboard data...');
      fetchTodaysReviews();
      fetchRevisionsForCalendar();
      fetchCiclosRealizados();
    };

    window.addEventListener('topicReviewed', handleTopicReviewed);
    
    return () => {
      window.removeEventListener('topicReviewed', handleTopicReviewed);
    };
  }, []);
  
  // Format progress as percentage with safety checks to prevent NaN
  const progressPercentage = studyProgress.totalSubjects > 0 
    ? Math.round((studyProgress.completedSubjects / studyProgress.totalSubjects) * 100) 
    : 0;
    
  const topicsPercentage = studyProgress.totalTopics > 0 
    ? Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100) 
    : 0;

  // Progresso do ciclo atual: matérias concluídas / total de matérias
  const progressoCiclo = studyProgress.totalSubjects > 0 
    ? Math.round((studyProgress.completedSubjects / studyProgress.totalSubjects) * 100) 
    : 0;

  const handleDateClick = (day: number) => {
    // Only allow clicking days that have revisions
    if (revisionsByDate[day] && revisionsByDate[day].length > 0) {
      setSelectedDate(day);
      setShowRevisionsDialog(true);
    }
  };

  const currentDay = new Date().getDate();

  // Mostrar loading se ainda estamos carregando dados específicos da Dashboard
  // ou se os dados básicos do AppContext ainda não foram carregados
  if (isLoading || (user && studyProgress.totalSubjects === 0 && subjects.length === 0)) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-app-blue border-t-transparent rounded-full"
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <AnimatedTitle icon={<Sparkle size={32} />}>
            Dashboard
          </AnimatedTitle>
          <GradientButton
            onClick={() => navigate('/plano-estudos')}
            icon={<LayoutList size={20} />}
          >
            Iniciar Estudos do Dia
          </GradientButton>
        </div>
        
        <p className="text-gray-600 text-lg">Bem-vindo(a) de volta! Aqui está seu progresso.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Book className="h-5 w-5 text-app-blue" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-700 leading-tight break-words whitespace-normal">Matérias Cadastradas</h3>
                <p className="text-xs text-gray-500">Progresso geral</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold bg-gradient-to-r from-app-blue to-blue-600 bg-clip-text text-transparent">
                  {studyProgress.completedSubjects}/{studyProgress.totalSubjects}
                </span>
                <span className="text-xs text-gray-500">matérias</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
              <p className="text-xs text-gray-600">
                Você já concluiu {studyProgress.completedSubjects} de {studyProgress.totalSubjects} matérias cadastradas.
              </p>
            </div>
          </GlassCard>
          
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <LayoutList className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-700 leading-tight break-words whitespace-normal">Tópicos Cadastrados</h3>
                <p className="text-xs text-gray-500">Progresso geral</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {studyProgress.completedTopics}/{studyProgress.totalTopics}
                </span>
                <span className="text-xs text-gray-500">tópicos</span>
              </div>
              <Progress value={topicsPercentage} className="h-1.5" />
              <p className="text-xs text-gray-600">
                Você já concluiu {studyProgress.completedTopics} de {studyProgress.totalTopics} tópicos cadastrados.
              </p>
            </div>
          </GlassCard>
          
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-700 leading-tight break-words whitespace-normal">Progresso Geral</h3>
                <p className="text-xs text-gray-500">Ciclo atual</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {topicsPercentage}%
                </span>
                <span className="text-xs text-gray-500">concluído</span>
              </div>
              <Progress value={topicsPercentage} className="h-1.5" />
              <p className="text-xs text-gray-600">
                Você completou {ciclosRealizados} ciclos de estudo até agora.
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ListChecks className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-700 leading-tight break-words whitespace-normal">Ciclos Realizados</h3>
                <p className="text-xs text-gray-500">Progresso do ciclo atual</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  {ciclosRealizados}
                </span>
                <span className="text-xs text-gray-500">ciclos</span>
              </div>
              <Progress value={progressoCiclo} className="h-1.5" />
              <p className="text-xs text-gray-600">
                Progresso do ciclo atual: <span className="font-semibold text-emerald-700">{progressoCiclo}%</span>
              </p>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <GlassCard className="p-4 min-h-[180px]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700">Revisões para Hoje</h3>
                <p className="text-xs text-gray-500">Tópicos agendados</p>
              </div>
            </div>
            <div className="space-y-2">
              {todaysReviews.length > 0 ? (
                <div className="space-y-2">
                  {todaysReviews.map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-2 bg-white/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{review.topic}</p>
                        <p className="text-xs text-gray-500">{review.subject}</p>
                      </div>
                      <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        {review.type}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4 text-sm">
                  Nenhuma revisão agendada para hoje.
                </p>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-4 min-h-[180px]">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-700">Calendário de Revisões</h3>
                <p className="text-xs text-gray-500">Próximas revisões</p>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const hasRevisions = revisionsByDate[day]?.length > 0;
                const isCurrentDay = day === currentDay;
                return (
                  <motion.button
                    key={day}
                    whileHover={{ scale: hasRevisions ? 1.07 : 1 }}
                    whileTap={{ scale: hasRevisions ? 0.97 : 1 }}
                    onClick={() => handleDateClick(day)}
                    className={`
                      aspect-square w-7 h-7 rounded-md text-xs font-medium
                      ${hasRevisions ? 'bg-indigo-100 text-indigo-700 cursor-pointer' : 'bg-gray-50 text-gray-400'}
                      ${isCurrentDay ? 'ring-2 ring-indigo-500' : ''}
                      transition-all duration-200
                    `}
                  >
                    {day}
                  </motion.button>
                );
              })}
            </div>
          </GlassCard>
        </div>
      </div>

      <Dialog open={showRevisionsDialog} onOpenChange={setShowRevisionsDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Revisões para {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDate && revisionsByDate[selectedDate]?.map((revision) => (
              <div key={revision.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-700">{revision.topic}</p>
                  <p className="text-sm text-gray-500">{revision.subject}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  revision.status === 'Hoje' ? 'bg-orange-100 text-orange-800' :
                  revision.status === 'Atrasado' ? 'bg-red-100 text-red-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {revision.status}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default Dashboard;
