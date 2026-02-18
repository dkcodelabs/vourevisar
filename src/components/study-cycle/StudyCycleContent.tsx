import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { StudyCycleSubject, StudyCycleTopic } from '@/types/study-cycle';
import { SubjectStatus } from '@/types/study-cycle';
import { useStudyCycleData } from '@/hooks/useStudyCycleData';
import { STATUS_CONFIG } from '@/constants/study-cycle';
import { StudyCycleSubjectCard } from './StudyCycleSubjectCard';
import { GridIcon, ListIcon, ChevronsDownIcon, ChevronsUpIcon } from './Icons';
import StudyCycleTopicNotesModal from './StudyCycleTopicNotesModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import { AllStudiesCompletedBanner } from './AllStudiesCompletedBanner';
import { CycleStatsModal } from './CycleStatsModal';
// REMOVIDO DailyStudyProgress - estava causando loops infinitos
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useTopicReview } from '@/hooks/useTopicReview';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';
import { Loader2, AlertCircle, X, Target, BookOpen } from 'lucide-react';
// Removido hook de visibilidade que causava recarregamentos


const LOCAL_STORAGE_VIEW_KEY = 'studyCycleViewMode';

const CompletionMessage: React.FC<{ onStartNewCycle: () => void }> = ({ onStartNewCycle }) => {
  return (
    <div className="text-center p-8 md:p-16 bg-card rounded-2xl shadow-lg border border-emerald-500/20 flex flex-col items-center gap-6 animate-fade-in">
      <div className="text-emerald-500">
        <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.228a25.14 25.14 0 012.916.52 6.003 6.003 0 00-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>
      <h3 className="text-3xl md:text-4xl font-bold text-card-foreground">
        Parabéns!
      </h3>
      <p className="max-w-md text-base text-muted-foreground">
        Você concluiu todas as suas revisões para o ciclo de hoje. Ótimo trabalho! Descanse ou, se estiver pronto, inicie o próximo ciclo de estudos.
      </p>
      <button
        onClick={onStartNewCycle}
        className="mt-4 px-8 py-3 bg-sky-600 text-white font-bold rounded-lg transition-all duration-300 hover:bg-sky-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        Iniciar Próximo Ciclo de Estudos
      </button>
    </div>
  );
};

