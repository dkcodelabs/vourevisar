import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { BILLING_REFUND_POLICY_VERSION } from '@/features/billing/legal/billingLegalDocuments';

const CancellationRefundPolicy = () => (
  <LegalDocumentLayout eyebrow="Assinaturas" title="Cancelamento e Reembolso" version={BILLING_REFUND_POLICY_VERSION}>
    <h2>1. Teste gratuito</h2>
    <p>O teste gratuito dura 7 dias, não exige cartão e não se converte automaticamente em assinatura. Como não há pagamento, o encerramento do teste não gera reembolso.</p>
    <h2>2. Direito de arrependimento</h2>
    <p>Em contratações online, o consumidor pode desistir em até 7 dias, nos termos do art. 49 do Código de Defesa do Consumidor. O pedido pode ser feito pela própria Conta, em Assinatura, usando a mesma experiência eletrônica de contratação. O pedido dentro da janela gera reembolso integral do primeiro pagamento da assinatura e cancelamento imediato do acesso pago.</p>
    <h2>3. Processamento do reembolso</h2>
    <p>O recebimento do pedido é confirmado imediatamente no produto e por e-mail. A solicitação de estorno é enviada à Stripe sem espera; o crédito no cartão depende do processamento da Stripe, da bandeira e do banco emissor. Enquanto isso, a solicitação permanece visível como em processamento, sem afirmação de conclusão antecipada.</p>
    <h2>4. Cancelamento normal</h2>
    <p>Após a janela aplicável, o usuário pode cancelar a renovação no gerenciamento da assinatura. Não haverá nova cobrança e o acesso continuará até o fim do período já pago, sem reembolso automático.</p>
    <h2>5. Outros problemas de cobrança</h2>
    <p>Cobrança duplicada, fraude, falha técnica, renovação contestada ou situação excepcional pode ser enviada pela área Ajuda ou pelo contato eletrônico informado nesta página para análise individual, sem impedir o exercício dos direitos legais.</p>
  </LegalDocumentLayout>
);

export default CancellationRefundPolicy;
