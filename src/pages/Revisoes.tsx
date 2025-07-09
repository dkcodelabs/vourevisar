
import React, { useState } from 'react';
import { Loader2, Calendar, ListChecks, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatedTitle, GlassCard } from '@/components/ui';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReviewsData } from '@/hooks/useReviewsData';
import { ReviewsFilters } from '@/components/reviews/ReviewsFilters';
import { ReviewsTable } from '@/components/reviews/ReviewsTable';

const Revisoes = () => {
  const [tab, setTab] = useState<'hoje' | 'futuras' | 'concluido'>('hoje');
  const {
    topics,
    isLoading,
    refetch,
    searchTerm,
    setSearchTerm,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    resetFilters,
    delayedTopics,
    todayTopics,
    futureTopics,
    completedTopics
  } = useReviewsData();

  return (
    <div className="container mx-auto p-2">
      <AnimatedTitle className="mb-4">Revisões</AnimatedTitle>
      
      {/* Cards de estatísticas */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Card Hoje & Atrasadas */}
        <Card className="flex-1 min-w-[140px] max-w-[200px] shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-4">
            <Calendar className="h-6 w-6 text-orange-500 mb-1" />
            <div className="text-2xl font-bold text-orange-700">{delayedTopics.length + todayTopics.length}</div>
            <div className="text-xs text-gray-500 mt-1">Hoje & Atrasadas</div>
          </CardContent>
        </Card>

        {/* Card Futuras */}
        <Card className="flex-1 min-w-[140px] max-w-[200px] shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-4">
            <Clock className="h-6 w-6 text-blue-500 mb-1" />
            <div className="text-2xl font-bold text-blue-700">{futureTopics.length}</div>
            <div className="text-xs text-gray-500 mt-1">Futuras</div>
          </CardContent>
        </Card>

        {/* Card Concluído */}
        <Card className="flex-1 min-w-[140px] max-w-[200px] shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-4">
            <ListChecks className="h-6 w-6 text-green-500 mb-1" />
            <div className="text-2xl font-bold text-green-700">{completedTopics.length}</div>
            <div className="text-xs text-gray-500 mt-1">Concluído</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'hoje' | 'futuras' | 'concluido')}>
          <TabsList>
            <TabsTrigger value="hoje">Hoje & Atrasadas</TabsTrigger>
            <TabsTrigger value="futuras">Futuras</TabsTrigger>
            <TabsTrigger value="concluido">Concluído</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <GlassCard className="p-4 mb-4">
        <ReviewsFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setViewMode={setViewMode}
          resetFilters={resetFilters}
        />

        {viewMode === 'date' && selectedDate && (
          <div className="mb-4 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              Mostrando revisões para: <strong>{format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}</strong>
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="animate-spin h-8 w-8 text-app-blue" />
          </div>
        ) : (
          <ReviewsTable
            topics={topics}
            tab={tab}
            refetch={refetch}
          />
        )}
      </GlassCard>
    </div>
  );
};

export default Revisoes;
