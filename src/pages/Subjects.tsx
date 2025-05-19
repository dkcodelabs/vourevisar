import React, { useState, useRef, KeyboardEvent } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ChevronUp, ChevronDown, Edit, Trash2, LayoutList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
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

const Subjects = () => {
  const { subjects, addSubject, deleteSubject, addTopicToSubject, removeTopicFromSubject } = useApp();
  const { toast } = useToast();
  const [openDialog, setOpenDialog] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', status: 'Nova' as const });
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [currentSubjectId, setCurrentSubjectId] = useState<string>('');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<{subjectId: string, topicId: string} | null>(null);
  
  const topicInputRef = useRef<HTMLInputElement>(null);

  const handleAddSubject = () => {
    if (!newSubject.name) {
      toast({
        title: "Erro",
        description: "O nome da matéria é obrigatório",
        variant: "destructive"
      });
      return;
    }

    addSubject({
      name: newSubject.name,
      status: newSubject.status,
      topics: []
    });

    setNewSubject({ name: '', status: 'Nova' });
    setOpenDialog(false);

    toast({
      title: "Sucesso",
      description: "Matéria adicionada com sucesso",
    });
  };

  const handleDeleteSubject = (id: string) => {
    deleteSubject(id);
    toast({
      title: "Sucesso",
      description: "Matéria removida com sucesso",
    });
  };

  const handleTopicAdd = () => {
    if (!newTopic) {
      toast({
        title: "Erro",
        description: "O nome do tópico é obrigatório",
        variant: "destructive"
      });
      return;
    }

    addTopicToSubject(currentSubjectId, newTopic);
    setNewTopic('');
    
    // Keep focus on the input field for quick addition of multiple topics
    if (topicInputRef.current) {
      topicInputRef.current.focus();
    }

    toast({
      title: "Sucesso",
      description: "Tópico adicionado com sucesso",
    });
  };

  const handleTopicKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTopic) {
      handleTopicAdd();
    }
  };

  const confirmDeleteTopic = (subjectId: string, topicId: string) => {
    setTopicToDelete({subjectId, topicId});
    setDeleteConfirmOpen(true);
  };

  const executeDeleteTopic = () => {
    if (topicToDelete) {
      removeTopicFromSubject(topicToDelete.subjectId, topicToDelete.topicId);
      toast({
        title: "Sucesso",
        description: "Tópico removido com sucesso",
      });
      setDeleteConfirmOpen(false);
      setTopicToDelete(null);
    }
  };

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

  const toggleExpand = (subjectId: string) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subjectId);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciamento de Matérias</h1>
        <Button 
          className="bg-app-blue hover:bg-app-light-blue"
          onClick={() => setOpenDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Matéria
        </Button>
      </div>

      <div className="space-y-4 mt-6">
        {subjects.map((subject) => (
          <Card key={subject.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 bg-white">
                <div className="flex items-center gap-3">
                  <span className={`status-badge ${getStatusClass(subject.status)}`}>
                    {subject.status}
                  </span>
                  <h2 className="text-lg font-medium">{subject.name}</h2>
                  <span className="text-sm text-gray-500">
                    {subject.topics.length} tópicos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openTopicDialog(subject.id)}
                  >
                    <LayoutList className="h-4 w-4 mr-2" />
                    Gerenciar Tópicos
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => toggleExpand(subject.id)}
                  >
                    {expandedSubject === subject.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {expandedSubject === subject.id && (
                <div className="border-t p-4 bg-gray-50">
                  <h3 className="font-medium mb-2">Tópicos</h3>
                  {subject.topics.length > 0 ? (
                    <ul className="space-y-2">
                      {subject.topics.map((topic) => (
                        <li key={topic.id} className="flex items-center justify-between border p-2 rounded bg-white">
                          <span>{topic.name}</span>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-red-500 hover:text-red-700"
                              onClick={() => confirmDeleteTopic(subject.id, topic.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">Nenhum tópico cadastrado</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Subject Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Matéria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Matéria</Label>
              <Input
                id="name"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                placeholder="Ex: Matemática, Português, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-app-blue hover:bg-app-light-blue"
              onClick={handleAddSubject}
            >
              Adicionar
            </Button>
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
              <Label htmlFor="topic">Nome do Tópico</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="topic"
                  ref={topicInputRef}
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyPress={handleTopicKeyPress}
                  placeholder="Ex: Concordância Verbal"
                />
                <Button
                  className="bg-app-blue hover:bg-app-light-blue"
                  onClick={handleTopicAdd}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {currentSubjectId && (
              <div className="max-h-60 overflow-y-auto">
                <h3 className="font-medium mb-2">Tópicos Atuais</h3>
                {subjects.find(s => s.id === currentSubjectId)?.topics.map(topic => (
                  <div key={topic.id} className="flex items-center justify-between border p-2 rounded my-1">
                    <span>{topic.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => confirmDeleteTopic(currentSubjectId, topic.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setTopicDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Topic Deletion */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este tópico? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteTopic} className="bg-red-600 text-white hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Subjects;
