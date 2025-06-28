import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Topic } from '@/types';
import { toast } from "react-hot-toast";
import { format, isToday, isPast, startOfDay } from 'date-fns';
import CompactTopicsSummaryCards from '@/components/topics/CompactTopicsSummaryCards';
import CompactTopicsFilters from '@/components/topics/CompactTopicsFilters';
import AddTopicForm from '@/components/topics/AddTopicForm';
import TopicListItem from '@/components/topics/TopicListItem';
import ConfirmDeleteModal from '@/components/topics/ConfirmDeleteModal';
import NotesModal from '@/components/reviews/NotesModal';

const Topics = () => {
  const { subjects, deleteTopic, updateTopic, isLoading } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
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
        if (topic.completed) return statusFilter === 'upcoming'; // Concluídos vão para "próximos"
        if (!topic.nextReview) return statusFilter === 'upcoming';
        
        const reviewDate = startOfDay(new Date(topic.nextReview));
        
        if (statusFilter === 'delayed') {
          return reviewDate < today;
        } else if (statusFilter === 'upcoming') {
          return reviewDate >= today;
        }
        
        return true;
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
          // Se não tem data de revisão, coloca no final
          if (!a.nextReview && !b.nextReview) return 0;
          if (!a.nextReview) return 1;
          if (!b.nextReview) return -1;
          
          return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
      }
    });

    return filtered;
  }, [allTopics, searchTerm, statusFilter, sortBy]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    
    const delayed = allTopics.filter(topic => {
      if (topic.completed || !topic.nextReview) return false;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      return reviewDate < today;
    }).length;

    const upcoming = allTopics.filter(topic => {
      if (topic.completed) return true;
      if (!topic.nextReview) return true;
      const reviewDate = startOfDay(new Date(topic.nextReview));
      return reviewDate >= today;
    }).length;

    return {
      total: allTopics.length,
      delayed,
      upcoming
    };
  }, [allTopics]);

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

  const handleCloseNotes = () => {
    setNotesModal({
      isOpen: false,
      topicId: '',
      topicName: '',
      subjectName: ''
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
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Carregando tópicos...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto p-6 min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">Tópicos</h1>
        <p className="text-gray-600 text-sm">Gerencie todos os seus tópicos de estudo</p>
      </div>

      <CompactTopicsSummaryCards
        totalTopics={stats.total}
        delayedTopics={stats.delayed}
        futureTopics={stats.upcoming}
      />

      <AddTopicForm />

      <CompactTopicsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {filteredAndSortedTopics.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg">
          <CardContent className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Nenhum tópico encontrado para os filtros aplicados.' 
                : 'Nenhum tópico cadastrado ainda.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => window.location.href = '/materias'} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Matéria
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredAndSortedTopics.map(topic => (
              <TopicListItem
                key={topic.id}
                topic={{
                  id: topic.id,
                  name: topic.name,
                  subjectName: topic.subjectName,
                  subjectColor: topic.subjectColor,
                  nextReview: topic.nextReview ? topic.nextReview.toISOString() : null,
                  reviewCount: topic.reviewCount,
                  completed: topic.completed,
                  reviewStage: topic.reviewStage,
                  notes: topic.notes,
                  isMarkedForReview: topic.isMarkedForReview
                }}
                onEdit={handleEditTopic}
                onDelete={handleDeleteTopic}
                onOpenNotes={handleOpenNotes}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, topic: null })}
        onConfirm={confirmDelete}
        topicName={deleteModal.topic?.name || ''}
        subjectName={deleteModal.topic?.subjectName || ''}
      />

      <NotesModal
        isOpen={notesModal.isOpen}
        onClose={handleCloseNotes}
        topicId={notesModal.topicId}
        topicName={notesModal.topicName}
        subjectName={notesModal.subjectName}
      />
    </motion.div>
  );
};

export default Topics;
