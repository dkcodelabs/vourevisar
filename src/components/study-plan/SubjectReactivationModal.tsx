
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Subject } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, RefreshCw } from 'lucide-react';

interface SubjectReactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedSubjects: Subject[];
  onReactivationComplete: () => void;
}

const SubjectReactivationModal: React.FC<SubjectReactivationModalProps> = ({
  isOpen,
  onClose,
  completedSubjects,
  onReactivationComplete
}) => {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleReactivate = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Selecione pelo menos uma matéria para reativar');
      return;
    }

    setIsLoading(true);
    console.log('🔄 Starting reactivation process for subjects:', selectedSubjects);

    try {
      // 1. Update subjects status to 'Em Estudo' and clear completed_at
      const { error: subjectsError } = await supabase
        .from('subjects')
        .update({ 
          status: 'Em Estudo',
          completed_at: null
        })
        .in('id', selectedSubjects);

      if (subjectsError) {
        console.error('❌ Error updating subjects:', subjectsError);
        throw subjectsError;
      }

      console.log('✅ Subjects updated successfully');

      // 2. Reset ALL topics for the reactivated subjects
      const { error: topicsError } = await supabase
        .from('topics')
        .update({ 
          review_stage: null,  // Reset review stage
          completed: false,    // Mark as not completed
          review_count: 0,     // Reset review count
          total_reviews: 0,    // Reset total reviews
          last_reviewed_at: null,
          next_review: null
        })
        .in('subject_id', selectedSubjects);

      if (topicsError) {
        console.error('❌ Error resetting topics:', topicsError);
        throw topicsError;
      }

      console.log('✅ Topics reset successfully');

      toast.success(`${selectedSubjects.length} matéria(s) reativada(s) com sucesso! Todos os tópicos foram resetados.`);
      
      // Reset modal state
      setSelectedSubjects([]);
      onClose();
      
      // Trigger data refresh
      onReactivationComplete();

    } catch (error) {
      console.error('❌ Reactivation error:', error);
      toast.error('Erro ao reativar matérias. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Reativar Matérias
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecione as matérias que deseja reativar para estudar novamente. 
            Todos os tópicos serão resetados para revisão.
          </p>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {completedSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center space-x-3 p-2 border rounded-lg">
                <Checkbox
                  checked={selectedSubjects.includes(subject.id)}
                  onCheckedChange={() => handleSubjectToggle(subject.id)}
                />
                <div className="flex items-center gap-2 flex-1">
                  <BookOpen className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">{subject.name}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReactivate}
              className="flex-1"
              disabled={selectedSubjects.length === 0 || isLoading}
            >
              {isLoading ? 'Reativando...' : `Reativar (${selectedSubjects.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectReactivationModal;
