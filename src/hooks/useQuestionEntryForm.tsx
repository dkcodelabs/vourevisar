
import { useState } from 'react';
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

export const useQuestionEntryForm = (onEntryAdded: () => void) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<QuestionEntry>({
    subject: '',
    topic: '',
    bank: '',
    totalQuestions: 1,
    correctQuestions: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTotalQuestionsChange = (value: string) => {
    if (value === '') {
      setFormData(prev => ({
        ...prev,
        totalQuestions: 0,
        correctQuestions: 0
      }));
      return;
    }

    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) {
      setFormData(prev => ({
        ...prev,
        totalQuestions: num,
        correctQuestions: Math.min(prev.correctQuestions, num)
      }));
    }
  };

  const handleCorrectQuestionsChange = (value: string) => {
    if (value === '') {
      setFormData(prev => ({
        ...prev,
        correctQuestions: 0
      }));
      return;
    }

    const num = parseInt(value);
    if (!isNaN(num) && num >= 0) {
      setFormData(prev => ({
        ...prev,
        correctQuestions: Math.min(num, prev.totalQuestions)
      }));
    }
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
      console.log('Dados a serem enviados:', {
        user_id: user.id,
        subject: formData.subject,
        topic: formData.topic,
        bank: formData.bank,
        totalQuestions: formData.totalQuestions,
        correctQuestions: formData.correctQuestions
      });

      const attempts = [];
      
      for (let i = 0; i < formData.totalQuestions; i++) {
        attempts.push({
          user_id: user.id,
          subject: formData.subject,
          topic: formData.topic,
          bank: formData.bank,
          question_type: 'multipla-escolha',
          question_text: `Questão ${i + 1} - ${formData.subject} - ${formData.topic}`,
          correct_answer: 'N/A',
          user_answer: i < formData.correctQuestions ? 'Correto' : 'Incorreto',
          is_correct: i < formData.correctQuestions,
          difficulty: 'medio',
          attempted_at: new Date().toISOString()
        });
      }

      console.log('Tentativas a serem inseridas:', attempts);

      const { error } = await supabase
        .from('question_attempts')
        .insert(attempts);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      toast.success(`${formData.totalQuestions} questões registradas com sucesso!`);
      
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

  return {
    formData,
    setFormData,
    isSubmitting,
    handleTotalQuestionsChange,
    handleCorrectQuestionsChange,
    handleSubmit
  };
};
