import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PracticeItemRating } from '@/features/practice/components/PracticeItemRating';

describe('PracticeItemRating', () => {
  it('registra o motivo negativo, oculta o item e permite desfazer', async () => {
    const onRate = vi.fn();
    render(<PracticeItemRating onRate={onRate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Questão não útil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ambígua' }));

    await waitFor(() => {
      expect(onRate).toHaveBeenCalledWith(-1, 'ambiguous');
    });
    expect(screen.getByText('Questão removida dos seus próximos treinos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }));

    await waitFor(() => {
      expect(screen.getByText('Esta questão foi útil?')).toBeInTheDocument();
    });
  });

  it('registra avaliação positiva sem pedir motivo', async () => {
    const onRate = vi.fn();
    render(<PracticeItemRating onRate={onRate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Questão útil' }));

    await waitFor(() => {
      expect(onRate).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText(/ajuda a selecionar treinos melhores/i)).toBeInTheDocument();
  });
});
