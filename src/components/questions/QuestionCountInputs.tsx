
import React from 'react';
import { Input } from '@/components/ui/input';

interface QuestionCountInputsProps {
  totalQuestions: number;
  correctQuestions: number;
  onTotalChange: (value: string) => void;
  onCorrectChange: (value: string) => void;
}

const QuestionCountInputs: React.FC<QuestionCountInputsProps> = ({
  totalQuestions,
  correctQuestions,
  onTotalChange,
  onCorrectChange
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Total de Questões *
        </label>
        <Input
          type="number"
          min="1"
          value={totalQuestions || ''}
          onChange={(e) => onTotalChange(e.target.value)}
          placeholder="Digite o total"
          className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Questões Corretas
        </label>
        <Input
          type="number"
          min="0"
          max={totalQuestions}
          value={correctQuestions || ''}
          onChange={(e) => onCorrectChange(e.target.value)}
          placeholder="Digite quantas corretas"
          className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
};

export default QuestionCountInputs;
