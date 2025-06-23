
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Loader2, Plus, Minus } from 'lucide-react';
import { useSubjectsAndTopics } from '@/hooks/useSubjectsAndTopics';

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
  const { subjects, topics, isLoading, fetchTopicsBySubject } = useSubjectsAndTopics();

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
        topic: '' // Limpar tópico quando mudar matéria
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

  const handleQuantityChange = (increment: boolean) => {
    setFormData(prev => ({
      ...prev,
      quantity: increment 
        ? Math.min(prev.quantity + 1, 10)
        : Math.max(prev.quantity - 1, 1)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
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
              Quantidade
            </label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(false)}
                disabled={formData.quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center py-2 px-4 border rounded-md bg-white">
                {formData.quantity} questão{formData.quantity > 1 ? 'ões' : ''}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(true)}
                disabled={formData.quantity >= 10}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            Gerar Questões
          </>
        )}
      </Button>
    </div>
  );
};

export default QuestionGeneratorForm;
