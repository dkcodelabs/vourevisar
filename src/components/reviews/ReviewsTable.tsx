
import React, { useState } from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'react-hot-toast';
import QuestionsButton from './QuestionsButton';

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

  return (
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
                        <QuestionsButton
                          subject={topic.subject_name}
                          topic={topic.name}
                        />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{proxima ? format(proxima, 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className={statusClass}>{status}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <QuestionsButton
                            subject={topic.subject_name}
                            topic={topic.name}
                          />
                          {topic.completed ? (
                            <Button variant="outline" size="sm" disabled className="text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed text-xs px-2 py-1 h-7 min-w-[110px]">
                              Concluído
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => setConfirmTopicId(topic.id)}
                                disabled={isLogicLoading}
                                className="text-xs px-2 py-1 h-7 min-w-[110px]"
                              >
                                Marcar Revisão
                              </Button>
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
    </div>
  );
};
