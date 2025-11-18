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
import { toast } from 'sonner';
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
    sessionMarks,
    userCycle,
    handleToggleMark,
    handleCompleteSession: handleCompleteSessionData,
    handleSaveNotes,
    refreshCycleData
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
        console.error('Erro ao carregar dados do ciclo:', error);
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
      const topicsStudied = Array.from(sessionMarks[subjectId] || []);

      console.log('📊 Dados da sessão preparados:', {
        subject: subject?.name,
        cyclePosition,
        topicsStudied: topicsStudied.length,
        user: !!user
      });

      // 2. Salvar sessão no sistema de progresso diário SEMPRE (mesmo se pulou)
      if (subject && user) {
        const sessionData = {
          subjectId: subject.id,
          subjectName: subject.name,
          cyclePosition: cyclePosition?.[0] || 1,
          topicsStudied, // Pode ser vazio se pulou a matéria
          completedAt: new Date().toISOString()
        };

        console.log('💾 Salvando sessão no progresso diário:', {
          ...sessionData,
          topicsCount: topicsStudied.length,
          isPulada: topicsStudied.length === 0
        });

        // TODO: Implementar saveStudySession quando necessário
        console.log('💾 Dados da sessão preparados para salvar:', sessionData);
      } else {
        console.warn('⚠️ Sessão não salva - dados insuficientes:', {
          subject: !!subject,
          user: !!user
        });
      }

      // 3. Executar lógica original do sistema (que limpa os marks)
      await handleCompleteSessionData(subjectId);
      console.log('✅ handleCompleteSessionData concluído');

      // 4. Disparar eventos para atualizar componentes
      window.dispatchEvent(new CustomEvent('dailyProgressUpdated', {
        detail: { subjectId, subjectName: subject?.name || 'Matéria' }
      }));

      window.dispatchEvent(new CustomEvent('cycleUpdated', {
        detail: {
          subjectId,
          subjectName: subject?.name || 'Matéria',
          topicsStudied: topicsStudied.length,
          completed: true
        }
      }));

    } catch (error) {
      console.error('❌ Erro ao completar sessão com progresso:', error);
      toast.error('Erro ao completar sessão');
    }
  }, [handleCompleteSessionData, subjects, getCyclePosition, sessionMarks, user]);



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

  const handleExpandAll = useCallback(() => {
    const expandableSubjects = [
      ...(groupedSubjects[SubjectStatus.ACTIVE] || []),
      ...(groupedSubjects[SubjectStatus.COMPLETED_CYCLE] || [])
    ];
    const allIds = expandableSubjects.map(s => s.id);
    setExpandedSubjects(new Set(allIds));
  }, [groupedSubjects]);

  const handleCollapseAll = useCallback(() => {
    setExpandedSubjects(new Set());
  }, []);

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
    const stats = await getCycleStats();
    setCurrentStats(stats);
    setShowStatsModal(true);
  }, [getCycleStats]);



  const renderSection = (status: SubjectStatus) => {
    const sectionSubjects = groupedSubjects[status] || [];
    const config = STATUS_CONFIG[status];

    if (!config || sectionSubjects.length === 0) return null;

    const isActionableSection = status === SubjectStatus.ACTIVE;

    const containerClasses = viewMode === 'grid'
      ? "grid grid-cols-1 md:grid-cols-2 gap-8"
      : "flex flex-col items-center gap-4";

    return (
      <section key={status} className="mb-12">
        <div className="flex items-center mb-6">
          <span className={`mr-4 text-${config.borderColor.split('-')[1]}-500`}>{config.icon}</span>
          <h2 className={`text-xl font-bold text-foreground border-b-2 ${config.borderColor} pb-2`}>
            {config.title}
          </h2>
        </div>
        <div className={containerClasses}>
          {sectionSubjects.map((subject, index) => {
            // Cada subject deve ter sua posição específica, não todas as posições
            const cyclePosition = subject.cyclePosition || null;
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
                markedTopicIds={sessionMarks[subject.id] || new Set()}
                onToggleMark={(topicId) => handleToggleMark(subject.id, topicId)}
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="container mx-auto p-4 md:p-8 pr-[calc(1rem+15px)] md:pr-[calc(2rem+15px)]">
        {/* Banner de Estudos Concluídos - Sempre visível quando todos estudos estão concluídos */}
        {areAllStudiesCompleted && (
          <AllStudiesCompletedBanner
            onResetComplete={() => {
              refreshCycleData(); // Refresh para reset
            }}
          />
        )}



        {/* Card de Progresso Diário REMOVIDO - estava causando loops */}





        <div className="flex justify-between items-center mb-6">
          {/* Campo de Busca */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                placeholder="Buscar tópico..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    // Restaurar estado anterior
                    setExpandedSubjects(expandedBeforeSearch);
                    setExpandedBeforeSearch(new Set());
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'list' && (
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mr-2">
                <button
                  onClick={handleExpandAll}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Expandir Todos"
                >
                  <ChevronsDownIcon />
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Recolher Todos"
                >
                  <ChevronsUpIcon />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-card text-sky-500 shadow' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Visualização em Grade"
              >
                <GridIcon />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card text-sky-500 shadow' : 'text-muted-foreground hover:text-foreground'}`}
                aria-label="Visualização em Lista"
              >
                <ListIcon />
              </button>
            </div>
          </div>
        </div>

        <>
          {/* Verificar se todas as matérias ativas foram estudadas no ciclo atual */}
          {/* Mensagem removida para evitar confusão */}

          {renderSection(SubjectStatus.ACTIVE)}
          {renderSection(SubjectStatus.COMPLETED_CYCLE)}
          {renderSection(SubjectStatus.FINISHED)}
        </>

      </main>

      {/* Topic Notes Modal */}
      {topicNotesModal.isOpen && topicNotesModal.subjectId && topicNotesModal.topicId && (
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
      )}

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

    </div>
  );
};

export default StudyCycleContent;