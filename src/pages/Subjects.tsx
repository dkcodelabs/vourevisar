
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit2, BookOpen, GripVertical, Target, Clock, CheckCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import { useApp } from '@/contexts/AppContext';
import { Subject, Status } from '@/types';

const colorOptions = [
  { name: 'Azul', value: '#3B82F6', bgClass: 'bg-blue-500' },
  { name: 'Verde', value: '#10B981', bgClass: 'bg-emerald-500' },
  { name: 'Roxo', value: '#8B5CF6', bgClass: 'bg-violet-500' },
  { name: 'Rosa', value: '#EC4899', bgClass: 'bg-pink-500' },
  { name: 'Laranja', value: '#F97316', bgClass: 'bg-orange-500' },
  { name: 'Vermelho', value: '#EF4444', bgClass: 'bg-red-500' },
  { name: 'Amarelo', value: '#EAB308', bgClass: 'bg-yellow-500' },
  { name: 'Índigo', value: '#6366F1', bgClass: 'bg-indigo-500' },
];

const statusOptions: Status[] = ['Nova', 'Em Estudo', 'Concluída'];

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
    name: '',
    status: 'Nova' as Status,
    color: colorOptions[0].value
  });

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
      name: '',
      status: 'Nova',
      color: colorOptions[0].value
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
          status: newSubject.status,
          color: newSubject.color,
        });
        toast.success("Matéria atualizada com sucesso!");
      } else {
        await createSubject({
          name: newSubject.name.trim(),
          status: newSubject.status,
          color: newSubject.color,
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
      name: subject.name,
      status: subject.status,
      color: subject.color || colorOptions[0].value
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

    const oldIndex = subjects.findIndex((subject) => subject.id === active.id);
    const newIndex = subjects.findIndex((subject) => subject.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSubjects = arrayMove(subjects, oldIndex, newIndex);
    
    // Criar dados de atualização em lote com apenas os campos necessários
    const updateData = reorderedSubjects.map((subject, index) => ({
      id: subject.id,
      priority: index + 1,
      updated_at: new Date().toISOString()
    }));

    try {
      const response = await fetch('/api/subjects/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates: updateData }),
      });

      if (!response.ok) {
        throw new Error('Falha ao reordenar matérias');
      }

      toast.success("Ordem das matérias atualizada!");
    } catch (error) {
      console.error('Erro ao reordenar matérias:', error);
      toast.error("Erro ao atualizar ordem das matérias");
    }
  };

  const getSubjectProgress = (subject: Subject) => {
    if (subject.topics.length === 0) return 0;
    const completedTopics = subject.topics.filter(topic => 
      topic.reviewStage === 'Concluído' && topic.nextReview === null
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
                  ? 'Edite as informações da matéria'
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
              
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={newSubject.status} 
                  onValueChange={(value: Status) => setNewSubject({...newSubject, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Cor</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full ${color.bgClass} ${
                        newSubject.color === color.value 
                          ? 'ring-2 ring-offset-2 ring-gray-400' 
                          : ''
                      }`}
                      onClick={() => setNewSubject({...newSubject, color: color.value})}
                      title={color.name}
                    />
                  ))}
                </div>
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
      {subjects.length === 0 ? (
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
          <SortableContext items={subjects.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-4">
              <AnimatePresence>
                {subjects.map((subject) => {
                  const progress = getSubjectProgress(subject);
                  return (
                    <SortableItem key={subject.id} id={subject.id}>
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 flex-1">
                                <div className="cursor-move p-1">
                                  <GripVertical className="h-5 w-5 text-gray-400" />
                                </div>
                                
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: subject.color }}
                                />
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold text-lg truncate">{subject.name}</h3>
                                    <Badge className={getStatusColor(subject.status)}>
                                      {subject.status}
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
                              
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewTopics(subject)}
                                >
                                  <BookOpen className="h-4 w-4 mr-1" />
                                  Tópicos
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(subject)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
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
                                        onClick={() => handleDelete(subject.id)}
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
