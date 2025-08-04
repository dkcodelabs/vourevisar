import React, { useState } from 'react';
import { format, startOfDay, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DayActivity {
  date: Date;
  hasActivity: boolean;
  activities: {
    subject: string;
    topic: string;
    reviewStage: string;
    time: string;
  }[];
  pomodoroSessions: number;
}

interface StreakVisualBarProps {
  subjects: any[];
  onDayClick: (date: Date) => void;
  className?: string;
}

export const StreakVisualBar: React.FC<StreakVisualBarProps> = ({
  subjects,
  onDayClick,
  className = ''
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Gerar dados do mês atual
  const generateMonthDays = (month: Date): DayActivity[] => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });

    return days.map(date => {
      const activities: DayActivity['activities'] = [];
      let pomodoroSessions = 0;

      // Verificar atividades do dia
      subjects.forEach(subject => {
        subject.topics.forEach((topic: any) => {
          if (topic.lastReviewedAt) {
            const reviewDate = startOfDay(new Date(topic.lastReviewedAt));
            if (isSameDay(reviewDate, date)) {
              activities.push({
                subject: subject.name,
                topic: topic.name,
                reviewStage: topic.reviewStage || '1ª Revisão',
                time: format(new Date(topic.lastReviewedAt), 'HH:mm')
              });
            }
          }
        });
      });

      // TODO: Adicionar sessões Pomodoro quando implementado
      // pomodoroSessions = getPomodoroSessionsForDate(date);

      return {
        date,
        hasActivity: activities.length > 0,
        activities,
        pomodoroSessions
      };
    });
  };

  const monthDays = generateMonthDays(currentMonth);
  const today = startOfDay(new Date());
  const activeDays = monthDays.filter(d => d.hasActivity).length;
  const totalDays = monthDays.length;

  const getDayStatus = (day: DayActivity) => {
    if (isSameDay(day.date, today)) return 'today';
    if (day.hasActivity) return 'active';
    if (day.date > today) return 'future';
    return 'inactive';
  };

  const getDayColor = (status: string) => {
    switch (status) {
      case 'today': return 'bg-blue-500 border-blue-600';
      case 'active': return 'bg-green-500 border-green-600';
      case 'future': return 'bg-gray-100 border-gray-200';
      case 'inactive': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-200 border-gray-300';
    }
  };

  // Mensagem de incentivo baseada na performance
  const getMotivationalMessage = () => {
    const percentage = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;
    
    if (percentage >= 80) {
      return "🔥 Excelente! Você está arrasando nos estudos!";
    } else if (percentage >= 60) {
      return "👏 Muito bem! Continue assim, você está indo bem!";
    } else if (percentage >= 40) {
      return "💪 Bom progresso! Que tal estudar um pouco mais?";
    } else if (percentage >= 20) {
      return "📚 Vamos lá! Ainda dá tempo de melhorar este mês!";
    } else {
      return "🚀 Hora de acelerar! Seus objetivos te esperam!";
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  return (
    <div className={`bg-white border border-gray-100 rounded-xl shadow-sm p-6 mb-6 ${className}`}>
      {/* Header com navegação */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <h3 className="text-base font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
            disabled={isSameMonth(currentMonth, new Date())}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {activeDays}/{totalDays} dias ativos
          </div>
          <div className="text-xs text-gray-500">
            {Math.round((activeDays / totalDays) * 100)}% do mês
          </div>
        </div>
      </div>

      {/* Mensagem motivacional - Mais compacta */}
      <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <p className="text-xs text-center font-medium text-gray-700">
          {getMotivationalMessage()}
        </p>
      </div>

      {/* Timeline dos dias - Uma linha contínua sem quebras */}
      <div className="mb-3 overflow-x-auto overflow-y-hidden">
        <TooltipProvider>
          <div className="flex gap-1 justify-center min-w-max px-2">
            {monthDays.map((day, index) => {
              const status = getDayStatus(day);
              const dayNumber = format(day.date, 'd');
              
              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <button
                      className={`
                        flex-shrink-0 w-7 h-7 rounded-full border transition-all duration-200
                        hover:scale-110 hover:shadow-sm active:scale-95
                        flex items-center justify-center text-xs font-medium
                        ${getDayColor(status)}
                        ${status === 'active' || status === 'today' ? 'text-white' : 
                          status === 'future' ? 'text-gray-400' : 'text-gray-600'}
                        ${status === 'future' ? 'cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      onClick={() => status !== 'future' ? onDayClick(day.date) : null}
                      disabled={status === 'future'}
                    >
                      <span className="text-xs">{dayNumber}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="text-center">
                      <div className="font-medium mb-1">
                        {format(day.date, 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                      <div className="text-xs">
                        {status === 'today' && '📅 Hoje'}
                        {status === 'active' && `✅ ${day.activities.length} atividade${day.activities.length > 1 ? 's' : ''}`}
                        {status === 'inactive' && '❌ Sem atividade'}
                        {status === 'future' && '⏳ Futuro'}
                      </div>
                      {day.activities.length > 0 && (
                        <div className="mt-2 text-xs text-left">
                          {day.activities.slice(0, 3).map((activity, i) => (
                            <div key={i} className="truncate">
                              • {activity.subject} - {activity.topic}
                            </div>
                          ))}
                          {day.activities.length > 3 && (
                            <div className="text-gray-400">
                              +{day.activities.length - 3} mais...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Legenda compacta */}
      <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Estudou</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-100 border border-red-300 rounded-full"></div>
          <span>Não estudou</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Hoje</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-100 border border-gray-200 rounded-full"></div>
          <span>Futuro</span>
        </div>
      </div>
    </div>
  );
};