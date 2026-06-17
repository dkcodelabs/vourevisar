import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, Edit2, ChevronDown, Check, X, CheckSquare, Square, Search, GripVertical, FileText, Merge, FolderUp, Loader2, Sparkles, AlertCircle, Copy, CheckCircle2, GraduationCap, RefreshCw, BarChart2, Zap, ArrowRight, Bookmark, MoveUp, Shield, Layers, FileDown, Filter, Play, Wand2, BookOpen, Link2Off, RotateCcw, ListTodo, Target, TrendingUp, Trophy, Gauge } from 'lucide-react';
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
  manually_marked_in_cycle?: boolean;
  all_topics_started?: boolean;
  completed_in_edital?: boolean;
  closed_in_cycle?: boolean;
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

type StudyCycleMaturityPhase = 'cold_start' | 'started' | 'active' | 'historical';

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

const isTopicCompleted = (topic: Topic) =>
  topic.completed === true ||
  topic.is_completed === true ||
  topic.reviewStage === 'Concluído' ||
  topic.review_stage === 'Concluído';

const hasMeaningfulReviewStage = (stage?: string | null) => {
  const normalized = String(stage || '').trim().toLowerCase();
  return Boolean(normalized) &&
    !['0', 'novo', 'não iniciado', 'nao iniciado', 'null', 'undefined'].includes(normalized);
};

const isTopicStarted = (topic: Topic) =>
  Boolean(topic.first_studied_at) ||
  Boolean(topic.firstStudiedAt) ||
  (topic.reviewCount || 0) > 0 ||
  (topic.review_count || 0) > 0 ||
  hasMeaningfulReviewStage(topic.reviewStage) ||
  hasMeaningfulReviewStage(topic.review_stage) ||
  Boolean(topic.nextReview) ||
  Boolean(topic.next_review) ||
  isTopicCompleted(topic);

const isTopicInReviewFlow = (topic: Topic) =>
  !isTopicCompleted(topic) && (
    (topic.reviewCount || 0) > 0 ||
    (topic.review_count || 0) > 0 ||
    hasMeaningfulReviewStage(topic.reviewStage) ||
    hasMeaningfulReviewStage(topic.review_stage) ||
    Boolean(topic.nextReview) ||
    Boolean(topic.next_review)
  );

const isSubjectCompletedInEdital = (subject: Subject) => {
  const activeTopics = subject.topics.filter(topic => topic.is_active !== false);
  return activeTopics.length > 0 && activeTopics.every(isTopicCompleted);
};

const isSubjectFullyStarted = (subject: Subject) => {
  const activeTopics = subject.topics.filter(topic => topic.is_active !== false);
  return activeTopics.length > 0 && activeTopics.every(isTopicStarted);
};

const getTopicContactCount = (
  topic: Topic,
  topicStats?: Map<string, { reviewCount: number; hardReviewCount: number }>
) => Math.max(
  topic.reviewCount || 0,
  topic.review_count || 0,
  topicStats?.get(topic.id)?.reviewCount || 0
);

