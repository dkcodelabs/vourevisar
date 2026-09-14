import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider, useTheme } from './ThemeContext';

const ThemeControl = () => {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <span>{theme}</span>
      <button type="button" onClick={() => setTheme('dark')}>Noite</button>
      <button type="button" onClick={() => setTheme('light')}>Dia</button>
    </>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    window.history.replaceState({}, '', '/dashboard');
  });

  it('troca os tokens do documento no clique que altera o tema', () => {
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Noite' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Dia' }));
    expect(document.documentElement).not.toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('light');
  });
});
