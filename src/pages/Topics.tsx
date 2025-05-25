
import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { EditableTopicName } from '@/components/EditableTopicName';
import { format, isToday, isBefore } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Topic } from '@/types';

const Topics = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { subjects, addTopicToSubject, removeTopicFromSubject, fetchSubjects } = useApp();
  const [newTopicName, setNewTopicName] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Load subjects on mount
  useEffect(() => {
    const loadSubjects = async () => {
      setIsLoading(true);
      await fetchSubjects();
      setIsLoading(false);
    };
    
    if (subjects.length === 0) {
      loadSubjects();
    } else {
      setIsLoading(false);
    }
  }, []);
  
  const subject = subjects.find(s => s.id === subjectId);
  
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
      await addTopicToSubject(subjectId, newTopicName.trim());
      setNewTopicName('');
    }
  };

  const handleRemoveTopic = async (topicId: string) => {
    if (subjectId) {
      await removeTopicFromSubject(subjectId, topicId);
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
                          onUpdate={fetchSubjects}
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