const getCycleTopicStatusVisual = (topic: Topic): CycleTopicStatusVisual => {
  if (isTopicCompleted(topic)) {
    return {
      label: 'Concluído',
      badgeClassName: 'bg-success/10 text-success',
      indicatorClassName: 'bg-success',
      actionClassName: 'border-transparent bg-transparent text-success hover:border-success/20 hover:bg-success/10',
    };
  }

  if (isTopicInReviewFlow(topic)) {
    return {
      label: 'Em revisão',
      badgeClassName: 'bg-info/10 text-info',
      indicatorClassName: 'bg-info',
      actionClassName: 'border-transparent bg-transparent text-info hover:border-info/20 hover:bg-info/10',
    };
  }

  if (isTopicStarted(topic)) {
    return {
      label: 'Iniciado',
      badgeClassName: 'bg-primary/10 text-primary',
      indicatorClassName: 'bg-primary',
      actionClassName: 'border-transparent bg-transparent text-primary hover:border-primary/20 hover:bg-primary/10',
    };
  }

  return {
    label: 'Não iniciado',
    badgeClassName: 'bg-muted text-content-muted',
    indicatorClassName: 'bg-content-muted/55',
    actionClassName: 'border-transparent bg-transparent text-content-muted hover:border-info/20 hover:bg-info/10 hover:text-info',
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
    if (!user) return;

    // Remover cache antigo se existir
    const cacheKey = `subjects_${user.id}`;
    localStorage.removeItem(cacheKey);

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
      setSubjects(transformedSubjects);
      setLocalSubjects(transformedSubjects);
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
  const [isCycleSearchOpen, setIsCycleSearchOpen] = useState(false);
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
  const strategicPanelTitleRef = useRef<HTMLAnchorElement | null>(null);
  const strategicPanelRef = useRef<HTMLElement | null>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([]);
  const [highlightedSubjectId, setHighlightedSubjectId] = useState<string | null>(null);
  const [expandedBeforeSearch, setExpandedBeforeSearch] = useState<string[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isStrategicDockVisible, setIsStrategicDockVisible] = useState(false);
  const [isReorderingCycle, setIsReorderingCycle] = useState(false);

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

        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(async () => {
          try {
            await Promise.all([
              loadSubjects(true), // Força bypass do cache
              loadUserCycle()
            ]);
            // O refresh do hook de origens é chamado via evento no próprio hook ou manualmente se necessário
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

  const getEquivalentSubjectIds = useCallback((subjectId: string) => {
    const ids = new Set<string>([subjectId, getUnifiedSubjectId(subjectId, dynamicUnificationMap)]);
    const group = dynamicUnificationMap?.unifiedSubjects.find(unified =>
      unified.originalSubjectIds.some(id => ids.has(id))
    );

    group?.originalSubjectIds.forEach(id => ids.add(id));
    return ids;
  }, [dynamicUnificationMap]);

  const studiedCycleIdSet = useMemo(() => {
    const studiedIds = userCycle?.materias_estudadas_ciclo || [];
    const ids = new Set<string>();

    studiedIds.forEach((id: string) => {
      getEquivalentSubjectIds(id).forEach(equivalentId => ids.add(equivalentId));
    });

    return ids;
  }, [getEquivalentSubjectIds, userCycle?.materias_estudadas_ciclo]);

  const completedEditalSubjectIdSet = useMemo(() => {
    const ids = new Set<string>();

    expandedSubjectList.forEach(item => {
      if (!isSubjectCompletedInEdital(item.subject)) return;
      getEquivalentSubjectIds(item.subject.id).forEach(equivalentId => ids.add(equivalentId));
    });

    return ids;
  }, [expandedSubjectList, getEquivalentSubjectIds]);

  const fullyStartedSubjectIdSet = useMemo(() => {
    const ids = new Set<string>();

    expandedSubjectList.forEach(item => {
      if (!isSubjectFullyStarted(item.subject)) return;
      getEquivalentSubjectIds(item.subject.id).forEach(equivalentId => ids.add(equivalentId));
    });

    return ids;
  }, [expandedSubjectList, getEquivalentSubjectIds]);

  const cycleClosedSubjectIdSet = useMemo(() => {
    return new Set<string>([
      ...Array.from(studiedCycleIdSet),
      ...Array.from(fullyStartedSubjectIdSet),
      ...Array.from(completedEditalSubjectIdSet),
    ]);
  }, [completedEditalSubjectIdSet, fullyStartedSubjectIdSet, studiedCycleIdSet]);

  useEffect(() => {
    if (cycleClosedSubjectIdSet.size === 0) return;
    setExpandedSubjectIds(prev => prev.filter(id => !cycleClosedSubjectIdSet.has(id)));
  }, [cycleClosedSubjectIdSet]);

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
    if (!isCycleSearchOpen || !inputRef.current) return;

    const timeoutId = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [isCycleSearchOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
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

  const handleToggleCycleReorder = () => {
    setIsReorderingCycle(prev => {
      const next = !prev;
      if (next) {
        setExpandedSubjectIds([]);
      }
      return next;
    });
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
    const normalizedMateriaId = getUnifiedSubjectId(materiaId, dynamicUnificationMap);
    const equivalentSubjectIds = getEquivalentSubjectIds(materiaId);
    const updatedStudiedIds = [
      ...currentStudied.filter((id: string) =>
        !equivalentSubjectIds.has(id) &&
        getUnifiedSubjectId(id, dynamicUnificationMap) !== normalizedMateriaId
      ),
      normalizedMateriaId,
    ];
    const previousUserCycle = userCycle;
    const updatedCycle = {
      ...userCycle,
      materias_estudadas_ciclo: Array.from(new Set(updatedStudiedIds)),
      atualizado_em: new Date().toISOString(),
    };

    setUserCycle(updatedCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(updatedCycle));
    setExpandedSubjectIds(prev => prev.filter(id =>
      !equivalentSubjectIds.has(id) &&
      getUnifiedSubjectId(id, dynamicUnificationMap) !== normalizedMateriaId &&
      id !== rawSubjectId
    ));

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
  }, [dynamicUnificationMap, getEquivalentSubjectIds, getUnifiedSubjectName, localSubjects, recordCycleEvent, user, userCycle]);

  const handleMarcarMateriaComoEstudada = useCallback((materiaId: string) => {
    if (!userCycle) return;

    // Verificar se é a última matéria pendente no ciclo
    const pendingSubjects = expandedSubjectList.filter(item => !cycleClosedSubjectIdSet.has(item.subject.id));
    const isLastPending = pendingSubjects.length === 1 && 
      pendingSubjects[0].subject.id === getUnifiedSubjectId(materiaId, dynamicUnificationMap);

    if (isLastPending) {
      setPendingCompleteSubjectId(materiaId);
      setCompleteCycleConfirmOpen(true);
    } else {
      executeMarcarMateriaComoEstudada(materiaId);
    }
  }, [userCycle, expandedSubjectList, cycleClosedSubjectIdSet, dynamicUnificationMap, executeMarcarMateriaComoEstudada]);

  const handleVoltarMateriaParaFila = useCallback(async (materiaId: string) => {
    if (!user || !userCycle) return;

    const rawSubjectId = (userCycle.ciclo_atual || []).find((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap) === materiaId
    ) || materiaId;

    const currentStudied = userCycle.materias_estudadas_ciclo || [];
    const normalizedMateriaId = getUnifiedSubjectId(materiaId, dynamicUnificationMap);
    const equivalentSubjectIds = getEquivalentSubjectIds(materiaId);
    const updatedStudied = currentStudied.filter((id: string) =>
      id !== rawSubjectId &&
      !equivalentSubjectIds.has(id) &&
      getUnifiedSubjectId(id, dynamicUnificationMap) !== normalizedMateriaId
    );
    if (updatedStudied.length === currentStudied.length) return;

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
  }, [dynamicUnificationMap, getEquivalentSubjectIds, getUnifiedSubjectName, localSubjects, recordCycleEvent, user, userCycle]);

  const buildCurrentCycleSnapshot = useCallback(() => {
    if (!user || !userCycle) return null;

    const cycleStart = userCycle.data_inicio_ciclo || null;
    const cycleSubjects = expandedSubjectList.map(item => item.subject);
    const perSubject: CycleSubjectSnapshot[] = cycleSubjects.map(subject => {
      const activeTopics = subject.topics.filter(topic => topic.is_active !== false);
      const topicsStarted = activeTopics.filter(topic => isTopicNewlyStartedInCycle(topic, cycleStart)).length;
      const topicsCompleted = activeTopics.filter(topic => getTopicCompletedInCycle(topic, cycleStart)).length;
      const manuallyMarkedInCycle = studiedCycleIdSet.has(subject.id);
      const allTopicsStarted = isSubjectFullyStarted(subject);
      const completedInEdital = isSubjectCompletedInEdital(subject);
      const closedInCycle = manuallyMarkedInCycle || allTopicsStarted || completedInEdital;

      return {
        subject_id: subject.id,
        subject_name: getUnifiedSubjectName(subject.id, subject.name),
        total_topics: activeTopics.length,
        topics_started: topicsStarted,
        topics_completed: topicsCompleted,
        studied_in_cycle: closedInCycle,
        manually_marked_in_cycle: manuallyMarkedInCycle,
        all_topics_started: allTopicsStarted,
        completed_in_edital: completedInEdital,
        closed_in_cycle: closedInCycle,
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
      studied_subject_ids: cycleSubjects
        .filter(subject => studiedCycleIdSet.has(subject.id) || isSubjectFullyStarted(subject) || isSubjectCompletedInEdital(subject))
        .map(subject => subject.id),
      cycle_subject_ids: cycleSubjects.map(subject => subject.id),
      edital_ids: editalIds,
      per_subject: perSubject,
    };
  }, [expandedSubjectList, getUnifiedSubjectName, studiedCycleIdSet, user, userCycle]);

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

    setIsReorderingCycle(false);

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
        .eq('id', userCycle.id)
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
    const subjectIds = activeTab === 'vertical'
      ? verticalSubjectList.map(item => item.id)
      : filteredList
        .filter(item => !cycleClosedSubjectIdSet.has(item.subject.id))
        .map(item => item.id);
    const allSubjectsExpanded = subjectIds.length > 0 &&
      subjectIds.every(id => expandedSubjectIds.includes(id));

    setExpandedSubjectIds(prev => {
      if (allSubjectsExpanded) {
        return prev.filter(id => !subjectIds.includes(id));
      }

      return Array.from(new Set([...prev, ...subjectIds]));
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
    const seen = new Set<string>();

    return filteredList
      .filter(item => cycleClosedSubjectIdSet.has(item.subject.id))
      .filter((item): item is ExpandedSubjectItem => {
        if (!item || seen.has(item.subject.id)) return false;
        seen.add(item.subject.id);
        return true;
      });
  }, [filteredList, cycleClosedSubjectIdSet]);
  const isCycleFullyStudied = expandedSubjectList.length > 0 &&
    expandedSubjectList.every(item => cycleClosedSubjectIdSet.has(item.subject.id));
  const orderedCycleDisplayList = useMemo(() => {
    const pending: ExpandedSubjectItem[] = [];
    const studied: ExpandedSubjectItem[] = [];

    filteredList.forEach(item => {
      if (cycleClosedSubjectIdSet.has(item.subject.id)) {
        studied.push(item);
      } else {
        pending.push(item);
      }
    });

    return [...pending, ...studied];
  }, [filteredList, cycleClosedSubjectIdSet]);

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
	    const studiedSubjects = cycleSubjects.filter(subject => cycleClosedSubjectIdSet.has(subject.id)).length;
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
	  }, [expandedSubjectList, cycleClosedSubjectIdSet, userCycle?.data_inicio_ciclo]);

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
	      highestIncidenceTopic,
	      highestIncidenceSubject,
	      highestPendingWeightSubject,
	    };
	  }, [expandedSubjectList, getUnifiedSubjectName, userCycle?.data_inicio_ciclo]);

	  const cycleMaturity = useMemo(() => {
	    const cycleNumber = (userCycle?.ciclos_realizados || 0) + 1;
	    const eventCount = cycleStudyEvents.filter(event =>
	      ['topic_started', 'topic_reviewed', 'topic_continued', 'subject_marked_studied', 'cycle_reordered'].includes(event.event_type)
	    ).length;
	    const hasSavedCycleHistory = cycleSnapshots.length > 0;
	    const hasLegacyCycleHistory = cycleNumber > 1;
	    const hasAnyStartedTopic = strategicPanelStats.startedTopics > 0 || strategicPanelStats.topicsStartedThisCycle > 0;
	    const hasActiveUse =
	      eventCount >= 8 ||
	      strategicPanelStats.topicsStartedThisCycle >= 5 ||
	      cycleVisualStats.studiedSubjects >= 2 ||
	      strategicPanelStats.coveragePercentage >= 10;

	    let phase: StudyCycleMaturityPhase = 'cold_start';
	    if (hasSavedCycleHistory || (hasLegacyCycleHistory && (eventCount >= 4 || hasAnyStartedTopic))) {
	      phase = 'historical';
	    } else if (hasActiveUse) {
	      phase = 'active';
	    } else if (hasAnyStartedTopic || cycleVisualStats.studiedSubjects > 0) {
	      phase = 'started';
	    }

	    const labelByPhase: Record<StudyCycleMaturityPhase, string> = {
	      cold_start: 'Início do ciclo',
	      started: 'Primeiros sinais',
	      active: 'Uso ativo',
	      historical: hasSavedCycleHistory ? 'Histórico disponível' : 'Histórico parcial',
	    };

	    const descriptionByPhase: Record<StudyCycleMaturityPhase, string> = {
	      cold_start: 'Comece alguns tópicos para o sistema detectar padrões sem forçar alerta cedo demais.',
	      started: 'Já existe primeiro contato. Os próximos sinais aparecem conforme você avança na fila.',
	      active: 'Já há uso suficiente para cruzar ritmo, cobertura, peso e cobrança com mais segurança.',
	      historical: hasSavedCycleHistory
	        ? 'Já há ciclo salvo para comparação e leitura de evolução.'
	        : `Você está no ciclo ${cycleNumber}, mas o histórico detalhado começou a ser salvo agora.`,
	    };

	    return {
	      phase,
	      label: labelByPhase[phase],
	      description: descriptionByPhase[phase],
	      eventCount,
	      cycleNumber,
	      hasSavedCycleHistory,
	    };
	  }, [
	    cycleSnapshots.length,
	    cycleStudyEvents,
	    cycleVisualStats.studiedSubjects,
	    strategicPanelStats.coveragePercentage,
	    strategicPanelStats.startedTopics,
	    strategicPanelStats.topicsStartedThisCycle,
	    userCycle?.ciclos_realizados,
	  ]);

	  const strategicAlerts = useMemo(() => {
	    const cycleSubjects = expandedSubjectList.map(item => ({
	      ...item.subject,
	      name: getUnifiedSubjectName(item.subject.id, item.subject.name),
	    }));

	    const alerts = getStudyCycleAlerts({
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

	    if (cycleMaturity.phase === 'cold_start') return [];
	    if (cycleMaturity.phase === 'started') {
	      return alerts.filter(alert => alert.severity === 'critical').slice(0, 1);
	    }

	    return alerts;
	  }, [cycleMaturity.phase, cycleSnapshots.length, editaisNoCiclo, expandedSubjectList, getUnifiedSubjectName]);

	  const cycleMetrics = useMemo(() => {
	    return getStudyCycleMetrics({
	      subjects: expandedSubjectList.map(item => item.subject),
	      editais: editaisNoCiclo.map(edital => ({
	        exam_date: edital.exam_date || edital.examDate || null,
	      })),
	      cycleStart: userCycle?.data_inicio_ciclo || null,
	      hasCycleHistory: cycleSnapshots.length > 0,
	    });
	  }, [cycleSnapshots.length, editaisNoCiclo, expandedSubjectList, userCycle?.data_inicio_ciclo]);

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
      minEvents: cycleMaturity.phase === 'historical' ? 4 : 5,
      maxInsights: 3,
    });
  }, [cycleMaturity.phase, cycleMetrics.overdueReviews, cycleStudyEvents, dynamicUnificationMap, expandedSubjectList, getUnifiedSubjectName, userCycle?.ciclo_atual]);

  const queueSuggestion = useMemo(() => {
    if (!['active', 'historical'].includes(cycleMaturity.phase)) return null;

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
  }, [cycleMaturity.phase, cycleStudyEvents, dynamicUnificationMap, expandedSubjectList, getUnifiedSubjectName, userCycle?.ciclo_atual]);

  useEffect(() => {
    if (activeTab !== 'all') {
      setIsStrategicDockVisible(false);
      return;
    }

    const title = strategicPanelTitleRef.current;
    if (!title) return;

    let frameId = 0;
    const updateDockVisibility = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const titleRect = title.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        setIsStrategicDockVisible(titleRect.top > viewportHeight - 52);
      });
    };

    updateDockVisibility();
    window.addEventListener('resize', updateDockVisibility);
    document.addEventListener('scroll', updateDockVisibility, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateDockVisibility);
      document.removeEventListener('scroll', updateDockVisibility, true);
    };
  }, [activeTab, strategicAlerts.length, queueSuggestion]);

	  if (isLoading || isOriginsLoading || loading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const renderCycleTooltip = (
    content: React.ReactNode,
    trigger: React.ReactElement,
    side: 'top' | 'right' | 'bottom' | 'left' = 'top'
  ) => (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side={side}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderSubjectWeightControl = (subject: Subject) => {
    const strategicWeight = getSubjectStrategicWeight(subject);
    const isEditingWeight = editingWeightSubjectId === subject.id;

    if (isEditingWeight) {
      return (
        <div
          className="flex flex-wrap items-center gap-1 rounded-xl border border-warning/25 bg-warning/10 px-1.5 py-1"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            value={weightDraft.questions}
            onChange={(event) => setWeightDraft(prev => ({ ...prev, questions: event.target.value }))}
            placeholder="Questões"
            inputMode="decimal"
            className="app-field h-7 w-16 px-2 text-[10px] font-bold backdrop-blur placeholder:text-content-muted/60"
          />
          <input
            value={weightDraft.points}
            onChange={(event) => setWeightDraft(prev => ({ ...prev, points: event.target.value }))}
            placeholder="Pontos"
            inputMode="decimal"
            className="app-field h-7 w-16 px-2 text-[10px] font-bold backdrop-blur placeholder:text-content-muted/60"
          />
          {renderCycleTooltip(
            'Salvar peso',
            <button
              type="button"
              onClick={() => handleSaveSubjectWeightInline(subject.id)}
              disabled={isSavingWeight}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:bg-control-hover disabled:text-content-muted/70"
              aria-label="Salvar peso da matéria"
            >
              {isSavingWeight ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
          )}
          {renderCycleTooltip(
            'Cancelar',
            <button
              type="button"
              onClick={handleCancelWeightEdit}
              disabled={isSavingWeight}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-input bg-control text-content-muted transition-colors hover:bg-control-hover hover:text-control-foreground disabled:text-content-muted/60"
              aria-label="Cancelar edição de peso"
            >
              <X size={12} />
            </button>
          )}
        </div>
      );
    }

    return (
      renderCycleTooltip(
        strategicWeight.hasWeight ? `${strategicWeight.label}. Clique para editar.` : 'Clique para informar o peso desta matéria.',
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleStartWeightEdit(subject);
          }}
          className={`inline-flex items-center gap-1 text-[10px] font-semibold leading-none transition-colors ${
            strategicWeight.hasWeight
              ? 'text-content-muted/70 hover:text-primary'
              : 'text-warning/80 hover:text-warning'
          }`}
          aria-label={strategicWeight.hasWeight ? 'Editar peso da matéria' : 'Informar peso da matéria'}
        >
          {strategicWeight.hasWeight ? (
            strategicWeight.label
          ) : (
            <>
              <Gauge size={11} strokeWidth={2.2} />
              <span className="sr-only">Sem peso informado</span>
            </>
          )}
        </button>
      )
    );
  };

  const focusSubjectFromStrategicAction = (subjectId: string) => {
    setExpandedSubjectIds([subjectId]);
    setHighlightedSubjectId(subjectId);

    window.setTimeout(() => {
      setHighlightedSubjectId(current => current === subjectId ? null : current);
    }, 1800);

    requestAnimationFrame(() => {
      document
        .querySelector(`[data-subject-id="${subjectId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const handleStrategicAlertAction = (alert: StudyCycleAlert) => {
    if (alert.actionType === 'fill_weight' && alert.subjectId) {
      const subject = expandedSubjectList.find(item => item.subject.id === alert.subjectId)?.subject;
      if (subject) {
        handleStartWeightEdit(subject);
        focusSubjectFromStrategicAction(alert.subjectId);
      }
      return;
    }

    if (alert.actionType === 'start_topic' && alert.topicId) {
      if (alert.subjectId) {
        focusSubjectFromStrategicAction(alert.subjectId);
      }
      openReviewModal(alert.topicId);
      return;
    }

    if ((alert.actionType === 'start_topic' || alert.actionType === 'review_cycle') && alert.subjectId) {
      focusSubjectFromStrategicAction(alert.subjectId);
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

  const formatVerticalDate = (value?: string | null) => {
    if (!value) return null;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderVerticalEditalSummary = () => {
    const cycleSubjectIds = new Set(expandedSubjectList.map(item => item.subject.id));
    const activeCycleEditais = editaisNoCiclo.filter(edital =>
      (edital.subject_ids || []).some(subjectId => cycleSubjectIds.has(getUnifiedSubjectId(subjectId, dynamicUnificationMap)))
    );
    const primaryEdital = activeCycleEditais[0] || editaisNoCiclo[0] || null;
    const examBoard = primaryEdital?.exam_board?.trim() || null;
    const position = primaryEdital?.position?.trim() || null;
    const editalName = primaryEdital
      ? (primaryEdital.organ?.trim() || primaryEdital.name?.trim() || 'Edital carregado')
      : 'Edital carregado';
    const examDate = formatVerticalDate(primaryEdital?.exam_date || null);
    const totalTopics = cycleMetrics.totalTopics;
    const startedTopics = cycleMetrics.startedTopics;
    const completedTopics = cycleMetrics.completedTopics;
    const unstartedTopics = cycleMetrics.unstartedTopics;
    const inProgressTopics = Math.max(startedTopics - completedTopics, 0);
    const coverage = totalTopics > 0 ? Math.round((startedTopics / totalTopics) * 100) : 0;
    const reviewSummary = cycleMetrics.overdueReviews > 0
      ? `${cycleMetrics.overdueReviews} atrasada${cycleMetrics.overdueReviews === 1 ? '' : 's'}`
      : cycleMetrics.dueTodayReviews > 0
        ? `${cycleMetrics.dueTodayReviews} hoje`
        : 'em dia';
    const paceText = cycleMetrics.daysUntilExam !== null && unstartedTopics > 0
      ? `${cycleMetrics.dailyNewTopicsGoal} tópico${cycleMetrics.dailyNewTopicsGoal === 1 ? '' : 's'}/dia para tocar tudo até a prova.`
      : cycleMetrics.estimatedDaysToFirstContact !== null && unstartedTopics > 0
        ? `No ritmo atual, o primeiro contato fecha em cerca de ${cycleMetrics.estimatedDaysToFirstContact} dias.`
        : unstartedTopics === 0
          ? 'Todos os tópicos ativos já tiveram primeiro contato.'
          : 'Informe a data da prova para calcular o ritmo necessário.';
    const metaItems = [
      examBoard ? `Banca ${examBoard}` : null,
      position,
      examDate ? `Prova ${examDate}` : null,
    ].filter(Boolean);

    return (
      <section className="app-gradient-panel mb-4 overflow-hidden rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary">
              <FileText size={15} />
              <h3 className="text-sm font-black tracking-tight">Mapa do edital</h3>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] font-bold leading-snug text-title-card">
              {editalName}
            </p>
            {metaItems.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-content-muted">
                {metaItems.map((item, index) => (
                  <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-1">
                    {index > 0 && <span className="h-1 w-1 rounded-full bg-content-muted/40" aria-hidden="true" />}
                    <span className="truncate">{item}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-xl border app-hairline bg-surface/60 px-3 py-2 backdrop-blur sm:min-w-32 sm:flex-col sm:items-start sm:gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-content-muted">Iniciado</span>
            <span className="text-xl font-black text-title-card tabular-nums">{coverage}%</span>
          </div>
        </div>

        <div className="app-progress-track mt-3 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="app-progress-fill h-full rounded-full transition-all duration-500"
            style={{ width: `${coverage}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: 'Iniciados', value: `${startedTopics}/${totalTopics}` },
            { label: 'Não iniciados', value: unstartedTopics },
            { label: 'Em andamento', value: inProgressTopics },
            { label: 'Concluídos', value: completedTopics },
          ].map(item => (
            <div key={item.label} className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
              <p className="text-[9px] font-black uppercase tracking-wide text-content-muted">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-title-card tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-2 text-[11px] font-semibold text-content-muted sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-2 rounded-xl border app-hairline bg-surface/45 px-3 py-2 backdrop-blur">
            <Gauge size={13} className="shrink-0 text-info" />
            <span className="min-w-0">{paceText}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/revisoes')}
            className="flex min-w-0 items-center gap-2 rounded-xl border app-hairline bg-surface/45 px-3 py-2 text-left backdrop-blur transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
          >
            <BookOpen size={13} className="shrink-0" />
            <span className="min-w-0">Revisões: {reviewSummary}</span>
          </button>
        </div>
      </section>
    );
  };

  const renderVerticalEditalView = () => (
    <>
      {renderVerticalEditalSummary()}
      <div className="app-surface w-full overflow-hidden rounded-2xl">
      {verticalSubjectList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-content-muted">
          <FileText size={28} className="mb-3 opacity-50" />
          <p className="text-sm font-semibold">Nenhum tópico encontrado{newSubjectName.trim() ? ` para "${newSubjectName}"` : ''}.</p>
        </div>
      ) : (
	        verticalSubjectList.map(({ subject, topics }) => {
            const isExpanded = expandedSubjectIds.includes(subject.id);

            return (
	          <div key={subject.id} className="border-b app-hairline last:border-b-0">
	            <div className="sticky top-0 z-10 flex w-full items-start gap-2 border-b border-primary/10 bg-surface/90 px-3 py-2 backdrop-blur-md sm:px-4">
	              <div className="min-w-0 flex-1">
	                <span className="block break-words text-[13px] font-black uppercase leading-snug tracking-wider text-title-section">
	                  {getUnifiedSubjectName(subject.id, subject.name)}
	                </span>
	                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
	                  <span className="text-[10px] font-semibold tabular-nums text-content-muted">
	                    {topics.length} tópico{topics.length !== 1 ? 's' : ''}
	                  </span>
	                  {renderSubjectWeightControl(subject)}
	                </div>
	              </div>
                <button
                  type="button"
                  onClick={() => toggleExpand(subject.id)}
                  className="ml-auto grid h-6 w-6 place-items-center rounded-lg text-content-muted transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={isExpanded ? 'Recolher matéria' : 'Expandir matéria'}
                  aria-expanded={isExpanded}
                >
                  <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
	            </div>

            {isExpanded && topics
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
	                    className="group app-cycle-topic-row relative grid gap-1.5 border-b app-hairline px-3 py-2 pl-4 transition-colors last:border-b-0 sm:px-4 sm:pl-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-3 lg:py-2"
	                  >
                    <div
                      className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full sm:w-1 ${statusVisual.indicatorClassName}`}
                      aria-hidden="true"
                    />
	                    <div className="min-w-0">
	                      <span className={`block break-words text-[12px] leading-snug sm:text-[12.5px] ${isTopicCompleted(topic) ? 'text-content-muted line-through decoration-content-muted/40' : topic.is_active === false ? 'text-content-muted opacity-50' : 'text-foreground'}`}>
	                        {topic.name}
	                        {studiedInCurrentCycle && !isTopicCompleted(topic) && (
	                          renderCycleTooltip(
	                            'Tópico iniciado neste ciclo',
	                            <CheckCircle2
	                              size={12}
	                              className="ml-1 inline-block align-[-2px] text-content-muted/70"
	                              aria-label="Tópico iniciado neste ciclo"
	                            />
	                          )
	                        )}
	                        {topic.is_active === false && <span className="text-[9px] ml-1 uppercase opacity-60">(inativo)</span>}
	                      </span>
	                      {incidenceDisplay && (
	                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
	                          {renderCycleTooltip(
	                            incidenceTitle,
	                            <span className="rounded-md border border-incidence/20 bg-incidence/10 px-1.5 py-0.5 text-[9.5px] font-semibold text-incidence">
	                              {incidenceDisplay}
	                            </span>
	                          )}
	                        </div>
	                      )}
                    </div>

	                    <div className="flex min-w-0 items-center justify-between gap-2 opacity-90 transition-opacity group-hover:opacity-100 lg:justify-end">
	                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold whitespace-nowrap ${status.className}`}>
	                        {status.label}
	                      </span>
	                      <div className="flex shrink-0 items-center gap-1">
                      {renderCycleTooltip(
                        `Anotações para ${topic.name}`,
                        <button
                          onClick={() => handleOpenVerticalTopicNotes(subject.id, topic.id)}
                          className={`grid h-7 w-7 place-items-center rounded transition-colors ${hasNotes ? 'text-primary/60 hover:text-primary' : 'text-content-muted/60 hover:text-primary/70'}`}
                          aria-label={`Anotações para ${topic.name}`}
                        >
                          <FileText size={13} />
                        </button>
                      )}

	                      {isTopicCompleted(topic) ? (
	                        <span className="flex h-7 items-center justify-center gap-1.5 rounded-lg border border-success/15 bg-success/10 px-2 text-[10px] font-bold whitespace-nowrap text-success">
	                          <Check size={11} />
	                          Concluído
	                        </span>
	                      ) : hasStarted ? (
	                        renderCycleTooltip(
	                          'Continuar estudo do tópico',
	                          <button
	                            onClick={() => navigate(`/revisoes?topicId=${topic.id}`)}
	                            className={`flex h-7 items-center justify-center gap-1.5 rounded-lg border px-2 text-[10px] font-bold whitespace-nowrap transition-all ${statusVisual.actionClassName}`}
	                            aria-label={`Continuar estudo do tópico ${topic.name}`}
	                          >
	                            <BookOpen size={11} />
	                            Continuar
	                          </button>
	                        )
	                      ) : (
	                        renderCycleTooltip(
	                          'Iniciar estudo do tópico',
	                          <button
	                            onClick={() => openReviewModal(topic.id)}
	                            className={`flex h-7 items-center justify-center gap-1.5 rounded-lg border px-2 text-[10px] font-bold whitespace-nowrap transition-all ${statusVisual.actionClassName}`}
	                            aria-label={`Iniciar estudo do tópico ${topic.name}`}
	                          >
	                            <Play size={10} className="ml-[1px]" />
	                            Iniciar<span className="hidden sm:inline"> estudo</span>
	                          </button>
	                        )
	                      )}
	                      </div>
                    </div>
                  </div>
                );
              })}
	          </div>
            );
        })
      )}
      </div>
    </>
  );

  const renderEmptyCycleState = () => (
    <div className="flex min-h-[520px] w-full items-center justify-center text-center">
      <div className="flex max-w-md flex-col items-center">
        <div className="app-empty-orb mb-6 flex h-20 w-20 items-center justify-center rounded-full">
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
          className="app-primary-button px-6 py-3"
        >
          Ir para Meus Editais
        </button>
      </div>
    </div>
  );

	  const StrategicEditalPanel = () => {
	    const highestPendingWeight = strategicPanelStats.highestPendingWeightSubject;
	    const highestIncidence = strategicPanelStats.highestIncidenceTopic;
	    const highestIncidenceSubject = strategicPanelStats.highestIncidenceSubject;
	    const currentCycleNumber = cycleMaturity.cycleNumber;
	    const canShowStrategicInsights = ['active', 'historical'].includes(cycleMaturity.phase);
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
	        ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% entre pesos informados`
	        : null;
	    const queueMainSubjectId = queueSuggestion?.suggestedOrder?.[0] || null;
	    const visibleEventInsights = cycleEventInsights.filter(insight =>
	      !(queueMainSubjectId && insight.id.startsWith('priority-neglected:') && insight.subjectId === queueMainSubjectId)
	    );
	    const insightItems = [
	      ...(cycleMaturity.phase !== 'cold_start' ? visibleEventInsights.map(insight => ({
	        label: insight.title,
	        value: `${insight.message} ${insight.evidence}`,
	        icon: BarChart2,
	        className: insight.severity === 'warning'
	          ? 'border-incidence/25 bg-incidence/10 text-incidence'
	          : 'border-incidence/20 bg-incidence/10 text-incidence',
	      })) : []),
	      canShowStrategicInsights && highestIncidenceSubject
	        ? {
	            label: 'Maior cobrança por matéria',
	            value: `${highestIncidenceSubject.subjectName}: cobrança alta encontrada em ${highestIncidenceSubject.analyzedTopicsCount} tópico${highestIncidenceSubject.analyzedTopicsCount === 1 ? '' : 's'}.`,
	            icon: Trophy,
	            className: 'border-info/20 bg-info/10 text-info',
	          }
	        : null,
	      canShowStrategicInsights && highestIncidence
	        ? {
	            label: 'Tópico de maior cobrança',
	            value: `${highestIncidence.topicName}. Matéria: ${highestIncidence.subjectName}.`,
	            icon: TrendingUp,
	            className: 'border-incidence/20 bg-incidence/10 text-incidence',
	          }
	        : null,
	      canShowStrategicInsights && highestPendingWeight
	        ? {
	            label: 'Maior peso pendente',
	            value: `${getUnifiedSubjectName(highestPendingWeight.subject.id, highestPendingWeight.subject.name)} (${formatDerivedWeightPercentage(highestPendingWeight.percentage) || `${highestPendingWeight.effectiveWeight.value} ${highestPendingWeight.effectiveWeight.label}`})`,
	            icon: Target,
	            className: 'border-warning/20 bg-warning/10 text-warning',
	          }
	        : null,
	    ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Target; className: string }>;
	    const insightReadinessText = (() => {
	      if (cycleMaturity.phase === 'cold_start') {
	        return cycleMaturity.description;
	      }

	      if (cycleMaturity.phase === 'started') {
	        return `${cycleMaturity.description} Ainda preciso de mais alguns eventos do ciclo para separar padrão real de começo normal.`;
	      }

	      if (cycleMaturity.phase === 'historical' && !cycleMaturity.hasSavedCycleHistory && cycleEventInsights.length === 0) {
	        return `${cycleMaturity.description} As comparações finas aparecem depois que um ciclo for fechado com snapshot salvo.`;
	      }

	      if (!highestIncidence && !highestIncidenceSubject && cycleEventInsights.length === 0) {
	        return 'Ainda não encontrei risco ou oportunidade confiável. Quando houver cobrança analisada, peso conhecido relevante ou padrão real de uso, o insight aparece aqui.';
	      }

	      return 'Nenhum novo insight estratégico confiável neste momento.';
	    })();
	    const forecastText = cycleVisualStats.remainingSubjects === 0
	      ? 'Este ciclo já está completo.'
	      : cycleVisualStats.daysToFinish !== null && cycleVisualStats.daysToFinish > 0
	        ? `Pelo ritmo de matérias fechadas neste ciclo, você fecha a fila em cerca de ${cycleVisualStats.daysToFinish} dias.`
	        : null;
	    const lastClosedCycle = cycleSnapshots[0] || null;
	    const topicDelta = lastClosedCycle
	      ? strategicPanelStats.topicsStartedThisCycle - lastClosedCycle.topics_started_count
	      : null;
	    const formatTopicDelta = (value: number | null) => {
	      if (value === null) return null;
	      if (value === 0) return `Mesmo volume do ciclo ${lastClosedCycle?.cycle_number}.`;
	      const abs = Math.abs(value);
	      const label = `${abs} ${abs === 1 ? 'tópico' : 'tópicos'}`;
	      return value > 0
	        ? `${label} a mais que no ciclo ${lastClosedCycle?.cycle_number}.`
	        : `${label} a menos que no ciclo ${lastClosedCycle?.cycle_number}.`;
	    };
	    const alertStyles: Record<StudyCycleAlert['severity'], { card: string; icon: string; label: string }> = {
	      critical: {
	        card: 'border-destructive/25 bg-destructive/10 text-destructive',
	        icon: 'bg-destructive/15 text-destructive',
	        label: 'Crítico',
	      },
	      warning: {
	        card: 'border-warning/25 bg-warning/10 text-warning',
	        icon: 'bg-warning/15 text-warning',
	        label: 'Atenção',
	      },
	      info: {
	        card: 'border-info/20 bg-info/10 text-info',
	        icon: 'bg-info/15 text-info',
	        label: 'Sinal',
	      },
	    };

	    return (
	      <aside
	        id="strategic-cycle-panel"
	        ref={strategicPanelRef}
	        className="block min-w-0 scroll-mt-20 xl:scroll-mt-4"
	      >
	        <div className="xl:sticky xl:top-4">
	          <div className="space-y-3">
	            <div className="app-gradient-panel overflow-hidden rounded-2xl p-4">
	              <div className="flex items-start justify-between gap-4">
	                <div className="min-w-0 flex-1">
	                  <h4 className="app-type-eyebrow text-primary">
	                    Ciclo {currentCycleNumber}
	                  </h4>
	                  {renderCycleTooltip(
	                    editalCycleLabel,
	                    <p className="app-type-caption mt-1 overflow-hidden break-words text-content-muted [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
	                      {editalCycleLabel}
	                    </p>
	                  )}
	                </div>
	                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-primary/25 bg-surface/60 backdrop-blur">
	                  <span className="text-base font-bold text-title-card tabular-nums">{strategicPanelStats.coveragePercentage}%</span>
	                </div>
	              </div>
	              <div className="app-progress-track mt-4 h-1.5 w-full overflow-hidden rounded-full">
	                <div
	                  className="app-progress-fill h-full rounded-full transition-all duration-500"
	                  style={{ width: `${strategicPanelStats.coveragePercentage}%` }}
	                />
	              </div>
	              {forecastText && (
	                <div className="mt-3 flex items-start gap-2 text-content-muted">
	                  <Gauge size={14} className="mt-0.5 shrink-0 text-primary" />
	                  <p className="app-type-caption min-w-0">
	                    {forecastText}
	                  </p>
	                </div>
	              )}
	              <div className="app-responsive-stat-grid mt-4">
	                <div className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
	                  <div className="flex items-center justify-between gap-3">
	                    <p className="app-type-eyebrow text-content-muted">Matérias concluídas no ciclo</p>
	                    <p className="text-sm font-bold text-title-card tabular-nums">{cycleVisualStats.studiedSubjects}</p>
	                  </div>
	                </div>
	                <div className="rounded-xl border app-hairline bg-surface/55 px-3 py-2 backdrop-blur">
	                  <div className="flex items-center justify-between gap-3">
	                    <p className="app-type-eyebrow text-content-muted">Tópicos iniciados</p>
	                    <p className="text-sm font-bold text-title-card tabular-nums">{strategicPanelStats.topicsStartedThisCycle}</p>
	                  </div>
	                  {formatTopicDelta(topicDelta) && (
	                    <p className="app-type-caption mt-1 text-content-muted">
	                      {formatTopicDelta(topicDelta)}
	                    </p>
	                  )}
	                </div>
	              </div>
	              <div className="mt-2 space-y-2">
	                {!lastClosedCycle && (
	                  <p className="app-type-caption text-content-muted">
	                    Ao iniciar o próximo ciclo, este resumo será salvo para comparar sua evolução.
	                  </p>
	                )}
	              </div>
	            </div>

	            {strategicAlerts.length > 0 && (
	              <div className="app-glass rounded-2xl p-4">
	                <div className="mb-3 flex items-center justify-between gap-3">
	                  <h4 className="app-type-eyebrow text-warning">
	                    Atenção estratégica
	                  </h4>
	                  <AlertCircle size={15} className="text-warning" />
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
	                              <span className="app-type-badge opacity-80">{style.label}</span>
	                              <p className="app-type-eyebrow text-title-card">{alert.title}</p>
	                            </div>
	                            <p className="app-type-body-small mt-1 text-title-card">{alert.message}</p>
	                            <p className="app-type-caption mt-1 text-content-muted">{alert.evidence}</p>
	                          </div>
	                        </div>
	                        {alert.actionLabel && alert.actionType !== 'none' && (
	                          <button
	                            type="button"
	                            onClick={() => handleStrategicAlertAction(alert)}
	                            className="app-type-action-xs mt-1 h-7 rounded-lg border app-hairline bg-surface/45 px-2.5 text-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
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
	              <div className="rounded-2xl border border-incidence/20 bg-incidence/[0.07] p-4">
	                <div className="mb-3 flex items-center justify-between gap-3">
	                  <h4 className="app-type-eyebrow text-incidence">
	                    Ajuste sugerido da fila
	                  </h4>
	                  <ListTodo size={15} className="text-incidence" />
	                </div>
	                <div className="rounded-xl border border-incidence/20 bg-surface/45 p-3 backdrop-blur">
	                  <div className="mb-2 flex items-center gap-2">
	                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-incidence/15 text-incidence">
	                      <MoveUp size={14} />
	                    </div>
	                    <p className="app-type-eyebrow text-incidence">
	                      {queueSuggestion.title}
	                    </p>
	                  </div>
	                  <p className="app-type-body-small text-title-card">{queueSuggestion.message}</p>
	                  <p className="app-type-caption mt-1 text-content-muted">{queueSuggestion.evidence}</p>
	                  {queueSuggestion.limitations.length > 0 && (
	                    <div className="mt-2 space-y-1">
	                      {queueSuggestion.limitations.map(limit => (
	                        <p key={limit} className="app-type-caption text-content-muted">
	                          {limit}
	                        </p>
	                      ))}
	                    </div>
	                  )}
	                  <button
	                    type="button"
	                    onClick={() => handleApplySuggestedQueueOrder(queueSuggestion.suggestedOrder)}
	                    className="app-type-action-xs mt-3 h-8 rounded-lg border border-incidence/25 bg-incidence/10 px-3 text-incidence transition-colors hover:border-incidence/50 hover:bg-incidence/20"
	                  >
	                    Aplicar sugestão
	                  </button>
	                </div>
	              </div>
	            )}

	            <div className="app-surface rounded-2xl p-4">
	              <div className="mb-3 flex items-center justify-between gap-3">
	                <h4 className="app-type-eyebrow text-content-muted">
	                  Insights
	                </h4>
	                <span className="app-type-badge inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-1 text-primary">
	                  <Sparkles size={11} />
	                  {cycleMaturity.label}
	                </span>
	              </div>
	              {insightItems.length > 0 ? (
	                <div className="grid grid-cols-1 gap-2">
	                  {insightItems.slice(0, 4).map(item => {
	                    const Icon = item.icon;
	                    return (
	                      <div key={item.label} className={`rounded-xl border p-3 ${item.className}`}>
	                        <div className="mb-2 flex items-center gap-2">
	                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface/55 backdrop-blur">
	                            <Icon size={14} />
	                          </div>
	                          <p className="app-type-eyebrow">{item.label}</p>
	                        </div>
	                        <p className="app-type-body-small text-title-card">{item.value}</p>
	                      </div>
	                    );
	                  })}
	                </div>
	              ) : (
	                <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-3">
	                  <div className="mb-2 flex items-center gap-2 text-primary">
	                    <Sparkles size={14} />
	                    <span className="app-type-eyebrow">Sem sinal confiável ainda</span>
	                  </div>
	                  <p className="text-xs text-content-muted leading-relaxed">
	                    {insightReadinessText}
	                  </p>
	                </div>
	              )}
	            </div>

	            {userCycle && (
	              <div className="flex justify-end">
	                <button
	                  type="button"
	                  onClick={() => setResetCycleConfirmOpen(true)}
	                  disabled={isResettingCycle}
	                  className="app-type-action-xs inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2 py-1.5 text-destructive/70 transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
	                  aria-label="Reiniciar ciclo de estudos"
	                >
	                  {isResettingCycle ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
	                  <span>Resetar ciclo</span>
	                </button>
	              </div>
	            )}

	          </div>
	        </div>
	      </aside>
    );
  };

  const handleCycleSearchChange = (query: string) => {
    const previousName = newSubjectName;
    setNewSubjectName(query);

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

        if ((matchesSubject || hasMatchingTopic) && !cycleClosedSubjectIdSet.has(item.subject.id)) {
          newExpanded.push(item.id);
        }
      });

      setExpandedSubjectIds(newExpanded);
    } else {
      setExpandedSubjectIds(expandedBeforeSearch);
      setExpandedBeforeSearch([]);
    }
  };

  const closeCycleSearch = () => {
    setIsCycleSearchOpen(false);
    handleCycleSearchChange('');
  };

  const handleViewModeToggle = () => {
    const nextTab: SubjectTab = activeTab === 'vertical' ? 'all' : 'vertical';
    setActiveTab(nextTab);

    if (nextTab === 'vertical') {
      setExpandedSubjectIds(verticalSubjectList.map(item => item.id));
    }
  };

  const renderViewModeButton = () => (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleViewModeToggle}
            className="app-control app-type-control h-7 shrink-0 gap-1.5 px-1.5 sm:px-2"
            aria-label={activeTab === 'vertical' ? 'Voltar para o modo ciclo' : 'Ver conteúdo em modo edital'}
          >
            <FileText size={11} />
            <span className="hidden min-[760px]:inline xl:inline">
              {activeTab === 'vertical' ? 'Modo ciclo' : 'Modo edital'}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {activeTab === 'vertical' ? 'Voltar para o modo ciclo' : 'Ver conteúdo em modo edital'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const renderCycleSearchControl = () => (
    <div
      className="relative h-7 min-w-0 flex-1 transition-[width] duration-200 sm:max-w-[15rem] sm:flex-none sm:focus-within:w-[220px]"
      onClick={() => setIsCycleSearchOpen(true)}
    >
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-content-muted" size={11} />
      <input
        ref={inputRef}
        type="text"
        placeholder="Buscar"
        value={newSubjectName}
        onFocus={() => setIsCycleSearchOpen(true)}
        onChange={(e) => handleCycleSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') closeCycleSearch();
        }}
        className="app-field app-type-control h-7 w-full py-0.5 pl-6 pr-6 backdrop-blur placeholder:text-content-muted/45"
        aria-label="Buscar na fila do ciclo"
      />
      {newSubjectName.trim() && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            closeCycleSearch();
          }}
          className="absolute right-1 top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded text-content-muted transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Limpar busca"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );

  const renderCycleReorderButton = () => {
    const reorderDisabled = activeTab === 'vertical';

    return (
      <TooltipProvider delayDuration={120}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleToggleCycleReorder}
              disabled={reorderDisabled}
              className={`app-type-control inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-1.5 transition-colors sm:px-2 ${
                isReorderingCycle
                  ? 'border-warning/45 bg-warning/15 text-warning shadow-[0_0_18px_hsl(var(--warning)/0.12)]'
                  : 'app-control disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-transparent disabled:hover:bg-transparent disabled:hover:text-content-muted'
              }`}
              aria-pressed={isReorderingCycle}
              aria-label={
                reorderDisabled
                  ? 'Organização disponível apenas no modo ciclo'
                  : isReorderingCycle
                    ? 'Concluir organização da fila'
                    : 'Organizar ordem da fila'
              }
            >
              {isReorderingCycle ? <Check size={11} /> : <GripVertical size={12} />}
              <span className="hidden min-[760px]:inline xl:inline">
                {isReorderingCycle ? 'OK' : 'Organizar'}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {reorderDisabled ? 'Disponível no modo ciclo' : isReorderingCycle ? 'Concluir organização' : 'Organizar ordem'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderCycleWorkspaceHeader = () => {
    const isCycleMode = activeTab === 'all';
    const expandableSubjectIds = isCycleMode
      ? filteredList
        .filter(item => !cycleClosedSubjectIdSet.has(item.subject.id))
        .map(item => item.id)
      : verticalSubjectList.map(item => item.id);
    const allExpanded = expandableSubjectIds.length > 0 && expandableSubjectIds.every(id => expandedSubjectIds.includes(id));
    const title = isCycleMode ? 'Fila do Ciclo' : 'Edital Verticalizado';
    const count = isCycleMode ? filteredList.length : verticalSubjectList.length;

    return (
      <div className="mb-2 space-y-2 px-0">
        <div className="flex min-w-0 items-center gap-2">
          {isCycleMode ? (
            <ListTodo size={17} className="shrink-0 text-primary" />
          ) : (
            <FileText size={16} className="shrink-0 text-primary" />
          )}
          <h3 className="app-type-section-title min-w-0 break-words text-title-section">
            {title}
          </h3>
          <span className="app-type-badge shrink-0 rounded-md bg-primary/8 px-1.5 py-0.5 text-primary">
            ({count})
          </span>
        </div>
        <div className="app-glass app-cycle-toolbar rounded-2xl px-2 py-2">
          <div className="app-cycle-toolbar-primary">
            {renderCycleReorderButton()}
            {renderCycleSearchControl()}
          </div>
          <div className="app-cycle-toolbar-secondary">
            {renderViewModeButton()}
            <TooltipProvider delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleAllCycleSubjects}
                    disabled={expandableSubjectIds.length === 0}
                    className="app-control app-type-control h-7 shrink-0 gap-1 px-1.5 disabled:cursor-not-allowed disabled:opacity-35 sm:px-2"
                    aria-label={allExpanded ? 'Recolher todas as matérias' : 'Expandir todas as matérias'}
                  >
                    <ChevronDown
                      size={11}
                      className={`transition-transform ${allExpanded ? 'rotate-180' : ''}`}
                    />
                    <span className="hidden min-[760px]:inline xl:inline">
                      {allExpanded ? 'Recolher' : 'Expandir'}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {allExpanded ? 'Recolher todos' : 'Expandir todos'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    );
  };

  const mainSubjectUI = (
    <div className="space-y-6 w-full">
      {activeTab === 'vertical' ? (
        <div className="space-y-3">
          {renderCycleWorkspaceHeader()}
          {renderVerticalEditalView()}
        </div>
      ) : (
        <div className={activeTab === 'all' ? "grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.58fr)] xl:gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.54fr)] items-start" : "w-full"}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
        <div className="w-full min-w-0">
          {activeTab === 'all' && renderCycleWorkspaceHeader()}

          {(displayList.length === 0 && dataLoaded && !isLoading) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500 w-full mb-12">
              {localSubjects.length === 0 ? (
                <>
                  <div className="app-empty-orb mb-6 flex h-20 w-20 items-center justify-center rounded-full">
                    <span className="text-4xl text-primary">📚</span>
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-title-section">
                    Nenhuma matéria cadastrada
                  </h3>
                  <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                    Importe um edital ou cadastre matérias em Meus Editais para montar uma fila de ciclo confiável.
                  </p>
                  <button
                    onClick={() => navigate('/meus-editais', { state: { filterCycle: true } })}
                    className="app-primary-button px-6 py-3"
                  >
                    Ir para Meus Editais
                  </button>
                </>
              ) : activeTab === 'all' && hasActiveCycle && isCycleFullyStudied ? (
                <div className="app-gradient-panel w-full max-w-xl rounded-2xl p-6 text-left">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-success/25 bg-success/10">
                      <CheckCircle2 size={22} className="text-success" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-title-section">
                        Ciclo {(userCycle?.ciclos_realizados || 0) + 1} finalizado
                      </h3>
                      <p className="text-sm text-content-muted mt-1 leading-relaxed">
                        Todas as matérias pendentes deste ciclo foram concluídas no ciclo ou já estão concluídas no edital.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-5">
                    <div className="app-soft-panel rounded-xl p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-content-muted mb-1">
                        Estudadas
                      </p>
                    <p className="text-2xl font-black text-title-card">
                        {studiedCycleList.length}
                      </p>
                    </div>
                    <div className="app-soft-panel rounded-xl p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-content-muted mb-1">
                        Total
                      </p>
                      <p className="text-2xl font-black text-title-card">
                        {studiedCycleList.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setStartNextCycleConfirmOpen(true)}
                      disabled={isStartingNextCycle}
                      className="app-success-button gap-2 px-5 py-2.5 disabled:cursor-not-allowed"
                    >
                      {isStartingNextCycle ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Iniciar Próximo Ciclo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="app-empty-orb mb-6 flex h-16 w-16 items-center justify-center rounded-full">
                    <Search size={32} className="text-content-muted" />
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
                    className="app-primary-button px-5 py-2"
                  >
                    Ir para Meus Editais
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'all' && isCycleFullyStudied && (
                <div className="app-gradient-panel mb-4 flex items-center justify-between gap-4 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      Ciclo concluído
                    </p>
                    <p className="text-xs text-content-muted mt-0.5">
                      Todas as matérias da fila foram concluídas no ciclo ou já estão concluídas no edital.
                    </p>
                  </div>
                  <button
                    onClick={() => setStartNextCycleConfirmOpen(true)}
                    disabled={isStartingNextCycle}
                    className="app-success-button app-type-action-xs h-9 shrink-0 gap-2 px-3 disabled:cursor-not-allowed"
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
	                  const isManuallyStudiedInCycle = studiedCycleIdSet.has(subject.id);
	                  const isFullyStartedInCycle = fullyStartedSubjectIdSet.has(subject.id);
	                  const isCompletedInEdital = completedEditalSubjectIdSet.has(subject.id);
	                  const isClosedInCycle = isManuallyStudiedInCycle || isFullyStartedInCycle || isCompletedInEdital;
	                  const activeSubjectTopics = subject.topics.filter(topic => topic.is_active !== false);
	                  const totalTopicsCount = activeSubjectTopics.length;
	                  const completedTopicsCount = activeSubjectTopics.filter(isTopicCompleted).length;
	                  const inReviewTopicsCount = activeSubjectTopics.filter(topic =>
	                    isTopicStarted(topic) && !isTopicCompleted(topic)
	                  ).length;
	                  const noTopics = totalTopicsCount === 0;
	                  const startedTopicsCount = inReviewTopicsCount + completedTopicsCount;
	                  const activeTopicsStartedInCurrentCycle = subject.topics.filter(topic =>
	                    topic.is_active !== false && isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo)
	                  ).length;
	                  const needsCycleClosure = activeTopicsStartedInCurrentCycle > 0 && !isClosedInCycle;
	                  const subjectTopicSummaryLabel = (() => {
	                    if (noTopics) return '0 tópicos';
	                    if (isCompletedInEdital) {
	                      return `${completedTopicsCount}/${totalTopicsCount} tópicos concluídos`;
	                    }
	                    if (isManuallyStudiedInCycle || isFullyStartedInCycle) {
	                      return activeTopicsStartedInCurrentCycle > 0
	                        ? `${activeTopicsStartedInCurrentCycle}/${totalTopicsCount} tópicos neste ciclo`
	                        : 'Concluída no ciclo';
	                    }
	                    return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados`;
	                  })();

                  const isEditing = editingSubjectId === subject.id;

                  return (
	                    <SortableItem key={item.id} id={item.id} lockAxis="vertical" disabled={!isReorderingCycle}>
                      {({ listeners, attributes }) => (
	                        <div className="w-full max-w-full flex items-start gap-1.5" data-subject-item>
	                          <div
	                            className={`h-[56px] w-5 shrink-0 items-center justify-center rounded-xl border transition-all touch-none ${
	                                isReorderingCycle
	                                  ? 'flex cursor-grab border-warning/20 bg-warning/10 text-warning shadow-[0_0_18px_hsl(var(--warning)/0.10)] active:cursor-grabbing'
	                                  : 'hidden'
	                              }`}
	                            onClick={(e) => e.stopPropagation()}
	                            {...listeners}
	                            {...attributes}
	                            aria-label={`Arrastar ${getUnifiedSubjectName(subject.id, subject.name)} para reorganizar a fila`}
	                          >
	                            <GripVertical size={isReorderingCycle ? 16 : 14} />
	                          </div>

                          {/* Container unificado: header + tópicos no mesmo card */}
	                          <div
		                            className={`overflow-hidden rounded-2xl border backdrop-blur transition-all ${
		                              expandedSubjectIds.includes(item.id)
		                                ? isClosedInCycle
		                                  ? 'border-success/25'
		                                  : 'app-hairline shadow-sm'
	                                : isClosedInCycle
	                                  ? 'border-success/20 hover:border-success/35'
	                                  : 'app-hairline'
		                            } ${isClosedInCycle ? 'app-cycle-subject-closed' : 'app-cycle-subject'} ${isReorderingCycle ? 'ring-1 ring-warning/15 shadow-[0_8px_26px_rgba(0,0,0,0.10)]' : ''} flex-1 min-w-0`}
		                          >
	                            {/* === HEADER DA MATÉRIA === */}
                            <div
	                              data-subject-id={subject.id}
	                              onClick={() => toggleExpand(item.id)}
	                              className={`min-h-[64px] pl-2 pr-4 py-2 flex items-center gap-2 group cursor-pointer relative transition-colors ${
	                                isClosedInCycle
	                                  ? 'bg-success/[0.055]'
	                                  : ''
                              } ${highlightedSubjectId === subject.id ? 'study-cycle-subject-focus' : ''}`}
                          >
                              {/* Content area: text + progress */}
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                {/* Text Block */}
                                <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                  {renderCycleTooltip(
                                    'Gerenciar no edital',
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
                                      className="mt-[1px] p-0.5 text-content-muted/45 transition-colors hover:text-primary"
                                      aria-label={`Gerenciar ${getUnifiedSubjectName(subject.id, subject.name)} no edital`}
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                  )}

                                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <h4 className={`app-type-card-title overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
                                      isClosedInCycle
                                        ? 'text-content-muted'
                                        : 'text-title-card'
                                    }`}>
                                      {(() => { const n = getUnifiedSubjectName(subject.id, subject.name); return n.charAt(0).toUpperCase() + n.slice(1); })()}
                                    </h4>

	                                    <div className="app-type-meta mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-content-muted">
	                                      <span className="flex min-w-0 items-center gap-0.5 break-words">
	                                        <ListTodo size={10} /> {subjectTopicSummaryLabel}
	                                      </span>
	                                      {!isClosedInCycle && (
	                                        <>
	                                          <span className="h-1 w-1 rounded-full bg-content-muted/30" aria-hidden="true" />
	                                          {renderSubjectWeightControl(subject)}
	                                        </>
	                                      )}
	                                    </div>
	                                  </div>

                                  {isSubjectMerged(subject.id) && renderCycleTooltip(
                                      'Desfazer mesclagem',
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
                                        className="w-fit rounded p-1 text-warning transition-colors hover:bg-warning/10"
                                        aria-label={`Desfazer mesclagem de ${getUnifiedSubjectName(subject.id, subject.name)}`}
                                      >
                                        <Link2Off size={14} />
                                      </button>
                                    )}
                                </div>

                              </div>

                            <div className="flex items-center gap-2 shrink-0">

                              {activeTab === 'all' && (
                                <>
		                                  {isCompletedInEdital || isFullyStartedInCycle ? (
		                                    renderCycleTooltip(
		                                      isCompletedInEdital
		                                        ? 'Todos os tópicos ativos desta matéria estão concluídos.'
		                                        : 'Todos os tópicos ativos desta matéria já foram iniciados.',
		                                      <button
		                                        onClick={(e) => e.stopPropagation()}
		                                        aria-disabled="true"
		                                        className="relative flex h-6 w-6 shrink-0 cursor-default items-center justify-center rounded-full border border-success/25 bg-success/10 text-success opacity-80"
		                                        aria-label={isCompletedInEdital
		                                          ? `${getUnifiedSubjectName(subject.id, subject.name)} concluída no edital`
	                                          : `${getUnifiedSubjectName(subject.id, subject.name)} concluída no ciclo`}
		                                      >
		                                        <Check size={12} strokeWidth={3} />
		                                      </button>
		                                    )
	                                  ) : isManuallyStudiedInCycle ? (
	                                    renderCycleTooltip(
	                                      'Voltar matéria para a fila',
	                                      <button
	                                        onClick={(e) => {
	                                          e.stopPropagation();
                                          handleVoltarMateriaParaFila(subject.id);
                                        }}
                                        className="group/return relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-success/25 bg-success/10 text-success transition-all hover:border-success/35 hover:bg-success/15 hover:text-success"
                                        aria-label={`Voltar ${getUnifiedSubjectName(subject.id, subject.name)} para a fila do ciclo`}
                                      >
                                        <Check size={12} strokeWidth={3} className="transition-all group-hover/return:scale-0 group-hover/return:opacity-0" />
                                        <RotateCcw size={11} className="absolute scale-0 opacity-0 transition-all group-hover/return:scale-100 group-hover/return:opacity-100" />
                                      </button>
                                    )
                                  ) : (
                                    renderCycleTooltip(
                                      needsCycleClosure ? 'Há tópicos novos neste ciclo. Marque a matéria quando encerrar este bloco.' : 'Marcar como estudada',
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarcarMateriaComoEstudada(subject.id);
                                        }}
                                        aria-label={`Marcar ${getUnifiedSubjectName(subject.id, subject.name)} como estudada`}
                                        className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                          needsCycleClosure
                                            ? 'border-warning/70 bg-warning/10 text-warning shadow-[0_0_0_3px_hsl(var(--warning)/0.10)] before:absolute before:inset-[-5px] before:rounded-full before:border before:border-warning/30 before:animate-pulse hover:border-success/80 hover:bg-success hover:text-success-foreground hover:shadow-none'
                                            : 'border-border-strong/70 bg-surface/30 text-content-muted hover:border-success/70 hover:bg-success hover:text-success-foreground dark:bg-surface/20'
                                        }`}
                                      >
                                        <Check size={12} strokeWidth={3} />
                                      </button>
                                    )
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                            {/* === TÓPICOS (dentro do mesmo card) === */}
                            {expandedSubjectIds.includes(item.id) && (
                              <div
                                className="border-t app-hairline"
                                onClick={(e) => e.stopPropagation()}
                              >

                              {activeSubjectTopics.length === 0 ? (
                                <div className="py-4 text-center text-xs text-content-muted">
                                  Nenhum tópico cadastrado
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  {activeSubjectTopics.map((topic) => {
                                    const completed = isTopicCompleted(topic);
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
	                                        className="app-cycle-topic-row relative grid min-h-10 cursor-default grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t app-hairline py-2.5 pl-4 pr-3 transition-colors first:border-t-0 group/topic sm:pr-4"
                                      >
	                                        {renderCycleTooltip(
	                                          statusLabel,
	                                          <div
	                                            className="flex h-full min-h-5 cursor-default select-none items-center justify-center"
	                                            role="img"
	                                            aria-label={statusLabel}
	                                          >
	                                            <div className={`h-5 w-1 rounded-full ${statusVisual.indicatorClassName}`} />
	                                          </div>
	                                        )}

	                                        <div className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
	                                          <div className="flex min-w-0 items-center gap-1.5">
	                                            <span
	                                              className={`app-type-body-small min-w-0 max-w-full break-words transition-opacity ${
	                                                completed ? 'text-content-muted opacity-50' : 'text-content-main'
	                                              }`}
	                                            >
	                                              {topic.name.charAt(0).toUpperCase() + topic.name.slice(1)}
	                                            </span>
	                                            {studiedInCurrentCycle && !completed && renderCycleTooltip(
	                                              'Tópico iniciado neste ciclo',
	                                              <CheckCircle2
	                                                size={12}
	                                                className="flex-shrink-0 text-content-muted"
	                                                role="img"
	                                                aria-label={`Tópico iniciado neste ciclo: ${topic.name}`}
	                                              />
	                                            )}
	                                          </div>
	                                          {incidenceDisplay && (
	                                            <div className="flex min-w-0">
	                                              {renderCycleTooltip(
	                                                incidenceTitle,
	                                                <span className="app-type-badge max-w-full truncate rounded border border-incidence/20 bg-incidence/10 px-1.5 py-0.5 text-incidence">
	                                                  {incidenceDisplay}
	                                                </span>
	                                              )}
	                                            </div>
	                                          )}
                                        </div>

	                                        <div className="flex min-w-0 items-center justify-end gap-1 self-center">
                                            <div
                                              className={`hidden md:flex h-6 items-center gap-1 transition-all duration-200 opacity-0 pointer-events-none group-hover/topic:pointer-events-auto ${completed ? 'group-hover/topic:opacity-40' : 'group-hover/topic:opacity-100'}`}
                                            >
                                              {renderCycleTooltip(
                                                'Abrir assistente de IA',
                                                <button
                                                  type="button"
                                                  className="h-6 w-6 rounded-full border border-transparent bg-transparent text-content-muted/45 hover:border-primary/25 hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center"
                                                  aria-label={`Abrir assistente de IA para ${topic.name}`}
                                                >
                                                  <Wand2 size={12} />
                                                </button>
                                              )}
                                              {renderCycleTooltip(
                                                `Anotações para ${topic.name}`,
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
                                                  aria-label={`Anotações para ${topic.name}`}
                                                >
                                                  <FileText size={12} />
                                                </button>
                                              )}
                                            </div>
	                                            <div className="flex-shrink-0">
	                                              {completed ? (
	                                                <span className="app-type-action-xs ml-0.5 flex h-7 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-success/15 bg-success/10 px-2.5 text-success">
	                                                  <Check size={11} />
	                                                  <span className="hidden sm:inline">Concluído</span>
	                                                </span>
	                                              ) : hasStarted ? (
	                                                renderCycleTooltip(
	                                                  'Continuar estudo do tópico',
	                                                  <button
	                                                    onClick={(e) => {
	                                                      e.stopPropagation();
	                                                      navigate(`/revisoes?topicId=${topic.id}`);
	                                                    }}
	                                                    className={`app-type-action-xs flex-shrink-0 h-7 px-2.5 rounded-lg flex items-center justify-center gap-1.5 border transition-all ml-0.5 ${statusVisual.actionClassName}`}
	                                                    aria-label={`Continuar estudo do tópico ${topic.name}`}
	                                                  >
	                                                    <BookOpen size={11} />
	                                                    <span className="hidden sm:inline">Continuar</span>
	                                                  </button>
	                                                )
	                                              ) : (
	                                                renderCycleTooltip(
	                                                  'Iniciar estudo do tópico',
	                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
	                                                      openReviewModal(topic.id);
	                                                    }}
	                                                    className={`app-type-action-xs flex-shrink-0 h-7 px-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center gap-1.5 ml-0.5 group ${statusVisual.actionClassName}`}
	                                                    aria-label={`Iniciar estudo do tópico ${topic.name}`}
	                                                  >
	                                                    <Play size={10} className="ml-[1px] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
	                                                    <span className="hidden sm:inline">Iniciar</span>
	                                                  </button>
	                                                )
	                                              )}
	                                            </div>
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
                className="app-surface group relative flex items-center gap-3 overflow-hidden rounded-2xl px-8 py-3 transition-all hover:border-primary/50 hover:bg-primary/5"
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

        {activeTab === 'all' && (
          <div className="min-w-0">
            <div className="mb-2 space-y-2 px-0">
              <a
                ref={strategicPanelTitleRef}
                href="#strategic-cycle-panel"
                onClick={(event) => {
                  event.preventDefault();
                  strategicPanelTitleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex min-w-0 scroll-mt-20 items-center gap-2 text-title-section transition-colors hover:text-primary"
              >
                <Shield size={17} className="shrink-0 text-primary" />
                <span className="app-type-section-title min-w-0 truncate">
                  Painel estratégico do edital
                </span>
              </a>
              <div className="hidden h-11 xl:block" aria-hidden="true" />
            </div>
            {isStrategicDockVisible && (
              <a
                href="#strategic-cycle-panel"
                onClick={(event) => {
                  event.preventDefault();
                  strategicPanelTitleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="fixed inset-x-4 bottom-3 z-40 flex min-w-0 items-center justify-between gap-3 rounded-lg border app-hairline bg-surface/60 px-2 py-1.5 text-primary shadow-lg shadow-primary/5 backdrop-blur-md transition-colors hover:bg-surface/75 md:left-[calc(var(--sidebar-width)+1rem)] md:peer-data-[state=collapsed]:left-[calc(var(--sidebar-width-icon)+1.5rem)]"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Shield size={17} className="shrink-0 text-primary" />
                  <span className="app-type-section-title min-w-0 truncate">
                    Painel estratégico do edital
                  </span>
                </span>
                <span className="app-type-action-xs shrink-0 text-primary">
                  Ver
                </span>
              </a>
            )}
            <StrategicEditalPanel />
          </div>
        )}
        </DndContext>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex w-full font-sans text-foreground">
      <div className="flex-1 flex flex-col relative w-full">

        {/* Header Outside Card */}
        <main className="flex-1 px-0 pb-8 pt-0 flex flex-col gap-6">
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
                  <CheckCircle2 className="w-5 h-5 text-success" />
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
                  className="app-success-button font-semibold"
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
                  <RefreshCw className="w-5 h-5 text-success" />
                  Iniciar próximo ciclo?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-content-muted">
                  Isso limpará as marcações manuais deste ciclo e iniciará o Ciclo {(userCycle?.ciclos_realizados || 0) + 2}. Matérias com todos os tópicos ativos iniciados continuarão concluídas automaticamente no ciclo.
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
                  className="app-success-button flex items-center justify-center gap-2 font-semibold"
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
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Resetar ciclo de estudos?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Isso vai zerar o ciclo atual, limpar as marcações manuais deste ciclo e voltar a contagem para o Ciclo 1. Matérias com todos os tópicos ativos iniciados continuarão concluídas automaticamente no ciclo.
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
                  className="app-danger-button flex items-center justify-center gap-2"
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
                  className="app-danger-button flex items-center justify-center gap-2"
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
                  <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
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
                  className="app-danger-button flex items-center justify-center gap-2"
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
                  <AlertCircle className="h-5 w-5 text-destructive" />
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
                    <div className={`rounded-lg border px-3 py-2 ${isOriginalSystem ? 'border-destructive/20 bg-destructive/10' : 'border-border bg-muted/50'}`}>
                      {isOriginalSystem ? (
                        <p className="text-xs font-medium text-destructive">
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
                              ? 'bg-primary/15 text-primary'
                              : edil.is_imported
                                ? 'bg-incidence/15 text-incidence'
                                : 'bg-success/15 text-success'
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
                                ? 'cursor-not-allowed border-destructive/35 bg-destructive/10'
                                : 'border-border hover:border-destructive/35 hover:bg-destructive/10'
                            }`}
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className={`truncate max-w-[180px] font-medium ${isOriginalSystem ? 'text-destructive' : ''}`}>
                                {edital.name}
                              </span>
                              {isOriginalSystem && (
                                <span className="text-[9px] font-bold text-destructive">
                                  Edital original do sistema
                                </span>
                              )}
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isOriginalSystem
                                ? 'bg-destructive/15 text-destructive'
                                : edital.source_id
                                  ? 'bg-primary/15 text-primary'
                                  : edital.is_imported
                                    ? 'bg-incidence/15 text-incidence'
                                    : 'bg-success/15 text-success'
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
                    className="app-danger-button gap-1.5 text-xs"
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
                    className="app-danger-button gap-1.5 text-xs"
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
                  <div className="scale-95 rounded-[24px] border border-border/50 bg-secondary/50 p-4 origin-top translate-y-[-4px]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-content-muted/60 mb-3 ml-1">
                      ESTRUTURA DE SEPARAÇÃO
                    </p>
                    <div className="space-y-2">
                      {selectedMergeOriginals.map((orig, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
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
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
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
