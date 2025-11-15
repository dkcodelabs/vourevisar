import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subject } from '@/types';

interface CalendarAndStatsProps {
  subjects: Subject[];
  reviewData?: any[];
  onDayClick?: (date: Date) => void;
}

export const CalendarAndStats: React.FC<CalendarAndStatsProps> = ({ 
  subjects, 
  reviewData = [],
  onDayClick
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Gerar dias do calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = startOfDay(new Date());
  
  // Calcular estatísticas do mês
  const calculateMonthStats = () => {
    // Contar revisões feitas no mês (histórico)
    let firstContacts = 0;
    let totalReviews = 0;
    let activeTopicReviews = 0;
    const activeDaysSet = new Set<string>();
    
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        const isCompleted = topic.reviewStage === 'Concluído' || topic.completed;
        
        // Primeiro contato
        if (topic.first_studied_at || topic.firstStudiedAt) {
          const firstDate = new Date(topic.first_studied_at || topic.firstStudiedAt);
          if (firstDate >= monthStart && firstDate <= monthEnd) {
            firstContacts++;
            activeDaysSet.add(format(firstDate, 'yyyy-MM-dd'));
          }
        }
        
        // Revisões feitas
        if (topic.lastReviewedAt || topic.last_reviewed_at) {
          const reviewDate = new Date(topic.lastReviewedAt || topic.last_reviewed_at);
          if (reviewDate >= monthStart && reviewDate <= monthEnd) {
            totalReviews++;
            activeDaysSet.add(format(reviewDate, 'yyyy-MM-dd'));
            
            if (!isCompleted) {
              activeTopicReviews++;
            }
          }
        }
      });
    });
    
    // Contar revisões agendadas (futuro)
    let overdueCount = 0;
    let todayReviewCount = 0;
    
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        if (!topic.nextReview) return;
        const reviewDate = startOfDay(new Date(topic.nextReview));
        
        if (reviewDate < today) {
          overdueCount++;
        } else if (isSameDay(reviewDate, today)) {
          todayReviewCount++;
        }
      });
    });
    
    const totalDaysInMonth = days.length;
    const activeDays = activeDaysSet.size;
    const activityRate = totalDaysInMonth > 0 ? Math.round((activeDays / totalDaysInMonth) * 100) : 0;
    
    return {
      firstContacts,
      totalReviews,
      activeTopicReviews,
      overdueCount,
      todayReviewCount,
      activeDays,
      totalDaysInMonth,
      activityRate
    };
  };
  
  const monthStats = calculateMonthStats();
  
  // Função para determinar o status e contagem de um dia
  const getDayInfo = (day: Date) => {
    const dayStart = startOfDay(day);
    let reviewsCount = 0;
    let hasActivity = false;
    let overdueCount = 0;
    let todayCount = 0;
    let futureCount = 0;
    
    // Verificar histórico (passado)
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        // Primeiro contato
        if (topic.first_studied_at || topic.firstStudiedAt) {
          const firstDate = startOfDay(new Date(topic.first_studied_at || topic.firstStudiedAt));
          if (isSameDay(firstDate, dayStart)) {
            reviewsCount++;
            hasActivity = true;
          }
        }
        
        // Revisões
        if (topic.lastReviewedAt || topic.last_reviewed_at) {
          const reviewDate = startOfDay(new Date(topic.lastReviewedAt || topic.last_reviewed_at));
          if (isSameDay(reviewDate, dayStart)) {
            reviewsCount++;
            hasActivity = true;
          }
        }
      });
    });
    
    // Verificar revisões agendadas (futuro)
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        if (!topic.nextReview) return;
        const reviewDate = startOfDay(new Date(topic.nextReview));
        
        if (isSameDay(reviewDate, dayStart)) {
          if (reviewDate < today) overdueCount++;
          else if (isSameDay(reviewDate, today)) todayCount++;
          else if (reviewDate > today) futureCount++;
        }
      });
    });
    
    return {
      reviewsCount,
      hasActivity,
      overdueCount,
      todayCount,
      futureCount,
      hasFutureReviews: overdueCount + todayCount + futureCount > 0
    };
  };
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Visão Geral do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-6">
          {/* Calendário */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="h-9 w-9 p-0 hover:bg-gray-100"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </Button>
              
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {monthStats.activeDays}/{monthStats.totalDaysInMonth} dias ativos · {monthStats.activityRate}%
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateMonth('next')}
                disabled={isSameMonth(currentMonth, new Date())}
                className="h-9 w-9 p-0 hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </Button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                <div key={index} className="text-center text-xs font-semibold text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const dayInfo = getDayInfo(day);
                const isToday = isSameDay(day, today);
                const isPast = day < today;
                const isFuture = day > today;
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => onDayClick && onDayClick(day)}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 relative
                      ${isToday 
                        ? 'bg-blue-50 text-blue-700 border-2 border-blue-500 font-semibold shadow-sm' 
                        : isPast && dayInfo.hasActivity
                        ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:shadow-sm'
                        : isPast && !dayInfo.hasActivity
                        ? 'bg-gray-50 text-gray-400 border border-gray-100'
                        : isFuture && dayInfo.hasFutureReviews
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                        : 'bg-gray-50 text-gray-300 border border-gray-100'
                      }
                    `}
                  >
                    <span>{format(day, 'd')}</span>
                    
                    {/* Mostrar contagem de revisões feitas (passado) */}
                    {isPast && dayInfo.reviewsCount > 0 && (
                      <span className="text-[10px] text-green-600 font-semibold mt-0.5">
                        {dayInfo.reviewsCount}
                      </span>
                    )}
                    
                    {/* Mostrar bolinhas para revisões agendadas (futuro) */}
                    {(isFuture || isToday) && dayInfo.hasFutureReviews && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayInfo.overdueCount > 0 && (
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        )}
                        {dayInfo.todayCount > 0 && (
                          <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                        )}
                        {dayInfo.futureCount > 0 && (
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-100 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-50 border border-green-200 rounded flex items-center justify-center text-[8px] font-bold text-green-600">3</div>
                <span className="text-gray-600">Revisões feitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded flex items-center justify-center">
                  <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                </div>
                <span className="text-gray-600">Agendadas</span>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Estatísticas
            </h3>
            
            {/* Primeiros Contatos */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📚</span>
                <span className="text-sm font-medium text-gray-700">Primeiros Contatos</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{monthStats.firstContacts}</span>
            </div>
            
            {/* Revisões Feitas */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔄</span>
                <span className="text-sm font-medium text-gray-700">Revisões Feitas</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{monthStats.totalReviews}</span>
            </div>
            
            {/* Revisões Ativas */}
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⏳</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">Revisões Ativas</span>
                  <span className="text-xs text-gray-500">Tópicos não concluídos</span>
                </div>
              </div>
              <span className="text-2xl font-bold text-orange-600">{monthStats.activeTopicReviews}</span>
            </div>
            
            {/* Revisões Atrasadas */}
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Atrasadas</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{monthStats.overdueCount}</span>
            </div>
            
            {/* Revisões Hoje */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Para Hoje</span>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{monthStats.todayReviewCount}</span>
            </div>
            
            {/* Dias Ativos */}
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✅</span>
                <span className="text-sm font-medium text-gray-700">Dias Ativos</span>
              </div>
              <span className="text-2xl font-bold text-purple-600">{monthStats.activeDays}/{monthStats.totalDaysInMonth}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
