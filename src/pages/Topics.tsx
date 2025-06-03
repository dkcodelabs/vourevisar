import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';

interface TopicData {
  id: string;
  name: string;
  completed: boolean;
  review_count: number;
  next_review?: string;
  last_reviewed_at?: string;
  review_stage?: string;
  subject_id: string;
}

interface SubjectData {
  id: string;
  name: string;
  topics: TopicData[];
  status?: string;
}

const Topics = () => {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updateSubject, subjects } = useApp();
  
  const [subjectsData, setSubjects] = useState<SubjectData[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectData | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [checkedTopics, setCheckedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSubjects, setShowAllSubjects] = useState(true);

  console.log('Topics component rendered - subjectId:', subjectId, 'user:', user?.id);
  console.log('Current subjects state:', subjectsData);
  console.log('Selected subject:', selectedSubject);

  // Carregar matérias
  const loadSubjects = async () => {
    if (!user) {
      console.log('No user found');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Loading subjects for user:', user.id);
      setError(null);

      // Buscar matérias do usuário
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (subjectsError) {
        console.error('Error loading subjects:', subjectsError);
        throw subjectsError;
      }

      console.log('Subjects loaded:', subjectsData?.length || 0, subjectsData);

      if (!subjectsData || subjectsData.length === 0) {
        setSubjects([]);
        setIsLoading(false);
        return;
      }

      // Buscar tópicos para cada matéria
      const subjectsWithTopics = await Promise.all(
        subjectsData.map(async (subject) => {
          console.log('Loading topics for subject:', subject.name, subject.id);
          
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select('*')
            .eq('subject_id', subject.id)
            .order('name');

          if (topicsError) {
            console.error('Error loading topics for subject:', subject.id, topicsError);
            return {
              id: subject.id,
              name: subject.name,
              topics: []
            };
          }

          console.log(`Topics loaded for ${subject.name}:`, topicsData?.length || 0, topicsData);

          return {
            id: subject.id,
            name: subject.name,
            topics: topicsData || []
          };
        })
      );

      console.log('Subjects with topics loaded:', subjectsWithTopics);
      setSubjects(subjectsWithTopics);

      // Definir matéria selecionada ou mostrar todas por padrão
      if (subjectId) {
        const found = subjectsWithTopics.find(s => s.id === subjectId);
        console.log('Setting selected subject from URL:', found);
        setSelectedSubject(found || null);
        setShowAllSubjects(false);
      } else {
        setShowAllSubjects(true);
        setSelectedSubject(null);
      }

    } catch (error) {
      console.error('Error in loadSubjects:', error);
      setError('Erro ao carregar matérias');
      toast.error('Erro ao carregar matérias');
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    console.log('useEffect triggered - user:', user?.id);
    loadSubjects();
  }, [user]);

  // Adicionar tópico
  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !selectedSubject || !user) {
      console.log('Cannot add topic - missing data');
      return;
    }

    try {
      console.log('Adding topic:', newTopicName, 'to subject:', selectedSubject.id);

      const { data, error } = await supabase
        .from('topics')
        .insert({
          name: newTopicName.trim(),
          subject_id: selectedSubject.id,
          completed: false,
          review_count: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding topic:', error);
        throw error;
      }

      console.log('Topic added successfully:', data);

      // Atualizar estado local
      setSelectedSubject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          topics: [...prev.topics, data]
        };
      });

      setSubjects(prev => prev.map(subject => {
        if (subject.id === selectedSubject.id) {
          return {
            ...subject,
            topics: [...subject.topics, data]
          };
        }
        return subject;
      }));

      setNewTopicName('');
      toast.success('Tópico adicionado com sucesso');

    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Erro ao adicionar tópico');
    }
  };

  // Remover tópico
  const handleRemoveTopic = async (topicId: string) => {
    if (!selectedSubject && !showAllSubjects) return;

    try {
      console.log('Removing topic:', topicId);

      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);

      if (error) {
        console.error('Error removing topic:', error);
        throw error;
      }

      console.log('Topic removed successfully');

      // Atualizar estado local
      if (selectedSubject) {
        setSelectedSubject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            topics: prev.topics.filter(topic => topic.id !== topicId)
          };
        });
      }

      setSubjects(prev => prev.map(subject => ({
        ...subject,
        topics: subject.topics.filter(topic => topic.id !== topicId)
      })));

      setCheckedTopics(prev => {
        const updated = new Set(prev);
        updated.delete(topicId);
        return updated;
      });

      toast.success('Tópico removido com sucesso');

    } catch (error) {
      console.error('Error removing topic:', error);
      toast.error('Erro ao remover tópico');
    }
  };

  const getTopicStatus = (topic: TopicData) => {
    if (topic.completed && (!topic.next_review || topic.review_stage === 'Concluído')) {
      return { label: "Concluído", color: "bg-green-100 text-green-800" };
    }
    
    if (!topic.next_review) {
      return { label: "Não Iniciado", color: "bg-gray-100 text-gray-800" };
    }
    
    const reviewDate = new Date(topic.next_review);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(reviewDate, today)) {
      return { label: "Atrasado", color: "bg-red-100 text-red-800" };
    } else if (isToday(reviewDate)) {
      return { label: "Hoje", color: "bg-yellow-100 text-yellow-800" };
    } else {
      const formattedDate = format(reviewDate, 'dd/MM');
      return { label: `Próxima: ${formattedDate}`, color: "bg-blue-100 text-blue-800" };
    }
  };

  const getRevisionStage = (topic: TopicData) => {
    if (!topic.review_stage) {
      return "Não Iniciado";
    }
    return topic.review_stage;
  };

  const toggleTopicExpansion = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleTopicCheck = async (topicId: string, checked: boolean) => {
    const newChecked = new Set(checkedTopics);
    if (checked) {
      newChecked.add(topicId);
    } else {
      newChecked.delete(topicId);
    }
    setCheckedTopics(newChecked);

    // Atualizar o tópico no banco
    const topic = selectedSubject?.topics.find(t => t.id === topicId);
    if (topic) {
      try {
        await supabase
          .from('topics')
          .update({
            completed: checked,
            review_stage: checked ? 'Concluído' : null
          })
          .eq('id', topicId);
        // Recarregar tópicos da matéria do banco
        if (selectedSubject) {
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select('*')
            .eq('subject_id', selectedSubject.id);
          if (!topicsError && topicsData) {
            setSelectedSubject(prev => prev ? { ...prev, topics: topicsData } : null);
            setSubjects(prev => prev.map(subject => subject.id === selectedSubject.id ? { ...subject, topics: topicsData } : subject));
          }
        }
      } catch (error) {
        toast.error('Erro ao atualizar tópico');
      }
    }
    // Após marcar/desmarcar, verificar status da matéria
    if (selectedSubject) {
      await checkAndUpdateSubjectStatus(selectedSubject.id);
    }
  };

  const getAllTopics = () => {
    const allTopics = subjectsData.flatMap(subject => 
      subject.topics.map(topic => ({
        ...topic,
        subjectName: subject.name
      }))
    );
    console.log('All topics calculated:', allTopics);
    return allTopics;
  };

  // Função para verificar e atualizar status da matéria
  const checkAndUpdateSubjectStatus = async (subjectId: string) => {
    const subject = subjectsData.find(s => s.id === subjectId);
    if (!subject) return;
    const allCompleted = subject.topics.length > 0 && subject.topics.every(topic => topic.completed || topic.review_stage === 'Concluído');
    if (allCompleted && subject.status !== 'Concluída') {
      await updateSubject(subjectId, { status: 'Concluída' });
    }
  };

  const renderTopicCard = (topic: TopicData & { subjectName?: string }) => {
    const status = getTopicStatus(topic);
    const revisionStage = getRevisionStage(topic);
    const isExpanded = expandedTopics.has(topic.id);
    const isChecked = checkedTopics.has(topic.id);
    
    return (
      <motion.div 
        key={topic.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleTopicCheck(topic.id, checked as boolean)}
                  className="h-4 w-4"
                />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="font-medium text-gray-800 truncate">{topic.name}</span>
                  {showAllSubjects && topic.subjectName && (
                    <span className="text-xs text-gray-500">{topic.subjectName}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-800 font-medium">
                    {revisionStage}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTopicExpansion(topic.id)}
                  className="h-8 w-8 p-0"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveTopic(topic.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  className="mt-4 pt-4 border-t border-gray-200"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Revisões:</span>
                      <span className="ml-2 text-gray-800">{topic.review_count || 0}</span>
                    </div>
                    {topic.last_reviewed_at && (
                      <div>
                        <span className="font-medium text-gray-600">Última revisão:</span>
                        <span className="ml-2 text-gray-800">
                          {format(new Date(topic.last_reviewed_at), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                    {topic.next_review && (
                      <div>
                        <span className="font-medium text-gray-600">Próxima revisão:</span>
                        <span className="ml-2 text-gray-800">
                          {format(new Date(topic.next_review), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-600">Status:</span>
                      <span className="ml-2 text-gray-800">
                        {topic.completed ? 'Concluído' : 'Em andamento'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Estados de loading e erro
  if (isLoading) {
    console.log('Rendering loading state');
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('Rendering no user state');
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Acesso Negado</h1>
          <p className="text-gray-600">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Erro</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadSubjects}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (subjectsData.length === 0) {
    console.log('Rendering no subjects state');
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Nenhuma matéria encontrada</h1>
          <p className="text-gray-600 mb-4">Você precisa adicionar matérias primeiro.</p>
          <Button onClick={() => navigate('/materias')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ir para Matérias
          </Button>
        </div>
      </div>
    );
  }

  console.log('Rendering main content - selectedSubject:', selectedSubject?.name, 'showAllSubjects:', showAllSubjects);
  console.log('Topics to render:', showAllSubjects ? getAllTopics() : selectedSubject?.topics);

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Button 
        variant="outline" 
        onClick={() => navigate('/materias')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Matérias
      </Button>
      
      <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">
            Tópicos{selectedSubject ? ` de ${selectedSubject.name}` : ''}
          </CardTitle>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Visualização:
            </label>
            <select
              value={showAllSubjects ? 'all' : selectedSubject?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  console.log('Switching to show all subjects');
                  setShowAllSubjects(true);
                  setSelectedSubject(null);
                } else {
                  const subject = subjectsData.find(s => s.id === e.target.value);
                  console.log('Switching to specific subject:', subject);
                  setSelectedSubject(subject || null);
                  setShowAllSubjects(false);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as Matérias</option>
              {subjectsData.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.topics.length} tópicos)
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        {selectedSubject && !showAllSubjects && (
          <CardContent>
            <div className="flex gap-2 mb-6">
              <Input
                type="text"
                placeholder="Nome do novo tópico"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                className="flex-1"
              />
              <Button onClick={handleAddTopic} disabled={!newTopicName.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="space-y-3">
        {showAllSubjects ? (
          getAllTopics().length === 0 ? (
            <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Nenhum tópico adicionado ainda.</p>
              </CardContent>
            </Card>
          ) : (
            getAllTopics().map((topic) => renderTopicCard(topic))
          )
        ) : selectedSubject ? (
          selectedSubject.topics.length === 0 ? (
            <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Nenhum tópico adicionado ainda.</p>
              </CardContent>
            </Card>
          ) : (
            selectedSubject.topics.map((topic) => renderTopicCard(topic))
          )
        ) : null}
      </div>
    </motion.div>
  );
};

export default Topics;
