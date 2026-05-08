import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Trash2, Edit, Edit2, ChevronDown, Check, X, CheckSquare, Square, Search, GripVertical, FileText, Settings, Merge, Database, FolderUp, Loader2, Sparkles, AlertCircle, Copy, CheckCircle2, GraduationCap, Clock, RefreshCw, BarChart2, Zap, ArrowRight, Bookmark, MoveUp, Shield, Layers, FileDown, ScanText, Filter, Play, Wand2, BookOpen, Link2Off, RotateCcw, ListTodo } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { performGlobalCleanup, repairOrphanedSubjects } from "@/services/dataIntegrityService";
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate'; // Added
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { Subject, Topic, Status, UserEdital } from '@/types';
import type { UserEdital as EditalModalData } from '@/pages/Editais';
import { getTopicStatusInfo } from '@/utils/topicStatus';
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

import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';
import { errorService } from '@/lib/errors/errorService';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';

import { useMergeData } from '@/hooks/useMergeData';
import { fetchTopicReviewStats } from '@/services/topicReviewService';
import { useTopicReview } from '@/hooks/useTopicReview';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import { DifficultyBarsCompact } from '@/components/ui/difficulty-rating';

type SubjectTab = 'all' | 'vertical';
type SubjectVisualTag = 'Não Estudada' | 'Em Estudo' | 'Em Revisão' | 'Concluída';

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

const calculateSubjectStatus = (subject: Subject): Status => {
  if (subject.topics.length === 0) return 'Nova';
  if (subject.topics.every(isTopicCompleted)) return 'Concluída';
  if (subject.topics.some(isTopicStarted)) return 'Em Estudo';
  return 'Nova';
};

