
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
      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200">
              <TableHead className="text-xs font-bold text-slate-600 uppercase tracking-wider px-6 py-4">DISCIPLINA</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 uppercase tracking-wider px-6 py-4">TÓPICO</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 uppercase tracking-wider px-6 py-4">ESTÁGIO</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 uppercase tracking-wider px-6 py-4">PRÓXIMA REVISÃO</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 uppercase tracking-wider px-6 py-4">STATUS</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 uppercase tracking-wider px-6 py-4">AÇÕES</TableHead>
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
                  <TableRow key={topic.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <TableCell className="px-6 py-4 text-sm font-medium text-slate-800">{topic.subject_name}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-slate-600">{topic.name}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-slate-500">
                      {topic.review_stage && topic.review_stage !== 'null' && topic.review_stage !== '' 
                        ? topic.review_stage 
                        : (topic.review_count > 0 ? '24h' : 'Não iniciado')
                      }
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-slate-500">
                      {proxima ? format(proxima, 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge 
                        variant="outline"
                        className={`
                          text-xs font-semibold border-0 rounded-md px-3 py-1
                          ${statusVariant === 'destructive' ? 'bg-red-100 text-red-700' : ''}
                          ${statusVariant === 'default' && status === 'Hoje' ? 'bg-orange-100 text-orange-700' : ''}
                          ${statusVariant === 'default' && status === 'Concluído' ? 'bg-green-100 text-green-700' : ''}
                          ${statusVariant === 'secondary' ? 'bg-blue-100 text-blue-700' : ''}
                        `}
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleNotesClick(topic)}
                              className="h-8 w-8 p-0 hover:bg-slate-100"
                            >
                              <FileText 
                                className={`h-4 w-4 ${hasNotes(topic) ? 'text-blue-600' : 'text-slate-400'}`} 
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
                                  <CheckCircle2 className="w-5 h-5" />
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
                <TableCell colSpan={6} className="text-center text-slate-500 py-12 px-6">
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
