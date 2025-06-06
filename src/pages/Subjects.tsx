import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit2, BookOpen, GripVertical, Target, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { useApp } from '@/contexts/AppContext';
import { Subject, Status } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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
  const navigate = useNavigate();
  const { subjects, isLoading, error, createSubject, deleteSubject, updateSubject } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newSubject, setNewSubject] = useState({
    name: ''
  });
  const [localSubjects, setLocalSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    setLocalSubjects(subjects);
  }, [subjects]);

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

  const resetForm = () => {
    setNewSubject({
      name: ''
    });
    setEditingSubject(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSubject.name.trim()) {
      toast.error("Por favor, insira o nome da matéria");
      return;
    }

    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, {
          name: newSubject.name.trim(),
        });
        toast.success("Matéria atualizada com sucesso!");
      } else {
        await createSubject({
          name: newSubject.name.trim(),
          status: 'Nova',
          color: '#3B82F6',
        });
        toast.success("Matéria criada com sucesso!");
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar matéria:', error);
      toast.error("Erro ao salvar matéria. Tente novamente.");
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setNewSubject({
      name: subject.name
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSubject(id);
      toast.success("Matéria excluída com sucesso!");
    } catch (error) {
      console.error('Erro ao excluir matéria:', error);
      toast.error("Erro ao excluir matéria. Tente novamente.");
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
    
    // Atualizar o estado local imediatamente
    setLocalSubjects(reorderedSubjects);
    
    try {
      // Atualizar prioridades diretamente no Supabase
      const updates = reorderedSubjects.map((subject, index) => ({
        id: subject.id,
        priority: index + 1,
        updated_at: new Date().toISOString()
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('subjects')
          .update({ 
            priority: update.priority, 
            updated_at: update.updated_at 
          })
          .eq('id', update.id);

        if (error) {
          throw error;
        }
      }

      toast.success("Ordem das matérias atualizada!");
    } catch (error) {
      console.error('Erro ao reordenar matérias:', error);
      toast.error("Erro ao atualizar ordem das matérias");
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

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  // Função para parar propagação de eventos nos botões
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

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
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Minhas Matérias</h1>
          <p className="text-gray-600 mt-1">Gerencie suas matérias de estudo</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Matéria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? 'Editar Matéria' : 'Nova Matéria'}
              </DialogTitle>
              <DialogDescription>
                {editingSubject 
                  ? 'Edite o nome da matéria'
                  : 'Adicione uma nova matéria aos seus estudos'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome da Matéria</label>
                <Input
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                  placeholder="Ex: Matemática, História..."
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSubject ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Matéria
            </Button>
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
                                  <BookOpen className="w-6 h-6 text-blue-600 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                      <h3 className="font-semibold text-lg truncate">{subject.name}</h3>
                                      <Badge className={getStatusColor(calculatedStatus)}>
                                        {calculatedStatus}
                                      </Badge>
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
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => handleButtonClick(e, () => handleViewTopics(subject))}
                                  >
                                    <BookOpen className="h-4 w-4 mr-1" />
                                    Tópicos
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => handleButtonClick(e, () => handleEdit(subject))}
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
                                          onClick={(e) => handleButtonClick(e, () => handleDelete(subject.id))}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
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
  );
};

export default Subjects;
