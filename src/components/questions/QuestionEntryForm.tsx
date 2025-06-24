
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Save } from 'lucide-react';
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
    totalQuestions: 0,
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

  // Preparar opções para o combobox de matérias
  const subjectOptions = subjects.map(subject => ({
    value: subject.id,
    label: subject.name
  }));

  // Preparar opções para o combobox de tópicos
  const topicOptions = topics.map(topic => ({
    value: topic.id,
    label: topic.name
  }));

  const handleSubjectChange = (subjectId: string) => {
    const selectedSubject = subjects.find(s => s.id === subjectId);
    if (selectedSubject) {
      setFormData(prev => ({ 
        ...prev, 
        subject: selectedSubject.name,
        topic: '' // Limpar tópico quando mudar matéria
      }));
      fetchTopicsBySubject(subjectId);
    }
  };

  const handleTopicChange = (topicId: string) => {
    const selectedTopic = topics.find(t => t.id === topicId);
    if (selectedTopic) {
      setFormData(prev => ({ ...prev, topic: selectedTopic.name }));
    }
  };

  const handleTotalQuestionsChange = (value: string) => {
    const num = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      totalQuestions: num,
      correctQuestions: Math.min(prev.correctQuestions, num)
    }));
  };

  const handleCorrectQuestionsChange = (value: string) => {
    const num = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      correctQuestions: Math.min(num, prev.totalQuestions)
    }));
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
        totalQuestions: 0,
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
              <Combobox
                options={subjectOptions}
                value={subjects.find(s => s.name === formData.subject)?.id || ''}
                onValueChange={handleSubjectChange}
                placeholder="Digite ou selecione uma matéria..."
                searchPlaceholder="Pesquisar matérias..."
                emptyText="Nenhuma matéria encontrada."
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Tópico *
            </label>
            <Combobox
              options={topicOptions}
              value={topics.find(t => t.name === formData.topic)?.id || ''}
              onValueChange={handleTopicChange}
              placeholder="Digite ou selecione um tópico..."
              searchPlaceholder="Pesquisar tópicos..."
              emptyText={formData.subject ? "Nenhum tópico encontrado para esta matéria." : "Selecione uma matéria primeiro."}
              disabled={!formData.subject}
            />
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
              <Input
                type="number"
                min="0"
                value={formData.totalQuestions}
                onChange={(e) => handleTotalQuestionsChange(e.target.value)}
                placeholder="Digite o total"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Questões Corretas
              </label>
              <Input
                type="number"
                min="0"
                max={formData.totalQuestions}
                value={formData.correctQuestions}
                onChange={(e) => handleCorrectQuestionsChange(e.target.value)}
                placeholder="Digite quantas corretas"
              />
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
