
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Check, X, BookOpen } from 'lucide-react';

import { Subject, Topic } from '@/types';
import { toast } from '@/lib/toast';
import { getTopicStatusInfo } from '@/utils/topicStatus';

import { useOptimisticTopics } from '@/hooks/useOptimisticTopics';

interface TopicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject;
  onUpdate?: () => void;
}

const TopicsModal: React.FC<TopicsModalProps> = ({ isOpen, onClose, subject, onUpdate }) => {
  // const { setSubjects } = useApp(); // Context removed
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Callback para atualizar os tópicos no contexto global
  const handleTopicsUpdate = (updatedTopics: Topic[]) => {
    // Apenas notificamos o pai para recarregar
    if (onUpdate) {
      onUpdate();
    }
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
    const statusInfo = getTopicStatusInfo(topic);
    return (
      <Badge className={`${statusInfo.colorClass} w-[110px] justify-center shadow-none font-medium`}>
        {statusInfo.label}
      </Badge>
    );
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="topics-modal-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Tópicos de {subject.name}
          </DialogTitle>
        </DialogHeader>
        <div id="topics-modal-description" className="sr-only">
          Gerencie os tópicos desta matéria. Adicione novos tópicos, edite ou exclua os existentes.
        </div>

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
              <div className="space-y-2">
                {localTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">

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
                            {/* Espaço fixo para a marcação de status */}
                            <div className="flex-shrink-0 mr-4">
                              {getStatusBadge(topic)}
                            </div>

                            <div className="flex-1 min-w-0 mr-4">
                              <h4
                                className="text-base font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer hover:text-blue-600 transition-colors truncate"
                                onClick={() => handleStartEdit(topic)}
                                title="Clique para editar"
                              >
                                {topic.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500">
                                  {getTopicStatusInfo(topic).type === 'novo' ? "Cobertura: Não iniciado" : "Cobertura: Estudado"}
                                </span>
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
                            onClick={() => handleDeleteTopic(topic.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer com estatísticas */}
          {localTopics.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total de tópicos: {localTopics.length}</span>
                <span>
                  Cobertura: {localTopics.filter(t => Boolean(t.first_studied_at) || t.reviewCount > 0 || t.review_count > 0).length} estudados
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
