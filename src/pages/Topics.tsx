
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
import { toast } from "sonner";
import { format, isToday, isPast, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ConfirmDeleteModal from '@/components/topics/ConfirmDeleteModal';
import NotesModal from '@/components/reviews/NotesModal';
import { EditableTopicName } from '@/components/EditableTopicName';
import { DifficultyRating } from '@/components/ui/difficulty-rating';

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
    topic: (Topic & { subjectName: string }) | null;
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

    // Debug log detalhado para entender o problema
    console.log('🔍 Debug completo de dificuldades:', {
      totalTopics: allTopics.length,
      topicsWithDifficulty: allTopics.filter(t => t.difficulty_level).length,
      allDifficulties: allTopics.map(t => ({
        name: t.name,
        subject: t.subjectName,
        difficulty_level: t.difficulty_level,
        hasValue: !!t.difficulty_level
      })),
      counts: { stars1, stars2, stars3, stars4, stars5 },
      sampleTopics: allTopics.slice(0, 3).map(t => ({
        name: t.name,
        difficulty: t.difficulty_level,
        id: t.id
      }))
    });

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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4">
          {/* Header com Pesquisa */}
          <div className="mb-8">
            <div className="flex flex-col gap-6">
              {/* Título e Pesquisa */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Tópicos</h1>
                  <p className="text-muted-foreground">Gerencie e acompanhe seus tópicos de estudo</p>
                </div>
                
                {/* Campo de Pesquisa Principal */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                  <Input
                    placeholder="Pesquisar tópicos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-11 bg-card border-input text-foreground shadow-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Filtros Organizados */}
              <Card className="bg-card/50 border shadow-sm">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Subject Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Disciplina</label>
                      <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                        <SelectTrigger className="bg-background border-input text-foreground h-10">
                          <SelectValue placeholder="Todas as disciplinas" />
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-background border-input text-foreground h-10">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos ({stats.total})</SelectItem>
                          <SelectItem value="delayed">Atrasados ({stats.delayed})</SelectItem>
                          <SelectItem value="today">Hoje ({stats.today})</SelectItem>
                          <SelectItem value="upcoming">Próximos ({stats.upcoming})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Difficulty Filter com Estrelas */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Dificuldade</label>
                      <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                        <SelectTrigger className="bg-background border-input text-foreground h-10">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
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

                    {/* Sort */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Ordenar por</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="bg-background border-input text-foreground h-10">
                          <SelectValue placeholder="Data de Revisão" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Data de Revisão</SelectItem>
                          <SelectItem value="subject">Matéria</SelectItem>
                          <SelectItem value="name">Nome do Tópico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              <div className="bg-card shadow-sm border rounded-lg overflow-hidden">
                <AnimatePresence>
                  {filteredAndSortedTopics.map((topic) => {
                    const topicStatus = getTopicStatus(topic);
                    const stageDisplay = getStageDisplay(topic);
                    
                    return (
                      <motion.div
                        key={topic.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`${topicStatus.border} border-l-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors`}
                      >
                        <div className="px-4 sm:px-6 py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                            {/* Topic Name and Subject */}
                            <div className="flex-1 min-w-0">
                              <EditableTopicName
                                topicId={topic.id}
                                initialName={topic.name}
                                onUpdate={() => {}}
                                isEditing={editingTopicId === topic.id}
                                onEditChange={(isEditing) => {
                                  setEditingTopicId(isEditing ? topic.id : null);
                                }}
                              />
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-1">
                                {topic.subjectName}
                              </p>
                            </div>
                            
                            {/* Badges and Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {/* Difficulty Stars - Fixed Width, Right Aligned */}
                                <div className="w-24 flex justify-end">
                                  {topic.difficulty_level && (
                                    <DifficultyRating 
                                      value={topic.difficulty_level} 
                                      readonly={true} 
                                      size="sm" 
                                    />
                                  )}
                                </div>
                                
                                {/* Stage Badge - Fixed Width, Left Aligned */}
                                <div className="w-20 flex justify-start">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap
                                    ${topicStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                                      topicStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                      topicStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'}`}>
                                    {stageDisplay}
                                  </span>
                                </div>
                                
                                {/* Status Badge - Fixed Width, Right Aligned */}
                                <div className="w-36 flex justify-end">
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap
                                    ${topicStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                                      topicStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                      topicStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                      'bg-gray-100 text-gray-700'}`}>
                                    {topicStatus.status}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Action Icons */}
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenNotes(topic.id, topic.name, topic.subjectName)}
                                      className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Anotações</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingTopicId(topic.id)}
                                      className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Alterar nome</p>
                                  </TooltipContent>
                                </Tooltip>
                                
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteTopic(topic.id)}
                                      className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Excluir tópico</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        <ConfirmDeleteModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, topic: null })}
          onConfirm={confirmDelete}
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
