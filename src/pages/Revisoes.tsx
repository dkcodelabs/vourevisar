
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-full mx-auto">
        <div className="bg-white border-b border-slate-200">
          {/* Header */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">
              Revisões
            </h1>
            
            {/* Tabs e Filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <Tabs value={tab} onValueChange={(value) => setTab(value as 'hoje' | 'futuras' | 'concluido')}>
                <TabsList className="bg-slate-100 p-1 h-auto w-fit">
                  <TabsTrigger 
                    value="hoje" 
                    className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-800 px-4 py-2 rounded transition-all relative"
                  >
                    Hoje & Atrasadas
                    {(delayedTopics.length + todayTopics.length) > 0 && (
                      <span className="ml-2 bg-slate-600 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                        {delayedTopics.length + todayTopics.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="futuras" 
                    className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-800 px-4 py-2 rounded transition-all relative"
                  >
                    Futuras
                    {futureTopics.length > 0 && (
                      <span className="ml-2 bg-slate-600 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                        {futureTopics.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="concluido" 
                    className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-800 px-4 py-2 rounded transition-all relative"
                  >
                    Concluído
                    {completedTopics.length > 0 && (
                      <span className="ml-2 bg-slate-600 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                        {completedTopics.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="flex-shrink-0">
                <ReviewsFilters
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  setViewMode={setViewMode}
                  resetFilters={resetFilters}
                />
              </div>
            </div>

            {/* Filtro de Data Ativo */}
            {viewMode === 'date' && selectedDate && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  Mostrando revisões para: <strong>{format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo da Tabela */}
        <div className="bg-white">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
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
    </div>
  );
};

export default Revisoes;
