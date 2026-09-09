import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const isLight = theme === 'light';
    const Icon = isLight ? Moon : Sun;
    const title = isLight ? 'Ativar modo escuro' : 'Ativar modo claro';

    return (
      <button
        onClick={() => setTheme(isLight ? 'dark' : 'light')}
        className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-sidebar-foreground/70 transition-colors hover:bg-white/[0.1] hover:text-sidebar-primary focus-visible:ring-sidebar-ring"
        aria-label={title}
        title={title}
      >
        <Icon size={16} />
      </button>
    );
  }

  return (
    <div className="app-sidebar-theme-switcher" role="group" aria-label="Tema da aplicação">
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        className="app-sidebar-theme-option"
      >
        <Sun size={14} aria-hidden="true" />
        Claro
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        className="app-sidebar-theme-option"
      >
        <Moon size={14} aria-hidden="true" />
        Escuro
      </button>
    </div>
  );
};
