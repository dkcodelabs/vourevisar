
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, ArrowLeft, ChevronDown, ChevronUp, FileText, Search } from 'lucide-react';
import { format, isToday, isBefore } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import RichTextNotesEditor from '@/components/RichTextNotesEditor';
import { TopicNotes } from '@/types';

const Topics = () => {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subjects, addTopic, deleteTopic, updateTopic, isDataLoaded, isLoading } = useApp();
  
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [checkedTopics, setCheckedTopics] = useState<Set<string>>(new Set());
  const [showAllSubjects, setShowAllSubjects] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  console.log('Topics component rendered - subjectId:', subjectId, 'user:', user?.id);
  console.log('Current subjects state:', subjects);
  console.log('Selected subject:', selectedSubject);

  // Definir matéria selecionada ou mostrar todas por padrão
  useEffect(() => {
    if (subjectId && subjects.length > 0) {
      const found = subjects.find(s => s.id === subjectId);
      console.log('Setting selected subject from URL:', found);
      setSelectedSubject(found || null);
      setShowAllSubjects(false);
    } else if (!subjectId) {
      setShowAllSubjects(true);
      setSelectedSubject(null);
    }
  }, [subjectId, subjects]);

  // Adicionar tópico usando o AppContext
  const handleAddTopic = async () => {
    if (!newTopicName.trim() || !selectedSubject || !user) {
      console.log('Cannot add topic - missing data');
      return;
    }

    try {
      console.log('Adding topic:', newTopicName, 'to subject:', selectedSubject.id);

      await addTopic(selectedSubject.id, {
        name: newTopicName.trim(),
        completed: false,
        reviewCount: 0,
        review_count: 0,
        reviewStage: null,
        nextReview: undefined,
        lastReviewedAt: undefined,
        firstStudiedAt: undefined,
        first_studied_at: undefined,
        last_reviewed_at: undefined,
        is_completed: false
      });

      setNewTopicName('');
      toast.success('Tópico adicionado com sucesso');

    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Erro ao adicionar tópico');
    }
  };

  // Remover tópico usando o AppContext
  const handleRemoveTopic = async (topicId: string) => {
    if (!selectedSubject && !showAllSubjects) return;

    try {
      console.log('Removing topic:', topicId);

      const subjectIdToUse = selectedSubject?.id || subjects.find(s => s.topics.some(t => t.id === topicId))?.id;
      
      if (!subjectIdToUse) {
        console.error('Could not find subject for topic');
        return;
      }

      await deleteTopic(subjectIdToUse, topicId);

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

  const getTopicStatus = (topic: any) => {
    if (topic.completed && (!topic.nextReview || topic.reviewStage === 'Concluído')) {
      return { label: "Concluído", color: "bg-green-100 text-green-800" };
    }
    
    if (!topic.nextReview) {
      return { label: "Não Iniciado", color: "bg-gray-100 text-gray-800" };
    }
    
    const reviewDate = new Date(topic.nextReview);
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

  const getRevisionStage = (topic: any) => {
    if (!topic.reviewStage) {
      return "Não Iniciado";
    }
    return topic.reviewStage;
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

    // Atualizar o tópico usando o AppContext
    const topic = selectedSubject?.topics.find(t => t.id === topicId);
    if (topic) {
      try {
        const subjectIdToUse = selectedSubject?.id || subjects.find(s => s.topics.some(t => t.id === topicId))?.id;
        
        if (subjectIdToUse) {
          await updateTopic(subjectIdToUse, topicId, {
            completed: checked,
            reviewStage: checked ? 'Concluído' : null
          });
        }
      } catch (error) {
        toast.error('Erro ao atualizar tópico');
      }
    }
  };

  // Função para salvar anotações
  const handleSaveNotes = async (topicId: string, notes: TopicNotes) => {
    try {
      const subjectIdToUse = selectedSubject?.id || subjects.find(s => s.topics.some(t => t.id === topicId))?.id;
      
      if (subjectIdToUse) {
        await updateTopic(subjectIdToUse, topicId, { notes });
      }
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      throw error;
    }
  };

  // Função para extrair texto puro do HTML do editor rico
  const getPlainTextPreview = (htmlContent: string) => {
    if (!htmlContent) return '';
    // Remove tags HTML e pega os primeiros 50 caracteres
    const plainText = htmlContent.replace(/<[^>]*>/g, '').trim();
    return plainText.length > 50 ? plainText.substring(0, 50) + '...' : plainText;
  };

  const getAllTopics = () => {
    const allTopics = subjects.flatMap(subject => 
      subject.topics.map(topic => ({
        ...topic,
        subjectName: subject.name
      }))
    );
    console.log('All topics calculated:', allTopics);
    return allTopics;
  };

  // Função para filtrar tópicos por nome
  const filterTopicsByName = (topics: any[]) => {
    if (!searchTerm.trim()) return topics;
    
    return topics.filter(topic => 
      topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (topic.subjectName && topic.subjectName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const renderTopicCard = (topic: any) => {
    const status = getTopicStatus(topic);
    const revisionStage = getRevisionStage(topic);
    const isExpanded = expandedTopics.has(topic.id);
    const isChecked = checkedTopics.has(topic.id);
    const hasNotes = topic.notes && topic.notes.content && topic.notes.content.trim() !== '';
    
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
                  {/* Preview das anotações quando o card está fechado */}
                  {hasNotes && !isExpanded && (
                    <div className="flex items-center gap-2 mt-1">
                      <FileText className="h-3 w-3 text-blue-600" />
                      <span className="text-xs text-gray-600 truncate">
                        {getPlainTextPreview(topic.notes.content)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-800 font-medium">
                    {revisionStage}
                  </span>
                  {hasNotes && (
                    <FileText className="h-4 w-4 text-blue-600" />
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
                  {/* Novo editor de texto rico */}
                  <RichTextNotesEditor
                    notes={topic.notes}
                    onSave={(notes) => handleSaveNotes(topic.id, notes)}
                    isLoading={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // Estados de loading e erro
  if (isLoading || !isDataLoaded) {
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

  if (subjects.length === 0) {
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

  // Obter tópicos filtrados
  const topicsToDisplay = showAllSubjects ? filterTopicsByName(getAllTopics()) : filterTopicsByName(selectedSubject?.topics || []);

  console.log('Rendering main content - selectedSubject:', selectedSubject?.name, 'showAllSubjects:', showAllSubjects);
  console.log('Topics to render:', topicsToDisplay);

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
                  const subject = subjects.find(s => s.id === e.target.value);
                  console.log('Switching to specific subject:', subject);
                  setSelectedSubject(subject || null);
                  setShowAllSubjects(false);
                }
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas as Matérias</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.topics?.length || 0} tópicos)
                </option>
              ))}
            </select>
          </div>

          {/* Campo de busca */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por nome:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Digite o nome do tópico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
        {topicsToDisplay.length === 0 ? (
          <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">
                {searchTerm.trim() ? 'Nenhum tópico encontrado com este filtro.' : 'Nenhum tópico adicionado ainda.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          topicsToDisplay.map((topic) => renderTopicCard(topic))
        )}
      </div>
    </motion.div>
  );
};

export default Topics;
