
import React, { useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { FileText, CheckCircle2, Edit, RotateCcw } from 'lucide-react';
import { useTopicReview } from '@/hooks/useTopicReview';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/lib/toast';
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
  const { markTopicAsReviewed, isLoading: isLogicLoading } = useTopicReview();
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
      <div className="w-full">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto bg-card rounded-lg shadow-sm border border-border responsive-table">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b border-border hover:bg-muted/30">
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">DISCIPLINA</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">TÓPICO</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">ESTÁGIO</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">PRÓXIMA REVISÃO</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">STATUS</TableHead>
                <TableHead className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-6 py-3">AÇÕES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {sortedTopics.length > 0 ? (
              sortedTopics.map((topic) => {
                const proxima = topic.next_review ? startOfDay(new Date(topic.next_review)) : null;
                let status = 'Futura';
                let statusColor = 'bg-blue-100 text-blue-700';
                
                if (topic.completed) {
                  status = 'Concluído';
                  statusColor = 'bg-green-100 text-green-700';
                } else if (proxima) {
                  if (isBefore(proxima, hoje)) {
                    const diasVencidos = differenceInDays(hoje, proxima);
                    status = `Atrasado (${diasVencidos} dia${diasVencidos > 1 ? 's' : ''})`;
                    statusColor = 'bg-red-100 text-red-700';
                  } else if (proxima.getTime() === hoje.getTime()) {
                    status = 'Hoje';
                    statusColor = 'bg-orange-100 text-orange-700';
                  }
                }
                
                return (
                  <TableRow key={topic.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <TableCell className="px-6 py-3 text-sm font-medium text-foreground">{topic.subject_name}</TableCell>
                    <TableCell className="px-6 py-3 text-sm text-muted-foreground">{topic.name}</TableCell>
                    <TableCell className="px-6 py-3 text-sm text-muted-foreground">
                      {topic.review_stage && topic.review_stage !== 'null' && topic.review_stage !== '' 
                        ? topic.review_stage 
                        : (topic.review_count > 0 ? '24h' : 'Não iniciado')
                      }
                    </TableCell>
                    <TableCell className="px-6 py-3 text-sm text-muted-foreground">
                      {proxima ? format(proxima, 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                        {status}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleNotesClick(topic)}
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <FileText 
                                className={`h-4 w-4 ${hasNotes(topic) ? 'text-primary' : 'text-muted-foreground'}`} 
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{hasNotes(topic) ? 'Ver anotações' : 'Adicionar anotações'}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar</p>
                          </TooltipContent>
                        </Tooltip>

                        {!topic.completed && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmTopicId(topic.id)}
                                disabled={isLogicLoading}
                                className="h-8 w-8 p-0 hover:bg-green-50 text-primary"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Marcar como revisado</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {/* Dialog de confirmação */}
                      <Dialog open={confirmTopicId === topic.id} onOpenChange={(open) => !open && setConfirmTopicId(null)}>
                        <DialogContent aria-describedby="confirm-review-description">
                          <DialogHeader>
                            <DialogTitle>Confirmar Revisão</DialogTitle>
                            <DialogDescription id="confirm-review-description">
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
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12 px-6">
                  Nenhuma revisão encontrada para este filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4 px-2 mobile-card">
          {sortedTopics.length > 0 ? (
            sortedTopics.map((topic) => {
              const proxima = topic.next_review ? startOfDay(new Date(topic.next_review)) : null;
              let status = 'Futura';
              let statusColor = 'bg-blue-100 text-blue-700';
              
              if (topic.completed) {
                status = 'Concluído';
                statusColor = 'bg-green-100 text-green-700';
              } else if (proxima) {
                if (isBefore(proxima, hoje)) {
                  const diasVencidos = differenceInDays(hoje, proxima);
                  status = `Atrasado (${diasVencidos}d)`;
                  statusColor = 'bg-red-100 text-red-700';
                } else if (proxima.getTime() === hoje.getTime()) {
                  status = 'Hoje';
                  statusColor = 'bg-orange-100 text-orange-700';
                }
              }
              
              return (
                <div key={topic.id} className="bg-card border border-border rounded-lg shadow-sm mobile-card">
                  <div className="p-4 space-y-3">
                    {/* Subject and Topic */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        {topic.subject_name}
                      </p>
                      <h3 className="text-sm font-medium text-foreground">{topic.name}</h3>
                    </div>
                    
                    {/* Status and Stage */}
                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                        {status}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        {topic.review_stage && topic.review_stage !== 'null' && topic.review_stage !== '' 
                          ? topic.review_stage 
                          : (topic.review_count > 0 ? '24h' : 'Não iniciado')
                        }
                      </span>
                    </div>
                    
                    {/* Date and Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        {proxima ? format(proxima, 'dd/MM/yyyy') : 'Sem data'}
                      </p>
                      
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleNotesClick(topic)}
                              className="h-8 w-8 p-0 touch-target"
                            >
                               <FileText 
                                className={`h-4 w-4 ${hasNotes(topic) ? 'text-primary' : 'text-muted-foreground'}`} 
                               />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{hasNotes(topic) ? 'Ver anotações' : 'Adicionar anotações'}</p>
                          </TooltipContent>
                        </Tooltip>

                        {!topic.completed && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmTopicId(topic.id)}
                                disabled={isLogicLoading}
                                className="h-8 w-8 p-0 text-primary touch-target"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Marcar como revisado</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Dialog de confirmação */}
                  <Dialog open={confirmTopicId === topic.id} onOpenChange={(open) => !open && setConfirmTopicId(null)}>
                    <DialogContent aria-describedby="confirm-review-mobile-description">
                      <DialogHeader>
                        <DialogTitle>Confirmar Revisão</DialogTitle>
                        <DialogDescription id="confirm-review-mobile-description">
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
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Nenhuma revisão encontrada para este filtro.
            </div>
          )}
        </div>

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
