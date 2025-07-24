import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Clock, Target, Timer } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayDetail {
  date: Date;
  hasActivity: boolean;
  activities: {
    subject: string;
    topic: string;
    reviewStage: string;
    time: string;
  }[];
  pomodoroSessions: number;
  totalMinutes: number;
}

interface StreakCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: any[];
  selectedDate?: Date;
}

export const StreakCalendarModal: React.FC<StreakCalendarModalProps> = ({
  isOpen,
  onClose,
  subjects,
  selectedDate
}) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(selectedDate || null);

  // Atualizar quando selectedDate mudar (quando modal abrir com nova data)
  React.useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate);
      setSelectedDay(selectedDate);
    }
  }, [selectedDate]);

  // Gerar dados do mês atual
  const generateMonthData = (month: Date): DayDetail[] => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });

    return days.map(date => {
      const activities: DayDetail['activities'] = [];
      let pomodoroSessions = 0;
      let totalMinutes = 0;

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

      // TODO: Adicionar dados do Pomodoro quando implementado
      // const pomodoroData = getPomodoroDataForDate(date);
      // pomodoroSessions = pomodoroData.sessions;
      // totalMinutes = pomodoroData.minutes;

      return {
        date,
        hasActivity: activities.length > 0,
        activities,
        pomodoroSessions,
        totalMinutes
      };
    });
  };

  const monthData = generateMonthData(currentMonth);
  const today = startOfDay(new Date());

  const getDayStatus = (day: DayDetail) => {
    if (isSameDay(day.date, today)) return 'today';
    if (day.hasActivity) return 'active';
    if (day.date > today) return 'future';
    return 'inactive';
  };



  const selectedDayData = selectedDay ? monthData.find(d => isSameDay(d.date, selectedDay)) : null;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="calendar-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Estudos
          </DialogTitle>
        </DialogHeader>
        <div id="calendar-description" className="sr-only">
          Visualize seu histórico de estudos em um calendário interativo. Clique em qualquer dia para ver as atividades realizadas.
        </div>

        <div className="space-y-6">
          {/* Calendário Compacto - Fixo no topo */}
          <div className="bg-gray-50 rounded-lg p-4">
            {/* Header do calendário */}
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h3 className="text-base font-semibold">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                disabled={isSameMonth(currentMonth, new Date())}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Dias do mês - Muito mais compacto */}
            <div className="grid grid-cols-7 gap-0.5 mb-2">
              {monthData.map((day, index) => {
                const isSelected = selectedDay && isSameDay(day.date, selectedDay);
                const status = getDayStatus(day);
                
                return (
                  <button
                    key={index}
                    className={`
                      w-6 h-6 rounded flex items-center justify-center text-xs font-medium transition-all duration-200
                      ${isSelected 
                        ? 'bg-blue-500 text-white border border-blue-600 shadow-sm' 
                        : status === 'today'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : status === 'active'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : status === 'future'
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }
                    `}
                    onClick={() => status !== 'future' ? setSelectedDay(day.date) : null}
                    disabled={status === 'future'}
                  >
                    {format(day.date, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Legenda compacta */}
            <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-100 border border-green-300 rounded"></div>
                <span>Estudou</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-50 border border-red-200 rounded"></div>
                <span>Não estudou</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Hoje</span>
              </div>
            </div>
          </div>

          {/* Lista de Revisões - Rolável */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {selectedDay ? format(selectedDay, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione um dia'}
              </h4>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {selectedDayData ? (
                selectedDayData.hasActivity ? (
                  <div className="p-4 space-y-4">
                    {/* Atividades de revisão */}
                    {selectedDayData.activities.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          Revisões realizadas ({selectedDayData.activities.length})
                        </h5>
                        <div className="space-y-2">
                          {selectedDayData.activities.map((activity, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              {/* Nome da matéria */}
                              <div className="font-medium text-gray-900 text-sm mb-1">
                                {activity.subject}
                              </div>
                              
                              {/* Nome do tópico + revisão + hora na mesma linha */}
                              <div className="flex items-center justify-between">
                                <div className="text-gray-600 text-sm">
                                  {activity.topic}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {activity.reviewStage}
                                  </span>
                                  <div className="text-gray-500 flex items-center gap-1 text-xs">
                                    <Clock className="h-3 w-3" />
                                    {activity.time}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sessões Pomodoro */}
                    {selectedDayData.pomodoroSessions > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                          <Timer className="h-4 w-4" />
                          Sessões Pomodoro
                        </h5>
                        <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                          <div className="text-sm font-medium text-purple-900">
                            {selectedDayData.pomodoroSessions} sessões completadas
                          </div>
                          <div className="text-purple-700 text-sm">
                            {selectedDayData.totalMinutes} minutos de foco
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-3">😴</div>
                    <div className="text-sm font-medium">Nenhuma atividade registrada</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Que tal estudar algo hoje?
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-3">📅</div>
                  <div className="text-sm font-medium">Clique em um dia no calendário</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Para ver as atividades realizadas
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};