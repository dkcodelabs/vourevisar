import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit, Edit2, ChevronDown, Check, X, CheckSquare, Square, Search, GripVertical, FileText, Merge, FolderUp, Loader2, Sparkles, AlertCircle, Copy, CheckCircle2, GraduationCap, RefreshCw, BarChart2, Zap, ArrowRight, Bookmark, MoveUp, Shield, Layers, FileDown, Filter, Play, Wand2, BookOpen, Link2Off, RotateCcw, TrendingUp, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate'; // Added
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Subject, Topic, UserEdital } from '@/types';
import type { UserEdital as EditalModalData } from '@/pages/Editais';
import { supabase } from '@/integrations/supabase/client';
import { applyUnificationMap, getUnifiedSubjectId } from '@/services/cycleMergeService';
import { useAuth } from '@/contexts/AuthContext';
import TopicsModal from '@/components/topics/TopicsModal';
import ContentUploadModal from '@/components/ContentUploadModal';
import NotesModal from '@/components/reviews/NotesModal';
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { CreateTopicModal } from '@/components/topics/CreateTopicModal';
import { EditalSubjectsModal } from '@/components/editais/EditalSubjectsModal';
import { CycleEmptyState } from '@/components/study-cycle/CycleEmptyState';
import { CycleFirstContactFinishedPanel } from '@/components/study-cycle/CycleFirstContactFinishedPanel';
import { CycleSubjectCard } from '@/components/study-cycle/CycleSubjectCard';
import { CycleTopicRow } from '@/components/study-cycle/CycleTopicRow';
import { StrategicEditalPanel } from '@/components/study-cycle/StrategicEditalPanel';
import { CycleWorkspaceHeader } from '@/components/study-cycle/CycleWorkspaceHeader';
import { VerticalEditalView } from '@/components/study-cycle/VerticalEditalView';
import { VerticalEditalSummary } from '@/components/study-cycle/VerticalEditalSummary';
import { SubjectWeightControl } from '@/components/study-cycle/SubjectWeightControl';

import { errorService } from '@/lib/errors/errorService';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';
import { useStudyCycleStrategicData } from '@/hooks/useStudyCycleStrategicData';

import { useMergeData } from '@/hooks/useMergeData';
import { useCycleQueueOrderActions } from '@/hooks/useCycleQueueOrderActions';
import { useCycleStudyEventRecorder } from '@/hooks/useCycleStudyEventRecorder';
import { useCycleSubjectCompletionActions } from '@/hooks/useCycleSubjectCompletionActions';
import { useCycleEditalUnload } from '@/hooks/useCycleEditalUnload';
import { usePermanentSubjectDeletion } from '@/hooks/usePermanentSubjectDeletion';
import { useEditalImport } from '@/hooks/useEditalImport';
import { useStudyCyclePageData } from '@/hooks/useStudyCyclePageData';
import { useStudyCycleReset } from '@/hooks/useStudyCycleReset';
import { useSubjectWeightEditor } from '@/hooks/useSubjectWeightEditor';
import { fetchTopicReviewStats, fetchTopicReviewStudyMinutes } from '@/services/topicReviewService';
import { useTopicReview } from '@/hooks/useTopicReview';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import { mergeService } from '@/services/mergeService';
import type { CycleStudyEventType } from '@/services/cycleStudyEventsService';
import { getTopicStrategicIncidence } from '@/utils/studyCycleStrategic';
import {
  type StudyCycleAlert,
} from '@/utils/studyCycleAlerts';
import {
  type CycleStudyEvent,
} from '@/utils/studyCycleEventInsights';
import {
  getStartedTopicCycleCta,
  getStudyCycleSubjectActionState,
} from '@/utils/studyCycleSubjectState';
import {
  getVisibleCycleTopicIds,
  getVisibleCycleTopics,
  isVisibleCycleTopic,
} from '@/utils/studyCycleTopicVisibility';

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
  const activeTopics = getVisibleCycleTopics(subject.topics);
  return activeTopics.length > 0 && activeTopics.every(isTopicCompleted);
};

