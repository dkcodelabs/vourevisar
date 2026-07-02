import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, ThumbsUp, Minus, ThumbsDown, Plus, MessageSquareText } from 'lucide-react';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicReviewHistorySection } from '@/components/TopicReviewHistorySection';
import { TopicNotes } from '@/types';
import { toast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { sanitizeHtml } from '@/lib/sanitize';
// import { Difficulty } from '@/types/study-cycle'; // Removido - usando sistema de estrelas
import { supabase } from '@/integrations/supabase/client';
import { toastGate } from '@/lib/errors/toastGate';
import type { Json } from '@/integrations/supabase/types';
import type { SubTopic } from '@/types/study-cycle';

interface StudyCycleTopicNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  subjectId: string;
  topicId: string;
  subjectName: string;
  topicName: string;
}

const StudyCycleTopicNotesModal: React.FC<StudyCycleTopicNotesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjectId,
  topicId,
  subjectName,
  topicName
}) => {
  console.log('🟢 MODAL: StudyCycleTopicNotesModal montado/re-renderizado', {
    subjectId,
    topicId,
    isOpen,
    timestamp: new Date().toISOString()
  });

  const [notes, setNotes] = useState<TopicNotes | undefined>(undefined);
  // const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM); // Removido - usando sistema de estrelas
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [newSubTopic, setNewSubTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isMobile = useIsMobile();

  // Log quando o componente é desmontado
  React.useEffect(() => {
    return () => {
      console.log('🔴 MODAL: StudyCycleTopicNotesModal desmontado', {
        subjectId,
        topicId,
        timestamp: new Date().toISOString()
      });
    };
  }, [subjectId, topicId]);

  const loadTopicData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('📖 Carregando dados do tópico:', { subjectId, topicId });

      // Buscar dados do tópico via API
      const { data: topicData, error } = await supabase
        .from('topics')
        .select('notes, subtopics')
        .eq('id', topicId)
        .single();

      if (error) {
        console.error('Erro ao buscar tópico:', error);
        throw error;
      }

      // Configurar dados carregados
      if (topicData?.notes) {
        setNotes(topicData.notes as TopicNotes);
      }

      // Sub-tópicos
      if (topicData?.subtopics) {
        setSubTopics(topicData.subtopics as unknown as SubTopic[]);
      } else {
        setSubTopics([]);
      }

    } catch (error) {
      console.error('Erro ao carregar dados do tópico:', error);
      toastGate.notifyError('Erro ao carregar dados do tópico', 'COMPONENTS-STUDY-CYCLE-STUDYCYCLETOPICNOTESMODAL-01', { severity: 'medium' });
    } finally {
      setIsLoading(false);
    }
  }, [subjectId, topicId]);

  // Carregar dados do tópico quando o modal abre
  useEffect(() => {
    if (isOpen && subjectId && topicId) {
      console.log('📖 Modal aberto com dados válidos, carregando...');
      loadTopicData();
    } else if (isOpen) {
      console.warn('⚠️ Modal aberto sem dados válidos:', { subjectId, topicId });
    }
  }, [isOpen, loadTopicData, subjectId, topicId]);

  const saveNotes = async (updatedNotes: TopicNotes) => {
    setIsSaving(true);
    try {
      console.log('💾 Salvando anotações:', { subjectId, topicId, notes: updatedNotes });

      // Salvar no banco de dados
      const { error } = await supabase
        .from('topics')
        .update({
          notes: updatedNotes as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', topicId);

      if (error) {
        console.error('Erro ao salvar no banco:', error);
        throw error;
      }

      setNotes(updatedNotes);
      setHasUnsavedChanges(false);
      toast.success('Anotações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toastGate.notifyError('Erro ao salvar anotações', 'COMPONENTS-STUDY-CYCLE-STUDYCYCLETOPICNOTESMODAL-02', { severity: 'medium' });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      setIsSaving(true);

      // Capturar conteúdo atual do editor (sanitizado para segurança)
      const editorElement = document.querySelector('.ql-editor');
      const rawContent = editorElement ? editorElement.innerHTML : notes?.content || '';
      const content = sanitizeHtml(rawContent);

      // Salvar tudo no banco
      const { error } = await supabase
        .from('topics')
        .update({
          notes: {
            content: content.trim(),
            updatedAt: new Date().toISOString(),
            createdAt: notes?.createdAt || new Date().toISOString()
          } as unknown as Json,
          subtopics: subTopics as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', topicId);

      if (error) {
        console.error('Erro ao salvar dados completos:', error);
        throw error;
      }

      toast.success('Dados salvos com sucesso!');

      if (onSave) {
        onSave();
      }

      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toastGate.notifyError('Erro ao salvar dados', 'COMPONENTS-STUDY-CYCLE-STUDYCYCLETOPICNOTESMODAL-03', { severity: 'medium' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotesChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleAddSubTopic = () => {
    if (newSubTopic.trim()) {
      setSubTopics([...subTopics, { id: crypto.randomUUID(), name: newSubTopic.trim() }]);
      setNewSubTopic('');
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveSubTopic = (id: string) => {
    setSubTopics(subTopics.filter(st => st.id !== id));
    setHasUnsavedChanges(true);
  };

  // Funções de dificuldade removidas - usando sistema de estrelas

  // Não renderizar se não tiver dados válidos
  if (!subjectId || !topicId) {
    console.log('🚫 Modal sem dados válidos, não renderizando');
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={isMobile ?
          "fixed inset-0 w-full h-full max-w-none m-0 rounded-none p-0 bg-card z-50" :
          "max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden bg-card border-border !p-0 !gap-0"
        }
        hideCloseButton={true}
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
        <div className={`${isMobile ? 'p-4 border-b border-border bg-card' : 'p-6 bg-secondary/30 border-b border-border sm:rounded-token'}`}>
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!isMobile && (
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <MessageSquareText size={24} />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    {subjectName}
                  </DialogTitle>
                  {!isMobile && (
                    <div className="text-sm text-content-muted font-light">
                      {topicName}
                    </div>
                  )}
                <DialogDescription className="sr-only">
                  Editor de anotações para {topicName}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-content-muted hover:text-foreground"
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </Button>
          </div>
          {isMobile && (
            <p className="text-sm text-content-muted mt-1">{topicName}</p>
          )}
        </div>

        <div id="topic-notes-modal-description" className="sr-only">
          Editor de anotações para o tópico. Use o editor de texto rico para criar e editar suas anotações de estudo.
        </div>

        {/* Content */}
        <div className={`${isMobile ? 'flex-1 overflow-y-auto p-4' : 'flex-1 min-h-0 overflow-y-auto p-6 pt-2'} bg-background`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Histórico de Revisões */}
              <TopicReviewHistorySection
                topicId={topicId}
              />

              {/* Anotações */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  📖 Anotações
                </Label>
                <RichTextNotesEditor
                  notes={notes}
                  onSave={saveNotes}
                  isLoading={isLoading || isSaving}
                  onChange={handleNotesChange}
                  hideHeader={true}
                />
              </div>

              {/* Seção de Nível de Dificuldade removida - usando sistema de estrelas */}

              {/* Subtópicos */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  📋 Subtópicos
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
          )}
        </div>

        {/* Footer */}
        <div className={`${isMobile ? 'p-4 border-t border-border' : 'p-6 pt-4 border-t border-border'} bg-card flex-none`}>
          <div className="flex justify-between items-center gap-3">
            <Button
              onClick={async () => {
                try {
                  setIsSaving(true);

                  // Capturar conteúdo atual do editor (sanitizado para segurança)
                  const editorElement = document.querySelector('.ql-editor');
                  const rawContent = editorElement ? editorElement.innerHTML : notes?.content || '';
                  const content = sanitizeHtml(rawContent);

                  // Salvar apenas as anotações e subtópicos
                  const { error } = await supabase
                    .from('topics')
                    .update({
                      notes: {
                        content: content.trim(),
                        updatedAt: new Date().toISOString(),
                        createdAt: notes?.createdAt || new Date().toISOString()
                      } as unknown as Json,
                      subtopics: subTopics as unknown as Json,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', topicId);

                  if (error) {
                    console.error('Erro ao salvar:', error);
                    throw error;
                  }

                  setHasUnsavedChanges(false);
                  toast.success('Anotações salvas!');
                } catch (error) {
                  console.error('Erro ao salvar:', error);
                  toastGate.notifyError('Erro ao salvar anotações', 'COMPONENTS-STUDY-CYCLE-STUDYCYCLETOPICNOTESMODAL-04', { severity: 'medium' });
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving || !hasUnsavedChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>

            <Button
              onClick={handleSaveAndClose}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar e Fechar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudyCycleTopicNotesModal;
