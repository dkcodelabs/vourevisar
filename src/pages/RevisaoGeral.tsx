
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RotateCcw, Calendar, Trophy, BookOpen } from 'lucide-react';
import { Subject } from '@/types';
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
  const { subjects, updateSubject, isDataLoaded } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  // Função para verificar se uma matéria está completamente concluída (sem revisões pendentes)
  const isSubjectCompleted = (subject: Subject): boolean => {
    if (subject.topics.length === 0) return false;
    
    return subject.topics.every(topic => {
      // Tópico deve estar marcado como concluído E não ter próxima revisão agendada
      return topic.completed && 
             topic.reviewStage === 'Concluído' && 
             topic.nextReview === null;
    });
  };

  // Filtrar matérias completamente concluídas (sem revisões pendentes)
  const completedSubjects = subjects.filter(isSubjectCompleted);

  // Estatísticas
  const totalCompletedTopics = completedSubjects.reduce((acc, subject) => acc + subject.topics.length, 0);
  const totalSubjects = subjects.length;
  const completionPercentage = totalSubjects > 0 ? Math.round((completedSubjects.length / totalSubjects) * 100) : 0;

  useEffect(() => {
    if (isDataLoaded) {
      setIsLoading(false);
    }
  }, [isDataLoaded]);

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
            Acompanhe suas conquistas e gerencie matérias completamente dominadas
          </p>
        </motion.div>

        {/* Estatísticas */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Matérias Concluídas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completedSubjects.length}</div>
                <p className="text-xs text-muted-foreground">
                  de {totalSubjects} matérias ({completionPercentage}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tópicos Dominados</CardTitle>
                <BookOpen className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{totalCompletedTopics}</div>
                <p className="text-xs text-muted-foreground">
                  tópicos completamente revisados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{completionPercentage}%</div>
                <p className="text-xs text-muted-foreground">
                  de conclusão geral
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Lista de Matérias Concluídas */}
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Matérias Dominadas
          </h2>

          {completedSubjects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Nenhuma matéria concluída ainda
                </h3>
                <p className="text-gray-500">
                  Continue estudando para ver suas conquistas aqui!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedSubjects.map((subject) => {
                const lastReviewDate = getLastReviewDate(subject);
                
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
                              {subject.topics.length} tópicos completamente dominados
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Concluída
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
          )}
        </motion.div>

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
                <li>• <strong>Revisão Esporádica:</strong> Mesmo matérias dominadas se beneficiam de revisões ocasionais</li>
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
