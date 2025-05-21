
import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Subject } from '@/types';
import DraggableSubjectList from '@/components/DraggableSubjectList';

const Subjects = () => {
  const { subjects, addSubject, updateSubject, deleteSubject, addTopicToSubject, removeTopicFromSubject } = useApp();
  const [showAddSubjectDialog, setShowAddSubjectDialog] = useState(false);
  const [showAddTopicDialog, setShowAddTopicDialog] = useState(false);
  const [showDeleteSubjectDialog, setShowDeleteSubjectDialog] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Função para lidar com o reordenamento de matérias
  const handleReorderSubjects = async (reorderedSubjects: Subject[]) => {
    try {
      // Para cada matéria reordenada, atualizar sua prioridade no banco de dados
      for (const subject of reorderedSubjects) {
        await updateSubject(subject.id, { priority: subject.priority });
      }
      
      toast.success("Ordem das matérias atualizada com sucesso");
    } catch (error) {
      console.error('Erro ao reordenar matérias:', error);
      toast.error("Erro ao atualizar ordem das matérias");
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error("O nome da matéria não pode estar vazio");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addSubject({
        name: newSubjectName,
        topics: [],
        status: 'Nova'
      });
      
      setNewSubjectName('');
      setShowAddSubjectDialog(false);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTopic = async () => {
    if (!selectedSubject) return;
    if (!newTopicName.trim()) {
      toast.error("O nome do tópico não pode estar vazio");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await addTopicToSubject(selectedSubject.id, newTopicName);
      setNewTopicName('');
      setShowAddTopicDialog(false);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!selectedSubject) return;
    
    setIsSubmitting(true);
    
    try {
      await deleteSubject(selectedSubject.id);
      setSelectedSubject(null);
      setShowDeleteSubjectDialog(false);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!selectedSubject) return;
    
    try {
      await removeTopicFromSubject(selectedSubject.id, topicId);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Matérias</h1>
        <Button 
          className="bg-app-blue hover:bg-app-light-blue"
          onClick={() => setShowAddSubjectDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Matéria
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">Suas matérias</h2>
            <div className="text-sm text-gray-500">
              {subjects.length} matérias
            </div>
          </div>
          
          <DraggableSubjectList 
            subjects={subjects} 
            onReorder={handleReorderSubjects} 
            onSubjectClick={handleSubjectClick} 
          />
        </div>
        
        <div className="md:col-span-7">
          {selectedSubject ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">{selectedSubject.name} - Tópicos</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSubject(null);
                    }}
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteSubjectDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir Matéria
                  </Button>
                  <Button
                    className="bg-app-blue hover:bg-app-light-blue"
                    onClick={() => setShowAddTopicDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Tópico
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg">
                {selectedSubject.topics.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">Esta matéria não possui tópicos.</p>
                    <Button
                      className="mt-4 bg-app-blue hover:bg-app-light-blue"
                      onClick={() => setShowAddTopicDialog(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Tópico
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {selectedSubject.topics.map((topic) => (
                      <div key={topic.id} className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{topic.name}</h3>
                          <div className="text-sm text-gray-500">
                            {topic.completed ? 'Concluído' : 'Não concluído'} • 
                            Revisões: {topic.reviewCount}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteTopic(topic.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-8 text-center">
              <h2 className="text-xl font-medium mb-2">Selecione uma matéria</h2>
              <p className="text-gray-500">
                Selecione uma matéria à esquerda para visualizar ou adicionar tópicos.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Dialog para adicionar uma nova matéria */}
      <Dialog open={showAddSubjectDialog} onOpenChange={setShowAddSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Matéria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="subject-name">Nome da Matéria</Label>
              <Input
                id="subject-name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Ex: Português, Matemática, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddSubjectDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-app-blue hover:bg-app-light-blue"
              onClick={handleAddSubject}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para adicionar um novo tópico */}
      <Dialog open={showAddTopicDialog} onOpenChange={setShowAddTopicDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Tópico para {selectedSubject?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topic-name">Nome do Tópico</Label>
              <Input
                id="topic-name"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Ex: Concordância Verbal, Funções, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddTopicDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-app-blue hover:bg-app-light-blue"
              onClick={handleAddTopic}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para excluir uma matéria */}
      <Dialog open={showDeleteSubjectDialog} onOpenChange={setShowDeleteSubjectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Matéria?</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Tem certeza de que deseja excluir a matéria <strong>{selectedSubject?.name}</strong>? 
              Esta ação também excluirá todos os tópicos associados e não poderá ser desfeita.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteSubjectDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteSubject}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subjects;
