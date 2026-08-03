import { describe, expect, it } from 'vitest';
import { getPaymentErrorMessage } from './paymentErrorMessage';

describe('getPaymentErrorMessage', () => {
  it('turns a decline into an actionable message without technical details', () => {
    expect(getPaymentErrorMessage({ code: 'card_declined' })).toBe(
      'Seu cartão não autorizou este pagamento. Tente outro cartão ou fale com seu banco.',
    );
  });

  it('prioritizes the specific decline reason', () => {
    expect(
      getPaymentErrorMessage({ code: 'card_declined', decline_code: 'insufficient_funds' }),
    ).toContain('limite disponível');
  });

  it('never exposes an unknown provider message', () => {
    expect(getPaymentErrorMessage({ code: 'provider_internal_failure' })).toBe(
      'Não conseguimos confirmar o pagamento. Nenhuma cobrança foi concluída. Revise os dados ou tente outro cartão.',
    );
  });
});
