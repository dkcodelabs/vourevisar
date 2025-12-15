import React, { useState } from 'react';
import type { StudyCycleSubject, StudyCycleTopic, SubTopic } from '@/types/study-cycle';
// import { Difficulty } from '@/types/study-cycle'; // Removido - usando sistema de estrelas
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, Plus } from 'lucide-react';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicNotes } from '@/types';
import { toast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface StudyCycleNotesModalProps {
  isOpen: boolean;
  subject: StudyCycleSubject;
  topic: StudyCycleTopic;
  onClose: () => void;
  onSave: (subjectId: string, topicId: string, updatedData: Partial<Omit<StudyCycleTopic, 'id' | 'name' | 'reviewStatus'>>) => void;
}

const StudyCycleNotesModal: React.FC<StudyCycleNotesModalProps> = ({ isOpen, subject, topic, onClose, onSave }) => {
  console.log('🟢 MODAL: StudyCycleNotesModal montado/re-renderizado', {
    subjectId: subject.id,
    topicId: topic.id,
    timestamp: new Date().toISOString()
  });

  const [notes, setNotes] = useState<TopicNotes | undefined>(
    topic.notes ? { content: topic.notes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : undefined
  );
  // const [difficulty, setDifficulty] = useState(topic.difficulty ?? Difficulty.MEDIUM); // Removido - usando sistema de estrelas
  const [subTopics, setSubTopics] = useState<SubTopic[]>(topic.subTopics ?? []);
  const [newSubTopic, setNewSubTopic] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();

  // Log quando o componente é desmontado
  React.useEffect(() => {
    return () => {
      console.log('🔴 MODAL: StudyCycleNotesModal desmontado', {
        subjectId: subject.id,
        topicId: topic.id,
        timestamp: new Date().toISOString()
      });
    };
  }, [subject.id, topic.id]);

  const saveNotes = async (updatedNotes: TopicNotes) => {
    setIsSaving(true);
    try {
      onSave(subject.id, topic.id, {
        notes: updatedNotes.content,
        // difficulty, // Removido - usando sistema de estrelas
        subTopics
      });

      setNotes(updatedNotes);
      toast.success('Anotações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toast.error('Erro ao salvar anotações');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      setIsSaving(true);

      // Capturar conteúdo atual do editor
      const editorElement = document.querySelector('.ql-editor');
      const content = editorElement ? editorElement.innerHTML : notes?.content || '';

      // Salvar tudo
      onSave(subject.id, topic.id, {
        notes: content,
        // difficulty, // Removido - usando sistema de estrelas
        subTopics
      });

      toast.success('Dados salvos com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar dados');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubTopic = () => {
    if (newSubTopic.trim()) {
      setSubTopics([...subTopics, { id: crypto.randomUUID(), name: newSubTopic.trim() }]);
      setNewSubTopic('');
    }
  };

  const handleRemoveSubTopic = (id: string) => {
    setSubTopics(subTopics.filter(st => st.id !== id));
  };

  // Funções de dificuldade removidas - usando sistema de estrelas

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={isMobile ?
          "fixed inset-0 w-full h-full max-w-none m-0 rounded-none p-0 bg-card z-50" :
          "max-w-4xl w-full max-h-[90vh] overflow-hidden bg-card"
        }
        hideCloseButton={isMobile}
        aria-describedby="topic-notes-modal-description"
        style={isMobile ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: 'none',
          margin: 0
        } : undefined}
      >
        <DialogHeader className={`${isMobile ? 'p-4 border-b border-border' : 'p-6 pb-4'} bg-card`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-foreground">
                Anotações - {topic.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Matéria: {subject.name}
              </DialogDescription>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div id="topic-notes-modal-description" className="sr-only">
          Editor de anotações para o tópico. Use o editor de texto rico para criar e editar suas anotações de estudo.
        </div>

        {/* Content */}
        <div className={`${isMobile ? 'flex-1 overflow-y-auto p-4' : 'p-6 pt-2 overflow-y-auto max-h-[calc(90vh-12rem)]'} bg-background`}>
          <div className="space-y-6">
            {/* Anotações */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                📖 Anotações do Tópico
              </Label>
              <RichTextNotesEditor
                notes={notes}
                onSave={saveNotes}
                isLoading={isSaving}
                hideHeader={true}
              />
            </div>

            {/* Seção de Nível de Dificuldade removida - usando sistema de estrelas */}

            {/* Subtópicos */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                📋 Subtópicos Estudados
              </Label>

              <div className="flex gap-2 mb-3">
                <Input
                  value={newSubTopic}
                  onChange={(e) => setNewSubTopic(e.target.value)}
                  placeholder="Adicionar subtópico..."
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubTopic()}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddSubTopic}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {subTopics.length > 0 && (
                <div className="space-y-2 border rounded-lg p-2 bg-card">
                  {subTopics.map((subtopic) => (
                    <div
                      key={subtopic.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <span className="text-sm">{subtopic.name}</span>
                      <Button
                        onClick={() => handleRemoveSubTopic(subtopic.id)}
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`${isMobile ? 'p-4 border-t border-border' : 'p-6 pt-4 border-t border-border'} bg-card`}>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleSaveAndClose}
              className="flex items-center gap-2"
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar e Fechar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { StudyCycleNotesModal };
export default StudyCycleNotesModal;