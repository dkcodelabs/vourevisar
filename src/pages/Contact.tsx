import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { legalProvider } from '@/config/legalProvider';
import { getSupportWhatsAppUrl } from '@/config/support';

const Contact = () => (
  <LegalDocumentLayout eyebrow="Atendimento" title="Contato" version="2026-08-21.1-draft">
    <h2>Atendimento eletrônico</h2>
    <p>Use os canais abaixo para dúvidas, reclamações, suspensão, cancelamento, arrependimento ou solicitações relacionadas aos seus dados.</p>
    <p><a href={getSupportWhatsAppUrl('Olá, preciso de atendimento sobre minha conta no vouRevisar.')}>Falar pelo WhatsApp</a></p>
    {legalProvider.email && <p><a href={`mailto:${legalProvider.email}`}>{legalProvider.email}</a></p>}
    <p>O recebimento da solicitação será confirmado pelo mesmo meio utilizado. Pedidos financeiros também ficam registrados na área Minha assinatura quando o fluxo correspondente estiver disponível.</p>
  </LegalDocumentLayout>
);

export default Contact;
