
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { format, isToday, isBefore } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Topic {
  id: string;
  name: string;
  completed: boolean;
  review_count: number;
  next_review?: string;
  last_reviewed_at?: string;
  review_stage?: string;
}

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

const Topics = () => {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  
  // Função para carregar matérias
  const loadSubjects = async () => {
    if (!user) return;
    
    try {
      console.log('Loading subjects for user:', user.id);
      
      // Buscar matérias do usuário
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (subjectsError) {
        console.error('Error loading subjects:', subjectsError);
        throw subjectsError;
      }
      
      console.log('Subjects loaded:', subjectsData?.length || 0);
      
      // Para cada matéria, buscar seus tópicos
      const subjectsWithTopics = await Promise.all(
        (subjectsData || []).map(async (subject) => {
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
          
          return {
            id: subject.id,
            name: subject.name,
            topics: topicsData || []
          };
        })
      );
      
      console.log('Subjects with topics loaded:', subjectsWithTopics);
      setSubjects(subjectsWithTopics);
      
    } catch (error) {
      console.error('Error in loadSubjects:', error);
      toast.error('Erro ao carregar matérias');
    }
  };
  
  // Carregar dados iniciais
  useEffect(() => {
    const initializeData = async () => {
      if (!user) {
        console.log('No user found, skipping data load');
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      await loadSubjects();
      setIsLoading(false);
    };
    
    initializeData();
  }, [user]);
  
  // Definir matéria selecionada
  useEffect(() => {
    if (subjectId && subjects.length > 0) {
      setSelectedSubjectId(subjectId);
    } else if (!subjectId && subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjectId, subjects, selectedSubjectId]);
  
  const currentSubject = selectedSubjectId ? subjects.find(s => s.id === selectedSubjectId) : null;
  
  // Adicionar tópico
  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !selectedSubjectId || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          name: newTopicName.trim(),
          subject_id: selectedSubjectId,
          completed: false,
          review_count: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Atualizar estado local
        setSubjects(prev => prev.map(subject => {
          if (subject.id === selectedSubjectId) {
            return {
              ...subject,
              topics: [...subject.topics, data]
            };
          }
          return subject;
        }));
        
        setNewTopicName('');
        toast.success('Tópico adicionado com sucesso');
      }
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Erro ao adicionar tópico');
    }
  };

  // Remover tópico
  const handleRemoveTopic = async (topicId: string) => {
    if (!selectedSubjectId) return;
    
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);
      
      if (error) throw error;
      
      // Atualizar estado local
      setSubjects(prev => prev.map(subject => {
        if (subject.id === selectedSubjectId) {
          return {
            ...subject,
            topics: subject.topics.filter(topic => topic.id !== topicId)
          };
        }
        return subject;
      }));
      
      toast.success('Tópico removido com sucesso');
    } catch (error) {
      console.error('Error removing topic:', error);
      toast.error('Erro ao remover tópico');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTopic();
    }
  };

  const getTopicStatus = (topic: Topic) => {
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

  const toggleTopicExpansion = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  // Estados de loading e erro
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Acesso Negado</h1>
          <p className="text-gray-600">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  if (subjects.length === 0) {
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
            {subjectId ? `Tópicos de ${currentSubject?.name || 'Matéria'}` : 'Tópicos'}
          </CardTitle>
          {!subjectId && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Matéria:
              </label>
              <select
                value={selectedSubjectId || ''}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma matéria</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
        {currentSubject && (
          <CardContent>
            <div className="flex gap-2 mb-6">
              <Input
                type="text"
                placeholder="Nome do novo tópico"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                onKeyPress={handleKeyPress}
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

      {currentSubject && (
        <div className="space-y-3">
          {currentSubject.topics.length === 0 ? (
            <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Nenhum tópico adicionado ainda.</p>
              </CardContent>
            </Card>
          ) : (
            currentSubject.topics.map((topic) => {
              const status = getTopicStatus(topic);
              const isExpanded = expandedTopics.has(topic.id);
              
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
                          <span className="font-medium text-gray-800 truncate">{topic.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-lg font-medium ${status.color}`}>
                              {status.label}
                            </span>
                            {topic.review_stage && (
                              <span className="text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-800 font-medium">
                                {topic.review_stage}
                              </span>
                            )}
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
            })
          )}
        </div>
      )}
    </motion.div>
  );
};

export default Topics;
