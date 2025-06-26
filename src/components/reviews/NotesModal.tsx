
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicNotes } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-hot-toast';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

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
    try {
      const { error } = await supabase
        .from('topics')
        .update({ notes: updatedNotes as any })
        .eq('id', topicId);

      if (error) throw error;

      setNotes(updatedNotes);
      toast.success('Anotações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toast.error('Erro ao salvar anotações');
      throw error;
    }
  };

  const handleSaveAndClose = async () => {
    // Se há anotações pendentes, elas já foram salvas pelo RichTextNotesEditor
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={isMobile ? 
          "fixed inset-0 w-full h-full max-w-none m-0 rounded-none p-0 bg-white" : 
          "max-w-4xl w-full max-h-[90vh] overflow-hidden"
        }
        hideCloseButton={isMobile}
      >
        {/* Header */}
        <DialogHeader className={`${isMobile ? 'p-4 border-b' : 'p-6 pb-4'} bg-white`}>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Anotações - {topicName}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">{subjectName}</p>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveAndClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

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
              isLoading={isLoading}
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
            >
              <Save className="h-4 w-4" />
              Salvar e Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotesModal;
