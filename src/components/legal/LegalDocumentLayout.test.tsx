import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';

describe('LegalDocumentLayout', () => {
  it('returns to the route that opened the legal document', () => {
    render(
      <MemoryRouter initialEntries={['/checkout', '/termos']} initialIndex={1}>
        <Routes>
          <Route path="/checkout" element={<p>Checkout</p>} />
          <Route
            path="/termos"
            element={(
              <LegalDocumentLayout eyebrow="Relação contratual" title="Termos de Uso" version="2026-08-21.1">
                <p>Conteúdo do documento</p>
              </LegalDocumentLayout>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByText('Checkout')).toBeVisible();
  });
});
