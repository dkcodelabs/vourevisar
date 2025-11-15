import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Award, Target, Flame, Users, RotateCcw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subject } from '@/types';
import { useUserSettings } from '@/hooks/useUserSettings';

interface CalendarAndStatsProps {
  subjects: Subject[];
  reviewData?: any[];
}

export const CalendarAndStats: React.FC<CalendarAndStatsProps> = ({ 
  subjects, 
  reviewData = [] 
}) => {
  const [currentMonth] = useState(new Date());
  const { settings, cycleInfo, getProfileInfo, getCycleStats } = useUserSettings();
  
  // Calcular estatísticas reais
  const totalTopics = subjects.reduce((sum, subject) => sum + subject.topics.length, 0);
  const completedTopics = subjects.reduce((sum, subject) => 
    sum + subject.topics.filter(topic => topic.reviewStage === 'Concluído').length, 0
  );
  
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  
  // Calcular revisões desta semana usando reviewData (topic_review_history)
  const calculateWeeklyStats = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    
    // Contar apenas revisões reais (excluir 'first_contact' e 'Primeiro Contato')
    const realReviews = reviewData.filter(review => 
      review.review_stage !== 'first_contact' && 
      review.review_stage !== 'Primeiro Contato'
    );
    
    // Contar revisões da última semana
    const weeklyReviews = realReviews.filter(review => {
      const reviewDate = new Date(review.reviewed_at);
      return reviewDate >= oneWeekAgo;
    }).length;
    
    const dailyAverage = weeklyReviews > 0 ? (weeklyReviews / 7).toFixed(1) : '0.0';
    
    return { 
      weeklyReviews, 
      dailyAverage: parseFloat(dailyAverage),
      totalReviews: realReviews.length 
    };
  };
  
  const weeklyStats = calculateWeeklyStats();
  
  // Obter informações do perfil real
  const profileInfo = getProfileInfo();
  const cycleStats = getCycleStats();
  


  // Gerar dias do calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Função para determinar o status do dia e contar revisões por tipo
  const getDayStatus = (day: Date) => {
    const today = startOfDay(new Date());
    const dayStart = startOfDay(day);
    
    let overdueCount = 0;
    let todayCount = 0;
    let futureCount = 0;
    
    // Contar revisões por tipo
    subjects.forEach(subject =>
      subject.topics.forEach(topic => {
        if (!topic.nextReview) return;
        const reviewDate = startOfDay(new Date(topic.nextReview));
        if (isSameDay(reviewDate, dayStart)) {
          if (reviewDate < today) overdueCount++;
          else if (isSameDay(reviewDate, today)) todayCount++;
          else if (reviewDate > today) futureCount++;
        }
      })
    );
    
    const totalReviews = overdueCount + todayCount + futureCount;
    
    return { 
      overdueCount, 
      todayCount, 
      futureCount, 
      totalReviews,
      hasReviews: totalReviews > 0
    };
  };
  
  const getDayClassName = (day: Date, isToday: boolean, hasReviews: boolean) => {
    const baseClass = "w-8 h-8 flex flex-col items-center rounded cursor-pointer transition-colors bg-white border";
    const justifyClass = hasReviews ? "justify-between py-1" : "justify-center";
    
    if (isToday) {
      return `${baseClass} ${justifyClass} border-blue-500 border-2 font-bold text-gray-900`;
    }
    
    return `${baseClass} ${justifyClass} border-gray-200 hover:border-gray-300 text-gray-700`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-500" />
          Calendário & Estatísticas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendário */}
          <div>
            <h3 className="font-medium mb-3 text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
            </h3>
            
            {/* Legenda */}
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-100 rounded"></div>
                <span>Atrasados</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                <span>Hoje</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 rounded"></div>
                <span>Futuro</span>
              </div>
            </div>
            
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                <div key={index} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const { overdueCount, todayCount, futureCount, totalReviews } = getDayStatus(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={day.toISOString()}
                    className={getDayClassName(day, isToday, totalReviews > 0)}
                    title={`${format(day, 'dd/MM/yyyy')}${totalReviews > 0 ? `\n${overdueCount > 0 ? `${overdueCount} atrasada(s)\n` : ''}${todayCount > 0 ? `${todayCount} hoje\n` : ''}${futureCount > 0 ? `${futureCount} futura(s)` : ''}` : ''}`}
                  >
                    <span className="text-xs leading-none">{format(day, 'd')}</span>
                    {totalReviews > 0 && (
                      <div className="flex gap-0.5">
                        {overdueCount > 0 && (
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                        )}
                        {todayCount > 0 && (
                          <span className="w-1 h-1 bg-yellow-500 rounded-full"></span>
                        )}
                        {futureCount > 0 && (
                          <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estatísticas */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Esta semana:</span>
                <Badge variant="secondary">{weeklyStats.weeklyReviews} revisões</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Média diária:</span>
                <Badge variant="secondary">{weeklyStats.dailyAverage} tópicos</Badge>
              </div>
              
              {/* Informações do Perfil Real */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Perfil:</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  {profileInfo?.profileName || 'Carregando...'}
                </Badge>
              </div>

              {/* Informações do Ciclo */}
              {cycleStats && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Matérias por dia:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {settings?.subjects_per_day || 3}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ciclos completos:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      {cycleStats.completedCycles}
                    </Badge>
                  </div>
                </>
              )}
              
              {/* Informações do Perfil de Revisão */}
              {profileInfo && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-600 mb-1">
                    <strong>Intervalos de Revisão:</strong>
                  </div>
                  <div className="text-xs text-gray-500">
                    {profileInfo.intervals.map((interval, index) => (
                      <span key={index}>
                        {interval === 1 ? '24h' : `${interval}d`}
                        {index < profileInfo.intervals.length - 1 ? ' → ' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {profileInfo.profileDescription}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};