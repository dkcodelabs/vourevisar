import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, ThumbsUp, Minus, ThumbsDown, Plus } from 'lucide-react';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicReviewHistorySection } from '@/components/TopicReviewHistorySection';
import { TopicNotes } from '@/types';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
// import { Difficulty } from '@/types/study-cycle'; // Removido - usando sistema de estrelas
import { supabase } from '@/integrations/supabase/client';

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

  // Não renderizar se não tiver dados válidos
  if (!subjectId || !topicId) {
    console.log('🚫 Modal sem dados válidos, não renderizando');
    return null;
  }

  const [notes, setNotes] = useState<TopicNotes | undefined>(undefined);
  // const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM); // Removido - usando sistema de estrelas
  const [subTopics, setSubTopics] = useState<any[]>([]);
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

  // Carregar dados do tópico quando o modal abre
  useEffect(() => {
    if (isOpen && subjectId && topicId) {
      console.log('📖 Modal aberto com dados válidos, carregando...');
      loadTopicData();
    } else if (isOpen) {
      console.warn('⚠️ Modal aberto sem dados válidos:', { subjectId, topicId });
    }
  }, [isOpen, subjectId, topicId]);

  const loadTopicData = async () => {
    setIsLoading(true);
    try {
      console.log('📖 Carregando dados do tópico:', { subjectId, topicId });
      
      // Buscar dados do tópico via API
      const { data: topicData, error } = await supabase
        .from('topics')
        .select('notes')
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
      
      // Dificuldade removida - usando sistema de estrelas
      
      // Sub-tópicos serão gerenciados localmente por enquanto
      setSubTopics([]);
      
    } catch (error) {
      console.error('Erro ao carregar dados do tópico:', error);
      toast.error('Erro ao carregar dados do tópico');
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async (updatedNotes: TopicNotes) => {
    setIsSaving(true);
    try {
      console.log('💾 Salvando anotações:', { subjectId, topicId, notes: updatedNotes });
      
      // Salvar no banco de dados
      const { error } = await supabase
        .from('topics')
        .update({ 
          notes: updatedNotes as any,
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
      
      // Salvar tudo no banco
      const { error } = await supabase
        .from('topics')
        .update({ 
          notes: {
            content: content.trim(),
            updatedAt: new Date().toISOString(),
            createdAt: notes?.createdAt || new Date().toISOString()
          } as any,
          // difficulty_level: difficulty, // Removido - usando sistema de estrelas
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
      toast.error('Erro ao salvar dados');
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
                Anotações - {topicName}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Matéria: {subjectName}
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
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Anotações */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  📖 Anotações do Tópico
                </Label>
                <RichTextNotesEditor
                  notes={notes}
                  onSave={saveNotes}
                  isLoading={isLoading || isSaving}
                  onChange={handleNotesChange}
                  hideHeader={true}
                />
              </div>

              {/* Histórico de Revisões */}
              <TopicReviewHistorySection 
                topicId={topicId}
              />

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
          )}
        </div>

        {/* Footer */}
        <div className={`${isMobile ? 'p-4 border-t border-border' : 'p-6 pt-4 border-t border-border'} bg-card`}>
          <div className="flex justify-end">
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

export default StudyCycleTopicNotesModal;