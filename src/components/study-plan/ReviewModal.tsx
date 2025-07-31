import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ThumbsUp, Minus, ThumbsDown, Plus, X } from 'lucide-react';
import { Topic, DifficultyLevel, TopicSubtopic } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

interface ReviewModalProps {
  topic: Topic;
  subjectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  topic,
  subjectId,
  isOpen,
  onClose,
  onSave
}) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [subtopics, setSubtopics] = useState<TopicSubtopic[]>([]);
  const [newSubtopic, setNewSubtopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (topic && isOpen) {
      setReviewNotes(topic.review_notes?.content || '');
      setDifficulty(topic.difficulty_level || null);
      setSubtopics(topic.subtopics || []);
    }
  }, [topic, isOpen]);

  const handleAddSubtopic = () => {
    if (newSubtopic.trim()) {
      const subtopic: TopicSubtopic = {
        id: crypto.randomUUID(),
        name: newSubtopic.trim(),
        addedAt: new Date().toISOString()
      };
      setSubtopics([...subtopics, subtopic]);
      setNewSubtopic('');
    }
  };

  const handleRemoveSubtopic = (id: string) => {
    setSubtopics(subtopics.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates: any = {
        review_notes: reviewNotes ? { content: reviewNotes } : null,
        difficulty_level: difficulty,
        subtopics: subtopics,
        difficulty_set_at: difficulty ? new Date().toISOString() : null,
        is_marked_for_review: true,
        marked_for_review_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('topics')
        .update(updates)
        .eq('id', topic.id);

      if (error) throw error;

      toast.success("Tópico marcado para revisão com sucesso!");

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error("Erro ao salvar revisão. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyButtonStyle = (level: DifficultyLevel) => {
    const isSelected = difficulty === level;
    switch (level) {
      case 'easy':
        return isSelected 
          ? 'bg-green-500 text-white border-green-500' 
          : 'border-green-200 text-green-600 hover:bg-green-50';
      case 'medium':
        return isSelected 
          ? 'bg-yellow-500 text-white border-yellow-500' 
          : 'border-yellow-200 text-yellow-600 hover:bg-yellow-50';
      case 'hard':
        return isSelected 
          ? 'bg-red-500 text-white border-red-500' 
          : 'border-red-200 text-red-600 hover:bg-red-50';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marcar Revisão - {topic.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Anotações de Revisão */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Anotações da Revisão
            </Label>
            <ReactQuill
              value={reviewNotes}
              onChange={setReviewNotes}
              placeholder="Descreva o que foi estudado nesta revisão..."
              theme="snow"
              style={{ minHeight: '120px' }}
            />
          </div>

          {/* Nível de Dificuldade */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Nível de Dificuldade
            </Label>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className={getDifficultyButtonStyle('easy')}
                onClick={() => setDifficulty(difficulty === 'easy' ? null : 'easy')}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Fácil
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={getDifficultyButtonStyle('medium')}
                onClick={() => setDifficulty(difficulty === 'medium' ? null : 'medium')}
              >
                <Minus className="h-4 w-4 mr-2" />
                Médio
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={getDifficultyButtonStyle('hard')}
                onClick={() => setDifficulty(difficulty === 'hard' ? null : 'hard')}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Difícil
              </Button>
            </div>
          </div>

          {/* Subtópicos */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Subtópicos Estudados
            </Label>
            
            <div className="flex gap-2 mb-3">
              <Input
                value={newSubtopic}
                onChange={(e) => setNewSubtopic(e.target.value)}
                placeholder="Adicionar subtópico..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtopic()}
                className="flex-1"
              />
              <Button
                onClick={handleAddSubtopic}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {subtopics.length > 0 && (
              <div className="space-y-2">
                {subtopics.map((subtopic) => (
                  <div
                    key={subtopic.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm">{subtopic.name}</span>
                    <Button
                      onClick={() => handleRemoveSubtopic(subtopic.id)}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Salvando...' : 'Marcar Revisão'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;