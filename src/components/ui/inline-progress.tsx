
import React from 'react';
import { cn } from '@/lib/utils';

interface InlineProgressProps {
  correct: number;
  total: number;
  className?: string;
}

export const InlineProgress: React.FC<InlineProgressProps> = ({ 
  correct, 
  total, 
  className 
}) => {
  const percentage = total > 0 ? (correct / total) * 100 : 0;
  const incorrectPercentage = 100 - percentage;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
        <div 
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        <div 
          className="h-full bg-red-500 transition-all duration-300"
          style={{ width: `${incorrectPercentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 min-w-[3rem]">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
};
