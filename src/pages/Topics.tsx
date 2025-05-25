
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { EditableTopicName } from '@/components/EditableTopicName';
import { format, isToday, isBefore } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Topic {
  id: string;
  name: string;
  completed: boolean;
  reviewCount: number;
  nextReview?: Date;
  reviewStage?: string;
  lastReviewedAt?: Date;
}

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

const Topics = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Load subject data on mount
  useEffect(() => {
    if (user && subjectId) {
      fetchSubjectData();
    }
  }, [user, subjectId]);

  const fetchSubjectData = async () => {
    if (!user || !subjectId) return;
    
    setIsLoading(true);
    try {
      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .eq('user_id', user.id)
        .single();
      
      if (subjectError) throw subjectError;
      
      if (!subjectData) {
        setSubject(null);
        setIsLoading(false);
        return;
      }
      
      // Fetch topics for this subject
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId);
      
      if (topicsError) throw topicsError;
      
      // Convert topics data
      const processedTopics = (topicsData || []).map(topic => ({
        id: topic.id,
        name: topic.name,
        completed: topic.completed,
        reviewCount: topic.review_count,
        nextReview: topic.next_review ? new Date(topic.next_review) : undefined,
        reviewStage: topic.review_stage,
        lastReviewedAt: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined
      }));
      
      setSubject({
        id: subjectData.id,
        name: subjectData.name,
        topics: processedTopics
      });
    } catch (error) {
      console.error('Erro ao buscar dados da matéria:', error);
      toast.error("Erro ao carregar matéria");
      setSubject(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </div>
    );
  }
  
  if (!subject) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Matéria não encontrada</h1>
          <Button onClick={() => navigate('/materias')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Matérias
          </Button>
        </div>
      </div>
    );
  }

  const handleAddTopic = async () => {
    if (newTopicName.trim() && subjectId) {
      try {
        const { data, error } = await supabase
          .from('topics')
          .insert({
            name: newTopicName.trim(),
            subject_id: subjectId,
            completed: false,
            review_count: 0
          })
          .select()
          .single();
          
        if (error) throw error;
        
        if (data) {
          const newTopic = {
            id: data.id,
            name: data.name,
            completed: false,
            reviewCount: 0
          };
          
          setSubject(prev => prev ? {
            ...prev,
            topics: [...prev.topics, newTopic]
          } : null);
          
          setNewTopicName('');
          toast.success("Tópico adicionado com sucesso");
        }
      } catch (error) {
        console.error('Erro ao adicionar tópico:', error);
        toast.error("Erro ao adicionar tópico");
      }
    }
  };

  const handleRemoveTopic = async (topicId: string) => {
    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', topicId);
        
      if (error) throw error;
      
      setSubject(prev => prev ? {
        ...prev,
        topics: prev.topics.filter(topic => topic.id !== topicId)
      } : null);
      
      toast.success("Tópico removido com sucesso");
    } catch (error) {
      console.error('Erro ao remover tópico:', error);
      toast.error("Erro ao remover tópico");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTopic();
    }
  };

  const getTopicStatus = (topic: Topic) => {
    if (topic.completed && (!topic.nextReview || topic.reviewStage === 'Concluído')) {
      return { label: "Concluído", variant: "default" as const, color: "bg-green-100 text-green-800" };
    }
    
    if (!topic.nextReview) {
      return { label: "Não Iniciado", variant: "secondary" as const, color: "bg-gray-100 text-gray-800" };
    }
    
    const reviewDate = new Date(topic.nextReview);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isBefore(reviewDate, today)) {
      return { label: "Atrasado", variant: "destructive" as const, color: "bg-red-100 text-red-800" };
    } else if (isToday(reviewDate)) {
      return { label: "Hoje", variant: "default" as const, color: "bg-yellow-100 text-yellow-800" };
    } else {
      const formattedDate = format(reviewDate, 'dd/MM');
      return { label: `Próxima: ${formattedDate}`, variant: "secondary" as const, color: "bg-blue-100 text-blue-800" };
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
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
              Tópicos de {subject.name}
            </CardTitle>
          </CardHeader>
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
        </Card>
      </motion.div>

      <motion.div className="space-y-3" variants={containerVariants}>
        {subject.topics.length === 0 ? (
          <motion.div variants={itemVariants}>
            <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">Nenhum tópico adicionado ainda.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          subject.topics.map((topic) => {
            const status = getTopicStatus(topic);
            const isExpanded = expandedTopics.has(topic.id);
            
            return (
              <motion.div key={topic.id} variants={itemVariants}>
                <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <EditableTopicName
                          topicId={topic.id}
                          initialName={topic.name}
                          onUpdate={fetchSubjectData}
                        />
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          {topic.reviewStage && (
                            <span className="text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-800 font-medium">
                              {topic.reviewStage}
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
                              <span className="ml-2 text-gray-800">{topic.reviewCount || 0}</span>
                            </div>
                            {topic.lastReviewedAt && (
                              <div>
                                <span className="font-medium text-gray-600">Última revisão:</span>
                                <span className="ml-2 text-gray-800">
                                  {format(new Date(topic.lastReviewedAt), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            )}
                            {topic.nextReview && (
                              <div>
                                <span className="font-medium text-gray-600">Próxima revisão:</span>
                                <span className="ml-2 text-gray-800">
                                  {format(new Date(topic.nextReview), 'dd/MM/yyyy')}
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
      </motion.div>
    </motion.div>
  );
};

export default Topics;
