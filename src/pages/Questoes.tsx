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
import StatsSummaryCards from '@/components/questions/StatsSummaryCards';
import { format, subDays, startOfDay } from 'date-fns';
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

  // Estado para estatísticas resumidas
  const [summaryStats, setSummaryStats] = useState({
    totalAttempts: 0,
    correctAttempts: 0,
    accuracyRate: 0,
    streakDays: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Buscar estatísticas resumidas
  useEffect(() => {
    if (user) {
      fetchSummaryStats();
    }
  }, [user]);

  const fetchSummaryStats = async () => {
    if (!user) return;

    setStatsLoading(true);
    try {
      const fromDate = startOfDay(subDays(new Date(), 30));

      const { data, error } = await supabase
        .from('question_attempts')
        .select('*')
        .eq('user_id', user.id)
        .gte('attempted_at', fromDate.toISOString());

      if (error) throw error;

      const attempts = data || [];
      const total = attempts.length;
      const correct = attempts.filter(a => a.is_correct).length;
      const accuracy = total > 0 ? (correct / total) * 100 : 0;
      
      // Calcular dias únicos com atividade
      const uniqueDays = new Set(
        attempts.map(a => format(new Date(a.attempted_at), 'yyyy-MM-dd'))
      );

      setSummaryStats({
        totalAttempts: total,
        correctAttempts: correct,
        accuracyRate: accuracy,
        streakDays: uniqueDays.size
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setStatsLoading(false);
    }
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
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Sistema de Questões</h1>
        <p className="text-gray-600">Gere questões personalizadas e acompanhe seu desempenho</p>
      </div>

      {/* Layout responsivo: duas colunas em telas grandes, uma coluna em telas pequenas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Coluna principal - Gerador de questões (3/4 em telas grandes) */}
        <div className="lg:col-span-3 space-y-6">
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

          {/* Questões geradas - apenas em telas grandes, senão vai para baixo */}
          {hasGenerated && questions.length > 0 && (
            <div className="space-y-4 lg:block hidden">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-4">
                  {/* Componente InteractiveQuestion seria renderizado aqui */}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coluna lateral - Estatísticas resumidas (1/4 em telas grandes) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Estatísticas (30 dias)</h3>
            <StatsSummaryCards stats={summaryStats} isLoading={statsLoading} />
          </div>
        </div>
      </div>

      {/* Questões geradas - em telas pequenas aparecem aqui */}
      {hasGenerated && questions.length > 0 && (
        <div className="space-y-4 lg:hidden">
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-4">
              {/* Componente InteractiveQuestion seria renderizado aqui */}
            </div>
          ))}
        </div>
      )}

      {/* Separador para estatísticas detalhadas */}
      <div className="flex items-center gap-4 mt-8">
        <Separator className="flex-1" />
        <span className="text-gray-500 font-medium">Estatísticas Detalhadas</span>
        <Separator className="flex-1" />
      </div>

      {/* Estatísticas detalhadas sempre aparecem por último */}
      <div className="mt-6">
        <QuestionsStatistics hideHeader={true} />
      </div>
    </motion.div>
  );
};

export default Questoes;
