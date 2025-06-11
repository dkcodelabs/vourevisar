import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BookOpen, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { createNewCycleForReactivatedSubjects } from '@/utils/cycleUtils';

interface SubjectReactivationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CompletedSubject {
  id: string;
  name: string;
  completedTopicsCount: number;
  totalTopicsCount: number;
  color?: string;
}

const SubjectReactivationModal: React.FC<SubjectReactivationModalProps> = ({ isOpen, onClose }) => {
  const { subjects, refreshData } = useApp();
  const { user } = useAuth();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isReactivating, setIsReactivating] = useState(false);
  const [completedSubjects, setCompletedSubjects] = useState<CompletedSubject[]>([]);

  useEffect(() => {
    if (isOpen) {
      const completed = subjects
        .filter(subject => subject.status === 'Concluída')
        .map(subject => ({
          id: subject.id,
          name: subject.name,
          completedTopicsCount: subject.topics.filter(t => t.completed).length,
          totalTopicsCount: subject.topics.length,
          color: subject.color
        }));
      setCompletedSubjects(completed);
      setSelectedSubjects([]);
    }
  }, [isOpen, subjects]);

  const handleSelectSubject = (subjectId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubjects(prev => [...prev, subjectId]);
    } else {
      setSelectedSubjects(prev => prev.filter(id => id !== subjectId));
    }
  };

  const handleSelectAll = () => {
    if (selectedSubjects.length === completedSubjects.length) {
      setSelectedSubjects([]);
    } else {
      setSelectedSubjects(completedSubjects.map(s => s.id));
    }
  };

  const reactivateSubjects = async (subjectIds: string[]) => {
    if (!user) return;

    setIsReactivating(true);
    
    try {
      console.log('🔄 Reativando matérias:', { subjectIds, userId: user.id });

      // 1. Update subject status to "Em Estudo" - DON'T touch topics
      const { error: subjectsError } = await supabase
        .from('subjects')
        .update({ 
          status: 'Em Estudo',
          completed_at: null,
          updated_at: new Date().toISOString()
        })
        .in('id', subjectIds);

      if (subjectsError) {
        console.error('❌ Error updating subjects:', subjectsError);
        throw subjectsError;
      }

      console.log('✅ Subjects updated to "Em Estudo"');

      // 2. Create new cycle with reactivated subjects
      const cycleResult = await createNewCycleForReactivatedSubjects(user.id, subjectIds);

      console.log('✅ Novo ciclo criado:', cycleResult);

      toast.success(`${subjectIds.length} matéria(s) reativada(s) com sucesso! Novo ciclo criado.`);
      
      // 3. Refresh dos dados e aguardar um pouco para garantir que tudo foi atualizado
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshData();
      
      console.log('✅ Dados atualizados após reativação');
      
      onClose();
    } catch (error) {
      console.error('❌ Erro ao reativar matérias:', error);
      toast.error('Erro ao reativar matérias. Tente novamente.');
    } finally {
      setIsReactivating(false);
    }
  };

  const handleReactivateSelected = () => {
    if (selectedSubjects.length === 0) return;
    reactivateSubjects(selectedSubjects);
  };

  const handleReactivateAll = () => {
    const allIds = completedSubjects.map(s => s.id);
    reactivateSubjects(allIds);
  };

  const selectedCount = selectedSubjects.length;
  const totalTopicsToReactivate = completedSubjects
    .filter(s => selectedSubjects.includes(s.id))
    .reduce((sum, s) => sum + s.totalTopicsCount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <RefreshCw className="h-6 w-6 text-blue-500" />
            Reativar Matérias Concluídas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {completedSubjects.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhuma matéria concluída encontrada.</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">O que acontecerá ao reativar:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• As matérias voltarão ao status "Em Estudo"</li>
                      <li>• Será criado um novo ciclo de estudos com as matérias selecionadas</li>
                      <li>• Os ciclos realizados serão resetados para 0</li>
                      <li>• Os tópicos manterão seu progresso atual (não serão resetados)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Selecione as matérias para reativar:</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="text-sm"
                  >
                    {selectedSubjects.length === completedSubjects.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {completedSubjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        id={subject.id}
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={(checked) => handleSelectSubject(subject.id, checked as boolean)}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{subject.name}</span>
                          {subject.color && (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: subject.color }}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {subject.totalTopicsCount} tópicos
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Todos dominados
                          </span>
                        </div>
                      </div>

                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  ))}
                </div>
              </div>

              {selectedCount > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-700">
                    <p><strong>Resumo da reativação:</strong></p>
                    <p>• {selectedCount} matéria(s) selecionada(s)</p>
                    <p>• {totalTopicsToReactivate} tópico(s) no total</p>
                    <p>• Novo ciclo será criado com estas matérias</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleReactivateSelected}
                  disabled={selectedCount === 0 || isReactivating}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  {isReactivating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Reativar Selecionadas ({selectedCount})
                </Button>
                
                <Button
                  onClick={handleReactivateAll}
                  disabled={isReactivating}
                  variant="outline"
                  className="flex-1"
                >
                  Reativar Todas ({completedSubjects.length})
                </Button>
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose} disabled={isReactivating}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectReactivationModal;
