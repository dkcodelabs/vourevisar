interface PaymentConfirmationError {
  code?: string;
  decline_code?: string;
}

const defaultPaymentError =
  'Não conseguimos confirmar o pagamento. Nenhuma cobrança foi concluída. Revise os dados ou tente outro cartão.';

export const getPaymentErrorMessage = (error: PaymentConfirmationError | null | undefined) => {
  const code = error?.decline_code || error?.code;

  switch (code) {
    case 'card_declined':
    case 'generic_decline':
    case 'do_not_honor':
      return 'Seu cartão não autorizou este pagamento. Tente outro cartão ou fale com seu banco.';
    case 'insufficient_funds':
      return 'O cartão não possui limite disponível para este pagamento. Use outro cartão ou fale com seu banco.';
    case 'expired_card':
      return 'Este cartão está vencido. Use outro cartão para continuar.';
    case 'incorrect_cvc':
    case 'invalid_cvc':
      return 'O código de segurança não confere. Revise o CVC e tente novamente.';
    case 'incorrect_number':
    case 'invalid_number':
      return 'O número do cartão não confere. Revise os dados e tente novamente.';
    case 'authentication_required':
      return 'Seu banco pediu uma nova confirmação. Tente novamente e conclua a verificação.';
    case 'processing_error':
      return 'O pagamento não foi concluído. Nenhuma cobrança foi confirmada. Tente novamente.';
    default:
      return defaultPaymentError;
  }
};
