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
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent mb-6 sm:mb-8">
              Revisões
            </h1>
            
            {/* Tabs e Filtros */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <Tabs value={tab} onValueChange={(value) => setTab(value as 'hoje' | 'futuras' | 'concluido')}>
                <TabsList className="bg-slate-100 p-1 h-auto">
                  <TabsTrigger 
                    value="hoje" 
                    className="relative text-sm font-semibold data-[state=active]:bg-slate-200 data-[state=active]:text-slate-800 px-3 sm:px-4 py-2 rounded-md transition-all"
                  >
                    <span className="hidden sm:inline">Hoje & Atrasadas</span>
                    <span className="sm:hidden">Hoje</span>
                    {(delayedTopics.length + todayTopics.length) > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                        {delayedTopics.length + todayTopics.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="futuras" 
                    className="relative text-sm font-semibold data-[state=active]:bg-slate-200 data-[state=active]:text-slate-800 px-3 sm:px-4 py-2 rounded-md transition-all"
                  >
                    Futuras
                    {futureTopics.length > 0 && (
                      <span className="ml-2 bg-blue-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                        {futureTopics.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="concluido" 
                    className="relative text-sm font-semibold data-[state=active]:bg-slate-200 data-[state=active]:text-slate-800 px-3 sm:px-4 py-2 rounded-md transition-all"
                  >
                    Concluído
                    {completedTopics.length > 0 && (
                      <span className="ml-2 bg-green-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
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

          {/* Conteúdo da Tabela */}
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <ReviewsTable
                  topics={topics}
                  tab={tab}
                  refetch={refetch}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Revisoes;