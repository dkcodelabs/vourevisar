import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit2, BookOpen, GripVertical, Target, CheckCircle, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { useApp } from '@/contexts/AppContext';
import { Subject, Status } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { UserProfileProvider, useUserProfile } from '@/contexts/UserProfileContext';
import { ProfileSelector } from '@/components/ProfileSelector';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewProfile } from '@/types/study';
import { useToast } from '@/components/ui/use-toast';

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
  const { subjects, isLoading, error, addSubject, deleteSubject, updateSubject, forceRefresh } = useApp();
  const [newSubjectName, setNewSubjectName] = useState('');
  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);
  const { profile, setProfile } = useUserProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [toastShown, setToastShown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<string[]>([]);
  
  // Estados para edição inline
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_settings')
        .select('review_profile')
        .eq('user_id', user.id)
        .single();
      if (
        error ||
        !data ||
        !data.review_profile ||
        ![ReviewProfile.BEGINNER, ReviewProfile.INTERMEDIATE, ReviewProfile.ADVANCED].includes(data.review_profile as ReviewProfile)
      ) {
        if (!toastShown) {
          toast({
            variant: "destructive",
            title: "Perfil de revisão obrigatório",
            description: "Você precisa escolher um perfil de revisão antes de adicionar matérias."
          });
          setToastShown(true);
        }
        navigate('/configuracoes');
      } else {
        setLoading(false);
      }
    };
    checkProfile();
  }, [user, navigate, toast, toastShown]);

  useEffect(() => {
    setLocalSubjects(subjects);
  }, [subjects]);

  useLayoutEffect(() => {
    if (!loading && newSubjectName === '' && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [loading, localSubjects, newSubjectName]);

  useEffect(() => {
    if (inputRef.current && newSubjectName === '') {
      inputRef.current.focus();
    }
  }, []);

  console.log('Subjects component render:', {
    subjectsCount: subjects.length,
    isLoading,
    error,
    subjectsData: subjects
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Recarregar dados sempre que a página for acessada
  useEffect(() => {
    console.log('📄 Subjects - Página acessada, forçando refresh dos dados...');
    if (user) {
      forceRefresh();
    }
  }, [user?.id, forceRefresh]); // Dependência mínima para evitar loops

  const handleSaveSubject = async () => {
    if (!newSubjectName.trim()) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Por favor, insira o nome da matéria"
      });
      return;
    }
    try {
      // Adicionar nova matéria
      const maxPriority = localSubjects.length > 0 ? Math.max(...localSubjects.map(s => s.priority || 0)) : 0;
      await addSubject({
        name: newSubjectName.trim().toUpperCase(),
        status: 'Nova',
        color: '#3B82F6',
        topics: [],
        priority: maxPriority + 1,
      });
      toast({
        title: "Sucesso",
        description: "Matéria criada com sucesso!"
      });
      setNewSubjectName('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error('Erro ao salvar matéria:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao salvar matéria. Tente novamente."
      });
    }
  };

  // Funções para edição inline
  const handleStartEdit = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setEditingName(subject.name);
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Por favor, insira o nome da matéria"
      });
      return;
    }

    if (editingSubjectId && editingName.trim() !== '') {
      try {
        await updateSubject(editingSubjectId, { name: editingName.trim().toUpperCase() });
        toast({
          title: "Sucesso",
          description: "Matéria atualizada com sucesso!"
        });
        setEditingSubjectId(null);
        setEditingName('');
      } catch (error) {
        console.error('Erro ao atualizar matéria:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao atualizar matéria. Tente novamente."
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
      await deleteSubject(id);
      toast({
        title: "Sucesso",
        description: "Matéria excluída com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao excluir matéria:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao excluir matéria. Tente novamente."
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localSubjects.findIndex((subject) => subject.id === active.id);
    const newIndex = localSubjects.findIndex((subject) => subject.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSubjects = arrayMove(localSubjects, oldIndex, newIndex);
    setLocalSubjects(reorderedSubjects);

    try {
      // Atualizar prioridades diretamente no Supabase, aguardando todos os updates
      const updates = reorderedSubjects.map((subject, index) => ({
        id: subject.id,
        priority: index + 1,
        updated_at: new Date().toISOString()
      }));

      const updatePromises = updates.map(update =>
        supabase
          .from('subjects')
          .update({ priority: update.priority, updated_at: update.updated_at })
          .eq('id', update.id)
      );

      const results = await Promise.all(updatePromises);
      const hasError = results.some(r => r.error);
      if (hasError) {
        console.error('Erro ao atualizar prioridades:', results);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Erro ao atualizar ordem das matérias"
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Ordem das matérias atualizada!"
        });
      }
      // Recarregar a lista após todos os updates
      window.location.reload();
    } catch (error) {
      console.error('Erro ao reordenar matérias:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao atualizar ordem das matérias"
      });
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

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao carregar matérias</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <UserProfileProvider>
      <motion.div 
        className="container mx-auto p-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex flex-col gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Minhas Matérias</h1>
            <p className="text-gray-600 mt-1">Gerencie suas matérias de estudo</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Nome da nova matéria"
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSaveSubject()}
              className="flex-1"
              ref={inputRef}
            />
            <Button onClick={handleSaveSubject} disabled={!newSubjectName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
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
            <SortableContext items={localSubjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="grid gap-4">
                <AnimatePresence>
                  {localSubjects.map((subject) => {
                    const progress = getSubjectProgress(subject);
                    const calculatedStatus = calculateSubjectStatus(subject);
                    const isEditing = editingSubjectId === subject.id;
                    
                    return (
                      <SortableItem key={subject.id} id={subject.id}>
                        {({ listeners, attributes }) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card className="hover:shadow-lg transition-shadow relative">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4 flex-1">
                                    <div className="cursor-move p-1" {...listeners} {...attributes}>
                                      <GripVertical className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <button
                                      onClick={() => toggleExpand(subject.id)}
                                      className="mr-2 p-1 rounded hover:bg-gray-100 transition"
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
                                          <div className="flex items-center gap-2 flex-1">
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
                                          <>
                                            <h3 className="font-semibold text-lg truncate">{subject.name}</h3>
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
                                          onClick={e => { e.preventDefault(); e.stopPropagation(); handleViewTopics(subject); }}
                                        >
                                          <BookOpen className="h-4 w-4 mr-1" />
                                          Tópicos
                                        </Button>
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
                                  </div>
                                </div>
                                {expandedSubjectIds.includes(subject.id) && (
                                  <ul className="ml-12 mt-2">
                                    {subject.topics.length === 0 ? (
                                      <li className="text-gray-400 text-sm">Nenhum tópico cadastrado.</li>
                                    ) : (
                                      subject.topics.map(topic => (
                                        <li key={topic.id} className="flex items-center gap-2 text-sm">
                                          <BookOpen className="h-4 w-4 text-blue-400" />
                                          <span>{topic.name}</span>
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
      </motion.div>
    </UserProfileProvider>
  );
};

export default Subjects;
