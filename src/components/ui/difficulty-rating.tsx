import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DifficultyRatingProps {
  value?: number | null;
  onChange?: (rating: number | null) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  allowClear?: boolean;
}

// Escala oficial: 1 = Fácil (verde), 2 = Médio (amarelo), 3 = Difícil (vermelho)
const DIFFICULTY_CONFIG = {
  1: {
    label: 'Fácil',
    activeColor: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/40',
    bgHover: 'hover:bg-emerald-500/10',
    bgSelected: 'bg-emerald-500/10',
    glow: 'shadow-emerald-500/30',
  },
  2: {
    label: 'Médio',
    activeColor: 'bg-amber-400',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-400/40',
    bgHover: 'hover:bg-amber-400/10',
    bgSelected: 'bg-amber-400/10',
    glow: 'shadow-amber-400/30',
  },
  3: {
    label: 'Difícil',
    activeColor: 'bg-rose-500',
    textColor: 'text-rose-500',
    borderColor: 'border-rose-500/40',
    bgHover: 'hover:bg-rose-500/10',
    bgSelected: 'bg-rose-500/10',
    glow: 'shadow-rose-500/30',
  },
} as const;

/** Mini barras de dificuldade para exibição compacta (read-only) */
export function DifficultyBarsCompact({
  level,
  size = 'md',
  className,
  showEmpty = false,
}: {
  level?: number | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showEmpty?: boolean;
}) {
  const safeLevel = level && level >= 1 && level <= 3 ? (level as 1 | 2 | 3) : null;
  const config = safeLevel ? DIFFICULTY_CONFIG[safeLevel] : null;

  const barSizes = {
    xs: { width: 'w-[2px]', heights: ['h-[4px]', 'h-[6px]', 'h-[8px]'], gap: 'gap-[1.5px]', container: 'h-2' },
    sm: { width: 'w-[3px]', heights: ['h-[6px]', 'h-[9px]', 'h-[12px]'], gap: 'gap-[2px]', container: 'h-3' },
    md: { width: 'w-[4px]', heights: ['h-[8px]', 'h-[11px]', 'h-[14px]'], gap: 'gap-[3px]', container: 'h-4' },
    lg: { width: 'w-[5px]', heights: ['h-[10px]', 'h-[14px]', 'h-[18px]'], gap: 'gap-[3px]', container: 'h-5' },
  };

  const s = barSizes[size];

  if (!config && !showEmpty) return null;

  return (
    <div className={cn(`flex items-end ${s.gap} ${s.container}`, className)} title={config?.label || 'Dificuldade ainda não informada'}>
      {s.heights.map((h, i) => (
        <div
          key={i}
          className={cn(
            s.width,
            h,
            'rounded-sm transition-colors duration-200',
            config && i < safeLevel ? config.activeColor : 'bg-zinc-300/45 dark:bg-zinc-700/50'
          )}
        />
      ))}
    </div>
  );
}

/** Seletor interativo de dificuldade em cards clicáveis com barras */
export const DifficultyRating: React.FC<DifficultyRatingProps> = ({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showLabel = false,
  className,
  allowClear = true,
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const handleClick = (rating: number) => {
    if (readonly || !onChange) return;
    if (value === rating && allowClear) {
      onChange(null);
    } else {
      onChange(rating);
    }
  };

  const displayValue = hoverValue ?? value ?? null;

  // Modo compacto read-only: só mostra as barrinhas
  if (readonly) {
    if (!value) return null;
    return (
      <DifficultyBarsCompact
        level={value as 1 | 2 | 3}
        size={size}
        className={className}
      />
    );
  }

  // Tamanho das barras no seletor interativo
  const cardBarHeights = {
    sm: ['h-3', 'h-4', 'h-5'],
    md: ['h-4', 'h-6', 'h-8'],
    lg: ['h-5', 'h-8', 'h-11'],
  };

  const barWidth = {
    sm: 'w-1',
    md: 'w-1.5',
    lg: 'w-2',
  };

  // Modo interativo: cards clicáveis lado a lado
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="flex items-stretch gap-3 w-full max-w-xs">
        {([1, 2, 3] as const).map((rating) => {
          const config = DIFFICULTY_CONFIG[rating];
          const isSelected = value === rating;
          const isHovered = hoverValue === rating;
          const isActive = isSelected || isHovered;
          const heights = cardBarHeights[size];

          return (
            <motion.button
              key={rating}
              type="button"
              onClick={() => handleClick(rating)}
              onMouseEnter={() => !readonly && setHoverValue(rating)}
              onMouseLeave={() => setHoverValue(null)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'flex-1 flex flex-col items-center justify-end gap-2 px-3 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                isActive
                  ? `${config.bgSelected} ${config.borderColor} shadow-md ${config.glow}`
                  : 'bg-transparent border-border hover:border-border/80',
                isActive && 'ring-2 ring-offset-1',
                isActive && rating === 1 && 'ring-emerald-500/30',
                isActive && rating === 2 && 'ring-amber-400/30',
                isActive && rating === 3 && 'ring-rose-500/30',
              )}
            >
              {/* Barras de dificuldade dentro do card: 1 fácil, 2 médio, 3 difícil */}
              <div className="flex items-end gap-[3px] h-10">
                {heights.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      barWidth[size],
                      h,
                      'rounded-sm transition-all duration-200',
                      i < rating
                        ? isActive
                          ? config.activeColor
                          : 'bg-zinc-400/50 dark:bg-zinc-600/60'
                        : 'bg-zinc-200/40 dark:bg-zinc-700/30'
                    )}
                  />
                ))}
              </div>

              {/* Label do card */}
              <span
                className={cn(
                  'text-xs font-semibold tracking-wide transition-colors duration-200',
                  isActive ? config.textColor : 'text-content-muted'
                )}
              >
                {config.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Label da dificuldade selecionada */}
      {showLabel && displayValue && (
        <motion.span
          key={displayValue}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'text-sm font-semibold',
            DIFFICULTY_CONFIG[displayValue as 1 | 2 | 3].textColor
          )}
        >
          {DIFFICULTY_CONFIG[displayValue as 1 | 2 | 3].label}
        </motion.span>
      )}
    </div>
  );
};