const getSubjectVisualTag = (subject: Subject): SubjectVisualTag => {
  if (subject.topics.length === 0) return 'Não Estudada';
  if (subject.topics.every(isTopicCompleted)) return 'Concluída';
  if (subject.topics.every(isTopicStarted)) return 'Em Revisão';
  if (subject.topics.some(isTopicStarted)) return 'Em Estudo';
  return 'Não Estudada';
};


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
  const { openReviewModal, difficultyModalData, closeDifficultyModal, markTopicAsReviewed } = useTopicReview();
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
      const { data } = await supabase
        .from('subjects')
        .select(`*, topics(*, difficulty_level)`)
        .eq('user_id', user.id)
        .order('priority', { ascending: true })
        .order('created_at', { foreignTable: 'topics', ascending: true });

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

  // Fetch topic stats separately after subjects load to colorize review affordances.
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
      const { data: existingCycle } = await supabase
        .from('user_cycles')
        .select('id, ciclo_atual')
        .eq('user_id', user.id)
        .single();

      if (existingCycle) {
        const currentIds = (existingCycle.ciclo_atual as string[]) || [];
        const newIds = currentIds.filter(id => !subjectIds.includes(id));
        const resetCycleFields = {
          materias_estudadas_ciclo: [],
          ciclos_realizados: 0,
          data_inicio_ciclo: new Date().toISOString(),
          data_fim_ciclo: null,
          atualizado_em: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('user_cycles')
          .update({
            ciclo_atual: newIds,
            ...resetCycleFields,
          })
          .eq('user_id', user.id);

        if (error) throw error;

        const nextUserCycle = userCycle
          ? { ...userCycle, ciclo_atual: newIds, ...resetCycleFields }
          : null;
        if (newIds.length > 0 && nextUserCycle) {
          setUserCycle(nextUserCycle);
          localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(nextUserCycle));
        } else {
          setUserCycle(null);
          localStorage.removeItem(`user_cycle_cache_${user.id}`);
        }

        // NOVO: Resetar progresso dos tópicos relacionados ao descarregar do ciclo
        if (subjectIds.length > 0) {
          const { error: resetError } = await supabase
            .from('topics')
            .update({
              next_review: null,
              review_count: 0,
              review_stage: null,
              completed: false,
              first_studied_at: null,
              last_reviewed_at: null,
              stability: 0,
              review_history: []
            })
            .in('subject_id', subjectIds);
          
          if (resetError) {
            console.error('Erro ao resetar progresso dos tópicos:', resetError);
          }

          // Também limpa o histórico detalhado para garantir integridade na página de Revisões
          const { data: topicData } = await supabase.from('topics').select('id').in('subject_id', subjectIds);
          const topicIds = topicData?.map(t => t.id) || [];
          
          if (topicIds.length > 0) {
            await supabase
              .from('topic_review_history')
              .delete()
              .in('topic_id', topicIds);
          }
        }
      }

      const { error: editalErr } = await (supabase as any)
        .from('user_editais')
        .update({ merged_into_cycle: false, active_subject_ids: [] })
        .eq('id', editalId);

      if (editalErr) throw editalErr;

      toast.success(`"${editalName}" removido do ciclo. Giro reiniciado.`);
      window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
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
  // Confirmação inline de exclusão de matéria
  const [confirmHideSubjectId, setConfirmHideSubjectId] = useState<string | null>(null);

  // Relações de matérias mescladas: { "materiaPrincipalId": ["materia1Id", "materia2Id"] }
  const [mergedSubjectsMap, setMergedSubjectsMap] = useState<Record<string, string[]>>({});

  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([]);
  const [expandedCompletedSubjectIds, setExpandedCompletedSubjectIds] = useState<string[]>([]);
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
      const { data, error } = await (supabase as any)
        .from('user_cycles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

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
        await Promise.all([
          loadSubjects(), 
          loadUserCycle(),
          repairOrphanedSubjects(user.id)
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
    // Recolhe todos os tópicos expandidos ao iniciar o drag
    setExpandedSubjectIds([]);
  };

  const handleMarcarMateriaComoEstudada = useCallback(async (materiaId: string) => {
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
  }, [dynamicUnificationMap, getUnifiedSubjectName, localSubjects, user, userCycle]);

  const handleIniciarProximoCiclo = useCallback(async () => {
    if (!user || !userCycle) return;

    const previousUserCycle = userCycle;
    const nextCycle = {
      ...userCycle,
      materias_estudadas_ciclo: [],
      ciclos_realizados: (userCycle.ciclos_realizados || 0) + 1,
      data_inicio_ciclo: new Date().toISOString(),
      data_fim_ciclo: null,
      atualizado_em: new Date().toISOString(),
    };

    setIsStartingNextCycle(true);
    setUserCycle(nextCycle);
    localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(nextCycle));

    try {
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
          userMessage: 'Erro ao iniciar o próximo ciclo.',
          severity: 'high',
          scope: 'core',
          userId: user.id,
        }
      );
    } finally {
      setIsStartingNextCycle(false);
    }
  }, [user, userCycle]);

  const handleVoltarMateriaParaFila = useCallback(async (materiaId: string) => {
    if (!user || !userCycle) return;

    const rawSubjectId = (userCycle.ciclo_atual || []).find((id: string) =>
      getUnifiedSubjectId(id, dynamicUnificationMap) === materiaId
    ) || materiaId;

    const currentStudied = userCycle.materias_estudadas_ciclo || [];
    if (!currentStudied.includes(rawSubjectId)) return;

    const previousUserCycle = userCycle;
    const updatedCycle = {
      ...userCycle,
      materias_estudadas_ciclo: currentStudied.filter((id: string) => id !== rawSubjectId),
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
  }, [dynamicUnificationMap, getUnifiedSubjectName, localSubjects, user, userCycle]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    if (active.id === over.id) {
      return;
    }

    const sortableList = activeTab === 'all' ? pendingCycleList : expandedSubjectList;
    const oldIndex = sortableList.findIndex((item) => item.id === active.id);
    const newIndex = sortableList.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortableList, oldIndex, newIndex);
    const reorderedIds = reordered.map(item => item.subject.id);
    const studiedRawIds = userCycle?.materias_estudadas_ciclo || [];
    const studiedSet = new Set(studiedRawIds.map((id: string) => getUnifiedSubjectId(id, dynamicUnificationMap)));
    const studiedCycleIdsInOrder = (userCycle?.ciclo_atual || []).filter((id: string) =>
      studiedSet.has(getUnifiedSubjectId(id, dynamicUnificationMap))
    );

    // Optimistic Update: Atualizar visualmente agora
    const newCicloAtual = activeTab === 'all'
      ? [...reorderedIds, ...studiedCycleIdsInOrder]
      : reorderedIds;
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

  const toggleCompletedExpand = (itemId: string) => {
    setExpandedCompletedSubjectIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
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

  const studiedCycleIdSet = useMemo(() => {
    const studiedIds = userCycle?.materias_estudadas_ciclo || [];
    return new Set(studiedIds.map((id: string) => getUnifiedSubjectId(id, dynamicUnificationMap)));
  }, [userCycle?.materias_estudadas_ciclo, dynamicUnificationMap]);

  const pendingCycleList = useMemo(() => (
    filteredList.filter(item => !studiedCycleIdSet.has(item.subject.id))
  ), [filteredList, studiedCycleIdSet]);

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
    const sourceList = activeTab === 'all' ? pendingCycleList : filteredList;
    return sourceList.slice(0, visibleCount);
  }, [activeTab, filteredList, pendingCycleList, visibleCount]);

  const totalDisplayItems = activeTab === 'all' ? pendingCycleList.length : filteredList.length;
  const hasMore = totalDisplayItems > visibleCount;
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

  if (isLoading || isOriginsLoading || loading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const getVerticalTopicStatus = (topic: Topic) => {
    if (topic.is_active === false) {
      return {
        label: 'Inativo',
        className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      };
    }

    if (isTopicCompleted(topic)) {
      return {
        label: 'Concluído',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      };
    }

    const statusInfo = getTopicStatusInfo(topic);
    if (statusInfo.type !== 'novo') {
      return {
        label: statusInfo.label,
        className: statusInfo.colorClass.replace(/\s*border-\S+/g, ''),
      };
    }

    return {
      label: 'Não estudado',
      className: 'bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-300',
    };
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
            <div className="sticky top-0 z-10 bg-background flex items-center gap-3 px-4 py-2 border-b border-primary/10">
              <span className="text-xs font-black uppercase tracking-widest text-primary/80">
                {getUnifiedSubjectName(subject.id, subject.name)}
              </span>
              <span className="text-[10px] text-content-muted font-semibold tabular-nums">
                {topics.length} tópico{topics.length !== 1 ? 's' : ''}
              </span>
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
                const reviewCount = Math.max(topic.reviewCount || 0, topic.review_count || 0, topicStats.get(topic.id)?.reviewCount || 0);
                const hardCount = topicStats.get(topic.id)?.hardReviewCount || 0;
                const showHardAlert = reviewCount > 0 && hardCount > 0 && (hardCount >= 2 || hardCount / reviewCount >= 0.4);
                const status = getVerticalTopicStatus(topic);
                const hasStarted = reviewCount > 0 || isTopicStarted(topic);
                const hasNotes = Boolean(
                  (typeof topic.notes === 'string' ? topic.notes : topic.notes?.content)?.trim() &&
                  (typeof topic.notes === 'string' ? topic.notes : topic.notes?.content) !== '<p><br></p>'
                );

                return (
                  <div
                    key={topic.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-border/40 dark:border-white/5 last:border-b-0 hover:bg-accent/50 dark:hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm break-words leading-snug ${isTopicCompleted(topic) ? 'text-content-muted line-through decoration-content-muted/40' : topic.is_active === false ? 'text-content-muted opacity-50' : 'text-foreground'}`}>
                        {topic.name} {topic.is_active === false && <span className="text-[9px] ml-1 uppercase opacity-60">(inativo)</span>}
                      </span>
                    </div>

                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${status.className}`}>
                      {status.label}
                    </span>

                    <div
                      className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold tabular-nums ${showHardAlert ? 'text-orange-400' : 'text-content-muted'}`}
                      title={showHardAlert ? 'Muitas revisões com dificuldade alta' : 'Total de revisões'}
                    >
                      <RotateCcw size={11} className={showHardAlert ? 'text-orange-400' : 'text-content-muted'} />
                      <span>{reviewCount}</span>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenVerticalTopicNotes(subject.id, topic.id)}
                        className={`p-1 rounded transition-colors ${hasNotes ? 'text-primary/60 hover:text-primary' : 'text-gray-400 hover:text-primary/70'}`}
                        aria-label={`Anotações para ${topic.name}`}
                        title={`Anotações para ${topic.name}`}
                      >
                        <FileText size={15} />
                      </button>

                      {hasStarted ? (
                        <button
                          onClick={() => navigate(`/revisoes?topicId=${topic.id}`)}
                          className="w-6 h-6 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary transition-all border border-primary/30"
                          title="Ir para revisões"
                          aria-label={`Ir para revisões do tópico ${topic.name}`}
                        >
                          <ArrowRight size={12} />
                        </button>
                      ) : (
                        <button
                          onClick={() => openReviewModal(topic.id)}
                          className="w-6 h-6 rounded-full border border-primary/45 bg-primary/12 hover:bg-primary/25 text-primary transition-all flex items-center justify-center"
                          title="Iniciar estudo do tópico"
                          aria-label={`Iniciar estudo do tópico ${topic.name}`}
                        >
                          <Play size={10} className="ml-[1px]" />
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

  const renderCycleVisualPanel = () => {
    const rhythmWidth = Math.min(cycleVisualStats.subjectsPerDay * 30, 100);
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
      <section className="w-full" aria-label="Estatísticas do ciclo">
        <Sheet>
          <div className="w-full rounded-2xl border border-border bg-card dark:bg-zinc-900 shadow-sm px-3 sm:px-4 py-3 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                <RotateCcw size={17} className="text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-primary/80">
                    Ciclo de Estudos
                  </p>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Giro #{(userCycle?.ciclos_realizados || 0) + 1}
                  </span>
                </div>
                <p className="text-[11px] text-content-muted font-semibold truncate mt-0.5">
                  {cycleVisualStats.studiedSubjects} estudadas / {cycleVisualStats.remainingSubjects} restantes
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-2 min-w-0">
              <div className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2 min-w-0 md:min-w-[112px]">
                <p className="text-[9px] font-black uppercase text-content-muted truncate">Estudadas</p>
                <p className="text-sm font-black text-foreground">{cycleVisualStats.studiedSubjects}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2 min-w-0 md:min-w-[112px]">
                <p className="text-[9px] font-black uppercase text-content-muted truncate">Na fila</p>
                <p className="text-sm font-black text-foreground">{cycleVisualStats.remainingSubjects}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 px-3 py-2 min-w-0 md:min-w-[112px]">
                <p className="text-[9px] font-black uppercase text-content-muted truncate">Total</p>
                <p className="text-sm font-black text-foreground">{cycleVisualStats.totalSubjects}</p>
              </div>
            </div>

            <SheetTrigger asChild>
              <button className="h-10 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-black uppercase tracking-wider transition-colors shrink-0">
                Detalhes
              </button>
            </SheetTrigger>
          </div>

          <SheetContent side="right" className="w-full sm:max-w-xl bg-background dark:bg-zinc-950 border-border overflow-y-auto">
            <SheetHeader className="pr-8">
              <SheetTitle className="text-xl font-black tracking-tight">
                Detalhes do Ciclo
              </SheetTitle>
              <SheetDescription>
                Ritmo do giro atual.
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
                          Faltam aprox. <strong className="text-foreground">{cycleVisualStats.daysToFinish} dias</strong> para você bater este giro no ritmo atual.
                        </>
                      ) : cycleVisualStats.remainingSubjects === 0 ? (
                        'Este giro já está completo.'
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
      </section>
    );
  };

  const CompletedCycleDropColumn = () => {
    return (
      <aside className="hidden md:block min-w-0">
        <div className="sticky top-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <h3 className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400">
                Concluídas no Ciclo
              </h3>
              <span className="text-[10px] text-gray-400 dark:text-white/30">
                ({studiedCycleList.length})
              </span>
            </div>
            {pendingCycleList.length === 0 && studiedCycleList.length > 0 ? (
              <button
                onClick={handleIniciarProximoCiclo}
                disabled={isStartingNextCycle}
                className="flex h-7 items-center gap-1.5 rounded-md bg-emerald-500 px-2.5 text-[10px] font-semibold text-white transition-all hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                {isStartingNextCycle ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                Novo Ciclo
              </button>
            ) : null}
          </div>

          {studiedCycleList.length === 0 ? (
            <div className="rounded-xl border border-gray-200/70 dark:border-white/[0.06] bg-white dark:bg-card py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Check size={18} className="text-emerald-500" />
              </div>
              <p className="text-xs text-gray-400 dark:text-white/30 leading-relaxed">
                Nenhuma matéria marcada como estudada neste ciclo.
              </p>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto flex flex-col gap-1.5 pr-1">
              {studiedCycleList.map((item) => {
                const subjectName = getUnifiedSubjectName(item.subject.id, item.subject.name);
                const startedTopics = item.subject.topics.filter(isTopicStarted);
                const startedTopicsCount = startedTopics.length;
                const isExpanded = expandedCompletedSubjectIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className="group/completed rounded-lg border border-gray-200 dark:border-white/[0.04] bg-white dark:bg-card overflow-hidden transition-all hover:border-gray-300 dark:hover:border-white/[0.08]"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleCompletedExpand(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleCompletedExpand(item.id);
                        }
                      }}
                      className="h-[56px] flex items-center gap-2.5 pl-3 pr-4 py-0 cursor-pointer"
                      aria-expanded={isExpanded}
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Check size={12} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                      </div>
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const edital = editaisData.find(e => e.id === item.subject.edital_id);
                            if (edital) {
                              setSubjectsModal({ 
                                isOpen: true, 
                                edital: toEditalModalData(edital),
                                initialExpandedSubjectId: item.subject.id
                              });
                            }
                          }}
                          className="p-1 text-gray-300 dark:text-white/20 hover:text-primary transition-colors flex-shrink-0"
                          title="Gerenciar no Edital / Editar tópicos"
                        >
                          <Edit2 size={14} />
                        </button>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-gray-700 dark:text-white/85 truncate leading-tight">
                            {subjectName.charAt(0).toUpperCase() + subjectName.slice(1)}
                          </p>
                          <p className="text-[9px] text-gray-400 dark:text-white/30 mt-1">
                            {startedTopicsCount} tópico{startedTopicsCount === 1 ? '' : 's'} iniciado{startedTopicsCount === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        size={13}
                        className={`text-gray-300 dark:text-white/20 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVoltarMateriaParaFila(item.subject.id);
                        }}
                        className="ml-auto w-6 h-6 shrink-0 rounded-md border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-white/5 text-gray-300 dark:text-white/20 opacity-0 scale-90 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary group-hover/completed:opacity-100 group-hover/completed:scale-100 focus:opacity-100 focus:scale-100 flex items-center justify-center"
                        title="Voltar matéria para a fila do ciclo"
                        aria-label={`Voltar ${subjectName} para a fila do ciclo`}
                      >
                        <RotateCcw size={11} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-100 dark:border-white/[0.06]">
                        {startedTopics.length === 0 ? (
                          <p className="px-4 py-2 text-[10px] text-gray-400 dark:text-white/30">
                            Nenhum tópico iniciado.
                          </p>
                        ) : (
                          <div className="flex flex-col">
                            {startedTopics.map((topic, idx) => {
                              const completed = isTopicCompleted(topic);
                              const reviewCount = Math.max(topic.reviewCount || 0, topic.review_count || 0, topicStats.get(topic.id)?.reviewCount || 0);
                              const hardCount = topicStats.get(topic.id)?.hardReviewCount || 0;
                              const showHardAlert = reviewCount > 0 && hardCount > 0 && (hardCount >= 2 || hardCount / reviewCount >= 0.4);
                              const hasDifficultyData = reviewCount > 0 && typeof topic.difficulty_level === 'number';

                              return (
                                <div
                                  key={topic.id}
                                className={`h-8 flex items-center justify-between gap-2 pl-9 pr-4 py-0 group/completed-topic ${
                                    idx % 2 === 0
                                      ? 'bg-gray-50/50 dark:bg-white/[0.02]'
                                      : 'bg-white dark:bg-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-3">
                                    <div
                                      className={`h-5 w-1 rounded-full shrink-0 ${
                                        completed
                                          ? 'bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.25)]'
                                          : 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.25)]'
                                      }`}
                                    />
                                    <span className={`text-[11px] font-medium truncate ${completed ? 'text-content-muted opacity-50' : 'text-content-main'}`}>
                                      {topic.name.charAt(0).toUpperCase() + topic.name.slice(1)}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 shrink-0 relative min-w-[96px]">
                                    <span className={`text-[9px] font-black uppercase tracking-wider transition-all duration-300 group-hover/completed-topic:opacity-0 group-hover/completed-topic:pointer-events-none group-hover/completed-topic:translate-x-3 ${
                                      completed
                                        ? 'text-emerald-500'
                                        : 'text-orange-400 dark:text-orange-300'
                                    }`}>
                                      {completed ? 'Concluído' : 'Em revisão'}
                                    </span>
                                    <div
                                      className={`flex items-center gap-2 transition-all duration-300 group-hover/completed-topic:opacity-0 group-hover/completed-topic:pointer-events-none group-hover/completed-topic:translate-x-3 ${completed ? 'opacity-40' : 'opacity-100'}`}
                                      title={
                                        hasDifficultyData
                                          ? showHardAlert
                                            ? 'Muitas revisões com dificuldade alta'
                                            : 'Dificuldade e total de revisões'
                                          : 'Dificuldade ainda não informada'
                                      }
                                    >
                                        <DifficultyBarsCompact
                                          level={hasDifficultyData ? (topic.difficulty_level as 1 | 2 | 3) : null}
                                          size="sm"
                                          showEmpty
                                        />
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-content-muted/60 tabular-nums">
                                          <RotateCcw size={10} className={showHardAlert ? 'text-orange-400' : 'text-content-muted/40'} />
                                          <span className={showHardAlert ? 'text-orange-400' : ''}>{reviewCount}</span>
                                        </div>
                                    </div>
                                    {!completed && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/revisoes?topicId=${topic.id}`);
                                        }}
                                        className="absolute right-0 w-6 h-6 rounded-full flex items-center justify-center bg-transparent border border-transparent text-orange-400 hover:bg-orange-400/10 hover:border-orange-400/20 transition-all opacity-0 translate-x-2 pointer-events-none group-hover/completed-topic:opacity-100 group-hover/completed-topic:translate-x-0 group-hover/completed-topic:pointer-events-auto"
                                        title="Ir para revisões do tópico"
                                        aria-label={`Ir para revisões do tópico ${topic.name}`}
                                      >
                                        <ArrowRight size={12} />
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    );
  };

  const mainSubjectUI = (
    <div className="space-y-6 w-full">

      <div className="mb-5 relative z-20">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
          {/* Edital chips */}
          {(() => {
            const activeEditais = editaisNoCiclo.filter(e =>
              e.subject_ids.some(sid => localSubjects.find(s => s.id === sid))
            );
            if (activeEditais.length === 0 || isImportEditalModalOpen) return null;

            return (
              <div className="flex flex-wrap items-center gap-2 min-w-0 lg:max-w-[42%]">
                <div className="flex items-center gap-1.5 text-content-muted shrink-0">
                  <Database size={11} className="text-primary" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Edital:</span>
                </div>
                {activeEditais.map(edital => {
                  const displayLabel = (edital.organ || edital.name).toUpperCase();
                  return (
                    <div
                      key={edital.id}
                      className="group flex items-center gap-1 transition-all min-w-0"
                    >
                      <span
                        title={edital.name}
                        className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-1.5 py-0.5 rounded border text-primary/70 bg-primary/5 border-primary/15 max-w-[140px] truncate"
                      >
                        {displayLabel}
                      </span>
                      <button
                        onClick={() => setUnloadConfirm({
                          isOpen: true,
                          editalId: edital.id,
                          editalName: edital.name,
                          subjectIds: edital.subject_ids
                        })}
                        disabled={unloadingEditalId === edital.id}
                        className="w-3.5 h-3.5 flex items-center justify-center rounded hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        {unloadingEditalId === edital.id ? <Loader2 size={8} className="animate-spin" /> : <X size={8} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}

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
                          if (matchesSubject || hasMatchingTopic) {
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
                    title={activeTab === 'vertical' ? 'Voltar para a fila do ciclo' : 'Ver conteúdo verticalizado por edital'}
                    className={`h-10 px-3 rounded-xl border text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap inline-flex items-center gap-2 shrink-0 ${
                      activeTab === 'vertical'
                        ? 'bg-primary/10 border-primary/25 text-primary'
                        : 'bg-card dark:bg-zinc-900 border-border dark:border-white/10 text-content-muted hover:text-primary hover:border-primary/30'
                    }`}
                  >
                    <FileText size={14} />
                    {activeTab === 'vertical' ? 'Fila do ciclo' : 'Visualização edital'}
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
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2 min-w-0">
                <ListTodo size={14} className="text-primary shrink-0" />
                <h3 className="text-[15px] font-bold text-primary">
                  Fila do Ciclo
                </h3>
                <span className="text-[10px] text-gray-400 dark:text-white/30">
                  ({pendingCycleList.length})
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1 text-[10px] text-gray-400 dark:text-white/25 shrink-0">
                <GripVertical size={12} />
                Ordenar
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
                    Nenhuma matéria por aqui
                  </h3>
                  <p className="text-content-muted max-w-md mx-auto mb-8 leading-relaxed">
                    Comece adicionando sua primeira matéria ou importe um edital pronto para iniciar seus estudos.
                  </p>
                  <button
                    onClick={() => navigate('/meus-editais', { state: { filterCycle: true } })}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    Adicionar Matéria
                  </button>
                </>
              ) : activeTab === 'all' && pendingCycleList.length === 0 ? (
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
                        Todas as matérias pendentes deste giro foram marcadas como estudadas.
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
                      onClick={handleIniciarProximoCiclo}
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
                  <h3 className="text-lg font-bold text-foreground mb-2">Nenhuma matéria ativa</h3>
                  <p className="text-content-muted max-w-sm mx-auto mb-6">
                    Todas as matérias foram ocultadas ou o edital foi removido do ciclo. Ative matérias via
                    &ldquo;Matriz de Estudos&rdquo; ou carregue um edital no ciclo.
                  </p>
                  <button
                    onClick={() => navigate('/meus-editais')}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all"
                  >
                    Ativar Matérias
                  </button>
                </>
              )}
            </div>
          ) : (
            <SortableContext items={displayList.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className={activeTab === 'all' ? "flex flex-col gap-1.5" : "space-y-1.5"}>
                {displayList.map((item) => {
                  const { subject } = item;
                  const totalTopicsCount = subject.topics.length;
                  const completedTopicsCount = subject.topics.filter(isTopicCompleted).length;
                  const inReviewTopicsCount = subject.topics.filter(topic =>
                    isTopicStarted(topic) && !isTopicCompleted(topic)
                  ).length;
                  const noTopics = totalTopicsCount === 0;
                  const startedTopicsCount = inReviewTopicsCount + completedTopicsCount;
                  const topicStatusLabel = noTopics
                    ? 'Sem tópicos'
                    : startedTopicsCount === 0
                      ? 'Nenhum iniciado'
                      : inReviewTopicsCount === totalTopicsCount
                        ? 'Todos em revisão'
                        : startedTopicsCount === totalTopicsCount
                          ? 'Todos iniciados'
                          : `${startedTopicsCount}/${totalTopicsCount} iniciados`;

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
                                ? 'border-gray-200 dark:border-white/[0.08] shadow-sm'
                                : 'border-gray-100 dark:border-white/[0.04] hover:border-gray-200 dark:hover:border-white/[0.08]'
                            } bg-white dark:bg-card flex-1 min-w-0`}
                          >
                            {/* === HEADER DA MATÉRIA === */}
                            <div
                              data-subject-id={subject.id}
                              onClick={() => toggleExpand(item.id)}
                              className="h-[56px] pl-3 pr-4 py-0 flex items-center gap-2 group cursor-pointer relative transition-colors"
                          >
                              {/* Content area: text + progress */}
                              <div className="flex items-center gap-4 min-w-0 flex-1">
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
                                    className="p-1 text-gray-300 dark:text-white/20 hover:text-primary transition-colors flex-shrink-0"
                                    title="Gerenciar no Edital / Editar tópicos"
                                  >
                                    <Edit2 size={14} />
                                  </button>

                                  <div className="flex flex-col min-w-0 gap-0.5 flex-1">
                                    <h4 className="text-[13px] font-bold text-gray-700 dark:text-white/85 truncate leading-tight">
                                      {(() => { const n = getUnifiedSubjectName(subject.id, subject.name); return n.charAt(0).toUpperCase() + n.slice(1); })()}
                                    </h4>

                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-white/35 leading-none mt-1">
                                      <span className="flex items-center gap-0.5">
                                        <span className="text-[10px]">≡</span> {totalTopicsCount} Tópico{totalTopicsCount === 1 ? '' : 's'}
                                      </span>
                                      {!noTopics && (
                                        <>
                                          <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-white/20" aria-hidden="true" />
                                          <span className={inReviewTopicsCount === totalTopicsCount ? 'text-orange-400 dark:text-orange-300' : ''}>
                                            {topicStatusLabel}
                                          </span>
                                        </>
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarcarMateriaComoEstudada(subject.id);
                                    }}
                                    title="Marcar como estudada"
                                    aria-label={`Marcar ${getUnifiedSubjectName(subject.id, subject.name)} como estudada`}
                                    className="w-6 h-6 rounded-full border border-gray-200 dark:border-white/10 bg-transparent flex items-center justify-center shrink-0 text-gray-300 dark:text-white/25 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 group-hover:border-emerald-200/60 dark:group-hover:border-emerald-400/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200/60 dark:hover:border-emerald-400/70 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                                  >
                                    <Check size={12} strokeWidth={3} />
                                  </button>
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
                                    const reviewCount = Math.max(topic.reviewCount || 0, topic.review_count || 0, topicStats.get(topic.id)?.reviewCount || 0);
                                    const hasStarted = reviewCount > 0 || isTopicStarted(topic);
                                    const hardCount = topicStats.get(topic.id)?.hardReviewCount || 0;
                                    const showHardAlert = reviewCount > 0 && hardCount > 0 && (hardCount >= 2 || hardCount / reviewCount >= 0.4);
                                    const hasDifficultyData = reviewCount > 0 && typeof topic.difficulty_level === 'number';
                                    const statusState: 'empty' | 'dot' | 'check' =
                                      completed ? 'check' : hasStarted ? 'dot' : 'empty';
                                    const statusLabel =
                                      statusState === 'check' ? 'Tópico concluído' :
                                      statusState === 'dot' ? 'Tópico em estudo' :
                                      'Tópico não iniciado';

                                    return (
                                      <div
                                        key={topic.id}
                                        data-topic-item
                                        className={`h-8 flex items-center justify-between pl-9 pr-4 py-0 transition-colors group/topic relative cursor-default ${
                                          idx % 2 === 0
                                            ? 'bg-gray-50/50 dark:bg-white/[0.02]'
                                            : 'bg-white dark:bg-transparent'
                                        } ${
                                          !isActive ? 'opacity-40 grayscale-[0.5]' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
                                          <div
                                            className="flex-shrink-0 cursor-default select-none pointer-events-none"
                                            role="img"
                                            aria-label={statusLabel}
                                            title={`${statusLabel}. Use o botão de ação à direita para estudar ou revisar.`}
                                          >
                                            {statusState === 'empty' && (
                                              <div className="h-5 w-1 rounded-full bg-content-muted/25" />
                                            )}
                                            {statusState === 'dot' && (
                                              <div className="h-5 w-1 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.25)]" />
                                            )}
                                            {statusState === 'check' && (
                                              <div className="h-5 w-1 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.25)]" />
                                            )}
                                          </div>
                                          <span
                                            className={`text-[11px] font-medium truncate transition-opacity ${
                                              completed ? 'text-content-muted opacity-50' : !isActive ? 'text-content-muted opacity-40' : 'text-content-main'
                                            }`}
                                          >
                                            {topic.name.charAt(0).toUpperCase() + topic.name.slice(1)} {!isActive && <span className="text-[9px] ml-1 opacity-60">(inativo)</span>}
                                          </span>
                                        </div>

                                        <div className="flex items-center justify-end gap-1 relative min-w-[100px]">
                                          <div className="flex items-center gap-1.5 transition-all duration-300 opacity-100 group-hover/topic:opacity-0 group-hover/topic:pointer-events-none group-hover/topic:translate-x-4 pr-1">
                                            {(() => {
                                              if (!isActive) {
                                                return (
                                                  <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-1.5 py-0.5 rounded border text-rose-500 bg-rose-500/10 border-rose-500/20">
                                                    NA LIXEIRA
                                                  </span>
                                                );
                                              }
                                              const statusInfo = getTopicStatusInfo(topic);
                                              if (statusInfo.type !== 'atrasado' && statusInfo.type !== 'hoje') {
                                                return null;
                                              }
                                              return (
                                                <span className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-1.5 py-0.5 rounded border ${statusInfo.colorClass}`}>
                                                  {statusInfo.label}
                                                </span>
                                              );
                                            })()}
                                          </div>

                                          {isActive && (
                                            <div className="absolute right-8 flex items-center gap-1 opacity-0 group-hover/topic:opacity-100 transition-all duration-300 translate-x-2 group-hover/topic:translate-x-0 pointer-events-none group-hover/topic:pointer-events-auto">
                                              {/* IA */}
                                              <button className="h-6 px-2 flex items-center gap-1 rounded bg-primary/5 text-primary/70 hover:bg-primary transition-all hover:text-white text-[9px] font-bold uppercase tracking-tight">
                                                <Wand2 size={10} /> IA
                                              </button>

                                              <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-2"></div>

                                              {/* Anotação */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedTopicForNotes({
                                                    id: topic.id,
                                                    name: topic.name,
                                                    subjectName: subject.name
                                                  });
                                                }}
                                                className={`p-1 transition-colors ${(typeof topic.notes === 'string' ? topic.notes : topic.notes?.content)?.trim() && (typeof topic.notes === 'string' ? topic.notes : topic.notes?.content) !== '<p><br></p>'
                                                  ? 'text-primary/50 hover:text-primary'
                                                  : 'text-gray-400 hover:text-primary/70'
                                                  }`}
                                                title={`Anotações para ${topic.name}`}
                                              >
                                                <FileText size={16} />
                                              </button>

                                              <div className="w-px h-4 bg-black/10 dark:bg-white/10 mx-2"></div>
                                            </div>
                                          )}
                                          {isActive && (
                                            <div
                                              className={`flex items-center gap-2 mr-2 transition-all duration-300 group-hover/topic:opacity-0 group-hover/topic:pointer-events-none group-hover/topic:translate-x-3 ${completed ? 'opacity-40' : ''}`}
                                              title={
                                                hasDifficultyData
                                                  ? showHardAlert
                                                    ? 'Muitas revisões com dificuldade alta'
                                                    : 'Dificuldade e total de revisões'
                                                  : 'Dificuldade ainda não informada'
                                              }
                                            >
                                              <DifficultyBarsCompact
                                                level={hasDifficultyData ? (topic.difficulty_level as 1 | 2 | 3) : null}
                                                size="sm"
                                                showEmpty
                                              />
                                              <div className="flex items-center gap-1 text-[10px] font-bold text-content-muted/60 tabular-nums">
                                                <RotateCcw size={10} className={showHardAlert ? "text-orange-400" : "text-content-muted/40"} />
                                                <span className={showHardAlert ? "text-orange-400" : ""}>{reviewCount}</span>
                                              </div>
                                            </div>
                                          )}
                                          {isActive && (
                                            <div className="flex-shrink-0">
                                              {hasStarted ? (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/revisoes?topicId=${topic.id}`);
                                                  }}
                                                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-transparent border border-transparent text-orange-400 hover:bg-orange-400/10 hover:border-orange-400/20 transition-all ml-0.5"
                                                  title="Ir para revisões do tópico"
                                                  aria-label={`Ir para revisões do tópico ${topic.name}`}
                                                >
                                                  <ArrowRight size={12} />
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openReviewModal(topic.id);
                                                  }}
                                                  className="flex-shrink-0 w-6 h-6 rounded-full border border-transparent bg-transparent hover:border-emerald-400/25 hover:bg-emerald-400/10 text-emerald-400 transition-all duration-300 flex items-center justify-center ml-0.5 group"
                                                  title="Iniciar estudo do tópico"
                                                  aria-label={`Iniciar estudo do tópico ${topic.name}`}
                                                >
                                                  <Play size={10} className="ml-[1px] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
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

        {activeTab === 'all' && <CompletedCycleDropColumn />}
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
          {!isImportEditalModalOpen && renderCycleVisualPanel()}

          <div className="flex-1 min-w-0 w-full">
            {!isImportEditalModalOpen && mainSubjectUI}
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
                  Isso vai zerar o giro atual, limpar as matérias marcadas como estudadas neste ciclo e voltar a contagem para o Giro #1.
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
                    <p><strong>Atenção:</strong> o giro atual será reiniciado e o histórico de revisões dos tópicos deste edital será apagado.</p>
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
            onSubmit={async (difficulty) => {
              try {
                await markTopicAsReviewed(difficultyModalData.topicId, difficulty);
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
              }
            }}
            onConfirmReview={async (difficulty, duration) => {
              try {
                await markTopicAsReviewed(difficultyModalData.topicId, difficulty, duration);
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
