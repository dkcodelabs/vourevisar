import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'light' ? 'Modo escuro' : 'Modo claro';
  const title = theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro';
  const Icon = theme === 'light' ? Moon : Sun;

  return (
    <button
      onClick={toggleTheme}
      className={
        compact
          ? 'grid h-9 w-9 place-items-center rounded-lg border border-black/5 bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-primary dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10'
          : 'flex h-9 w-full items-center gap-2 rounded-lg border border-black/5 bg-black/5 px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-black/10 hover:text-primary dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10'
      }
      aria-label={title}
      title={title}
    >
      <Icon size={17} className={theme === 'light' ? undefined : 'text-yellow-500'} />
      {!compact && <span>{label}</span>}
    </button>
  );
};
