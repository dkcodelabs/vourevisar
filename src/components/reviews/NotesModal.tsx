
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Save, ThumbsUp, Minus, ThumbsDown, Plus, MessageSquareText } from 'lucide-react';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicNotes, TopicSubtopic } from '@/types';
// import { DifficultyLevel } from '@/types'; // Removido - usando sistema de estrelas
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useApp } from '@/contexts/AppContext';
import { TopicReviewHistorySection } from '@/components/TopicReviewHistorySection';
import { useCycleState } from '@/hooks/useCycleState';
import { registerDualProgress, registerSubjectDualProgress } from '@/services/cycleMergeService';
import { toastGate } from '@/lib/errors/toastGate';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  topicId: string;
  topicName: string;
  subjectName: string;
  showSubjectNotes?: boolean; // Controla se deve mostrar anotações da matéria
}

const NotesModal: React.FC<NotesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  topicId,
  topicName,
  subjectName,
  showSubjectNotes = true // Por padrão, mostra anotações da matéria (comportamento atual)
}) => {
  const [notes, setNotes] = useState<TopicNotes | undefined>(undefined);
  const [subjectNotes, setSubjectNotes] = useState<TopicNotes | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<string>('');
  // const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null); // Removido - usando sistema de estrelas
  const [subtopics, setSubtopics] = useState<TopicSubtopic[]>([]);
  const [newSubtopic, setNewSubtopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeEditor, setActiveEditor] = useState<'subject' | 'topic'>('topic');
  const [currentSubjectContent, setCurrentSubjectContent] = useState('');
  const [currentTopicContent, setCurrentTopicContent] = useState('');
  const isMobile = useIsMobile();
  const { refreshData } = useApp();
  const { userCycle } = useCycleState();

  // Buscar notas do tópico
  useEffect(() => {
    if (isOpen && topicId) {
      // Verificar se é um ID temporário (não é UUID válido)
      if (topicId.startsWith('temp-')) {
        // Para IDs temporários, apenas inicializar com valores vazios
        setNotes(undefined);
        // setDifficulty(null); // Removido - usando sistema de estrelas
        setSubtopics([]);
        setIsLoading(false);
      } else {
        loadTopicNotes();
      }
    }
  }, [isOpen, topicId]);

  const loadTopicNotes = async () => {
    setIsLoading(true);
    try {
      // Carregar anotações do tópico
      const { data: topicData, error: topicError } = await supabase
        .from('topics')
        .select('notes, subtopics, subject_id')
        .eq('id', topicId)
        .single();

      if (topicError) throw topicError;

      if (topicData?.notes) {
        const topicNotesData = topicData.notes as TopicNotes;
        setNotes(topicNotesData);
        setCurrentTopicContent(topicNotesData.content || '');
      } else {
        setNotes(undefined);
        setCurrentTopicContent('');
      }

      // setDifficulty((topicData?.difficulty_level as DifficultyLevel) || null); // Removido - usando sistema de estrelas
      setSubtopics((topicData?.subtopics as unknown as TopicSubtopic[]) || []);

      // Carregar anotações da matéria apenas se showSubjectNotes for true
      if (showSubjectNotes && topicData?.subject_id) {
        setSubjectId(topicData.subject_id);
        const { data: subjectData, error: subjectError } = await supabase
          .from('subjects')
          .select('notes')
          .eq('id', topicData.subject_id)
          .single();

        if (subjectError) {
          console.warn('Erro ao carregar anotações da matéria:', subjectError);
          setSubjectNotes(undefined);
        } else {
          const subjectNotesData = subjectData?.notes as TopicNotes || undefined;
          setSubjectNotes(subjectNotesData);
          setCurrentSubjectContent(subjectNotesData?.content || '');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
      toastGate.notifyError('Erro ao carregar anotações', 'COMPONENTS-REVIEWS-NOTESMODAL-01', { severity: 'medium' });
    } finally {
      setIsLoading(false);
    }
  };


  const saveNotes = async (updatedNotes: TopicNotes) => {
    setIsSaving(true);
    try {
      // Verificar se é um ID temporário
      if (topicId.startsWith('temp-')) {
        // Para IDs temporários, apenas simular o salvamento
        console.log('Salvando anotações temporárias:', {
          topicId,
          notes: updatedNotes,
          // difficulty, // Removido - usando sistema de estrelas
          subtopics
        });
        setNotes(updatedNotes);
        setHasUnsavedChanges(false);
        toast.success('Anotações salvas!');
        return;
      }

      const updates: any = {
        notes: updatedNotes as any,
        // difficulty_level: difficulty, // Removido - usando sistema de estrelas
        subtopics: subtopics,
        // difficulty_set_at: difficulty ? new Date().toISOString() : null, // Removido - usando sistema de estrelas
        updated_at: new Date().toISOString()
      };

      // Log removido para otimização

      const { error } = await supabase
        .from('topics')
        .update(updates)
        .eq('id', topicId);

      if (error) throw error;

      // 🔄 Propagação profunda v2.2: Replicar anotações do tópico para irmãos
      if (!topicId.startsWith('temp-')) {
        try {
          const unificationMap = userCycle?.unification_map ?? null;
          await registerDualProgress(topicId, { notes: updatedNotes as any, subtopics: subtopics }, unificationMap);
        } catch (dualErr) {
          console.warn('⚠️ Falha na propagação das anotações do tópico (não-bloqueante):', dualErr);
        }
      }

      // Log removido para otimização
      setNotes(updatedNotes);
      setHasUnsavedChanges(false);
      toast.success('Dados salvos com sucesso!');

      // Não atualizar dados - evitar refresh da página
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toastGate.notifyError('Erro ao salvar anotações', 'COMPONENTS-REVIEWS-NOTESMODAL-02', { severity: 'medium' });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    try {
      setIsSaving(true);

      // Salvar anotações da matéria se houver conteúdo e showSubjectNotes for true
      if (showSubjectNotes && currentSubjectContent && currentSubjectContent.trim() !== '<p><br></p>' && currentSubjectContent.trim() !== '') {
        const subjectNotesToSave: TopicNotes = {
          content: currentSubjectContent.trim(),
          updatedAt: new Date().toISOString(),
          createdAt: subjectNotes?.createdAt || new Date().toISOString()
        };
        await saveSubjectNotes(subjectNotesToSave);
      }

      // Salvar anotações do tópico se houver conteúdo
      if (currentTopicContent && currentTopicContent.trim() !== '<p><br></p>' && currentTopicContent.trim() !== '') {
        const topicNotesToSave: TopicNotes = {
          content: currentTopicContent.trim(),
          updatedAt: new Date().toISOString(),
          createdAt: notes?.createdAt || new Date().toISOString()
        };
        await saveNotes(topicNotesToSave);
      }

      // Salvar dificuldade e subtópicos se houver mudanças
      if (hasUnsavedChanges && !topicId.startsWith('temp-')) {
        const updates: any = {
          // difficulty_level: difficulty, // Removido - usando sistema de estrelas
          subtopics: subtopics,
          // difficulty_set_at: difficulty ? new Date().toISOString() : null, // Removido - usando sistema de estrelas
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('topics')
          .update(updates)
          .eq('id', topicId);

        if (error) throw error;
      }

      toast.success('Dados salvos com sucesso!');

      // Fechar modal após sucesso
      if (onSave) {
        onSave();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toastGate.notifyError('Erro ao salvar dados', 'COMPONENTS-REVIEWS-NOTESMODAL-03', { severity: 'medium' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveSubjectNotes = async (updatedNotes: TopicNotes) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          notes: updatedNotes as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', subjectId);

      if (error) throw error;

      // 🔄 Propagação profunda v2.2: Replicar anotações da matéria para irmãos (mesclados)
      try {
        const unificationMap = userCycle?.unification_map ?? null;
        await registerSubjectDualProgress(subjectId, { notes: updatedNotes as any }, unificationMap);
      } catch (dualErr) {
        console.warn('⚠️ Falha na propagação das notas da matéria (não-bloqueante):', dualErr);
      }

      // Log removido para otimização
      setSubjectNotes(updatedNotes);
      setHasUnsavedChanges(false);
      toast.success('Anotações da matéria salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar anotações da matéria:', error);
      toastGate.notifyError('Erro ao salvar anotações da matéria', 'COMPONENTS-REVIEWS-NOTESMODAL-04', { severity: 'medium' });
      throw error;
    } finally {
      setIsSaving(false);
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

  // Função getDifficultyButtonStyle removida - usando sistema de estrelas

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={isMobile ?
          "fixed inset-0 w-full h-full max-w-none m-0 rounded-none p-0 bg-white z-50" :
          "max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border-blue-100 !p-0 !gap-0"
        }
        hideCloseButton={true}
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
        <div className={`${isMobile ? 'p-4 border-b bg-white' : 'p-6 bg-gradient-to-r from-blue-100/50 to-white border-b border-blue-100 sm:rounded-t-lg'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isMobile && (
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <MessageSquareText size={24} />
                </div>
              )}
              <div>
                <DialogTitle className="text-lg font-bold text-gray-800">
                  {isMobile ? `Anotações - ${topicName}` : subjectName}
                </DialogTitle>
                {!isMobile && (
                  <div className="text-sm text-gray-600 font-light">
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
              className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" strokeWidth={3} />
            </Button>
          </div>
          {isMobile && (
            <p className="text-sm text-gray-600 mt-1">{subjectName}</p>
          )}
        </div>

        <div id="notes-modal-description" className="sr-only">
          Editor de anotações para o tópico. Use o editor de texto rico para criar e editar suas anotações de estudo.
        </div>

        {/* Content */}
        <div className={`${isMobile ? 'flex-1 overflow-y-auto p-4' : 'flex-1 min-h-0 overflow-y-auto p-6 pt-2'} bg-background`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Histórico de Revisões */}
              {!topicId.startsWith('temp-') && (
                <TopicReviewHistorySection topicId={topicId} />
              )}

              {/* Anotações da Matéria - apenas se showSubjectNotes for true */}
              {showSubjectNotes && (
                <div>
                  <Label className="text-sm font-medium mb-3 block text-blue-600 dark:text-blue-400">
                    📚 Anotações da Matéria ({subjectName})
                  </Label>
                  <RichTextNotesEditor
                    key={`subject-${subjectId}`}
                    notes={subjectNotes}
                    onSave={saveSubjectNotes}
                    isLoading={isLoading || isSaving}
                    onChange={(content) => {
                      handleNotesChange();
                      setCurrentSubjectContent(content);
                    }}
                    hideHeader={true}
                  />
                </div>
              )}

              {/* Anotações do Tópico */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  📖 Anotações
                </Label>
                <RichTextNotesEditor
                  key={`topic-${topicId}`}
                  notes={notes}
                  onSave={saveNotes}
                  isLoading={isLoading || isSaving}
                  onChange={(content) => {
                    handleNotesChange();
                    setCurrentTopicContent(content);
                  }}
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

        {/* Footer */}
        <div className={`${isMobile ? 'p-4 border-t' : 'p-6 pt-4 border-t'} bg-white flex-none`}>
          <div className="flex justify-between items-center gap-3">
            <Button
              onClick={async () => {
                try {
                  setIsSaving(true);
                  await saveNotes(notes || { content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                  setHasUnsavedChanges(false);
                  toast.success('Anotações salvas!');
                } catch (error) {
                  console.error('Erro ao salvar:', error);
                  toastGate.notifyError('Erro ao salvar anotações', 'COMPONENTS-REVIEWS-NOTESMODAL-05', { severity: 'medium' });
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

export default NotesModal;
