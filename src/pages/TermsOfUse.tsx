import { LegalDocumentLayout } from '@/components/legal/LegalDocumentLayout';
import { BILLING_TERMS_VERSION } from '@/features/billing/legal/billingLegalDocuments';

const TermsOfUse = () => (
  <LegalDocumentLayout eyebrow="Relação contratual" title="Termos de Uso" version={BILLING_TERMS_VERSION}>
    <h2>1. Serviço</h2>
    <p>O vouRevisar oferece ferramentas digitais para organização de estudos, editais, ciclos, prática e revisões. O serviço auxilia o planejamento do aluno, sem prometer aprovação, classificação ou resultado em concurso.</p>
    <h2>2. Conta e teste gratuito</h2>
    <p>O cadastro concede 7 dias de acesso gratuito sem cartão e sem cobrança automática. O teste é separado de qualquer assinatura paga. Encerrado o teste, o usuário somente será cobrado se escolher um plano e confirmar o checkout.</p>
    <h2>3. Planos pagos</h2>
    <p>Os planos mensal e anual são cobrados antecipadamente e renovados automaticamente na periodicidade escolhida, até o cancelamento. Antes da confirmação, o checkout informa o valor, a periodicidade, a próxima cobrança, as condições da oferta e as regras de cancelamento. Não há taxa adicional além do que for mostrado antes do pagamento.</p>
    <h2>4. Cancelamento e arrependimento</h2>
    <p>O cancelamento da renovação preserva o acesso até o término do período já pago. Para contratações online, o direito de arrependimento pode ser exercido pela própria Conta, na área de Assinatura, conforme a legislação brasileira e a Política de Cancelamento e Reembolso.</p>
    <h2>5. Dados e conteúdo do usuário</h2>
    <p>O usuário é responsável pela veracidade dos dados enviados e por utilizar o serviço de forma lícita. O cancelamento financeiro não autoriza a eliminação automática de dados de estudo; exclusão de conta e dados possui fluxo próprio.</p>
    <h2>6. Alterações</h2>
    <p>Mudanças materiais nos termos ou preços serão informadas de forma clara. Uma nova contratação ou alteração relevante de plano deve registrar a versão aplicável do contrato.</p>
    <h2>7. Atendimento e comprovantes</h2>
    <p>O aluno pode usar a área Ajuda para dúvidas, reclamações e solicitações relacionadas à conta. A confirmação de contratação e os documentos aplicáveis ficam disponíveis em meio eletrônico que permita consulta e reprodução.</p>
    <h2>8. Direitos do consumidor</h2>
    <p>Nenhuma disposição destes Termos limita direitos garantidos pelo Código de Defesa do Consumidor ou por normas obrigatórias aplicáveis.</p>
  </LegalDocumentLayout>
);

export default TermsOfUse;
