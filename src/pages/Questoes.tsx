
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import QuestionEntryForm from '@/components/questions/QuestionEntryForm';
import StatsSummaryCards from '@/components/questions/StatsSummaryCards';
import QuestionsStatistics from './QuestionsStatistics';
import QuestionsOverview from '@/components/questions/QuestionsOverview';
import { format, subDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const Questoes = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Pegar contexto da URL (vindo das revisões)
  const urlSubject = searchParams.get('materia') || '';
  const urlTopic = searchParams.get('topico') || '';
  
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [formKey, setFormKey] = useState(0); // Para forçar re-render do form

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
  }, [user, selectedPeriod]);

  // Forçar re-render do form quando parâmetros da URL mudarem
  useEffect(() => {
    if (urlSubject && urlTopic) {
      console.log('Parâmetros da URL detectados:', { urlSubject, urlTopic });
      setFormKey(prev => prev + 1);
    }
  }, [urlSubject, urlTopic]);

  const fetchSummaryStats = async () => {
    if (!user) return;

    setStatsLoading(true);
    try {
      const daysAgo = parseInt(selectedPeriod);
      const fromDate = startOfDay(subDays(new Date(), daysAgo));

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

  const handleEntryAdded = () => {
    fetchSummaryStats(); // Atualizar estatísticas
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
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-6">
        {/* Removido o título principal */}
        {/* <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Questões
          </h1>
        </motion.div> */}

      {/* Layout responsivo: ajustado para dar mais espaço às estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Coluna principal - Formulário de registro (3/5 em telas grandes) */}
        <div className="lg:col-span-3">
          <QuestionEntryForm 
            key={formKey}
            onEntryAdded={handleEntryAdded}
            initialSubject={urlSubject}
            initialTopic={urlTopic}
          />
        </div>

        {/* Coluna lateral - Estatísticas resumidas (2/5 em telas grandes) */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Estatísticas</h3>
            </div>
            <div className="mb-4">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <StatsSummaryCards stats={summaryStats} isLoading={statsLoading} />
          </div>
        </div>
      </div>

      {/* Separador para estatísticas detalhadas */}
      <div className="flex items-center gap-4 mt-8">
        <Separator className="flex-1" />
        <span className="text-gray-500 font-medium">Estatísticas Detalhadas</span>
        <Separator className="flex-1" />
      </div>

      {/* Estatísticas detalhadas */}
      <div className="mt-6">
        <QuestionsStatistics 
          hideHeader={true} 
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Novo Layout: Detalhamento por Matéria e Tópico */}
      <div className="mb-8">
        <QuestionsOverview />
      </div>
      </div>
    </div>
  );
};

export default Questoes;
