
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReviewsData } from '@/hooks/useReviewsData';
import { ReviewsFilters } from '@/components/reviews/ReviewsFilters';
import { ReviewsTable } from '@/components/reviews/ReviewsTable';
import { ReviewsGroupedNew } from '@/components/reviews/ReviewsGroupedNew';
import { ReviewsBulkActions } from '@/components/reviews/ReviewsBulkActions';
import { useApp } from '@/contexts/AppContext';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import NotesModal from '@/components/reviews/NotesModal';
import { useSearchParams } from 'react-router-dom';

const Revisoes = () => {
  const [tab, setTab] = useState<'hoje' | 'futuras' | 'concluido'>('hoje');
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [highlightedTopic, setHighlightedTopic] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [notesModalData, setNotesModalData] = useState<{
    isOpen: boolean;
    topicId: string;
    topicName: string;
    subjectName: string;
  }>({
    isOpen: false,
    topicId: '',
    topicName: '',
    subjectName: ''
  });

  const { subjects, refreshData } = useApp();
  const { markTopicAsReviewed, isLoading: isMarkingReviewed } = useStudyPlanLogic();
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

  // Efeito para detectar parâmetros da URL e expandir matéria automaticamente
  useEffect(() => {
    const subjectId = searchParams.get('subject');
    const topicId = searchParams.get('topic');
    const shouldHighlight = searchParams.get('highlight') === 'true';

    if (subjectId && subjects.length > 0) {
      // Expandir a matéria automaticamente
      setExpandedSubjects(prev => {
        if (!prev.includes(subjectId)) {
          return [...prev, subjectId];
        }
        return prev;
      });

      // Se deve destacar um tópico específico
      if (topicId && shouldHighlight) {
        setHighlightedTopic(topicId);
        
        // Remover o destaque após 3 piscadas (6 segundos)
        setTimeout(() => {
          setHighlightedTopic(null);
          // Limpar os parâmetros da URL sem adicionar ao histórico
          setSearchParams({}, { replace: true });
        }, 6000);
      }
    }
  }, [searchParams, subjects, setSearchParams]);

  // Handlers para expandir/colapsar
  const handleExpandAll = () => {
    const allSubjectIds = subjects.map(s => s.id);
    setExpandedSubjects(allSubjectIds);
  };

  const handleCollapseAll = () => {
    setExpandedSubjects([]);
  };

  const allExpanded = expandedSubjects.length === subjects.length;

  const handleShowStatistics = () => {
    // Navegar para estatísticas (funcionalidade já existente)
    window.location.href = '/estatisticas';
  };

  // Calcular contadores para a aba atual
  const getCurrentTabCount = () => {
    switch (tab) {
      case 'hoje':
        return delayedTopics.length + todayTopics.length;
      case 'futuras':
        return futureTopics.length;
      case 'concluido':
        return completedTopics.length;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        {/* Removido o título principal */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          className="mb-8"
        >

        </motion.div> */}
        <div className="space-y-6 max-w-full">
          <div className="max-w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 overflow-x-hidden">
            <div className="border-b border-slate-200">
              {/* Header */}
              <div className="py-6">


                {/* Tabs e Filtros */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <Tabs value={tab} onValueChange={(value) => setTab(value as 'hoje' | 'futuras' | 'concluido')}>
                    <TabsList className="bg-slate-100 p-1 h-auto w-full sm:w-fit overflow-x-auto flex-nowrap">
                      <TabsTrigger
                        value="hoje"
                        className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-800 px-4 py-2 rounded transition-all relative"
                      >
                        <div className="flex items-center gap-2">
                          <span>Hoje</span>
                          <span className="bg-orange-500 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                            {todayTopics.length || 0}
                          </span>
                          <span>&</span>
                          <span>Atrasadas</span>
                          <span className="bg-red-500 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                            {delayedTopics.length || 0}
                          </span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger
                        value="futuras"
                        className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-800 px-4 py-2 rounded transition-all relative"
                      >
                        Futuras
                        <span className="ml-2 bg-blue-500 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                          {futureTopics.length || 0}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="concluido"
                        className="text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-800 px-4 py-2 rounded transition-all relative"
                      >
                        Concluído
                        <span className="ml-2 bg-green-500 text-white text-xs font-medium rounded-full px-2 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
                          {completedTopics.length || 0}
                        </span>
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

            {/* Ações em Lote */}
            <ReviewsBulkActions
              totalCount={getCurrentTabCount()}
              onShowStatistics={handleShowStatistics}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              allExpanded={allExpanded}
              tab={tab}
            />

            {/* Conteúdo Agrupado */}
            <div className="bg-white rounded-lg">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
                </div>
              ) : (
                <ReviewsGroupedNew
                  subjects={subjects}
                  tab={tab}
                  expandedSubjects={expandedSubjects}
                  searchTerm={searchTerm}
                  highlightedTopic={highlightedTopic}
                  onToggleExpanded={(subjectId) => {
                    setExpandedSubjects(prev =>
                      prev.includes(subjectId)
                        ? prev.filter(id => id !== subjectId)
                        : [...prev, subjectId]
                    );
                  }}
                  onMarkReviewed={async (subjectId, topicId) => {
                    try {
                      await markTopicAsReviewed(topicId);
                      // Toast já é chamado dentro do markTopicAsReviewed, não duplicar aqui
                      setTimeout(async () => {
                        await refreshData();
                        refetch();
                      }, 500);
                    } catch (error) {
                      console.error('Erro ao marcar tópico como revisado:', error);
                      toast.error('Erro ao marcar tópico como revisado', {
                        id: `review-error-${topicId}`,
                        duration: 4000,
                      });
                    }
                  }}
                  onAddNote={(subjectId, topicId) => {
                    // Encontrar o tópico e matéria para o modal
                    const subject = subjects.find(s => s.id === subjectId);
                    const topic = subject?.topics.find(t => t.id === topicId);

                    if (subject && topic) {
                      setNotesModalData({
                        isOpen: true,
                        topicId: topicId,
                        topicName: topic.name,
                        subjectName: subject.name
                      });
                    }
                  }}
                  onEditTopic={(subjectId, topicId) => {
                    // Navegar para a página de tópicos da matéria
                    window.location.href = `/materias/${subjectId}/topicos`;
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Notas */}
      <NotesModal
        isOpen={notesModalData.isOpen}
        onClose={() => {
          setNotesModalData(prev => ({ ...prev, isOpen: false }));
          // Refresh both the reviews data and the main app context data
          setTimeout(async () => {
            await refreshData();
            refetch();
          }, 200);
        }}
        onSave={() => {
          setNotesModalData(prev => ({ ...prev, isOpen: false }));
          // Refresh both the reviews data and the main app context data
          setTimeout(async () => {
            await refreshData();
            refetch();
          }, 200);
        }}
        topicId={notesModalData.topicId}
        topicName={notesModalData.topicName}
        subjectName={notesModalData.subjectName}
      />
    </div>
  );
};

export default Revisoes;
