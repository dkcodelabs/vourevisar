
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AnimatedTitle, GlassCard } from '@/components/ui';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReviewsData } from '@/hooks/useReviewsData';
import { ReviewsSummaryCards } from '@/components/reviews/ReviewsSummaryCards';
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

  const [filteredTopics, setFilteredTopics] = useState(topics);

  React.useEffect(() => {
    setFilteredTopics(topics);
  }, [topics]);

  return (
    <div className="container mx-auto p-2">
      <AnimatedTitle className="mb-4">Revisões</AnimatedTitle>
      
      <ReviewsSummaryCards
        delayedCount={delayedTopics.length}
        todayCount={todayTopics.length}
        futureCount={futureTopics.length}
        completedCount={completedTopics.length}
      />
      
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
            topics={filteredTopics}
            tab={tab}
            refetch={refetch}
            setFilteredTopics={setFilteredTopics}
          />
        )}
      </GlassCard>
    </div>
  );
};

export default Revisoes;
