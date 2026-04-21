import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight, Target, AlertCircle, CheckCircle2, Award, Users, RotateCcw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subject } from '@/types';
import { useUserSettings } from '@/hooks/useUserSettings';

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
  const [viewMode, setViewMode] = useState<'month' | 'all'>('month');
  const { settings, getProfileInfo, getCycleStats } = useUserSettings();

  // Gerar dias do calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = startOfDay(new Date());

  // Calcular estatísticas do mês
  const calculateMonthStats = () => {
    let reviewsCompleted = 0; // Revisões já realizadas (não conta primeiro contato)
    const activeDaysSet = new Set<string>();
    const firstContactTopicIds = new Set<string>(); // IDs dos tópicos com first_contact no histórico

    console.log('📊 Debug - reviewData total:', reviewData.length);
    console.log('📊 Debug - Mês atual:', format(monthStart, 'yyyy-MM'), 'até', format(monthEnd, 'yyyy-MM-dd'));

    // Contar usando reviewData (histórico real de revisões)
    reviewData.forEach(review => {
      const reviewDate = new Date(review.reviewed_at);
      if (reviewDate >= monthStart && reviewDate <= monthEnd) {
        activeDaysSet.add(format(reviewDate, 'yyyy-MM-dd'));

        console.log('📊 Review:', {
          stage: review.review_stage,
          date: format(reviewDate, 'yyyy-MM-dd HH:mm'),
          topic: review.topic_name
        });

        if (review.review_stage === 'first_contact' || review.review_stage === 'Primeiro Contato') {
          firstContactTopicIds.add(review.topic_id);
        } else {
          // Qualquer revisão que não seja primeiro contato (24h, 7d, 15d, 30d, Concluído)
          reviewsCompleted++;
        }
      }
    });

    // HÍBRIDO: Contar tópicos com first_studied_at no mês que NÃO estão no histórico
    let firstContactsFromTopics = 0;
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        if (topic.first_studied_at || topic.firstStudiedAt) {
          const firstStudyDate = new Date(topic.first_studied_at || topic.firstStudiedAt);
          const firstStudyDay = startOfDay(firstStudyDate);

          // Se está no mês E não está no histórico, contar
          if (firstStudyDay >= monthStart && firstStudyDay <= monthEnd) {
            if (!firstContactTopicIds.has(topic.id)) {
              console.log('📚 First contact do tópico (não no histórico):', topic.name, format(firstStudyDate, 'yyyy-MM-dd'));
              firstContactsFromTopics++;
            }
          }
        }
      });
    });

    const firstContacts = firstContactTopicIds.size + firstContactsFromTopics;
    console.log('📊 First contacts:', {
      doHistorico: firstContactTopicIds.size,
      dosTopicos: firstContactsFromTopics,
      total: firstContacts
    });

    console.log('📊 Resultado:', { firstContacts, reviewsCompleted });

    // Contar revisões agendadas APENAS DO MÊS ATUAL
    let overdueCount = 0;
    let todayReviewCount = 0;
    let futureReviewCount = 0;

    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        // Só contar tópicos já iniciados (excluir Não Iniciados)
        const wasStudied = !!(topic.firstStudiedAt || topic.first_studied_at);
        if (!wasStudied || !topic.nextReview) return;
        const reviewDate = startOfDay(new Date(topic.nextReview));

        // Filtrar apenas revisões do mês atual
        if (reviewDate >= monthStart && reviewDate <= monthEnd) {
          if (reviewDate < today) {
            overdueCount++;
          } else if (isSameDay(reviewDate, today)) {
            todayReviewCount++;
          } else {
            futureReviewCount++;
          }
        }
      });
    });

    const totalDaysInMonth = days.length;
    const activeDays = activeDaysSet.size;
    const activityRate = totalDaysInMonth > 0 ? Math.round((activeDays / totalDaysInMonth) * 100) : 0;

    return {
      firstContacts,
      reviewsCompleted,
      overdueCount,
      todayReviewCount,
      futureReviewCount,
      totalReviews: overdueCount + todayReviewCount + futureReviewCount, // Apenas revisões agendadas
      activeDays,
      totalDaysInMonth,
      activityRate
    };
  };

  const monthStats = calculateMonthStats();

  // Obter informações do perfil e ciclo
  const profileInfo = getProfileInfo();
  const cycleStats = getCycleStats();

  // Função para determinar o status de um dia
  const getDayInfo = (day: Date) => {
    const dayStart = startOfDay(day);
    let hasActivity = false;
    let overdueCount = 0;
    let todayCount = 0;
    let futureCount = 0;

    // Verificar se teve atividade (histórico)
    reviewData.forEach(review => {
      const reviewDate = startOfDay(new Date(review.reviewed_at));
      if (isSameDay(reviewDate, dayStart)) {
        hasActivity = true;
      }
    });

    // Verificar revisões agendadas
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        // Só contar tópicos já iniciados (excluir Não Iniciados)
        const wasStudied = !!(topic.firstStudiedAt || topic.first_studied_at);
        if (!wasStudied || !topic.nextReview) return;
        const reviewDate = startOfDay(new Date(topic.nextReview));

        if (isSameDay(reviewDate, dayStart)) {
          if (dayStart < today) {
            overdueCount++;
          } else if (isSameDay(dayStart, today)) {
            todayCount++;
          } else {
            futureCount++;
          }
        }
      });
    });

    return {
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

  // Calcular estatísticas gerais (todos os tempos)
  const calculateAllTimeStats = () => {
    let reviewsCompleted = 0;
    const allDaysSet = new Set<string>();
    const firstContactTopicIds = new Set<string>(); // IDs dos tópicos com first_contact no histórico

    console.log('📊 GERAL - reviewData total:', reviewData.length);

    reviewData.forEach(review => {
      const reviewDate = new Date(review.reviewed_at);
      allDaysSet.add(format(reviewDate, 'yyyy-MM-dd'));

      if (review.review_stage === 'first_contact' || review.review_stage === 'Primeiro Contato') {
        console.log('📚 First contact encontrado:', review.topic_name, format(reviewDate, 'yyyy-MM-dd'));
        firstContactTopicIds.add(review.topic_id);
      } else {
        reviewsCompleted++;
      }
    });

    // HÍBRIDO: Contar tópicos com first_studied_at que NÃO estão no histórico
    let firstContactsFromTopics = 0;
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        if (topic.first_studied_at || topic.firstStudiedAt) {
          // Se não está no histórico, contar
          if (!firstContactTopicIds.has(topic.id)) {
            console.log('📚 First contact do tópico (não no histórico):', topic.name);
            firstContactsFromTopics++;
          }
        }
      });
    });

    const firstContacts = firstContactTopicIds.size + firstContactsFromTopics;
    console.log('📊 GERAL - Resultado:', {
      doHistorico: firstContactTopicIds.size,
      dosTopicos: firstContactsFromTopics,
      total: firstContacts,
      reviewsCompleted,
      totalReviews: reviewData.length
    });

    // Contar revisões agendadas (futuras + atrasadas)
    let overdueCount = 0;
    let todayReviewCount = 0;
    let futureReviewCount = 0;

    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        // Só contar tópicos já iniciados (excluir Não Iniciados)
        const wasStudied = !!(topic.firstStudiedAt || topic.first_studied_at);
        if (!wasStudied || !topic.nextReview) return;
        const reviewDate = startOfDay(new Date(topic.nextReview));

        if (reviewDate < today) {
          overdueCount++;
        } else if (isSameDay(reviewDate, today)) {
          todayReviewCount++;
        } else {
          futureReviewCount++;
        }
      });
    });

    return {
      firstContacts,
      reviewsCompleted,
      overdueCount,
      futureReviewCount,
      totalReviews: overdueCount + todayReviewCount + futureReviewCount, // Apenas revisões agendadas
      totalActiveDays: allDaysSet.size
    };
  };

  const allTimeStats = calculateAllTimeStats();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr,1fr] gap-4">
          {/* Card do Calendário */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-blue-600" />
                Visão Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                  const isFuture = day > today;

                  // Só marcar como "estudou" se teve atividade E não é futuro
                  const showAsStudied = dayInfo.hasActivity && !isFuture;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => onDayClick && onDayClick(day)}
                      className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all duration-200 relative
                      ${isToday
                          ? 'bg-blue-50 text-blue-700 border-2 border-blue-500 font-semibold shadow-sm'
                          : showAsStudied
                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:shadow-sm'
                            : 'bg-gray-50 text-gray-400 border border-gray-100'
                        }
                    `}
                    >
                      <span>{format(day, 'd')}</span>

                      {/* Mostrar bolinhas para revisões agendadas */}
                      {dayInfo.hasFutureReviews && (
                        <div className="flex gap-0.5 mt-1">
                          {dayInfo.overdueCount > 0 && (
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                          )}
                          {dayInfo.todayCount > 0 && (
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                          )}
                          {dayInfo.futureCount > 0 && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
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
                  <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
                  <span className="text-gray-600">Estudou</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span className="text-gray-600">Atrasada</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span className="text-gray-600">Hoje</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-600">Futura</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Estatísticas */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-blue-600" />
                  Estatísticas
                </CardTitle>

                <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${viewMode === 'month'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Mês
                  </button>
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${viewMode === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Geral
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {viewMode === 'month' ? (
                  <>
                    {/* Aba Mês */}
                    {/* 1. Tópicos Iniciados */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📚</span>
                        <span className="text-xs font-medium text-gray-700">Tópicos Iniciados</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">{monthStats.firstContacts}</span>
                    </div>

                    {/* 2. Revisões Realizadas */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-700">Revisões Realizadas</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">{monthStats.reviewsCompleted}</span>
                    </div>

                    {/* 3. Revisões para Hoje */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-yellow-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📅</span>
                        <span className="text-xs font-medium text-gray-700">Revisões para Hoje</span>
                      </div>
                      <span className="text-lg font-bold text-yellow-600">{monthStats.todayReviewCount}</span>
                    </div>

                    {/* 4. Revisões Atrasadas */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-red-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-gray-700">Revisões Atrasadas</span>
                      </div>
                      <span className="text-lg font-bold text-red-600">{monthStats.overdueCount}</span>
                    </div>

                    {/* 5. Revisões Futuras */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔮</span>
                        <span className="text-xs font-medium text-gray-700">Revisões Futuras</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">{monthStats.futureReviewCount}</span>
                    </div>

                    {/* 6. Total de Revisões */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📊</span>
                        <span className="text-xs font-medium text-gray-700">Total de Revisões</span>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">{monthStats.totalReviews}</span>
                    </div>

                    {/* 7. Dias Ativos */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-teal-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">✅</span>
                        <span className="text-xs font-medium text-gray-700">Dias Ativos</span>
                      </div>
                      <span className="text-lg font-bold text-teal-600">{monthStats.activeDays}/{monthStats.totalDaysInMonth}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Aba Geral */}
                    {/* 1. Tópicos Iniciados */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📚</span>
                        <span className="text-xs font-medium text-gray-700">Tópicos Iniciados</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">{allTimeStats.firstContacts}</span>
                    </div>

                    {/* 2. Revisões Realizadas */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-700">Revisões Realizadas</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">{allTimeStats.reviewsCompleted}</span>
                    </div>

                    {/* 3. Média diária */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📈</span>
                        <span className="text-xs font-medium text-gray-700">Média diária</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">
                        {allTimeStats.totalActiveDays === 0
                          ? '0'
                          : Math.round((allTimeStats.firstContacts + allTimeStats.reviewsCompleted) / allTimeStats.totalActiveDays)
                        }
                      </span>
                    </div>

                    {/* 5. Revisões Atrasadas */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-red-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-medium text-gray-700">Revisões Atrasadas</span>
                      </div>
                      <span className="text-lg font-bold text-red-600">{allTimeStats.overdueCount}</span>
                    </div>

                    {/* 6. Revisões Futuras */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔮</span>
                        <span className="text-xs font-medium text-gray-700">Revisões Futuras</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">{allTimeStats.futureReviewCount}</span>
                    </div>

                    {/* 7. Total de Revisões */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📊</span>
                        <span className="text-xs font-medium text-gray-700">Total de Revisões</span>
                      </div>
                      <span className="text-lg font-bold text-indigo-600">{allTimeStats.totalReviews}</span>
                    </div>

                    {/* 8. Dias Ativos */}
                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 hover:border-teal-300 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-base">✅</span>
                        <span className="text-xs font-medium text-gray-700">Dias Ativos</span>
                      </div>
                      <span className="text-lg font-bold text-teal-600">{allTimeStats.totalActiveDays}</span>
                    </div>
                  </>
                )}

                {/* Informações Adicionais */}
                <div className="pt-4 border-t border-gray-200 space-y-2.5">
                  {/* Perfil */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Perfil:</span>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      {profileInfo?.profileName || 'Carregando...'}
                    </Badge>
                  </div>

                  {/* Matérias por dia */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Matérias por dia:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {settings?.subjects_per_day || 3}
                    </Badge>
                  </div>

                  {/* Ciclos completos */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Ciclos completos:</span>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      {cycleStats?.completedCycles || 0}
                    </Badge>
                  </div>

                  {/* Intervalos de Revisão */}
                  {profileInfo && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-600 mb-1">
                        <strong>Intervalos:</strong>
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
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};
