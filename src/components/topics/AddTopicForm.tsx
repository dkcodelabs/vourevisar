
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from "react-hot-toast";

const AddTopicForm: React.FC = () => {
  const { subjects, addTopic } = useApp();
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [topicName, setTopicName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSubjectId || !topicName.trim()) {
      toast.error('Selecione uma matéria e digite o nome do tópico');
      return;
    }

    setIsAdding(true);
    try {
      // Criar o objeto Topic com as propriedades necessárias
      const topicData = {
        name: topicName.trim(),
        completed: false,
        reviewCount: 0,
        reviewStage: null,
        nextReview: null,
        firstStudiedAt: null,
        lastReviewedAt: null,
        notes: null
      };
      
      await addTopic(selectedSubjectId, topicData);
      toast.success('Tópico adicionado com sucesso!');
      setTopicName('');
      setSelectedSubjectId('');
    } catch (error) {
      console.error('Erro ao adicionar tópico:', error);
      toast.error('Erro ao adicionar tópico');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="bg-white/70 border-white/30 h-10">
              <SelectValue placeholder="Selecionar matéria..." />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subject.color }}
                    />
                    {subject.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1">
          <Input
            placeholder="Nome do tópico..."
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            className="bg-white/70 border-white/30 h-10"
          />
        </div>
        
        <Button 
          type="submit" 
          disabled={isAdding || !selectedSubjectId || !topicName.trim()}
          className="bg-blue-600 hover:bg-blue-700 h-10 px-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>
    </form>
  );
};

export default AddTopicForm;