const isSubjectFirstContactClosed = (subject: Subject) => {
  const activeTopics = getVisibleCycleTopics(subject.topics);
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

const getCycleTopicStatusVisual = (
  topic: Topic,
  hasStarted = isTopicStarted(topic)
): CycleTopicStatusVisual => {
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
      badgeClassName: 'bg-primary/10 text-primary',
      indicatorClassName: 'bg-primary',
      actionClassName: 'border-transparent bg-transparent text-primary hover:border-primary/20 hover:bg-primary/10',
    };
  }

  if (hasStarted) {
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

const formatStudyMinutes = (minutes: number) => {
  if (minutes <= 0) return 'Sem tempo registrado';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
};


const Subjects = () => {
  const { user } = useAuth();
  const [isImportEditalModalOpen, setIsImportEditalModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'ready' | 'ia' | 'manual'>('ready');
  const closeImportEditalModal = useCallback(() => setIsImportEditalModalOpen(false), []);
  const { originsMap, editaisData, editaisNoCiclo, activeSubjectIdsSet, getOriginsForSubject, refresh, isLoading: isOriginsLoading } = useEditalOriginsWithMerge();
  const { getUnifiedSubjectName, isSubjectMerged, getSubjectOrigins, revertSubjectMerge, getSubjectMergeInfo, dynamicUnificationMap } = useMergeData();
  const navigate = useNavigate();
  const {
    dataLoaded,
    isLoading,
    loadError,
    loading,
    localSubjects,
    refreshData,
    retryInitialLoad,
    setIsLoading,
    setLocalSubjects,
    setSubjects,
    setUserCycle,
    subjects,
    userCycle,
  } = useStudyCyclePageData({ refreshOrigins: refresh, user });
  const {
    setUnloadConfirm,
    unloadConfirm,
    unloadEdital: handleUnloadCycle,
    unloadingEditalId,
  } = useCycleEditalUnload({ refreshData, userId: user?.id });
  const {
    deletePermanent: handleDeletePermanent,
    deletePermanentConfirm,
    setDeletePermanentConfirm,
  } = usePermanentSubjectDeletion({
    refreshOrigins: refresh,
    setIsLoading,
    setLocalSubjects,
    userId: user?.id,
  });
  const {
    isResettingCycle,
    resetCycle: handleResetCycle,
    resetCycleConfirmOpen,
    setResetCycleConfirmOpen,
  } = useStudyCycleReset({
    setUserCycle,
    userCycle,
    userId: user?.id,
  });
  const { importSubjects: handleImportSubjects } = useEditalImport({
    closeModal: closeImportEditalModal,
    refreshData,
    refreshOrigins: refresh,
    setIsLoading,
    userId: user?.id,
  });
  const [topicStats, setTopicStats] = useState<Map<string, { reviewCount: number; hardReviewCount: number }>>(new Map());
  const [topicStudyMinutes, setTopicStudyMinutes] = useState<Map<string, number>>(new Map());

  // Novos modais V2 states
  const [visibleCount, setVisibleCount] = useState(25);
  const ITEMS_PER_PAGE = 25;
  const [selectedTopicForNotes, setSelectedTopicForNotes] = useState<{id: string, name: string, subjectName: string} | null>(null);
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

  const [isCreateTopicModalOpen, setIsCreateTopicModalOpen] = useState(false);
  const { openReviewModal, difficultyModalData, closeDifficultyModal, markTopicAsReviewed, isLoading: isSavingTopicReview } = useTopicReview();
  const [subjectsModal, setSubjectsModal] = useState<{ 
    isOpen: boolean; 
    edital: EditalModalData | null;
    initialExpandedSubjectId?: string;
  }>({ isOpen: false, edital: null });

  const location = useLocation();

  type EditalModalSource = Partial<EditalModalData> & {
    exam_date?: string;
    created_at?: string;
    updated_at?: string;
    is_imported?: boolean;
    source_id?: string;
    subject_ids?: string[];
    active_subject_ids?: string[];
    merged_with?: string[];
    merged_into_cycle?: boolean;
  };

  const toEditalModalData = (edital: EditalModalSource): EditalModalData => ({
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

  // Mantem a deteccao de topicos ja iniciados quando o progresso vem do historico.
  useEffect(() => {
    const allTopicIds = subjects.flatMap(s => s.topics.map(t => t.id));
    if (allTopicIds.length === 0) {
      setTopicStats(new Map());
      return;
    }

    fetchTopicReviewStats(allTopicIds).then((stats) => {
      setTopicStats(stats);
    });
  }, [subjects]);

  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSource, setNewSubjectSource] = useState('');
  const [isCycleSearchOpen, setIsCycleSearchOpen] = useState(false);
  const {
    clearSavedWeight,
    editingWeightSubjectId,
    handleCancelWeightEdit,
    handleSaveSubjectWeightInline,
    handleStartWeightEdit,
    isSavingWeight,
    setWeightDraft,
    weightDraft,
    weightSavedSubjectId,
  } = useSubjectWeightEditor({
    setLocalSubjects,
    setSubjects,
    userId: user?.id,
  });
  // IDs de subjects ocultos localmente (otimismo para handleDelete)
  const [hiddenSubjectIds, setHiddenSubjectIds] = useState<Set<string>>(new Set());
  const [completeCycleConfirmOpen, setCompleteCycleConfirmOpen] = useState(false);
  const [pendingCompleteSubjectId, setPendingCompleteSubjectId] = useState<string | null>(null);
  // Confirmação inline de exclusão de matéria
  const [confirmHideSubjectId, setConfirmHideSubjectId] = useState<string | null>(null);

  // Relações de matérias mescladas: { "materiaPrincipalId": ["materia1Id", "materia2Id"] }
  const [mergedSubjectsMap, setMergedSubjectsMap] = useState<Record<string, string[]>>({});

  const [toastShown, setToastShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const strategicPanelTitleRef = useRef<HTMLAnchorElement | null>(null);
  const strategicPanelRef = useRef<HTMLElement | null>(null);
  const strategicDockRef = useRef<HTMLAnchorElement | null>(null);
  const [cycleExpandedSubjectIds, setCycleExpandedSubjectIds] = useState<string[]>([]);
  const [verticalExpandedSubjectIds, setVerticalExpandedSubjectIds] = useState<string[]>([]);
  const cycleExpansionStorageKey = user?.id ? `study_cycle_expanded_subjects_${user.id}` : null;
  const loadedCycleExpansionKeyRef = useRef<string | null>(null);
  const [hydratedCycleExpansionKey, setHydratedCycleExpansionKey] = useState<string | null>(null);
  const [highlightedSubjectId, setHighlightedSubjectId] = useState<string | null>(null);
  const [expandedBeforeSearch, setExpandedBeforeSearch] = useState<string[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isStrategicDockVisible, setIsStrategicDockVisible] = useState(false);
  const [strategicDockLayout, setStrategicDockLayout] = useState({ left: 16, width: 0 });
  const [isReorderingCycle, setIsReorderingCycle] = useState(false);

  // Estados para edição inline
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // View mode: ciclo padrão ou visualização verticalizada do edital
  const [activeTab, setActiveTab] = useState<SubjectTab>('all');
  const expandedSubjectIds = activeTab === 'vertical' ? verticalExpandedSubjectIds : cycleExpandedSubjectIds;

  // Estado para o modal de tópicos
  const [topicsModal, setTopicsModal] = useState<{
    isOpen: boolean;
    subject: Subject | null;
  }>({ isOpen: false, subject: null });

  // Estado para o modal de upload de conteúdo
  const [contentUploadModal, setContentUploadModal] = useState(false);


  // expandedSubjectList agora é um useMemo (definido mais abaixo)

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

  const visibleCycleTopicIds = useMemo(
    () => getVisibleCycleTopicIds(expandedSubjectList.map(item => item.subject)),
    [expandedSubjectList],
  );

  useEffect(() => {
    if (visibleCycleTopicIds.length === 0) {
      setTopicStudyMinutes(new Map());
      return;
    }

    fetchTopicReviewStudyMinutes(visibleCycleTopicIds).then((studyMinutes) => {
      setTopicStudyMinutes(studyMinutes);
    });
  }, [visibleCycleTopicIds]);

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
      if (!isSubjectFirstContactClosed(item.subject)) return;
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
    setCycleExpandedSubjectIds(prev => prev.filter(id => !cycleClosedSubjectIdSet.has(id)));
  }, [cycleClosedSubjectIdSet]);

  useEffect(() => {
    if (!cycleExpansionStorageKey || loadedCycleExpansionKeyRef.current === cycleExpansionStorageKey) return;

    loadedCycleExpansionKeyRef.current = cycleExpansionStorageKey;

    try {
      const storedValue = localStorage.getItem(cycleExpansionStorageKey);
      const storedIds = storedValue ? JSON.parse(storedValue) : [];
      setCycleExpandedSubjectIds(Array.isArray(storedIds) ? storedIds.filter(id => typeof id === 'string') : []);
    } catch {
      setCycleExpandedSubjectIds([]);
    }

    setHydratedCycleExpansionKey(cycleExpansionStorageKey);
  }, [cycleExpansionStorageKey]);

  useEffect(() => {
    if (!dataLoaded || expandedSubjectList.length === 0) return;

    const validSubjectIds = new Set(expandedSubjectList.map(item => item.id));
    setCycleExpandedSubjectIds(prev => prev.filter(id => validSubjectIds.has(id)));
  }, [dataLoaded, expandedSubjectList]);

  useEffect(() => {
    if (!cycleExpansionStorageKey || hydratedCycleExpansionKey !== cycleExpansionStorageKey) return;

    localStorage.setItem(cycleExpansionStorageKey, JSON.stringify(cycleExpandedSubjectIds));
  }, [cycleExpansionStorageKey, cycleExpandedSubjectIds, hydratedCycleExpansionKey]);

  // Sincronização redundante de localSubjects removida para evitar flicker.
  // localSubjects agora é gerenciado diretamente no loadSubjects.

  const topicsModalSubjectId = topicsModal.subject?.id;

  // Mantém o modal de tópicos atualizado se os dados da matéria mudarem em background
  useEffect(() => {
    if (topicsModal.isOpen && topicsModalSubjectId && subjects.length > 0) {
      const updatedSubject = subjects.find(s => s.id === topicsModalSubjectId);
      if (updatedSubject) {
        setTopicsModal(prev => prev.subject === updatedSubject
          ? prev
          : { ...prev, subject: updatedSubject });
      }
    }
  }, [subjects, topicsModal.isOpen, topicsModalSubjectId]);

  const loadCycleSnapshots = useCallback(async () => {
    if (!user || !userCycle?.id) {
      setCycleSnapshots([]);
      return;
    }

    try {
      const { data, error } = await supabase
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
      const { data, error } = await supabase
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
      await supabase
        .from('subjects')
        .update({ is_visible: false })
        .eq('id', id);

      // 2. Se pertencer a editais, remover de active_subject_ids
      const { data: relatedEditais } = await supabase
        .from('user_editais')
        .select('id, active_subject_ids')
        .contains('active_subject_ids', [id]);

      if (relatedEditais && relatedEditais.length > 0) {
        for (const edital of relatedEditais) {
          const newActiveIds = (edital.active_subject_ids as string[]).filter(sid => sid !== id);
          await supabase
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

  const handleDragStart = (_event: DragStartEvent) => {
    // Mantém o estado aberto/fechado da fila durante a ordenação.
  };

  const handleToggleCycleReorder = () => {
    setIsReorderingCycle(prev => {
      const next = !prev;
      if (next) {
        setCycleExpandedSubjectIds([]);
      }
      return next;
    });
  };

  const { recordCycleEvent } = useCycleStudyEventRecorder({
    dynamicUnificationMap,
    loadCycleStudyEvents,
    user,
    userCycle,
  });

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

  const {
    executeMarcarMateriaComoEstudada,
    handleMarcarMateriaComoEstudada,
    handleVoltarMateriaParaFila,
  } = useCycleSubjectCompletionActions({
    cycleClosedSubjectIdSet,
    dynamicUnificationMap,
    expandedSubjectList,
    getEquivalentSubjectIds,
    getUnifiedSubjectName,
    localSubjects,
    recordCycleEvent,
    setCompleteCycleConfirmOpen,
    setCycleExpandedSubjectIds,
    setPendingCompleteSubjectId,
    setUserCycle,
    user,
    userCycle,
  });

  const handleViewTopics = (subject: Subject) => {
    navigate('/ciclo-estudos');
  };

  const toggleExpand = (itemId: string) => {
    const updateExpandedIds = (prev: string[]) =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];

    if (activeTab === 'vertical') {
      setVerticalExpandedSubjectIds(updateExpandedIds);
      return;
    }

    setCycleExpandedSubjectIds(updateExpandedIds);
  };

  const toggleAllCycleSubjects = () => {
    const subjectIds = activeTab === 'vertical'
      ? verticalSubjectList.map(item => item.id)
      : filteredList.map(item => item.id);
    const allSubjectsExpanded = subjectIds.length > 0 &&
      subjectIds.every(id => expandedSubjectIds.includes(id));

    if (activeTab === 'vertical') {
      setVerticalExpandedSubjectIds(allSubjectsExpanded ? [] : subjectIds);
      return;
    }

    setCycleExpandedSubjectIds(allSubjectsExpanded ? [] : subjectIds);
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

  const {
    handleApplySuggestedQueueOrder,
    handleDragEnd,
  } = useCycleQueueOrderActions({
    activeTab,
    expandedSubjectList,
    orderedCycleDisplayList,
    recordCycleEvent,
    setIsReorderingCycle,
    setUserCycle,
    user,
    userCycle,
  });

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
          .filter(isVisibleCycleTopic)
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

  useEffect(() => {
    if (activeTab !== 'vertical') return;
    setVerticalExpandedSubjectIds(verticalSubjectList.map(item => item.id));
  }, [activeTab, verticalSubjectList]);

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
  const cycleDisplayName = typeof userCycle?.name === 'string' && userCycle.name.trim()
    ? userCycle.name.trim()
    : null;
  const {
    cycleEventInsights,
    cycleMaturity,
    cycleMetrics,
    cycleTransitionSummary,
    cycleVisualStats,
    queueSuggestion,
    strategicAlerts,
    strategicPanelStats,
  } = useStudyCycleStrategicData({
    cycleClosedSubjectIdSet,
    cycleSnapshots,
    cycleStudyEvents,
    dynamicUnificationMap,
    editaisNoCiclo,
    expandedSubjectList,
    getUnifiedSubjectName,
    topicStudyMinutes,
    userCycle,
  });

  const verticalSummaryEdital = useMemo(() => {
    const cycleSubjectIds = new Set(expandedSubjectList.map(item => item.subject.id));
    const activeCycleEditais = editaisNoCiclo.filter(edital =>
      (edital.subject_ids || []).some(subjectId => cycleSubjectIds.has(getUnifiedSubjectId(subjectId, dynamicUnificationMap)))
    );

    return activeCycleEditais[0] || editaisNoCiclo[0] || null;
  }, [dynamicUnificationMap, editaisNoCiclo, expandedSubjectList]);

  useEffect(() => {
    if (activeTab !== 'all' || loading || isLoading || isOriginsLoading || !showCycleWorkspace) {
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
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const left = Math.max(8, Math.round(titleRect.left));
        const right = Math.min(viewportWidth - 8, Math.round(titleRect.right));
        const width = Math.max(0, right - left);
        const dockTop = strategicDockRef.current?.getBoundingClientRect().top ?? viewportHeight - 52;

        setStrategicDockLayout(previous =>
          previous.left === left && previous.width === width ? previous : { left, width }
        );
        setIsStrategicDockVisible(width > 0 && titleRect.top > dockTop);
      });
    };

    updateDockVisibility();
    window.addEventListener('resize', updateDockVisibility);
    window.addEventListener('scroll', updateDockVisibility, { passive: true });
    document.addEventListener('scroll', updateDockVisibility, true);
    window.visualViewport?.addEventListener('resize', updateDockVisibility);
    window.visualViewport?.addEventListener('scroll', updateDockVisibility);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateDockVisibility);
      window.removeEventListener('scroll', updateDockVisibility);
      document.removeEventListener('scroll', updateDockVisibility, true);
      window.visualViewport?.removeEventListener('resize', updateDockVisibility);
      window.visualViewport?.removeEventListener('scroll', updateDockVisibility);
    };
  }, [activeTab, isLoading, isOriginsLoading, loading, queueSuggestion, showCycleWorkspace, strategicAlerts.length]);

	  if (isLoading || isOriginsLoading || loading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  if (loadError) {
    return (
      <div className="flex min-h-[520px] w-full items-center justify-center px-4 text-center" role="alert">
        <div className="flex max-w-md flex-col items-center">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle size={26} />
          </div>
          <h2 className="text-xl font-bold text-title-section">{loadError}</h2>
          <p className="mt-2 text-sm leading-relaxed text-content-muted">
            Seus dados continuam salvos. Verifique sua conexão e tente carregar novamente.
          </p>
          <button
            type="button"
            onClick={retryInitialLoad}
            className="app-primary-button mt-6 gap-2 px-5 py-2.5"
          >
            <RefreshCw size={15} />
            Tentar novamente
          </button>
        </div>
      </div>
    );
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
    return (
      <SubjectWeightControl
        isEditing={editingWeightSubjectId === subject.id}
        isSaving={isSavingWeight}
        isSaved={weightSavedSubjectId === subject.id}
        onCancel={handleCancelWeightEdit}
        onClearSaved={clearSavedWeight}
        onDraftChange={setWeightDraft}
        onSave={handleSaveSubjectWeightInline}
        onStartEdit={handleStartWeightEdit}
        subject={subject}
        weightDraft={weightDraft}
      />
    );
  };

  const focusSubjectFromStrategicAction = (subjectId: string) => {
    setCycleExpandedSubjectIds([subjectId]);
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

    if ((alert.actionType === 'start_subject' || alert.actionType === 'start_topic' || alert.actionType === 'review_cycle') && alert.subjectId) {
      focusSubjectFromStrategicAction(alert.subjectId);
    }
  };

  const getVerticalTopicStatus = (topic: Topic, hasStarted = isTopicStarted(topic)) => {
    if (topic.is_active === false) {
      const statusVisual = getCycleTopicStatusVisual(topic, hasStarted);
      return { label: statusVisual.label, className: statusVisual.badgeClassName };
    }

    if (isTopicCompleted(topic)) {
      const statusVisual = getCycleTopicStatusVisual(topic, hasStarted);
      return { label: statusVisual.label, className: statusVisual.badgeClassName };
    }

    const statusVisual = getCycleTopicStatusVisual(topic, hasStarted);
    return { label: statusVisual.label, className: statusVisual.badgeClassName };
  };

  const renderVerticalEditalSummary = () => (
    <VerticalEditalSummary
      edital={verticalSummaryEdital}
      metrics={cycleMetrics}
      onOpenReviews={() => navigate('/revisoes')}
    />
  );

  const getSubjectTopicSummaryLabel = (subject: Subject, activeSubjectTopics: Topic[]) => {
    const totalTopicsCount = activeSubjectTopics.length;
    const completedTopicsCount = activeSubjectTopics.filter(isTopicCompleted).length;
    const inReviewTopicsCount = activeSubjectTopics.filter(topic =>
      isTopicStarted(topic) && !isTopicCompleted(topic)
    ).length;
    const startedTopicsCount = inReviewTopicsCount + completedTopicsCount;
    const activeTopicsStartedInCurrentCycle = subject.topics.filter(topic =>
      isVisibleCycleTopic(topic) && isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo)
    ).length;

    if (totalTopicsCount === 0) return '0 tópicos';
    if (completedEditalSubjectIdSet.has(subject.id)) {
      return `${completedTopicsCount}/${totalTopicsCount} tópicos concluídos`;
    }
    if (studiedCycleIdSet.has(subject.id)) {
      return activeTopicsStartedInCurrentCycle > 0
        ? `${activeTopicsStartedInCurrentCycle}/${totalTopicsCount} tópicos neste ciclo`
        : 'Concluída no ciclo';
    }
    if (fullyStartedSubjectIdSet.has(subject.id)) {
      return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados`;
    }

    return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados`;
  };

  const renderVerticalEditalView = () => (
    <VerticalEditalView
      emptySearchQuery={newSubjectName}
      expandedSubjectIds={expandedSubjectIds}
      getCycleTopicStatusVisual={getCycleTopicStatusVisual}
      getStartedTopicCta={getStartedTopicCycleCta}
      getStrategicTopicIncidenceDisplay={getStrategicTopicIncidenceDisplay}
      getStrategicTopicIncidenceTitle={getStrategicTopicIncidenceTitle}
      getSubjectTopicSummaryLabel={getSubjectTopicSummaryLabel}
      getTopicContactCount={(topic) => getTopicContactCount(topic, topicStats)}
      getUnifiedSubjectName={getUnifiedSubjectName}
      getVerticalTopicStatus={getVerticalTopicStatus}
      isTopicCompleted={isTopicCompleted}
      isTopicNewlyStartedInCycle={(topic) => isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo)}
      isTopicStarted={isTopicStarted}
      isWeightLineActive={(subjectId) => editingWeightSubjectId === subjectId || weightSavedSubjectId === subjectId}
      onGoToReview={(topicId) => navigate(`/revisoes?topicId=${topicId}`)}
      onOpenReviewModal={openReviewModal}
      onOpenTopicNotes={handleOpenVerticalTopicNotes}
      renderCycleTooltip={renderCycleTooltip}
      renderSubjectWeightControl={renderSubjectWeightControl}
      subjects={verticalSubjectList}
      summary={renderVerticalEditalSummary()}
    />
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
          onClick={() => navigate('/meus-editais', { state: { filterCycle: hasActiveCycle } })}
          className="app-primary-button px-6 py-3"
        >
          Ir para Meus Editais
        </button>
      </div>
    </div>
  );

  const renderFirstContactFinishedPanel = (variant: 'full' | 'compact' = 'compact') => (
    <CycleFirstContactFinishedPanel
      formatStudyMinutes={formatStudyMinutes}
      onNavigate={navigate}
      summary={cycleTransitionSummary}
      variant={variant}
    />
  );

  const handleCycleSearchChange = (query: string) => {
    const previousName = newSubjectName;
    setNewSubjectName(query);

    if (activeTab === 'vertical') {
      return;
    }

    if (!previousName && query.trim()) {
      setExpandedBeforeSearch([...cycleExpandedSubjectIds]);
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

      setCycleExpandedSubjectIds(newExpanded);
    } else {
      setCycleExpandedSubjectIds(expandedBeforeSearch);
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
      setVerticalExpandedSubjectIds(verticalSubjectList.map(item => item.id));
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
      ? filteredList.map(item => item.id)
      : verticalSubjectList.map(item => item.id);
    const allExpanded = expandableSubjectIds.length > 0 && expandableSubjectIds.every(id => expandedSubjectIds.includes(id));
    const title = isCycleMode ? (cycleDisplayName || 'Fila do Ciclo') : 'Edital Verticalizado';
    const count = isCycleMode ? filteredList.length : verticalSubjectList.length;

    return (
      <CycleWorkspaceHeader
        allExpanded={allExpanded}
        canToggleAll={expandableSubjectIds.length > 0}
        count={count}
        isCycleMode={isCycleMode}
        onToggleAll={toggleAllCycleSubjects}
        reorderControl={renderCycleReorderButton()}
        searchControl={renderCycleSearchControl()}
        title={title}
        viewModeControl={renderViewModeButton()}
      />
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
              {localSubjects.length > 0 && activeTab === 'all' && hasActiveCycle && isCycleFullyStudied ? (
                renderFirstContactFinishedPanel('full')
              ) : (
                <CycleEmptyState
                  hasLocalSubjects={localSubjects.length > 0}
                  isSearchActive={Boolean(newSubjectName.trim()) && !isImportEditalModalOpen}
                  onGoToEditais={() => navigate('/meus-editais')}
                />
              )}
            </div>
          ) : (
            <>
              {activeTab === 'all' && isCycleFullyStudied && renderFirstContactFinishedPanel('compact')}

              <SortableContext items={displayList.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className={activeTab === 'all' ? "flex flex-col gap-1.5" : "space-y-1.5"}>
	                {displayList.map((item) => {
	                  const { subject } = item;
	                  const isManuallyStudiedInCycle = studiedCycleIdSet.has(subject.id);
	                  const isFullyStartedInCycle = fullyStartedSubjectIdSet.has(subject.id);
	                  const isCompletedInEdital = completedEditalSubjectIdSet.has(subject.id);
	                  const isClosedInCycle = isManuallyStudiedInCycle || isFullyStartedInCycle || isCompletedInEdital;
	                  const activeSubjectTopics = getVisibleCycleTopics(subject.topics);
	                  const totalTopicsCount = activeSubjectTopics.length;
	                  const completedTopicsCount = activeSubjectTopics.filter(isTopicCompleted).length;
	                  const inReviewTopicsCount = activeSubjectTopics.filter(topic =>
	                    isTopicStarted(topic) && !isTopicCompleted(topic)
	                  ).length;
	                  const noTopics = totalTopicsCount === 0;
	                  const startedTopicsCount = inReviewTopicsCount + completedTopicsCount;
		                  const activeTopicsStartedInCurrentCycle = subject.topics.filter(topic =>
		                    isVisibleCycleTopic(topic) && isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo)
		                  ).length;
		                  const needsCycleClosure = activeTopicsStartedInCurrentCycle > 0 && !isClosedInCycle;
		                  const subjectActionState = getStudyCycleSubjectActionState({
		                    isCompletedInEdital,
		                    isFullyStartedInCycle,
		                    isManuallyStudiedInCycle,
		                    needsCycleClosure,
		                  });
		                  const subjectTopicSummaryLabel = (() => {
	                    if (noTopics) return '0 tópicos';
	                    if (isCompletedInEdital) {
	                      return `${completedTopicsCount}/${totalTopicsCount} tópicos concluídos`;
	                    }
	                    if (isManuallyStudiedInCycle) {
	                      return activeTopicsStartedInCurrentCycle > 0
	                        ? `${activeTopicsStartedInCurrentCycle}/${totalTopicsCount} tópicos neste ciclo`
	                        : 'Concluída no ciclo';
	                    }
	                    if (isFullyStartedInCycle) {
	                      return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados`;
	                    }
	                    return `${startedTopicsCount}/${totalTopicsCount} tópicos iniciados`;
	                  })();

                  const isWeightLineActive = editingWeightSubjectId === subject.id || weightSavedSubjectId === subject.id;
                  const subjectDisplayName = getUnifiedSubjectName(subject.id, subject.name);
                  const subjectWeightControl = renderSubjectWeightControl(subject);
                  const handleManageSubject = () => {
                    const edital = editaisData.find(e => e.id === subject.edital_id);
                    if (edital) {
                      setSubjectsModal({
                        isOpen: true,
                        edital: toEditalModalData(edital),
                        initialExpandedSubjectId: subject.id
                      });
                    }
                  };
                  const handleOpenRevertMerge = () => {
                    const mergeInfo = getSubjectMergeInfo(subject.id);
                    if (mergeInfo) {
                      setSelectedMergeId(mergeInfo.id);
                      setSelectedMergeName(mergeInfo.display_name);

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
                  };

                  return (
                    <CycleSubjectCard
                      key={item.id}
                      activeTab={activeTab}
                      hasTopics={activeSubjectTopics.length > 0}
                      isClosedInCycle={isClosedInCycle}
                      isCompletedInEdital={isCompletedInEdital}
                      isExpanded={expandedSubjectIds.includes(item.id)}
                      isHighlighted={highlightedSubjectId === subject.id}
                      isMerged={isSubjectMerged(subject.id)}
                      isReorderingCycle={isReorderingCycle}
                      isWeightLineActive={isWeightLineActive}
                      itemId={item.id}
                      needsCycleClosure={needsCycleClosure}
                      onManageSubject={handleManageSubject}
                      onMarkStudied={() => handleMarcarMateriaComoEstudada(subject.id)}
                      onOpenRevertMerge={handleOpenRevertMerge}
                      onReturnToQueue={() => handleVoltarMateriaParaFila(subject.id)}
                      onToggleExpand={() => toggleExpand(item.id)}
                      renderCycleTooltip={renderCycleTooltip}
                      subject={subject}
                      subjectActionState={subjectActionState}
                      subjectDisplayName={subjectDisplayName}
                      subjectTopicSummaryLabel={subjectTopicSummaryLabel}
                      weightControl={subjectWeightControl}
                    >
                      <div className="flex flex-col">
	                                  {activeSubjectTopics.map((topic) => {
	                                    const completed = isTopicCompleted(topic);
		                                    const contactCount = getTopicContactCount(topic, topicStats);
		                                    const hasStarted = contactCount > 0 || isTopicStarted(topic);
		                                    const studiedInCurrentCycle = isTopicNewlyStartedInCycle(topic, userCycle?.data_inicio_ciclo);
	                                    const statusVisual = getCycleTopicStatusVisual(topic, hasStarted);
		                                    const startedTopicCta = getStartedTopicCycleCta(topic.name);
		                                    const statusLabel = `Tópico ${statusVisual.label.toLowerCase()}`;
	                                    const incidenceTitle = getStrategicTopicIncidenceTitle(topic);
	                                    const incidenceDisplay = getStrategicTopicIncidenceDisplay(topic);

	                                    return (
                                        <CycleTopicRow
                                          key={topic.id}
                                          completed={completed}
                                          hasStarted={hasStarted}
                                          incidenceDisplay={incidenceDisplay}
                                          incidenceTitle={incidenceTitle}
                                          onGoToReview={() => navigate(`/revisoes?topicId=${topic.id}`)}
                                          onOpenNotes={() => {
                                            setSelectedTopicForNotes({
                                              id: topic.id,
                                              name: topic.name,
                                              subjectName: subject.name
                                            });
                                          }}
                                          onOpenReviewModal={() => openReviewModal(topic.id)}
                                          renderCycleTooltip={renderCycleTooltip}
                                          startedTopicCta={startedTopicCta}
                                          statusLabel={statusLabel}
                                          statusVisual={statusVisual}
                                          studiedInCurrentCycle={studiedInCurrentCycle}
                                          topic={topic}
                                        />
                                      );
                                  })}
                      </div>
                    </CycleSubjectCard>
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
                className="inline-flex w-fit max-w-full min-w-0 scroll-mt-20 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-title-section transition-colors hover:text-primary"
              >
                <Shield size={17} className="shrink-0 text-primary" />
                <span className="app-type-section-title min-w-0 truncate">
                  Painel estratégico do edital
                </span>
              </a>
              <div className="hidden h-11 xl:block" aria-hidden="true" />
            </div>
            <a
              ref={strategicDockRef}
              href="#strategic-cycle-panel"
              aria-hidden={!isStrategicDockVisible}
              tabIndex={isStrategicDockVisible ? 0 : -1}
              onClick={(event) => {
                event.preventDefault();
                strategicPanelTitleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={{ left: strategicDockLayout.left, width: strategicDockLayout.width }}
              className={`fixed bottom-3 z-40 inline-flex min-w-0 items-center gap-2 rounded-lg border app-hairline bg-surface/60 px-2 py-1.5 text-primary shadow-lg shadow-primary/5 backdrop-blur-md transition-[opacity,transform,background-color] duration-150 ease-out hover:bg-surface/75 ${
                isStrategicDockVisible
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-1 opacity-0'
              }`}
            >
              <Shield size={17} className="shrink-0 text-primary" />
              <span className="app-type-section-title min-w-0 truncate">
                Painel estratégico do edital
              </span>
            </a>
            <StrategicEditalPanel
              cycleDisplayName={cycleDisplayName}
              cycleEventInsights={cycleEventInsights}
              cycleMaturity={cycleMaturity}
              cycleTransitionSummary={cycleTransitionSummary}
              cycleVisualStats={cycleVisualStats}
              editaisNoCiclo={editaisNoCiclo}
              getUnifiedSubjectName={getUnifiedSubjectName}
              handleApplySuggestedQueueOrder={handleApplySuggestedQueueOrder}
              handleStrategicAlertAction={handleStrategicAlertAction}
              isResettingCycle={isResettingCycle}
              localSubjects={localSubjects}
              queueSuggestion={queueSuggestion}
              renderCycleTooltip={renderCycleTooltip}
              setResetCycleConfirmOpen={setResetCycleConfirmOpen}
              strategicAlerts={strategicAlerts}
              strategicPanelRef={strategicPanelRef}
              strategicPanelStats={strategicPanelStats}
              userCycle={userCycle}
            />
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
                  Isso vai zerar o ciclo atual, limpar as marcações deste ciclo e voltar a contagem para o Ciclo 1. Matérias concluídas no edital continuam fechadas; matérias fechadas só por primeiro contato voltam para a fila.
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

          <AlertDialog 
            open={unloadConfirm.isOpen} 
            onOpenChange={(open) => {
              if (!open && unloadingEditalId !== unloadConfirm.editalId) {
                setUnloadConfirm(prev => ({ ...prev, isOpen: false }));
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover edital do ciclo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover o edital <strong>"{unloadConfirm.editalName}"</strong> do seu ciclo de estudos?
                  <br /><br />
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-sm text-primary">
                    <p><strong>Informação importante:</strong> seu progresso, sessões de estudo e histórico de revisões serão preservados.</p>
                    <p className="mt-1">As revisões ficam pausadas fora do ciclo e serão retomadas quando você carregar este edital novamente.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={unloadingEditalId === unloadConfirm.editalId}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async (e) => {
                    e.preventDefault();
                    if (unloadConfirm.editalId) {
                      const removed = await handleUnloadCycle(
                        unloadConfirm.editalId,
                        unloadConfirm.editalName || '',
                      );
                      if (removed) {
                        setUnloadConfirm(prev => ({ ...prev, isOpen: false }));
                      }
                    }
                  }}
                  disabled={unloadingEditalId === unloadConfirm.editalId}
                  className="app-button-warning flex items-center justify-center gap-2"
                >
                  {unloadingEditalId === unloadConfirm.editalId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2Off className="w-4 h-4" />
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
            onImport={handleImportSubjects}
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
            strategicIncidenceLabel={difficultyModalData.strategicIncidenceLabel}
            strategicIncidenceDescription={difficultyModalData.strategicIncidenceDescription}
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
                } catch (error: unknown) {
                  console.error('Erro ao desfazer mesclagem:', error);
                  toastGate.notifyError(
                    'Erro ao desfazer mesclagem',
                    error instanceof Error ? error.message : 'Erro desconhecido'
                  );
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
