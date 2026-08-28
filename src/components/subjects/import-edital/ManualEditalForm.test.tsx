import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManualEditalForm } from './ManualEditalForm';

describe('ManualEditalForm', () => {
  it('exibe campos com validação e bloqueia submit sem campos obrigatórios', () => {
    const onSubmit = vi.fn();
    render(<ManualEditalForm onSubmit={onSubmit} />);

    expect(screen.getByLabelText(/Órgão ou Concurso/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cargo, Função ou Área/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ano do Edital/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Criar edital e adicionar matérias/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Órgão ou Concurso/i), { target: { value: 'Polícia Federal' } });
    fireEvent.change(screen.getByLabelText(/Cargo, Função ou Área/i), { target: { value: 'Agente' } });
    fireEvent.change(screen.getByLabelText(/Ano do Edital/i), { target: { value: '2026' } });

    expect(submitBtn).toBeEnabled();
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      origin: 'Polícia Federal',
      position: 'Agente',
      year: '2026',
      examDate: '',
      examBoard: '',
    });
  });

  it('permite preencher banca e data da prova opcionais', () => {
    const onSubmit = vi.fn();
    render(<ManualEditalForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Órgão ou Concurso/i), { target: { value: 'INSS' } });
    fireEvent.change(screen.getByLabelText(/Cargo, Função ou Área/i), { target: { value: 'Técnico' } });
    fireEvent.change(screen.getByLabelText(/Ano do Edital/i), { target: { value: '2026' } });
    fireEvent.change(screen.getByLabelText(/Banca examinadora/i), { target: { value: 'Cebraspe' } });
    fireEvent.change(screen.getByLabelText(/Data da Prova/i), { target: { value: '2026-11-15' } });

    fireEvent.click(screen.getByRole('button', { name: /Criar edital e adicionar matérias/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      origin: 'INSS',
      position: 'Técnico',
      year: '2026',
      examDate: '2026-11-15',
      examBoard: 'Cebraspe',
    });
  });
});
