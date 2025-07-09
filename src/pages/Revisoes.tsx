
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
    <div className="w-full">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Revisões</h1>
      </div>
      
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'hoje' | 'futuras' | 'concluido')}>
          <TabsList className="bg-gray-100">
            <TabsTrigger value="hoje" className="relative">
              Hoje & Atrasadas
              {(delayedTopics.length + todayTopics.length) > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {delayedTopics.length + todayTopics.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="futuras" className="relative">
              Futuras
              {futureTopics.length > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {futureTopics.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="concluido" className="relative">
              Concluído
              {completedTopics.length > 0 && (
                <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                  {completedTopics.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <ReviewsFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setViewMode={setViewMode}
          resetFilters={resetFilters}
        />
      </div>

      {viewMode === 'date' && selectedDate && (
        <div className="mx-6 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            Mostrando revisões para: <strong>{format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}</strong>
          </p>
        </div>
      )}

      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : (
          <ReviewsTable
            topics={topics}
            tab={tab}
            refetch={refetch}
          />
        )}
      </div>
    </div>
  );
};

export default Revisoes;