export const StudyCycleContent: React.FC = () => {
  // Removido hook de visibilidade problemático

  // Use the new hook for real database data
  const {
    studyCycleSubjects: subjects,
    groupedSubjects,
    areAllStudiesCompleted,
    userCycle,
    handleCompleteSession: handleCompleteSessionData,
    handleSaveNotes,
    refreshCycleData,
    isLoading
  } = useStudyCycleData();



  // Sistema controlado de eventos para evitar loops infinitos
  useEffect(() => {
    let lastUpdateTime = 0;
    const UPDATE_DEBOUNCE_TIME = 1000; // 1 segundo

    const handleCycleUpdate = (event: any) => {
      const now = Date.now();
      const eventDetail = event?.detail;

      console.log('🔄 MODAL: handleCycleUpdate disparado', {
        eventDetail,
        timestamp: new Date().toISOString()
      });

      // CRÍTICO: Não aplicar debounce para eventos de novo ciclo
      if (eventDetail?.isNewCycle) {
        console.log('📢 Novo ciclo detectado no StudyCycleContent (sem debounce)');

        // VALIDAÇÃO: Só mostrar mensagem se o ciclo realmente resetou
        // Verificar se não há matérias estudadas no ciclo (indica reset real)
        const hasStudiedSubjects = userCycle?.materias_estudadas_ciclo &&
          userCycle.materias_estudadas_ciclo.length > 0;

        console.log('🔍 Validação de novo ciclo:', {
          eventNewCycleNumber: eventDetail?.newCycleNumber,
          userCycleCiclosRealizados: userCycle?.ciclos_realizados,
          hasStudiedSubjects,
          materias_estudadas: userCycle?.materias_estudadas_ciclo
        });

        // Recarregar dados imediatamente para novo ciclo
        setTimeout(() => {
          console.log('🔄 MODAL: Executando refreshCycleData para novo ciclo');
          refreshCycleData(); // Refresh para novo ciclo
        }, 300);
        return; // Sair aqui para não aplicar debounce
      }

      // Permitir eventos de revisão de tópicos sem debounce
      const isTopicReview = eventDetail?.source === 'topicReview' || eventDetail?.type === 'topicReview';

      // Debounce apenas para eventos normais (não novo ciclo nem revisões de tópicos)
      if (!isTopicReview && now - lastUpdateTime < UPDATE_DEBOUNCE_TIME) {
        console.log('🚫 Evento cycleUpdated ignorado no StudyCycleContent - debounce ativo');
        return;
      }

      lastUpdateTime = now;
      console.log('🔄 StudyCycleContent: Processando evento cycleUpdated', { isTopicReview, eventDetail });

      // Recarregar dados após um delay (menor para revisões de tópicos)
      setTimeout(() => {
        console.log('🔄 MODAL: Executando refreshCycleData para evento normal');
        refreshCycleData(); // Refresh para eventos normais
      }, isTopicReview ? 100 : 300);
    };



    const handleForceRerender = (event: any) => {
      console.log('🔄 StudyCycleContent: Forçando re-render por evento externo', event.detail);

      // Forçar refresh imediato dos dados
      console.log('🔄 MODAL: Executando refreshCycleData em handleForceRerender');
      refreshCycleData(); // Refresh para forceRerender

      // Forçar re-render do componente mudando a key
      setForceRenderKey(prev => prev + 1);
      console.log('🔄 Força re-render aplicada - key incrementada');
    };

    window.addEventListener('cycleUpdated', handleCycleUpdate);
    window.addEventListener('forceComponentRerender', handleForceRerender);

    return () => {
      window.removeEventListener('cycleUpdated', handleCycleUpdate);
      window.removeEventListener('forceComponentRerender', handleForceRerender);
    };
  }, []); // Sem dependências para evitar loops

  // Refresh cycle data when component mounts
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        if (isMounted) {
          await refreshCycleData();
        }
      } catch (error) {
        await errorService.report(
          error,
          {
            module: 'StudyCycle',
            action: 'loadInitialData',
            userMessage: 'Erro ao carregar dados do ciclo.',
            severity: 'high',
            scope: 'core',
            userId: user?.id
          }
        );
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []); // Executar apenas uma vez quando o componente monta

  // REMOVIDO: useEffect que detectava mudanças em ciclos_realizados
  // A mensagem de novo ciclo agora é controlada APENAS pelo evento cycleUpdated
  // Isso evita que a mensagem apareça quando o ciclo já está em andamento

  // Debug logs removidos para evitar spam

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    // Sempre iniciar com visualização lista por padrão
    // Se o usuário já escolheu uma preferência, respeitar a escolha
    const savedViewMode = localStorage.getItem(LOCAL_STORAGE_VIEW_KEY);

    // Se não há preferência salva, definir 'list' como padrão e salvar
    if (!savedViewMode) {
      localStorage.setItem(LOCAL_STORAGE_VIEW_KEY, 'list');
      return 'list';
    }

    return (savedViewMode === 'grid' || savedViewMode === 'list') ? savedViewMode : 'list';
  });

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // Modal de tópicos - usando o mesmo padrão do modal de matérias
  const [topicNotesModal, setTopicNotesModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    topicId: string;
    subjectName: string;
    topicName: string;
  }>({
    isOpen: false,
    subjectId: '',
    topicId: '',
    subjectName: '',
    topicName: ''
  });
  const [subjectNotesModal, setSubjectNotesModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: '',
    subjectName: ''
  });


  const [forceRenderKey, setForceRenderKey] = useState(0);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBeforeSearch, setExpandedBeforeSearch] = useState<Set<string>>(new Set());
  // Modal removida - estado desabilitado

  // Hook para status do ciclo
  const { getCycleStats } = useCycleStatus();
  const { user } = useAuth();

  // Hook para review de tópicos (modal de dificuldade)
  const {
    openReviewModal,
    difficultyModalData,
    openDifficultyModal,
    closeDifficultyModal,
    submitDifficultyRating,
    markTopicAsReviewed
  } = useTopicReview();

  // Função para normalizar texto (remover acentos)
  const normalizeText = useCallback((text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), []);

  // Função para filtrar tópicos baseado na busca
  const filterTopicsBySearch = useCallback((topics: StudyCycleTopic[]) => {
    if (!searchQuery.trim()) return topics;

    const normalizedQuery = normalizeText(searchQuery);
    return topics.filter(topic =>
      normalizeText(topic.name).includes(normalizedQuery)
    );
  }, [searchQuery, normalizeText]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setExpandedSubjects(expandedBeforeSearch);
    setExpandedBeforeSearch(new Set());
  }, [expandedBeforeSearch]);

  // REMOVIDO hook de progresso diário - estava causando loops

  // Função para obter a posição no ciclo
  const getCyclePosition = useCallback((subjectId: string) => {
    if (!userCycle?.ciclo_atual) return null;

    // Encontrar todas as ocorrências da matéria no ciclo
    const positions: number[] = [];
    userCycle.ciclo_atual.forEach((id: string, index: number) => {
      if (id === subjectId) {
        positions.push(index + 1);
      }
    });

    return positions.length > 0 ? positions : null;
  }, [userCycle?.ciclo_atual]);

  // Função modificada para integrar com sistema de progresso diário
  const handleCompleteSessionWithProgress = useCallback(async (subjectId: string) => {
    try {
      console.log('🔄 Iniciando handleCompleteSessionWithProgress para:', subjectId);

      // 1. Preparar dados da sessão ANTES de executar a lógica original
      const subject = subjects.find(s => s.id === subjectId);
      const cyclePosition = getCyclePosition(subjectId);

      console.log('📊 Dados da sessão preparados:', {
        subject: subject?.name,
        cyclePosition,
        user: !!user
      });

      // 2. Executar lógica original do sistema
      await handleCompleteSessionData(subjectId);
      console.log('✅ handleCompleteSessionData concluído');

      // 3. Disparar eventos para atualizar componentes
      window.dispatchEvent(new CustomEvent('dailyProgressUpdated', {
        detail: { subjectId, subjectName: subject?.name || 'Matéria' }
      }));

      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: {
          subjectId,
          subjectName: subject?.name || 'Matéria',
          completed: true
        }
      }));

    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'StudyCycle',
          action: 'handleCompleteSessionWithProgress',
          userMessage: 'Erro ao completar sessão.',
          severity: 'high',
          scope: 'core',
          userId: user?.id
        }
      );
    }
  }, [handleCompleteSessionData, subjects, getCyclePosition, user]);

  // Handler para quando o checkbox é clicado - abre o modal de dificuldade
  const handleCheckboxClick = useCallback(async (topicId: string) => {
    try {
      console.log('📦 Abrindo modal de revisão via checkbox:', {
        topicId
      });

      // Usar openReviewModal ao invés de openDifficultyModal para garantir
      // que reviewCount seja calculado corretamente
      await openReviewModal(topicId);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'StudyCycle',
          action: 'handleCheckboxClick',
          userMessage: 'Erro ao abrir modal de revisão.',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
    }
  }, [openReviewModal]);



  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_VIEW_KEY, viewMode);
    setExpandedSubjects(new Set());
  }, [viewMode]);

  const handleToggleExpand = useCallback((subjectId: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  }, []);

  const allExpandableIds = useMemo(() => {
    return [
      ...(groupedSubjects[SubjectStatus.ACTIVE] || []),
      ...(groupedSubjects[SubjectStatus.COMPLETED_CYCLE] || [])
    ].map(s => s.id);
  }, [groupedSubjects]);

  const areAllExpanded = useMemo(() =>
    allExpandableIds.length > 0 && allExpandableIds.every(id => expandedSubjects.has(id)),
    [allExpandableIds, expandedSubjects]);

  const handleToggleAll = useCallback(() => {
    if (areAllExpanded) {
      setExpandedSubjects(new Set());
    } else {
      setExpandedSubjects(new Set(allExpandableIds));
    }
  }, [areAllExpanded, allExpandableIds]);

  // Use the handlers from the hook

  const handleOpenNotes = useCallback((subjectId: string, topicId: string) => {
    console.log('🔵 MODAL: handleOpenNotes chamado', { subjectId, topicId });

    // Encontrar subject e topic para pegar os nomes
    const subject = subjects.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);

    if (subject && topic) {
      setTopicNotesModal({
        isOpen: true,
        subjectId,
        topicId,
        subjectName: subject.name,
        topicName: topic.name
      });
      console.log('🔵 MODAL: Modal aberto com isOpen=true');
    } else {
      console.error('🔴 MODAL: Subject ou topic não encontrado', { subjectId, topicId, subjects: subjects.length });
    }
  }, [subjects]);

  const handleCloseNotes = useCallback(() => {
    console.log('🔴 MODAL: handleCloseNotes chamado');
    setTopicNotesModal(prev => ({ ...prev, isOpen: false }));
    console.log('🔴 MODAL: Modal fechado com isOpen=false');
  }, []);

  const handleSaveNotesWithClose = useCallback((subjectId: string, topicId: string, updatedData: Partial<StudyCycleTopic>) => {
    handleSaveNotes(subjectId, topicId, updatedData);
    handleCloseNotes();
  }, [handleSaveNotes, handleCloseNotes]);

  const handleOpenSubjectNotes = useCallback((subject: StudyCycleSubject) => {
    setSubjectNotesModal({
      isOpen: true,
      subjectId: subject.id,
      subjectName: subject.name
    });
  }, []);

  const handleOpenStatsModal = useCallback(async () => {
    try {
      const stats = await getCycleStats();
      setCurrentStats(stats);
      setShowStatsModal(true);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'StudyCycle',
          action: 'handleOpenStatsModal',
          userMessage: 'Erro ao carregar estatísticas.',
          severity: 'low',
          scope: 'core',
          userId: user?.id
        }
      );
    }
  }, [getCycleStats, user]);



  const renderSection = (status: SubjectStatus) => {
    const sectionSubjects = groupedSubjects[status] || [];
    const config = STATUS_CONFIG[status];

    if (!config || sectionSubjects.length === 0) return null;

    const isActionableSection = status === SubjectStatus.ACTIVE;

    const containerClasses = viewMode === 'grid'
      ? "grid grid-cols-1 md:grid-cols-2 gap-8"
      : "flex flex-col w-full gap-4";

    return (
      <section key={status} className="mb-12">
        {status !== SubjectStatus.ACTIVE && (
          <div className="flex items-center mb-6">
            <span className={`mr-4 text-${config.borderColor.split('-')[1]}-500`}>{config.icon}</span>
            <h2 className={`text-xl font-bold text-foreground border-b-2 ${config.borderColor} pb-2`}>
              {config.title}
            </h2>
          </div>
        )}
        <div className={containerClasses}>
          {sectionSubjects.map((subject, index) => {
            // Cada subject deve ter sua posição específica, não todas as posições
            // Posição no ciclo: Usar do objeto ou fallback para o índice + 1 se for seção ativa
            const cyclePosition = subject.cyclePosition || (status === SubjectStatus.ACTIVE ? index + 1 : null);

            return (
              <StudyCycleSubjectCard
                key={`${subject.id}-${subject.status}-${forceRenderKey}`}
                subject={subject}
                onCompleteSession={handleCompleteSessionWithProgress}
                onOpenNotes={handleOpenNotes}
                onSubjectNotesClick={() => handleOpenSubjectNotes(subject)}
                onTopicUpdate={refreshCycleData}
                isActionable={isActionableSection}
                isStudyFocus={false}
                viewMode={viewMode}
                isExpanded={expandedSubjects.has(subject.id)}
                onToggleExpand={() => handleToggleExpand(subject.id)}
                onCheckboxClick={handleCheckboxClick}
                cyclePosition={cyclePosition}
                searchQuery={searchQuery}
                filterTopicsBySearch={filterTopicsBySearch}
              />
            );
          })}
        </div>
      </section>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] w-full text-gray-900 overflow-hidden">
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Banner de Estudos Concluídos - Sempre visível quando todos estudos estão concluídos */}
        {areAllStudiesCompleted && (
          <div className="shrink-0">
            <AllStudiesCompletedBanner
              onResetComplete={() => {
                refreshCycleData(); // Refresh para reset
              }}
            />
          </div>
        )}

        <header className="mt-0 px-4 py-3 mb-4 shrink-0 bg-white rounded-2xl border border-gray-200 shadow-md mx-4 md:mx-6">
          <div className="mb-2">
            <p className="text-xs text-muted-foreground mt-0.5">Gerencie seu progresso e metas diárias</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2 items-center">
              {/* Campo de Busca */}
              <div className="relative flex-1 min-w-0 bg-gray-50/50 border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200 h-8">
                <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    const previousQuery = searchQuery;
                    setSearchQuery(query);

                    // Se está começando a buscar (antes estava vazio), salvar estado atual
                    if (!previousQuery && query.trim()) {
                      setExpandedBeforeSearch(new Set(expandedSubjects));
                    }

                    // Se há busca, expandir matérias que têm tópicos correspondentes
                    if (query.trim()) {
                      const normalizeText = (text: string) =>
                        text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

                      const normalizedQuery = normalizeText(query);
                      const newExpanded = new Set<string>();

                      subjects.forEach(subject => {
                        const hasMatchingTopic = subject.topics?.some(topic =>
                          normalizeText(topic.name).includes(normalizedQuery)
                        );
                        if (hasMatchingTopic) {
                          newExpanded.add(subject.id);
                        }
                      });

                      setExpandedSubjects(newExpanded);
                    } else {
                      // Se apagou tudo, restaurar estado anterior
                      setExpandedSubjects(expandedBeforeSearch);
                      setExpandedBeforeSearch(new Set());
                    }
                  }}
                  placeholder="Buscar..."
                  className="w-full pl-8 pr-8 py-1 text-xs md:text-sm bg-transparent border-none shadow-none focus:ring-0 placeholder:text-gray-400 h-full"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {viewMode === 'list' && (
                  <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg mr-1 h-8">
                    <button
                      onClick={handleToggleAll}
                      className="p-1 px-3 h-full rounded-md text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center min-w-[3rem]"
                      aria-label={areAllExpanded ? "Recolher Todos" : "Expandir Todos"}
                      title={areAllExpanded ? "Recolher Todos" : "Expandir Todos"}
                    >
                      {areAllExpanded ? <ChevronsUpIcon className="w-3.5 h-3.5" /> : <ChevronsDownIcon className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-lg h-8">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 px-2 h-full rounded-md transition-colors flex items-center justify-center ${viewMode === 'grid' ? 'bg-card text-sky-500 shadow' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-label="Visualização em Grade"
                  >
                    <GridIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 px-2 h-full rounded-md transition-colors flex items-center justify-center ${viewMode === 'list' ? 'bg-card text-sky-500 shadow' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-label="Visualização em Lista"
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {searchQuery && (
          <div className="px-4 md:px-8 mb-4 shrink-0 animate-in fade-in slide-in-from-top-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Filtrando por: <span className="font-bold">"{searchQuery}"</span>
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    O filtro é aplicado nos nomes dos tópicos.
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearSearch}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 shadow-sm rounded-md text-xs font-medium text-amber-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
                title="Limpar e mostrar tudo"
              >
                <X size={14} />
                Limpar
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pt-0">
          {subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="w-24 h-24 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center mb-8 shadow-inner">
                <Target className="h-12 w-12 text-sky-600 dark:text-sky-400" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Seu Ciclo Está Esperando por Você! 🎯</h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                O Ciclo de Estudos é o coração da sua preparação. Aqui você organiza suas matérias e mantém a constância necessária para a aprovação.
              </p>
              <div className="bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800 p-6 rounded-2xl mb-10 max-w-md shadow-sm">
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  "O segredo do sucesso é a constância no objetivo."
                </p>
                <p className="text-xs text-slate-500 mt-2">— Benjamin Disraeli</p>
              </div>
              <p className="text-slate-500 dark:text-slate-500 mb-8 font-medium">
                Cadastre suas matérias e tópicos para gerar seu primeiro ciclo automático.
              </p>
              <button
                onClick={() => window.location.href = '/materias'}
                className="px-10 py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
              >
                <BookOpen className="h-5 w-5" />
                Começar Agora
              </button>
            </div>
          ) : (
            <>
              {renderSection(SubjectStatus.ACTIVE)}
              {renderSection(SubjectStatus.COMPLETED_CYCLE)}
              {renderSection(SubjectStatus.FINISHED)}
            </>
          )}
        </main>
      </div>

      {/* Topic Notes Modal */}
      {
        topicNotesModal.isOpen && topicNotesModal.subjectId && topicNotesModal.topicId && (
          <StudyCycleTopicNotesModal
            isOpen={topicNotesModal.isOpen}
            onClose={handleCloseNotes}
            onSave={() => {
              // Refresh data after save
              setTimeout(() => {
                refreshCycleData(); // Refresh para salvamento
              }, 200);
            }}
            subjectId={topicNotesModal.subjectId}
            topicId={topicNotesModal.topicId}
            subjectName={topicNotesModal.subjectName}
            topicName={topicNotesModal.topicName}
          />
        )
      }

      {/* Subject Notes Modal */}
      <SubjectNotesModal
        isOpen={subjectNotesModal.isOpen}
        onClose={() => setSubjectNotesModal(prev => ({ ...prev, isOpen: false }))}
        subjectId={subjectNotesModal.subjectId}
        subjectName={subjectNotesModal.subjectName}
      />

      {/* Cycle Stats Modal */}
      <CycleStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        stats={currentStats}
      />

      {/* Difficulty Rating Modal */}
      <DifficultyRatingModal
        isOpen={difficultyModalData.isOpen}
        onClose={closeDifficultyModal}
        onSubmit={async (difficulty) => {
          try {
            await submitDifficultyRating(difficulty);
            setTimeout(() => refreshCycleData(), 500);
          } catch (error) {
            await errorService.report(
              error,
              {
                module: 'StudyCycle',
                action: 'DifficultyRatingModal.onSubmit',
                userMessage: 'Erro ao salvar avaliação de dificuldade.',
                severity: 'medium',
                scope: 'core',
                userId: user?.id
              }
            );
          }
        }}
        onConfirmReview={difficultyModalData.reviewCount > 0 ? async (difficulty) => {
          try {
            await markTopicAsReviewed(difficultyModalData.topicId, difficulty);
            closeDifficultyModal();
            setTimeout(() => refreshCycleData(), 500);
          } catch (error) {
            await errorService.report(
              error,
              {
                module: 'StudyCycle',
                action: 'DifficultyRatingModal.onConfirmReview',
                userMessage: 'Erro ao salvar revisão.',
                severity: 'medium',
                scope: 'core',
                userId: user?.id
              }
            );
          }
        } : undefined}
        topicName={difficultyModalData.topicName}
        subjectName={difficultyModalData.subjectName}
        initialDifficulty={difficultyModalData.currentDifficulty}
        reviewStage={difficultyModalData.reviewStage}
        reviewCount={difficultyModalData.reviewCount}
        isCompleting={difficultyModalData.isCompleting}
      />

    </div >
  );
};

export default StudyCycleContent;