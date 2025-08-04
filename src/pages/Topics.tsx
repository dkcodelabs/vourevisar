
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, FileText, Trash2 } from 'lucide-react';
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

const Topics = () => {
  const { subjects, deleteTopic, updateTopic, isLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
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
      subjectName: subject.name,
      subjectColor: subject.color,
      isMarkedForReview: false
    }))
  );

  const filteredAndSortedTopics = useMemo(() => {
    let filtered = allTopics;

    // Aplicar filtro de pesquisa
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(topic => 
        topic.name.toLowerCase().includes(searchLower) ||
        topic.subjectName.toLowerCase().includes(searchLower)
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

    // Aplicar filtro de dificuldade
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(topic => {
        return topic.difficulty_level === difficultyFilter;
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
  }, [allTopics, searchTerm, statusFilter, difficultyFilter, sortBy]);

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

    const easy = allTopics.filter(topic => topic.difficulty_level === 'easy').length;
    const medium = allTopics.filter(topic => topic.difficulty_level === 'medium').length;
    const hard = allTopics.filter(topic => topic.difficulty_level === 'hard').length;

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
      counts: { easy, medium, hard },
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
      easy,
      medium,
      hard
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
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-slate-600">Carregando tópicos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto p-4 md:p-6">
          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Pesquisar tópico ou disciplina"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-slate-300"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-700">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos ({stats.total})</SelectItem>
                  <SelectItem value="delayed">Atrasados ({stats.delayed})</SelectItem>
                  <SelectItem value="today">Hoje ({stats.today})</SelectItem>
                  <SelectItem value="upcoming">Próximos ({stats.upcoming})</SelectItem>
                </SelectContent>
              </Select>

              {/* Difficulty Filter */}
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-700">
                  <SelectValue placeholder="Dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Dificuldades</SelectItem>
                  <SelectItem value="easy">🟢 Fácil ({stats.easy})</SelectItem>
                  <SelectItem value="medium">🟡 Médio ({stats.medium})</SelectItem>
                  <SelectItem value="hard">🔴 Difícil ({stats.hard})</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-white border-slate-300 text-slate-700">
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

          {/* Topics List */}
          <div className="pb-8">
            {filteredAndSortedTopics.length === 0 ? (
              <Card className="bg-white shadow-sm border border-slate-200">
                <CardContent className="text-center py-12">
                  <p className="text-slate-500 mb-4">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Nenhum tópico encontrado para os filtros aplicados.' 
                      : 'Nenhum tópico cadastrado ainda.'
                    }
                  </p>
                  {!searchTerm && statusFilter === 'all' && difficultyFilter === 'all' && (
                    <Button onClick={() => window.location.href = '/materias'} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeira Matéria
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
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
                        className={`${topicStatus.border} border-l-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors`}
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
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">
                                {topic.subjectName}
                              </p>
                            </div>
                            
                            {/* Badges and Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Stage Badge */}
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap
                                  ${topicStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                                    topicStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                    topicStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'}`}>
                                  {stageDisplay}
                                </span>
                                
                                {/* Status Badge */}
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap
                                  ${topicStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                                    topicStatus.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                                    topicStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'}`}>
                                  {topicStatus.status}
                                </span>
                              </div>
                              
                              {/* Action Icons */}
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenNotes(topic.id, topic.name, topic.subjectName)}
                                      className="h-8 w-8 p-0 hover:bg-slate-200 text-slate-600"
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
                                      className="h-8 w-8 p-0 hover:bg-slate-200 text-slate-600"
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
                                      className="h-8 w-8 p-0 hover:bg-slate-200 text-slate-600"
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
        />
      </div>
    </TooltipProvider>
  );
};

export default Topics;
