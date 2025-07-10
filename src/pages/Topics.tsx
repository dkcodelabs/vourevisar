
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowLeft, BookOpen, Filter, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import AddTopicForm from '@/components/topics/AddTopicForm';
import TopicCard from '@/components/topics/TopicCard';
import TopicsSummaryCards from '@/components/topics/TopicsSummaryCards';
import TopicsFilters from '@/components/topics/TopicsFilters';
import { Subject, Topic } from '@/types';
import { PageTitle } from '@/components/PageTitle';

interface TopicFilter {
  status?: 'Nova' | 'Em Estudo' | 'Concluída' | '';
  searchTerm?: string;
}

const Topics = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { subjects, isLoading, error, addTopic, updateTopic, deleteTopic } = useApp();
  
  const [subject, setSubject] = useState<Subject | undefined>(undefined);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [topicFilter, setTopicFilter] = useState<TopicFilter>({ status: '', searchTerm: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (subjects && subjectId) {
      const foundSubject = subjects.find(s => s.id === subjectId);
      setSubject(foundSubject);
      setTopics(foundSubject?.topics || []);
    }
  }, [subjects, subjectId]);

  const handleAddTopic = async (topicName: string) => {
    if (!subjectId) {
      toast.error("ID da matéria não encontrado.");
      return;
    }
    try {
      await addTopic(subjectId, { 
        name: topicName, 
        reviewStage: 'Nova', 
        reviewCount: 0,
        completed: false,
        review_count: 0
      });
      toast.success("Tópico adicionado com sucesso!");
      setIsAddingTopic(false);
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      toast.error("Erro ao adicionar tópico. Tente novamente.");
    }
  };

  const handleUpdateTopic = async (topicId: string, updates: Partial<Topic>) => {
    if (!subjectId) {
      toast.error("ID da matéria não encontrado.");
      return;
    }
    try {
      await updateTopic(subjectId, topicId, updates);
      toast.success("Tópico atualizado com sucesso!");
    } catch (error) {
      console.error('Erro ao atualizar tópico:', error);
      toast.error("Erro ao atualizar tópico. Tente novamente.");
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!subjectId) {
      toast.error("ID da matéria não encontrado.");
      return;
    }
    try {
      await deleteTopic(subjectId, topicId);
      toast.success("Tópico excluído com sucesso!");
    } catch (error) {
      console.error('Erro ao excluir tópico:', error);
      toast.error("Erro ao excluir tópico. Tente novamente.");
    }
  };

  const filteredTopics = useMemo(() => {
    let result = topics;

    if (topicFilter.status) {
      result = result.filter(topic => topic.reviewStage === topicFilter.status);
    }

    if (topicFilter.searchTerm) {
      const searchTermLower = topicFilter.searchTerm.toLowerCase();
      result = result.filter(topic =>
        topic.name.toLowerCase().includes(searchTermLower)
      );
    }

    return result;
  }, [topics, topicFilter]);

  const handleFilterChange = (newFilter: Partial<TopicFilter>) => {
    setTopicFilter(prev => ({ ...prev, ...newFilter }));
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-red-600">Erro ao carregar tópicos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!subject) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Matéria não encontrada</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">A matéria solicitada não foi encontrada.</p>
          <Button onClick={() => navigate('/materias')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Matérias
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/materias')}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageTitle title={`Tópicos - ${subject.name}`} subtitle="Gerencie os tópicos desta matéria" />
      </div>

      {/* Summary Cards */}
      <TopicsSummaryCards 
        totalTopics={topics.length}
        delayedTopics={topics.filter(t => !t.completed && t.nextReview && new Date(t.nextReview) < new Date()).length}
        futureTopics={topics.filter(t => !t.completed && t.nextReview && new Date(t.nextReview) > new Date()).length}
      />

      {/* Filters */}
      <div className="mb-4">
        <Button variant="outline" size="sm" onClick={toggleFilters}>
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </Button>
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden mt-2"
            >
              <TopicsFilters 
                searchTerm={topicFilter.searchTerm || ''}
                onSearchChange={(value) => handleFilterChange({ searchTerm: value })}
                statusFilter={topicFilter.status || ''}
                onStatusFilterChange={(value) => handleFilterChange({ status: value as any })}
                sortBy=""
                onSortChange={() => {}}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Topic */}
      {isAddingTopic ? (
        <div className="mb-4">
          <AddTopicForm />
        </div>
      ) : (
        <Button onClick={() => setIsAddingTopic(true)} className="mb-4">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Tópico
        </Button>
      )}

      {/* Topics List */}
      {filteredTopics.length === 0 ? (
        <Card>
          <CardContent className="text-center p-6">
            <BookOpen className="h-10 w-10 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Nenhum tópico encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTopics.map(topic => (
              <motion.div
                key={topic.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TopicCard
                  topic={{ ...topic, subjectName: subject.name }}
                  onDelete={handleDeleteTopic}
                  onNotesClick={(topic) => console.log('Notes clicked', topic)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Topics;
