import { useMemo, useState } from 'react';
import { Calendar, Crown, Loader2, RefreshCw, Search, Shield, User, UserCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminBillingRefundQueue } from '@/features/billing/components/AdminBillingRefundQueue';
import { AdminBillingOperationTimeline } from '@/features/billing/components/AdminBillingOperationTimeline';
import {
  useAdminBillingUsers,
  useGrantManualBillingAccess,
  useRevokeManualBillingAccess,
} from '@/features/billing/hooks/useAdminBilling';
import { isBillingWithdrawalAdminEnabled } from '@/features/billing/legal/billingLegalDocuments';
import type { AdminBillingPlan, AdminBillingUser } from '@/features/billing/services/adminBillingService';
import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';

const EMPTY_USERS: AdminBillingUser[] = [];

const formatDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : null;

const planLabel: Record<AdminBillingPlan, string> = {
  free_trial: 'Trial',
  monthly: 'Mensal',
  annual: 'Anual',
};

const sourceLabel: Record<AdminBillingUser['source'], string> = {
  stripe: 'Stripe',
  trial: 'Trial',
  manual: 'Cortesia',
  goodwill: 'Cortesia',
  migration: 'Migração',
  none: 'Sem acesso',
};

const statusBadge = (user: AdminBillingUser) => {
  if (user.role === 'owner') {
    return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 shadow-none"><Crown className="mr-1 h-3 w-3" />Proprietário</Badge>;
  }
  if (user.role === 'admin') {
    return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-none"><Shield className="mr-1 h-3 w-3" />Admin</Badge>;
  }
  if (!user.is_active) {
    return <Badge className="bg-foreground/5 text-foreground/60 border-foreground/10 shadow-none"><XCircle className="mr-1 h-3 w-3" />Sem acesso</Badge>;
  }
  if (user.plan === 'free_trial') {
    return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 shadow-none"><UserCheck className="mr-1 h-3 w-3" />Trial</Badge>;
  }
  return <Badge className={user.plan === 'annual' ? 'bg-primary/10 text-primary border-primary/20 shadow-none' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-none'}><UserCheck className="mr-1 h-3 w-3" />{planLabel[user.plan]}</Badge>;
};

const SubscriptionManagement = () => {
  const [search, setSearch] = useState('');
  const usersQuery = useAdminBillingUsers();
  const grantMutation = useGrantManualBillingAccess();
  const revokeMutation = useRevokeManualBillingAccess();
  const users = usersQuery.data ?? EMPTY_USERS;
  const isMutatingUser = grantMutation.isPending
    ? grantMutation.variables?.userId ?? null
    : revokeMutation.isPending
      ? revokeMutation.variables ?? null
      : null;

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      user.email?.toLowerCase().includes(needle) || user.name?.toLowerCase().includes(needle),
    );
  }, [search, users]);

  const totals = useMemo(() => ({
    trial: users.filter((user) => user.is_active && user.plan === 'free_trial').length,
    monthly: users.filter((user) => user.is_active && user.plan === 'monthly').length,
    annual: users.filter((user) => user.is_active && user.plan === 'annual').length,
    withoutAccess: users.filter((user) => user.role !== 'owner' && user.role !== 'admin' && !user.is_active).length,
  }), [users]);

  const grant = async (user: AdminBillingUser, plan: AdminBillingPlan) => {
    const label = plan === 'free_trial' ? 'teste de cortesia por 7 dias' : `cortesia ${planLabel[plan].toLowerCase()}`;
    if (!window.confirm(`Conceder ${label} para ${user.email}? Isso libera somente o acesso ao produto e não cria, altera ou cancela cobranças na Stripe.`)) return;
    try {
      await grantMutation.mutateAsync({ userId: user.id, plan });
      toast.success('Cortesia de acesso concedida. Nenhuma cobrança foi alterada.');
    } catch (error) {
      toastGate.notifyError(error instanceof Error ? error.message : 'Não foi possível conceder o acesso manual.', 'ADMIN-BILLING-GRANT', { severity: 'medium' });
    }
  };

  const revoke = async (user: AdminBillingUser) => {
    if (!window.confirm(`Revogar a cortesia de ${user.email}? O usuário pode perder o acesso ao produto imediatamente. A conta e qualquer assinatura Stripe permanecerão inalteradas.`)) return;
    try {
      await revokeMutation.mutateAsync(user.id);
      toast.success('Cortesia de acesso revogada. A conta e a Stripe permaneceram inalteradas.');
    } catch (error) {
      toastGate.notifyError(error instanceof Error ? error.message : 'Não foi possível remover a concessão manual.', 'ADMIN-BILLING-REVOKE', { severity: 'medium' });
    }
  };

  if (usersQuery.isLoading) {
    return (
      <div className="w-full max-w-[1600px] space-y-6" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3 px-1 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" />
          Atualizando o panorama de acessos
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-3xl border border-border/60 bg-card" />)}
        </div>
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card p-6">
          <div className="h-11 max-w-sm animate-pulse rounded-2xl bg-muted" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted/70" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] animate-fade-in font-sans">
      <div className="mb-5 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Fonte única de acesso: </strong>
        este painel mostra somente a assinatura Stripe e concessões internas válidas. Registros antigos não participam das decisões de acesso.
      </div>

      {isBillingWithdrawalAdminEnabled() && <AdminBillingRefundQueue />}

      <AdminBillingOperationTimeline />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total de usuários', users.length, 'text-foreground'],
          ['Trials ativos', totals.trial, 'text-amber-600 dark:text-amber-400'],
          ['Mensais ativos', totals.monthly, 'text-blue-600 dark:text-blue-400'],
          ['Anuais ativos', totals.annual, 'text-primary'],
          ['Sem acesso', totals.withoutAccess, 'text-red-600 dark:text-red-400'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="glow-card relative overflow-hidden rounded-3xl p-5 text-center">
            <span className="data-label mb-2 block">{label}</span>
            <span className={`text-3xl font-black ${color}`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden rounded-3xl px-2 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 px-6 pb-6 pt-2 dark:border-white/5">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail..." className="w-full rounded-2xl border-transparent bg-black/5 py-2.5 pl-11 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground hover:bg-black/10 focus:ring-2 focus:ring-primary dark:bg-white/5 dark:hover:bg-white/10" />
          </div>
          <Button variant="outline" size="sm" onClick={() => void usersQuery.refetch()} disabled={usersQuery.isFetching} className="h-10 gap-2 rounded-xl bg-transparent px-4">
            <RefreshCw className={`h-4 w-4 ${usersQuery.isFetching ? 'animate-spin' : ''}`} />Atualizar
          </Button>
        </div>

        {usersQuery.isError && <div className="m-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">Não foi possível carregar o estado canônico de cobrança. Tente atualizar.</div>}

        <div className="divide-y divide-black/5 px-4 pb-2 dark:divide-white/5">
          {filteredUsers.map((user) => {
            const processing = isMutatingUser === user.id;
            const accessDateLabel = !user.is_active && user.source === 'stripe'
              ? 'Assinatura encerrada em'
              : user.cancel_at_period_end
                ? 'Acesso até'
                : user.source === 'stripe'
                  ? 'Próxima renovação'
                  : 'Acesso até';
            return (
              <div key={user.id} className="my-1 flex flex-col gap-4 rounded-2xl p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-12 w-12 rounded-full border border-black/10 object-cover dark:border-white/10" referrerPolicy="no-referrer" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/5 font-bold text-foreground dark:border-white/10 dark:bg-white/5">{(user.name || user.email || 'U').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-bold text-foreground">{user.name || 'Sem nome'} <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">({user.role})</span></div>
                    <div className="truncate text-sm text-muted-foreground">{user.email}</div>
                    {user.role === 'owner' || user.role === 'admin' ? <div className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">Acesso administrativo</div> : user.access_until ? <div className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground"><Calendar className="h-3 w-3" />{accessDateLabel}: {formatDate(user.access_until)}</div> : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {statusBadge(user)}
                  {user.source !== 'none' && user.role !== 'owner' && user.role !== 'admin' && <Badge variant="outline" className="border-black/10 text-muted-foreground dark:border-white/10">{user.source === 'stripe' && !user.is_active ? 'Stripe — histórico' : sourceLabel[user.source]}</Badge>}
                  <div className="h-7 w-px bg-black/10 dark:bg-white/10" />
                  {processing ? <div className="flex h-10 min-w-44 items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 text-xs font-semibold text-primary" role="status"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Atualizando acesso</div> : <select defaultValue="" onChange={(event) => { const value = event.target.value; event.currentTarget.value = ''; if (value === 'revoke') void revoke(user); else if (value) void grant(user, value as AdminBillingPlan); }} disabled={user.role === 'owner' || user.role === 'admin'} className="h-9 min-w-52 rounded-xl border border-black/10 bg-background px-3 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10">
                    <option value="">Ações de acesso</option>
                    <option value="free_trial">Conceder teste de cortesia (7 dias)</option>
                    <option value="monthly">Conceder cortesia mensal (30 dias)</option>
                    <option value="annual">Conceder cortesia anual (365 dias)</option>
                    {user.manual_access && <option value="revoke">Revogar cortesia ativa</option>}
                  </select>}
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && <div className="p-12 text-center font-medium text-muted-foreground">Nenhum usuário encontrado.</div>}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
