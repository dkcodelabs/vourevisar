
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';

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
    totalQuestions: 0,
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

    if (!user || !formData.subject || !formData.bank) {
      toastGate.notifyError('Preencha todos os campos obrigatórios', 'HOOKS-USEQUESTIONENTRYFORM-01', { severity: 'medium' });
      return;
    }

    if (formData.totalQuestions === 0) {
      toastGate.notifyError('O total de questões deve ser maior que zero', 'HOOKS-USEQUESTIONENTRYFORM-02', { severity: 'medium' });
      return;
    }

    if (formData.correctQuestions > formData.totalQuestions) {
      toastGate.notifyError('Questões corretas não pode ser maior que o total', 'HOOKS-USEQUESTIONENTRYFORM-03', { severity: 'medium' });
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
          topic: formData.topic || 'Geral',
          bank: formData.bank,
          question_type: 'multipla-escolha', // Using valid constraint value
          question_text: `Questão ${i + 1} - ${formData.subject} - ${formData.topic || 'Geral'}`,
          correct_answer: 'N/A',
          user_answer: i < formData.correctQuestions ? 'Correto' : 'Incorreto',
          is_correct: i < formData.correctQuestions,
          difficulty: 'medio', // Using valid constraint value
          attempted_at: new Date().toISOString()
        });
      }

      console.log('Tentativas a serem inseridas:', attempts);

      // Test database connection first
      const { error: testError } = await supabase
        .from('question_attempts')
        .select('id', { count: 'exact', head: true });

      if (testError) {
        console.error('Erro de conexão com o banco:', testError);
        throw new Error('Erro de conexão com o banco de dados');
      }

      console.log('Conexão com banco OK');

      const { data, error } = await supabase
        .from('question_attempts')
        .insert(attempts)
        .select();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw error;
      }

      console.log('Dados inseridos com sucesso:', data);

      toast.success(`${formData.totalQuestions} questões registradas com sucesso!`);

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
      if (error instanceof Error) {
        toastGate.notifyError(`Erro ao registrar questões: ${error.message}`, 'HOOKS-USEQUESTIONENTRYFORM-04', { severity: 'medium' });
      } else {
        toastGate.notifyError('Erro ao registrar questões. Tente novamente.', 'HOOKS-USEQUESTIONENTRYFORM-05', { severity: 'medium' });
      }
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
