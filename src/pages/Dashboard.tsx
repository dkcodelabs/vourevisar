
import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { upcomingReviews, revisionsCalendar } from '@/data/mockData';
import { LayoutList, CalendarDays, Calendar, Plus, Book, Settings } from 'lucide-react';

export const Dashboard = () => {
  const { studyProgress } = useApp();
  
  // Format progress as percentage
  const progressPercentage = Math.round((studyProgress.completedSubjects / studyProgress.totalSubjects) * 100);
  const topicsPercentage = Math.round((studyProgress.completedTopics / studyProgress.totalTopics) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button className="bg-app-blue">
          <LayoutList className="mr-2 h-4 w-4" />
          Iniciar Estudos do Dia
        </Button>
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
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">
                {studyProgress.completedSubjects}/{studyProgress.totalSubjects}
              </div>
              <div className="text-sm text-gray-500">
                Você já cadastrou {studyProgress.completedSubjects} de {studyProgress.totalSubjects} matérias planejadas.
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
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold">
                {studyProgress.completedTopics}/{studyProgress.totalTopics}
              </div>
              <div className="text-sm text-gray-500">
                {studyProgress.completedTopics} de {studyProgress.totalTopics} tópicos totais.
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
              <p className="text-sm text-gray-500">Continue assim para alcançar seus objetivos!</p>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${topicsPercentage}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-app-blue" />
                Próximas Matérias e Revisões
              </CardTitle>
              <p className="text-sm text-gray-500">
                Matérias e tópicos agendados para os próximos dias.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingReviews.map(review => (
                  <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{review.subject} - {review.topic}</h3>
                      <p className="text-sm text-gray-500">{review.type}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-app-blue">{review.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
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
                
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1;
                  const hasRevision = revisionsCalendar.some(r => r.day === day);
                  return (
                    <div 
                      key={day} 
                      className={`calendar-day ${hasRevision ? 'calendar-day-with-revision' : ''}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 gap-4 mt-6">
            <h3 className="text-xl font-bold">Acesso Rápido</h3>
            <div className="grid grid-cols-1 gap-3">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <Plus className="h-5 w-5 p-1 rounded-full bg-app-blue text-white" />
                  <div>
                    <h4 className="font-medium">Nova Matéria / Tópicos</h4>
                    <p className="text-sm text-gray-500">Adicione e organize seus estudos.</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <Settings className="h-5 w-5 p-1 rounded-full bg-app-blue text-white" />
                  <div>
                    <h4 className="font-medium">Configurações</h4>
                    <p className="text-sm text-gray-500">Personalize suas preferências.</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
