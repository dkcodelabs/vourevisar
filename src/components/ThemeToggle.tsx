import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-full bg-transparent hover:bg-accent focus:outline-none transition-colors"
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {theme === 'light' ? (
        <Moon
          size={18}
          className="text-muted-foreground transition-colors duration-200"
        />
      ) : (
        <Sun
          size={18}
          className="text-yellow-500 transition-colors duration-200"
        />
      )}
    </button>
  );
};