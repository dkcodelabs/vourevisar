
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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

const Topics = () => {
  const navigate = useNavigate();
  const { subjects, deleteTopic, updateTopic, isLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
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
      filtered = filtered.filter(topic => topic.subjectId === subjectFilter);
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
      if (topic.completed) return true;
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
    if (topic.completed) return { status: 'Concluído', color: 'green', border: 'border-l-green-400' };
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
    if (topic.completed) return 'Concluído';
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
      console.error('Erro ao atualizar tópico:', error);
      toast.error('Erro ao atualizar nome do tópico');
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
      console.error('Erro ao deletar tópico:', error);
      toast.error('Erro ao excluir tópico');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Carregando tópicos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header com Pesquisa e Filtros */}
        <div className="mt-[15px] px-4 md:px-8 pt-6 pb-6 mb-6 bg-white rounded-2xl border border-gray-200 shadow-md">
          <div className="mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Tópicos</h1>
            <p className="text-xs text-muted-foreground mt-1">Visualize e gerencie todos os seus tópicos de estudo</p>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-300 to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.05)] my-4"></div>
          </div>
          <div className="flex flex-col gap-3">
            {/* Campo de Pesquisa e Filtros na mesma linha */}
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Campo de Pesquisa */}
              <div className="relative flex-1 min-w-0 bg-gray-50/50 border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Pesquisar tópicos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 w-full bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 text-sm"
                />
              </div>

              {/* Filtros na mesma linha */}
              <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                {/* Subject Filter */}
                <div className="w-full sm:w-48">
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger className="bg-card border-input text-foreground h-11 shadow-sm">
                      <SelectValue placeholder="Disciplina" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      <SelectItem value="all">Todas as disciplinas</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-40">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-card border-input text-foreground h-11 shadow-sm">
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
                    <SelectTrigger className="bg-card border-input text-foreground h-11 shadow-sm">
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
                    <SelectTrigger className="bg-card border-input text-foreground h-11 shadow-sm">
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

        {/* Topics List */}
        <div className="pb-8">
          {filteredAndSortedTopics.length === 0 ? (
            <Card className="bg-card shadow-sm border">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' || difficultyFilter !== 'all' || subjectFilter !== 'all'
                    ? 'Nenhum tópico encontrado para os filtros aplicados.'
                    : 'Nenhum tópico cadastrado ainda.'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && difficultyFilter === 'all' && subjectFilter === 'all' && (
                  <Button onClick={() => navigate('/materias')} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeira Matéria
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Table Header - INTEGRATED */}
                <div className="hidden md:grid grid-cols-[1fr_100px_160px_120px] gap-0 border-b border-gray-200 bg-gray-50/80 py-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wide">
                  <div className="pl-8">Tópico / Matéria</div>
                  <div className="text-center">Dificuldade</div>
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
                        difficulty_level: topic.difficulty_level || 0
                      }}
                      onEdit={(id, newName) => {
                        updateTopic(topic.subjectId, id, { name: newName });
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
      </div>
    </TooltipProvider>
  );
};

export default Topics;
