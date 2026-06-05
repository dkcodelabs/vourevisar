import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Trash2, Edit, Edit2, ChevronDown, Check, X, CheckSquare, Square, Search, GripVertical, FileText, Settings, Merge, FolderUp, Loader2, Sparkles, AlertCircle, Copy, CheckCircle2, GraduationCap, Clock, RefreshCw, BarChart2, Zap, ArrowRight, Bookmark, MoveUp, Shield, Layers, FileDown, ScanText, Filter, Play, Wand2, BookOpen, Link2Off, RotateCcw, ListTodo, Target, TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { performGlobalCleanup, repairOrphanedSubjects } from "@/services/dataIntegrityService";
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate'; // Added
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { Subject, Topic, UserEdital } from '@/types';
import type { UserEdital as EditalModalData } from '@/pages/Editais';
import { supabase } from '@/integrations/supabase/client';
import { transformSubjectsData } from '@/contexts/utils/dataTransformers';
import { applyUnificationMap, getUnifiedSubjectId } from '@/services/cycleMergeService';
import { useAuth } from '@/contexts/AuthContext';
import TopicsModal from '@/components/topics/TopicsModal';
import ContentUploadModal from '@/components/ContentUploadModal';
import NotesModal from '@/components/reviews/NotesModal';
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { CreateTopicModal } from '@/components/topics/CreateTopicModal';
import { EditalSubjectsModal } from '@/components/editais/EditalSubjectsModal';

import { errorService } from '@/lib/errors/errorService';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';

import { useMergeData } from '@/hooks/useMergeData';
import { fetchTopicReviewStats } from '@/services/topicReviewService';
import { useTopicReview } from '@/hooks/useTopicReview';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import { mergeService } from '@/services/mergeService';
import { recordCycleStudyEvent, type CycleStudyEventType } from '@/services/cycleStudyEventsService';
import { withTimeout } from '@/utils/withTimeout';
import {
  getSubjectStrategicWeight,
  getTopicStrategicIncidence,
} from '@/utils/studyCycleStrategic';
import {
  formatExamWeightInputValue,
  getExamWeightTotals,
  getEffectiveSubjectExamWeight,
  getSubjectExamWeightPercentage,
  parseOptionalExamWeightNumber,
} from '@/utils/examWeight';
import {
  getStudyCycleAlerts,
  type StudyCycleAlert,
} from '@/utils/studyCycleAlerts';
import { getStudyCycleMetrics } from '@/utils/studyCycleMetrics';
import {
  getStudyCycleEventInsights,
  type CycleStudyEvent,
} from '@/utils/studyCycleEventInsights';
import { getStudyCycleQueueSuggestion } from '@/utils/studyCycleQueueSuggestion';

type SubjectTab = 'all' | 'vertical';
type CycleTopicStatusVisual = {
  label: string;
  badgeClassName: string;
  indicatorClassName: string;
  actionClassName: string;
};

type CycleSubjectSnapshot = {
  subject_id: string;
  subject_name: string;
  total_topics: number;
  topics_started: number;
  topics_completed: number;
  studied_in_cycle: boolean;
};

type CycleRotationSnapshot = {
  id: string;
  user_id: string;
  user_cycle_id: string;
  cycle_number: number;
  started_at: string | null;
  completed_at: string;
  subject_count: number;
  studied_subject_count: number;
  topics_started_count: number;
  topics_completed_count: number;
  studied_subject_ids: string[];
  cycle_subject_ids: string[];
  edital_ids: string[];
  per_subject: CycleSubjectSnapshot[];
  created_at: string;
};

const getTopicFirstStudyDate = (topic: Topic): string | Date | null | undefined =>
  topic.first_studied_at || topic.firstStudiedAt;

const isTopicNewlyStartedInCycle = (topic: Topic, cycleStart?: string | null): boolean => {
  if (!cycleStart) return false;

  const firstStudiedAt = getTopicFirstStudyDate(topic);
  if (!firstStudiedAt) return false;

  const firstStudiedTime = new Date(firstStudiedAt).getTime();
  const cycleStartTime = new Date(cycleStart).getTime();

  return Number.isFinite(firstStudiedTime) &&
    Number.isFinite(cycleStartTime) &&
    firstStudiedTime >= cycleStartTime;
};

const getTopicCompletedInCycle = (topic: Topic, cycleStart?: string | null): boolean =>
  isTopicCompleted(topic) && isTopicNewlyStartedInCycle(topic, cycleStart);

const isTopicStarted = (topic: Topic) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.reviewCount || 0) > 0 ||
  (topic.review_count || 0) > 0 ||
  Boolean(topic.reviewStage) ||
  Boolean(topic.review_stage) ||
  Boolean(topic.nextReview) ||
  Boolean(topic.next_review) ||
  topic.completed === true ||
  topic.is_completed === true;

const isTopicCompleted = (topic: Topic) =>
  topic.completed === true ||
  topic.is_completed === true ||
  topic.reviewStage === 'Concluído' ||
  topic.review_stage === 'Concluído';

const getTopicContactCount = (
  topic: Topic,
  topicStats?: Map<string, { reviewCount: number; hardReviewCount: number }>
) => Math.max(
  topic.reviewCount || 0,
  topic.review_count || 0,
  topicStats?.get(topic.id)?.reviewCount || 0
);

const getCycleTopicStatusVisual = (topic: Topic): CycleTopicStatusVisual => {
  if (topic.is_active === false) {
    return {
      label: 'Inativo',
      badgeClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      indicatorClassName: 'bg-rose-500',
      actionClassName: 'border-transparent bg-transparent text-rose-500 hover:border-rose-500/20 hover:bg-rose-500/10',
    };
  }

  if (isTopicCompleted(topic)) {
    return {
      label: 'Concluído',
      badgeClassName: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      indicatorClassName: 'bg-emerald-500',
      actionClassName: 'border-transparent bg-transparent text-emerald-500 hover:border-emerald-500/20 hover:bg-emerald-500/10',
    };
  }

  if (isTopicStarted(topic)) {
    return {
      label: 'Em estudo',
      badgeClassName: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      indicatorClassName: 'bg-blue-500',
      actionClassName: 'border-transparent bg-transparent text-blue-500 hover:border-blue-500/20 hover:bg-blue-500/10',
    };
  }

  return {
    label: 'Não estudado',
    badgeClassName: 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-300',
    indicatorClassName: 'bg-slate-400 dark:bg-slate-500',
    actionClassName: 'border-transparent bg-transparent text-slate-500 hover:border-slate-500/20 hover:bg-slate-500/10',
  };
};

const getStrategicTopicIncidence = (topic: Topic) =>
  getTopicStrategicIncidence({ totalVolume: topic.total_volume ?? null });

const getStrategicTopicIncidenceTitle = (topic: Topic) => {
  const incidence = getStrategicTopicIncidence(topic);
  return incidence.showToStudent && topic.total_volume
    ? `Cobrança alta detectada por sinal bruto.`
    : 'Sem destaque de cobrança para exibir.';
};

const getStrategicTopicIncidenceDisplay = (topic: Topic) => {
  const incidence = getStrategicTopicIncidence(topic);
  return incidence.showToStudent
    ? incidence.label
    : null;
};

const getSubjectPendingTopicsCount = (subject: Subject) =>
  subject.topics.filter(topic => topic.is_active !== false && !isTopicStarted(topic)).length;


