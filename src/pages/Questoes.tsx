
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import QuestionGeneratorForm from '@/components/questions/QuestionGeneratorForm';
import GeneratedQuestionsDisplay from '@/components/questions/GeneratedQuestionsDisplay';
import QuestionsStatistics from './QuestionsStatistics';

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
  const [showStatistics, setShowStatistics] = useState(false);

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
      setShowStatistics(true);
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

  // Exibir estatísticas automaticamente se já existem dados no banco
  useEffect(() => {
    if (user && !hasGenerated) {
      setShowStatistics(true);
    }
  }, [user, hasGenerated]);

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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Sistema de Questões</h1>
        <p className="text-gray-600">Gere questões personalizadas e acompanhe seu desempenho</p>
      </div>

      {/* Seção do Gerador de Questões */}
      <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">Gerador de Questões</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Separador */}
      {showStatistics && (
        <>
          <div className="flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-gray-500 font-medium">Estatísticas de Desempenho</span>
            <Separator className="flex-1" />
          </div>

          {/* Seção das Estatísticas */}
          <div className="mt-6">
            <QuestionsStatistics hideHeader={true} />
          </div>
        </>
      )}
    </motion.div>
  );
};

export default Questoes;
