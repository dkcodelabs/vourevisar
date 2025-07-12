
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import TopicCard from '@/components/topics/TopicCard';
import TopicsModal from '@/components/topics/TopicsModal';
import AddTopicForm from '@/components/topics/AddTopicForm';
import { Topic } from '@/types';
import PageContainer from '@/components/layout/PageContainer';
import CompactTopicsSummaryCards from '@/components/topics/CompactTopicsSummaryCards';
import CompactTopicsFilters from '@/components/topics/CompactTopicsFilters';
import { NotesModal } from '@/components/reviews/NotesModal';

const Topics = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { subjects, createTopic, updateTopic, deleteTopic } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic & { subjectName: string } | null>(null);

  // Find current subject
  const currentSubject = subjectId 
    ? subjects.find(s => s.id === subjectId)
    : null;

  // Get all topics with subject names
  const allTopicsWithSubjects = subjects.flatMap(subject =>
    subject.topics.map(topic => ({
      ...topic,
      subjectName: subject.name,
      subjectId: subject.id
    }))
  );

  // Use current subject topics or all topics
  const topicsToShow = currentSubject 
    ? currentSubject.topics.map(topic => ({
        ...topic,
        subjectName: currentSubject.name,
        subjectId: currentSubject.id
      }))
    : allTopicsWithSubjects;

  // Filter topics
  const filteredTopics = topicsToShow.filter(topic => {
    const matchesSearch = topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         topic.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'completed') {
      matchesStatus = topic.completed;
    } else if (statusFilter === 'in-review') {
      matchesStatus = !!topic.reviewStage && !topic.completed;
    } else if (statusFilter === 'new') {
      matchesStatus = !topic.reviewStage && !topic.completed;
    }
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateTopic = async (data: { name: string; notes?: string }) => {
    if (!currentSubject) return;
    
    try {
      await createTopic(currentSubject.id, data.name, data.notes);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar tópico:', error);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      await deleteTopic(topicId);
    } catch (error) {
      console.error('Erro ao deletar tópico:', error);
    }
  };

  const handleNotesClick = (topic: Topic & { subjectName: string }) => {
    setSelectedTopic(topic);
  };

  const handleNotesClose = () => {
    setSelectedTopic(null);
  };

  const pageTitle = currentSubject ? `Tópicos - ${currentSubject.name}` : 'Todos os Tópicos';
  const pageDescription = currentSubject 
    ? `Gerencie os tópicos de ${currentSubject.name}`
    : 'Visualize todos os tópicos de suas matérias';

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/materias')}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{pageTitle}</h1>
              <p className="text-gray-600 mt-1">{pageDescription}</p>
            </div>
            {currentSubject && (
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white self-start sm:self-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Tópico
              </Button>
            )}
          </div>
        </div>

        {/* Statistics */}
        {topicsToShow.length > 0 && (
          <CompactTopicsSummaryCards topics={topicsToShow} />
        )}

        {/* Filters */}
        {topicsToShow.length > 0 && (
          <CompactTopicsFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}

        {/* Content */}
        {topicsToShow.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {currentSubject ? 'Nenhum tópico cadastrado' : 'Nenhuma matéria encontrada'}
            </h3>
            <p className="text-gray-600 mb-6">
              {currentSubject 
                ? 'Comece adicionando seu primeiro tópico de estudo.'
                : 'Adicione matérias primeiro para poder criar tópicos.'
              }
            </p>
            {currentSubject ? (
              <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Tópico
              </Button>
            ) : (
              <Button onClick={() => navigate('/materias')} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Matérias
              </Button>
            )}
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum tópico encontrado</h3>
            <p className="text-gray-600">Tente ajustar os filtros de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredTopics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TopicCard
                  topic={topic}
                  onDelete={handleDeleteTopic}
                  onNotesClick={handleNotesClick}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Modals */}
        {currentSubject && (
          <AddTopicForm
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSubmit={handleCreateTopic}
            subjectName={currentSubject.name}
          />
        )}

        {selectedTopic && (
          <NotesModal
            isOpen={!!selectedTopic}
            onClose={handleNotesClose}
            topic={selectedTopic}
            subjectName={selectedTopic.subjectName}
          />
        )}
      </div>
    </PageContainer>
  );
};

export default Topics;
