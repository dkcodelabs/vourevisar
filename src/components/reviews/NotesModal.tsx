
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, ThumbsUp, Minus, ThumbsDown, Plus } from 'lucide-react';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicNotes, DifficultyLevel, TopicSubtopic } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useApp } from '@/contexts/AppContext';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicName: string;
  subjectName: string;
}

const NotesModal: React.FC<NotesModalProps> = ({
  isOpen,
  onClose,
  topicId,
  topicName,
  subjectName
}) => {
  const [notes, setNotes] = useState<TopicNotes | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [subtopics, setSubtopics] = useState<TopicSubtopic[]>([]);
  const [newSubtopic, setNewSubtopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isMobile = useIsMobile();
  const { refreshData } = useApp();

  // Buscar notas do tópico
  useEffect(() => {
    if (isOpen && topicId) {
      loadTopicNotes();
    }
  }, [isOpen, topicId]);

  const loadTopicNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('notes, difficulty_level, subtopics, difficulty_set_at')
        .eq('id', topicId)
        .single();

      if (error) throw error;

      if (data?.notes) {
        setNotes(data.notes as TopicNotes);
      } else {
        setNotes(undefined);
      }
      
      setDifficulty((data?.difficulty_level as DifficultyLevel) || null);
      setSubtopics((data?.subtopics as unknown as TopicSubtopic[]) || []);
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
      toast.error('Erro ao carregar anotações');
    } finally {
      setIsLoading(false);
    }
  };


  const saveNotes = async (updatedNotes: TopicNotes) => {
    setIsSaving(true);
    try {
      const updates: any = {
        notes: updatedNotes as any,
        difficulty_level: difficulty,
        subtopics: subtopics,
        difficulty_set_at: difficulty ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('topics')
        .update(updates)
        .eq('id', topicId);

      if (error) throw error;

      setNotes(updatedNotes);
      setHasUnsavedChanges(false);
      toast.success('Dados salvos com sucesso!');
      
      // Atualizar dados localmente em background
      refreshData();
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toast.error('Erro ao salvar anotações');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    try {
      // Forçar salvamento sem fechar
      const editorComponent = document.querySelector('.ql-editor');
      if (editorComponent) {
        const content = editorComponent.innerHTML;
        const notesToSave: TopicNotes = {
          content: content.trim(),
          updatedAt: new Date().toISOString(),
          createdAt: notes?.createdAt || new Date().toISOString()
        };
        await saveNotes(notesToSave);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleNotesChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleAddSubtopic = () => {
    if (newSubtopic.trim()) {
      const subtopic: TopicSubtopic = {
        id: crypto.randomUUID(),
        name: newSubtopic.trim(),
        addedAt: new Date().toISOString()
      };
      setSubtopics([...subtopics, subtopic]);
      setNewSubtopic('');
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveSubtopic = (id: string) => {
    setSubtopics(subtopics.filter(s => s.id !== id));
    setHasUnsavedChanges(true);
  };

  const getDifficultyButtonStyle = (level: DifficultyLevel) => {
    const isSelected = difficulty === level;
    switch (level) {
      case 'easy':
        return isSelected 
          ? 'bg-green-500 text-white border-green-500' 
          : 'border-green-200 text-green-600 hover:bg-green-50';
      case 'medium':
        return isSelected 
          ? 'bg-yellow-500 text-white border-yellow-500' 
          : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50';
      case 'hard':
        return isSelected 
          ? 'bg-red-500 text-white border-red-500' 
          : 'border-red-200 text-red-600 hover:bg-red-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={isMobile ? 
          "fixed inset-0 w-full h-full max-w-none m-0 rounded-none p-0 bg-white z-50" : 
          "max-w-4xl w-full max-h-[90vh] overflow-hidden"
        }
        hideCloseButton={isMobile}
        aria-describedby="notes-modal-description"
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
        <DialogHeader className={`${isMobile ? 'p-4 border-b' : 'p-6 pb-4'} bg-white`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Anotações - {topicName}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {subjectName}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveOnly}
                className="flex items-center gap-2"
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
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
          </div>
        </DialogHeader>
        
        <div id="notes-modal-description" className="sr-only">
          Editor de anotações para o tópico. Use o editor de texto rico para criar e editar suas anotações de estudo.
        </div>

        {/* Content */}
        <div className={`${isMobile ? 'flex-1 overflow-y-auto p-4' : 'p-6 pt-2 overflow-y-auto max-h-[calc(90vh-8rem)]'} bg-gray-50`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Anotações */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  📝 Anotações
                </Label>
                <RichTextNotesEditor
                  notes={notes}
                  onSave={saveNotes}
                  isLoading={isLoading || isSaving}
                  onChange={handleNotesChange}
                  hideHeader={true}
                />
              </div>

              {/* Nível de Dificuldade */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  📊 Nível de Dificuldade
                </Label>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className={getDifficultyButtonStyle('easy')}
                    onClick={() => {
                      const newDifficulty = difficulty === 'easy' ? null : 'easy';
                      setDifficulty(newDifficulty);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Fácil
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={getDifficultyButtonStyle('medium')}
                    onClick={() => {
                      const newDifficulty = difficulty === 'medium' ? null : 'medium';
                      setDifficulty(newDifficulty);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Médio
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={getDifficultyButtonStyle('hard')}
                    onClick={() => {
                      const newDifficulty = difficulty === 'hard' ? null : 'hard';
                      setDifficulty(newDifficulty);
                      setHasUnsavedChanges(true);
                    }}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Difícil
                  </Button>
                </div>
              </div>

              {/* Subtópicos */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  📋 Subtópicos Estudados
                </Label>
                
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newSubtopic}
                    onChange={(e) => setNewSubtopic(e.target.value)}
                    placeholder="Adicionar subtópico..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtopic()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddSubtopic}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {subtopics.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-2 bg-white">
                    {subtopics.map((subtopic) => (
                      <div
                        key={subtopic.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm">{subtopic.name}</span>
                        <Button
                          onClick={() => handleRemoveSubtopic(subtopic.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default NotesModal;
