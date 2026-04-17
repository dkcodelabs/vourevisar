import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentorTrendLabel } from '@/types/mentor';

interface TrendIconProps {
  type: MentorTrendLabel;
  className?: string;
  iconOnly?: boolean;
}

export const TrendIcon: React.FC<TrendIconProps> = ({ type, className, iconOnly = false }) => {
  if (type === 'Melhorando') {
    return (
      <div className={cn("flex items-center text-emerald-500", className)}>
        <TrendingUp className={cn("w-4 h-4", !iconOnly && "mr-1.5")} />
        {!iconOnly && <span className="text-xs font-semibold">Melhorando</span>}
      </div>
    );
  }

  if (type === 'Piorando') {
    return (
      <div className={cn("flex items-center text-rose-500", className)}>
        <TrendingDown className={cn("w-4 h-4", !iconOnly && "mr-1.5")} />
        {!iconOnly && <span className="text-xs font-semibold">Piorando</span>}
      </div>
    );
  }

  // Estável
  return (
    <div className={cn("flex items-center text-slate-400 dark:text-slate-500", className)}>
      <Minus className={cn("w-4 h-4", !iconOnly && "mr-1.5")} />
      {!iconOnly && <span className="text-xs font-medium">Estável</span>}
    </div>
  );
};
