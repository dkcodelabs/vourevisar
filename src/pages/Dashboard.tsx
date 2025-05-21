import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { LayoutList, CalendarDays, Calendar, Plus, Book, Settings } from 'lucide-react';
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Dashboard = () => {
  const { subjects, studyProgress, fetchSubjects } = useApp();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showRevisionsDialog, setShowRevisionsDialog] = useState(false);
  
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);
  
  // Verificar se há matérias e tópicos
  const hasSubjects = subjects.length > 0;
  const hasTopics = subjects.some(subject => subject.topics.length > 0);
  
  // Format progress as percentage - com proteção contra NaN
  const progressPercentage = studyProgress.totalSubjects > 0 
    ? Math.round((studyProgress.completedSubjects / studyProgress.totalSubjects) * 100) || 0
    : 0;
    
  const topicsPercentage = studyProgress.totalTopics > 0 
    ? Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100) || 0
    : 0;

  // Revisões do dia
  const todaysReviews = hasTopics ? [{
    id: '1',
    subject: 'Português',
    topic: 'Concordância Verbal',
    date: 'Hoje',
    type: 'Revisão para Hoje'
  }] : [];

  // Mock data for revisions on selected date
  const getRevisionsForDate = (day: number) => {
    if (!hasTopics) return [];
    
    // This would come from a real data source in a production app
    if (day === 5) {
      return [
        {
          id: `rev-${day}-1`,
          subject: 'Direito Constitucional',
          topic: 'Artigos 1-5',
          status: 'Pendente'
        }
      ];
    }
    if (day === 12) {
      return [
        {
          id: `rev-${day}-1`,
          subject: 'Direito Constitucional',
          topic: 'Artigos 1-5',
          status: 'Hoje'
        }
      ];
    }
    if (day === 19) {
      return [
        {
          id: `rev-${day}-1`,
          subject: 'Português',
          topic: 'Concordância Verbal',
          status: 'Hoje'
        },
        {
          id: `rev-${day}-2`,
          subject: 'Direito Constitucional',
          topic: 'Artigos 1-5',
          status: 'Futura'
        }
      ];
    }
    if (day === 28) {
      return [
        {
          id: `rev-${day}-1`,
          subject: 'Direito Constitucional',
          topic: 'Artigos 1-5',
          status: 'Futura'
        },
        {
          id: `rev-${day}-2`,
          subject: 'Português',
          topic: 'Concordância Verbal',
          status: 'Futura'
        }
      ];
    }
    return [];
  };

  const handleDateClick = (day: number) => {
    setSelectedDate(day);
    setShowRevisionsDialog(true);
  };

  const currentDay = new Date().getDate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {hasSubjects && hasTopics && (
          <Button 
            className="bg-app-blue hover:bg-app-light-blue"
            onClick={() => navigate('/plano-estudos')}
          >
            <LayoutList className="mr-2 h-4 w-4" />
            Iniciar Estudos do Dia
          </Button>
        )}
      </div>
      
      <p className="text-gray-600">Bem-vindo(a) de volta, Darcilio! Aqui está seu progresso.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Book className="mr-2 h-5 w-5 text-app-blue" />
              Matérias Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <div className="text-3xl font-bold">
                {studyProgress.completedSubjects}/{studyProgress.totalSubjects}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {studyProgress.totalSubjects > 0 
                  ? `Você já cadastrou ${studyProgress.completedSubjects} de ${studyProgress.totalSubjects} matérias planejadas.`
                  : 'Nenhuma matéria cadastrada ainda.'
                }
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <LayoutList className="mr-2 h-5 w-5 text-app-blue" />
              Tópicos Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <div className="text-3xl font-bold">
                {studyProgress.completedTopics}/{studyProgress.totalTopics}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {studyProgress.totalTopics > 0 
                  ? `${studyProgress.completedTopics} de ${studyProgress.totalTopics} tópicos totais.`
                  : 'Nenhum tópico cadastrado ainda.'
                }
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-app-blue" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{topicsPercentage}% Concluído</span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">{topicsPercentage}%</span>
              </div>
              <p className="text-sm text-gray-500">
                {studyProgress.totalTopics > 0 
                  ? 'Continue assim para alcançar seus objetivos!'
                  : 'Adicione tópicos para iniciar seu progresso.'
                }
              </p>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill bg-gradient-to-r from-green-400 to-green-600" 
                  style={{ width: `${topicsPercentage}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {(hasSubjects || hasTopics) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-app-blue" />
                  Calendário de Revisões
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Dias com revisões agendadas este mês.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center">
                  <div className="calendar-day">D</div>
                  <div className="calendar-day">S</div>
                  <div className="calendar-day">T</div>
                  <div className="calendar-day">Q</div>
                  <div className="calendar-day">Q</div>
                  <div className="calendar-day">S</div>
                  <div className="calendar-day">S</div>
                  
                  {/* We're keeping the calendar display with the current day highlighted */}
                  {Array.from({ length: 31 }, (_, i) => {
                    const day = i + 1;
                    const isToday = day === currentDay;
                    const hasRevision = hasTopics && [5, 12, 19, 28].includes(day);
                    
                    return (
                      <div 
                        key={day} 
                        className={`calendar-day ${hasRevision ? 'calendar-day-with-revision' : ''} 
                                  ${isToday ? 'calendar-day-today !border-2 !border-app-blue' : ''} 
                                  ${hasRevision ? 'cursor-pointer' : ''}`}
                        onClick={() => hasRevision && handleDateClick(day)}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center">
                  <CalendarDays className="mr-2 h-5 w-5 text-app-blue" />
                  Matérias e Revisões de Hoje
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Matérias e tópicos agendados para hoje.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {todaysReviews.length > 0 ? (
                    todaysReviews.map(review => (
                      <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{review.subject} - {review.topic}</h3>
                          <p className="text-sm text-gray-500">{review.type}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-app-blue">{review.date}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Não há revisões agendadas para hoje.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      <div className="mt-6">
        <h3 className="text-xl font-bold mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/materias')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Plus className="h-5 w-5 p-1 rounded-full bg-app-blue text-white" />
              <div>
                <h4 className="font-medium">Nova Matéria / Tópicos</h4>
                <p className="text-sm text-gray-500">Adicione e organize seus estudos.</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/configuracoes')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Settings className="h-5 w-5 p-1 rounded-full bg-app-blue text-white" />
              <div>
                <h4 className="font-medium">Configurações</h4>
                <p className="text-sm text-gray-500">Personalize suas preferências.</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate('/plano-estudos')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 p-1 rounded-full bg-app-blue text-white" />
              <div>
                <h4 className="font-medium">Plano de Estudos</h4>
                <p className="text-sm text-gray-500">Veja suas tarefas de hoje.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog for showing revisions on a specific date */}
      <Dialog open={showRevisionsDialog} onOpenChange={setShowRevisionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisões para o dia {selectedDate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {selectedDate && getRevisionsForDate(selectedDate).map(revision => (
              <div key={revision.id} className="border rounded-md p-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">{revision.subject} - {revision.topic}</h4>
                  <span 
                    className={`text-xs px-2 py-1 rounded-full ${
                      revision.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : 
                      revision.status === 'Hoje' ? 'bg-red-100 text-red-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {revision.status}
                  </span>
                </div>
              </div>
            ))}
            {selectedDate && getRevisionsForDate(selectedDate).length === 0 && (
              <p className="text-center text-gray-500">Não há revisões agendadas para este dia.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
