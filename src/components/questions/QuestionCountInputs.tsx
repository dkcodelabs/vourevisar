
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuestionCountInputsProps {
  totalQuestions: string;
  setTotalQuestions: (value: string) => void;
  correctQuestions: string;
  setCorrectQuestions: (value: string) => void;
}

const QuestionCountInputs: React.FC<QuestionCountInputsProps> = ({
  totalQuestions,
  setTotalQuestions,
  correctQuestions,
  setCorrectQuestions,
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="total-questions">Total de Questões</Label>
        <Input
          id="total-questions"
          type="number"
          min="0"
          value={totalQuestions}
          onChange={(e) => setTotalQuestions(e.target.value)}
          placeholder=""
        />
      </div>
      <div>
        <Label htmlFor="correct-questions">Questões Corretas</Label>
        <Input
          id="correct-questions"
          type="number"
          min="0"
          max={totalQuestions || undefined}
          value={correctQuestions}
          onChange={(e) => setCorrectQuestions(e.target.value)}
          placeholder=""
        />
      </div>
    </div>
  );
};

export default QuestionCountInputs;
