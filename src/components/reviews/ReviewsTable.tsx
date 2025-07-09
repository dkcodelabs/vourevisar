
import React, { useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { FileText, CheckCircle2 } from 'lucide-react';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'react-hot-toast';
import NotesModal from './NotesModal';
import RegisterQuestionsButton from './RegisterQuestionsButton';

interface Topic {
  id: string;
  name: string;
  subject_id: string;
  subject_name: string;
  review_stage: string;
  next_review: string | null;
  review_count: number;
  first_studied_at: string | null;
  last_reviewed_at: string | null;
  completed: boolean;
  notes?: any;
}

interface ReviewsTableProps {
  topics: Topic[];
  tab: 'hoje' | 'futuras' | 'concluido';
  refetch: () => void;
}

export const ReviewsTable: React.FC<ReviewsTableProps> = ({
  topics,
  tab,
  refetch
}) => {
  const { refreshData } = useApp();
  const { markTopicAsReviewed, isLoading: isLogicLoading } = useStudyPlanLogic();
  const [confirmTopicId, setConfirmTopicId] = useState<string | null>(null);
  const [notesModalData, setNotesModalData] = useState<{
    isOpen: boolean;
    topicId: string;
    topicName: string;
    subjectName: string;
  }>({
    isOpen: false,
    topicId: '',
    topicName: '',
    subjectName: ''
  });

  const hoje = startOfDay(new Date());
  
  // Filter topics based on selected tab
  let topicsToShow = topics;
  if (tab === 'hoje') {
    topicsToShow = topics.filter(t => {
      if (t.completed || !t.next_review) return false;
      const reviewDate = startOfDay(new Date(t.next_review));
      return reviewDate <= hoje;
    });
  } else if (tab === 'futuras') {
    topicsToShow = topics.filter(t => {
      if (t.completed || !t.next_review) return false;
      const reviewDate = startOfDay(new Date(t.next_review));
      return reviewDate > hoje;
    });
  } else if (tab === 'concluido') {
    topicsToShow = topics.filter(t => t.completed);
  }

  const sortedTopics = topicsToShow.sort((a, b) => {
    const dateA = a.next_review ? new Date(a.next_review).getTime() : 0;
    const dateB = b.next_review ? new Date(b.next_review).getTime() : 0;
    return dateA - dateB;
  });

  const handleNotesClick = (topic: Topic) => {
    setNotesModalData({
      isOpen: true,
      topicId: topic.id,
      topicName: topic.name,
      subjectName: topic.subject_name
    });
  };

  const closeNotesModal = () => {
    setNotesModalData(prev => ({ ...prev, isOpen: false }));
  };

  const hasNotes = (topic: Topic) => {
    return topic.notes && topic.notes.content && topic.notes.content.trim() !== '';
  };

  return (
    <TooltipProvider>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700">DISCIPLINA</TableHead>
              <TableHead className="font-semibold text-gray-700">TÓPICO</TableHead>
              <TableHead className="font-semibold text-gray-700">ESTÁGIO</TableHead>
              <TableHead className="font-semibold text-gray-700">PRÓXIMA REVISÃO</TableHead>
              <TableHead className="font-semibold text-gray-700">STATUS</TableHead>
              <TableHead className="font-semibold text-gray-700">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTopics.length > 0 ? (
              sortedTopics.map((topic) => {
                const proxima = topic.next_review ? startOfDay(new Date(topic.next_review)) : null;
                let status = 'Futura';
                let statusVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'secondary';
                
                if (topic.completed) {
                  status = 'Concluído';
                  statusVariant = 'default';
                } else if (proxima) {
                  if (isBefore(proxima, hoje)) {
                    const diasVencidos = differenceInDays(hoje, proxima);
                    status = `Atrasado (${diasVencidos} dias)`;
                    statusVariant = 'destructive';
                  } else if (proxima.getTime() === hoje.getTime()) {
                    status = 'Hoje';
                    statusVariant = 'default';
                  }
                }
                
                return (
                  <TableRow key={topic.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-gray-900">{topic.subject_name}</TableCell>
                    <TableCell className="text-gray-700">{topic.name}</TableCell>
                    <TableCell className="text-gray-600">
                      {topic.review_stage && topic.review_stage !== 'null' && topic.review_stage !== '' 
                        ? topic.review_stage 
                        : (topic.review_count > 0 ? '24h' : 'Não iniciado')
                      }
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {proxima ? format(proxima, 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={statusVariant}
                        className={`
                          ${statusVariant === 'destructive' ? 'bg-red-100 text-red-800 hover:bg-red-100' : ''}
                          ${statusVariant === 'default' && status === 'Hoje' ? 'bg-orange-100 text-orange-800 hover:bg-orange-100' : ''}
                          ${statusVariant === 'default' && status === 'Concluído' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                          ${statusVariant === 'secondary' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : ''}
                        `}
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleNotesClick(topic)}
                              className="h-8 w-8 p-0"
                            >
                              <FileText 
                                className={`h-4 w-4 ${hasNotes(topic) ? 'text-blue-600' : 'text-gray-400'}`} 
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{hasNotes(topic) ? 'Ver anotações' : 'Adicionar anotações'}</p>
                          </TooltipContent>
                        </Tooltip>

                        <RegisterQuestionsButton
                          subject={topic.subject_name}
                          topic={topic.name}
                        />

                        {!topic.completed && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmTopicId(topic.id)}
                                  disabled={isLogicLoading}
                                  className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Marcar como revisado</p>
                              </TooltipContent>
                            </Tooltip>
                            <Dialog open={confirmTopicId === topic.id} onOpenChange={(open) => !open && setConfirmTopicId(null)}>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirmar Revisão</DialogTitle>
                                  <DialogDescription>
                                    Tem certeza que deseja marcar este tópico como revisado?
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setConfirmTopicId(null)}>Cancelar</Button>
                                  <Button
                                    variant="default"
                                    onClick={async () => {
                                      try {
                                        await markTopicAsReviewed(topic.id);
                                        setConfirmTopicId(null);
                                        setTimeout(async () => {
                                          await Promise.all([
                                            refreshData(),
                                            refetch()
                                          ]);
                                        }, 500);
                                      } catch (error) {
                                        console.error('Erro ao marcar revisão:', error);
                                        toast.error('Erro ao marcar revisão');
                                      }
                                    }}
                                  >
                                    Confirmar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                  Nenhuma revisão encontrada para este filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Modal de Anotações */}
        <NotesModal
          isOpen={notesModalData.isOpen}
          onClose={closeNotesModal}
          topicId={notesModalData.topicId}
          topicName={notesModalData.topicName}
          subjectName={notesModalData.subjectName}
        />
      </div>
    </TooltipProvider>
  );
};
