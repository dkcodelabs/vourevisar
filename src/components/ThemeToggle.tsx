import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-full transition-all duration-200 hover:scale-105 hover:bg-muted"
      aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      {theme === 'light' ? (
        <Moon 
          size={20} 
          className="text-muted-foreground transition-colors duration-200" 
        />
      ) : (
        <Sun 
          size={20} 
          className="text-yellow-500 transition-colors duration-200" 
        />
      )}
    </button>
  );
};