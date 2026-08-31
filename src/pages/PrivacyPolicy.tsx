import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { BILLING_PRIVACY_VERSION } from '@/features/billing/legal/billingLegalDocuments';

const PrivacyPolicy = () => (
  <LegalDocumentLayout eyebrow="Proteção de dados" title="Política de Privacidade" version={BILLING_PRIVACY_VERSION}>
    <h2>1. Dados tratados</h2>
    <p>O vouRevisar trata dados de conta, autenticação, perfil, uso do produto, conteúdo de estudo, registros de segurança e dados mínimos necessários para administrar assinaturas.</p>
    <h2>2. Pagamentos</h2>
    <p>Dados completos de cartão são coletados e processados diretamente pela Stripe. O vouRevisar mantém apenas identificadores técnicos, plano, valores, situação da assinatura e informações sanitizadas como bandeira e últimos quatro dígitos.</p>
    <h2>3. Finalidades</h2>
    <p>Os dados são utilizados para fornecer o serviço, autenticar usuários, preservar segurança, cumprir contratos e obrigações legais, prestar suporte e administrar cobrança, cancelamento e reembolso.</p>
    <h2>4. Compartilhamento</h2>
    <p>Dados podem ser tratados por fornecedores necessários à operação, como Supabase, Vercel, Stripe e serviço transacional de e-mail, dentro da finalidade correspondente. Esses fornecedores podem processar dados fora do Brasil conforme suas medidas de segurança e instrumentos contratuais aplicáveis.</p>
    <h2>5. Conservação e segurança</h2>
    <p>Registros financeiros, contratuais e de segurança são mantidos pelo período necessário ao cumprimento de obrigações e defesa de direitos. Chaves secretas e números completos de cartão não são expostos no navegador.</p>
    <h2>6. Direitos do titular</h2>
    <p>O titular pode solicitar confirmação do tratamento, acesso, correção, informação sobre compartilhamentos, anonimização, bloqueio, eliminação quando cabível e demais direitos aplicáveis pelo contato eletrônico indicado nesta página. Pedidos de exclusão não eliminam registros cuja conservação seja obrigatória ou necessária para defesa de direitos.</p>
  </LegalDocumentLayout>
);

export default PrivacyPolicy;
