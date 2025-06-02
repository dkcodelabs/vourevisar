
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RotateCcw, Calendar, Trophy, BookOpen, Target, Star } from 'lucide-react';
import { Subject, Topic } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

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

const RevisaoGeral = () => {
  const { subjects, updateSubject, isDataLoaded, fetchSubjects } = useApp();
  const { isSubjectCompleted, isSubjectReadyToLeaveStudyPlan } = useStudyPlanLogic();
  const [isLoading, setIsLoading] = useState(true);

  console.log('RevisaoGeral - Current subjects:', subjects);

  // Função melhorada para verificar se um tópico está completamente dominado
  const isTopicFullyDominated = (topic: Topic): boolean => {
    console.log('Checking topic:', topic.name, 'reviewStage:', topic.reviewStage, 'nextReview:', topic.nextReview, 'completed:', topic.completed);
    
    // Um tópico está dominado se:
    // 1. reviewStage é 'Concluído' OU completed é true
    // 2. E não tem próxima revisão agendada (nextReview é null)
    const isDominated = (topic.reviewStage === 'Concluído' || topic.completed === true) && topic.nextReview === null;
    
    console.log('Topic', topic.name, 'is dominated:', isDominated);
    return isDominated;
  };

  // Função para verificar se um tópico está concluído (mesmo que ainda tenha revisões)
  const isTopicCompleted = (topic: Topic): boolean => {
    return topic.reviewStage === 'Concluído' || topic.completed === true;
  };

  // Filtrar matérias completamente dominadas (100% finalizadas - sem revisões pendentes)
  const fullyCompletedSubjects = subjects.filter(isSubjectCompleted);
  console.log('RevisaoGeral - Fully completed subjects:', fullyCompletedSubjects);

  // Filtrar matérias com alto progresso (todos os tópicos "Concluído" mas ainda com revisões pendentes)
  const highProgressSubjects = subjects.filter(subject => 
    isSubjectReadyToLeaveStudyPlan(subject) && !isSubjectCompleted(subject)
  );
  console.log('RevisaoGeral - High progress subjects:', highProgressSubjects);

  // Mapear matérias com tópicos dominados individualmente
  const subjectsWithDominatedTopics = subjects
    .map(subject => {
      const dominatedTopics = subject.topics.filter(isTopicFullyDominated);
      const completedTopics = subject.topics.filter(isTopicCompleted);
      return {
        ...subject,
        dominatedTopics,
        completedTopics,
        hasDominatedTopics: dominatedTopics.length > 0,
        hasCompletedTopics: completedTopics.length > 0
      };
    })
    .filter(subject => subject.hasDominatedTopics || subject.hasCompletedTopics)
    .sort((a, b) => b.dominatedTopics.length - a.dominatedTopics.length);

  console.log('RevisaoGeral - Subjects with dominated topics:', subjectsWithDominatedTopics);

  // Estatísticas corrigidas
  const totalSubjectsWithAllTopicsCompleted = subjects.filter(isSubjectReadyToLeaveStudyPlan).length;
  
  // Contar tópicos que estão realmente dominados (reviewStage "Concluído" OU completed=true E nextReview null)
  const totalFullyCompletedTopics = subjects.reduce((acc, subject) => {
    const dominatedTopics = subject.topics.filter(isTopicFullyDominated).length;
    return acc + dominatedTopics;
  }, 0);

  // Contar tópicos concluídos (incluindo os que ainda têm revisões)
  const totalCompletedTopics = subjects.reduce((acc, subject) => {
    const completedTopics = subject.topics.filter(isTopicCompleted).length;
    return acc + completedTopics;
  }, 0);

  // Total de tópicos em todas as matérias
  const totalTopics = subjects.reduce((acc, subject) => acc + subject.topics.length, 0);
  
  const totalSubjects = subjects.length;
  const completionPercentage = totalSubjects > 0 ? Math.round((totalSubjectsWithAllTopicsCompleted / totalSubjects) * 100) : 0;
  const topicsCompletionPercentage = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;
  const topicsDominationPercentage = totalTopics > 0 ? Math.round((totalFullyCompletedTopics / totalTopics) * 100) : 0;

  console.log('RevisaoGeral - Statistics:', {
    totalSubjectsWithAllTopicsCompleted,
    totalFullyCompletedTopics,
    totalCompletedTopics,
    totalTopics,
    totalSubjects,
    completionPercentage,
    topicsCompletionPercentage,
    topicsDominationPercentage
  });

  // Recarregar dados quando necessário
  useEffect(() => {
    if (isDataLoaded) {
      setIsLoading(false);
    }
  }, [isDataLoaded]);

  // Força uma atualização dos dados ao entrar na página
  useEffect(() => {
    const refreshData = async () => {
      try {
        await fetchSubjects();
      } catch (error) {
        console.error('Erro ao atualizar dados:', error);
      }
    };
    
    refreshData();
  }, []);

  const handleReactivateSubject = async (subjectId: string) => {
    try {
      await updateSubject(subjectId, { status: 'Em Estudo' });
      toast.success("Matéria reativada para estudo!");
    } catch (error) {
      toast.error("Erro ao reativar matéria. Tente novamente.");
    }
  };

  const getLastReviewDate = (subject: Subject): Date | null => {
    const lastReviewDates = subject.topics
      .map(topic => topic.lastReviewedAt)
      .filter(date => date !== undefined) as Date[];
    
    if (lastReviewDates.length === 0) return null;
    
    return new Date(Math.max(...lastReviewDates.map(date => date.getTime())));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-2 sm:px-4 md:px-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="space-y-6" variants={containerVariants}>
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold text-gray-800">Revisão Geral</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Acompanhe suas conquistas e gerencie matérias e tópicos dominados
          </p>
        </motion.div>

        {/* Estatísticas */}
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
                <div className="text-2xl font-bold text-purple-600">{fullyCompletedSubjects.length}</div>
                <p className="text-xs text-muted-foreground">
                  completamente finalizadas
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Tópicos Concluídos e Dominados */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="h-6 w-6 text-blue-600" />
            Progresso por Matéria
          </h2>

          {subjectsWithDominatedTopics.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Nenhum tópico concluído ainda
                </h3>
                <p className="text-gray-500 text-sm">
                  Continue estudando para concluir seus tópicos!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 mb-8">
              {subjectsWithDominatedTopics.map((subject) => {
                const lastReviewDate = getLastReviewDate(subject);
                
                return (
                  <motion.div key={subject.id} variants={itemVariants}>
                    <Card className="border-blue-200 bg-blue-50/50">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <Star className="h-5 w-5 text-blue-600" />
                              {subject.name}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {subject.completedTopics.length} de {subject.topics.length} tópicos concluídos
                              {subject.dominatedTopics.length > 0 && (
                                <span className="text-green-600 font-medium">
                                  {" "}• {subject.dominatedTopics.length} dominados
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {Math.round((subject.completedTopics.length / subject.topics.length) * 100)}% Concluída
                            </Badge>
                            {subject.dominatedTopics.length > 0 && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {subject.dominatedTopics.length} Dominados
                              </Badge>
                            )}
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
                        <div className="space-y-3">
                          {subject.completedTopics.length > 0 && (
                            <div className="text-sm text-gray-600">
                              <strong>Tópicos concluídos:</strong>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {subject.completedTopics.map(topic => (
                                  <Badge 
                                    key={topic.id} 
                                    variant="outline" 
                                    className={
                                      isTopicFullyDominated(topic) 
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                    }
                                  >
                                    {topic.name}
                                    {isTopicFullyDominated(topic) && " ★"}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {subject.topics.length > subject.completedTopics.length && (
                            <div className="text-sm text-gray-500">
                              <strong>Tópicos restantes:</strong>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {subject.topics
                                  .filter(topic => !isTopicCompleted(topic))
                                  .map(topic => (
                                    <Badge key={topic.id} variant="outline" className="bg-gray-50 text-gray-600">
                                      {topic.name}
                                    </Badge>
                                  ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex justify-end">
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
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Matérias 100% Dominadas */}
        {fullyCompletedSubjects.length > 0 && (
          <motion.div variants={itemVariants}>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Matérias 100% Dominadas ({fullyCompletedSubjects.length})
            </h2>

            <div className="grid gap-4 mb-8">
              {fullyCompletedSubjects.map((subject) => {
                const lastReviewDate = getLastReviewDate(subject);
                const dominatedTopics = subject.topics.filter(isTopicFullyDominated).length;
                
                return (
                  <motion.div key={subject.id} variants={itemVariants}>
                    <Card className="border-green-200 bg-green-50/50">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              {subject.name}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {dominatedTopics} de {subject.topics.length} tópicos 100% dominados
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              100% Dominada
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
        )}

        {/* Matérias com Alto Progresso */}
        {highProgressSubjects.length > 0 && (
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
        )}

        {/* Dicas de Revisão */}
        <motion.div variants={itemVariants}>
          <Card className="bg-blue-50/50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <BookOpen className="h-5 w-5" />
                Dicas para Manter o Conhecimento
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ul className="space-y-2 text-sm">
                <li>• <strong>Revisão Esporádica:</strong> Mesmo tópicos dominados se beneficiam de revisões ocasionais</li>
                <li>• <strong>Aplicação Prática:</strong> Use o conhecimento adquirido em projetos reais</li>
                <li>• <strong>Ensino:</strong> Explicar para outros é uma excelente forma de manter o conhecimento vivo</li>
                <li>• <strong>Reativação:</strong> Se sentir que precisa revisar, use o botão "Reativar" para voltar ao ciclo de estudos</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default RevisaoGeral;
