
import React, { useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
      <div className="rounded-lg overflow-hidden border border-white/20 bg-white/60 backdrop-blur-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplina</TableHead>
              <TableHead>Tópico</TableHead>
              <TableHead>{tab === 'concluido' ? 'Status' : 'Estágio'}</TableHead>
              {tab === 'concluido' ? (
                <>
                  <TableHead>Data de Início</TableHead>
                  <TableHead>Data de Conclusão</TableHead>
                  <TableHead>Ações</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Próxima Revisão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTopics.length > 0 ? (
              sortedTopics.map((topic) => {
                const proxima = topic.next_review ? startOfDay(new Date(topic.next_review)) : null;
                let status = 'Futura';
                let statusClass = 'text-blue-600';
                
                if (topic.completed) {
                  status = 'Concluído';
                  statusClass = 'text-green-600 font-bold';
                } else if (proxima) {
                  if (isBefore(proxima, hoje)) {
                    const diasVencidos = differenceInDays(hoje, proxima);
                    status = `Atrasado (${diasVencidos} dias)`;
                    statusClass = 'text-red-600 font-bold';
                  } else if (proxima.getTime() === hoje.getTime()) {
                    status = 'Hoje';
                    statusClass = 'text-orange-600 font-bold';
                  }
                }
                
                return (
                  <TableRow key={topic.id} className="text-xs">
                    <TableCell>{topic.subject_name}</TableCell>
                    <TableCell>{topic.name}</TableCell>
                    <TableCell>
                      {topic.review_stage && topic.review_stage !== 'null' && topic.review_stage !== '' 
                        ? topic.review_stage 
                        : (topic.review_count > 0 ? '24h' : 'Não iniciado')
                      }
                    </TableCell>
                    {tab === 'concluido' ? (
                      <>
                        <TableCell>
                          {topic.first_studied_at ? format(new Date(topic.first_studied_at), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {topic.last_reviewed_at ? format(new Date(topic.last_reviewed_at), 'dd/MM/yyyy') : '-'}
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
                                    className={`h-4 w-4 ${hasNotes(topic) ? 'text-blue-600 fill-current' : 'text-gray-400'}`} 
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
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{proxima ? format(proxima, 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell className={statusClass}>{status}</TableCell>
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
                                    className={`h-4 w-4 ${hasNotes(topic) ? 'text-blue-600 fill-current' : 'text-gray-400'}`} 
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

                            {topic.completed ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0 text-gray-400 cursor-not-allowed">
                                    <CheckCircle2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Tópico concluído</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
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
                      </>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={tab === 'concluido' ? 6 : 6} className="text-center text-gray-400 py-8">
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