const Subjects = () => {
  const { user } = useAuth();
  const { originsMap, editaisData, editaisNoCiclo, activeSubjectIdsSet, getOriginsForSubject, refresh, isLoading: isOriginsLoading } = useEditalOriginsWithMerge();
  const { getUnifiedSubjectName, isSubjectMerged, getSubjectOrigins, revertSubjectMerge, getSubjectMergeInfo, dynamicUnificationMap } = useMergeData();
  const navigate = useNavigate();
  // Estado local simples - sem contextos
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [topicStats, setTopicStats] = useState<Map<string, { reviewCount: number; hardReviewCount: number }>>(new Map());

  // Novos modais V2 states
  const [visibleCount, setVisibleCount] = useState(25);
  const ITEMS_PER_PAGE = 25;
  const [selectedTopicForNotes, setSelectedTopicForNotes] = useState<{id: string, name: string, subjectName: string} | null>(null);
  const [isStartingNextCycle, setIsStartingNextCycle] = useState(false);
  const [editingWeightSubjectId, setEditingWeightSubjectId] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState({
    questions: '',
    points: '',
    percentage: '',
  });
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [cycleSnapshots, setCycleSnapshots] = useState<CycleRotationSnapshot[]>([]);
  const [reviewsDoneTodayCount, setReviewsDoneTodayCount] = useState(0);
  const [cycleStudyEvents, setCycleStudyEvents] = useState<CycleStudyEvent[]>([]);

  // States for Merge Reversion
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [selectedMergeId, setSelectedMergeId] = useState<string | null>(null);
  const [selectedMergeName, setSelectedMergeName] = useState<string>('');
  const [selectedMergeOriginals, setSelectedMergeOriginals] = useState<{
    subjectName: string;
    editalName: string;
    editalOrgan: string;
  }[]>([]);
  const [isReverting, setIsReverting] = useState(false);

  const [isImportEditalModalOpen, setIsImportEditalModalOpen] = useState(false);
  const [isCreateTopicModalOpen, setIsCreateTopicModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'ready' | 'ia' | 'manual'>('ready');
  const { openReviewModal, difficultyModalData, closeDifficultyModal, markTopicAsReviewed, isLoading: isSavingTopicReview } = useTopicReview();
  const [subjectsModal, setSubjectsModal] = useState<{ 
    isOpen: boolean; 
    edital: EditalModalData | null;
    initialExpandedSubjectId?: string;
  }>({ isOpen: false, edital: null });

  const location = useLocation();

  const toEditalModalData = (edital: any): EditalModalData => ({
    id: edital.id,
    name: edital.name,
    organ: edital.organ,
    position: edital.position,
    year: edital.year,
    examDate: edital.examDate || edital.exam_date,
    createdAt: edital.createdAt || edital.created_at || '',
    updatedAt: edital.updatedAt || edital.updated_at || '',
    isImported: edital.isImported ?? edital.is_imported ?? false,
    sourceId: edital.sourceId || edital.source_id,
    subjectIds: edital.subjectIds || edital.subject_ids || [],
    activeSubjectIds: edital.activeSubjectIds || edital.active_subject_ids || [],
    isMergedWith: edital.isMergedWith || edital.merged_with,
    mergedIntoCycle: edital.mergedIntoCycle ?? edital.merged_into_cycle ?? false,
  });

  // ── Efeito para abrir modal baseado no estado de navegação ──
  useEffect(() => {
    const state = location.state as { openImportModal?: boolean; importTab?: 'ready' | 'ia' | 'manual' } | null;
    if (state?.openImportModal) {
      setIsImportEditalModalOpen(true);
      if (state?.importTab) {
        setModalInitialTab(state.importTab);
      }
      // Limpa o estado para evitar que reabra ao atualizar a página
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Helper para gerenciar a tabela de editais (não inclusa nos types automáticos)
  const getOrCreateUserEdital = async (name: string, isImported: boolean = false) => {
    if (!user) return null;
    const sanitizedName = name.trim();
    
    // 1. Tentar buscar edital existente
    const { data: existing, error: fetchError } = await supabase
      .from('user_editais')
      .select('*')
      .eq('user_id', user.id)
      .eq('name', sanitizedName)
      .maybeSingle();

    if (fetchError) {
      console.error('Erro ao buscar edital:', fetchError);
      return null;
    }

    if (existing) return existing;

    // 2. Criar novo se não existir
    const { data: created, error: createError } = await supabase
      .from('user_editais')
      .insert({
        user_id: user.id,
        name: sanitizedName,
        is_imported: isImported,
        merged_into_cycle: false,
        subject_ids: []
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar edital:', createError);
      return null;
    }

    return created;
  };

  // ── Funções de banco para subject_relations ──
  // ── Função Excluir Definitivo ──
  const handleDeletePermanent = async (subjectId: string, editalIdToRemove?: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // 1. Se especificado edital, remover só desse edital
      if (editalIdToRemove) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: edital } = await (supabase as any)
          .from('user_editais')
          .select('subject_ids')
          .eq('id', editalIdToRemove)
          .single();
        
        if (edital) {
          const newIds = (edital.subject_ids || []).filter((id: string) => id !== subjectId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('user_editais')
            .update({ subject_ids: newIds })
            .eq('id', editalIdToRemove);
        }
      } else {
        // 2. Se não especificado, remover de TODOS os editais
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: editais } = await (supabase as any)
          .from('user_editais')
          .select('id, subject_ids')
          .eq('user_id', user.id);
        
        if (editais) {
          for (const edital of editais) {
            if ((edital.subject_ids || []).includes(subjectId)) {
              const newIds = (edital.subject_ids || []).filter((id: string) => id !== subjectId);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any)
                .from('user_editais')
                .update({ subject_ids: newIds })
                .eq('id', edital.id);
            }
          }
        }
      }
      
      // 2.5. Buscar IDs de tópicos desta matéria para limpar histórico
      const { data: topicsData } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', subjectId);
      
      const topicIds = (topicsData || []).map(t => t.id);

      if (topicIds.length > 0) {
        // 2.6. Deletar histórico de revisões (Limpeza profunda)
        await supabase
          .from('topic_review_history')
          .delete()
          .in('topic_id', topicIds);
      }

      // 3. Deletar tópicos da matéria
      await supabase
        .from('topics')
        .delete()
        .eq('subject_id', subjectId);

      // 4. Deletar a matéria
      await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId);

      // 5. Atualizar estado local
      setLocalSubjects(prev => prev.filter(s => s.id !== subjectId));
      
      refresh();
      toast.success('Matéria excluída do edital!');
    } catch (err) {
      console.error('Erro ao excluir do edital:', err);
      toastGate.notifyError('Erro ao excluir matéria. Tente novamente.', 'DEL-ERR-01', { severity: 'high' });
      errorService.report(err, { module: 'Subjects', action: 'deletePermanent', userMessage: 'Erro ao excluir matéria.' });
    } finally {
      setIsLoading(false);
      setDeletePermanentConfirm({ isOpen: false, subjectId: null, subjectName: null, editais: [] });
    }
  };

  // Estado para confirmar exclusão definitiva
  const [deletePermanentConfirm, setDeletePermanentConfirm] = useState<{
    isOpen: boolean;
    subjectId: string | null;
    subjectName: string | null;
    editais: Array<{ id: string; name: string; is_imported: boolean; source_id: string | null }>;
  }>({ isOpen: false, subjectId: null, subjectName: null, editais: [] });



  // Cache simples no localStorage
  const loadSubjects = useCallback(async (ignoreCache: boolean = false) => {
    console.log('📥 LOAD SUBJECTS CALLED:', {
      user: !!user,
      userId: user?.id,
      ignoreCache,
      timestamp: new Date().toISOString()
    });

    if (!user) return;

    // Remover cache antigo se existir
    const cacheKey = `subjects_${user.id}`;
    localStorage.removeItem(cacheKey);

    console.log('🔄 LOADING FROM DATABASE');
    if (isFirstLoad.current) {
      setIsLoading(true);
    }
    try {
      const { data } = await withTimeout(
        supabase
          .from('subjects')
          .select(`*, topics(*, difficulty_level)`)
          .eq('user_id', user.id)
          .order('priority', { ascending: true })
          .order('created_at', { foreignTable: 'topics', ascending: true }),
        12000,
        'Carregamento de materias do ciclo'
      );

      const transformedSubjects = transformSubjectsData(data || []);
      console.log('🔄 SETTING SUBJECTS:', {
        rawCount: data?.length || 0,
        transformedCount: transformedSubjects.length
      });
      setSubjects(transformedSubjects);
      setLocalSubjects(transformedSubjects);

      console.log('✅ DATA LOADED:', { subjectsCount: transformedSubjects.length });
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'loadSubjects',
          userMessage: 'Erro ao carregar matérias.',
          severity: 'high',
          scope: 'core',
          userId: user.id
        }
      );
    } finally {
      setIsLoading(false);
      setDataLoaded(true);
      isFirstLoad.current = false;
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    if (user) {
      localStorage.removeItem(`subjects_${user.id}`);
      localStorage.removeItem(`subjects_${user.id} `); // limpa chave antiga com espaço por segurança
      await loadSubjects();
      refresh(); // Atualiza origens do hook
      window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
    }
  }, [user, loadSubjects, refresh]);

  // Mantem a deteccao de topicos ja iniciados quando o progresso vem do historico.
  useEffect(() => {
    const allTopicIds = subjects.flatMap(s => s.topics.map(t => t.id));
    if (allTopicIds.length === 0) {
      setTopicStats(new Map());
      return;
    }
    fetchTopicReviewStats(allTopicIds).then(setTopicStats);
  }, [subjects]);

  const handleUnloadCycle = async (editalId: string, editalName: string, subjectIdsRaw: string[]) => {
    // Garante que subjectIds seja um array de strings, removendo objetos ou nulos acidentais
    const subjectIds = Array.isArray(subjectIdsRaw) 
      ? subjectIdsRaw.filter(id => typeof id === 'string' && id.length > 0)
      : [];

    console.log('[Subjects] handleUnloadCycle:', { editalId, editalName, subjectIds, raw: subjectIdsRaw });

    if (!user) return;
    setUnloadingEditalId(editalId);
    try {
      await mergeService.syncCycleAfterRemoval(user.id, editalId);
      await mergeService.cleanupMergesAfterEditalRemoval(user.id, editalId);

      if (subjectIds.length > 0) {
        const { error: resetError } = await supabase
          .from('topics')
          .update({
            next_review: null,
            review_count: 0,
            review_stage: '0',
            completed: false,
            first_studied_at: null,
            last_reviewed_at: null,
            memory_stability: 0,
            current_interval: null
          } as any)
          .in('subject_id', subjectIds);

        if (resetError) throw resetError;

        const { data: topicData, error: topicFetchError } = await supabase
          .from('topics')
          .select('id')
          .in('subject_id', subjectIds);

        if (topicFetchError) throw topicFetchError;

        const topicIds = topicData?.map(t => t.id).filter(Boolean) || [];
        if (topicIds.length > 0) {
          await supabase
            .from('topic_review_history')
            .delete()
            .in('topic_id', topicIds);
        }

        await (supabase as any)
          .from('study_sessions')
          .delete()
          .eq('edital_id', editalId);
      }

      const { data: rpcResult, error: rpcErr } = await supabase.rpc('atomic_cycle_unload_or_delete', {
        p_user_id: user.id,
        p_edital_id: editalId
      });

      if (rpcErr) throw rpcErr;
      if (rpcResult && (rpcResult as any).ok === false) throw new Error((rpcResult as any).error);

      localStorage.removeItem(`user_cycle_cache_${user.id}`);

      const cycleWasDeleted = (rpcResult as any)?.cycle_deleted === true;
      toast.success(cycleWasDeleted
        ? `"${editalName}" removido. Ciclo de estudos encerrado.`
        : `"${editalName}" removido do ciclo.`
      );
      window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { type: 'unload', editalId } }));
      await refreshData();
    } catch (error) {
      errorService.report(error, { module: 'Subjects', action: 'unloadCycle', userMessage: 'Erro ao remover edital do ciclo.' });
    } finally {
      setUnloadingEditalId(null);
    }
  };

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSource, setNewSubjectSource] = useState('');
  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
  // IDs de subjects ocultos localmente (otimismo para handleDelete)
  const [hiddenSubjectIds, setHiddenSubjectIds] = useState<Set<string>>(new Set());
  const isFirstLoad = useRef(true);
  // Estado de loading por edital (para botão Remover do Ciclo)
  const [unloadingEditalId, setUnloadingEditalId] = useState<string | null>(null);
  const [unloadConfirm, setUnloadConfirm] = useState<{ 
    isOpen: boolean; 
    editalId: string | null; 
    editalName: string | null; 
    subjectIds: string[] 
  }>({
    isOpen: false,
    editalId: null,
    editalName: null,
    subjectIds: []
  });
  const [resetCycleConfirmOpen, setResetCycleConfirmOpen] = useState(false);
  const [isResettingCycle, setIsResettingCycle] = useState(false);
  const [completeCycleConfirmOpen, setCompleteCycleConfirmOpen] = useState(false);
  const [pendingCompleteSubjectId, setPendingCompleteSubjectId] = useState<string | null>(null);
  const [startNextCycleConfirmOpen, setStartNextCycleConfirmOpen] = useState(false);
  // Confirmação inline de exclusão de matéria
  const [confirmHideSubjectId, setConfirmHideSubjectId] = useState<string | null>(null);

  // Relações de matérias mescladas: { "materiaPrincipalId": ["materia1Id", "materia2Id"] }
  const [mergedSubjectsMap, setMergedSubjectsMap] = useState<Record<string, string[]>>({});

  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([]);
  const [expandedBeforeSearch, setExpandedBeforeSearch] = useState<string[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  // Estados para edição inline
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // View mode: ciclo padrão ou visualização verticalizada do edital
  const [activeTab, setActiveTab] = useState<SubjectTab>('all');

  // Estado para o modal de tópicos
  const [topicsModal, setTopicsModal] = useState<{
    isOpen: boolean;
    subject: Subject | null;
  }>({ isOpen: false, subject: null });

  // Estado para o modal de upload de conteúdo
  const [contentUploadModal, setContentUploadModal] = useState(false);

  const [topicToDelete, setTopicToDelete] = useState<{ id: string; name: string; subjectName: string } | null>(null);
  const [isDeletingTopic, setIsDeletingTopic] = useState(false);

  // Estados para edição inline de tópicos
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');
  const [newTopicTexts, setNewTopicTexts] = useState<Record<string, string>>({});

  const handleSaveNewTopic = async (subjectId: string) => {
    const text = newTopicTexts[subjectId]?.trim();
    if (!text) return;

    try {
      // Encontrar a matéria para calcular prioridade
      const subject = localSubjects.find(s => s.id === subjectId);
      const currentTopicsCount = subject?.topics?.length || 0;

      const { error } = await supabase
        .from('topics')
        .insert({
          subject_id: subjectId,
          edital_id: subject?.edital_id, // Garantir o vínculo com o edital
          name: text,
          completed: false,
          review_count: 0,
          review_stage: null,
          next_review: null,
          first_studied_at: null,
          last_reviewed_at: null,
          notes: null,
          position: currentTopicsCount
        });

      if (error) throw error;

      await refreshData();

      // Limpar input
      setNewTopicTexts(prev => ({ ...prev, [subjectId]: '' }));
      toast.success('Tópico adicionado!');

      // Scroll para o novo tópico após um pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        const subjectCard = document.querySelector(`[data - subject - id= "${subjectId}"]`);
        if (subjectCard) {
          const topicItems = subjectCard.querySelectorAll('[data-topic-item]');
          const lastTopic = topicItems[topicItems.length - 1];
          if (lastTopic) {
            lastTopic.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 300);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleSaveNewTopic',
          userMessage: 'Erro ao adicionar tópico',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
    }
  };



  // Estado para armazenar o ciclo atual e contar visualizações
  const [userCycle, setUserCycle] = useState<any>(null);

  // expandedSubjectList agora é um useMemo (definido mais abaixo)

  const loadUserCycle = useCallback(async () => {
    if (!user) return;

    const cacheKey = `user_cycle_cache_${user.id}`;
    try {
      const { data, error } = await withTimeout(
        (supabase as any)
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1),
        12000,
        'Carregamento do ciclo de estudos'
      );

      if (error) throw error;

      const cycleData = data?.[0] || null;

      if (!cycleData || !cycleData.ciclo_atual || cycleData.ciclo_atual.length === 0) {
        localStorage.removeItem(cacheKey);
        setUserCycle(null);
      } else {
        localStorage.setItem(cacheKey, JSON.stringify(cycleData));
        setUserCycle(cycleData);
        console.log('🔄 USER CYCLE LOADED:', {
          cycleLength: cycleData.ciclo_atual?.length || 0,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erro ao carregar ciclo:', error);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.ciclo_atual && parsed.ciclo_atual.length > 0) {
            setUserCycle(parsed);
          }
        } catch (e) {
          console.error('Invalid cache', e);
        }
      }
    }
  }, [user]);

  const handleResetCycle = useCallback(async () => {
    if (!user || !userCycle) return;

    const resetCycleFields = {
      materias_estudadas_ciclo: [],
      ciclos_realizados: 0,
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null,
      atualizado_em: new Date().toISOString(),
    };
    const previousUserCycle = userCycle;
    const nextUserCycle = {
      ...userCycle,
      ...resetCycleFields,
    };

    setIsResettingCycle(true);
    setUserCycle(nextUserCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(nextUserCycle));

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update(resetCycleFields)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      setResetCycleConfirmOpen(false);
      toast.success('Ciclo reiniciado.');
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { source: 'Subjects', action: 'resetCycle' } }));
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleResetCycle',
          userMessage: 'Erro ao reiniciar ciclo.',
          severity: 'medium',
          scope: 'core',
          userId: user.id,
        }
      );
    } finally {
      setIsResettingCycle(false);
    }
  }, [user, userCycle]);

  // Carregar dados apenas uma vez por usuário
  useEffect(() => {
    if (user?.id) {
      (async () => {
        // Garantir que carregamos tudo na primeira montagem
        await Promise.allSettled([
          withTimeout(loadSubjects(), 14000, 'Carregamento inicial de materias'),
          withTimeout(loadUserCycle(), 14000, 'Carregamento inicial do ciclo'),
          withTimeout(repairOrphanedSubjects(user.id), 14000, 'Reparo de materias orfas')
        ]);
        setLoading(false);
      })();

      // Listener para atualizar quando houver mudanças externas (ex: exclusão de edital ou mesclagem desfeita)
      let updateTimeout: NodeJS.Timeout;
      const handleExternalUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        // Ignora eventos disparados pelo próprio componente para evitar loop duplo
        if (customEvent.detail?.source === 'Subjects') {
          return;
        }

        console.log(`🔔 EXTERNAL UPDATE DETECTED (${event.type}) - Scheduling refresh...`);
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(async () => {
          try {
            await Promise.all([
              loadSubjects(true), // Força bypass do cache
              loadUserCycle()
            ]);
            // O refresh do hook de origens é chamado via evento no próprio hook ou manualmente se necessário
            console.log('✅ Synchronized refresh completed');
          } catch (err) {
            console.error('❌ Synchronized refresh failed:', err);
          }
        }, 300); // 300ms debounce
      };

      window.addEventListener('subjectUpdated', handleExternalUpdate);
      window.addEventListener('mergeUpdated', handleExternalUpdate);
      window.addEventListener('cycleUpdated', handleExternalUpdate);
      window.addEventListener('editalUpdated', handleExternalUpdate);
      return () => {
        window.removeEventListener('subjectUpdated', handleExternalUpdate);
        window.removeEventListener('mergeUpdated', handleExternalUpdate);
        window.removeEventListener('cycleUpdated', handleExternalUpdate);
        window.removeEventListener('editalUpdated', handleExternalUpdate);
      };
    } else if (!user) {
      setLoading(false);
    }
  }, [user?.id, loadSubjects, loadUserCycle]);

  // Sincronizar localSubjects quando subjects mudar
  useEffect(() => {
    if (subjects.length > 0) {
      setLocalSubjects(subjects);
    } else if (dataLoaded) {
      // Se carregou dados e está vazio, garante que o estado local também fique vazio
      setLocalSubjects([]);
    }
  }, [subjects, dataLoaded]);


  // Função auxiliar para obter a posição no ciclo
  const getCyclePosition = (itemId: string) => {
    if (!userCycle?.ciclo_atual) return null;
    // Extrair o índice do ciclo do itemId (formato: subjectId-cycleIndex)
    const cycleIndex = parseInt(itemId.split('-').pop() || '0');
    return cycleIndex + 1; // +1 porque queremos posição 1-based
  };

  // Interface para item expandido da lista
  interface ExpandedSubjectItem {
    id: string;
    subject: Subject;
  }

  // Criar lista expandida de matérias com visualizações usando useMemo
  const expandedSubjectList = useMemo<ExpandedSubjectItem[]>(() => {
    if (!localSubjects.length) return [];
    
    // ── Obter IDs no ciclo para garantir visibilidade ─────────────────────
    const cicloAtual = userCycle?.ciclo_atual || [];
    const subjectsInCycleSet = new Set(cicloAtual);

    // ── Filtrar: só exibir subjects "liberados" ──────────────────────────
    const rawVisibleSubjects = localSubjects.filter(subject => {
      if (subject.is_visible === false) return false;
      if (hiddenSubjectIds.has(subject.id)) return false; 
      
      const isInCycle = subjectsInCycleSet.has(subject.id);
      const isFromActiveEdital = activeSubjectIdsSet.has(subject.id);
      const isVisible = isInCycle || isFromActiveEdital;
      
      return isVisible;
    });

    const visibleSubjects = applyUnificationMap(rawVisibleSubjects, dynamicUnificationMap);

    if (cicloAtual.length === 0 || visibleSubjects.length === 0) {
      return visibleSubjects.map((subject) => ({
        id: subject.id,
        subject
      }));
    }

    // Cada matéria aparece uma única vez (duplicação descontinuada)
    const seen = new Set<string>();
    const expanded: ExpandedSubjectItem[] = [];

    // Matérias do ciclo primeiro (preservando a ordem do ciclo)
    cicloAtual.forEach((originalSubjectId: string) => {
      const mappedSubjectId = getUnifiedSubjectId(originalSubjectId, dynamicUnificationMap);
      if (seen.has(mappedSubjectId)) return; // pula duplicatas do ciclo_atual
      const subject = visibleSubjects.find(s => s.id === mappedSubjectId);
      if (!subject) return;
      seen.add(mappedSubjectId);
      expanded.push({ id: subject.id, subject });
    });

    // Matérias visíveis fora do ciclo (novas matérias sem edital)
    visibleSubjects.forEach(subject => {
      if (!seen.has(subject.id)) {
        seen.add(subject.id);
        expanded.push({ id: subject.id, subject });
      }
    });

    return expanded;
  }, [userCycle?.ciclo_atual, dynamicUnificationMap, localSubjects, activeSubjectIdsSet, hiddenSubjectIds]);

  const studiedCycleIdSet = useMemo(() => {
    const studiedIds = userCycle?.materias_estudadas_ciclo || [];
    return new Set(studiedIds.map((id: string) => getUnifiedSubjectId(id, dynamicUnificationMap)));
  }, [userCycle?.materias_estudadas_ciclo, dynamicUnificationMap]);

  useEffect(() => {
    if (studiedCycleIdSet.size === 0) return;
    setExpandedSubjectIds(prev => prev.filter(id => !studiedCycleIdSet.has(id)));
  }, [studiedCycleIdSet]);

  // Sincronização redundante de localSubjects removida para evitar flicker.
  // localSubjects agora é gerenciado diretamente no loadSubjects.

  // Mantém o modal de tópicos atualizado se os dados da matéria mudarem em background
  useEffect(() => {
    if (topicsModal.isOpen && topicsModal.subject && subjects.length > 0) {
      const updatedSubject = subjects.find(s => s.id === topicsModal.subject?.id);
      if (updatedSubject) {
        setTopicsModal(prev => ({ ...prev, subject: updatedSubject }));
      }
    }
  }, [subjects, topicsModal.isOpen, topicsModal.subject?.id]);

  const loadCycleSnapshots = useCallback(async () => {
    if (!user || !userCycle?.id) {
      setCycleSnapshots([]);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('cycle_rotation_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_cycle_id', userCycle.id)
        .order('cycle_number', { ascending: false })
        .limit(6);

      if (error) throw error;
      setCycleSnapshots((data || []) as CycleRotationSnapshot[]);
    } catch (error) {
      console.warn('Histórico de ciclos indisponível:', error);
      setCycleSnapshots([]);
    }
  }, [user, userCycle?.id]);

  useEffect(() => {
    loadCycleSnapshots();
  }, [loadCycleSnapshots]);

  const loadCycleStudyEvents = useCallback(async () => {
    if (!user || !userCycle?.id) {
      setCycleStudyEvents([]);
      return;
    }

    try {
      const { data, error } = await (supabase as any)
        .from('cycle_study_events')
        .select('id,event_type,subject_id,topic_id,subject_position,created_at')
        .eq('user_id', user.id)
        .eq('user_cycle_id', userCycle.id)
        .order('created_at', { ascending: false })
        .limit(80);

      if (error) throw error;
      setCycleStudyEvents((data || []) as CycleStudyEvent[]);
    } catch (error) {
      console.warn('Eventos do ciclo indisponíveis:', error);
      setCycleStudyEvents([]);
    }
  }, [user, userCycle?.id]);

  useEffect(() => {
    loadCycleStudyEvents();
  }, [loadCycleStudyEvents]);

  useEffect(() => {
    const loadReviewsDoneToday = async () => {
      const topicIds = expandedSubjectList.flatMap(item =>
        item.subject.topics.map(topic => topic.id)
      );

      if (topicIds.length === 0) {
        setReviewsDoneTodayCount(0);
        return;
      }

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      try {
        const { data, error } = await supabase
          .from('topic_review_history')
          .select('review_stage')
          .in('topic_id', topicIds)
          .gte('reviewed_at', start.toISOString())
          .lt('reviewed_at', end.toISOString());

        if (error) throw error;

        const reviewsOnly = (data || []).filter(row => {
          const stage = String(row.review_stage || '').toLowerCase();
          return stage !== 'first_contact' && stage !== 'primeiro contato';
        });

        setReviewsDoneTodayCount(reviewsOnly.length);
      } catch (error) {
        console.warn('Revisões de hoje indisponíveis:', error);
        setReviewsDoneTodayCount(0);
      }
    };

    loadReviewsDoneToday();
  }, [expandedSubjectList]);

  // Focar o input quando necessário
  useLayoutEffect(() => {
    if (!loading && !isAddingSubject && newSubjectName === '' && inputRef.current) {
      const timeoutId = setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [loading, newSubjectName, isAddingSubject]);

  // Efeito para manter foco após operações
  useEffect(() => {
    if (!isAddingSubject && newSubjectName === '' && inputRef.current) {
      const timeoutId = setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isAddingSubject, newSubjectName]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSaveSubject = async () => {
    if (!newSubjectName.trim()) {
      // Não mostrar toast, apenas focar o input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return;
    }

    if (isImportEditalModalOpen && !newSubjectSource.trim()) {
      toastGate.notifyError('O campo Concurso / Origem é obrigatório.', 'VAL-01', { severity: 'low' });
      return;
    }

    setIsAddingSubject(true);

    try {
      // 1. Criar ou Vincular ao Edital (Origem/Concurso)
      const currentOrigin = newSubjectSource.trim() || 'MEUS ESTUDOS';
      const edital = await getOrCreateUserEdital(currentOrigin, false); // Manual (is_imported = false)

      // 2. Adicionar nova matéria
      const maxPriority = localSubjects.length > 0 ? Math.max(...localSubjects.map(s => s.priority || 0)) : 0;

      const { data: savedSubject, error: subjectError } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          name: newSubjectName.trim().toUpperCase(),
          status: 'Nova',
          color: '#3B82F6',
          priority: maxPriority + 1,
          edital_id: edital.id
        })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // 3. Vincular matéria ao edital no banco (Persistente)
      if (edital && savedSubject) {
        const updatedIds = [...((edital as UserEdital).subject_ids || []), savedSubject.id];
        await supabase
          .from('user_editais')
          .update({ subject_ids: updatedIds })
          .eq('id', edital.id);
      }

      await refreshData();
      refresh(); // Atualizar hook de origens

      toast.success("Matéria adicionada com sucesso!");

      // Limpar o input imediatamente
      setNewSubjectName('');
      setNewSubjectSource('');

    } catch (error) {
      console.error('Erro ao adicionar matéria:', error);
      errorService.report(error as Error, { module: 'subjects', action: 'add', userMessage: "Erro ao salvar matéria. Tente novamente." });
    } finally {
      setIsAddingSubject(false);

      // Garantir que o foco seja restaurado imediatamente
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  };

  // Funções para edição inline
  const handleStartEdit = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setEditingName(subject.name);
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      return;
    }

    if (editingSubjectId && editingName.trim() !== '') {
      try {
        await supabase
          .from('subjects')
          .update({ name: editingName.trim().toUpperCase() })
          .eq('id', editingSubjectId)
          .eq('user_id', user.id);

        await refreshData();
        setEditingSubjectId(null);
        setEditingName('');
      } catch (error) {
        await errorService.report(
          error,
          {
            module: 'Subjects',
            action: 'handleSaveEdit',
            userMessage: 'Erro ao atualizar matéria. Tente novamente.',
            severity: 'medium',
            scope: 'core',
            userId: user.id
          }
        );
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingSubjectId(null);
    setEditingName('');
  };

  const handleDelete = async (id: string) => {
    // Otimismo: oculta imediatamente da view local
    setHiddenSubjectIds(prev => new Set([...prev, id]));
    setConfirmHideSubjectId(null);
    try {
      // 1. Persistir ocultação na tabela subjects (Manual ou Edital)
      await (supabase as any)
        .from('subjects')
        .update({ is_visible: false })
        .eq('id', id);

      // 2. Se pertencer a editais, remover de active_subject_ids
      const { data: relatedEditais } = await (supabase as any)
        .from('user_editais')
        .select('id, active_subject_ids')
        .contains('active_subject_ids', [id]);

      if (relatedEditais && relatedEditais.length > 0) {
        for (const edital of relatedEditais) {
          const newActiveIds = (edital.active_subject_ids as string[]).filter(sid => sid !== id);
          await (supabase as any)
            .from('user_editais')
            .update({ active_subject_ids: newActiveIds })
            .eq('id', edital.id);
        }
      }

      refresh(); // atualiza activeSubjectIdsSet no hook
      window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
      toast.success('Matéria ocultada da lista. Ela continua salva no edital.');
    } catch (error) {
      // Reverte otimismo
      setHiddenSubjectIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleDelete',
          userMessage: 'Erro ao ocultar matéria. Tente novamente.',
          severity: 'high',
          scope: 'core',
          userId: user.id
        }
      );
    }
  };

  const handleDeleteTopic = (topic: Topic, subjectName: string) => {
    setTopicToDelete({ id: topic.id, name: topic.name, subjectName });
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    setIsDeletingTopic(true);

    try {
      // Módulo 5: Soft Delete - Apenas desativar
      const { error } = await supabase
        .from('topics')
        .update({ is_active: false })
        .eq('id', topicToDelete.id);

      if (error) throw error;

      await refreshData();
      window.dispatchEvent(new CustomEvent('topicUpdated'));
      toast.success('Tópico desativado (Movido para lixeira)', { duration: 2000 });
      setTopicToDelete(null);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'confirmDeleteTopic',
          userMessage: 'Erro ao desativar tópico',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
    } finally {
      setIsDeletingTopic(false);
    }
  };

  const handleRestoreTopic = async (topicId: string) => {
    setIsDeletingTopic(true);
    try {
      const { error } = await supabase
        .from('topics')
        .update({ is_active: true })
        .eq('id', topicId);

      if (error) throw error;

      await refreshData();
      window.dispatchEvent(new CustomEvent('topicUpdated'));
      toast.success('Tópico restaurado!');
    } catch (error) {
      errorService.report(error, { module: 'Subjects', action: 'handleRestoreTopic', userMessage: 'Erro ao restaurar tópico' });
    } finally {
      setIsDeletingTopic(false);
    }
  };

  const handleStartWeightEdit = (subject: Subject) => {
    setEditingWeightSubjectId(subject.id);
    setWeightDraft({
      questions: formatExamWeightInputValue(subject.exam_weight_questions),
      points: formatExamWeightInputValue(subject.exam_weight_points),
      percentage: formatExamWeightInputValue(subject.exam_weight_percentage),
    });
  };

  const handleCancelWeightEdit = () => {
    setEditingWeightSubjectId(null);
    setWeightDraft({ questions: '', points: '', percentage: '' });
  };

  const handleSaveSubjectWeightInline = async (subjectId: string) => {
    if (!user) return;

    const examWeightQuestions = parseOptionalExamWeightNumber(weightDraft.questions);
    const examWeightPoints = parseOptionalExamWeightNumber(weightDraft.points);
    const examWeightPercentage = parseOptionalExamWeightNumber(weightDraft.percentage);
    const hasWeight = examWeightQuestions !== null || examWeightPoints !== null || examWeightPercentage !== null;

    setIsSavingWeight(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          exam_weight_questions: examWeightQuestions,
          exam_weight_points: examWeightPoints,
          exam_weight_percentage: examWeightPercentage,
          exam_weight_raw: hasWeight ? 'Informado manualmente pelo aluno na página de ciclo' : null,
        } as any)
        .eq('id', subjectId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSubjects(prev => prev.map(subject =>
        subject.id === subjectId
          ? {
              ...subject,
              exam_weight_questions: examWeightQuestions,
              exam_weight_points: examWeightPoints,
              exam_weight_percentage: examWeightPercentage,
              exam_weight_raw: hasWeight ? 'Informado manualmente pelo aluno na página de ciclo' : null,
            }
          : subject
      ));
      setLocalSubjects(prev => prev.map(subject =>
        subject.id === subjectId
          ? {
              ...subject,
              exam_weight_questions: examWeightQuestions,
              exam_weight_points: examWeightPoints,
              exam_weight_percentage: examWeightPercentage,
              exam_weight_raw: hasWeight ? 'Informado manualmente pelo aluno na página de ciclo' : null,
            }
          : subject
      ));
      handleCancelWeightEdit();
      toast.success(hasWeight ? 'Peso da matéria salvo.' : 'Peso da matéria removido.');
    } catch (error) {
      await errorService.report(error, {
        module: 'Subjects',
        action: 'handleSaveSubjectWeightInline',
        userMessage: 'Erro ao salvar peso da matéria.',
        severity: 'medium',
        scope: 'core',
        userId: user.id,
      });
    } finally {
      setIsSavingWeight(false);
    }
  };

  const handleStartTopicEdit = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditingTopicName(topic.name);
  };

  const handleSaveTopicEdit = async () => {
    if (!editingTopicName.trim()) {
      toastGate.notifyError('O nome do tópico não pode estar vazio', 'SUB-VAL-01', { severity: 'low' });
      return;
    }

    if (editingTopicId) {
      try {
        const { error } = await supabase
          .from('topics')
          .update({ name: editingTopicName.trim() })
          .eq('id', editingTopicId);

        if (error) throw error;

        await refreshData();
        setEditingTopicId(null);
        setEditingTopicName('');
        toast.success('Tópico atualizado', { duration: 1500 });
      } catch (error: any) {
        errorService.report(error, { module: 'subjects', action: 'update_topic', userMessage: "Erro ao atualizar tópico" });
      }
    }
  };

  const handleCancelTopicEdit = () => {
    setEditingTopicId(null);
    setEditingTopicName('');
  };

  const handleDragStart = (_event: DragStartEvent) => {
    // Mantém o estado aberto/fechado da fila durante a ordenação.
  };

  const getCycleEventContext = useCallback((subjectId?: string | null) => {
    const cycleOrderSnapshot = (userCycle?.ciclo_atual || []).map((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap)
    );
    const normalizedSubjectId = subjectId
      ? getUnifiedSubjectId(subjectId, dynamicUnificationMap)
      : null;
    const subjectPosition = normalizedSubjectId
      ? cycleOrderSnapshot.indexOf(normalizedSubjectId) + 1
      : null;

    return {
      cycleNumber: (userCycle?.ciclos_realizados || 0) + 1,
      cycleOrderSnapshot,
      subjectPosition: subjectPosition && subjectPosition > 0 ? subjectPosition : null,
    };
  }, [dynamicUnificationMap, userCycle?.ciclo_atual, userCycle?.ciclos_realizados]);

  const recordCycleEvent = useCallback(async (
    eventType: CycleStudyEventType,
    options: {
      subjectId?: string | null;
      topicId?: string | null;
      editalId?: string | null;
      metadata?: Record<string, unknown>;
      cycleOrderSnapshot?: string[];
      subjectPosition?: number | null;
    } = {}
  ) => {
    if (!user || !userCycle) return false;

    const context = getCycleEventContext(options.subjectId);
    const recorded = await recordCycleStudyEvent({
      userId: user.id,
      userCycleId: userCycle.id,
      cycleNumber: context.cycleNumber,
      eventType,
      subjectId: options.subjectId || null,
      topicId: options.topicId || null,
      editalId: options.editalId || null,
      subjectPosition: options.subjectPosition ?? context.subjectPosition,
      cycleOrderSnapshot: options.cycleOrderSnapshot || context.cycleOrderSnapshot,
      metadata: options.metadata,
    });

    if (recorded) {
      await loadCycleStudyEvents();
    }

    return recorded;
  }, [getCycleEventContext, loadCycleStudyEvents, user, userCycle]);

  const recordConfirmedTopicCycleEvent = useCallback(async (
    difficulty?: number | null,
    duration?: number,
  ) => {
    if (!difficultyModalData.topicId || !difficultyModalData.subjectId) return;

    const subject = localSubjects.find(item => item.id === difficultyModalData.subjectId);
    const eventType: CycleStudyEventType =
      difficultyModalData.reviewCount <= 1 ? 'topic_started' : 'topic_reviewed';

    await recordCycleEvent(eventType, {
      subjectId: difficultyModalData.subjectId,
      topicId: difficultyModalData.topicId,
      editalId: subject?.edital_id || null,
      metadata: {
        topicName: difficultyModalData.topicName,
        subjectName: difficultyModalData.subjectName,
        reviewCount: difficultyModalData.reviewCount,
        reviewStage: difficultyModalData.reviewStage,
        difficulty: difficulty ?? null,
        duration: duration ?? difficultyModalData.duration ?? null,
      },
    });
  }, [difficultyModalData, localSubjects, recordCycleEvent]);

  const executeMarcarMateriaComoEstudada = useCallback(async (materiaId: string) => {
    if (!user || !userCycle) return;

    const rawSubjectId = (userCycle.ciclo_atual || []).find((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap) === materiaId
    ) || materiaId;

    const currentStudied = userCycle.materias_estudadas_ciclo || [];
    if (currentStudied.includes(rawSubjectId)) return;
    const previousUserCycle = userCycle;
    const updatedCycle = {
      ...userCycle,
      materias_estudadas_ciclo: [...currentStudied, rawSubjectId],
      atualizado_em: new Date().toISOString(),
    };

    setUserCycle(updatedCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(updatedCycle));
    setExpandedSubjectIds(prev => prev.filter(id => id !== materiaId && id !== rawSubjectId));

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          materias_estudadas_ciclo: updatedCycle.materias_estudadas_ciclo,
          atualizado_em: updatedCycle.atualizado_em,
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const subjectName = getUnifiedSubjectName(materiaId, localSubjects.find(subject => subject.id === materiaId)?.name || 'Matéria');
      await recordCycleEvent('subject_marked_studied', {
        subjectId: materiaId,
        editalId: localSubjects.find(subject => subject.id === materiaId)?.edital_id || null,
        metadata: {
          subjectName,
        },
      });
      toast.success(`${subjectName} marcada como estudada neste ciclo.`);

      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { source: 'Subjects', action: 'markSubjectStudied' } }));
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleMarcarMateriaComoEstudada',
          userMessage: 'Erro ao marcar matéria como estudada.',
          severity: 'medium',
          scope: 'core',
          userId: user.id,
        }
      );
    }
  }, [dynamicUnificationMap, getUnifiedSubjectName, localSubjects, recordCycleEvent, user, userCycle]);

  const handleMarcarMateriaComoEstudada = useCallback((materiaId: string) => {
    if (!userCycle) return;

    // Verificar se é a última matéria pendente no ciclo
    const pendingSubjects = expandedSubjectList.filter(item => !studiedCycleIdSet.has(item.subject.id));
    const isLastPending = pendingSubjects.length === 1 && 
      pendingSubjects[0].subject.id === getUnifiedSubjectId(materiaId, dynamicUnificationMap);

    if (isLastPending) {
      setPendingCompleteSubjectId(materiaId);
      setCompleteCycleConfirmOpen(true);
    } else {
      executeMarcarMateriaComoEstudada(materiaId);
    }
  }, [userCycle, expandedSubjectList, studiedCycleIdSet, dynamicUnificationMap, executeMarcarMateriaComoEstudada]);

  const handleVoltarMateriaParaFila = useCallback(async (materiaId: string) => {
    if (!user || !userCycle) return;

    const rawSubjectId = (userCycle.ciclo_atual || []).find((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap) === materiaId
    ) || materiaId;

    const currentStudied = userCycle.materias_estudadas_ciclo || [];
    if (!currentStudied.includes(rawSubjectId)) return;

    const updatedStudied = currentStudied.filter((id: string) => id !== rawSubjectId);

    const previousUserCycle = userCycle;
    const updatedCycle = {
      ...userCycle,
      materias_estudadas_ciclo: updatedStudied,
      atualizado_em: new Date().toISOString(),
    };

    setUserCycle(updatedCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(updatedCycle));

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          materias_estudadas_ciclo: updatedCycle.materias_estudadas_ciclo,
          atualizado_em: updatedCycle.atualizado_em,
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const subjectName = getUnifiedSubjectName(materiaId, localSubjects.find(subject => subject.id === materiaId)?.name || 'Matéria');
      await recordCycleEvent('subject_returned_to_queue', {
        subjectId: materiaId,
        editalId: localSubjects.find(subject => subject.id === materiaId)?.edital_id || null,
        metadata: {
          subjectName,
        },
      });
      toast.success(`${subjectName} voltou para a fila do ciclo.`);
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { source: 'Subjects', action: 'returnSubjectToQueue' } }));
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleVoltarMateriaParaFila',
          userMessage: 'Erro ao voltar matéria para a fila.',
          severity: 'medium',
          scope: 'core',
          userId: user.id,
        }
      );
    }
  }, [dynamicUnificationMap, getUnifiedSubjectName, localSubjects, recordCycleEvent, user, userCycle]);

  const buildCurrentCycleSnapshot = useCallback(() => {
    if (!user || !userCycle) return null;

    const cycleStart = userCycle.data_inicio_ciclo || null;
    const studiedIds = new Set((userCycle.materias_estudadas_ciclo || []).map((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap)
    ));
    const cycleSubjects = expandedSubjectList.map(item => item.subject);
    const perSubject: CycleSubjectSnapshot[] = cycleSubjects.map(subject => {
      const activeTopics = subject.topics.filter(topic => topic.is_active !== false);
      const topicsStarted = activeTopics.filter(topic => isTopicNewlyStartedInCycle(topic, cycleStart)).length;
      const topicsCompleted = activeTopics.filter(topic => getTopicCompletedInCycle(topic, cycleStart)).length;

      return {
        subject_id: subject.id,
        subject_name: getUnifiedSubjectName(subject.id, subject.name),
        total_topics: activeTopics.length,
        topics_started: topicsStarted,
        topics_completed: topicsCompleted,
        studied_in_cycle: studiedIds.has(subject.id),
      };
    });

    const editalIds = Array.from(new Set(
      cycleSubjects
        .map(subject => subject.edital_id)
        .filter((id): id is string => Boolean(id))
    ));

    return {
      user_id: user.id,
      user_cycle_id: userCycle.id,
      cycle_number: (userCycle.ciclos_realizados || 0) + 1,
      started_at: cycleStart,
      completed_at: new Date().toISOString(),
      subject_count: cycleSubjects.length,
      studied_subject_count: perSubject.filter(subject => subject.studied_in_cycle).length,
      topics_started_count: perSubject.reduce((sum, subject) => sum + subject.topics_started, 0),
      topics_completed_count: perSubject.reduce((sum, subject) => sum + subject.topics_completed, 0),
      studied_subject_ids: Array.from(studiedIds),
      cycle_subject_ids: cycleSubjects.map(subject => subject.id),
      edital_ids: editalIds,
      per_subject: perSubject,
    };
  }, [dynamicUnificationMap, expandedSubjectList, getUnifiedSubjectName, user, userCycle]);

  const handleIniciarProximoCiclo = useCallback(async () => {
    if (!user || !userCycle) return;

    const previousUserCycle = userCycle;
    const cycleSnapshot = buildCurrentCycleSnapshot();
    const nextCycle = {
      ...userCycle,
      materias_estudadas_ciclo: [],
      ciclos_realizados: (userCycle.ciclos_realizados || 0) + 1,
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null,
      atualizado_em: new Date().toISOString(),
    };

    setIsStartingNextCycle(true);

    try {
      if (cycleSnapshot) {
        const { error: snapshotError } = await (supabase as any)
          .from('cycle_rotation_snapshots')
          .upsert(cycleSnapshot, { onConflict: 'user_cycle_id,cycle_number' });

        if (snapshotError) throw snapshotError;
      }

      const { error } = await supabase
        .from('user_cycles')
        .update({
          materias_estudadas_ciclo: [],
          ciclos_realizados: nextCycle.ciclos_realizados,
          data_inicio_ciclo: nextCycle.data_inicio_ciclo,
          data_fim_ciclo: null,
          atualizado_em: nextCycle.atualizado_em,
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      setUserCycle(nextCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(nextCycle));
      await loadCycleSnapshots();
      toast.success(`Ciclo ${nextCycle.ciclos_realizados} iniciado.`);
      window.dispatchEvent(new CustomEvent('cycleUpdated', { detail: { source: 'Subjects', action: 'startNextCycle' } }));
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleIniciarProximoCiclo',
          userMessage: 'Erro ao salvar o resumo do ciclo e iniciar o próximo.',
          severity: 'high',
          scope: 'core',
          userId: user.id,
        }
      );
    } finally {
      setIsStartingNextCycle(false);
    }
  }, [buildCurrentCycleSnapshot, loadCycleSnapshots, user, userCycle]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    if (active.id === over.id) {
      return;
    }

    const sortableList = activeTab === 'all' ? orderedCycleDisplayList : expandedSubjectList;
    const oldIndex = sortableList.findIndex((item) => item.id === active.id);
    const newIndex = sortableList.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortableList, oldIndex, newIndex);
    const reorderedIds = reordered.map(item => item.subject.id);

    // Optimistic Update: Atualizar visualmente agora
    const newCicloAtual = reorderedIds;
    const previousUserCycle = userCycle; // Backup for rollback

    if (userCycle) {
      const newUserCycle = {
        ...userCycle,
        ciclo_atual: newCicloAtual,
        atualizado_em: new Date().toISOString()
      };

      // Update State
      setUserCycle(newUserCycle);

      // Update Cache Immediately
      if (user) {
        localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(newUserCycle));
      }
    }

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: newCicloAtual,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      await recordCycleEvent('cycle_reordered', {
        cycleOrderSnapshot: newCicloAtual,
        metadata: {
          previousOrder: previousUserCycle?.ciclo_atual || [],
          newOrder: newCicloAtual,
          movedSubjectId: String(active.id),
          fromPosition: oldIndex + 1,
          toPosition: newIndex + 1,
        },
      });

      toast.success("Ordem do ciclo atualizada!");

      // Opcional: Recarregar para garantir sincronia (pode ser removido se o optimistic for suficiente)
      // Mas manter para garantir dados frescos do servidor
      /* 
      const { data } = await supabase
        .from('user_cycles')
        .select('ciclo_atual')
        .eq('user_id', user!.id)
        .limit(1);

      const cycleData = data?.[0] || null;

      if (cycleData) {
        setUserCycle(cycleData);
      }
      */
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleDragEnd',
          userMessage: 'Erro ao atualizar ordem do ciclo',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
      // Rollback em caso de erro
      setUserCycle(previousUserCycle);
      if (user && previousUserCycle) {
        localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      }
    }
  };

  const handleApplySuggestedQueueOrder = async (suggestedOrder: string[]) => {
    if (!user || !userCycle || suggestedOrder.length === 0) return;

    const previousUserCycle = userCycle;
    const nextUserCycle = {
      ...userCycle,
      ciclo_atual: suggestedOrder,
      atualizado_em: new Date().toISOString(),
    };

    setUserCycle(nextUserCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(nextUserCycle));

    try {
      const { error } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: suggestedOrder,
          atualizado_em: nextUserCycle.atualizado_em,
        })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      await recordCycleEvent('cycle_reordered', {
        cycleOrderSnapshot: suggestedOrder,
        metadata: {
          source: 'strategic_suggestion',
          previousOrder: previousUserCycle.ciclo_atual || [],
          newOrder: suggestedOrder,
        },
      });

      toast.success('Sugestão aplicada. A fila do ciclo foi reorganizada.');
    } catch (error) {
      setUserCycle(previousUserCycle);
      localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
      await errorService.report(error, {
        module: 'Subjects',
        action: 'handleApplySuggestedQueueOrder',
        userMessage: 'Erro ao aplicar sugestão de fila.',
        severity: 'medium',
        scope: 'core',
        userId: user.id,
      });
    }
  };

  const handleViewTopics = (subject: Subject) => {
    navigate('/ciclo-estudos');
  };

  const toggleExpand = (itemId: string) => {
    setExpandedSubjectIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleAllCycleSubjects = () => {
    const cycleSubjectIds = filteredList
      .filter(item => !studiedCycleIdSet.has(item.subject.id))
      .map(item => item.id);
    const allCycleSubjectsExpanded = cycleSubjectIds.length > 0 &&
      cycleSubjectIds.every(id => expandedSubjectIds.includes(id));

    setExpandedSubjectIds(prev => {
      if (allCycleSubjectsExpanded) {
        return prev.filter(id => !cycleSubjectIds.includes(id));
      }

      return Array.from(new Set([...prev, ...cycleSubjectIds]));
    });
  };

  const handleOpenTopicsModal = (subject: Subject) => {
    setTopicsModal({ isOpen: true, subject });
  };

  const handleCloseTopicsModal = () => {
    setTopicsModal({ isOpen: false, subject: null });
    // Refresh data para atualizar a contagem de tópicos e ordem
    setTimeout(() => {
      refreshData();
    }, 200);
  };

  // handleAddSubjectView e handleRemoveSubjectView removidos — duplicação descontinuada
  // Lista filtrada baseada no status selecionado
  const filteredList = useMemo(() => {
    let list = expandedSubjectList;

    // Filtragem de busca
    if (newSubjectName.trim() && !isImportEditalModalOpen) {
      const normalizeText = (text: string) =>
        text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const normalizedQuery = normalizeText(newSubjectName);

      list = list.filter(item => {
        const matchesSubject = normalizeText(item.subject.name).includes(normalizedQuery);
        const hasMatchingTopic = item.subject.topics?.some(topic =>
          normalizeText(topic.name).includes(normalizedQuery)
        );
        return matchesSubject || hasMatchingTopic;
      });
    }

    return list;
  }, [expandedSubjectList, newSubjectName, isImportEditalModalOpen]);

  const studiedCycleList = useMemo(() => {
    const studiedIds = (userCycle?.materias_estudadas_ciclo || [])
      .map((id: string) => getUnifiedSubjectId(id, dynamicUnificationMap));
    const seen = new Set<string>();

    return studiedIds
      .map((id: string) => filteredList.find(item => item.subject.id === id))
      .filter((item): item is ExpandedSubjectItem => {
        if (!item || seen.has(item.subject.id)) return false;
        seen.add(item.subject.id);
        return true;
      });
  }, [filteredList, userCycle?.materias_estudadas_ciclo, dynamicUnificationMap]);
  const isCycleFullyStudied = expandedSubjectList.length > 0 &&
    expandedSubjectList.every(item => studiedCycleIdSet.has(item.subject.id));
  const orderedCycleDisplayList = useMemo(() => {
    const pending: ExpandedSubjectItem[] = [];
    const studied: ExpandedSubjectItem[] = [];

    filteredList.forEach(item => {
      if (studiedCycleIdSet.has(item.subject.id)) {
        studied.push(item);
      } else {
        pending.push(item);
      }
    });

    return [...pending, ...studied];
  }, [filteredList, studiedCycleIdSet]);

  const verticalSubjectList = useMemo(() => {
    const normalizeText = (text: string) =>
      text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normalizedQuery = newSubjectName.trim() && !isImportEditalModalOpen
      ? normalizeText(newSubjectName)
      : '';

    return filteredList
      .map(({ subject }) => {
        const subjectMatches = normalizedQuery
          ? normalizeText(subject.name).includes(normalizedQuery)
          : false;

        const topics = subject.topics
          .filter(topic => topic.is_active !== false)
          .filter(topic => {
            if (!normalizedQuery || subjectMatches) return true;
            return normalizeText(topic.name).includes(normalizedQuery);
          });

        return {
          id: subject.id,
          subject,
          topics,
        };
      })
      .filter(item => item.topics.length > 0);
  }, [
    filteredList,
    newSubjectName,
    isImportEditalModalOpen,
  ]);

  const handleOpenVerticalTopicNotes = useCallback((subjectId: string, topicId: string) => {
    const subject = verticalSubjectList.find(item => item.id === subjectId);
    const topic = subject?.topics.find(item => item.id === topicId);

    if (!subject || !topic) return;

    setSelectedTopicForNotes({
      id: topic.id,
      name: topic.name,
      subjectName: subject.subject.name,
    });
  }, [verticalSubjectList]);

  // Lista para renderizar (com paginação - Lazy Loading)
  const displayList = useMemo(() => {
    return orderedCycleDisplayList.slice(0, visibleCount);
  }, [orderedCycleDisplayList, visibleCount]);

  const totalDisplayItems = orderedCycleDisplayList.length;
  const hasMore = totalDisplayItems > visibleCount;
  const hasActiveCycle = Boolean(userCycle?.ciclo_atual?.length);
  const hasCycleSubjects = expandedSubjectList.length > 0;
  const showCycleWorkspace = hasActiveCycle && hasCycleSubjects;
	  const cycleVisualStats = useMemo(() => {
	    const cycleSubjects = expandedSubjectList.map(item => item.subject);
	    const totalSubjects = cycleSubjects.length;
	    const studiedSubjects = cycleSubjects.filter(subject => studiedCycleIdSet.has(subject.id)).length;
	    const remainingSubjects = Math.max(totalSubjects - studiedSubjects, 0);
    const progressPercentage = totalSubjects > 0 ? Math.round((studiedSubjects / totalSubjects) * 100) : 0;
    const parsedCycleStartMs = userCycle?.data_inicio_ciclo ? new Date(userCycle.data_inicio_ciclo).getTime() : NaN;
    const cycleStartMs = Number.isFinite(parsedCycleStartMs) ? parsedCycleStartMs : Date.now();
    const elapsedDays = Math.max(
      1,
      Math.ceil((Date.now() - cycleStartMs) / (1000 * 60 * 60 * 24))
    );
    const subjectsPerDay = studiedSubjects > 0 ? studiedSubjects / elapsedDays : 0;
    const daysToFinish = subjectsPerDay > 0 ? Math.ceil(remainingSubjects / subjectsPerDay) : null;

    return {
      totalSubjects,
      studiedSubjects,
      remainingSubjects,
      progressPercentage,
      elapsedDays,
      subjectsPerDay,
	      daysToFinish,
	    };
	  }, [expandedSubjectList, studiedCycleIdSet, userCycle?.data_inicio_ciclo]);

	  const strategicPanelStats = useMemo(() => {
	    const cycleSubjects = expandedSubjectList.map(item => item.subject);
	    const cycleStart = userCycle?.data_inicio_ciclo || null;
	    const totalSubjects = cycleSubjects.length;
	    const totalTopics = cycleSubjects.reduce(
	      (sum, subject) => sum + subject.topics.filter(topic => topic.is_active !== false).length,
	      0,
	    );
	    const startedTopics = cycleSubjects.reduce(
	      (sum, subject) => sum + subject.topics.filter(topic => topic.is_active !== false && isTopicStarted(topic)).length,
	      0,
	    );
	    const completedTopics = cycleSubjects.reduce(
	      (sum, subject) => sum + subject.topics.filter(topic => topic.is_active !== false && isTopicCompleted(topic)).length,
	      0,
	    );
	    const coveragePercentage = totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0;
	    const completedSubjects = cycleSubjects.filter(subject => {
	      const activeTopics = subject.topics.filter(topic => topic.is_active !== false);
	      return activeTopics.length > 0 && activeTopics.every(isTopicCompleted);
	    }).length;
	    const inProgressSubjects = cycleSubjects.filter(subject =>
	      subject.topics.some(topic => topic.is_active !== false && isTopicStarted(topic) && !isTopicCompleted(topic))
	    ).length;
	    const topicsStartedThisCycle = cycleSubjects.reduce(
	      (sum, subject) => sum + subject.topics.filter(topic =>
	        topic.is_active !== false && isTopicNewlyStartedInCycle(topic, cycleStart)
	      ).length,
	      0,
	    );
	    const perSubjectStartedThisCycle = cycleSubjects.map(subject => {
	      const activeTopics = subject.topics.filter(topic => topic.is_active !== false);
	      return {
	        subjectName: getUnifiedSubjectName(subject.id, subject.name),
	        topicsStarted: activeTopics.filter(topic => isTopicNewlyStartedInCycle(topic, cycleStart)).length,
	        totalTopics: activeTopics.length,
	      };
	    });
	    const subjectWithMostTopicsStartedThisCycle = perSubjectStartedThisCycle.reduce<{
	      subjectName: string;
	      topicsStarted: number;
	      totalTopics: number;
	    } | null>((best, subject) => {
	      if (subject.topicsStarted <= 0) return best;
	      if (!best || subject.topicsStarted > best.topicsStarted) return subject;
	      return best;
	    }, null);
	    const examWeightTotals = getExamWeightTotals(cycleSubjects);
	    const highestIncidenceTopic = cycleSubjects.flatMap(subject =>
	      subject.topics
	        .filter(topic => topic.is_active !== false && typeof topic.total_volume === 'number' && topic.total_volume > 0)
	        .map(topic => ({
	          topicName: topic.name,
	          subjectName: getUnifiedSubjectName(subject.id, subject.name),
	          volume: topic.total_volume || 0,
	        }))
	    ).reduce<{
	      topicName: string;
	      subjectName: string;
	      volume: number;
	    } | null>((best, topic) => {
	      if (!best || topic.volume > best.volume) return topic;
	      return best;
	    }, null);
	    const analyzedTopicVolumes = cycleSubjects.flatMap(subject =>
	      subject.topics
	        .filter(topic => topic.is_active !== false && typeof topic.total_volume === 'number' && topic.total_volume > 0)
	        .map(topic => ({
	          topicName: topic.name,
	          subjectName: getUnifiedSubjectName(subject.id, subject.name),
	          volume: topic.total_volume || 0,
	        }))
	    );
	    const lowestIncidenceTopic = analyzedTopicVolumes.reduce<{
	      topicName: string;
	      subjectName: string;
	      volume: number;
	    } | null>((best, topic) => {
	      if (!best || topic.volume < best.volume) return topic;
	      return best;
	    }, null);
	    const highestIncidenceSubject = cycleSubjects.map(subject => {
	      const analyzedTopics = subject.topics.filter(topic =>
	        topic.is_active !== false && typeof topic.total_volume === 'number' && topic.total_volume > 0
	      );
	      const totalVolume = analyzedTopics.reduce((sum, topic) => sum + (topic.total_volume || 0), 0);

	      return {
	        subjectName: getUnifiedSubjectName(subject.id, subject.name),
	        totalVolume,
	        analyzedTopicsCount: analyzedTopics.length,
	      };
	    }).filter(item => item.totalVolume > 0)
	      .reduce<{
	        subjectName: string;
	        totalVolume: number;
	        analyzedTopicsCount: number;
	      } | null>((best, subject) => {
	        if (!best || subject.totalVolume > best.totalVolume) return subject;
	        return best;
	      }, null);
	    const highestPendingWeightSubject = cycleSubjects
	      .filter(subject => getSubjectPendingTopicsCount(subject) > 0)
	      .map(subject => ({
	        subject,
	        effectiveWeight: getEffectiveSubjectExamWeight(subject),
	        percentage: getSubjectExamWeightPercentage(subject, examWeightTotals),
	      }))
	      .filter(item => item.effectiveWeight.source !== 'none')
	      .reduce<{
	        subject: Subject;
	        effectiveWeight: ReturnType<typeof getEffectiveSubjectExamWeight>;
	        percentage: number | null;
	      } | null>((best, item) => {
	        if (!best || item.effectiveWeight.value > best.effectiveWeight.value) return item;
	        return best;
	      }, null);
	    return {
	      totalSubjects,
	      totalTopics,
	      startedTopics,
	      completedTopics,
	      coveragePercentage,
	      completedSubjects,
	      inProgressSubjects,
	      topicsStartedThisCycle,
	      subjectWithMostTopicsStartedThisCycle,
	      highestIncidenceTopic,
	      lowestIncidenceTopic,
	      highestIncidenceSubject,
	      highestPendingWeightSubject,
	    };
	  }, [expandedSubjectList, getUnifiedSubjectName, userCycle?.data_inicio_ciclo]);

	  const strategicAlerts = useMemo(() => {
	    const cycleSubjects = expandedSubjectList.map(item => ({
	      ...item.subject,
	      name: getUnifiedSubjectName(item.subject.id, item.subject.name),
	    }));

	    return getStudyCycleAlerts({
	      subjects: cycleSubjects,
	      editais: editaisNoCiclo.map(edital => ({
	        id: edital.id,
	        name: edital.organ || edital.name || 'Edital',
	        exam_date: edital.exam_date || edital.examDate || null,
	        subject_ids: edital.subject_ids || edital.subjectIds || [],
	      })),
	      hasCycleHistory: cycleSnapshots.length > 0,
	      maxAlerts: 3,
	    });
	  }, [cycleSnapshots.length, editaisNoCiclo, expandedSubjectList, getUnifiedSubjectName]);

	  const cycleMetrics = useMemo(() => {
	    return getStudyCycleMetrics({
	      subjects: expandedSubjectList.map(item => item.subject),
	      editais: editaisNoCiclo.map(edital => ({
	        exam_date: edital.exam_date || edital.examDate || null,
	      })),
	      cycleStart: userCycle?.data_inicio_ciclo || null,
	      reviewsDoneToday: reviewsDoneTodayCount,
	      hasCycleHistory: cycleSnapshots.length > 0,
	    });
	  }, [cycleSnapshots.length, editaisNoCiclo, expandedSubjectList, reviewsDoneTodayCount, userCycle?.data_inicio_ciclo]);

  const cycleEventInsights = useMemo(() => {
    const currentOrder = (userCycle?.ciclo_atual || []).map((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap)
    );

    return getStudyCycleEventInsights({
      subjects: expandedSubjectList.map(item => ({
        ...item.subject,
        name: getUnifiedSubjectName(item.subject.id, item.subject.name),
      })),
      events: cycleStudyEvents,
      currentOrder,
      overdueReviews: cycleMetrics.overdueReviews,
      minEvents: 5,
      maxInsights: 3,
    });
  }, [cycleMetrics.overdueReviews, cycleStudyEvents, dynamicUnificationMap, expandedSubjectList, getUnifiedSubjectName, userCycle?.ciclo_atual]);

  const queueSuggestion = useMemo(() => {
    const currentOrder = (userCycle?.ciclo_atual || []).map((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap)
    );

    return getStudyCycleQueueSuggestion({
      subjects: expandedSubjectList.map(item => ({
        ...item.subject,
        name: getUnifiedSubjectName(item.subject.id, item.subject.name),
      })),
      events: cycleStudyEvents,
      currentOrder,
      minEvents: 6,
    });
  }, [cycleStudyEvents, dynamicUnificationMap, expandedSubjectList, getUnifiedSubjectName, userCycle?.ciclo_atual]);

	  if (isLoading || isOriginsLoading || loading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const renderSubjectWeightControl = (subject: Subject) => {
    const strategicWeight = getSubjectStrategicWeight(subject);
    const isEditingWeight = editingWeightSubjectId === subject.id;

    if (isEditingWeight) {
      return (
        <div
          className="flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            value={weightDraft.questions}
            onChange={(event) => setWeightDraft(prev => ({ ...prev, questions: event.target.value }))}
            placeholder="Questões"
            inputMode="decimal"
            className="h-7 w-16 rounded-md border border-border/60 bg-background px-2 text-[10px] font-bold text-foreground outline-none focus:border-primary"
          />
          <input
            value={weightDraft.points}
            onChange={(event) => setWeightDraft(prev => ({ ...prev, points: event.target.value }))}
            placeholder="Pontos"
            inputMode="decimal"
            className="h-7 w-16 rounded-md border border-border/60 bg-background px-2 text-[10px] font-bold text-foreground outline-none focus:border-primary"
          />
          <input
            value={weightDraft.percentage}
            onChange={(event) => setWeightDraft(prev => ({ ...prev, percentage: event.target.value }))}
            placeholder="%"
            inputMode="decimal"
            className="h-7 w-12 rounded-md border border-border/60 bg-background px-2 text-[10px] font-bold text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => handleSaveSubjectWeightInline(subject.id)}
            disabled={isSavingWeight}
            className="h-7 w-7 rounded-md bg-primary text-primary-foreground disabled:opacity-60 inline-flex items-center justify-center"
            title="Salvar peso"
            aria-label="Salvar peso da matéria"
          >
            {isSavingWeight ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button
            type="button"
            onClick={handleCancelWeightEdit}
            disabled={isSavingWeight}
            className="h-7 w-7 rounded-md border border-border/60 text-content-muted hover:text-foreground disabled:opacity-60 inline-flex items-center justify-center"
            title="Cancelar"
            aria-label="Cancelar edição de peso"
          >
            <X size={12} />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          handleStartWeightEdit(subject);
        }}
        className={`font-bold px-1.5 py-0.5 rounded-md border transition-colors ${
          strategicWeight.hasWeight
            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 hover:bg-sky-500/15'
            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 hover:bg-amber-500/15'
        }`}
        title={strategicWeight.hasWeight ? `${strategicWeight.label}. Clique para editar.` : 'Clique para informar o peso desta matéria.'}
        aria-label={strategicWeight.hasWeight ? 'Editar peso da matéria' : 'Informar peso da matéria'}
      >
        {strategicWeight.hasWeight ? strategicWeight.label : 'Sem peso'}
      </button>
    );
  };

  const handleStrategicAlertAction = (alert: StudyCycleAlert) => {
    if (alert.actionType === 'fill_weight' && alert.subjectId) {
      const subject = expandedSubjectList.find(item => item.subject.id === alert.subjectId)?.subject;
      if (subject) {
        handleStartWeightEdit(subject);
        setExpandedSubjectIds(prev => Array.from(new Set([...prev, alert.subjectId!])));
      }
      return;
    }

    if (alert.actionType === 'start_topic' && alert.topicId) {
      openReviewModal(alert.topicId);
      return;
    }

    if ((alert.actionType === 'start_topic' || alert.actionType === 'review_cycle') && alert.subjectId) {
      setExpandedSubjectIds(prev => Array.from(new Set([...prev, alert.subjectId!])));
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-subject-id="${alert.subjectId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const getVerticalTopicStatus = (topic: Topic) => {
    if (topic.is_active === false) {
      const statusVisual = getCycleTopicStatusVisual(topic);
      return { label: statusVisual.label, className: statusVisual.badgeClassName };
    }

    if (isTopicCompleted(topic)) {
      const statusVisual = getCycleTopicStatusVisual(topic);
      return { label: statusVisual.label, className: statusVisual.badgeClassName };
    }

    const statusVisual = getCycleTopicStatusVisual(topic);
    return { label: statusVisual.label, className: statusVisual.badgeClassName };
  };

  const renderVerticalEditalView = () => (
    <div className="w-full rounded-xl border border-border/40 dark:border-white/5 overflow-hidden bg-card">
      {verticalSubjectList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-content-muted">
          <FileText size={28} className="mb-3 opacity-50" />
          <p className="text-sm font-semibold">Nenhum tópico encontrado{newSubjectName.trim() ? ` para "${newSubjectName}"` : ''}.</p>
        </div>
      ) : (
	        verticalSubjectList.map(({ subject, topics }) => (
	          <div key={subject.id} className="border-b border-border/40 dark:border-white/5 last:border-b-0">
	            <div className="sticky top-0 z-10 bg-background flex flex-wrap items-center gap-2 px-4 py-2 border-b border-primary/10">
	              <span className="text-xs font-black uppercase tracking-widest text-primary/80">
	                {getUnifiedSubjectName(subject.id, subject.name)}
	              </span>
	              <span className="text-[10px] text-content-muted font-semibold tabular-nums">
	                {topics.length} tópico{topics.length !== 1 ? 's' : ''}
	              </span>
	              {renderSubjectWeightControl(subject)}
	            </div>

            {topics
              .slice()
              .sort((a, b) => {
                if (a.position !== undefined && b.position !== undefined) return a.position - b.position;
                if (!a.created_at && !b.created_at) return 0;
                if (!a.created_at) return 1;
                if (!b.created_at) return -1;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              })
              .map((topic) => {
                const contactCount = getTopicContactCount(topic, topicStats);
	                const status = getVerticalTopicStatus(topic);
	                const statusVisual = getCycleTopicStatusVisual(topic);
	                const hasStarted = contactCount > 0 || isTopicStarted(topic);
	                const studiedInCurrentCycle = isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo);
	                const incidenceTitle = getStrategicTopicIncidenceTitle(topic);
	                const incidenceDisplay = getStrategicTopicIncidenceDisplay(topic);
	                const hasNotes = Boolean(
                  (typeof topic.notes === 'string' ? topic.notes : topic.notes?.content)?.trim() &&
                  (typeof topic.notes === 'string' ? topic.notes : topic.notes?.content) !== '<p><br></p>'
                );

                return (
	                  <div
	                    key={topic.id}
	                    className="relative flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-2.5 pl-5 border-b border-border/40 dark:border-white/5 last:border-b-0 hover:bg-accent/50 dark:hover:bg-white/[0.03] transition-colors group"
	                  >
                    <div
                      className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${statusVisual.indicatorClassName}`}
                      aria-hidden="true"
                    />
	                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
	                      <span className={`text-sm break-words leading-snug ${isTopicCompleted(topic) ? 'text-content-muted line-through decoration-content-muted/40' : topic.is_active === false ? 'text-content-muted opacity-50' : 'text-foreground'}`}>
	                        {topic.name} {topic.is_active === false && <span className="text-[9px] ml-1 uppercase opacity-60">(inativo)</span>}
	                      </span>
	                      {incidenceDisplay && (
	                        <span
	                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
	                          title={incidenceTitle}
	                        >
	                          {incidenceDisplay}
	                        </span>
	                      )}
                      {studiedInCurrentCycle && !isTopicCompleted(topic) && (
                        <CheckCircle2
                          size={14}
                          className="ml-2 inline-block align-[-2px] text-slate-400 dark:text-slate-500"
                          role="img"
                          aria-label={`Tópico novo neste ciclo: ${topic.name}`}
                        >
                          <title>Tópico novo neste ciclo</title>
                        </CheckCircle2>
                      )}
                    </div>

	                    <span className={`flex-shrink-0 self-end lg:self-center px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${status.className}`}>
	                      {status.label}
	                    </span>

	                    <div className="flex-shrink-0 self-end lg:self-center flex flex-wrap items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenVerticalTopicNotes(subject.id, topic.id)}
                        className={`p-1 rounded transition-colors ${hasNotes ? 'text-primary/60 hover:text-primary' : 'text-gray-400 hover:text-primary/70'}`}
                        aria-label={`Anotações para ${topic.name}`}
                        title={`Anotações para ${topic.name}`}
                      >
                        <FileText size={15} />
                      </button>

	                      {isTopicCompleted(topic) ? (
	                        <span className="h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold whitespace-nowrap">
	                          <Check size={12} />
	                          Concluído
	                        </span>
	                      ) : hasStarted ? (
	                        <button
	                          onClick={() => navigate(`/revisoes?topicId=${topic.id}`)}
	                          className={`h-8 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all border text-[11px] font-bold whitespace-nowrap ${statusVisual.actionClassName}`}
	                          title="Continuar estudo do tópico"
	                          aria-label={`Continuar estudo do tópico ${topic.name}`}
	                        >
	                          <BookOpen size={12} />
	                          Continuar
	                        </button>
	                      ) : (
	                        <button
	                          onClick={() => openReviewModal(topic.id)}
	                          className={`h-8 px-3 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-[11px] font-bold whitespace-nowrap ${statusVisual.actionClassName}`}
	                          title="Iniciar estudo do tópico"
	                          aria-label={`Iniciar estudo do tópico ${topic.name}`}
	                        >
	                          <Play size={10} className="ml-[1px]" />
	                          Iniciar estudo
	                        </button>
	                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        ))
      )}
    </div>
  );

  const renderEmptyCycleState = () => (
    <div className="flex min-h-[520px] w-full items-center justify-center text-center">
      <div className="flex max-w-md flex-col items-center">
        <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <span className="text-4xl text-primary">📚</span>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-3">
          {hasActiveCycle ? 'Nenhuma matéria ativa no ciclo' : 'Seu ciclo ainda não está montado'}
        </h3>
        <p className="text-content-muted mx-auto mb-8 leading-relaxed">
          {hasActiveCycle
            ? 'As matérias do ciclo foram ocultadas ou removidas do edital. Reative as matérias em Meus Editais para continuar estudando.'
            : 'Escolha um edital e ative as matérias que farão parte da fila. A página só vira mapa de estudo quando existe uma fila real.'}
        </p>
        <button
          onClick={() => navigate('/meus-editais', { state: { filterCycle: true } })}
          className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
        >
          Ir para Meus Editais
        </button>
      </div>
    </div>
  );

	  const StrategicEditalPanel = () => {
	    const highestPendingWeight = strategicPanelStats.highestPendingWeightSubject;
	    const highestIncidence = strategicPanelStats.highestIncidenceTopic;
	    const lowestIncidence = strategicPanelStats.lowestIncidenceTopic;
	    const highestIncidenceSubject = strategicPanelStats.highestIncidenceSubject;
	    const currentCycleNumber = (userCycle?.ciclos_realizados || 0) + 1;
	    const activeCycleEditais = editaisNoCiclo.filter(e =>
	      e.subject_ids.some(sid => localSubjects.find(s => s.id === sid))
	    );
	    const editalCycleLabel = activeCycleEditais.length > 0
	      ? activeCycleEditais
	        .map(edital => {
	          const editalName = (edital.organ || edital.name || 'Edital').trim();
	          const position = edital.position?.trim();
	          return position ? `${editalName} • ${position}` : editalName;
	        })
	        .join(' | ')
	      : 'Edital carregado';
	    const formatDerivedWeightPercentage = (value?: number | null) =>
	      typeof value === 'number' && Number.isFinite(value)
	        ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do edital`
	        : null;
	    const insightItems = [
	      highestIncidenceSubject
	        ? {
	            label: 'Matéria mais cobrada',
	            value: `${highestIncidenceSubject.subjectName} (${highestIncidenceSubject.totalVolume.toLocaleString('pt-BR')})`,
	            icon: Trophy,
	            className: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
	          }
	        : null,
	      highestIncidence
	        ? {
	            label: 'Tópico mais cobrado',
	            value: `${highestIncidence.topicName} em ${highestIncidence.subjectName} (${highestIncidence.volume.toLocaleString('pt-BR')})`,
	            icon: TrendingUp,
	            className: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
	          }
	        : null,
	      lowestIncidence && highestIncidence && lowestIncidence.topicName !== highestIncidence.topicName
	        ? {
	            label: 'Tópico menos cobrado',
	            value: `${lowestIncidence.topicName} em ${lowestIncidence.subjectName} (${lowestIncidence.volume.toLocaleString('pt-BR')})`,
	            icon: TrendingDown,
	            className: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
	          }
	        : null,
	      highestPendingWeight
	        ? {
	            label: 'Maior peso pendente',
	            value: `${getUnifiedSubjectName(highestPendingWeight.subject.id, highestPendingWeight.subject.name)} (${formatDerivedWeightPercentage(highestPendingWeight.percentage) || `${highestPendingWeight.effectiveWeight.value} ${highestPendingWeight.effectiveWeight.label}`})`,
	            icon: Target,
	            className: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
	          }
	        : null,
	    ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Target; className: string }>;
	    const forecastText = cycleVisualStats.remainingSubjects === 0
	      ? 'Este ciclo já está completo.'
	      : cycleVisualStats.daysToFinish !== null && cycleVisualStats.daysToFinish > 0
	        ? `Mantendo o ritmo atual, você fecha a fila em aproximadamente ${cycleVisualStats.daysToFinish} dias.`
	        : null;
	    const lastClosedCycle = cycleSnapshots[0] || null;
	    const subjectDelta = lastClosedCycle
	      ? cycleVisualStats.studiedSubjects - lastClosedCycle.studied_subject_count
	      : null;
	    const topicDelta = lastClosedCycle
	      ? strategicPanelStats.topicsStartedThisCycle - lastClosedCycle.topics_started_count
	      : null;
	    const formatDelta = (value: number | null, singular: string, pluralText: string) => {
	      if (value === null) return null;
	      if (value === 0) return `igual ao ciclo ${lastClosedCycle?.cycle_number}`;
	      const abs = Math.abs(value);
	      return `${value > 0 ? '+' : '-'}${abs} ${abs === 1 ? singular : pluralText} vs ciclo ${lastClosedCycle?.cycle_number}`;
	    };
	    const alertStyles: Record<StudyCycleAlert['severity'], { card: string; icon: string; label: string }> = {
	      critical: {
	        card: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
	        icon: 'bg-rose-500/15 text-rose-300',
	        label: 'Crítico',
	      },
	      warning: {
	        card: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
	        icon: 'bg-amber-500/15 text-amber-300',
	        label: 'Atenção',
	      },
	      info: {
	        card: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
	        icon: 'bg-sky-500/15 text-sky-300',
	        label: 'Sinal',
	      },
	    };

	    return (
	      <aside className="hidden md:block min-w-0">
	        <div className="sticky top-4">
	          <div className="mb-3 flex items-center gap-2 px-1">
	            <Shield size={14} className="text-primary shrink-0" />
            <h3 className="text-[15px] font-bold text-primary">
	              Painel estratégico do edital
	            </h3>
	          </div>

	          <div className="space-y-3">
	            <div className="overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-4">
	              <div className="flex items-start justify-between gap-4">
	                <div className="min-w-0">
	                  <h4 className="text-[11px] font-black uppercase tracking-widest text-primary">
	                    Ciclo {currentCycleNumber}
	                  </h4>
	                  <p className="mt-1 truncate text-[11px] font-semibold text-content-muted" title={editalCycleLabel}>
	                    {editalCycleLabel}
	                  </p>
	                </div>
	                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-primary/25 bg-background/60">
	                  <span className="text-lg font-black text-foreground tabular-nums">{strategicPanelStats.coveragePercentage}%</span>
	                </div>
	              </div>
	              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
	                <div
	                  className="h-full rounded-full bg-primary transition-all duration-500"
	                  style={{ width: `${strategicPanelStats.coveragePercentage}%` }}
	                />
	              </div>
	              <div className="mt-4 space-y-2">
	                <div className="rounded-lg border border-white/10 bg-background/35 px-3 py-2">
	                  <div className="flex items-center justify-between gap-3">
	                    <p className="text-[10px] font-black uppercase text-content-muted">Matérias marcadas neste ciclo</p>
	                    <p className="text-base font-black text-foreground tabular-nums">{cycleVisualStats.studiedSubjects}</p>
	                  </div>
	                  {formatDelta(subjectDelta, 'matéria', 'matérias') && (
	                    <p className="mt-1 text-[10px] font-semibold text-content-muted">
	                      {formatDelta(subjectDelta, 'matéria', 'matérias')}
	                    </p>
	                  )}
	                </div>
	                <div className="rounded-lg border border-white/10 bg-background/35 px-3 py-2">
	                  <div className="flex items-center justify-between gap-3">
	                    <p className="text-[10px] font-black uppercase text-content-muted">Tópicos novos no ciclo</p>
	                    <p className="text-base font-black text-foreground tabular-nums">{strategicPanelStats.topicsStartedThisCycle}</p>
	                  </div>
	                  {formatDelta(topicDelta, 'tópico', 'tópicos') && (
	                    <p className="mt-1 text-[10px] font-semibold text-content-muted">
	                      {formatDelta(topicDelta, 'tópico', 'tópicos')}
	                    </p>
	                  )}
	                </div>
	                {strategicPanelStats.subjectWithMostTopicsStartedThisCycle ? (
	                  <div className="rounded-lg border border-white/10 bg-background/35 px-3 py-2">
	                    <p className="text-[10px] font-black uppercase text-content-muted">Maior abertura no ciclo</p>
	                    <p className="mt-1 truncate text-xs font-black text-foreground" title={strategicPanelStats.subjectWithMostTopicsStartedThisCycle.subjectName}>
	                      {strategicPanelStats.subjectWithMostTopicsStartedThisCycle.subjectName}
	                    </p>
	                    <p className="mt-1 text-[10px] text-content-muted">
	                      {strategicPanelStats.subjectWithMostTopicsStartedThisCycle.topicsStarted}/{strategicPanelStats.subjectWithMostTopicsStartedThisCycle.totalTopics} tópicos novos
	                    </p>
	                  </div>
	                ) : (
	                  <div className="rounded-lg border border-dashed border-white/10 bg-background/20 px-3 py-2">
	                    <p className="text-[10px] font-black uppercase text-content-muted">Maior abertura no ciclo</p>
	                    <p className="mt-1 text-xs text-content-muted">Ainda sem tópicos novos neste ciclo.</p>
	                  </div>
	                )}
	                {!lastClosedCycle && (
	                  <p className="text-[11px] text-content-muted leading-relaxed">
	                    Ao iniciar o próximo ciclo, este resumo será salvo para comparar sua evolução.
	                  </p>
	                )}
	              </div>
	            </div>

	            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4">
	              <div className="mb-3 flex items-center justify-between gap-3">
	                <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
	                  Plano de hoje
	                </h4>
	                <Clock size={15} className="text-emerald-300" />
	              </div>
	              <div className="grid grid-cols-2 gap-2">
	                <div className="rounded-lg border border-emerald-500/15 bg-background/35 px-3 py-2">
	                  <p className="text-[10px] font-black uppercase text-content-muted">Tópicos novos</p>
	                  <p className="mt-1 text-lg font-black text-foreground tabular-nums">
	                    {cycleMetrics.dailyNewTopicsGoal}
	                  </p>
	                  <p className="mt-1 text-[10px] text-content-muted">
	                    {cycleMetrics.newTopicDeficitToday > 0
	                      ? `faltam ${cycleMetrics.newTopicDeficitToday} hoje`
	                      : cycleMetrics.dailyNewTopicsGoal > 0
	                        ? 'meta cumprida hoje'
	                        : 'sem prova datada'}
	                  </p>
	                </div>
	                <div className="rounded-lg border border-emerald-500/15 bg-background/35 px-3 py-2">
	                  <p className="text-[10px] font-black uppercase text-content-muted">Revisões hoje</p>
	                  <p className="mt-1 text-lg font-black text-foreground tabular-nums">
	                    {cycleMetrics.dailyReviewGoal}
	                  </p>
	                  <p className="mt-1 text-[10px] text-content-muted">
	                    {cycleMetrics.reviewDeficitToday > 0
	                      ? `${cycleMetrics.overdueReviews} atrasada${cycleMetrics.overdueReviews === 1 ? '' : 's'}`
	                      : cycleMetrics.dailyReviewGoal > 0
	                        ? 'revisões em dia'
	                        : 'sem revisão vencida'}
	                  </p>
	                </div>
	              </div>
	              <div className="mt-2 rounded-lg border border-emerald-500/15 bg-background/30 px-3 py-2">
	                <div className="flex items-center justify-between gap-3">
	                  <p className="text-[10px] font-black uppercase text-content-muted">Faltam iniciar</p>
	                  <p className="text-sm font-black text-foreground tabular-nums">{cycleMetrics.unstartedTopics}</p>
	                </div>
	                <p className="mt-1 text-[10px] leading-relaxed text-content-muted">
	                  {cycleMetrics.daysUntilExam !== null
	                    ? `Para ver tudo antes da prova, a meta usa ${cycleMetrics.daysUntilExam} dia${cycleMetrics.daysUntilExam === 1 ? '' : 's'} restantes.`
	                    : cycleMetrics.estimatedDaysToFirstContact !== null
	                      ? `No ritmo atual, o primeiro contato fecha em cerca de ${cycleMetrics.estimatedDaysToFirstContact} dia${cycleMetrics.estimatedDaysToFirstContact === 1 ? '' : 's'}.`
	                      : 'Inicie tópicos para o sistema estimar o fechamento do primeiro contato.'}
	                </p>
	              </div>
	            </div>

	            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
	              <div className="mb-3 flex items-center justify-between gap-3">
	                <h4 className="text-[11px] font-black uppercase tracking-widest text-cyan-300">
	                  Sinais de cobrança
	                </h4>
	                <Target size={15} className="text-cyan-300" />
	              </div>
	              {highestIncidence ? (
	                <div className="space-y-3">
	                  <div className="rounded-xl border border-cyan-500/25 bg-background/50 p-3">
	                    <div className="mb-2 flex items-center gap-2">
	                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-500/15 text-cyan-300">
	                        <TrendingUp size={15} />
	                      </div>
	                      <p className="text-[10px] font-black uppercase tracking-wider text-cyan-300">Maior sinal</p>
	                    </div>
	                    <p className="text-sm font-black leading-snug text-foreground">{highestIncidence.topicName}</p>
	                    <p className="mt-1 text-[11px] text-content-muted">
	                      {highestIncidence.subjectName} · sinal {highestIncidence.volume.toLocaleString('pt-BR')}
	                    </p>
	                  </div>
	                  {lowestIncidence && lowestIncidence.topicName !== highestIncidence.topicName && (
	                    <div className="flex items-start gap-2 rounded-lg border border-cyan-500/15 bg-background/30 px-3 py-2">
	                      <TrendingDown size={14} className="mt-0.5 shrink-0 text-content-muted" />
	                      <div className="min-w-0">
	                        <p className="text-[10px] font-black uppercase text-content-muted">Menor sinal</p>
	                        <p className="truncate text-xs font-bold text-foreground" title={lowestIncidence.topicName}>{lowestIncidence.topicName}</p>
	                      </div>
	                    </div>
	                  )}
	                </div>
	              ) : (
	                <div className="rounded-xl border border-cyan-500/20 bg-background/40 p-3">
	                  <div className="mb-2 flex items-center gap-2 text-cyan-300">
	                    <ScanText size={15} />
	                    <span className="text-[10px] font-black uppercase tracking-wider">Aguardando IA</span>
	                  </div>
	                  <p className="text-xs text-content-muted leading-relaxed">
	                    Quando a IA registrar sinais de cobrança nos tópicos, este mapa mostra os pontos mais fortes do edital.
	                  </p>
	                </div>
	              )}
	            </div>

	            {strategicAlerts.length > 0 && (
	              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
	                <div className="mb-3 flex items-center justify-between gap-3">
	                  <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-300">
	                    Atenção estratégica
	                  </h4>
	                  <AlertCircle size={15} className="text-amber-300" />
	                </div>
	                <div className="space-y-2">
	                  {strategicAlerts.map(alert => {
	                    const style = alertStyles[alert.severity];
	                    return (
	                      <div key={alert.id} className={`rounded-xl border p-3 ${style.card}`}>
	                        <div className="mb-2 flex items-start gap-2">
	                          <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${style.icon}`}>
	                            <AlertCircle size={14} />
	                          </div>
	                          <div className="min-w-0 flex-1">
	                            <div className="flex flex-wrap items-center gap-2">
	                              <span className="text-[9px] font-black uppercase tracking-wider opacity-80">{style.label}</span>
	                              <p className="text-[11px] font-black uppercase tracking-wider text-foreground">{alert.title}</p>
	                            </div>
	                            <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground">{alert.message}</p>
	                            <p className="mt-1 text-[10px] leading-relaxed text-content-muted">{alert.evidence}</p>
	                          </div>
	                        </div>
	                        {alert.actionLabel && alert.actionType !== 'none' && (
	                          <button
	                            type="button"
	                            onClick={() => handleStrategicAlertAction(alert)}
	                            className="mt-1 h-7 rounded-lg border border-white/10 bg-background/45 px-2.5 text-[10px] font-black uppercase tracking-wider text-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
	                          >
	                            {alert.actionLabel}
	                          </button>
	                        )}
	                      </div>
	                    );
	                  })}
	                </div>
	              </div>
	            )}

	            {queueSuggestion && (
	              <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/[0.07] p-4">
	                <div className="mb-3 flex items-center justify-between gap-3">
	                  <h4 className="text-[11px] font-black uppercase tracking-widest text-fuchsia-300">
	                    Ajuste sugerido da fila
	                  </h4>
	                  <ListTodo size={15} className="text-fuchsia-300" />
	                </div>
	                <div className="rounded-xl border border-fuchsia-500/20 bg-background/40 p-3">
	                  <div className="mb-2 flex items-center gap-2">
	                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300">
	                      <MoveUp size={14} />
	                    </div>
	                    <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-300">
	                      {queueSuggestion.title}
	                    </p>
	                  </div>
	                  <p className="text-xs font-semibold leading-relaxed text-foreground">{queueSuggestion.message}</p>
	                  <p className="mt-1 text-[10px] leading-relaxed text-content-muted">{queueSuggestion.evidence}</p>
	                  {queueSuggestion.limitations.length > 0 && (
	                    <div className="mt-2 space-y-1">
	                      {queueSuggestion.limitations.map(limit => (
	                        <p key={limit} className="text-[10px] leading-relaxed text-content-muted">
	                          {limit}
	                        </p>
	                      ))}
	                    </div>
	                  )}
	                  <button
	                    type="button"
	                    onClick={() => handleApplySuggestedQueueOrder(queueSuggestion.suggestedOrder)}
	                    className="mt-3 h-8 rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 text-[10px] font-black uppercase tracking-wider text-fuchsia-200 transition-colors hover:border-fuchsia-400/50 hover:bg-fuchsia-500/20"
	                  >
	                    Aplicar sugestão
	                  </button>
	                </div>
	              </div>
	            )}

	            {cycleEventInsights.length > 0 && (
	              <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.07] p-4">
	                <div className="mb-3 flex items-center justify-between gap-3">
	                  <h4 className="text-[11px] font-black uppercase tracking-widest text-violet-300">
	                    Padrões observados
	                  </h4>
	                  <BarChart2 size={15} className="text-violet-300" />
	                </div>
	                <div className="space-y-2">
	                  {cycleEventInsights.map(insight => (
	                    <div
	                      key={insight.id}
	                      className={`rounded-xl border p-3 ${
	                        insight.severity === 'warning'
	                          ? 'border-violet-500/25 bg-background/45'
	                          : 'border-violet-500/15 bg-background/30'
	                      }`}
	                    >
	                      <div className="mb-1 flex items-center gap-2">
	                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
	                          <BarChart2 size={14} />
	                        </div>
	                        <p className="text-[10px] font-black uppercase tracking-wider text-violet-300">
	                          {insight.title}
	                        </p>
	                      </div>
	                      <p className="text-xs font-semibold leading-relaxed text-foreground">{insight.message}</p>
	                      <p className="mt-1 text-[10px] leading-relaxed text-content-muted">{insight.evidence}</p>
	                    </div>
	                  ))}
	                </div>
	              </div>
	            )}

	            <div className="rounded-xl border border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-card p-4">
	              <div className="mb-3 flex items-center justify-between gap-3">
	                <h4 className="text-[11px] font-black uppercase tracking-widest text-content-muted">
	                  Insights
	                </h4>
	                <Sparkles size={14} className="text-primary" />
	              </div>
	              {insightItems.length > 0 ? (
	                <div className="grid grid-cols-1 gap-2">
	                  {insightItems.slice(0, 4).map(item => {
	                    const Icon = item.icon;
	                    return (
	                      <div key={item.label} className={`rounded-xl border p-3 ${item.className}`}>
	                        <div className="mb-2 flex items-center gap-2">
	                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-background/40">
	                            <Icon size={14} />
	                          </div>
	                          <p className="text-[10px] font-black uppercase tracking-wider">{item.label}</p>
	                        </div>
	                        <p className="text-xs font-semibold leading-relaxed text-foreground">{item.value}</p>
	                      </div>
	                    );
	                  })}
	                </div>
	              ) : (
	                <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-3">
	                  <div className="mb-2 flex items-center gap-2 text-primary">
	                    <Sparkles size={14} />
	                    <span className="text-[10px] font-black uppercase tracking-wider">Sem sinal confiável ainda</span>
	                  </div>
	                  <p className="text-xs text-content-muted leading-relaxed">
	                    Os insights aparecem quando houver peso preenchido, tópicos novos no ciclo ou sinal de cobrança analisado.
	                  </p>
	                </div>
	              )}
	            </div>

	            {forecastText && (
	              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
	                <h4 className="text-[11px] font-black uppercase tracking-widest text-primary mb-2">
	                  Previsão calculada
	                </h4>
	                <p className="text-xs text-content-muted leading-relaxed">
	                  {forecastText}
	                </p>
	              </div>
	            )}
	          </div>
	        </div>
	      </aside>
    );
  };

  const renderCycleDetailsSheet = () => {
    const rhythmWidth = Math.min(100, Math.max(0, Math.round(cycleVisualStats.subjectsPerDay * 25)));
    const formatSubjectsPerDay = (value: number) => {
      if (value <= 0) return 'Sem ritmo ainda';
      if (value < 1) {
        const daysPerSubject = Math.max(2, Math.round(1 / value));
        return `1 matéria a cada ${daysPerSubject} dias`;
      }
      const rounded = Math.round(value);
      const displayValue = Math.abs(value - rounded) < 0.05 ? rounded.toString() : value.toFixed(1);
      return `${displayValue} ${displayValue === '1' ? 'matéria' : 'matérias'}/dia`;
    };

    return (
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="h-7 rounded-lg border border-primary/20 bg-primary/10 px-2.5 text-[10px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 inline-flex items-center gap-1.5"
          >
            <Settings size={12} />
            Detalhes
          </button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:max-w-xl bg-background dark:bg-zinc-950 border-border overflow-y-auto">
          <SheetHeader className="pr-8">
            <SheetTitle className="text-xl font-black tracking-tight">
              Detalhes do Ciclo
            </SheetTitle>
            <SheetDescription>
              Ritmo e controle do ciclo atual.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-border bg-card dark:bg-zinc-900 p-5">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-blue-500" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-content-main">
                  Inteligência de Ritmo
                </h4>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-content-muted">
                      Ritmo atual
                    </span>
                    <span className="text-xs font-black text-foreground tabular-nums">
                      {formatSubjectsPerDay(cycleVisualStats.subjectsPerDay)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${rhythmWidth}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-border/50">
                  <p className="text-xs text-content-muted leading-relaxed">
                    {cycleVisualStats.daysToFinish !== null && cycleVisualStats.daysToFinish > 0 ? (
                      <>
                        Faltam aprox. <strong className="text-foreground">{cycleVisualStats.daysToFinish} dias</strong> para bater este ciclo no ritmo atual.
                      </>
                    ) : cycleVisualStats.remainingSubjects === 0 ? (
                      'Este ciclo já está completo.'
                    ) : (
                      'Marque matérias como estudadas para gerar uma estimativa de conclusão.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-xs font-black uppercase tracking-widest text-red-400 mb-2">
                    Zona de controle
                  </h4>
                  <p className="text-sm font-bold text-foreground">
                    Reiniciar ciclo de estudos
                  </p>
                  <p className="text-xs text-content-muted mt-1 leading-relaxed">
                    Zera o giro atual e limpa as matérias marcadas como estudadas, sem apagar matérias ou tópicos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setResetCycleConfirmOpen(true)}
                  disabled={!userCycle || isResettingCycle}
                  className="h-9 px-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 inline-flex items-center gap-2"
                >
                  {isResettingCycle ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Resetar
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  const mainSubjectUI = (
    <div className="space-y-6 w-full">

      <div className="mb-5 relative z-20">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 min-w-0">
                {/* Search Input - Slightly Wider */}
                <div className="relative w-full sm:min-w-[220px] lg:min-w-[280px] lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={isImportEditalModalOpen ? "Matéria..." : "Buscar..."}
                    value={newSubjectName}
                    onChange={(e) => {
                      const query = e.target.value;
                      const previousName = newSubjectName;
                      setNewSubjectName(query);

                      if (isImportEditalModalOpen) return;

                      if (!previousName && query.trim()) {
                        setExpandedBeforeSearch([...expandedSubjectIds]);
                      }

                      if (query.trim()) {
                        const normalizeText = (text: string) =>
                          text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

                        const normalizedQuery = normalizeText(query);
                        const newExpanded: string[] = [];

                        expandedSubjectList.forEach(item => {
                          const matchesSubject = normalizeText(item.subject.name).includes(normalizedQuery);
                          const hasMatchingTopic = item.subject.topics?.some(topic =>
                            normalizeText(topic.name).includes(normalizedQuery)
                          );
                          if ((matchesSubject || hasMatchingTopic) && !studiedCycleIdSet.has(item.subject.id)) {
                            newExpanded.push(item.id);
                          }
                        });

                        setExpandedSubjectIds(newExpanded);
                      } else {
                        setExpandedSubjectIds(expandedBeforeSearch);
                        setExpandedBeforeSearch([]);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (isImportEditalModalOpen) {
                          const originInput = document.getElementById('new-subject-source');
                          originInput?.focus();
                        } else {
                          handleSaveSubject();
                        }
                      }
                    }}
                    className="w-full h-10 bg-card dark:bg-zinc-900 border border-border dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-content-muted/50 shadow-sm"
                  />
                </div>

                {/* View mode - compact control */}
                {!isImportEditalModalOpen && (
                  <button
                    onClick={() => setActiveTab(activeTab === 'vertical' ? 'all' : 'vertical')}
                    title={activeTab === 'vertical' ? 'Voltar para o modo ciclo' : 'Ver conteúdo em modo edital'}
                    className={`h-10 px-3 rounded-xl border text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap inline-flex items-center gap-2 shrink-0 ${
                      activeTab === 'vertical'
                        ? 'bg-primary/10 border-primary/25 text-primary'
                        : 'bg-card dark:bg-zinc-900 border-border dark:border-white/10 text-content-muted hover:text-primary hover:border-primary/30'
                    }`}
                  >
                    <FileText size={14} />
                    {activeTab === 'vertical' ? 'Modo ciclo' : 'Modo edital'}
                  </button>
                )}
          </div>
        </div>
      </div>

      {activeTab === 'vertical' ? (
        renderVerticalEditalView()
      ) : (
        <div className={activeTab === 'all' ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)] gap-8 items-start" : "w-full"}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
        <div className="w-full min-w-0">
          {activeTab === 'all' && (
            <div className="mb-3 flex items-center justify-between px-1 pl-[26px]">
              <div className="flex items-center gap-2 min-w-0">
                <ListTodo size={14} className="text-primary shrink-0" />
                <h3 className="text-[15px] font-bold text-primary">
                  Fila do Ciclo
                </h3>
                <span className="text-[10px] text-gray-400 dark:text-white/30">
                  ({filteredList.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {renderCycleDetailsSheet()}
                <button
                  type="button"
                  onClick={toggleAllCycleSubjects}
                  className="hidden md:flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-semibold text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary dark:text-white/25 dark:hover:text-primary"
                  title={
                    filteredList.length > 0 && filteredList.every(item => expandedSubjectIds.includes(item.id))
                      ? 'Recolher todos os tópicos'
                      : 'Expandir todos os tópicos'
                  }
                  aria-label={
                    filteredList.length > 0 && filteredList.every(item => expandedSubjectIds.includes(item.id))
                      ? 'Recolher todos os tópicos das matérias'
                      : 'Expandir todos os tópicos das matérias'
                  }
                >
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${
                      filteredList.length > 0 && filteredList.every(item => expandedSubjectIds.includes(item.id))
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                  {filteredList.length > 0 && filteredList.every(item => expandedSubjectIds.includes(item.id))
                    ? 'Recolher'
                    : 'Expandir'}
                </button>
              </div>
            </div>
          )}

          {(displayList.length === 0 && dataLoaded && !isLoading) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500 w-full mb-12">
              {localSubjects.length === 0 ? (
                <>
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <span className="text-4xl text-primary">📚</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    Nenhuma matéria cadastrada
                  </h3>
                  <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                    Importe um edital ou cadastre matérias em Meus Editais para montar uma fila de ciclo confiável.
                  </p>
                  <button
                    onClick={() => navigate('/meus-editais', { state: { filterCycle: true } })}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    Ir para Meus Editais
                  </button>
                </>
              ) : activeTab === 'all' && hasActiveCycle && isCycleFullyStudied ? (
                <div className="w-full max-w-xl rounded-2xl border border-emerald-800/40 bg-emerald-900/10 p-6 text-left shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-foreground">
                        Ciclo {(userCycle?.ciclos_realizados || 0) + 1} finalizado
                      </h3>
                      <p className="text-sm text-content-muted mt-1 leading-relaxed">
                        Todas as matérias pendentes deste ciclo foram marcadas como estudadas.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-5">
                    <div className="rounded-xl border border-emerald-800/30 bg-background/40 p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-content-muted mb-1">
                        Estudadas
                      </p>
                      <p className="text-2xl font-black text-foreground">
                        {studiedCycleList.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-800/30 bg-background/40 p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-content-muted mb-1">
                        Total
                      </p>
                      <p className="text-2xl font-black text-foreground">
                        {studiedCycleList.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setStartNextCycleConfirmOpen(true)}
                      disabled={isStartingNextCycle}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all inline-flex items-center gap-2"
                    >
                      {isStartingNextCycle ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Iniciar Próximo Ciclo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Search size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {newSubjectName.trim() && !isImportEditalModalOpen ? 'Nada encontrado na fila' : 'Nenhuma matéria ativa no ciclo'}
                  </h3>
                  <p className="text-content-muted max-w-sm mx-auto mb-6">
                    {newSubjectName.trim() && !isImportEditalModalOpen
                      ? 'A busca não encontrou matéria ou tópico ativo neste ciclo.'
                      : 'Todas as matérias foram ocultadas ou o edital foi removido do ciclo. Reative matérias em Meus Editais para continuar.'}
                  </p>
                  <button
                    onClick={() => navigate('/meus-editais')}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all"
                  >
                    Ir para Meus Editais
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'all' && isCycleFullyStudied && (
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      Ciclo concluído
                    </p>
                    <p className="text-xs text-content-muted mt-0.5">
                      Todas as matérias da fila foram marcadas como estudadas.
                    </p>
                  </div>
                  <button
                    onClick={() => setStartNextCycleConfirmOpen(true)}
                    disabled={isStartingNextCycle}
                    className="h-9 px-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 inline-flex items-center gap-2"
                  >
                    {isStartingNextCycle ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    Novo Ciclo
                  </button>
                </div>
              )}

              <SortableContext items={displayList.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className={activeTab === 'all' ? "flex flex-col gap-1.5" : "space-y-1.5"}>
                {displayList.map((item) => {
                  const { subject } = item;
                  const isStudiedInCycle = studiedCycleIdSet.has(subject.id);
                  const totalTopicsCount = subject.topics.length;
                  const completedTopicsCount = subject.topics.filter(isTopicCompleted).length;
                  const inReviewTopicsCount = subject.topics.filter(topic =>
                    isTopicStarted(topic) && !isTopicCompleted(topic)
                  ).length;
	                  const noTopics = totalTopicsCount === 0;
	                  const startedTopicsCount = inReviewTopicsCount + completedTopicsCount;
	                  const activeTopicsStartedInCurrentCycle = subject.topics.filter(topic =>
	                    topic.is_active !== false && isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo)
	                  ).length;
	                  const needsCycleClosure = activeTopicsStartedInCurrentCycle > 0 && !isStudiedInCycle;
	                  const topicStatusLabel = noTopics
	                    ? 'Sem tópicos'
                      : startedTopicsCount === 0
                        ? 'Nenhum iniciado'
                      : inReviewTopicsCount === totalTopicsCount
                        ? 'Todos iniciados'
                        : startedTopicsCount === totalTopicsCount
                          ? 'Todos iniciados'
                          : `${startedTopicsCount}/${totalTopicsCount} iniciados`;
	                  const subjectCycleStatusLabel = isStudiedInCycle ? 'Concluída no ciclo' : topicStatusLabel;

                  const isEditing = editingSubjectId === subject.id;

                  return (
                    <SortableItem key={item.id} id={item.id} lockAxis="vertical">
                      {({ listeners, attributes }) => (
                        <div className="w-full max-w-full flex items-start gap-1.5" data-subject-item>
                          <div
                            className="w-5 h-[56px] shrink-0 flex items-center justify-center cursor-move text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/50 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            {...listeners}
                            {...attributes}
                            aria-label={`Ordenar ${getUnifiedSubjectName(subject.id, subject.name)}`}
                            title="Ordenar matéria"
                          >
                            <GripVertical size={15} />
                          </div>

                          {/* Container unificado: header + tópicos no mesmo card */}
                          <div
                            className={`rounded-lg overflow-hidden border transition-all ${
                              expandedSubjectIds.includes(item.id)
                                ? isStudiedInCycle
                                  ? 'border-emerald-200/60 dark:border-emerald-500/20'
                                  : 'border-gray-200 dark:border-white/[0.08] shadow-sm'
                                : isStudiedInCycle
                                  ? 'border-emerald-200/45 dark:border-emerald-500/12 hover:border-emerald-300/70 dark:hover:border-emerald-500/25'
                                  : 'border-gray-100 dark:border-white/[0.04] hover:border-gray-200 dark:hover:border-white/[0.08]'
                            } ${isStudiedInCycle ? 'bg-emerald-50/35 dark:bg-emerald-500/[0.035]' : 'bg-white dark:bg-card'} flex-1 min-w-0`}
                          >
                            {/* === HEADER DA MATÉRIA === */}
                            <div
                              data-subject-id={subject.id}
                              onClick={() => toggleExpand(item.id)}
	                              className={`min-h-[64px] pl-2 pr-4 py-2 flex items-center gap-2 group cursor-pointer relative transition-colors ${
	                                isStudiedInCycle
	                                  ? 'bg-emerald-50/50 dark:bg-emerald-500/[0.045]'
	                                  : ''
                              }`}
                          >
                              {/* Content area: text + progress */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Text Block */}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const edital = editaisData.find(e => e.id === subject.edital_id);
                                      if (edital) {
                                        setSubjectsModal({ 
                                          isOpen: true, 
                                          edital: toEditalModalData(edital),
                                          initialExpandedSubjectId: subject.id
                                        });
                                      }
                                    }}
                                    className="p-0.5 text-gray-300 dark:text-white/20 hover:text-primary transition-colors flex-shrink-0"
                                    title="Gerenciar no Edital / Editar tópicos"
                                  >
                                    <Edit2 size={14} />
                                  </button>

                                  <div className="flex flex-col min-w-0 gap-0.5 flex-1">
                                    <h4 className={`text-[13px] font-bold truncate leading-tight ${
                                      isStudiedInCycle
                                        ? 'text-gray-500 dark:text-white/55'
                                        : 'text-gray-700 dark:text-white/85'
                                    }`}>
                                      {(() => { const n = getUnifiedSubjectName(subject.id, subject.name); return n.charAt(0).toUpperCase() + n.slice(1); })()}
                                    </h4>

	                                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-400 dark:text-white/35 leading-none mt-1">
	                                      <span className="flex items-center gap-0.5">
	                                        <span className="text-[10px]">≡</span> {totalTopicsCount} Tópico{totalTopicsCount === 1 ? '' : 's'}
	                                      </span>
                                      {!noTopics && (
                                        <>
                                          <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-white/20" aria-hidden="true" />
	                                          <span>{subjectCycleStatusLabel}</span>
	                                        </>
	                                      )}
	                                      {!isStudiedInCycle && renderSubjectWeightControl(subject)}
	                                      {isStudiedInCycle && (
	                                        <span
	                                          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/15 bg-emerald-500/10 px-1.5 py-0.5 font-black text-emerald-600 dark:text-emerald-400"
	                                          title="Matéria já marcada como estudada neste ciclo. Ela continua na fila para histórico e pode voltar se necessário."
	                                        >
	                                          <Check size={10} strokeWidth={3} />
	                                          Fechada
	                                        </span>
	                                      )}
	                                      {needsCycleClosure && (
	                                        <span
	                                          className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 font-black text-amber-600 dark:text-amber-300"
	                                          title={`${activeTopicsStartedInCurrentCycle} tópico${activeTopicsStartedInCurrentCycle === 1 ? '' : 's'} novo${activeTopicsStartedInCurrentCycle === 1 ? '' : 's'} neste ciclo. Marque a matéria quando encerrar o bloco.`}
	                                        >
	                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
	                                          Em andamento no ciclo
	                                        </span>
	                                      )}
	                                    </div>
	                                  </div>

                                  {isSubjectMerged(subject.id) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const mergeInfo = getSubjectMergeInfo(subject.id);
                                        if (mergeInfo) {
                                          setSelectedMergeId(mergeInfo.id);
                                          setSelectedMergeName(mergeInfo.display_name);

                                          // Capturar originais para transparência no modal
                                          const originalIds = [
                                            mergeInfo.primary_subject_id,
                                            ...(mergeInfo.merged_subject_ids || [])
                                          ];

                                          const originals = originalIds.map(sid => {
                                            const origins = originsMap.get(sid) || [];
                                            const firstOrigin = origins[0];
                                            const subj = subjects.find(s => s.id === sid);
                                            return {
                                              subjectName: subj?.name || 'Matéria Desconhecida',
                                              editalName: firstOrigin?.name || 'Edital Desconhecido',
                                              editalOrgan: firstOrigin?.organ || ''
                                            };
                                          });
                                          setSelectedMergeOriginals(originals);

                                          setIsRevertModalOpen(true);
                                        }
                                      }}
                                      title="Desfazer Mesclagem"
                                      className="w-fit p-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors text-orange-500"
                                    >
                                      <Link2Off size={14} />
                                    </button>
                                  )}
                                </div>

                              </div>

                            <div className="flex items-center gap-2 shrink-0">

                              {activeTab === 'all' && (
                                <>
                                  {isStudiedInCycle ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVoltarMateriaParaFila(subject.id);
                                      }}
                                      className="group/return relative w-6 h-6 rounded-full border border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/25 dark:text-emerald-400 flex items-center justify-center shrink-0 hover:border-blue-300 hover:bg-blue-500/10 hover:text-blue-500 dark:hover:border-blue-400/40 dark:hover:bg-blue-500/15 dark:hover:text-blue-400 transition-all"
                                      title="Voltar matéria para a fila"
                                      aria-label={`Voltar ${getUnifiedSubjectName(subject.id, subject.name)} para a fila do ciclo`}
                                    >
                                      <Check size={12} strokeWidth={3} className="transition-all group-hover/return:scale-0 group-hover/return:opacity-0" />
                                      <RotateCcw size={11} className="absolute scale-0 opacity-0 transition-all group-hover/return:scale-100 group-hover/return:opacity-100" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarcarMateriaComoEstudada(subject.id);
                                      }}
                                      title={needsCycleClosure ? 'Há tópicos novos neste ciclo. Marque a matéria quando encerrar este bloco.' : 'Marcar como estudada'}
                                      aria-label={`Marcar ${getUnifiedSubjectName(subject.id, subject.name)} como estudada`}
                                      className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        needsCycleClosure
                                          ? 'border-amber-300/70 bg-amber-500/10 text-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.10)] before:absolute before:inset-[-5px] before:rounded-full before:border before:border-amber-400/30 before:animate-pulse hover:bg-emerald-500 hover:border-emerald-300/80 hover:text-white hover:shadow-none'
                                          : 'border-gray-300/80 bg-white/[0.02] text-gray-400/80 hover:bg-emerald-500 hover:border-emerald-300/80 hover:text-white dark:border-white/45 dark:bg-white/[0.03] dark:text-white/45 dark:hover:bg-emerald-500 dark:hover:border-emerald-300/80 dark:hover:text-white'
                                      }`}
                                    >
                                      <Check size={12} strokeWidth={3} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                            {/* === TÓPICOS (dentro do mesmo card) === */}
                            {expandedSubjectIds.includes(item.id) && (
                              <div
                                className="border-t border-gray-100 dark:border-white/[0.06]"
                                onClick={(e) => e.stopPropagation()}
                              >

                              {subject.topics.length === 0 ? (
                                <div className="py-4 text-center text-xs text-gray-400 dark:text-white/30">
                                  Nenhum tópico cadastrado
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  {subject.topics.map((topic, idx) => {
                                    const completed = isTopicCompleted(topic);
                                    const isActive = topic.is_active !== false;
	                                    const contactCount = getTopicContactCount(topic, topicStats);
	                                    const hasStarted = contactCount > 0 || isTopicStarted(topic);
	                                    const studiedInCurrentCycle = isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo);
                                    const statusVisual = getCycleTopicStatusVisual(topic);
                                    const statusState: 'empty' | 'dot' | 'check' =
                                      completed ? 'check' : hasStarted ? 'dot' : 'empty';
	                                    const statusLabel =
	                                      statusState === 'check' ? 'Tópico concluído' :
	                                      statusState === 'dot' ? 'Tópico em estudo' :
	                                      'Tópico não iniciado';
	                                    const incidenceTitle = getStrategicTopicIncidenceTitle(topic);
	                                    const incidenceDisplay = getStrategicTopicIncidenceDisplay(topic);

	                                    return (
	                                      <div
	                                        key={topic.id}
	                                        data-topic-item
	                                        className={`min-h-10 grid grid-cols-[8px_minmax(0,1fr)] sm:grid-cols-[8px_minmax(0,1fr)_auto] items-start sm:items-center gap-x-3 gap-y-2 pl-4 pr-4 py-2 transition-colors group/topic relative cursor-default ${
	                                          idx % 2 === 0
	                                            ? 'bg-gray-50/50 dark:bg-white/[0.02]'
	                                            : 'bg-white dark:bg-transparent'
                                        } ${
                                          !isActive ? 'opacity-40 grayscale-[0.5]' : ''
                                        }`}
                                      >
	                                        <div
	                                          className="mt-0.5 sm:mt-0 flex h-full min-h-5 items-center justify-center cursor-default select-none pointer-events-none"
	                                          role="img"
	                                          aria-label={statusLabel}
	                                          title={`${statusLabel}. Use o botão de ação à direita para iniciar ou continuar.`}
	                                        >
	                                          <div className={`h-5 w-1 rounded-full ${statusVisual.indicatorClassName}`} />
	                                        </div>

	                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
	                                          <span
	                                            className={`text-[11px] font-medium break-words transition-opacity ${
	                                              completed ? 'text-content-muted opacity-50' : !isActive ? 'text-content-muted opacity-40' : 'text-content-main'
	                                            }`}
	                                          >
	                                            {topic.name.charAt(0).toUpperCase() + topic.name.slice(1)} {!isActive && <span className="text-[9px] ml-1 opacity-60">(inativo)</span>}
	                                          </span>
	                                          {incidenceDisplay && (
	                                            <span
	                                              className="text-[9px] font-black tracking-wide whitespace-nowrap px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
	                                              title={incidenceTitle}
	                                            >
	                                              {incidenceDisplay}
	                                            </span>
	                                          )}
	                                          {studiedInCurrentCycle && !completed && (
                                            <CheckCircle2
                                              size={12}
                                              className="flex-shrink-0 text-slate-400 dark:text-slate-500"
                                              role="img"
                                              aria-label={`Tópico novo neste ciclo: ${topic.name}`}
                                            >
                                              <title>Tópico novo neste ciclo</title>
                                            </CheckCircle2>
                                          )}
                                        </div>

	                                        <div className="col-start-2 sm:col-start-3 flex items-center justify-end gap-1 self-end sm:self-center">
                                          <div className="flex items-center gap-1.5 pr-1">
                                            {(() => {
                                              if (!isActive) {
                                                return (
                                                  <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-1.5 py-0.5 rounded border text-rose-500 bg-rose-500/10 border-rose-500/20">
                                                    NA LIXEIRA
                                                  </span>
                                                );
                                              }
                                              return null;
                                            })()}
                                          </div>

                                          {isActive && (
                                            <div
                                              className={`hidden md:flex h-6 items-center gap-1 transition-all duration-200 opacity-0 pointer-events-none group-hover/topic:pointer-events-auto ${completed ? 'group-hover/topic:opacity-40' : 'group-hover/topic:opacity-100'}`}
                                            >
                                              <button
                                                type="button"
                                                className="h-6 w-6 rounded-full border border-transparent bg-transparent text-content-muted/45 hover:border-primary/25 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center"
                                                title="Abrir assistente de IA"
                                                aria-label={`Abrir assistente de IA para ${topic.name}`}
                                              >
                                                <Wand2 size={12} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedTopicForNotes({
                                                    id: topic.id,
                                                    name: topic.name,
                                                    subjectName: subject.name
                                                  });
                                                }}
                                                className={`h-6 w-6 rounded-full border border-transparent bg-transparent transition-all flex items-center justify-center ${
                                                  (typeof topic.notes === 'string' ? topic.notes : topic.notes?.content)?.trim() &&
                                                  (typeof topic.notes === 'string' ? topic.notes : topic.notes?.content) !== '<p><br></p>'
                                                    ? 'text-primary/60 hover:border-primary/25 hover:bg-primary/10 hover:text-primary'
                                                    : 'text-content-muted/45 hover:border-primary/25 hover:bg-primary/10 hover:text-primary'
                                                }`}
                                                title={`Anotações para ${topic.name}`}
                                                aria-label={`Anotações para ${topic.name}`}
                                              >
                                                <FileText size={12} />
                                              </button>
                                            </div>
                                          )}
	                                          {isActive && (
	                                            <div className="flex-shrink-0">
	                                              {completed ? (
	                                                <span className="flex-shrink-0 h-7 px-2.5 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-500/15 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black ml-0.5">
	                                                  <Check size={11} />
	                                                  Concluído
	                                                </span>
	                                              ) : hasStarted ? (
	                                                <button
	                                                  onClick={(e) => {
	                                                    e.stopPropagation();
	                                                    navigate(`/revisoes?topicId=${topic.id}`);
	                                                  }}
	                                                  className={`flex-shrink-0 h-7 px-2.5 rounded-lg flex items-center justify-center gap-1.5 border text-[10px] font-black transition-all ml-0.5 ${statusVisual.actionClassName}`}
	                                                  title="Continuar estudo do tópico"
	                                                  aria-label={`Continuar estudo do tópico ${topic.name}`}
	                                                >
	                                                  <BookOpen size={11} />
	                                                  Continuar
	                                                </button>
	                                              ) : (
	                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
	                                                    openReviewModal(topic.id);
	                                                  }}
	                                                  className={`flex-shrink-0 h-7 px-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-1.5 ml-0.5 group text-[10px] font-black ${statusVisual.actionClassName}`}
	                                                  title="Iniciar estudo do tópico"
	                                                  aria-label={`Iniciar estudo do tópico ${topic.name}`}
	                                                >
	                                                  <Play size={10} className="ml-[1px] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
	                                                  Iniciar
	                                                </button>
	                                              )}
	                                            </div>
                                          )}
                                          {!isActive && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleRestoreTopic(topic.id);
                                              }}
                                              className="h-7 px-3 flex items-center gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-wider"
                                              title="Restaurar tópico"
                                            >
                                              <Plus size={14} /> Restaurar
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            )}
                          </div>{/* fim glow-card unificado */}
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
                </div>
              </SortableContext>

            </>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="mt-8 flex justify-center pb-12">
              <button
                onClick={handleLoadMore}
                className="group relative px-8 py-3 bg-card dark:bg-zinc-900 border border-border dark:border-white/5 rounded-2xl flex items-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <RefreshCw size={16} className="text-primary group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-xs font-bold text-foreground group-hover:text-primary tracking-widest uppercase">
                  Ver mais matérias ({totalDisplayItems - visibleCount} restantes)
                </span>
                <ChevronDown size={14} className="text-content-muted group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {activeTab === 'all' && <StrategicEditalPanel />}
        </DndContext>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex w-full text-slate-900 dark:text-slate-100 font-sans">
      <div className="flex-1 flex flex-col relative w-full">

        {/* Header Outside Card */}
        <main className="flex-1 px-4 md:px-8 pb-8 pt-0 flex flex-col gap-6">
          <div className="flex-1 min-w-0 w-full">
            {!isImportEditalModalOpen && (
              showCycleWorkspace ? (
                mainSubjectUI
              ) : (
                renderEmptyCycleState()
              )
            )}
          </div>
        </main>

        {/* Modals positioned within the layout */}
        <div className="relative z-50">
          <CreateTopicModal
            isOpen={isCreateTopicModalOpen}
            onClose={() => setIsCreateTopicModalOpen(false)}
            onTopicCreated={() => refreshData()}
          />

          {topicsModal.subject && (
            <TopicsModal
              isOpen={topicsModal.isOpen}
              onClose={handleCloseTopicsModal}
              subject={topicsModal.subject}
              onUpdate={refreshData}
            />
          )}

          {selectedTopicForNotes && (
            <NotesModal
              isOpen={true}
              onClose={() => setSelectedTopicForNotes(null)}
              topicId={selectedTopicForNotes.id}
              topicName={selectedTopicForNotes.name}
              subjectName={selectedTopicForNotes.subjectName}
            />
          )}

          <AlertDialog
            open={completeCycleConfirmOpen}
            onOpenChange={setCompleteCycleConfirmOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Concluir ciclo de estudos?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-content-muted">
                  Esta é a última matéria pendente do seu ciclo de estudos. Ao marcá-la como estudada, você concluirá o ciclo atual.
                  <br /><br />
                  Deseja confirmar e concluir o ciclo?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async (event) => {
                    event.preventDefault();
                    if (pendingCompleteSubjectId) {
                      await executeMarcarMateriaComoEstudada(pendingCompleteSubjectId);
                      setPendingCompleteSubjectId(null);
                    }
                    setCompleteCycleConfirmOpen(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Confirmar e Concluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={startNextCycleConfirmOpen}
            onOpenChange={(open) => !open && !isStartingNextCycle && setStartNextCycleConfirmOpen(false)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                  <RefreshCw className="w-5 h-5 text-emerald-500" />
                  Iniciar próximo ciclo?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-content-muted">
                  Isso limpará as matérias marcadas como estudadas neste ciclo e iniciará o Ciclo {(userCycle?.ciclos_realizados || 0) + 2}.
                  <br /><br />
                  Um resumo deste ciclo será salvo para comparar sua evolução nos próximos ciclos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isStartingNextCycle}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async (event) => {
                    event.preventDefault();
                    await handleIniciarProximoCiclo();
                    setStartNextCycleConfirmOpen(false);
                  }}
                  disabled={isStartingNextCycle}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
                >
                  {isStartingNextCycle ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Iniciar Ciclo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={resetCycleConfirmOpen}
            onOpenChange={(open) => !open && !isResettingCycle && setResetCycleConfirmOpen(false)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Resetar ciclo de estudos?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai zerar o ciclo atual, limpar as matérias marcadas como estudadas neste ciclo e voltar a contagem para o Ciclo 1.
                  <br /><br />
                  Matérias, tópicos e conteúdo cadastrado não serão apagados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isResettingCycle}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    handleResetCycle();
                  }}
                  disabled={isResettingCycle}
                  className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
                >
                  {isResettingCycle ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Resetar ciclo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!topicToDelete} onOpenChange={(open) => !open && setTopicToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ocultar Tópico</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja ocultar o tópico <strong>"{topicToDelete?.name}"</strong>?
                  <br /><br />
                  Ele deixará de aparecer no seu ciclo de estudos e estatísticas, mas o seu histórico será preservado e você poderá restaurá-lo a qualquer momento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingTopic}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    confirmDeleteTopic();
                  }}
                  disabled={isDeletingTopic}
                  className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
                >
                  {isDeletingTopic ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Ocultar Tópico
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog 
            open={unloadConfirm.isOpen} 
            onOpenChange={(open) => !open && setUnloadConfirm(prev => ({ ...prev, isOpen: false }))}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover do Ciclo Ativo</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover o edital <strong>"{unloadConfirm.editalName}"</strong> do seu ciclo de estudos?
                  <br /><br />
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-300 text-sm">
                    <p><strong>Atenção:</strong> o ciclo atual será reiniciado e o histórico de revisões dos tópicos deste edital será apagado.</p>
                    <p className="mt-1">As matérias e tópicos cadastrados continuarão disponíveis fora do ciclo.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={unloadingEditalId === unloadConfirm.editalId}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    if (unloadConfirm.editalId) {
                      handleUnloadCycle(unloadConfirm.editalId, unloadConfirm.editalName || '', unloadConfirm.subjectIds);
                      setUnloadConfirm(prev => ({ ...prev, isOpen: false }));
                    }
                  }}
                  disabled={unloadingEditalId === unloadConfirm.editalId}
                  className="bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
                >
                  {unloadingEditalId === unloadConfirm.editalId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog Simplificado: Excluir do Edital */}
          <AlertDialog 
            open={deletePermanentConfirm.isOpen} 
            onOpenChange={(open) => !open && setDeletePermanentConfirm({ isOpen: false, subjectId: null, subjectName: null, editais: [] })}
          >
            <AlertDialogContent className="max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Excluir do Edital
                </AlertDialogTitle>
              </AlertDialogHeader>
              
              <div className="py-3 space-y-3">
                {/* Matéria */}
                <div className="bg-muted/50 border border-border rounded-lg px-3 py-2">
                  <p className="text-xs text-content-muted">Matéria:</p>
                  <p className="text-sm font-bold truncate">{deletePermanentConfirm.subjectName}</p>
                </div>

                {/* Edital Info (se 1 edital) */}
                {deletePermanentConfirm.editais.length === 1 && (() => {
                  const edil = deletePermanentConfirm.editais[0];
                  const isOriginalSystem = !edil.source_id && edil.is_imported;
                  return (
                    <div className={`border rounded-lg px-3 py-2 ${isOriginalSystem ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/50 border-border'}`}>
                      {isOriginalSystem ? (
                        <p className="text-xs text-red-500 font-medium">
                          Não é possível excluir: edital original do sistema
                        </p>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-content-muted">Edital:</p>
                            <p className="text-sm font-medium truncate max-w-[180px]">"{edil.name}"</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            edil.source_id 
                              ? 'bg-blue-500/20 text-blue-400' 
                              : edil.is_imported 
                                ? 'bg-purple-500/20 text-purple-400' 
                                : 'bg-green-500/20 text-green-400'
                          }`}>
                            {edil.source_id ? 'CÓPIA • SISTEMA' : edil.is_imported ? 'CÓPIA • IA' : 'MANUAL'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Múltiplos editais */}
                {deletePermanentConfirm.editais.length > 1 && (
                  <div className="border border-border rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-content-muted">Escolha o edital para remover:</p>
                    <div className="space-y-1">
                      {deletePermanentConfirm.editais.map((edital) => {
                        const isOriginalSystem = !edital.source_id && edital.is_imported;
                        return (
                          <button
                            key={edital.id}
                            onClick={() => {
                              if (isOriginalSystem) {
                                toastGate.notifyError('Não é possível excluir matérias do edital original do sistema!', 'DEL-SYS-01', { severity: 'high' });
                                return;
                              }
                              handleDeletePermanent(deletePermanentConfirm.subjectId!, edital.id);
                            }}
                            disabled={isOriginalSystem}
                            className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                              isOriginalSystem
                                ? 'border-red-300 bg-red-100/80 dark:bg-red-950/40 dark:border-red-800/50 cursor-not-allowed' 
                                : 'border-border hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className={`truncate max-w-[180px] font-medium ${isOriginalSystem ? 'text-red-400 dark:text-red-500' : ''}`}>
                                {edital.name}
                              </span>
                              {isOriginalSystem && (
                                <span className="text-[9px] font-bold text-red-500 dark:text-red-400">
                                  Edital original do sistema
                                </span>
                              )}
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isOriginalSystem
                                ? 'bg-red-200/80 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                                : edital.source_id 
                                  ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400' 
                                  : edital.is_imported 
                                    ? 'bg-purple-500/20 text-purple-500 dark:text-purple-400' 
                                    : 'bg-green-500/20 text-green-600 dark:text-green-400'
                            }`}>
                              {isOriginalSystem ? 'SISTEMA' : edital.source_id ? 'CÓPIA' : edital.is_imported ? 'IA' : 'MANUAL'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Aviso */}
                <p className="text-[11px] text-content-muted text-center">
                  Esta ação não pode ser desfeita. Tópicos e histórico serão perdidos.
                </p>
              </div>

              <AlertDialogFooter className="gap-2 flex-wrap">
                <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
                {/* Excluir de todos (apenas quando há mais de 1 edital) */}
                {deletePermanentConfirm.editais.length > 1 && (
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      if (deletePermanentConfirm.subjectId) {
                        handleDeletePermanent(deletePermanentConfirm.subjectId);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir de TODOS
                  </AlertDialogAction>
                )}
                {/* Excluir normal (quando tem 0 ou 1 edital que não seja sistema original) */}
                {deletePermanentConfirm.editais.length <= 1 && (deletePermanentConfirm.editais.length === 0 || !(deletePermanentConfirm.editais[0].is_imported && !deletePermanentConfirm.editais[0].source_id)) && (
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      if (deletePermanentConfirm.subjectId) {
                        handleDeletePermanent(deletePermanentConfirm.subjectId);
                      }
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white text-xs gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <ImportEditalModal
            isOpen={isImportEditalModalOpen}
            onClose={() => setIsImportEditalModalOpen(false)}
            initialTab={modalInitialTab}
            manualModeChildren={mainSubjectUI}
            onImport={async (importedSubjects, editalName, isImported = true) => {
              if (!user) return;
              setIsLoading(true);
              try {
                // 1. Obter ou Criar o Edital
                const originName = editalName || 'IMPORTADO';
                const edital = await getOrCreateUserEdital(originName, isImported); // Use provided isImported flag
                const newSubjectIds: string[] = [];

                // 2. Processar cada matéria
                for (const subj of importedSubjects) {
                  // Inserir Matéria
                  const { data: newSubj, error: sErr } = await supabase
                    .from('subjects')
                    .insert({
                      user_id: user.id,
                      name: subj.name.trim().toUpperCase(),
                      status: 'Nova',
                      priority: localSubjects.length + newSubjectIds.length + 1
                    })
                    .select()
                    .single();
                  
                  if (sErr) throw sErr;
                  if (newSubj) {
                    newSubjectIds.push(newSubj.id);
                    
                    // Inserir Tópicos
                    if (subj.topics && subj.topics.length > 0) {
                      const topicsToInsert = subj.topics.map((t, idx) => ({
                        user_id: user.id,
                        subject_id: newSubj.id,
                        name: t.name,
                        position: (t as any).position ?? idx
                      }));
                      
                      const { error: tErr } = await supabase
                        .from('topics')
                        .insert(topicsToInsert);
                        
                      if (tErr) throw tErr;
                    }
                  }
                }

                // 3. Vincular ao Edital
                if (edital) {
                  const combinedIds = [...(edital.subject_ids || []), ...newSubjectIds];
                  await (supabase as any)
                    .from('user_editais')
                    .update({ subject_ids: combinedIds })
                    .eq('id', edital.id);
                }

                await refreshData();
                refresh(); // Atualizar hook useEditalOrigins
                window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
                toast.success(`${importedSubjects.length} matérias vinculadas a "${originName}" com sucesso!`);
                setIsImportEditalModalOpen(false);
              } catch (err) {
                errorService.report(err, { module: 'Subjects', action: 'import', userMessage: 'Erro ao importar matérias.' });
              } finally {
                setIsLoading(false);
              }
            }}
            subjects={subjects}
          />

          <ContentUploadModal
            open={contentUploadModal}
            onOpenChange={setContentUploadModal}
            onSuccess={refreshData}
          />

          <DifficultyRatingModal
            isOpen={difficultyModalData.isOpen}
            onClose={closeDifficultyModal}
            isSaving={isSavingTopicReview}
            savingText="Salvando no banco..."
            onSubmit={async (difficulty) => {
              try {
                await markTopicAsReviewed(difficultyModalData.topicId, difficulty);
                await recordConfirmedTopicCycleEvent(difficulty);
                setTimeout(() => refreshData(), 500);
              } catch (error) {
                await errorService.report(
                  error,
                  {
                    module: 'Subjects',
                    action: 'DifficultyRatingModal.onSubmit',
                    userMessage: 'Erro ao iniciar estudo do tópico.',
                    severity: 'medium',
                    scope: 'core',
                    userId: user?.id
                  }
                );
                throw error;
              }
            }}
            onConfirmReview={async (difficulty, duration) => {
              try {
                await markTopicAsReviewed(difficultyModalData.topicId, difficulty, duration);
                await recordConfirmedTopicCycleEvent(difficulty, duration);
                closeDifficultyModal();
                setTimeout(() => refreshData(), 500);
              } catch (error) {
                await errorService.report(
                  error,
                  {
                    module: 'Subjects',
                    action: 'DifficultyRatingModal.onConfirmReview',
                    userMessage: 'Erro ao iniciar estudo do tópico.',
                    severity: 'medium',
                    scope: 'core',
                    userId: user?.id
                  }
                );
                throw error;
              }
            }}
            topicName={difficultyModalData.topicName}
            subjectName={difficultyModalData.subjectName}
            initialDifficulty={difficultyModalData.currentDifficulty}
            reviewStage={difficultyModalData.reviewStage}
            reviewCount={difficultyModalData.reviewCount}
            isCompleting={difficultyModalData.isCompleting}
            duration={difficultyModalData.duration}
          />

          {/* Modal de Confirmação de Reversão de Mesclagem */}
          <ConfirmModal
            isOpen={isRevertModalOpen}
            onClose={() => {
              setIsRevertModalOpen(false);
              setSelectedMergeId(null);
              setSelectedMergeOriginals([]);
            }}
            onConfirm={async () => {
              if (selectedMergeId) {
                setIsReverting(true);
                try {
                  await revertSubjectMerge(selectedMergeId);
                  toast.success('Mesclagem desfeita com sucesso');
                  setIsRevertModalOpen(false);
                } catch (error: any) {
                  console.error('Erro ao desfazer mesclagem:', error);
                  toastGate.notifyError('Erro ao desfazer mesclagem', error?.message || 'Erro desconhecido');
                } finally {
                  setIsReverting(false);
                  setSelectedMergeId(null);
                }
              }
            }}
            title="Desfazer Mesclagem de Matéria"
            description={
              <div className="space-y-4">
                <p className="text-sm">
                  Tem certeza que deseja desfazer a mesclagem <strong className="text-primary">"{selectedMergeName}"</strong>? 
                  As matérias voltarão a ser exibidas individualmente no seu ciclo.
                </p>
                
                {selectedMergeOriginals.length > 0 && (
                  <div className="bg-secondary/50 dark:bg-white/5 border border-border/50 rounded-[24px] p-4 scale-95 origin-top translate-y-[-4px]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-content-muted/60 mb-3 ml-1">
                      ESTRUTURA DE SEPARAÇÃO
                    </p>
                    <div className="space-y-2">
                      {selectedMergeOriginals.map((orig, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-card dark:bg-zinc-900 border border-border shadow-sm">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13px] font-bold text-content-main truncate uppercase tracking-tight">
                              {orig.subjectName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                              <span className="text-[9px] font-bold text-primary/60 uppercase truncate">
                                {orig.editalName}
                              </span>
                              {orig.editalOrgan && !orig.editalName.toUpperCase().includes(orig.editalOrgan.toUpperCase()) && (
                                <span className="text-[9px] font-medium text-content-muted/40 uppercase shrink-0">
                                  • {orig.editalOrgan}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500">
                             <CheckCircle2 size={14} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            }
            confirmText="Desfazer"
            cancelText="Manter Mesclado"
            variant="warning"
            icon={Link2Off}
            isLoading={isReverting}
          />

          {/* Modal de Matérias do Edital */}
          {subjectsModal.edital && (
            <EditalSubjectsModal
              isOpen={subjectsModal.isOpen}
              onClose={() => {
                setSubjectsModal({ isOpen: false, edital: null });
                refresh();
              }}
              onBack={() => undefined}
              edital={subjectsModal.edital}
              editais={editaisNoCiclo.map(toEditalModalData)}
              allSubjects={subjects}
              initialExpandedSubjectId={subjectsModal.initialExpandedSubjectId}
              onUpdate={() => {
                refresh();
                refreshData();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Subjects;
