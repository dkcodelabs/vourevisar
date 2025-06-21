
import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BookOpen, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Questoes = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  
  const [questions, setQuestions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

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

      setQuestions(data.questions);
      setHasGenerated(true);
      toast.success('Questões geradas com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar questões:', error);
      toast.error('Erro ao gerar questões. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewGeneration = () => {
    setQuestions('');
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
      <Button 
        variant="outline" 
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Gerador de Questões
          </CardTitle>
          <p className="text-gray-600">
            Gere questões personalizadas usando inteligência artificial
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!hasGenerated ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Matéria *
                  </label>
                  <Input
                    placeholder="Ex: Direito Constitucional"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tópico *
                  </label>
                  <Input
                    placeholder="Ex: Direitos Fundamentais"
                    value={formData.topic}
                    onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Quantidade
                  </label>
                  <Select 
                    value={formData.quantity.toString()} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, quantity: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} questão{num > 1 ? 'ões' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Dificuldade
                  </label>
                  <Select 
                    value={formData.difficulty} 
                    onValueChange={(value: 'facil' | 'medio' | 'dificil') => setFormData(prev => ({ ...prev, difficulty: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facil">Fácil</SelectItem>
                      <SelectItem value="medio">Médio</SelectItem>
                      <SelectItem value="dificil">Difícil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Tipo de Questão
                </label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'multipla-escolha' | 'verdadeiro-falso' | 'dissertativa') => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multipla-escolha">Múltipla Escolha</SelectItem>
                    <SelectItem value="verdadeiro-falso">Verdadeiro ou Falso</SelectItem>
                    <SelectItem value="dissertativa">Dissertativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleGenerateQuestions}
                disabled={isGenerating || !formData.subject || !formData.topic || !formData.bank}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando questões...
                  </>
                ) : (
                  'Gerar Questões'
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Questões Geradas
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formData.subject} • {formData.topic} • {formData.bank}
                  </p>
                </div>
                <Button 
                  onClick={handleNewGeneration}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Nova Geração
                </Button>
              </div>

              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-6">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {questions}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Questoes;
