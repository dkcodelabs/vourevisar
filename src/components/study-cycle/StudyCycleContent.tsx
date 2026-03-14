import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useEditalOrigins } from '@/hooks/useEditalOrigins';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import { toast } from '@/lib/toast';
import { errorService } from '@/lib/errors/errorService';
import { Loader2, AlertCircle, X, Target, BookOpen, Database, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const navigate = useNavigate();

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

  const { editaisNoCiclo, refresh: refreshOrigins } = useEditalOrigins();
  const [unloadingEditalId, setUnloadingEditalId] = useState<string | null>(null);
  const [unloadConfirm, setUnloadConfirm] = useState<{
    isOpen: boolean;
    editalId: string | null;
    editalName: string | null;
    subjectIds: string[];
  }>({
    isOpen: false,
    editalId: null,
    editalName: null,
    subjectIds: []
  });

  const handleUnloadCycle = async (editalId: string, editalName: string, subjectIds: string[]) => {
    if (!user) return;
    setUnloadingEditalId(editalId);
    try {
      const { data: existingCycle } = await supabase
        .from('user_cycles')
        .select('id, ciclo_atual')
        .eq('user_id', user.id)
        .single();

      if (existingCycle) {
        const currentIds = (existingCycle.ciclo_atual as string[]) || [];
        const newIds = currentIds.filter(id => !subjectIds.includes(id));

        const { error } = await supabase
          .from('user_cycles')
          .update({
            ciclo_atual: newIds,
            atualizado_em: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      }

      const { error: editalErr } = await (supabase as any)
        .from('user_editais')
        .update({ merged_into_cycle: false, active_subject_ids: [] })
        .eq('id', editalId);

      if (editalErr) throw editalErr;

      toast.success(`"${editalName}" removido do seu ciclo.`);
      window.dispatchEvent(new CustomEvent('subjectUpdated'));
      await refreshCycleData();
      await refreshOrigins();
    } catch (error) {
      errorService.report(error, { module: 'StudyCycle', action: 'unloadCycle', userMessage: 'Erro ao remover edital do ciclo.' });
    } finally {
      setUnloadingEditalId(null);
    }
  };



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
    let sectionSubjects = groupedSubjects[status] || [];

    // Filtragem de busca
    if (searchQuery.trim()) {
      const normalizeText = (text: string) =>
        text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const normalizedQuery = normalizeText(searchQuery);

      sectionSubjects = sectionSubjects.filter(subject => {
        const matchesSubject = normalizeText(subject.name).includes(normalizedQuery);
        const hasMatchingTopic = subject.topics?.some(topic =>
          normalizeText(topic.name).includes(normalizedQuery)
        );
        return matchesSubject || hasMatchingTopic;
      });
    }

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
    <div className="flex flex-col flex-1 w-full text-zinc-100">
      <div className="flex-1 flex flex-col relative">
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

        {subjects.length === 0 ? (
          <main className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden">
            <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/20 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Target className="h-8 w-8 text-sky-600 dark:text-sky-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">Seu Ciclo Está Esperando por Você! 🎯</h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto leading-relaxed text-center">
              O Ciclo de Estudos é o coração da sua preparação. Aqui você organiza suas matérias e mantém a constância necessária para a aprovação.
            </p>
            <div className="bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800 p-4 rounded-xl mb-6 max-w-sm shadow-sm text-center">
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium italic">
                "O segredo do sucesso é a constância no objetivo."
              </p>
              <p className="text-[10px] text-slate-500 mt-1">— Benjamin Disraeli</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-500 mb-6 font-medium text-center">
              Cadastre suas matérias e tópicos para gerar seu primeiro ciclo automático.
            </p>
            <button
              onClick={() => navigate('/meus-editais')}
              className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 text-sm"
            >
              <BookOpen className="h-4 w-4" />
              Começar Agora
            </button>
          </main>
        ) : (
          <>
            <header className="mt-0 px-4 mb-4 shrink-0 bg-zinc-900 border border-white/5 shadow-2xl mx-4 md:mx-6 rounded-3xl p-5 transition-all duration-300">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col flex-1">
                  <p className="text-[10px] text-content-muted font-bold uppercase tracking-widest mb-2 pl-1">Gerencie seu progresso e metas diárias</p>
                  
                  <div className="flex flex-row gap-3 items-center">
                    {/* Campo de Busca */}
                    <div className="relative flex-1 min-w-0 bg-deep-slate border border-white/5 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all duration-300 h-11 flex items-center px-4">
                      <Search className="h-4 w-4 text-content-muted shrink-0" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          const previousQuery = searchQuery;
                          setSearchQuery(val);

                          if (!previousQuery && val.trim()) {
                            setExpandedBeforeSearch(new Set(expandedSubjects));
                          }

                          if (val.trim()) {
                            const newExpanded = new Set(expandedSubjects);
                            subjects.forEach(s => {
                              if (s.name.toLowerCase().includes(val.toLowerCase()) || 
                                  s.topics?.some(t => t.name.toLowerCase().includes(val.toLowerCase()))) {
                                newExpanded.add(s.id);
                              }
                            });
                            setExpandedSubjects(newExpanded);
                          } else {
                            setExpandedSubjects(expandedBeforeSearch);
                            setExpandedBeforeSearch(new Set());
                          }
                        }}
                        placeholder="Buscar..."
                        className="w-full bg-transparent border-none shadow-none focus:ring-0 text-zinc-100 placeholder:text-content-muted/50 h-full text-sm pl-3"
                      />
                      {searchQuery && (
                        <button
                          onClick={handleClearSearch}
                          className="text-content-muted hover:text-zinc-100 p-1 hover:bg-white/5 rounded-full transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {viewMode === 'list' && (
                        <div className="flex items-center gap-0.5 p-1 bg-deep-slate rounded-xl h-11 border border-white/5">
                          <button
                            onClick={handleToggleAll}
                            className="p-1.5 px-4 h-full rounded-lg text-content-muted hover:text-zinc-100 hover:bg-white/5 transition-colors flex items-center justify-center"
                            aria-label={areAllExpanded ? "Recolher Todos" : "Expandir Todos"}
                            title={areAllExpanded ? "Recolher Todos" : "Expandir Todos"}
                          >
                            {areAllExpanded ? <ChevronsUpIcon className="w-4 h-4" /> : <ChevronsDownIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-1 p-1 bg-deep-slate rounded-xl h-11 border border-white/5">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-1.5 px-3 h-full rounded-lg transition-all flex items-center justify-center shrink-0 ${viewMode === 'grid' ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10' : 'text-content-muted hover:text-zinc-100 hover:bg-white/5'}`}
                          aria-label="Visualização em Grade"
                        >
                          <GridIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-1.5 px-3 h-full rounded-lg transition-all flex items-center justify-center shrink-0 ${viewMode === 'list' ? 'bg-primary/20 text-primary shadow-lg shadow-primary/10' : 'text-content-muted hover:text-zinc-100 hover:bg-white/5'}`}
                          aria-label="Visualização em Lista"
                        >
                          <ListIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>
            
            {/* ── Header: Editais Ativos no Ciclo ── */}
            {(() => {
              const activeEditais = editaisNoCiclo.filter(e =>
                e.subject_ids.some(sid => subjects.find(s => s.originalId === sid))
              );
              if (activeEditais.length === 0) return null;
              return (
                <div className="px-4 md:px-6 mb-6">
                  <div className="p-4 rounded-2xl bg-zinc-900 border border-white/5 shadow-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Database className="text-primary" size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-zinc-100 uppercase tracking-widest leading-none">Editais no Ciclo Ativo</h3>
                          <p className="text-[10px] text-content-muted font-medium mt-1">As matérias destes editais estão disponíveis para estudo no Ciclo</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-content-muted bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        {activeEditais.length} edital{activeEditais.length !== 1 ? 'is' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeEditais.map(edital => {
                        const activeCount = edital.subject_ids.filter(sid => subjects.find(s => s.originalId === sid)).length;
                        return (
                          <div
                            key={edital.id}
                            className="group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-zinc-800 border border-white/5 hover:border-primary/30 transition-all shadow-sm"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-200">{edital.name}</span>
                              <span className="text-[9px] text-content-muted font-medium">{activeCount} matéria{activeCount !== 1 ? 's' : ''}</span>
                            </div>
                            <button
                              onClick={() => setUnloadConfirm({ 
                                isOpen: true, 
                                editalId: edital.id, 
                                editalName: edital.name, 
                                subjectIds: edital.subject_ids 
                              })}
                              disabled={unloadingEditalId === edital.id}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/20 text-content-muted hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100"
                              title="Remover do ciclo"
                            >
                              {unloadingEditalId === edital.id
                                ? <Loader2 size={14} className="animate-spin text-red-400" />
                                : <X size={14} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

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
              {renderSection(SubjectStatus.ACTIVE)}
              {renderSection(SubjectStatus.COMPLETED_CYCLE)}
              {renderSection(SubjectStatus.FINISHED)}
            </main>
          </>
        )}
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