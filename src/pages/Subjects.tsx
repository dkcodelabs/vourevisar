import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, BookOpen, Target, Clock, Edit, Trash2, MoreVertical, NotebookPen, GripVertical, ChevronDown, ChevronRight, Check, X, CheckCircle, Edit2, Copy, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
// Removido hook de contexto - usando estado local simples
import { Subject, Status } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { transformSubjectsData } from '@/contexts/utils/dataTransformers';
import { UserProfileProvider, useUserProfile } from '@/contexts/UserProfileContext';
import { ProfileSelector } from '@/components/ProfileSelector';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewProfile } from '@/types/study';
import TopicsModal from '@/components/topics/TopicsModal';
import ContentUploadModal from '@/components/ContentUploadModal';
import SubjectNotesModal from '@/components/reviews/SubjectNotesModal';
import { useCycleViewManagement } from '@/hooks/useCycleViewManagement';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { useStudySessionTracking } from '@/hooks/useStudySessionTracking';
// Removido import do hook de visibilidade que causava recarregamentos
import { CycleStatusIndicator } from '@/components/CycleStatusIndicator';

// Função corrigida para calcular o status automaticamente baseado nos tópicos
const calculateSubjectStatus = (subject: Subject): Status => {
  if (subject.topics.length === 0) {
    return 'Nova';
  }

  // Verificar se todos os tópicos estão concluídos (reviewStage === 'Concluído')
  const allTopicsCompleted = subject.topics.every(topic =>
    topic.reviewStage === 'Concluído'
  );

  if (allTopicsCompleted) {
    return 'Concluída';
  }

  // Verificar se algum tópico foi iniciado (tem reviewCount > 0 ou reviewStage definido)
  const hasStartedTopics = subject.topics.some(topic =>
    topic.reviewCount > 0 ||
    (topic.reviewStage && topic.reviewStage !== '') ||
    topic.nextReview !== undefined ||
    topic.completed === true
  );

  if (hasStartedTopics) {
    return 'Em Estudo';
  }

  return 'Nova';
};

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Nova': return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'Em Estudo': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Concluída': return 'bg-green-100 text-green-800 border-green-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
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
      } catch (e) {}
    }
    
    console.log('🔄 LOADING FROM DATABASE');
    setIsLoading(true);
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
  const { profile, setProfile } = useUserProfile();
  
  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  // Estados para edição inline
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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
      
      try {
        const { data } = await supabase
          .from('user_cycles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (data) {
          setUserCycle(data);
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

  // useEffect duplicado removido - já existe acima
  
  // Não verificar perfil automaticamente - deixar para quando necessário

  useEffect(() => {
    console.log('📋 SET LOCAL SUBJECTS useEffect TRIGGERED:', {
      subjectsCount: subjects.length,
      timestamp: new Date().toISOString()
    });
    setLocalSubjects(subjects);
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

  // Removido console.log para evitar spam nos logs

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
      
      // Limpar o input imediatamente
      setNewSubjectName('');
      
    } catch (error) {
      console.error('Erro ao salvar matéria:', error);
      // Mostrar toast apenas em caso de erro real
      toast.error("Erro ao salvar matéria. Tente novamente.", {
        duration: 3000,
        position: 'bottom-right'
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
          duration: 3000,
          position: 'bottom-right'
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
        duration: 3000,
        position: 'bottom-right'
      });
    }
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

    try {
      // Reconstruir ciclo_atual baseado na nova ordem
      const newCicloAtual = reordered.map(item => item.subject.id);

      const { error } = await supabase
        .from('user_cycles')
        .update({
          ciclo_atual: newCicloAtual,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success("Ordem do ciclo atualizada!");
      
      // Recarregar ciclo
      const { data } = await supabase
        .from('user_cycles')
        .select('ciclo_atual')
        .eq('user_id', user!.id)
        .maybeSingle();
      
      if (data) {
        setUserCycle(data);
      }
    } catch (error) {
      console.error('Erro ao reordenar ciclo:', error);
      toast.error("Erro ao atualizar ordem do ciclo");
    }
  };

  // Função corrigida para calcular o progresso baseado em tópicos concluídos
  const getSubjectProgress = (subject: Subject) => {
    if (subject.topics.length === 0) return 0;

    // Contar tópicos que estão realmente concluídos (reviewStage === 'Concluído')
    const completedTopics = subject.topics.filter(topic =>
      topic.reviewStage === 'Concluído'
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
          topicsCount: subject.topics?.length || 0,
          cyclePosition: getSubjectViewCount(subject.id, userCycle?.ciclo_atual || [])
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
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    );
  }



  return (
    <UserProfileProvider>
      <div className="w-full max-w-full overflow-x-hidden">
        <motion.div
          className="space-y-6 max-w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >


          {/* Header */}
          <div className="flex flex-col gap-4 mb-4 px-4 sm:px-6">
            <div className="mb-8">

            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="text"
                  placeholder="Nome da nova matéria"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSaveSubject()}
                  onBlur={(e) => {
                    // Apenas restaurar foco se não estiver indo para outro elemento interativo
                    if (newSubjectName === '' && !e.relatedTarget && !isAddingSubject) {
                      setTimeout(() => {
                        if (inputRef.current && newSubjectName === '' && !isAddingSubject) {
                          inputRef.current.focus();
                        }
                      }, 50);
                    }
                  }}
                  className="flex-1 mobile-button"
                  ref={inputRef}
                />
                <Button 
                  onClick={handleSaveSubject} 
                  disabled={!newSubjectName.trim() || isAddingSubject} 
                  className="w-full sm:w-auto mobile-button touch-target"
                >
                  {isAddingSubject ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar
                    </>
                  )}
                </Button>
              </div>
              <Button 
                onClick={() => setContentUploadModal(true)}
                variant="outline" 
                className="w-full sm:w-auto mobile-button"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Carregar Conteúdo Programático
              </Button>
            </div>
          </div>

          {/* Lista de Matérias */}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={expandedSubjectList.map(item => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4 px-4 sm:px-6 max-w-full">
                  <AnimatePresence>
                    {expandedSubjectList.map((item) => {
                      const { subject, viewIndex, isView } = item;
                      const progress = getSubjectProgress(subject);
                      const calculatedStatus = calculateSubjectStatus(subject);
                      const isEditing = editingSubjectId === subject.id;
                      const viewCount = userCycle?.ciclo_atual ? getSubjectViewCount(subject.id, userCycle.ciclo_atual) : 0;
                      


                      return (
                        <SortableItem key={item.id} id={item.id}>
                          {({ listeners, attributes }) => (
                            <motion.div
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.2 }}
                              className="w-full max-w-full"
                            >
                              <Card className={`hover:shadow-lg transition-shadow relative max-w-full overflow-hidden ${isView ? 'border-l-4 border-l-blue-500' : ''}`}>
                                <CardContent className="p-4 max-w-full">
                                  {/* Layout Desktop */}
                                  <div className="hidden sm:flex items-center justify-between max-w-full">
                                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                                      <div className="cursor-move p-1 flex-shrink-0" {...listeners} {...attributes}>
                                        <GripVertical className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <button
                                        onClick={() => toggleExpand(subject.id)}
                                        className="mr-2 p-1 rounded hover:bg-gray-100 transition flex-shrink-0"
                                        aria-label={expandedSubjectIds.includes(subject.id) ? 'Recolher tópicos' : 'Expandir tópicos'}
                                        tabIndex={0}
                                        type="button"
                                      >
                                        {expandedSubjectIds.includes(subject.id) ? (
                                          <ChevronDown className="h-5 w-5" />
                                        ) : (
                                          <ChevronRight className="h-5 w-5" />
                                        )}
                                      </button>
                                      <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                          {isEditing ? (
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
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
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleSaveEdit}
                                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                              >
                                                <Check className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleCancelEdit}
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                           ) : (
                                             <>
                                               <div className="flex items-center space-x-2">
                                                 <CycleStatusIndicator 
                                                   isStudied={isSubjectStudied(subject.id)}
                                                   isNextSuggested={isNextSuggested(subject.id, subject)}
                                                   variant="dot"
                                                 />
                                                 {/* Número da sequência no ciclo */}
                                                 {(() => {
                                                   const position = getCyclePosition(item.id);
                                                   return position ? (
                                                     <Badge 
                                                       variant="secondary" 
                                                       className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono text-xs min-w-[2.5rem] justify-center font-semibold"
                                                       title={`Posição ${position} na sequência do ciclo`}
                                                     >
                                                       #{position}
                                                     </Badge>
                                                   ) : null;
                                                 })()}
                                                 <h3 className="font-semibold text-lg truncate">{subject.name}</h3>
                                               </div>
                                               {isView && (
                                                 <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                                   {viewIndex + 1}ª visualização
                                                 </Badge>
                                               )}
                                               <Badge className={getStatusColor(calculatedStatus)}>
                                                 {calculatedStatus}
                                               </Badge>
                                             </>
                                           )}
                                        </div>
                                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                          <div className="flex items-center space-x-1">
                                            <Target className="h-4 w-4" />
                                            <span>{subject.topics.length} tópicos</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>{progress}% concluído</span>
                                          </div>
                                        </div>
                                        {subject.topics.length > 0 && (
                                          <div className="mt-2">
                                            <Progress value={progress} className="h-2" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      className="flex items-center space-x-2"
                                      onClick={(e) => e.stopPropagation()}
                                      onMouseDown={(e) => e.stopPropagation()}
                                    >
                                       {!isEditing && (
                                         <>
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={e => { e.preventDefault(); e.stopPropagation(); handleOpenTopicsModal(subject); }}
                                           >
                                             <BookOpen className="h-4 w-4 mr-1" />
                                             Tópicos
                                           </Button>
                                           <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={e => { 
                                               e.preventDefault(); 
                                               e.stopPropagation(); 
                                               setSubjectNotesModal({
                                                 isOpen: true,
                                                 subjectId: subject.id,
                                                 subjectName: subject.name
                                               });
                                             }}
                                           >
                                             <NotebookPen className="h-4 w-4" />
                                           </Button>
                                           {isView ? (
                                             <Button
                                               variant="outline"
                                               size="sm"
                                               onClick={e => { 
                                                 e.preventDefault(); 
                                                 e.stopPropagation(); 
                                                 handleRemoveSubjectView(subject.id, viewIndex, subject.name);
                                               }}
                                               title="Remover esta visualização do ciclo"
                                               className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                             >
                                               <Trash className="h-4 w-4" />
                                             </Button>
                                           ) : (
                                              <>
                                                {calculatedStatus !== 'Concluída' && (
                                                  <div className="relative">
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={e => { 
                                                        e.preventDefault(); 
                                                        e.stopPropagation(); 
                                                        handleAddSubjectView(subject);
                                                      }}
                                                      title="Adicionar visualização no ciclo"
                                                    >
                                                      <Copy className="h-4 w-4" />
                                                    </Button>
                                                    {!isView && viewCount > 1 && (
                                                      <Badge 
                                                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-blue-600 text-white"
                                                      >
                                                        {viewCount - 1}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                )}
                                                <Button
                                                 variant="outline"
                                                 size="sm"
                                                 onClick={e => { e.preventDefault(); e.stopPropagation(); handleStartEdit(subject); }}
                                               >
                                                 <Edit2 className="h-4 w-4" />
                                               </Button>
                                               <AlertDialog>
                                                 <AlertDialogTrigger asChild>
                                                   <Button
                                                     variant="outline"
                                                     size="sm"
                                                   >
                                                     <Trash2 className="h-4 w-4 text-red-500" />
                                                   </Button>
                                                 </AlertDialogTrigger>
                                                 <AlertDialogContent>
                                                   <AlertDialogHeader>
                                                     <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                     <AlertDialogDescription>
                                                       Tem certeza que deseja excluir a matéria "{subject.name}"?
                                                       Esta ação não pode ser desfeita e todos os tópicos relacionados também serão excluídos.
                                                     </AlertDialogDescription>
                                                   </AlertDialogHeader>
                                                   <AlertDialogFooter>
                                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                     <AlertDialogAction
                                                       onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(subject.id); }}
                                                       className="bg-red-600 hover:bg-red-700"
                                                     >
                                                       Excluir
                                                     </AlertDialogAction>
                                                   </AlertDialogFooter>
                                                 </AlertDialogContent>
                                               </AlertDialog>
                                             </>
                                           )}
                                         </>
                                       )}
                                    </div>
                                  </div>

                                  {/* Layout Mobile */}
                                  <div className="sm:hidden space-y-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="cursor-move p-1" {...listeners} {...attributes}>
                                        <GripVertical className="h-5 w-5 text-gray-400" />
                                      </div>
                                      <button
                                        onClick={() => toggleExpand(subject.id)}
                                        className="p-1 rounded hover:bg-gray-100 transition"
                                        aria-label={expandedSubjectIds.includes(subject.id) ? 'Recolher tópicos' : 'Expandir tópicos'}
                                        tabIndex={0}
                                        type="button"
                                      >
                                        {expandedSubjectIds.includes(subject.id) ? (
                                          <ChevronDown className="h-5 w-5" />
                                        ) : (
                                          <ChevronRight className="h-5 w-5" />
                                        )}
                                      </button>
                                      <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              value={editingName}
                                              onChange={(e) => setEditingName(e.target.value)}
                                              className="h-8 text-sm flex-1"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit();
                                                if (e.key === 'Escape') handleCancelEdit();
                                              }}
                                              autoFocus
                                            />
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={handleSaveEdit}
                                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                            >
                                              <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={handleCancelEdit}
                                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                         ) : (
                                           <div className="space-y-2">
                                             <div className="flex items-center space-x-2">
                                               <CycleStatusIndicator 
                                                 isStudied={isSubjectStudied(subject.id)}
                                                 isNextSuggested={isNextSuggested(subject.id, subject)}
                                                 variant="dot"
                                               />
                                               {/* Número da sequência no ciclo - Mobile */}
                                               {(() => {
                                                 const position = getCyclePosition(item.id);
                                                 return position ? (
                                                   <Badge 
                                                     variant="secondary" 
                                                     className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono text-xs min-w-[2.5rem] justify-center font-semibold"
                                                     title={`Posição ${position} na sequência do ciclo`}
                                                   >
                                                     #{position}
                                                   </Badge>
                                                 ) : null;
                                               })()}
                                               <h3 className="font-semibold text-lg truncate flex-1">{subject.name}</h3>
                                               {isView && (
                                                 <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                                                   {viewIndex + 1}ª vis.
                                                 </Badge>
                                               )}
                                               <Badge className={getStatusColor(calculatedStatus)}>
                                                 {calculatedStatus}
                                               </Badge>
                                             </div>
                                             <div className="flex items-center space-x-4 text-sm text-gray-600">
                                               <div className="flex items-center space-x-1">
                                                 <Target className="h-4 w-4" />
                                                 <span>{subject.topics.length} tópicos</span>
                                               </div>
                                               <div className="flex items-center space-x-1">
                                                 <CheckCircle className="h-4 w-4" />
                                                 <span>{progress}% concluído</span>
                                               </div>
                                             </div>
                                           </div>
                                         )}
                                      </div>
                                    </div>

                                    {/* Progress Bar Mobile */}
                                    {subject.topics.length > 0 && (
                                      <div className="px-12">
                                        <Progress value={progress} className="h-2" />
                                      </div>
                                    )}

                                     {/* Botões Mobile - Empilhados */}
                                      {!isEditing && (
                                        <div className="flex flex-col space-y-2 px-12">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={e => { e.preventDefault(); e.stopPropagation(); handleOpenTopicsModal(subject); }}
                                            className="w-full justify-start"
                                          >
                                            <BookOpen className="h-4 w-4 mr-2" />
                                            Ver Tópicos
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={e => { 
                                              e.preventDefault(); 
                                              e.stopPropagation(); 
                                              setSubjectNotesModal({
                                                isOpen: true,
                                                subjectId: subject.id,
                                                subjectName: subject.name
                                              });
                                            }}
                                            className="w-full justify-start"
                                          >
                                            <NotebookPen className="h-4 w-4 mr-2" />
                                            Anotações da Matéria
                                          </Button>
                                          {isView ? (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={e => { 
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                                handleRemoveSubjectView(subject.id, viewIndex, subject.name);
                                              }}
                                              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                              <Trash className="h-4 w-4 mr-2" />
                                              Remover Visualização
                                            </Button>
                                          ) : (
                                            <>
                                              {calculatedStatus !== 'Concluída' && (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={e => { 
                                                    e.preventDefault(); 
                                                    e.stopPropagation(); 
                                                    handleAddSubjectView(subject);
                                                  }}
                                                  className="w-full justify-start"
                                                >
                                                  <Copy className="h-4 w-4 mr-2" />
                                                  Duplicar no Ciclo
                                                  {!isView && viewCount > 1 && (
                                                    <Badge className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs bg-blue-600 text-white">
                                                      {viewCount - 1}
                                                    </Badge>
                                                  )}
                                                </Button>
                                              )}
                                              <div className="flex space-x-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={e => { e.preventDefault(); e.stopPropagation(); handleStartEdit(subject); }}
                                                  className="flex-1"
                                                >
                                                  <Edit2 className="h-4 w-4 mr-1" />
                                                  Editar
                                                </Button>
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      className="flex-1"
                                                    >
                                                      <Trash2 className="h-4 w-4 text-red-500 mr-1" />
                                                      Excluir
                                                    </Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        Tem certeza que deseja excluir a matéria "{subject.name}"?
                                                        Esta ação não pode ser desfeita e todos os tópicos relacionados também serão excluídos.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                      <AlertDialogAction
                                                        onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(subject.id); }}
                                                        className="bg-red-600 hover:bg-red-700"
                                                      >
                                                        Excluir
                                                      </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                              </div>
                                            </>
                                          )}
                                         </div>
                                      )}
                                  </div>
                                  {expandedSubjectIds.includes(subject.id) && (
                                    <ul className="ml-12 mt-2">
                                      {subject.topics.length === 0 ? (
                                        <li className="text-gray-400 text-sm">Nenhum tópico cadastrado.</li>
                                      ) : (
                                        subject.topics.map(topic => (
                                          <li key={topic.id} className="flex items-center gap-2 text-base">
                                            <BookOpen className="h-4 w-4 text-blue-400" />
                                            <span className="text-zinc-800 dark:text-zinc-200">{topic.name}</span>
                                          </li>
                                        ))
                                      )}
                                    </ul>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          )}
                        </SortableItem>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Modal de Tópicos */}
          {topicsModal.subject && (
            <TopicsModal
              isOpen={topicsModal.isOpen}
              onClose={handleCloseTopicsModal}
              subject={topicsModal.subject}
            />
          )}

          <ContentUploadModal
            open={contentUploadModal}
            onOpenChange={setContentUploadModal}
            onSuccess={refreshData}
          />

          {/* Subject Notes Modal */}
          <SubjectNotesModal
            isOpen={subjectNotesModal.isOpen}
            onClose={() => {
              setSubjectNotesModal(prev => ({ ...prev, isOpen: false }));
              setTimeout(() => {
                refreshData(); // Refresh após fechar modal de anotações
              }, 200);
            }}
            subjectId={subjectNotesModal.subjectId}
            subjectName={subjectNotesModal.subjectName}
          />
        </motion.div>
      </div>
    </UserProfileProvider>
  );
};

export default Subjects;
