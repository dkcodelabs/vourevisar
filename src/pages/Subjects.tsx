import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Plus, ChevronUp, ChevronDown, Edit, Trash2, LayoutList, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GlassCard, AnimatedTitle, GradientButton } from '@/components/ui';

// Definindo tipos para o componente
interface Topic {
  id: string;
  name: string;
  completed: boolean;
  review_count: number;
}

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  status: 'Nova' | 'Em Estudo' | 'Concluída';
}

const Subjects = () => {
  const { user } = useAuth();
  const { toast: useToastHook } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', status: 'Nova' as const });
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [currentSubjectId, setCurrentSubjectId] = useState<string>('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  
  // Delete confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<{subjectId: string, topicId: string} | null>(null);
  
  // Edit subject states
  const [editSubjectDialog, setEditSubjectDialog] = useState(false);
  const [editSubject, setEditSubject] = useState({ id: '', name: '' });
  
  const topicInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper function to get CSS class based on status
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Nova':
        return 'status-nova';
      case 'Em Estudo':
        return 'status-em-estudo';
      case 'Concluída':
        return 'status-concluida';
      default:
        return '';
    }
  };

  // Open topic dialog function
  const openTopicDialog = (subjectId: string) => {
    setCurrentSubjectId(subjectId);
    setTopicDialogOpen(true);
    
    // Focus on input after dialog opens
    setTimeout(() => {
      if (topicInputRef.current) {
        topicInputRef.current.focus();
      }
    }, 100);
  };

  // Toggle expand function
  const toggleExpand = (subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectId);
    }
  };

  // Edit subject function
  const handleEditSubject = (subject: { id: string, name: string }) => {
    setEditSubject(subject);
    setEditSubjectDialog(true);
  };

  // Confirm delete subject function
  const confirmDeleteSubject = (id: string) => {
    setSubjectToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete topic function
  const confirmDeleteTopic = (subjectId: string, topicId: string) => {
    setTopicToDelete({subjectId, topicId});
    setDeleteConfirmOpen(false);
    setTimeout(() => setDeleteConfirmOpen(true), 100);
  };

  // Sortable subject component
  const SortableSubject = ({ subject }: { subject: Subject }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: subject.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <GlassCard className="overflow-hidden mb-4">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded"
                  {...listeners}
                >
                  <GripVertical className="h-5 w-5 text-gray-400" />
                </button>
                <span className={`status-badge ${getStatusClass(subject.status)}`}>
                  {subject.status}
                </span>
                <h2 className="text-lg font-medium">{subject.name}</h2>
                <span className="text-sm text-gray-500">
                  {subject.topics.length} tópicos
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <GradientButton 
                  variant="outline"
                  size="sm"
                  onClick={() => openTopicDialog(subject.id)}
                >
                  <LayoutList className="h-4 w-4 mr-2" />
                  Gerenciar Tópicos
                </GradientButton>
                <GradientButton 
                  variant="outline"
                  size="sm" 
                  onClick={() => toggleExpand(subject.id)}
                  className="p-2"
                >
                  {expandedSubject === subject.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </GradientButton>
                <GradientButton 
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSubject({ id: subject.id, name: subject.name })}
                  className="p-2"
                >
                  <Edit className="h-4 w-4" />
                </GradientButton>
                <GradientButton 
                  variant="outline"
                  size="sm"
                  onClick={() => confirmDeleteSubject(subject.id)}
                  className="p-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </GradientButton>
              </div>
            </div>
            
            {expandedSubject === subject.id && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Tópicos</h3>
                {subject.topics.length > 0 ? (
                  <ul className="space-y-2">
                    {subject.topics.map((topic) => (
                      <GlassCard key={topic.id} className="flex items-center justify-between p-2">
                        <span className="text-sm">{topic.name}</span>
                        <div className="flex items-center gap-1">
                          <GradientButton 
                            variant="outline"
                            size="sm" 
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => confirmDeleteTopic(subject.id, topic.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </GradientButton>
                        </div>
                      </GlassCard>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum tópico cadastrado</p>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    );
  };

  // Carregar matérias do usuário
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        // Buscar as disciplinas do usuário
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .order('priority', { ascending: true });
        
        if (subjectsError) throw subjectsError;
        
        // Para cada disciplina, buscar seus tópicos
        const subjectsWithTopics = await Promise.all(
          (subjectsData || []).map(async (subject) => {
            const { data: topicsData, error: topicsError } = await supabase
              .from('topics')
              .select('*')
              .eq('subject_id', subject.id);
            
            if (topicsError) throw topicsError;
            
            // Ensure status is a valid value for our Subject type
            let validStatus: 'Nova' | 'Em Estudo' | 'Concluída';
            if (subject.status === 'Nova' || subject.status === 'Em Estudo' || subject.status === 'Concluída') {
              validStatus = subject.status as 'Nova' | 'Em Estudo' | 'Concluída';
            } else {
              validStatus = 'Nova'; // Default to 'Nova' if status is not valid
            }
            
            return {
              id: subject.id,
              name: subject.name,
              status: validStatus,
              topics: topicsData || []
            };
          })
        );
        
        if (isMounted) {
          setSubjects(subjectsWithTopics as Subject[]);
        }
      } catch (error) {
        console.error('Erro ao buscar matérias:', error);
        if (isMounted) {
          useToastHook({
            title: "Erro",
            description: "Não foi possível carregar suas matérias. Por favor, tente novamente.",
            variant: "destructive"
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleAddSubject = async () => {
    if (!user) return;
    
    if (!newSubject.name) {
      useToastHook({
        title: "Erro",
        description: "O nome da matéria é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert({
          name: newSubject.name,
          user_id: user.id,
          priority: subjects.length + 1 // Define a prioridade com base no número de matérias existentes
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Adiciona a nova matéria à lista
        setSubjects(prev => [...prev, {
          id: data.id,
          name: data.name,
          status: 'Nova',
          topics: []
        }]);
        
        setNewSubject({ name: '', status: 'Nova' });
        setOpenDialog(false);
        
        toast.success("Matéria adicionada com sucesso");
      }
    } catch (error) {
      console.error('Erro ao adicionar matéria:', error);
      useToastHook({
        title: "Erro",
        description: "Não foi possível adicionar a matéria",
        variant: "destructive"
      });
    }
  };

  const executeDeleteSubject = async () => {
    if (!subjectToDelete) return;
    
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectToDelete);
        
      if (error) throw error;
      
      // Atualiza a lista de matérias
      setSubjects(prev => prev.filter(subject => subject.id !== subjectToDelete));
      toast.success("Matéria removida com sucesso");
    } catch (error) {
      console.error('Erro ao remover matéria:', error);
      useToastHook({
        title: "Erro",
        description: "Não foi possível remover a matéria",
        variant: "destructive"
      });
    } finally {
      setDeleteConfirmOpen(false);
      setSubjectToDelete(null);
    }
  };

  const saveSubjectEdit = async () => {
    try {
      const { error } = await supabase
        .from('subjects')
        .update({ name: editSubject.name, updated_at: new Date().toISOString() })
        .eq('id', editSubject.id);
        
      if (error) throw error;
      
      // Atualiza a matéria na lista
      setSubjects(prev => prev.map(subject => 
        subject.id === editSubject.id ? { ...subject, name: editSubject.name } : subject
      ));
      
      toast.success("Nome da matéria atualizado");
    } catch (error) {
      console.error('Erro ao atualizar matéria:', error);
      useToastHook({
        title: "Erro",
        description: "Não foi possível atualizar o nome da matéria",
        variant: "destructive"
      });
    } finally {
      setEditSubjectDialog(false);
    }
  };

  const handleTopicAdd = async () => {
    if (!newTopic) {
      useToastHook({
        title: "Erro",
        description: "O nome do tópico é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          name: newTopic,
          subject_id: currentSubjectId,
          completed: false,
          review_count: 0
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        // Adiciona o novo tópico à matéria correspondente
        setSubjects(prev => prev.map(subject => {
          if (subject.id === currentSubjectId) {
            return {
              ...subject,
              topics: [...subject.topics, data]
            };
          }
          return subject;
        }));
        
        setNewTopic('');
        
        // Mantém o foco no campo de entrada para adicionar mais tópicos
        if (topicInputRef.current) {
          topicInputRef.current.focus();
        }
        
        toast.success("Tópico adicionado com sucesso");
      }
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      useToastHook({
        title: "Erro",
        description: "Não foi possível adicionar o tópico",
        variant: "destructive"
      });
    }
  };

  const handleTopicKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTopic) {
      handleTopicAdd();
    }
  };

  const executeDeleteTopic = async () => {
    if (!topicToDelete) return;
    
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicToDelete.topicId);
        
      if (error) throw error;
      
      // Atualiza a lista de tópicos da matéria
      setSubjects(prev => prev.map(subject => {
        if (subject.id === topicToDelete.subjectId) {
          return {
            ...subject,
            topics: subject.topics.filter(topic => topic.id !== topicToDelete.topicId)
          };
        }
        return subject;
      }));
      
      toast.success("Tópico removido com sucesso");
    } catch (error) {
      console.error('Erro ao remover tópico:', error);
      useToastHook({
        title: "Erro",
        description: "Não foi possível remover o tópico",
        variant: "destructive"
      });
    } finally {
      setDeleteConfirmOpen(false);
      setTopicToDelete(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSubjects((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newSubjects = arrayMove(items, oldIndex, newIndex);
        
        // Atualizar a ordem no banco de dados
        updateSubjectsOrder(newSubjects);
        
        return newSubjects;
      });
    }
  };

  const updateSubjectsOrder = async (newSubjects: Subject[]) => {
    if (!user) return;

    try {
      // Atualizar a ordem de todas as matérias com todas as propriedades necessárias
      const updates = newSubjects.map((subject, index) => ({
        id: subject.id,
        name: subject.name,
        priority: index + 1,
        status: subject.status,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }));

      // Use upsert with onConflict parameter to update only the priority field
      const { error } = await supabase
        .from('subjects')
        .upsert(updates, { onConflict: 'id', ignoreDuplicates: false });

      if (error) throw error;

      toast.success("Ordem das matérias atualizada com sucesso");
    } catch (error) {
      console.error('Erro ao atualizar ordem das matérias:', error);
      toast.error("Erro ao atualizar ordem das matérias");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-app-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AnimatedTitle>Gerenciamento de Matérias</AnimatedTitle>
        <GradientButton 
          onClick={() => setOpenDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Matéria
        </GradientButton>
      </div>

      <div className="space-y-4 mt-6">
        {subjects.length === 0 ? (
          <GlassCard className="text-center py-10">
            <p className="text-gray-500">Você ainda não tem matérias cadastradas.</p>
            <GradientButton 
              className="mt-4"
              onClick={() => setOpenDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Matéria
            </GradientButton>
          </GlassCard>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={subjects.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {subjects.map((subject) => (
                <SortableSubject key={subject.id} subject={subject} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add Subject Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Matéria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm">Nome da Matéria</Label>
              <Input
                id="name"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                placeholder="Ex: Matemática, Português, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <GradientButton
              variant="outline"
              onClick={() => setOpenDialog(false)}
            >
              Cancelar
            </GradientButton>
            <GradientButton 
              onClick={handleAddSubject}
            >
              Adicionar
            </GradientButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={editSubjectDialog} onOpenChange={setEditSubjectDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Matéria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name" className="text-sm">Nome da Matéria</Label>
              <Input
                id="edit-name"
                value={editSubject.name}
                onChange={(e) => setEditSubject({ ...editSubject, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <GradientButton
              variant="outline"
              onClick={() => setEditSubjectDialog(false)}
            >
              Cancelar
            </GradientButton>
            <GradientButton 
              onClick={saveSubjectEdit}
            >
              Salvar
            </GradientButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Tópicos</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topic" className="text-sm">Nome do Tópico</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="topic"
                  ref={topicInputRef}
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyPress={handleTopicKeyPress}
                  placeholder="Ex: Concordância Verbal"
                />
                <GradientButton
                  onClick={handleTopicAdd}
                >
                  <Plus className="h-4 w-4" />
                </GradientButton>
              </div>
            </div>
            {currentSubjectId && (
              <div className="max-h-60 overflow-y-auto">
                <h3 className="text-sm font-medium mb-2">Tópicos Atuais</h3>
                {subjects.find(s => s.id === currentSubjectId)?.topics.map(topic => (
                  <GlassCard key={topic.id} className="flex items-center justify-between p-2 my-1">
                    <span className="text-sm">{topic.name}</span>
                    <GradientButton
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      onClick={() => confirmDeleteTopic(currentSubjectId, topic.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </GradientButton>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <GradientButton
              onClick={() => setTopicDialogOpen(false)}
            >
              Fechar
            </GradientButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Subject or Topic Deletion */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {subjectToDelete ? 
                "Tem certeza que deseja excluir esta matéria? Esta ação não pode ser desfeita." :
                "Tem certeza que deseja excluir este tópico? Esta ação não pode ser desfeita."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => subjectToDelete ? executeDeleteSubject() : executeDeleteTopic()} 
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Subjects;
