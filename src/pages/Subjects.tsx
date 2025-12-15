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
  Circle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/toast';
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
    case 'Nova': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'Em Estudo': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Concluída': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
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

    const cacheKey = `subjects_${user.id}`;
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
        .select(`*, topics (*, difficulty_level)`)
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
      console.error('❌ ERROR:', error);
    } finally {
      setIsLoading(false);
      setDataLoaded(true);
    }
  };

  const refreshData = async () => {
    if (user) {
      localStorage.removeItem(`subjects_${user.id}`);
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

      const cacheKey = `user_cycle_cache_${user.id}`;

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
          .maybeSingle();

        if (data) {
          setUserCycle(data);
          // 2. Atualizar cache com dados frescos
          localStorage.setItem(cacheKey, JSON.stringify(data));

          console.log('🔄 USER CYCLE LOADED:', {
            cycleLength: data.ciclo_atual?.length || 0,
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
        id: `${subject.id}-0`,
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
        id: `${subject.id}-${cycleIndex}`,
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
          id: `${subject.id}-0`,
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
  }, [subjects]);

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

    } catch (error) {
      console.error('Erro ao salvar matéria:', error);
      // Mostrar toast apenas em caso de erro real
      toast.error("Erro ao salvar matéria. Tente novamente.", {
        duration: 3000
      });
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
        console.error('Erro ao atualizar matéria:', error);
        toast.error("Erro ao atualizar matéria. Tente novamente.", {
          duration: 3000
        });
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingSubjectId(null);
    setEditingName('');
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      await refreshData();
    } catch (error) {
      console.error('Erro ao excluir matéria:', error);
      toast.error("Erro ao excluir matéria. Tente novamente.", {
        duration: 3000
      });
    }
  };

  const handleDeleteTopic = (topic: Topic, subjectName: string) => {
    setTopicToDelete({ id: topic.id, name: topic.name, subjectName });
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;

    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicToDelete.id);

      if (error) throw error;

      await refreshData();
      toast.success('Tópico excluído', { duration: 2000 });
      setTopicToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir tópico:', error);
      toast.error('Erro ao excluir tópico');
    }
  };

  const handleStartTopicEdit = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditingTopicName(topic.name);
  };

  const handleSaveTopicEdit = async () => {
    if (!editingTopicName.trim()) {
      toast.error('O nome do tópico não pode estar vazio');
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
      } catch (error) {
        console.error('Erro ao atualizar tópico:', error);
        toast.error('Erro ao atualizar tópico');
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
        .maybeSingle();

      if (data) {
        setUserCycle(data);
      }
      */
    } catch (error) {
      console.error('Erro ao reordenar ciclo:', error);
      toast.error("Erro ao atualizar ordem do ciclo");
      // Rollback em caso de erro
      setUserCycle(previousUserCycle);
      if (user && previousUserCycle) {
        localStorage.setItem(`user_cycle_cache_${user.id}`, JSON.stringify(previousUserCycle));
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

  // Função corrigida para calcular o progresso baseado em tópicos concluídos
  const getSubjectProgress = (subject: Subject) => {
    if (subject.topics.length === 0) return 0;

    // Contar tópicos que estão realmente concluídos (flag boolean ou status 'Concluído')
    const completedTopics = subject.topics.filter(topic =>
      topic.completed || topic.reviewStage === 'Concluído'
    ).length;

    return Math.round((completedTopics / subject.topics.length) * 100);
  };

  const handleViewTopics = (subject: Subject) => {
    navigate(`/materias/${subject.id}/topicos`);
  };

  const toggleExpand = (subjectId: string) => {
    setExpandedSubjectIds(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
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
          .maybeSingle();

        if (data) {
          setUserCycle(data);
        }
        // Cache será atualizado automaticamente na próxima navegação
      }
    } catch (error) {
      console.error('Erro ao adicionar visualização:', error);
      toast.error('Erro ao adicionar visualização da matéria');
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
        .maybeSingle();

      if (data) {
        setUserCycle(data);
      }
      // Refresh será feito automaticamente pelo recarregamento do ciclo
    }
  };
  if (loading) {
    return <div>Carregando...</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f6f8]">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }



  return (
    <div className="flex h-[calc(100vh-2rem)] w-full bg-[#f8fafc] text-slate-900 overflow-hidden font-sans">
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full">

        {/* Header Outside Card */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 custom-scrollbar pt-0">
          <div className="space-y-6 w-full"> {/* Changed space-y-4 to 6 to match Topics */}

            {/* Unified Header Card */}
            <div className="mt-[15px] px-4 md:px-8 pt-6 pb-6 mb-6 bg-white rounded-2xl border border-gray-200 shadow-md">
              <div className="mb-4">
                <h1 className="text-xl font-semibold text-gray-900">Matérias</h1>
                <p className="text-xs text-muted-foreground mt-1">Gerencie suas matérias e acompanhe seu progresso detalhado.</p>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)] my-4"></div>
              </div>

              {/* Add Subject Section */}
              <div className="mb-6">
                <div className="flex gap-4 items-start">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                      <Search size={18} />
                    </div>
                    <Input
                      placeholder="Ex: Direito Constitucional, Matemática Financeira..."
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveSubject()}
                      className="pl-10 h-10 w-full text-base bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm rounded-lg hover:border-slate-300"
                    />
                  </div>
                  <Button
                    onClick={handleSaveSubject}
                    disabled={isAddingSubject || !newSubjectName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 h-10 shadow-sm shadow-indigo-200 transition-all rounded-lg shrink-0"
                  >
                    {isAddingSubject ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-slate-500">
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-indigo-100 rounded text-[10px] h-5 px-1.5 font-bold">
                    DICA
                  </Badge>
                  <span>
                    Adicione uma matéria e use o botão "Gerar Tópicos" para criar um roteiro de estudos automático com IA. Ou{' '}
                    <button
                      onClick={() => setContentUploadModal(true)}
                      className="text-indigo-500 hover:text-indigo-700 font-medium underline decoration-indigo-300 underline-offset-2 hover:decoration-indigo-500 transition-all"
                    >
                      Carregar Conteúdo Programático
                    </button>
                    .
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'all'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setActiveTab('in_progress')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'in_progress'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    Em Estudo
                  </button>
                  <button
                    onClick={() => setActiveTab('completed')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === 'completed'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    Concluídas
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-slate-400">
                  <div className="p-1 rounded cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <div className="p-1 rounded cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors">
                    <List className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

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
                  {localSubjects.length === 0 ? (
                    <Card>
                      <CardHeader className="text-center">
                        <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <CardTitle>Nenhuma matéria encontrada</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <p className="text-gray-600 mb-4">
                          Comece adicionando sua primeira matéria de estudo.
                        </p>
                      </CardContent>
                    </Card>
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
                                <Card className={`group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 mb-4 overflow-hidden border-l-4 ${getStatusBorderColor(calculatedStatus)}`}>
                                  {/* Main Header / Summary Row */}
                                  <div className="p-3 flex flex-col md:flex-row md:items-center gap-3">

                                    {/* Mobile: Top Row with Status and Menu */}
                                    <div className="flex md:hidden justify-between items-center w-full mb-1">
                                      <div className="flex items-center gap-1">
                                        <div className="cursor-move p-2 text-slate-400 -ml-2" {...listeners} {...attributes}>
                                          <GripVertical size={20} />
                                        </div>
                                        <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono text-xs min-w-[2.5rem] justify-center font-bold px-2 py-0.5 rounded-md flex-shrink-0 ml-1">
                                          #{position}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getStatusColor(calculatedStatus)}`}>
                                          {calculatedStatus}
                                        </span>
                                        <Button variant="ghost" className="p-1 h-8 w-8 text-slate-400" onClick={() => toggleExpand(subject.id)}>
                                          {expandedSubjectIds.includes(subject.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Drag Handle (Desktop) */}
                                    <div className="hidden md:flex text-slate-300 cursor-move hover:text-slate-500" {...listeners} {...attributes}>
                                      <GripVertical size={20} />
                                    </div>

                                    {/* Expand Toggle (Desktop) */}
                                    {/* Expand Toggle (Desktop) - Moved to right */}

                                    {/* Main Content */}
                                    <div className="flex-1 min-w-0" onClick={() => window.innerWidth < 768 && toggleExpand(subject.id)}>
                                      <div className="flex items-center gap-3 mb-1">
                                        {/* Desktop Badges */}
                                        <div className="hidden md:flex items-center gap-2">
                                          <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono text-xs min-w-[2.5rem] justify-center font-bold px-2 py-0.5 rounded-md flex-shrink-0">
                                            #{position}
                                          </span>
                                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${getStatusColor(calculatedStatus)}`}>
                                            {calculatedStatus}
                                          </span>
                                        </div>

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
                                            className="text-base md:text-lg font-bold text-slate-800 truncate cursor-pointer hover:text-indigo-600 transition-colors capitalize"
                                            onClick={(e) => { e.stopPropagation(); handleStartEdit(subject); }}
                                            title="Clique para editar"
                                          >
                                            {subject.name.toLowerCase()}
                                          </h3>
                                        )}

                                        {isView && (
                                          <span className="hidden md:inline-flex bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full">
                                            {viewIndex + 1}ª vis.
                                          </span>
                                        )}
                                      </div>

                                      {!isEditing && (
                                        <div className="flex items-center gap-4 text-xs md:text-sm text-slate-500">
                                          <div className="flex items-center gap-1.5">
                                            <BookOpen size={14} className="text-slate-400" />
                                            <span>{subject.topics.length} tópicos</span>
                                          </div>

                                          {subject.topics.length > 0 && (
                                            <div className="flex items-center gap-2 flex-1 max-w-[140px]">
                                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                  style={{ width: `${progress}%` }}
                                                />
                                              </div>
                                              <span className="font-medium">{progress}%</span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Desktop Actions */}
                                    <div className="hidden md:flex items-center gap-2">
                                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenTopicsModal(subject); }} title="Gerenciar Tópicos">
                                        <List size={18} className="text-slate-400 hover:text-indigo-600" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSubjectNotesModal({ isOpen: true, subjectId: subject.id, subjectName: subject.name }); }} title="Anotações">
                                        <NotebookPen size={18} className="text-slate-400 hover:text-indigo-600" />
                                      </Button>

                                      {/* Action Buttons Logic */}
                                      {isView ? (
                                        <Button variant="ghost" size="sm" title="Remover Visualização" onClick={(e) => { e.stopPropagation(); handleRemoveSubjectView(subject.id, viewIndex, subject.name); }}>
                                          <Trash size={18} className="text-red-400 hover:text-red-600" />
                                        </Button>
                                      ) : (
                                        <>
                                          {calculatedStatus !== 'Concluída' && (
                                            <div className="relative">
                                              <Button variant="ghost" size="sm" title="Duplicar" onClick={(e) => { e.stopPropagation(); handleAddSubjectView(subject); }}>
                                                <Copy size={18} className="text-slate-400 hover:text-indigo-600" />
                                              </Button>
                                              {!isView && viewCount > 1 && (
                                                <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[10px] bg-blue-600 text-white">
                                                  {viewCount - 1}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="sm" title="Excluir Matéria">
                                                <Trash2 size={18} className="text-slate-400 hover:text-red-600" />
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
                                      {/* Expand Toggle (Desktop) - New Position */}
                                      <button
                                        onClick={() => toggleExpand(subject.id)}
                                        className="hidden md:flex p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors ml-2"
                                      >
                                        {expandedSubjectIds.includes(subject.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expanded Content (Topics List) */}
                                  {expandedSubjectIds.includes(subject.id) && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:pl-16">

                                      {subject.topics.length === 0 ? (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                                          <p className="text-slate-500 text-sm mb-2">Nenhum tópico cadastrado.</p>
                                          <Button variant="ghost" onClick={() => handleOpenTopicsModal(subject)} className="text-indigo-600 text-sm hover:bg-indigo-50">
                                            Adicionar Tópicos
                                          </Button>
                                        </div>
                                      ) : (
                                        <ul className="space-y-0.5">
                                          {subject.topics.map(topic => {
                                            const isCompleted = topic.completed || topic.reviewStage === 'Concluído';
                                            const iconClass = getTopicIconClass(topic);

                                            return (
                                              <li key={topic.id} className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-50 transition-colors group/topic relative">
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
                                                  <span
                                                    className={`text-sm md:text-base flex-1 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                                                    onClick={(e) => { e.stopPropagation(); handleStartTopicEdit(topic); }}
                                                    title="Clique para editar"
                                                  >
                                                    {topic.name}
                                                  </span>
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

                                      {/* Mobile Only: Bottom Actions */}
                                      <div className="flex md:hidden border-t border-slate-200 mt-6 pt-4 justify-end gap-2 flex-wrap">
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenTopicsModal(subject); }}>
                                          <List size={16} className="mr-2" /> Tópicos
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSubjectNotesModal({ isOpen: true, subjectId: subject.id, subjectName: subject.name }); }}>
                                          <NotebookPen size={16} className="mr-2" /> Notas
                                        </Button>
                                        <Button variant="outline" size="sm" className="text-red-500 border-red-200" onClick={() => handleDelete(subject.id)}>
                                          <Trash2 size={16} className="mr-2" /> Excluir
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </Card>
                              </div>
                            )
                            }
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
