
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Check, X, BookOpen } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Subject, Topic } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useOptimisticTopics } from '@/hooks/useOptimisticTopics';

interface TopicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
}

const TopicsModal: React.FC<TopicsModalProps> = ({ isOpen, onClose, subject }) => {
  const { setSubjects } = useApp();
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Callback para atualizar os tópicos no contexto global
  const handleTopicsUpdate = (updatedTopics: Topic[]) => {
    setSubjects(prevSubjects => 
      prevSubjects.map(s => 
        s.id === subject.id 
          ? { ...s, topics: updatedTopics }
          : s
      )
    );
  };

  const {
    topics: localTopics,
    isLoading: isAdding,
    addTopic,
    updateTopic,
    deleteTopic
  } = useOptimisticTopics(subject.topics || [], subject.id, handleTopicsUpdate);

  const handleAddTopic = async () => {
    try {
      await addTopic(newTopicName);
      setNewTopicName('');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleStartEdit = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditingName(topic.name);
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      toast.error('Digite o nome do tópico');
      return;
    }

    if (editingTopicId) {
      try {
        await updateTopic(editingTopicId, { name: editingName.trim() });
        setEditingTopicId(null);
        setEditingName('');
      } catch (error) {
        // Erro já tratado no hook
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingTopicId(null);
    setEditingName('');
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este tópico?')) {
      try {
        await deleteTopic(topicId);
      } catch (error) {
        // Erro já tratado no hook
      }
    }
  };

  const getStatusBadge = (topic: Topic) => {
    if (topic.completed || topic.reviewStage === 'Concluído') {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Concluído</Badge>;
    }
    if (topic.reviewCount > 0 || topic.reviewStage) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Em Revisão</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Novo</Badge>;
  };

  // Auto-focus no campo de adição quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const input = document.getElementById('new-topic-input');
        if (input) input.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Tópicos de {subject.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário para adicionar novo tópico */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex gap-2">
              <Input
                id="new-topic-input"
                placeholder="Nome do novo tópico..."
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTopic();
                }}
                className="flex-1"
              />
              <Button 
                onClick={handleAddTopic}
                disabled={isAdding || !newTopicName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Lista de tópicos */}
          <div className="space-y-2">
            {localTopics.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum tópico cadastrado ainda.</p>
                <p className="text-sm">Adicione o primeiro tópico acima.</p>
              </div>
            ) : (
              <AnimatePresence>
                {localTopics.map((topic) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <BookOpen className="h-4 w-4 text-gray-400" />
                        
                        {editingTopicId === topic.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              className="flex-1"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{topic.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(topic)}
                                {topic.reviewCount > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {topic.reviewCount} revisões
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {editingTopicId !== topic.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(topic)}
                            className="hover:bg-gray-100"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTopic(topic.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer com estatísticas */}
          {localTopics.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total de tópicos: {localTopics.length}</span>
                <span>
                  Concluídos: {localTopics.filter(t => t.completed || t.reviewStage === 'Concluído').length}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TopicsModal;
