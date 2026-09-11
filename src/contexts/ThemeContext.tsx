import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Verificar se há tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }

    // Sempre iniciar em modo claro (dia)
    return 'light';
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;

    // Verificar se estamos na página base de acesso livre
    const isLoginPage = window.location.pathname === '/login' ||
      window.location.pathname === '/reset-password';

    // Ao invés de forçar light (claro), vamos FORÇAR DARK na página de login
    if (theme === 'dark' || isLoginPage) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Limpeza de variáveis inline do testador temporário para garantir os tokens oficiais
    if (localStorage.getItem('vourevisar_temp_palette_id')) {
      localStorage.removeItem('vourevisar_temp_palette_id');
      [
        '--background',
        '--sidebar-background',
        '--card',
        '--surface',
        '--surface-raised',
        '--border',
        '--sidebar-border',
        '--sidebar-accent',
        '--muted',
      ].forEach(prop => {
        root.style.removeProperty(prop);
      });
    }
  }, [theme]);

  // Remover listener de mudanças do sistema - sempre manter controle manual

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
