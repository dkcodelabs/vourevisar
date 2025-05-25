import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { useCycleState } from '@/hooks/useCycleState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Calendar,
  Sparkle,
  GraduationCap
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { isToday, isBefore, format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const { subjects, studyProgress, fetchSubjects } = useApp();
  const { userCycle, isLoading: isCycleLoading } = useCycleState();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados ao montar o componente
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        if (subjects.length === 0) {
          await fetchSubjects();
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, fetchSubjects, subjects.length]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

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

  const getSubjectProgress = () => {
    const totalSubjects = subjects.length;
    const completedSubjects = subjects.filter(subject => 
      subject.topics.length > 0 && 
      subject.topics.every(topic => 
        topic.completed && (!topic.nextReview || topic.reviewStage === 'Concluído')
      )
    ).length;
    
    return { completed: completedSubjects, total: totalSubjects };
  };

  const getTodayTopics = () => {
    let todayCount = 0;
    let delayedCount = 0;
    
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        if (topic.nextReview) {
          const reviewDate = new Date(topic.nextReview);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (isToday(reviewDate)) {
            todayCount++;
          } else if (isBefore(reviewDate, today)) {
            delayedCount++;
          }
        }
      });
    });
    
    return { today: todayCount, delayed: delayedCount };
  };

  const subjectProgress = getSubjectProgress();
  const todayTopics = getTodayTopics();
  const cycleCount = userCycle?.ciclos_realizados || 0;

  if (isLoading || isCycleLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Olá, {user?.user_metadata?.name || 'Estudante'}! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Aqui está um resumo do seu progresso de estudos.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/plano-estudos')} 
            className="bg-gradient-to-r from-app-blue to-blue-600 hover:from-blue-600 hover:to-app-blue text-white transition-all duration-300 mt-4 md:mt-0"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Ir para Plano de Estudos
          </Button>
        </div>
      </motion.div>

      {/* Cards de estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Matérias</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {subjectProgress.completed}/{subjectProgress.total}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen size={24} className="text-app-blue" weight="duotone" />
                </div>
              </div>
              <div className="mt-4">
                <Progress 
                  value={subjectProgress.total > 0 ? (subjectProgress.completed / subjectProgress.total) * 100 : 0} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ciclos Completos</p>
                  <p className="text-2xl font-bold text-gray-900">{cycleCount}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Sparkle size={24} className="text-yellow-600" weight="fill" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revisões Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">{todayTopics.today}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Calendar size={24} className="text-green-600" weight="duotone" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Atrasadas</p>
                  <p className="text-2xl font-bold text-red-600">{todayTopics.delayed}</p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <Clock size={24} className="text-red-600" weight="duotone" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Cards informativos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap size={20} className="text-app-blue" weight="duotone" />
                Resumo Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total de Tópicos</span>
                  <span className="font-semibold">{studyProgress.totalTopics}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tópicos Concluídos</span>
                  <span className="font-semibold text-green-600">{studyProgress.completedTopics}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Para o Futuro</span>
                  <span className="font-semibold text-blue-600">{studyProgress.futureTopics}</span>
                </div>
                <Progress 
                  value={studyProgress.totalTopics > 0 ? (studyProgress.completedTopics / studyProgress.totalTopics) * 100 : 0} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" weight="duotone" />
                Matérias Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {subjects.filter(s => s.status === 'Em Estudo' || s.status === 'Nova').length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhuma matéria ativa encontrada.</p>
                ) : (
                  subjects
                    .filter(s => s.status === 'Em Estudo' || s.status === 'Nova')
                    .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                    .slice(0, 5)
                    .map((subject) => (
                      <div key={subject.id} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-app-blue" weight="duotone" />
                          <span className="text-sm font-medium">{subject.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {subject.topics.length} tópicos
                          </Badge>
                          <Badge 
                            variant={subject.status === 'Em Estudo' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {subject.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
