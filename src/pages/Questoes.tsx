
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import QuestionGeneratorHeader from '@/components/questions/QuestionGeneratorHeader';
import QuestionGeneratorForm from '@/components/questions/QuestionGeneratorForm';
import GeneratedQuestionsDisplay from '@/components/questions/GeneratedQuestionsDisplay';

interface Question {
  id: string;
  statement: string;
  type: 'multipla-escolha' | 'verdadeiro-falso' | 'dissertativa';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface GenerationMetadata {
  subject: string;
  topic: string;
  bank: string;
  quantity: number;
  difficulty: string;
  type: string;
}

const Questoes = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Pegar contexto da URL (vindo das revisões)
  const urlSubject = searchParams.get('materia') || '';
  const urlTopic = searchParams.get('topico') || '';
  
  const [formData, setFormData] = useState({
    subject: urlSubject,
    topic: urlTopic,
    bank: '',
    quantity: 3,
    difficulty: 'medio' as 'facil' | 'medio' | 'dificil',
    type: 'multipla-escolha' as 'multipla-escolha' | 'verdadeiro-falso' | 'dissertativa'
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const [rawText, setRawText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateQuestions = async () => {
    if (!formData.subject || !formData.topic || !formData.bank) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: formData
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setQuestions(data.questions || []);
      setMetadata(data.metadata);
      setRawText(data.rawText || '');
      setHasGenerated(true);
      toast.success(`${data.questions?.length || 0} questões geradas com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao gerar questões:', error);
      toast.error('Erro ao gerar questões. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewGeneration = () => {
    setQuestions([]);
    setMetadata(null);
    setRawText('');
    setHasGenerated(false);
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Acesso Negado</h1>
          <p className="text-gray-600">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <QuestionGeneratorHeader />

      {!hasGenerated ? (
        <QuestionGeneratorForm
          formData={formData}
          setFormData={setFormData}
          onGenerateQuestions={handleGenerateQuestions}
          isGenerating={isGenerating}
        />
      ) : (
        <GeneratedQuestionsDisplay
          questions={questions}
          metadata={metadata}
          rawText={rawText}
          onNewGeneration={handleNewGeneration}
        />
      )}
    </motion.div>
  );
};

export default Questoes;
