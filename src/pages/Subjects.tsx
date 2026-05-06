import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit, ChevronDown, Check, X, CheckSquare, Square, Search, GripVertical, FileText, Settings, Merge, Database, FolderUp, Loader2, Sparkles, AlertCircle, Copy, CheckCircle2, Circle, GraduationCap, Clock, RefreshCw, BarChart2, Zap, ArrowRight, Bookmark, MoveUp, Shield, Layers, FileDown, ScanText, Filter, Play, Wand2, BookOpen, Link2Off, RotateCcw, ExternalLink } from 'lucide-react';
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
import { getTopicStatusInfo } from '@/utils/topicStatus';
import { supabase } from '@/integrations/supabase/client';
import { transformSubjectsData } from '@/contexts/utils/dataTransformers';
import { applyUnificationMap, getUnifiedSubjectId } from '@/services/cycleMergeService';
import { useAuth } from '@/contexts/AuthContext';
import TopicsModal from '@/components/topics/TopicsModal';
import ContentUploadModal from '@/components/ContentUploadModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import NotesModal from '@/components/reviews/NotesModal';
import { ImportEditalModal } from '@/components/subjects/ImportEditalModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { CreateTopicModal } from '@/components/topics/CreateTopicModal';

import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';
import { errorService } from '@/lib/errors/errorService';
import { useEditalOriginsWithMerge } from '@/hooks/useEditalOriginsWithMerge';

import { useMergeData } from '@/hooks/useMergeData';
import { SubjectSparkline } from '@/components/subjects/SubjectSparkline';
import { fetchTopicReviewStats } from '@/services/topicReviewService';
import { useTopicReview } from '@/hooks/useTopicReview';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';
import { DifficultyBarsCompact } from '@/components/ui/difficulty-rating';
import { useStudyCycleV2, CycleSubjectState } from '@/hooks/useStudyCycleV2';
import { CycleDashboardV2 } from '@/components/dashboard/CycleDashboardV2';

export type CycleV2Tag = 'Não Estudada' | 'Estudada Hoje' | 'Estudada' | 'Em Revisão';

const getCycleV2Tag = (subject: Subject, state: CycleSubjectState | undefined): CycleV2Tag => {
  if (subject.topics.length === 0) return 'Não Estudada';

  const allTopicsStarted = subject.topics.length > 0 && subject.topics.every(t => 
    t.completed || 
    t.first_studied_at || 
    t.firstStudiedAt || 
    (t.reviewCount && t.reviewCount > 0) || 
    ((t as any).review_count && (t as any).review_count > 0)
  );

  if (allTopicsStarted) return 'Em Revisão';

  if (state?.completed_in_current_rotation) {
    const today = new Date().toISOString().split('T')[0];
    if (state.last_studied_date === today) return 'Estudada Hoje';
    return 'Estudada';
  }

  return 'Não Estudada';
};

const calculateSubjectStatus = (subject: Subject): Status => {
  if (subject.topics.length === 0) {
    return 'Nova';
  }

  // Agora "Concluída" exige que todos os tópicos tenham completado o ciclo SRS
  const allTopicsSRSCompleted = subject.topics.every(topic =>
    topic.completed === true || topic.reviewStage === 'Concluído'
  );

  if (allTopicsSRSCompleted) {
    return 'Concluída';
  }

  // Consideramos "Em Estudo" se pelo menos um tópico foi iniciado
  const hasStartedTopics = subject.topics.some(topic =>
    (topic.reviewCount > 0 || topic.review_count > 0) ||
    (topic.reviewStage && topic.reviewStage !== '') ||
    (topic.nextReview !== undefined && topic.nextReview !== null) ||
    topic.completed === true ||
    topic.firstStudiedAt || topic.first_studied_at
  );

  if (hasStartedTopics) {
    return 'Em Estudo';
  }

  return 'Nova';
};

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Nova': return 'bg-secondary text-content-muted border-border';
    case 'Em Estudo': return 'bg-primary/10 text-primary border-primary/20';
    case 'Concluída': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    default: return 'bg-secondary text-content-muted border-border';
  }
};

const getStatusBorderColor = (status: Status) => {
  switch (status) {
    case 'Nova': return 'border-l-slate-300';
    case 'Em Estudo': return 'border-l-blue-500';
    case 'Concluída': return 'border-l-green-500';
    default: return 'border-l-slate-300';
  }
};



