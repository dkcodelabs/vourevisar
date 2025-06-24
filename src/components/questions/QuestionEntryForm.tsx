
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Minus, Save } from 'lucide-react';
import { useSubjectsAndTopics } from '@/hooks/useSubjectsAndTopics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuestionEntry {
  subject: string;
  topic: string;
  bank: string;
  totalQuestions: number;
  correctQuestions: number;
}

interface QuestionEntryFormProps {
  onEntryAdded: () => void;
}

const QuestionEntryForm: React.FC<QuestionEntryFormProps> = ({ onEntryAdded }) => {
  const { user } = useAuth();
  const { subjects, topics, isLoading, fetchTopicsBySubject } = useSubjectsAndTopics();
  const [formData, setFormData] = useState<QuestionEntry>({
    subject: '',
    topic: '',
    bank: '',
    totalQuestions: 1,
    correctQuestions: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bancasDisponiveis = [
    'CESPE/CEBRASPE',
    'FCC',
    'FGV',
    'VUNESP',
    'ESAF',
    'CESGRANRIO',
    'FUNCAB',
    'IBFC',
    'AOCP',
    'QUADRIX',
    'CONSULPLAN',
    'IDECAN'
  ];

  const handleSubjectChange = (value: string) => {
    const selectedSubject = subjects.find(s => s.id === value);
    if (selectedSubject) {
      setFormData(prev => ({ 
        ...prev, 
        subject: selectedSubject.name,
        topic: ''
      }));
      fetchTopicsBySubject(value);
    }
  };

  const handleTopicSelect = (value: string) => {
    const selectedTopic = topics.find(t => t.id === value);
    if (selectedTopic) {
      setFormData(prev => ({ ...prev, topic: selectedTopic.name }));
    }
  };

  const handleQuantityChange = (field: 'totalQuestions' | 'correctQuestions', increment: boolean) => {
    setFormData(prev => {
      const newValue = increment 
        ? prev[field] + 1
        : Math.max(prev[field] - 1, 0);
      
      // Garantir que questões corretas não seja maior que o total
      if (field === 'totalQuestions' && newValue < prev.correctQuestions) {
        return { ...prev, [field]: newValue, correctQuestions: newValue };
      }
      if (field === 'correctQuestions' && newValue > prev.totalQuestions) {
        return { ...prev, [field]: prev.totalQuestions };
      }
      
      return { ...prev, [field]: newValue };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !formData.subject || !formData.topic || !formData.bank) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.totalQuestions === 0) {
      toast.error('O total de questões deve ser maior que zero');
      return;
    }

    if (formData.correctQuestions > formData.totalQuestions) {
      toast.error('Questões corretas não pode ser maior que o total');
      return;
    }

    setIsSubmitting(true);

    try {
      // Inserir registros individuais para cada questão
      const attempts = [];
      
      for (let i = 0; i < formData.totalQuestions; i++) {
        attempts.push({
          user_id: user.id,
          subject: formData.subject,
          topic: formData.topic,
          bank: formData.bank,
          question_type: 'manual',
          question_text: `Questão ${i + 1} - ${formData.subject} - ${formData.topic}`,
          correct_answer: 'N/A',
          user_answer: i < formData.correctQuestions ? 'Correto' : 'Incorreto',
          is_correct: i < formData.correctQuestions,
          difficulty: 'medio',
          attempted_at: new Date().toISOString()
        });
      }

      const { error } = await supabase
        .from('question_attempts')
        .insert(attempts);

      if (error) throw error;

      toast.success(`${formData.totalQuestions} questões registradas com sucesso!`);
      
      // Limpar formulário
      setFormData({
        subject: '',
        topic: '',
        bank: '',
        totalQuestions: 1,
        correctQuestions: 0
      });

      onEntryAdded();
    } catch (error) {
      console.error('Erro ao registrar questões:', error);
      toast.error('Erro ao registrar questões. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-white/70 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle>Registrar Questões Resolvidas</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Matéria *
            </label>
            {isLoading ? (
              <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
            ) : (
              <div className="space-y-2">
                <Select onValueChange={handleSubjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Ou digite uma matéria personalizada"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Tópico *
            </label>
            <div className="space-y-2">
              {topics.length > 0 && (
                <Select onValueChange={handleTopicSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tópico" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Input
                placeholder="Ou digite um tópico personalizado"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Banca *
            </label>
            <Select 
              value={formData.bank} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, bank: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a banca" />
              </SelectTrigger>
              <SelectContent>
                {bancasDisponiveis.map((banca) => (
                  <SelectItem key={banca} value={banca}>
                    {banca}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Total de Questões
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange('totalQuestions', false)}
                  disabled={formData.totalQuestions <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center py-2 px-4 border rounded-md bg-white">
                  {formData.totalQuestions}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange('totalQuestions', true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Questões Corretas
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange('correctQuestions', false)}
                  disabled={formData.correctQuestions <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center py-2 px-4 border rounded-md bg-white">
                  {formData.correctQuestions}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange('correctQuestions', true)}
                  disabled={formData.correctQuestions >= formData.totalQuestions}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit"
              disabled={isSubmitting || !formData.subject || !formData.topic || !formData.bank}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Registrando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Registrar Questões
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuestionEntryForm;
