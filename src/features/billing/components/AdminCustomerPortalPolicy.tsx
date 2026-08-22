import { AlertTriangle, CheckCircle2, CreditCard, FileText, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminCustomerPortalPolicy } from '@/features/billing/hooks/useAdminBilling';

type PolicyCheckProps = {
  icon: React.ReactNode;
  label: string;
  description: string;
  isReady: boolean;
};

const PolicyCheck = ({ icon, label, description, isReady }: PolicyCheckProps) => (
  <article className={`rounded-2xl border p-4 ${isReady ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/25 bg-amber-500/10'}`}>
    <div className="flex items-start gap-3">
      <span className={isReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
        {isReady ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-black text-foreground">{icon}{label}</div>
        <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  </article>
);

export const AdminCustomerPortalPolicy = () => {
  const query = useAdminCustomerPortalPolicy();
  const policy = query.data;
  const cancellationIsSafe = Boolean(
    policy?.configured &&
    policy.cancellation?.enabled &&
    policy.cancellation.mode === 'at_period_end',
  );
  const planChangesAreBlocked = Boolean(
    policy?.configured &&
    !policy.subscription_update_enabled &&
    policy.subscription_update_allowed.length === 0,
  );

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-border/60 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-foreground">Configuração do Customer Portal</h2>
            {policy && <Badge variant="outline" className="shadow-none">{policy.livemode ? 'Produção (Live)' : 'Teste'}</Badge>}
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Leitura da configuração padrão atualmente usada pela Stripe. Esta área não cria sessão, não altera cobrança e não expõe IDs do provedor.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching} className="h-10 gap-2 rounded-xl">
          <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />Atualizar
        </Button>
      </div>

      {query.isLoading && <div className="flex min-h-28 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Conferindo configuração</div>}
      {query.isError && <div className="m-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-semibold text-red-700 dark:text-red-400">Não foi possível conferir a configuração do Portal. Nenhuma alteração foi feita.</div>}
      {!query.isLoading && !query.isError && policy && (
        <div className="grid gap-3 p-5 lg:grid-cols-3">
          <PolicyCheck
            icon={<Settings2 className="h-4 w-4" />}
            label="Cancelamento normal"
            isReady={cancellationIsSafe}
            description={cancellationIsSafe
              ? 'Ativo para o fim do período pago, sem reembolso automático.'
              : 'Exige ajuste: o cancelamento deve estar ativo e ocorrer ao fim do período pago.'}
          />
          <PolicyCheck
            icon={<FileText className="h-4 w-4" />}
            label="Faturas e cartão"
            isReady={policy.invoice_history_enabled && policy.payment_method_update_enabled}
            description={policy.invoice_history_enabled && policy.payment_method_update_enabled
              ? 'Histórico de faturas e atualização do cartão estão disponíveis ao aluno.'
              : 'Revise o acesso a faturas e à atualização de cartão no Portal.'}
          />
          <PolicyCheck
            icon={<CreditCard className="h-4 w-4" />}
            label="Troca de plano"
            isReady={planChangesAreBlocked}
            description={planChangesAreBlocked
              ? 'Bloqueada até a política de mensal para anual ser definida e implementada.'
              : 'Ativa na Stripe: bloqueie até existir contrato, aceite e regra de reembolso para a troca.'}
          />
        </div>
      )}
    </section>
  );
};
