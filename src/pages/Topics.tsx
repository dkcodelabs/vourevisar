
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, FileText, Trash2, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Topic } from '@/types';
import { toast } from "@/lib/toast";
import { format, isToday, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmDeleteModal from '@/components/topics/ConfirmDeleteModal';
import NotesModal from '@/components/reviews/NotesModal';
import { EditableTopicName } from '@/components/EditableTopicName';
import { DifficultyRating } from '@/components/ui/difficulty-rating';
import TopicListItem from '@/components/topics/TopicListItem';
import { errorService } from '@/lib/errors/errorService';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CreateTopicModal } from '@/components/topics/CreateTopicModal';

const Topics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subjects, deleteTopic, updateTopic, isLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const { subjectId } = useParams<{ subjectId: string }>();
  const [subjectFilter, setSubjectFilter] = useState<string>(subjectId || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    topic: (Topic & { subjectName: string; subjectId: string }) | null;
  }>({ isOpen: false, topic: null });
  const [notesModal, setNotesModal] = useState<{
    isOpen: boolean;
    topicId: string;
    topicName: string;
    subjectName: string;
  }>({ isOpen: false, topicId: '', topicName: '', subjectName: '' });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const allTopics = subjects.flatMap(subject =>
    subject.topics.map(topic => ({
      ...topic,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color,
      isMarkedForReview: false
    }))
  );

  const filteredAndSortedTopics = useMemo(() => {
    let filtered = allTopics;

    // Aplicar filtro por disciplina
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(topic => String(topic.subjectId) === String(subjectFilter));
    }

    // Aplicar filtro de pesquisa (apenas pelo nome do tópico)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(topic =>
        topic.name.toLowerCase().includes(searchLower)
      );
    }

    // Aplicar filtro de status
    if (statusFilter !== 'all') {
      const today = startOfDay(new Date());

      filtered = filtered.filter(topic => {
        if (topic.completed) return statusFilter === 'upcoming';
        if (!topic.nextReview) return statusFilter === 'upcoming';

        const reviewDate = startOfDay(new Date(topic.nextReview));

        if (statusFilter === 'delayed') {
          return reviewDate < today;
        } else if (statusFilter === 'today') {
          return reviewDate.getTime() === today.getTime();
        } else if (statusFilter === 'upcoming') {
          return reviewDate > today;
        }

        return true;
      });
    }

    // Aplicar filtro de dificuldade por estrelas
    if (difficultyFilter !== 'all') {
      const targetStars = parseInt(difficultyFilter);
      filtered = filtered.filter(topic => {
        return topic.difficulty_level === targetStars;
      });
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'subject':
          return a.subjectName.localeCompare(b.subjectName);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'difficulty':
          return (b.difficulty_level || 0) - (a.difficulty_level || 0);
        case 'date':
        default:
          if (!a.nextReview && !b.nextReview) return 0;
          if (!a.nextReview) return 1;
          if (!b.nextReview) return -1;

          return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
      }
    });

    return filtered;
  }, [allTopics, subjectFilter, searchTerm, statusFilter, difficultyFilter, sortBy]);

  const stats = useMemo(() => {
    const today = startOfDay(new Date());

    const delayed = allTopics.filter(topic => {
      if (topic.completed || !topic.nextReview) return false;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      return reviewDate < today;
    }).length;

    const todayTopics = allTopics.filter(topic => {
      if (topic.completed || !topic.nextReview) return false;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      return reviewDate.getTime() === today.getTime();
    }).length;

    const upcoming = allTopics.filter(topic => {
      // Usa a lógica de Cobertura / Retenção ativa
      const hasCoverage = Boolean(topic.first_studied_at) || topic.reviewCount > 0 || topic.completed;
      if (hasCoverage) return true;
      if (!topic.nextReview) return true;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      return reviewDate > today;
    }).length;

    // Contar por estrelas
    const stars1 = allTopics.filter(topic => topic.difficulty_level === 1).length;
    const stars2 = allTopics.filter(topic => topic.difficulty_level === 2).length;
    const stars3 = allTopics.filter(topic => topic.difficulty_level === 3).length;
    const stars4 = allTopics.filter(topic => topic.difficulty_level === 4).length;
    const stars5 = allTopics.filter(topic => topic.difficulty_level === 5).length;

    // Debug removido para otimização

    return {
      total: allTopics.length,
      delayed,
      today: todayTopics,
      upcoming,
      stars1,
      stars2,
      stars3,
      stars4,
      stars5
    };
  }, [allTopics]);

  const getTopicStatus = (topic: any) => {
    if (topic.completed) return { status: 'Dominando', color: 'green', border: 'border-l-green-400' };
    if (!topic.nextReview) return { status: 'Não agendado', color: 'gray', border: 'border-l-gray-400' };

    const today = startOfDay(new Date());
    const reviewDate = startOfDay(new Date(topic.nextReview));

    if (reviewDate < today) {
      const daysLate = Math.floor((today.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        status: `Atrasado (${String(daysLate).padStart(2, '0')}/${String(reviewDate.getDate()).padStart(2, '0')})`,
        color: 'red',
        border: 'border-l-red-400'
      };
    } else if (reviewDate.getTime() === today.getTime()) {
      return { status: 'Hoje', color: 'blue', border: 'border-l-blue-400' };
    } else {
      return {
        status: `Futuro (${String(reviewDate.getDate()).padStart(2, '0')}/${String(reviewDate.getMonth() + 1).padStart(2, '0')})`,
        color: 'green',
        border: 'border-l-green-400'
      };
    }
  };

  const getStageDisplay = (topic: any) => {
    if (topic.completed) return 'Dominando';
    if (!topic.reviewStage && topic.reviewCount === 0) return 'Novo';
    return topic.reviewStage || `${topic.reviewCount}º revisão`;
  };

  const handleEditTopic = async (topicId: string, newName: string) => {
    const topic = allTopics.find(t => t.id === topicId);
    if (!topic) return;

    const subject = subjects.find(s => s.name === topic.subjectName);
    if (!subject) return;

    try {
      await updateTopic(subject.id, topicId, { name: newName });
      toast.success('Nome do tópico atualizado com sucesso!');
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Topics',
          action: 'handleEditTopic',
          userMessage: 'Erro ao atualizar nome do tópico',
          severity: 'medium',
          scope: 'core',
          userId: user?.id
        }
      );
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    const topic = allTopics.find(t => t.id === topicId);
    if (!topic) return;

    setDeleteModal({ isOpen: true, topic });
  };

  const handleOpenNotes = (topicId: string, topicName: string, subjectName: string) => {
    setNotesModal({
      isOpen: true,
      topicId,
      topicName,
      subjectName
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.topic) return;

    const subject = subjects.find(s => s.name === deleteModal.topic!.subjectName);
    if (!subject) return;

    try {
      await deleteTopic(subject.id, deleteModal.topic.id);
      toast.success('Tópico excluído com sucesso!');
      setDeleteModal({ isOpen: false, topic: null });
    } catch (error) {
      await errorService.report(
        error,
        {
          module: 'Topics',
          action: 'confirmDelete',
          userMessage: 'Erro ao excluir tópico',
          severity: 'high',
          scope: 'core',
          userId: user?.id
        }
      );
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="large" showText fullPage />;
  }

  return (
    <TooltipProvider>
      <div className="flex w-full">
        <div className="flex-1 flex flex-col relative w-full">
          <main className="flex-1 px-4 md:px-8 pb-8 pt-0">
            <div className="space-y-6">
              {/* Header com Pesquisa e Filtros - Sticky at top of scroll container */}
              {allTopics.length > 0 && (
                <div className="sticky top-0 z-20 px-4 md:px-8 pt-6 pb-6 mb-6 bg-transparent rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Meus Tópicos</h2>
                      <p className="text-xs text-muted-foreground mt-1">Visualize e gerencie todos os seus tópicos de estudo</p>
                    </div>
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-sm flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Novo Tópico
                    </Button>
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)] my-4"></div>
                  <div className="flex flex-col gap-3">
                    {/* Campo de Pesquisa e Filtros na mesma linha */}
                    <div className="flex flex-col lg:flex-row gap-3">
                      {/* Campo de Pesquisa */}
                      <div className="relative flex-1 min-w-0 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm hover:border-gray-300 dark:hover:border-slate-600 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 h-4 w-4" />
                        <Input
                          placeholder="Pesquisar tópicos..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-8 py-0.5 w-full bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm dark:text-white"
                        />
                      </div>

                      {/* Filtros na mesma linha */}
                      <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                        {/* Subject Filter */}
                        <div className="w-full sm:w-48">
                          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                            <SelectTrigger className="bg-card border-input text-foreground h-8 min-h-0 py-0.5 shadow-sm">
                              <SelectValue placeholder="Disciplina" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover max-w-[calc(100vw-2rem)]">
                              <SelectItem value="all" className="text-xs">Todas as disciplinas</SelectItem>
                              {subjects.map((s) => (
                                <SelectItem key={s.id} value={String(s.id)} className="text-xs whitespace-normal break-words">{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Status Filter */}
                        <div className="w-full sm:w-40">
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-card border-input text-foreground h-8 min-h-0 py-0.5 shadow-sm">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="delayed">Atrasados</SelectItem>
                              <SelectItem value="today">Hoje</SelectItem>
                              <SelectItem value="upcoming">Futuros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Difficulty Filter */}
                        <div className="w-full sm:w-52">
                          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                            <SelectTrigger className="bg-card border-input text-foreground h-8 min-h-0 py-0.5 shadow-sm">
                              <SelectValue placeholder="Dificuldade" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              <SelectItem value="all">Todas Dificuldades</SelectItem>
                              <SelectItem value="1">
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 fill-green-500 text-green-500" />
                                  <span>1 Estrela ({stats.stars1})</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="2">
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    <Star className="h-4 w-4 fill-lime-500 text-lime-500" />
                                    <Star className="h-4 w-4 fill-lime-500 text-lime-500" />
                                  </div>
                                  <span>2 Estrelas ({stats.stars2})</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="3">
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                  </div>
                                  <span>3 Estrelas ({stats.stars3})</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="4">
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                                  </div>
                                  <span>4 Estrelas ({stats.stars4})</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="5">
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    <Star className="h-4 w-4 fill-red-500 text-red-500" />
                                    <Star className="h-4 w-4 fill-red-500 text-red-500" />
                                    <Star className="h-4 w-4 fill-red-500 text-red-500" />
                                    <Star className="h-4 w-4 fill-red-500 text-red-500" />
                                    <Star className="h-4 w-4 fill-red-500 text-red-500" />
                                  </div>
                                  <span>5 Estrelas ({stats.stars5})</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sort Filter */}
                        <div className="w-full sm:w-44">
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="bg-card border-input text-foreground h-8 min-h-0 py-0.5 shadow-sm">
                              <SelectValue placeholder="Ordenar" />
                            </SelectTrigger>
                            <SelectContent className="z-50 bg-popover">
                              <SelectItem value="date">Data de Revisão</SelectItem>
                              <SelectItem value="subject">Disciplina</SelectItem>
                              <SelectItem value="name">Nome</SelectItem>
                              <SelectItem value="difficulty">Dificuldade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Topics List */}
              <div className="pb-8">
                {filteredAndSortedTopics.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

                    {/* Lógica de Renderização Condicional do Empty State */}
                    {(() => {
                      const hasSubjects = subjects.length > 0;
                      // Só considera que o usuário está ativamente pesquisando se ele digitou algo,
                      // usou status ou usou dificuldade. Filtrar por matéria apenas define "Materia Atual".
                      const isActivelyFiltering = searchTerm || statusFilter !== 'all' || difficultyFilter !== 'all';

                      // Tem filtro por matéria ativado via URL ou Select?
                      const hasSubjectSelected = subjectFilter !== 'all';

                      // Conta se a matéria atual selecionada tem pelo menos 1 tópico
                      const currentSubjectHasTopics = hasSubjectSelected
                        ? allTopics.some(t => String(t.subjectId) === String(subjectFilter))
                        : allTopics.length > 0;

                      // CASO 1: Nenhuma matéria cadastrada (Prioridade Máxima)
                      if (!hasSubjects) {
                        return (
                          <>
                            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                              <span className="text-4xl">📚</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                              Nenhuma Matéria Cadastrada
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                              Para começar a criar tópicos de estudo, você precisa primeiro cadastrar suas matérias (ex: Português, Direito Constitucional).
                            </p>
                            <Button onClick={() => navigate('/materias')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md py-6 px-8 text-lg">
                              <Plus className="h-5 w-5 mr-2" />
                              Cadastrar Primeira Matéria
                            </Button>
                          </>
                        );
                      }

                      // CASO 2: Filtros ativos sem resultados (Pesquisa, Status, Dificuldade)
                      if (isActivelyFiltering) {
                        return (
                          <>
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                              <Search className="h-10 w-10 text-gray-400 dark:text-slate-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                              Nenhum tópico encontrado
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                              Não encontramos nada com os filtros atuais. Tente limpar a pesquisa ou mudar os filtros.
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setDifficultyFilter('all');
                                setSubjectFilter('all');
                              }}
                            >
                              Limpar Filtros
                            </Button>
                          </>
                        );
                      }

                      // CASO 3: Sem tópicos na visualização atual (Pode ser Global ou de uma Matéria específica)
                      const subjectName = hasSubjectSelected
                        ? subjects.find(s => String(s.id) === String(subjectFilter))?.name || 'esta matéria'
                        : 'suas matérias';

                      return (
                        <>
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <span className="text-4xl">📝</span>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                            Adicione Seus Tópicos
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
                            {hasSubjectSelected
                              ? `Você ainda não criou tópicos para ${subjectName}. Vá para a tela de matérias e adicione conteúdo.`
                              : 'Você já tem matérias, mas ainda não criou tópicos. Vá para a tela de matérias para adicionar conteúdo.'}
                          </p>
                          <div className="flex gap-3">
                            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl shadow-md">
                              <Plus className="h-5 w-5 mr-2" />
                              Novo Tópico
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/materias')} className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm">
                              Ir para Matérias
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    <div className="bg-transparent rounded-lg shadow-sm border border-black/5 dark:border-white/5 overflow-hidden">
                      {/* Table Header - INTEGRATED */}
                      <div className="hidden lg:grid grid-cols-[1fr_100px_110px_160px_120px] gap-0 border-b border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/50 py-3 text-[10px] text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                        <div className="pl-8">Tópico / Matéria</div>
                        <div className="text-center">Dificuldade</div>
                        <div className="text-center">Contexto</div>
                        <div className="text-center">Status</div>
                        <div className="text-center">Ações</div>
                      </div>

                      <div>
                        {filteredAndSortedTopics.map((topic) => (
                          <TopicListItem
                            key={topic.id}
                            topic={{
                              ...topic,
                              subjectName: topic.subjectName,
                              subjectColor: topic.subjectColor,
                              nextReview: topic.nextReview ? new Date(topic.nextReview).toISOString() : null,
                              // Ensure difficulty_level is passed if it exists in topic, else 0
                              difficulty_level: topic.difficulty_level || 0,
                              last_search_context: topic.last_search_context
                            }}
                            onEdit={(id, newName) => {
                              handleEditTopic(id, newName);
                            }}
                            onDelete={(id) => {
                              const topicToDelete = allTopics.find(t => t.id === id);
                              if (topicToDelete) {
                                setDeleteModal({ isOpen: true, topic: topicToDelete });
                              }
                            }}
                            onOpenNotes={(topicId, topicName, subjectName) => {
                              setNotesModal({
                                isOpen: true,
                                topicId,
                                topicName,
                                subjectName
                              });
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modals */}
              <ConfirmDeleteModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, topic: null })}
                onConfirm={() => {
                  if (deleteModal.topic) {
                    deleteTopic(deleteModal.topic.subjectId, deleteModal.topic.id);
                    setDeleteModal({ isOpen: false, topic: null });
                    toast.success("Tópico excluído com sucesso!");
                  }
                }}
                topicName={deleteModal.topic?.name || ''}
                subjectName={deleteModal.topic?.subjectName || ''}
              />

              <NotesModal
                isOpen={notesModal.isOpen}
                onClose={() => setNotesModal({ isOpen: false, topicId: '', topicName: '', subjectName: '' })}
                topicId={notesModal.topicId}
                topicName={notesModal.topicName}
                subjectName={notesModal.subjectName}
                showSubjectNotes={false}
              />

              <CreateTopicModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTopicCreated={() => {
                  // Pode-se implementar algum scroll ou feedback visual automático aqui se desejado
                }}
              />
            </div>
          </main>
        </div>
      </div >
    </TooltipProvider >
  );
};

export default Topics;
