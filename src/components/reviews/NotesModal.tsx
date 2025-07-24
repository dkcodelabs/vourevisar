
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicNotes } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
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
        .select('notes')
        .eq('id', topicId)
        .single();

      if (error) throw error;

      if (data?.notes) {
        setNotes(data.notes as TopicNotes);
      } else {
        setNotes(undefined);
      }
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
      const { error } = await supabase
        .from('topics')
        .update({ notes: updatedNotes as any })
        .eq('id', topicId);

      if (error) throw error;

      setNotes(updatedNotes);
      setHasUnsavedChanges(false);
      toast.success('Anotações salvas com sucesso!');
      
      // Refresh dos dados do AppContext para atualizar a página de tópicos
      await refreshData();
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toast.error('Erro ao salvar anotações');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndClose = async () => {
    if (hasUnsavedChanges) {
      try {
        // Forçar salvamento antes de fechar
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
        console.error('Erro ao salvar antes de fechar:', error);
        return; // Não fechar se houve erro ao salvar
      }
    }
    onClose();
  };

  const handleNotesChange = () => {
    setHasUnsavedChanges(true);
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
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Anotações - {topicName}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {subjectName}
              </DialogDescription>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveAndClose}
                className="h-8 w-8 p-0"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div id="notes-modal-description" className="sr-only">
          Editor de anotações para o tópico. Use o editor de texto rico para criar e editar suas anotações de estudo.
        </div>

        {/* Content */}
        <div className={`${isMobile ? 'flex-1 overflow-auto p-4' : 'p-6 pt-2 overflow-auto'} bg-gray-50`}>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <RichTextNotesEditor
              notes={notes}
              onSave={saveNotes}
              isLoading={isLoading || isSaving}
              onChange={handleNotesChange}
            />
          )}
        </div>

        {/* Footer */}
        {!isMobile && (
          <div className="p-6 pt-4 border-t bg-white flex justify-end">
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotesModal;
