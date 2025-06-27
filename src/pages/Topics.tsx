import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Topic } from '@/types';
import TopicCard from '@/components/topics/TopicCard';
import NotesModal from '@/components/reviews/NotesModal';
import { toast } from "react-hot-toast";

const Topics = () => {
  const { subjects, deleteTopic, isLoading, updateTopic } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<(Topic & { subjectName: string }) | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const allTopics = subjects.flatMap(subject => 
    subject.topics.map(topic => ({
      ...topic,
      subjectName: subject.name
    }))
  );

  const filteredTopics = useMemo(() => {
    if (!searchTerm.trim()) return allTopics;
    
    const searchLower = searchTerm.toLowerCase();
    return allTopics.filter(topic => 
      topic.name.toLowerCase().includes(searchLower) ||
      topic.subjectName.toLowerCase().includes(searchLower)
    );
  }, [allTopics, searchTerm]);

  const handleDeleteTopic = async (topicId: string) => {
    const topic = allTopics.find(t => t.id === topicId);
    if (!topic) return;

    const subject = subjects.find(s => s.name === topic.subjectName);
    if (!subject) return;

    try {
      await deleteTopic(subject.id, topicId);
    } catch (error) {
      console.error('Erro ao deletar tópico:', error);
    }
  };

  const handleNotesClick = (topic: Topic & { subjectName: string }) => {
    setSelectedTopic(topic);
    setIsNotesModalOpen(true);
  };

  const handleEditTopic = (topic) => {
    // Comportamento original, se houver
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
      className="container mx-auto p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Tópicos</h1>
        <p className="text-gray-600">Gerencie todos os seus tópicos de estudo</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pesquisar tópicos ou matérias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredTopics.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Nenhum tópico encontrado para sua busca.' : 'Nenhum tópico cadastrado ainda.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => window.location.href = '/materias'}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Matéria
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 mt-4">
          {filteredTopics.map(topic => (
            <div key={topic.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-base">{topic.name}</span>
                <button
                  className="text-purple-500"
                  onClick={() => handleEditTopic(topic)}
                  title="Editar nome do tópico"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  <Edit2 />
                </button>
                <button
                  className="text-red-500"
                  title="Excluir tópico"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                  onClick={() => handleDeleteTopic(topic.id)}
                >
                  <Trash2 />
                </button>
              </div>
              <div>
                <div className="text-sm text-gray-500">{topic.subjectName}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NotesModal
        topicId={selectedTopic?.id || ''}
        topicName={selectedTopic?.name || ''}
        subjectName={selectedTopic?.subjectName || ''}
        isOpen={isNotesModalOpen}
        onClose={() => {
          setIsNotesModalOpen(false);
          setSelectedTopic(null);
        }}
      />
    </motion.div>
  );
};

export default Topics;
