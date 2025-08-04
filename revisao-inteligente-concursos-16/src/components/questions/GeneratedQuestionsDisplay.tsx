
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import InteractiveQuestion from './InteractiveQuestion';

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

interface GeneratedQuestionsDisplayProps {
  questions: Question[];
  metadata: GenerationMetadata | null;
  rawText: string;
  onNewGeneration: () => void;
}

const GeneratedQuestionsDisplay: React.FC<GeneratedQuestionsDisplayProps> = ({
  questions,
  metadata,
  rawText,
  onNewGeneration
}) => {
  if (!metadata) return null;

  return (
    <>
      <Card className="bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Questões Geradas
              </h3>
              <p className="text-sm text-gray-600">
                {metadata.subject} • {metadata.topic} • {metadata.bank}
              </p>
            </div>
            <Button 
              onClick={onNewGeneration}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Nova Geração
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questões Interativas */}
      {questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <InteractiveQuestion
              key={question.id}
              question={question}
              metadata={metadata}
              questionNumber={index + 1}
            />
          ))}
        </div>
      )}

      {/* Fallback para texto raw se parsing falhar */}
      {questions.length === 0 && rawText && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle>Questões Geradas (Formato Original)</CardTitle>
            <p className="text-sm text-gray-600">
              Não foi possível processar as questões automaticamente. Veja o texto original abaixo:
            </p>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
              {rawText}
            </pre>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default GeneratedQuestionsDisplay;
