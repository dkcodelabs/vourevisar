import React, { useState, useEffect } from 'react';

// Os ícones não precisam mais das classes de visibilidade complexas, apenas tamanho e estilo.
const SunIcon = ({ className = "h-6 w-6" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 5a7 7 0 100 14 7 7 0 000-14z" /></svg>;
const MoonIcon = ({ className = "h-6 w-6" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;

const LOCAL_STORAGE_THEME_KEY = 'theme';

const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState(() => {
    // Verifica o tema no localStorage na carga inicial de forma síncrona.
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY);
      if (savedTheme === 'dark') {
        return 'dark';
      }
    }
    // O padrão é 'light'
    return 'light';
  });

  // Efeito para aplicar a classe 'dark' ao <html> e salvar no localStorage sempre que o tema mudar.
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-3 rounded-full bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 shadow-lg hover:shadow-xl dark:hover:bg-slate-600 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 transform hover:scale-110"
      aria-label="Alterar tema"
    >
      {/* Renderiza condicionalmente o ícone correto com base no estado do React */}
      {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
};

export default ThemeSwitcher;
