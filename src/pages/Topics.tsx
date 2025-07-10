
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import AddTopicForm from '@/components/topics/AddTopicForm';
import TopicCard from '@/components/topics/TopicCard';
import TopicsSummaryCards from '@/components/topics/TopicsSummaryCards';
import TopicsFilters from '@/components/topics/TopicsFilters';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/PageTitle';

interface Topic {
  id: string;
  name: string;
  subject_id: string;
  review_stage: string | null;
  review_count: number;
  completed: boolean;
}

const Topics = () => {
  const { 
    subjects, 
    topics, 
    isLoading, 
    addTopic,
    refreshData
  } = useApp();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleAddTopic = async (topicData: Omit<Topic, 'id'>) => {
    try {
      await addTopic({
        name: topicData.name,
        reviewStage: topicData.review_stage || 'Não iniciado',
        reviewCount: topicData.review_count,
        completed: topicData.completed,
        review_count: topicData.review_count
      });
      
      toast({
        title: "Tópico adicionado com sucesso!"
      });
      
      setShowAddForm(false);
      refreshData();
    } catch (error) {
      toast({
        title: "Erro ao adicionar tópico",
        description: "Tente novamente em alguns instantes."
      });
    }
  };

  const filteredTopics = topics.filter(topic => {
    const matchesSearch = topic.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || topic.subject_id === filterSubject;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'nova' && !topic.completed && topic.review_count === 0) ||
      (filterStatus === 'em-estudo' && !topic.completed && topic.review_count > 0) ||
      (filterStatus === 'concluida' && topic.completed);
    
    return matchesSearch && matchesSubject && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button
          onClick={() => setShowAddForm(true)}
          className="mr-4"
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Tópico
        </Button>
        
        <PageTitle title="Tópicos" subtitle="Gerencie seus tópicos de estudo" />
      </div>

      {/* Add Topic Form */}
      {showAddForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adicionar Novo Tópico</CardTitle>
          </CardHeader>
          <CardContent>
            <AddTopicForm
              subjects={subjects}
              onAddTopic={handleAddTopic}
              onCancel={() => setShowAddForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar tópicos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as disciplinas</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="nova">Nova</SelectItem>
                  <SelectItem value="em-estudo">Em estudo</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <TopicsSummaryCards topics={topics} />

      {/* Topics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTopics.map(topic => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </div>

      {filteredTopics.length === 0 && (
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-gray-600 mb-4">
              {searchTerm || filterSubject !== 'all' || filterStatus !== 'all'
                ? 'Nenhum tópico encontrado com os filtros aplicados.'
                : 'Nenhum tópico cadastrado ainda.'
              }
            </p>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Tópico
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Topics;