const Subjects = () => {
  const { user } = useAuth();
  const { originsMap, editaisData, editaisNoCiclo, activeSubjectIdsSet, getOriginsForSubject, refresh, isLoading: isOriginsLoading } = useEditalOriginsWithMerge();
  const { getUnifiedSubjectName, isSubjectMerged, getSubjectOrigins, revertSubjectMerge, getSubjectMergeInfo, dynamicUnificationMap } = useMergeData();
  const { activeCycle, activeRotation, subjectStates, fetchActiveCycleData, markSubjectAsStudied, finishCurrentRotation, initializeCycle } = useStudyCycleV2();
  const navigate = useNavigate();
  // Estado local simples - sem contextos
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [topicStats, setTopicStats] = useState<Map<string, { reviewCount: number; hardReviewCount: number }>>(new Map());

  // Novos modais V2 states
  const [visibleCount, setVisibleCount] = useState(25);
  const ITEMS_PER_PAGE = 25;
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedSubjectForNotes, setSelectedSubjectForNotes] = useState<Subject | null>(null);
  const [selectedTopicForNotes, setSelectedTopicForNotes] = useState<{id: string, name: string, subjectName: string} | null>(null);

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

  const location = useLocation();

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

  // Fetch topic stats separately after subjects load to colorize the review count icons
  useEffect(() => {
    const allTopicIds = subjects.flatMap(s => s.topics.map(t => t.id));
    if (allTopicIds.length === 0) {
      setTopicStats(new Map());
      return;
    }
    fetchTopicReviewStats(allTopicIds).then(setTopicStats);
  }, [subjects]);

  const refreshData = useCallback(async () => {
    if (user) {
      localStorage.removeItem(`subjects_${user.id}`);
      localStorage.removeItem(`subjects_${user.id} `); // limpa chave antiga com espaço por segurança
      await loadSubjects();
      refresh(); // Atualiza origens do hook
      window.dispatchEvent(new CustomEvent('subjectUpdated', { detail: { source: 'Subjects' } }));
    }
  }, [user, loadSubjects, refresh]);

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

        const { error } = await supabase
          .from('user_cycles')
          .update({
            ciclo_atual: newIds,
            atualizado_em: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;

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

      toast.success(`"${editalName}" removido do seu ciclo.`);
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

  // Filter Tabs State
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed'>('all');

  // Estado para o modal de tópicos
  const [topicsModal, setTopicsModal] = useState<{
    isOpen: boolean;
    subject: Subject | null;
  }>({ isOpen: false, subject: null });

  // Estado para o modal de upload de conteúdo
  const [contentUploadModal, setContentUploadModal] = useState(false);


  // Estado para o modal de anotações de matéria
  const [subjectNotesModal, setSubjectNotesModal] = useState<{
    isOpen: boolean;
    subjectId: string;
    subjectName: string;
  }>({
    isOpen: false,
    subjectId: '',
    subjectName: ''
  });
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

  // Carregar dados apenas uma vez por usuário
  useEffect(() => {
    if (user?.id) {
      (async () => {
        // Garantir que carregamos tudo na primeira montagem
        await Promise.all([
          loadSubjects(), 
          loadUserCycle(),
          fetchActiveCycleData(),
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = expandedSubjectList.findIndex((item) => item.id === active.id);
    const newIndex = expandedSubjectList.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(expandedSubjectList, oldIndex, newIndex);

    // Optimistic Update: Atualizar visualmente agora
    const newCicloAtual = reordered.map(item => item.subject.id);
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
        localStorage.setItem(`user_cycle_cache_${user.id} `, JSON.stringify(newUserCycle));
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
        localStorage.setItem(`user_cycle_cache_${user.id} `, JSON.stringify(previousUserCycle));
      }
    }
  };

  // Helper para determinar a cor do ícone do tópico
  const getTopicIconClass = (topic: Topic) => {
    // 1. Concluído (Verde)
    if (topic.completed || topic.reviewStage === 'Concluído') {
      return 'text-green-500';
    }

    // 2. Sem data de revisão (Cinza)
    if (!topic.nextReview) {
      return 'text-slate-300 group-hover/topic:text-indigo-400';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(topic.nextReview);
    reviewDate.setHours(0, 0, 0, 0);

    // 3. Atrasado (Vermelho)
    if (reviewDate < today) {
      return 'text-red-500';
    }

    // 4. Hoje (Laranja/Amarelo)
    if (reviewDate.getTime() === today.getTime()) {
      return 'text-orange-500';
    }

    // 5. Futuro (Azul)
    return 'text-blue-500';
  };

  // Progresso de Cobertura (Tópicos Iniciados)
  const getSubjectCoverage = (subject: Subject) => {
    if (subject.topics.length === 0) return 0;
    const started = subject.topics.filter(topic =>
      Boolean(topic.first_studied_at) || Boolean(topic.firstStudiedAt) || 
      (topic.reviewCount > 0 || topic.review_count > 0) || 
      topic.completed === true
    ).length;
    return Math.round((started / subject.topics.length) * 100);
  };

  // Progresso de Conclusão SRS (Tópicos Finalizados no Ciclo)
  const getSubjectCompletion = (subject: Subject) => {
    if (subject.topics.length === 0) return 0;
    const completed = subject.topics.filter(topic =>
      topic.completed === true || topic.reviewStage === 'Concluído' || topic.review_stage === 'Concluído'
    ).length;
    return Math.round((completed / subject.topics.length) * 100);
  };

  const handleViewTopics = (subject: Subject) => {
    navigate(`/ materias / ${subject.id}/topicos`);
  };

  const toggleExpand = (itemId: string) => {
    setExpandedSubjectIds(prev =>
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

    if (activeTab === 'in_progress') {
      list = list.filter(item => calculateSubjectStatus(item.subject) === 'Em Estudo');
    } else if (activeTab === 'completed') {
      list = list.filter(item => calculateSubjectStatus(item.subject) === 'Concluída');
    }

    return list;
  }, [expandedSubjectList, activeTab, newSubjectName, isImportEditalModalOpen]);

  // Lista para renderizar (com paginação - Lazy Loading)
  const displayList = useMemo(() => {
    return filteredList.slice(0, visibleCount);
  }, [filteredList, visibleCount]);

  const hasMore = filteredList.length > visibleCount;

  if (isLoading || isOriginsLoading || loading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  const mainSubjectUI = (
    <div className="space-y-6 w-full"> {/* Changed space-y-4 to 6 to match Topics */}

      {/* Unified Header Card - Visible when there are subjects or when inside the Modal */}
      {/* Refined Header - Final Polished Layout */}
      {(expandedSubjectList.length > 0 || isImportEditalModalOpen) && (
        <div className="flex flex-col gap-4 mb-8 relative z-20">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Left Zone: search + tabs + cycle info */}
            <div className="flex flex-col gap-3 flex-1 w-full max-w-full lg:max-w-2xl">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                {/* Search Input - Slightly Wider */}
                <div className="relative w-full sm:w-64 lg:w-96">
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

                {/* Tabs - Next to search */}
                {!isImportEditalModalOpen && (
                  <div className="flex items-center gap-1 bg-secondary/30 dark:bg-black/20 p-1 rounded-xl border border-border/50 dark:border-white/5 overflow-x-auto no-scrollbar shrink-0">
                    {(['all', 'in_progress', 'completed'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab
                          ? 'bg-card dark:bg-zinc-800 text-foreground shadow-sm'
                          : 'text-content-muted hover:text-foreground'
                          }`}
                      >
                        {tab === 'all' ? 'Todas' : tab === 'in_progress' ? 'Em Estudo' : 'Concluídas'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Cycle Chips - Below search/tabs (Font slightly larger) */}
              {(() => {
                const activeEditais = editaisNoCiclo.filter(e =>
                  e.subject_ids.some(sid => localSubjects.find(s => s.id === sid))
                );
                if (activeEditais.length === 0 || isImportEditalModalOpen) return null;
                
                return (
                  <div className="flex flex-wrap items-center gap-2 px-1 animate-in fade-in duration-500">
                    <div className="flex items-center gap-1.5 mr-1 text-content-muted">
                      <Database size={11} className="text-primary" />
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">Origem:</span>
                    </div>
                    {activeEditais.map(edital => {
                      // Usa organ (sigla) se disponível, senão o name completo
                      const displayLabel = (edital.organ || edital.name).toUpperCase();
                      return (
                        <div
                          key={edital.id}
                          className="group flex items-center gap-1 transition-all"
                        >
                          <span
                            title={edital.name}
                            className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap px-1.5 py-0.5 rounded border text-primary/70 bg-primary/5 border-primary/15"
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
                            className="w-3.5 h-3.5 flex items-center justify-center rounded hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            {unloadingEditalId === edital.id ? <Loader2 size={8} className="animate-spin" /> : <X size={8} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full">
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
              ) : activeTab !== 'all' ? (
                <>
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {activeTab === 'completed' ? 'Nenhuma matéria concluída' : 'Nenhuma matéria em estudo'}
                  </h3>
                  <p className="text-content-muted max-w-sm mx-auto mb-6">
                    {activeTab === 'completed'
                      ? 'Nenhuma matéria teve todos os tópicos finalizados no ciclo SRS ainda.'
                      : 'Nenhuma matéria iniciada no momento.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all"
                  >
                    Ver Todas
                  </button>
                </>
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
              <div className="space-y-3">
                {displayList.map((item, index) => {
                  const { subject } = item;
                  const calculatedStatus = calculateSubjectStatus(subject);
                  
                  // V2 Integration
                  const unifiedSubjectId = getUnifiedSubjectId(subject.id, dynamicUnificationMap);
                  const stateV2 = subjectStates.find(s => s.subject_id === unifiedSubjectId);
                  const tagV2 = getCycleV2Tag(subject, stateV2);

                  const isEditing = editingSubjectId === subject.id;
                  const position = index + 1;

                  return (
                    <SortableItem key={item.id} id={item.id}>
                      {({ listeners, attributes }) => (
                        <div className="w-full max-w-full mb-2" data-subject-item>
                          {/* Container unificado: header + tópicos no mesmo card */}
                          <div
                            className={`glow-card rounded-2xl overflow-hidden relative hover:border-primary/20 transition-all ${
                              expandedSubjectIds.includes(item.id) ? 'border-primary/30 shadow-primary/5' : ''
                            }`}
                          >
                            {/* === HEADER DA MATÉRIA === */}
                            <div
                              data-subject-id={subject.id}
                              onClick={() => toggleExpand(item.id)}
                              className="p-4 flex items-center justify-between group cursor-pointer relative transition-colors bg-background"
                          >
                            <div className="flex items-center gap-3">
                              {/* Action icon */}
                              <div
                                className="cursor-move text-primary/80 hover:text-primary transition-colors p-1 -ml-2"
                                onClick={(e) => e.stopPropagation()}
                                {...listeners}
                                {...attributes}
                              >
                                <GripVertical size={16} />
                              </div>



                              <div className="flex flex-col min-w-0">
                                  <div className="flex flex-col items-start gap-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* Link Externo para Gerenciar no Edital */}
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate('/meus-editais', { 
                                                  state: { 
                                                    openEditalId: subject.edital_id, 
                                                    highlightSubjectId: subject.id 
                                                  } 
                                                });
                                              }}
                                              className="p-1 hover:bg-primary/10 rounded transition-colors text-primary/80 hover:text-primary"
                                            >
                                              <ExternalLink size={13} strokeWidth={2.5} />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-[10px] font-bold">Gerenciar no Edital / Editar tópicos</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <h4
                                        className="text-xs font-black uppercase tracking-widest text-primary/80 truncate max-w-[200px] sm:max-w-xs flex items-center gap-2"
                                      >
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await markSubjectAsStudied(unifiedSubjectId);
                                          }}
                                          className="flex-shrink-0 transition-colors"
                                          title={tagV2 === 'Estudada Hoje' ? "Já estudada hoje" : "Marcar como Estudada Hoje"}
                                          disabled={tagV2 === 'Estudada Hoje'}
                                        >
                                          {tagV2 === 'Estudada Hoje' ? (
                                            <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={2.5} />
                                          ) : (
                                            <Circle size={16} strokeWidth={2.5} className={tagV2 === 'Estudada' ? "text-primary/50" : "text-content-muted/40 hover:text-emerald-500"} />
                                          )}
                                        </button>
                                        {getUnifiedSubjectName(subject.id, subject.name).toUpperCase()}
                                      </h4>

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
                                          className="p-1 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors text-orange-500"
                                        >
                                          <Link2Off size={14} />
                                        </button>
                                      )}
                                      {tagV2 === 'Estudada Hoje' && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-900/30 text-emerald-400 border-emerald-800 tracking-wider">
                                          ESTUDADA HOJE
                                        </Badge>
                                      )}
                                      {tagV2 === 'Estudada' && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-gray-800 text-gray-300 border-gray-700 tracking-wider">
                                          ESTUDADA
                                        </Badge>
                                      )}
                                      {tagV2 === 'Em Revisão' && (
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-orange-900/30 text-orange-400 border-orange-800 tracking-wider">
                                          EM REVISÃO
                                        </Badge>
                                      )}
                                      <span className="text-[10px] text-content-muted font-semibold tabular-nums">
                                        {subject.topics.length} {subject.topics.length === 1 ? 'tópico' : 'tópicos'}
                                      </span>


                                    </div>

                                  </div>
                              </div>

                            </div>

                            <div className="flex items-center gap-2">
                              {/* Sparkline de tendência — mini gráfico ao lado do círculo */}
                              <SubjectSparkline subjectId={subject.id} />

                              {/* Progress Dual Ring — Cobertura e Conclusão SRS */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="hidden sm:flex items-center justify-center relative w-11 h-11 rounded-full bg-secondary/50 dark:bg-deep-slate border border-border dark:border-white/5 mr-2 cursor-help transition-all hover:scale-105 active:scale-95">
                                      <svg className="w-full h-full -rotate-90 transform p-0.5" viewBox="0 0 100 100" shapeRendering="geometricPrecision">
                                        {/* Background Circles */}
                                        <circle className="text-black/5 dark:text-white/5" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                                        <circle className="text-black/5 dark:text-white/5" strokeWidth="6" stroke="currentColor" fill="transparent" r="26" cx="50" cy="50" />
                                        
                                        {/* Outer Ring: Coverage (Sky) */}
                                        <circle
                                          className="text-sky-400 transition-all duration-1000 ease-out"
                                          strokeWidth="8"
                                          strokeDasharray={`${(getSubjectCoverage(subject) / 100) * 251.327}, 251.327`}
                                          strokeLinecap="round"
                                          stroke="currentColor"
                                          fill="transparent"
                                          r="40"
                                          cx="50"
                                          cy="50"
                                        />
                                        
                                        {/* Inner Ring: Completion (Emerald) */}
                                        <circle
                                          className="text-emerald-500 transition-all duration-1000 ease-out"
                                          strokeWidth="6"
                                          strokeDasharray={`${(getSubjectCompletion(subject) / 100) * 163.362}, 163.362`}
                                          strokeLinecap="round"
                                          stroke="currentColor"
                                          fill="transparent"
                                          r="26"
                                          cx="50"
                                          cy="50"
                                        />
                                      </svg>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="p-3 bg-background/95 backdrop-blur-md border-border shadow-2xl rounded-xl">
                                    <div className="space-y-1.5">
                                      <p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Detalhamento da Matéria</p>
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between gap-8">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-sky-400"></div>
                                            <span className="text-xs font-semibold">Tópicos Iniciados</span>
                                          </div>
                                          <span className="text-xs font-bold text-sky-400">{getSubjectCoverage(subject)}%</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-8">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-xs font-semibold">Círculos Concluídos (SRS)</span>
                                          </div>
                                          <span className="text-xs font-bold text-emerald-500">{getSubjectCompletion(subject)}%</span>
                                        </div>
                                      </div>
                                      <div className="pt-1.5 mt-1.5 border-t border-border/50">
                                        <p className="text-[10px] font-medium text-content-muted">Status: <span className="text-primary font-bold uppercase">{tagV2}</span></p>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {/* Ícones de ação — sempre visíveis */}
                              <div className="flex items-center gap-0.5 transition-opacity duration-300">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSubjectForNotes(subject);
                                    setIsNotesModalOpen(true);
                                  }}
                                  title="Anotações"
                                  className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-primary/80 hover:text-primary"
                                >
                                  <FileText size={14} />
                                </button>

                              </div>

                              <div className="w-px h-4 bg-black/5 dark:bg-white/5 mx-0.5"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(item.id);
                                }}
                                className={`p-1.5 hover:bg-primary/10 rounded-lg transition-all text-primary/80 hover:text-primary ${
                                  expandedSubjectIds.includes(item.id) ? 'rotate-180 text-primary' : ''
                                }`}
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          </div>

                            {/* === TÓPICOS (dentro do mesmo card) === */}
                            {expandedSubjectIds.includes(item.id) && (
                              <div
                                className="border-t border-border/50 dark:border-white/5"
                                onClick={(e) => e.stopPropagation()}
                              >

                              {subject.topics.length === 0 ? (
                                <div className="py-4 text-center text-[10px] text-content-muted uppercase font-bold tracking-widest">
                                  Nenhum tópico cadastrado
                                </div>
                              ) : (
                                <div className="flex flex-col py-1">
                                  {subject.topics.map((topic, idx) => {
                                    const isCompleted = topic.completed || topic.reviewStage === 'Concluído';
                                    const isActive = topic.is_active !== false;
                                    const iconClass = getTopicIconClass(topic);

                                    // Marcador visual read-only: a conclusão só acontece pelo fluxo iniciado no botão de ação.
                                    const reviewCount = Math.max(topic.reviewCount || 0, topicStats.get(topic.id)?.reviewCount || 0);
                                    const hasStarted = reviewCount > 0;
                                    const statusState: 'empty' | 'dot' | 'check' =
                                      isCompleted ? 'check' : hasStarted ? 'dot' : 'empty';
                                    const statusLabel =
                                      statusState === 'check' ? 'Tópico concluído' :
                                      statusState === 'dot' ? 'Tópico em estudo' :
                                      'Tópico não iniciado';

                                    return (
                                      <div
                                        key={topic.id}
                                        data-topic-item
                                        className={`flex items-center justify-between px-4 py-2.5 border-b border-border/40 dark:border-white/5 last:border-b-0 hover:bg-accent/50 dark:hover:bg-white/[0.03] transition-colors group/topic relative cursor-default ${
                                          !isActive ? 'opacity-40 grayscale-[0.5]' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">

                                          {/* Indicador de status read-only */}
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
                                              <div className="h-5 w-1 rounded-full bg-primary/70 shadow-[0_0_10px_rgba(59,130,246,0.25)]" />
                                            )}
                                            {statusState === 'check' && (
                                              <div className="h-5 w-1 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.25)]" />
                                            )}
                                          </div>

                                              <span
                                                className={`text-xs font-medium truncate transition-opacity ${
                                                  isCompleted ? 'text-content-muted opacity-50' : !isActive ? 'text-content-muted opacity-40' : 'text-content-main'
                                                }`}
                                              >
                                                {topic.name.charAt(0).toUpperCase() + topic.name.slice(1)} {!isActive && <span className="text-[9px] ml-1 opacity-60">(inativo)</span>}
                                              </span>
                                        </div>

                                        <div className="flex items-center justify-end gap-1 relative min-w-[100px]">
                                          {/* Badges (desaparecem no hover) */}
                                          <div className="flex items-center gap-1.5 transition-all duration-300 opacity-100 group-hover/topic:opacity-0 group-hover/topic:pointer-events-none group-hover/topic:translate-x-4 pr-1">
                                            
                                            {/* Badge de Status (ATRASADO/HOJE/NA LIXEIRA) */}
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

                                          {/* Botões de ação — deslizam da direita no hover, posicionados antes do stats */}
                                          {isActive && (
                                            <div className={`absolute ${hasStarted ? "right-[92px]" : "right-[36px]"} flex items-center gap-1 opacity-0 group-hover/topic:opacity-100 transition-all duration-300 translate-x-2 group-hover/topic:translate-x-0 pointer-events-none group-hover/topic:pointer-events-auto`}>
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

                                          {/* Stats (Difficulty & Reviews) */}
                                          {isActive && hasStarted && (() => {
                                            const stats = topicStats.get(topic.id);
                                            const currentLevel = (topic.difficulty_level || 2) as 1 | 2 | 3;
                                            const hardCount = stats?.hardReviewCount || 0;
                                            const showHardAlert = reviewCount > 0 && hardCount > 0 && (hardCount >= 2 || hardCount / reviewCount >= 0.4);
                                            const tooltipText = showHardAlert ? 'Muitas revisões com dificuldade alta' : 'Total de revisões';

                                            return (
                                              <div className={`flex items-center gap-2 mr-2 transition-opacity ${isCompleted ? 'opacity-40' : ''}`} title={tooltipText}>
                                                <DifficultyBarsCompact level={currentLevel} size="sm" />
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-content-muted/60 tabular-nums">
                                                  <RotateCcw size={10} className={showHardAlert ? "text-orange-400" : "text-content-muted/40"} />
                                                  <span className={showHardAlert ? "text-orange-400" : ""}>{reviewCount}</span>
                                                </div>
                                              </div>
                                            );
                                          })()}

                                          {/* Ação Principal: SEMPRE VISÍVEL — radio fixo no fluxo normal */}
                                          {isActive ? (
                                            <div className="flex-shrink-0">
                                              {(() => {
                                                const reviewCount = Math.max(topic.reviewCount || 0, topicStats.get(topic.id)?.reviewCount || 0);
                                                const hasStarted = reviewCount > 0;

                                                if (!hasStarted) {
                                                  return (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openReviewModal(topic.id);
                                                      }}
                                                      className="flex-shrink-0 w-7 h-7 rounded-full border border-primary/45 bg-primary/12 hover:border-primary/70 hover:bg-primary/25 hover:shadow-[0_0_14px_rgba(59,130,246,0.35)] text-primary transition-all duration-300 flex items-center justify-center ml-0.5 group"
                                                      title="Iniciar estudo do tópico"
                                                      aria-label={`Iniciar estudo do tópico ${topic.name}`}
                                                    >
                                                      <Play size={10} className="ml-[1px] opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                                    </button>
                                                  );
                                                } else {
                                                  return (
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/revisoes?topicId=${topic.id}`);
                                                      }}
                                                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30 transition-all shadow-sm border border-primary/30 dark:border-primary/40 ml-0.5"
                                                      title="Ir para revisões do tópico"
                                                      aria-label={`Ir para revisões do tópico ${topic.name}`}
                                                    >
                                                      <ArrowRight size={12} />
                                                    </button>
                                                  );
                                                }
                                              })()}
                                            </div>
                                          ) : (
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
                  Ver mais matérias ({filteredList.length - visibleCount} restantes)
                </span>
                <ChevronDown size={14} className="text-content-muted group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </DndContext>
    </div>
  );

  return (
    <div className="flex w-full text-slate-900 dark:text-slate-100 font-sans">
      <div className="flex-1 flex flex-col relative w-full">

        {/* Header Outside Card */}
        <main className="flex-1 px-4 md:px-8 pb-8 pt-0 flex flex-col xl:flex-row gap-8">
          <div className="flex-1 min-w-0">
            {!isImportEditalModalOpen && mainSubjectUI}
          </div>

          {!isImportEditalModalOpen && (
            <aside className="w-full xl:w-[30%] min-w-[320px] shrink-0">
              <div className="sticky top-6">
                <CycleDashboardV2
                  activeRotation={activeRotation}
                  subjectStates={subjectStates}
                  subjects={localSubjects}
                  onFinishRotation={finishCurrentRotation}
                  onInitializeCycle={initializeCycle}
                />
              </div>
            </aside>
          )}
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
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-400 text-sm">
                    <p><strong>Fique tranquilo:</strong> Seu histórico de estudo e revisões <strong>não será perdido</strong>.</p>
                    <p className="mt-1">Todo seu progresso ficará preservado no <strong>Histórico Total</strong> das páginas de Estatísticas e Dashboard.</p>
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

          {selectedSubjectForNotes && (
            <SubjectNotesModal
              isOpen={isNotesModalOpen}
              onClose={() => {
                setIsNotesModalOpen(false);
                setSelectedSubjectForNotes(null);
              }}
              subjectId={selectedSubjectForNotes.id}
              subjectName={getUnifiedSubjectName(selectedSubjectForNotes.id, selectedSubjectForNotes.name)}
            />
          )}

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
        </div>
      </div>
      <DifficultyRatingModal
        isOpen={difficultyModalData.isOpen}
        onClose={closeDifficultyModal}
        topicName={difficultyModalData.topicName}
        subjectName={difficultyModalData.subjectName}
        initialDifficulty={difficultyModalData.currentDifficulty}
        reviewStage={difficultyModalData.reviewStage}
        reviewCount={difficultyModalData.reviewCount}
        onSubmit={() => {}}
        onConfirmReview={(difficulty) => {
          markTopicAsReviewed(difficultyModalData.topicId, difficulty);
          closeDifficultyModal();
        }}
      />
    </div>
  );
};

export default Subjects;
