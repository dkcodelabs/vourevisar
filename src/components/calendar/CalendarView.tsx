import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, 
         startOfMonth, 
         endOfMonth, 
         startOfWeek, 
         endOfWeek, 
         addDays, 
         isSameMonth, 
         isSameDay, 
         addMonths, 
         subMonths,
         isValid,
         getDaysInMonth,
         getDay,
         startOfDay,
         isBefore,
         isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ReviewData {
  id: string;
  name: string;
  subject_name: string;
  next_review: string;
  review_stage: string;
}

interface CalendarViewProps {
  reviewData: ReviewData[];
  isLoading?: boolean;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date;
  className?: string;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  reviewData = [],
  isLoading = false,
  onDateSelect,
  selectedDate,
  className,
  currentMonth,
  onMonthChange
}) => {
  const [currentMonthState, setCurrentMonth] = useState(currentMonth || new Date());

  // Função para validar se uma data é válida
  const isValidDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(year, month - 1, day);
    return isValid(date) && 
           date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  };

  // Função para obter o número de dias em um mês (considerando anos bissextos)
  const getDaysInMonthSafe = (date: Date): number => {
    return getDaysInMonth(date);
  };

  // Função para verificar se um ano é bissexto
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  // Mapear revisões por data
  const reviewsByDate = React.useMemo(() => {
    const map: Record<string, { reviews: ReviewData[], status: 'hoje' | 'pendente' | 'futura' }[]> = {};
    
    reviewData.forEach(review => {
      if (review.next_review) {
        try {
          const reviewDate = new Date(review.next_review);
          if (isValid(reviewDate)) {
            const dateKey = format(startOfDay(reviewDate), 'yyyy-MM-dd');
            const today = startOfDay(new Date());
            const reviewDay = startOfDay(reviewDate);
            
            let status: 'hoje' | 'pendente' | 'futura' = 'futura';
            if (isSameDay(reviewDay, today)) {
              status = 'hoje';
            } else if (isBefore(reviewDay, today)) {
              status = 'pendente';
            }
            
            if (!map[dateKey]) {
              map[dateKey] = [];
            }
            
            map[dateKey].push({ reviews: [review], status });
          }
        } catch (error) {
          console.error('Erro ao processar data de revisão:', review.next_review, error);
        }
      }
    });
    
    return map;
  }, [reviewData]);

  // Gerar dias do calendário
  const generateCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentMonthState));
    const end = endOfWeek(endOfMonth(currentMonthState));
    const days = [];
    let currentDate = start;

    while (currentDate <= end) {
      days.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'next' 
      ? addMonths(currentMonthState, 1) 
      : subMonths(currentMonthState, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    onDateSelect?.(date);
  };

  // Função para obter todos os status de revisão de uma data
  const getDateStatuses = (date: Date) => {
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
    const dayReviews = reviewsByDate[dateKey];
    if (!dayReviews || dayReviews.length === 0) return [];
    return Array.from(new Set(dayReviews.map(r => r.status)));
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="space-y-4 p-6" aria-busy="true" aria-label="Carregando calendário de revisões">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, index) => (
              <Skeleton key={index} className="h-8 rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {format(currentMonthState, 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Dias do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            const isCurrentMonth = isSameMonth(date, currentMonth);
            const isToday = isSameDay(date, new Date());
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const statuses = getDateStatuses(date);

            // Função para gradiente de status
            const getStatusBg = () => {
              if (statuses.length > 1) {
                // Pendente + Hoje
                if (statuses.includes('pendente') && statuses.includes('hoje')) {
                  return 'bg-gradient-to-r from-red-100 to-yellow-100';
                }
                // Pendente + Futura
                if (statuses.includes('pendente') && statuses.includes('futura')) {
                  return 'bg-gradient-to-r from-red-100 to-green-100';
                }
                // Hoje + Futura
                if (statuses.includes('hoje') && statuses.includes('futura')) {
                  return 'bg-gradient-to-r from-yellow-100 to-green-100';
                }
              }
              if (statuses.includes('pendente')) return 'bg-red-100';
              if (statuses.includes('hoje')) return 'bg-yellow-100';
              if (statuses.includes('futura')) return 'bg-green-100';
              return '';
            };

            return (
              <div
                key={index}
                className={`
                  relative p-2 h-12 flex items-center justify-center text-sm cursor-pointer
                  rounded-lg transition-all duration-200
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-900'}
                  ${getStatusBg()}
                ` + (isSelected ? ' border-2 border-blue-400 z-10' : '')}
                onClick={() => handleDateClick(date)}
                style={{ zIndex: isSelected ? 10 : 1 }}
              >
                <span className={`relative z-10${isToday ? ' font-bold' : ''}`}>
                  {format(date, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-100 border border-red-300" />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300" />
            <span>Hoje</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-100 border border-green-300" />
            <span>Futura</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
