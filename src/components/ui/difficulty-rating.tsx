import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DifficultyRatingProps {
  value?: number | null;
  onChange?: (rating: number | null) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const difficultyLabels = {
  1: 'Fácil',
  2: 'Médio',
  3: 'Difícil',
  4: 'Difícil',
  5: 'Muito Difícil'
};

const difficultyColors = {
  1: 'text-green-500',
  2: 'text-yellow-500',
  3: 'text-red-500',
  4: 'text-orange-500',
  5: 'text-red-500'
};

export const DifficultyRating: React.FC<DifficultyRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showLabel = false,
  className
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleClick = (rating: number) => {
    if (readonly || !onChange) return;

    // Se clicar na mesma estrela, remove a avaliação
    if (value === rating) {
      onChange(null);
    } else {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  const displayValue = hoverValue || value || 0;
  const currentColor = displayValue > 0 ? difficultyColors[displayValue as keyof typeof difficultyColors] : 'text-gray-300';

  // Layout diferente para readonly (apenas estrelas) vs interativo (com labels)
  if (readonly) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {[1, 2, 3].map((rating) => {
          const isFilled = rating <= displayValue;

          return (
            <Star
              key={rating}
              className={cn(
                sizeClasses[size],
                'transition-colors duration-150',
                isFilled ? currentColor : 'text-gray-300',
                isFilled && 'fill-current'
              )}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Labels e Estrelas */}
      <div className="flex items-center gap-2">
        {/* Label "Fácil" */}
        <span className="text-xs text-gray-500 font-medium">Fácil</span>

        {/* Estrelas */}
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((rating) => {
            const isFilled = rating <= displayValue;
            const isClickable = !readonly && onChange;

            return (
              <button
                key={rating}
                type="button"
                disabled={!isClickable}
                onClick={() => handleClick(rating)}
                onMouseEnter={() => handleMouseEnter(rating)}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  sizeClasses[size],
                  'transition-colors duration-150',
                  isClickable && 'hover:scale-110 cursor-pointer',
                  !isClickable && 'cursor-default'
                )}
              >
                <Star
                  className={cn(
                    'w-full h-full transition-colors duration-150',
                    isFilled ? currentColor : 'text-gray-300',
                    isFilled && 'fill-current'
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Label "Difícil" */}
        <span className="text-xs text-gray-500 font-medium">Difícil</span>
      </div>

      {/* Label da dificuldade selecionada */}
      {showLabel && value && (
        <span className={cn(
          'text-sm font-medium',
          currentColor
        )}>
          {difficultyLabels[value as keyof typeof difficultyLabels]}
        </span>
      )}

      {/* Botão Limpar embaixo */}
      {!readonly && onChange && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Limpar
        </button>
      )}
    </div>
  );
};