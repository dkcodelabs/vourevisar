
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
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
            <SelectContent className="bg-white">
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
              <SelectContent className="bg-white">
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
            <SelectContent className="bg-white">
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
