import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicNotes } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface SubjectNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  subjectId: string;
  subjectName: string;
}

const SubjectNotesModal: React.FC<SubjectNotesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjectId,
  subjectName
}) => {
  const [notes, setNotes] = useState<TopicNotes | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isMobile = useIsMobile();

  // Buscar notas da matéria
  useEffect(() => {
    if (isOpen && subjectId) {
      loadSubjectNotes();
    }
  }, [isOpen, subjectId]);

  const loadSubjectNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('notes')
        .eq('id', subjectId)
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
        .from('subjects')
        .update({ 
          notes: updatedNotes as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', subjectId);

      if (error) throw error;

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
      // Forçar salvamento e fechar modal
      const editorComponent = document.querySelector('.ql-editor');
      if (editorComponent) {
        const content = editorComponent.innerHTML;
        const notesToSave: TopicNotes = {
          content: content.trim(),
          updatedAt: new Date().toISOString(),
          createdAt: notes?.createdAt || new Date().toISOString()
        };
        await saveNotes(notesToSave);
        
        if (onSave) {
          onSave();
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleNotesChange = () => {
    setHasUnsavedChanges(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={isMobile ? 
          "fixed inset-0 w-full h-full max-w-none m-0 rounded-none p-0 bg-card z-50" : 
          "max-w-4xl w-full max-h-[90vh] overflow-hidden bg-card"
        }
        hideCloseButton={isMobile}
        aria-describedby="subject-notes-modal-description"
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
                Anotações - {subjectName}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Anotações gerais da matéria
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
        
        <div id="subject-notes-modal-description" className="sr-only">
          Editor de anotações para a matéria. Use o editor de texto rico para criar e editar suas anotações gerais da matéria.
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
                <RichTextNotesEditor
                  notes={notes}
                  onSave={saveNotes}
                  isLoading={isLoading || isSaving}
                  onChange={handleNotesChange}
                  hideHeader={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer com botão no lado direito */}
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

export default SubjectNotesModal;