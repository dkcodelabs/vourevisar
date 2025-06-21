
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Loader2 } from 'lucide-react';

interface FormData {
  subject: string;
  topic: string;
  bank: string;
  quantity: number;
  difficulty: 'facil' | 'medio' | 'dificil';
  type: 'multipla-escolha' | 'verdadeiro-falso' | 'dissertativa';
}

interface QuestionGeneratorFormProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onGenerateQuestions: () => void;
  isGenerating: boolean;
}

const QuestionGeneratorForm: React.FC<QuestionGeneratorFormProps> = ({
  formData,
  setFormData,
  onGenerateQuestions,
  isGenerating
}) => {
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

  return (
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
          onClick={onGenerateQuestions}
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
      </CardContent>
    </Card>
  );
};

export default QuestionGeneratorForm;
