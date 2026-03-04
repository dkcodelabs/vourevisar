import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import {
  Trash2,
  CheckCircle2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  NotebookPen,
  Copy,
  Trash,
  Loader2,
  Search,
  LayoutGrid,
  List,
  Check,
  X,
  Circle,
  Edit2, // Added
  AlertCircle, // Added
  Clock, // Added
  CalendarDays, // Added
  MoreHorizontal // Added
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate'; // Added
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { Subject, Topic, Status } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { transformSubjectsData } from '@/contexts/utils/dataTransformers';
import { useAuth } from '@/contexts/AuthContext';
import TopicsModal from '@/components/topics/TopicsModal';
import ContentUploadModal from '@/components/ContentUploadModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import { useCycleViewManagement } from '@/hooks/useCycleViewManagement';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { useStudySessionTracking } from '@/hooks/useStudySessionTracking';
import { REVIEW_PROFILES, ReviewProfile } from '@/types/study';
import { errorService } from '@/lib/errors/errorService';

const calculateSubjectStatus = (subject: Subject): Status => {
  if (subject.topics.length === 0) {
    return 'Nova';
  }

  // Verificar se todos os tópicos estão concluídos
  const allTopicsCompleted = subject.topics.every(topic =>
    topic.completed || topic.reviewStage === 'Concluído'
  );

  if (allTopicsCompleted) {
    return 'Concluída';
  }

  // Verificar se algum tópico foi iniciado
  const hasStartedTopics = subject.topics.some(topic =>
    (topic.reviewCount > 0 || topic.review_count > 0) ||
    (topic.reviewStage && topic.reviewStage !== '') ||
    ((topic as any).review_stage && (topic as any).review_stage !== '') ||
    (topic.nextReview !== undefined && topic.nextReview !== null) ||
    ((topic as any).next_review !== undefined && (topic as any).next_review !== null) ||
    topic.completed === true ||
    (topic.lastReviewedAt !== null && topic.lastReviewedAt !== undefined) ||
    (topic.last_reviewed_at !== null && topic.last_reviewed_at !== undefined) ||
    (topic.firstStudiedAt !== null && topic.firstStudiedAt !== undefined) ||
    (topic.first_studied_at !== null && topic.first_studied_at !== undefined)
  );

  if (hasStartedTopics) {
    return 'Em Estudo';
  }

  return 'Nova';
};

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Nova': return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    case 'Em Estudo': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'Concluída': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
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
  const navigate = useNavigate();
  // Estado local simples - sem contextos
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Cache simples no localStorage
  const loadSubjects = async () => {
    console.log('📥 LOAD SUBJECTS CALLED:', {
      user: !!user,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    if (!user) return;

    const cacheKey = `subjects_${user.id} `;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < 300000) { // 5 minutos
          console.log('💾 USING CACHE:', { subjectsCount: data.subjects.length });
          setSubjects(data.subjects);
          return;
        }
      } catch (e) { }
    }

    console.log('🔄 LOADING FROM DATABASE');
    if (!dataLoaded) {
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

      localStorage.setItem(cacheKey, JSON.stringify({
        subjects: transformedSubjects,
        timestamp: Date.now()
      }));

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
    }
  };

  const refreshData = async () => {
    if (user) {
      localStorage.removeItem(`subjects_${user.id} `);
      await loadSubjects();
    }
  };


  const [newSubjectName, setNewSubjectName] = useState('');
  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([]);
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
  const [showManualInput, setShowManualInput] = useState(false);

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
          name: text,
          completed: false,
          review_count: 0,
          review_stage: null,
          next_review: null,
          first_studied_at: null,
          last_reviewed_at: null,
          notes: null
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

  // Hook para gerenciar visualizações duplicadas no ciclo
  const { addSubjectView, removeSubjectView, getSubjectViewCount } = useCycleViewManagement();

  // Hook para gerenciar status do ciclo de estudos
  const { isSubjectStudied, getNextSuggestedSubject, markSubjectAsStudied, isNextSuggested } = useCycleStatus();

  // Hook para tracking de sessões de estudo
  const { recordStudySession } = useStudySessionTracking();

  // Estado para armazenar o ciclo atual e contar visualizações
  const [userCycle, setUserCycle] = useState<any>(null);

  // expandedSubjectList agora é um useMemo (definido mais abaixo)

  // Carregar dados apenas uma vez por usuário
  useEffect(() => {
    console.log('🚀 SUBJECTS useEffect TRIGGERED:', {
      user: !!user,
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    if (user) {
      loadSubjects().finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  // Carregar ciclo do usuário
  useEffect(() => {
    const loadUserCycle = async () => {
      if (!user) return;

      const cacheKey = `user_cycle_cache_${user.id} `;

      // 1. Tentar ler do cache primeiro para evitar flicker
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUserCycle(parsed);
        } catch (e) {
          console.error('Invalid cache', e);
        }
      }

      try {
        const { data } = await supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        const cycleData = data?.[0] || null;

        if (cycleData) {
          setUserCycle(cycleData);
          // 2. Atualizar cache com dados frescos
          localStorage.setItem(cacheKey, JSON.stringify(cycleData));

          console.log('🔄 USER CYCLE LOADED:', {
            cycleLength: cycleData.ciclo_atual?.length || 0,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Erro ao carregar ciclo:', error);
      }
    };

    loadUserCycle();
  }, [user?.id]);

  // Função auxiliar para obter a posição no ciclo
  const getCyclePosition = (itemId: string) => {
    if (!userCycle?.ciclo_atual) return null;
    // Extrair o índice do ciclo do itemId (formato: subjectId-cycleIndex)
    const cycleIndex = parseInt(itemId.split('-').pop() || '0');
    return cycleIndex + 1; // +1 porque queremos posição 1-based
  };

  // Criar lista expandida de matérias com visualizações usando useMemo
  const expandedSubjectList = useMemo(() => {
    if (!userCycle?.ciclo_atual || !localSubjects.length) {
      return localSubjects.map(subject => ({
        id: `${subject.id} -0`,
        subject,
        viewIndex: 0,
        isView: false
      }));
    }

    const expanded: Array<{
      id: string;
      subject: Subject;
      viewIndex: number;
      isView: boolean;
    }> = [];

    // Primeiro, adicionar todas as matérias do ciclo com suas visualizações
    userCycle.ciclo_atual.forEach((subjectId: string, cycleIndex: number) => {
      const subject = localSubjects.find(s => s.id === subjectId);
      if (!subject) return;

      // Contar quantas vezes esta matéria já apareceu antes neste ciclo
      const viewIndex = userCycle.ciclo_atual
        .slice(0, cycleIndex)
        .filter((id: string) => id === subjectId).length;

      expanded.push({
        id: `${subject.id} -${cycleIndex} `,
        subject,
        viewIndex,
        isView: viewIndex > 0
      });
    });

    // Depois, adicionar matérias que não estão no ciclo (novas matérias)
    const subjectsInCycle = new Set(userCycle.ciclo_atual);
    localSubjects.forEach(subject => {
      if (!subjectsInCycle.has(subject.id)) {
        expanded.push({
          id: `${subject.id} -0`,
          subject,
          viewIndex: 0,
          isView: false
        });
      }
    });



    return expanded;
  }, [userCycle?.ciclo_atual, localSubjects]);

  useEffect(() => {
    console.log('📋 SET LOCAL SUBJECTS useEffect TRIGGERED:', {
      subjectsCount: subjects.length,
      timestamp: new Date().toISOString()
    });
    setLocalSubjects(subjects);

    // Se o modal estiver aberto, atualizar também o objeto subject dentro dele
    if (topicsModal.isOpen && topicsModal.subject) {
      const updatedSubject = subjects.find(s => s.id === topicsModal.subject?.id);
      if (updatedSubject) {
        setTopicsModal(prev => ({ ...prev, subject: updatedSubject }));
      }
    }
  }, [subjects, topicsModal.isOpen, topicsModal.subject]);

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

    setIsAddingSubject(true);

    try {
      // Adicionar nova matéria
      const maxPriority = localSubjects.length > 0 ? Math.max(...localSubjects.map(s => s.priority || 0)) : 0;

      await supabase.from('subjects').insert({
        user_id: user.id,
        name: newSubjectName.trim().toUpperCase(),
        status: 'Nova',
        color: '#3B82F6',
        priority: maxPriority + 1,
      });

      await refreshData();

      toast.success("Matéria adicionada com sucesso!");

      // Limpar o input imediatamente
      setNewSubjectName('');

    } catch (error: any) {
      console.error('Erro ao adicionar matéria:', error);
      errorService.report(error, { module: 'subjects', action: 'add', userMessage: "Erro ao salvar matéria. Tente novamente." });
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
    try {
      // 1. Buscar tópicos dessa matéria para limpar histórico
      const { data: subjectTopics } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', id);

      if (subjectTopics && subjectTopics.length > 0) {
        const topicIds = subjectTopics.map(t => t.id);

        // 2. Deletar histórico dos tópicos
        await supabase
          .from('topic_review_history')
          .delete()
          .in('topic_id', topicIds);

        // 3. Deletar tópicos (embora o cascade da FK devesse cuidar disso, garantimos aqui)
        await supabase
          .from('topics')
          .delete()
          .eq('subject_id', id);
      }

      // 4. Deletar a matéria
      await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      await refreshData();
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'handleDelete',
          userMessage: 'Erro ao excluir matéria. Tente novamente.',
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

    try {
      // 1. Deletar histórico primeiro
      const { error: historyError } = await supabase
        .from('topic_review_history')
        .delete()
        .eq('topic_id', topicToDelete.id);

      if (historyError) {
        console.error('⚠️ ConfirmDeleteTopic - Error deleting history (continuing anyway):', historyError);
      }

      // 2. Deletar tópico
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicToDelete.id);

      if (error) throw error;

      await refreshData();
      toast.success('Tópico excluído', { duration: 2000 });
      setTopicToDelete(null);
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Subjects',
          action: 'confirmDeleteTopic',
          userMessage: 'Erro ao excluir tópico',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
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

  // Função corrigida para calcular a Cobertura (progresso real de contato inicial)
  const getSubjectProgress = (subject: Subject) => {
    if (subject.topics.length === 0) return 0;

    // Contar tópicos que já foram estudados
    const studiedTopics = subject.topics.filter(topic =>
      Boolean(topic.first_studied_at) || topic.reviewCount > 0 || topic.completed || topic.reviewStage === 'Concluído'
    ).length;

    return Math.round((studiedTopics / subject.topics.length) * 100);
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

  const handleAddSubjectView = async (subject: Subject) => {
    try {
      const success = await addSubjectView(subject.id, subject.name);
      if (success) {
        // Registrar sessão de estudo
        await recordStudySession({
          subjectId: subject.id,
          subjectName: subject.name,
          topicsStudied: subject.topics?.map(t => t.id) || [],
          topicsCount: subject.topics?.length || 0
        });

        // Recarregar ciclo para atualizar contadores
        const { data } = await supabase
          .from('user_cycles')
          .select('ciclo_atual')
          .eq('user_id', user!.id)
          .limit(1);

        const cycleData = data?.[0] || null;

        if (cycleData) {
          setUserCycle(cycleData);
        }
      }
    } catch (error: any) {
      // Erro genérico
      console.error('Erro ao adicionar visualização:', error);
      errorService.report(error, { module: 'subjects', action: 'add_topic_view', userMessage: "Erro ao adicionar visualização da matéria" });
    }
  };

  const handleRemoveSubjectView = async (subjectId: string, viewIndex: number, subjectName: string) => {
    const success = await removeSubjectView(subjectId, viewIndex, subjectName);
    if (success) {
      // Recarregar ciclo
      const { data } = await supabase
        .from('user_cycles')
        .select('ciclo_atual')
        .eq('user_id', user!.id)
        .limit(1);

      const cycleData = data?.[0] || null;

      if (cycleData) {
        setUserCycle(cycleData);
      }
      // Refresh será feito automaticamente pelo recarregamento do ciclo
    }
  };
  if (loading) {
    return <div>Carregando...</div>;
  }

  if (isLoading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }



  return (
    <div className="flex w-full text-slate-900 dark:text-slate-100 font-sans">
      <div className="flex-1 flex flex-col relative w-full">

        {/* Header Outside Card */}
        <main className="flex-1 px-4 md:px-8 pb-8 pt-0">
          <div className="space-y-6 w-full"> {/* Changed space-y-4 to 6 to match Topics */}

            {/* Unified Header Card - Visível apenas quando há matérias ou modo manual ativo */}
            {(localSubjects.length > 0 || showManualInput) && (
              <div className="sticky top-0 z-20 px-4 md:px-6 pt-4 pb-4 mb-4 bg-transparent rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground mt-1">Gerencie suas matérias e acompanhe seu progresso detalhado.</p>
                  <button
                    onClick={() => setContentUploadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-purple-200/50 dark:shadow-purple-900/30 hover:shadow-lg transition-all duration-300 shrink-0"
                  >
                    <span>🪄</span>
                    Importar Edital
                  </button>
                </div>

                {/* Add Subject Section */}
                <div className="mb-6">
                  <div className="flex gap-2 items-center h-9">
                    <div
                      className="relative flex-1 min-w-0 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm hover:border-gray-300 dark:hover:border-slate-600 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200 h-full"
                    >
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                        <Search size={14} />
                      </div>
                      <input
                        placeholder="Ex: Direito Constitucional, Matemática Financeira..."
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveSubject()}
                        className="w-full pl-8 pr-8 py-1.5 text-sm bg-transparent border-none shadow-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-slate-500 dark:text-white h-full !outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveSubject}
                      disabled={isAddingSubject || !newSubjectName.trim()}
                      className="flex items-center justify-center gap-2 rounded-lg text-xs font-medium px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed h-full whitespace-nowrap !min-h-[36px] !h-[36px]"
                    >
                      {isAddingSubject ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Adicionar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${activeTab === 'all'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'border border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      Todas
                    </button>
                    <button
                      onClick={() => setActiveTab('in_progress')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${activeTab === 'in_progress'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'border border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      Em Estudo
                    </button>
                    <button
                      onClick={() => setActiveTab('completed')}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${activeTab === 'completed'
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        : 'border border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      Concluídas
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-1 text-slate-400">
                    <div className="p-1 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <LayoutGrid className="h-5 w-5" />
                    </div>
                    <div className="p-1 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <List className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={expandedSubjectList
                  .filter(item => {
                    if (activeTab === 'all') return true;
                    // We need status here. calculateSubjectStatus(item.subject)
                    const status = calculateSubjectStatus(item.subject);
                    if (activeTab === 'in_progress') return status !== 'Concluída';
                    if (activeTab === 'completed') return status === 'Concluída';
                    return true;
                  })
                  .map(item => item.id)
                }
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4 max-w-full">
                  {localSubjects.length === 0 && !showManualInput ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                      {/* Ícone Principal */}
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <span className="text-4xl">📖</span>
                      </div>

                      {/* Título */}
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                        Organize seu Conteúdo de Estudos
                      </h3>

                      {/* Descrição */}
                      <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                        Cadastre suas matérias e tópicos — o sistema cuida de tudo para você, agendando automaticamente suas revisões.
                      </p>

                      {/* Cards de Ação */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                        {/* Card 1: Importar Edital (Destaque Primário) */}
                        <button
                          onClick={() => setContentUploadModal(true)}
                          className="group relative flex flex-col items-center gap-4 p-6 rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 shadow-lg shadow-violet-100/50 dark:shadow-violet-900/20 hover:shadow-xl hover:shadow-violet-200/60 dark:hover:shadow-violet-800/30 hover:border-violet-400 dark:hover:border-violet-400/60 hover:-translate-y-1 transition-all duration-300 text-left cursor-pointer"
                        >
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-300/50 dark:shadow-violet-800/50 group-hover:scale-110 transition-transform duration-300">
                            <span className="text-2xl">🪄</span>
                          </div>
                          <div className="relative z-10 text-center">
                            <h4 className="text-lg font-bold text-violet-900 dark:text-violet-200 mb-1">
                              Importar Edital Completo
                            </h4>
                            <p className="text-sm text-violet-600 dark:text-violet-400 leading-relaxed">
                              Busque um concurso pronto ou use nossa IA para ler seu PDF em segundos.
                            </p>
                          </div>
                        </button>

                        {/* Card 2: Adicionar Manualmente (Secundário) */}
                        <button
                          onClick={() => setShowManualInput(true)}
                          className="group flex flex-col items-center gap-4 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/30 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-1 transition-all duration-300 text-left cursor-pointer"
                        >
                          <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-2xl">✍️</span>
                          </div>
                          <div className="text-center">
                            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
                              Adicionar Manualmente
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                              Cadastre suas disciplinas e tópicos um por um.
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  ) : (
                    expandedSubjectList
                      .filter(item => {
                        if (activeTab === 'all') return true;
                        const status = calculateSubjectStatus(item.subject);
                        if (activeTab === 'in_progress') return status !== 'Concluída';
                        if (activeTab === 'completed') return status === 'Concluída';
                        return true;
                      })
                      .map((item, index) => {
                        const { subject, viewIndex, isView } = item;
                        const progress = getSubjectProgress(subject);
                        const calculatedStatus = calculateSubjectStatus(subject);
                        const isEditing = editingSubjectId === subject.id;
                        const viewCount = userCycle?.ciclo_atual ? getSubjectViewCount(subject.id, userCycle.ciclo_atual) : 0;

                        // Force visual sequence based on list order
                        const position = index + 1;


                        return (
                          <SortableItem key={item.id} id={item.id}>
                            {({ listeners, attributes }) => (
                              <div
                                className="w-full max-w-full"
                              >
                                <Card data-subject-id={subject.id} className="group bg-transparent rounded-xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 mb-4 overflow-hidden relative">
                                  {/* Interactive Status Border (Left) */}
                                  <div
                                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusBorderColor(calculatedStatus).replace('border-l-', 'bg-')}`}
                                    title={`Status: ${calculatedStatus}`}
                                  />

                                  <div className="p-3 pl-5 flex flex-col gap-3">

                                    {/* Row 1: Badge #Position + Name */}
                                    <div className="flex items-center gap-3 w-full">
                                      {/* Drag Handle (Mobile/Desktop Unified) */}
                                      <div className="cursor-move text-slate-400 hover:text-slate-600 -ml-1" {...listeners} {...attributes}>
                                        <GripVertical size={20} />
                                      </div>

                                      {/* Position Badge */}
                                      <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono min-w-[1.5rem] text-center font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 text-[10px]">
                                        #{position}
                                      </span>

                                      {/* Subject Name */}
                                      {isEditing ? (
                                        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                          <Input
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="h-8 text-sm flex-1 min-w-0"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveEdit();
                                              if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                            autoFocus
                                          />
                                          <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0 text-green-600">
                                            <Check className="h-4 w-4" />
                                          </Button>
                                          <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0 text-red-600">
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <h3
                                          className="text-[14px] font-semibold leading-[20px] text-slate-800 dark:text-slate-200 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors capitalize flex-1 min-w-0 flex items-center gap-2"
                                          onClick={(e) => { e.stopPropagation(); handleStartEdit(subject); }}
                                        >
                                          <span className="whitespace-normal break-words">{subject.name.toLowerCase()}</span>
                                        </h3>
                                      )}
                                    </div>

                                    {/* Row 2: Responsive (Progress -> Icons on ALL screens) */}
                                    <div className="flex flex-row items-center gap-4 w-full">

                                      {/* Progress Group (Left) */}
                                      <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[50%] xl:max-w-[40%] xl:justify-start" onClick={() => toggleExpand(subject.id)}>
                                        <span className="whitespace-nowrap text-[12px] font-normal leading-[16px] text-slate-500">{subject.topics.length} tópicos</span>
                                        {subject.topics.length > 0 && (
                                          <div className="flex items-center gap-2 flex-1 min-w-[60px]">
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                              <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                              />
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-600">{progress}%</span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Right on Mobile / Left on Desktop -> Actions Group */}
                                      <div className="flex items-center gap-1 w-fit flex-none ml-auto">
                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSubjectNotesModal({ isOpen: true, subjectId: subject.id, subjectName: subject.name }); }} className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600" title="Anotações">
                                          <NotebookPen size={16} />
                                        </Button>

                                        {isView ? (
                                          <>
                                            <div className="flex items-center justify-center w-7 h-7 flex-none" title="Matéria Duplicada (Cópia)">
                                              <span className="flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 text-[10px] font-bold text-slate-400 bg-slate-50 select-none">
                                                C
                                              </span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRemoveSubjectView(subject.id, viewIndex, subject.name); }} className="h-7 w-7 p-0 text-red-400 hover:text-red-600">
                                              <Trash size={16} />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            {calculatedStatus !== 'Concluída' && (
                                              <div className="relative w-7 h-7 flex-none flex items-center justify-center">
                                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleAddSubjectView(subject); }} className="h-7 w-7 p-0 text-slate-400 hover:text-indigo-600">
                                                  <Copy size={16} />
                                                </Button>
                                                {!isView && viewCount > 1 && (
                                                  <Badge className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center p-0 text-[8px] bg-blue-600 text-white">
                                                    {viewCount - 1}
                                                  </Badge>
                                                )}
                                              </div>
                                            )}
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600">
                                                  <Trash2 size={16} />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Tem certeza que deseja excluir a matéria "{subject.name}"?
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                  <AlertDialogAction onClick={() => handleDelete(subject.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          </>
                                        )}

                                        <div className="h-4 w-px bg-slate-200 mx-1"></div>

                                        <Button variant="ghost" className="p-0 h-7 w-7 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}>
                                          {expandedSubjectIds.includes(item.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </Button>
                                      </div>

                                    </div>
                                  </div>

                                  {/* Expanded Content (Topics List) */}
                                  {
                                    expandedSubjectIds.includes(item.id) && (
                                      <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:pl-5">

                                        {/* Inline Topic Input */}
                                        <div className="flex items-center gap-2 mb-3 bg-white p-1 pl-3 rounded-lg border border-slate-200 shadow-sm" onClick={e => e.stopPropagation()}>
                                          <Input
                                            placeholder="Novo tópico..."
                                            value={newTopicTexts[subject.id] || ''}
                                            onChange={(e) => setNewTopicTexts(prev => ({ ...prev, [subject.id]: e.target.value }))}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') handleSaveNewTopic(subject.id);
                                            }}
                                            className="h-7 text-sm border-0 focus-visible:ring-0 bg-transparent"
                                          />
                                          <Button
                                            size="sm"
                                            onClick={() => handleSaveNewTopic(subject.id)}
                                            className="h-7 w-7 p-0 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-md shrink-0"
                                            title="Adicionar Tópico"
                                          >
                                            <Plus size={16} />
                                          </Button>
                                        </div>



                                        {subject.topics.length === 0 ? (
                                          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                                            <p className="text-slate-500 text-sm">Nenhum tópico cadastrado.</p>
                                          </div>
                                        ) : (
                                          <ul className="space-y-1.5">
                                            {subject.topics.map(topic => {
                                              const isCompleted = topic.completed || topic.reviewStage === 'Concluído';
                                              const iconClass = getTopicIconClass(topic);

                                              return (
                                                <li key={topic.id} data-topic-item className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group/topic relative">
                                                  <div className={`flex-shrink-0 transition-colors ${iconClass}`}>
                                                    {isCompleted ? <CheckCircle2 size={18} className="fill-green-100" /> : <Circle size={18} />}
                                                  </div>
                                                  {editingTopicId === topic.id ? (
                                                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                                                      <Input
                                                        value={editingTopicName}
                                                        onChange={(e) => setEditingTopicName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                          if (e.key === 'Enter') handleSaveTopicEdit();
                                                          if (e.key === 'Escape') handleCancelTopicEdit();
                                                          e.stopPropagation();
                                                        }}
                                                        className="h-7 text-sm py-1 px-2"
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                      />
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); handleSaveTopicEdit(); }}
                                                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                      >
                                                        <Check size={14} />
                                                      </Button>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={(e) => { e.stopPropagation(); handleCancelTopicEdit(); }}
                                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                      >
                                                        <X size={14} />
                                                      </Button>
                                                    </div>
                                                  ) : (
                                                    <div className="flex flex-col flex-1" onClick={(e) => { e.stopPropagation(); handleStartTopicEdit(topic); }} title="Clique para editar">
                                                      <span
                                                        className={`text-sm md:text-base font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                                                      >
                                                        {topic.name}
                                                      </span>
                                                      <span className="text-[10px] text-slate-400">
                                                        {Boolean(topic.first_studied_at) || topic.reviewCount > 0 ? "Cobertura: Estudado" : "Cobertura: Não iniciado"}
                                                      </span>
                                                    </div>
                                                  )}
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTopic(topic, subject.name); }}
                                                    className="opacity-0 group-hover/topic:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                    title="Excluir tópico"
                                                  >
                                                    <Trash2 size={14} />
                                                  </button>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        )}
                                      </div>
                                    )
                                  }
                                </Card>
                              </div>
                            )}
                          </SortableItem>
                        );
                      })
                  )}


                </div>
              </SortableContext>
            </DndContext>
            {/* Modals positioned within the layout */}
            <div className="relative z-50">
              {topicsModal.subject && (
                <TopicsModal
                  isOpen={topicsModal.isOpen}
                  onClose={handleCloseTopicsModal}
                  subject={topicsModal.subject}
                  onUpdate={refreshData}
                />
              )}

              <AlertDialog open={!!topicToDelete} onOpenChange={(open) => !open && setTopicToDelete(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o tópico <strong>"{topicToDelete?.name}"</strong> da matéria <strong>"{topicToDelete?.subjectName}"</strong>?
                      <br /><br />
                      Esta ação não pode ser desfeita e todos os dados de revisão serão perdidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteTopic} className="bg-red-600 hover:bg-red-700">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <ContentUploadModal
                open={contentUploadModal}
                onOpenChange={setContentUploadModal}
                onSuccess={refreshData}
              />

              <SubjectNotesModal
                isOpen={subjectNotesModal.isOpen}
                onClose={() => {
                  setSubjectNotesModal(prev => ({ ...prev, isOpen: false }));
                  setTimeout(() => {
                    refreshData();
                  }, 200);
                }}
                subjectId={subjectNotesModal.subjectId}
                subjectName={subjectNotesModal.subjectName}
              />
            </div>

          </div >
        </main >
      </div >
    </div >
  );
};

export default Subjects;
