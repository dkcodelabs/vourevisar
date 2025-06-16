
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Calendar, Clock, CheckCircle } from 'lucide-react';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GlassCard, AnimatedTitle, GradientButton } from '@/components/ui';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudyPlanLogic } from '@/hooks/useStudyPlanLogic';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'react-hot-toast';

interface Topic {
  id: string;
  name: string;
  subject_id: string;
  subject_name: string;
  review_stage: string;
  next_review: string | null;
  review_count: number;
  subjects?: {
    id: string;
    name: string;
    color: string;
  };
}

const stageOrder = {
  '24h': 1,
  '7 dias': 2,
  '30 dias': 3,
};

const Revisoes = () => {
  const { user } = useAuth();
  const { refreshData } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'all' | 'date'>('all');
  const [tab, setTab] = useState<'hoje' | 'futuras' | 'concluido'>('hoje');
  const { handleMarkTopicForReview, markTopicAsReviewed, isLoading: isLogicLoading } = useStudyPlanLogic();
  const [confirmTopicId, setConfirmTopicId] = useState<string | null>(null);

  const { data: topics, isLoading, error, refetch } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('topics')
        .select(`
          id,
          name,
          subject_id,
          review_stage,
          next_review,
          review_count,
          completed,
          subjects (
            id,
            name,
            color,
            user_id
          )
        `)
        .order('next_review', { ascending: true });

      if (error) throw error;

      // Filtrar tópicos apenas do usuário logado
      const filtered = data.filter(topic => topic.subjects?.user_id === user?.id);

      // Transformar os dados para o formato esperado
      return filtered.map(topic => ({
        ...topic,
        review_count: topic.review_count ?? 0,
        subject_name: topic.subjects?.name || 'Sem disciplina'
      }));
    }
  });

  useEffect(() => {
    if (topics) {
      let filtered = topics;

      // Filtrar por data selecionada
      if (viewMode === 'date' && selectedDate) {
        const selectedDateString = format(startOfDay(selectedDate), 'yyyy-MM-dd');
        filtered = topics.filter(topic => {
          if (!topic.next_review) return false;
          const reviewDateString = format(startOfDay(new Date(topic.next_review)), 'yyyy-MM-dd');
          return reviewDateString === selectedDateString;
        });
      }

      // Filtrar por termo de busca
      if (searchTerm.trim() !== '') {
        filtered = filtered.filter(topic =>
          topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          topic.subject_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setFilteredTopics(filtered);
    }
  }, [topics, searchTerm, selectedDate, viewMode]);

  // Adiciona refresh automático ao focar na página
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refetch]);

  const resetFilters = () => {
    setSelectedDate(undefined);
    setViewMode('all');
    setSearchTerm('');
  };

  // Lógica para separar revisões atrasadas, do dia, futuras e concluídas
  const hoje = startOfDay(new Date());
  const delayedTopics = filteredTopics.filter(t => t.next_review && isBefore(startOfDay(new Date(t.next_review)), hoje) && t.review_stage !== 'Concluído');
  const todayTopics = filteredTopics.filter(t => t.next_review && startOfDay(new Date(t.next_review)).getTime() === hoje.getTime() && t.review_stage !== 'Concluído');
  const futureTopics = filteredTopics.filter(t => t.next_review && new Date(t.next_review) > hoje && startOfDay(new Date(t.next_review)).getTime() !== hoje.getTime() && t.review_stage !== 'Concluído');
  const completedTopics = filteredTopics.filter(t => t.review_stage === 'Concluído' || t.completed);

  // Filtrar a tabela conforme a tab selecionada
  let topicsToShow = filteredTopics;
  if (tab === 'hoje') {
    topicsToShow = filteredTopics.filter(t => {
      if (!t.next_review || t.review_stage === 'Concluído') return false;
      const reviewDate = startOfDay(new Date(t.next_review));
      return reviewDate <= hoje; // atrasados ou hoje
    });
  } else if (tab === 'futuras') {
    topicsToShow = filteredTopics.filter(t => {
      if (!t.next_review || t.review_stage === 'Concluído') return false;
      const reviewDate = startOfDay(new Date(t.next_review));
      return reviewDate > hoje;
    });
  } else if (tab === 'concluido') {
    topicsToShow = completedTopics;
  }

  return (
    <div className="container mx-auto p-2">
      <AnimatedTitle className="mb-4">Revisões</AnimatedTitle>
      {/* Cards de resumo de revisões com novo card de concluídos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="bg-white border border-red-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-red-600">Revisões Atrasadas</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{delayedTopics.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-orange-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-orange-600">Revisões do Dia</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{todayTopics.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-blue-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-blue-600">Revisões Futuras</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{futureTopics.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-green-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-green-600">Tópicos Concluídos</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTopics.length}</div>
          </CardContent>
        </Card>
      </div>
      {/* Menu de tabs com nova aba Concluído */}
      <div className="mb-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'hoje' | 'futuras' | 'concluido')}>
          <TabsList>
            <TabsTrigger value="hoje">Hoje & Atrasadas</TabsTrigger>
            <TabsTrigger value="futuras">Futuras</TabsTrigger>
            <TabsTrigger value="concluido">Concluído</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <GlassCard className="p-4 mb-4">
        {/* Controles de filtro */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Pesquisar tópicos ou disciplinas..."
              className="pl-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Filtrar por data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setViewMode(date ? 'date' : 'all');
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            {(selectedDate || searchTerm) && (
              <Button variant="outline" onClick={resetFilters} className="text-sm">
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Indicador de filtro ativo */}
        {viewMode === 'date' && selectedDate && (
          <div className="mb-4 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              Mostrando revisões para: <strong>{format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}</strong>
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="animate-spin h-8 w-8 text-app-blue" />
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden border border-white/20 bg-white/60 backdrop-blur-md">
            {/* Tabela de revisões filtrada pela tab */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Tópico</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Próxima Revisão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topicsToShow.length > 0 ? (
                  topicsToShow
                    .sort((a, b) => {
                      // Ordenar por atraso (mais atrasados primeiro)
                      const dateA = a.next_review ? new Date(a.next_review).getTime() : 0;
                      const dateB = b.next_review ? new Date(b.next_review).getTime() : 0;
                      return dateA - dateB;
                    })
                    .map((topic) => {
                      const hoje = startOfDay(new Date());
                      const proxima = topic.next_review ? startOfDay(new Date(topic.next_review)) : null;
                      let status = 'Futura';
                      let statusClass = 'text-blue-600';
                      
                      // Corrigir lógica de status para mostrar "Revisado" quando concluído
                      if (topic.review_stage === 'Concluído' || topic.completed) {
                        status = 'Revisado';
                        statusClass = 'text-green-600 font-bold';
                      } else if (proxima) {
                        if (isBefore(proxima, hoje)) {
                          const diasVencidos = differenceInDays(hoje, proxima);
                          status = `Pendente (${diasVencidos} dias)`;
                          statusClass = 'text-red-600 font-bold';
                        } else if (proxima.getTime() === hoje.getTime()) {
                          status = 'Hoje';
                          statusClass = 'text-orange-600 font-bold';
                        }
                      }
                      
                      const isConcluido = topic.review_stage === 'Concluído';
                      
                      return (
                        <TableRow key={topic.id} className="text-xs">
                          <TableCell>{topic.subject_name}</TableCell>
                          <TableCell>{topic.name}</TableCell>
                          <TableCell>{topic.review_stage && topic.review_stage !== 'null' && topic.review_stage !== '' && topic.review_count > 0 ? topic.review_stage : 'Não iniciado'}</TableCell>
                          <TableCell>{proxima ? format(proxima, 'dd/MM/yyyy') : '-'}</TableCell>
                          <TableCell className={statusClass}>{status}</TableCell>
                          <TableCell>
                            {isConcluido ? (
                              <Button variant="outline" size="sm" disabled className="text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed text-xs px-2 py-1 h-7 min-w-[110px] w-full sm:w-auto">
                                Concluído
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setConfirmTopicId(topic.id)}
                                  disabled={isLogicLoading}
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
                                            // Atualizar dados globais e lista de tópicos
                                            await Promise.all([
                                              refreshData(),
                                              refetch()
                                            ]);
                                            // Atualizar estado local
                                            setFilteredTopics(prev => 
                                              prev.map(t => 
                                                t.id === topic.id 
                                                  ? { 
                                                      ...t, 
                                                      review_count: (t.review_count || 0) + 1,
                                                      review_stage: t.review_count === 0 ? '24h' : 
                                                                   t.review_count === 1 ? '7 dias' : 
                                                                   t.review_count === 2 ? '30 dias' : 'Concluído'
                                                    }
                                                  : t
                                              )
                                            );
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
                          </TableCell>
                        </TableRow>
                      );
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                      Nenhuma revisão encontrada para este filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Revisoes;
