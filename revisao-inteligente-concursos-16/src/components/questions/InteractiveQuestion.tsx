
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Question {
  id: string;
  statement: string;
  type: 'multipla-escolha' | 'verdadeiro-falso' | 'dissertativa';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface InteractiveQuestionProps {
  question: Question;
  metadata: {
    subject: string;
    topic: string;
    bank: string;
    difficulty: string;
  };
  questionNumber: number;
}

const InteractiveQuestion: React.FC<InteractiveQuestionProps> = ({
  question,
  metadata,
  questionNumber
}) => {
  const { user } = useAuth();
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [userResult, setUserResult] = useState<'correct' | 'incorrect' | null>(null);

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleMarkResult = async (isCorrect: boolean) => {
    if (!user || isAnswered) return;

    try {
      const { error } = await supabase
        .from('question_attempts')
        .insert({
          user_id: user.id,
          subject: metadata.subject,
          topic: metadata.topic,
          bank: metadata.bank,
          question_text: question.statement,
          question_type: question.type,
          difficulty: metadata.difficulty,
          user_answer: selectedAnswer,
          correct_answer: question.correctAnswer,
          is_correct: isCorrect
        });

      if (error) throw error;

      setIsAnswered(true);
      setUserResult(isCorrect ? 'correct' : 'incorrect');
      toast.success(isCorrect ? 'Resposta marcada como correta!' : 'Resposta marcada como incorreta!');
    } catch (error) {
      console.error('Erro ao salvar tentativa:', error);
      toast.error('Erro ao salvar sua resposta');
    }
  };

  const getResultColor = (isCorrect: boolean) => {
    return isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600';
  };

  return (
    <Card className="mb-6 bg-white/70 backdrop-blur-lg border-white/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Questão {questionNumber}
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{question.type}</Badge>
            <Badge variant="outline">{metadata.difficulty}</Badge>
            {isAnswered && (
              <Badge className={userResult === 'correct' ? 'bg-green-500' : 'bg-red-500'}>
                {userResult === 'correct' ? 'Acerto' : 'Erro'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-gray-800 leading-relaxed">
          {question.statement}
        </div>

        {question.type === 'multipla-escolha' && question.options && (
          <div className="space-y-2">
            {question.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index); // A, B, C, D, E
              const isSelected = selectedAnswer === letter;
              const isCorrect = question.correctAnswer === letter;
              
              return (
                <button
                  key={letter}
                  onClick={() => handleAnswerSelect(letter)}
                  disabled={isAnswered}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isAnswered
                      ? isCorrect
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : isSelected && !isCorrect
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-gray-50 border-gray-200'
                      : isSelected
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">{letter}) </span>
                  {option}
                  {isAnswered && isCorrect && (
                    <Check className="inline ml-2 h-4 w-4 text-green-600" />
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <X className="inline ml-2 h-4 w-4 text-red-600" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'verdadeiro-falso' && (
          <div className="space-y-2">
            {['Verdadeiro', 'Falso'].map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = question.correctAnswer.toLowerCase().includes(option.toLowerCase());
              
              return (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isAnswered}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isAnswered
                      ? isCorrect
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : isSelected && !isCorrect
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-gray-50 border-gray-200'
                      : isSelected
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {option}
                  {isAnswered && isCorrect && (
                    <Check className="inline ml-2 h-4 w-4 text-green-600" />
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <X className="inline ml-2 h-4 w-4 text-red-600" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {!showAnswer && (
            <Button
              onClick={handleShowAnswer}
              variant="outline"
              size="sm"
            >
              <ChevronDown className="mr-2 h-4 w-4" />
              Ver Resposta
            </Button>
          )}
          
          {showAnswer && !isAnswered && (
            <>
              <Button
                onClick={() => handleMarkResult(true)}
                size="sm"
                className="bg-green-500 hover:bg-green-600"
              >
                <Check className="mr-2 h-4 w-4" />
                Acertei
              </Button>
              <Button
                onClick={() => handleMarkResult(false)}
                size="sm"
                className="bg-red-500 hover:bg-red-600"
              >
                <X className="mr-2 h-4 w-4" />
                Errei
              </Button>
            </>
          )}
        </div>

        <AnimatePresence>
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronUp className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Resposta Correta</span>
                  </div>
                  <div className="text-blue-700">
                    <div className="font-medium mb-1">
                      {question.correctAnswer}
                    </div>
                    {question.explanation && (
                      <div className="text-sm text-blue-600">
                        {question.explanation}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default InteractiveQuestion;
