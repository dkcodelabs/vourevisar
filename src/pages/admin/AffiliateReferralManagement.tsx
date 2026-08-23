import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BadgeCheck, Ban, CircleDollarSign, Printer, RefreshCw, TicketPercent, Users } from 'lucide-react';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useAdminAffiliateLedger,
  useCreateAdminAffiliate,
  useRecordAdminAffiliatePayout,
  useSetAdminAffiliateActive,
} from '@/features/billing/hooks/useAdminAffiliates';
import type { AffiliateConversionStatus } from '@/features/billing/services/adminAffiliateService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatMoney = (cents: number, currency = 'brl') => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: currency.toUpperCase(),
}).format(cents / 100);

const localDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));

const saoPauloDateKey = (value: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date(value));

const currentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return { start: `${year}-${month}-01`, end: `${year}-${month}-${lastDay}` };
};

const statusLabel: Record<AffiliateConversionStatus, string> = {
  pending: 'Em carência',
  eligible: 'Liberada',
  refunded: 'Reembolsada',
  disputed: 'Em disputa',
  paid: 'Repassada',
};

export default function AffiliateReferralManagement() {
  const { isOwner, loading: roleLoading } = useUserRole();
  const ledgerQuery = useAdminAffiliateLedger();
  const createAffiliate = useCreateAdminAffiliate();
  const setAffiliateActive = useSetAdminAffiliateActive();
  const recordPayout = useRecordAdminAffiliatePayout();
  const initialRange = useMemo(currentMonthRange, []);
  const [affiliateId, setAffiliateId] = useState('all');
  const [periodStart, setPeriodStart] = useState(initialRange.start);
  const [periodEnd, setPeriodEnd] = useState(initialRange.end);
  const [createOpen, setCreateOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  const ledger = ledgerQuery.data;
  const filteredConversions = useMemo(() => (ledger?.conversions ?? []).filter((conversion) => {
    const paidDate = saoPauloDateKey(conversion.paid_at);
    return (affiliateId === 'all' || conversion.affiliate_id === affiliateId)
      && paidDate >= periodStart
      && paidDate <= periodEnd;
  }), [affiliateId, ledger?.conversions, periodEnd, periodStart]);

  const reversedAfterPayout = useMemo(() => filteredConversions.filter((conversion) =>
    conversion.payout_id !== null
    && (conversion.payout_status === 'refunded' || conversion.payout_status === 'disputed')),
  [filteredConversions]);

  const reversedAfterPayoutAmount = useMemo(() => reversedAfterPayout.reduce(
    (total, conversion) => total + conversion.commission_amount_cents,
    0,
  ), [reversedAfterPayout]);

  const selectedAffiliate = ledger?.affiliates.find((affiliate) => affiliate.id === affiliateId) ?? null;
  const totals = useMemo(() => filteredConversions.reduce((summary, conversion) => {
    summary.sales += conversion.payout_status === 'refunded' || conversion.payout_status === 'disputed' ? 0 : 1;
    summary.paid += conversion.payout_status === 'refunded' || conversion.payout_status === 'disputed'
      ? 0
      : conversion.paid_amount_cents;
    if (conversion.payout_status === 'eligible') summary.available += conversion.commission_amount_cents;
    if (conversion.payout_status === 'pending') summary.hold += conversion.commission_amount_cents;
    if (conversion.payout_status === 'paid') summary.transferred += conversion.commission_amount_cents;
    if (conversion.payout_status === 'refunded' || conversion.payout_status === 'disputed') summary.reversed += 1;
    return summary;
  }, { sales: 0, paid: 0, available: 0, hold: 0, transferred: 0, reversed: 0 }), [filteredConversions]);

  if (roleLoading) return <div className="p-8 text-sm text-muted-foreground">Confirmando permissão...</div>;
  if (!isOwner) return <Navigate to="/dashboard" replace />;

  const submitAffiliate = async () => {
    try {
      await createAffiliate.mutateAsync({ name, code });
      setCreateOpen(false);
      setName('');
      setCode('');
      toast.success('Código criado na Stripe e vinculado ao divulgador.');
    } catch (error) {
      toastGate.notifyError(
        error instanceof Error ? error.message : 'Não foi possível criar o código.',
        'ADMIN-AFFILIATE-CREATE',
      );
    }
  };

  const submitPayout = async () => {
    if (!selectedAffiliate) return;
    try {
      await recordPayout.mutateAsync({
        affiliateId: selectedAffiliate.id,
        periodStart,
        periodEnd,
        paymentReference,
      });
      setPayoutOpen(false);
      setPaymentReference('');
      toast.success('Repasse registrado. As vendas foram marcadas como pagas.');
    } catch (error) {
      toastGate.notifyError(
        error instanceof Error ? error.message : 'Não foi possível registrar o repasse.',
        'ADMIN-AFFILIATE-PAYOUT',
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Divulgação e repasses</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Códigos de parceiros</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A Stripe aplica 20% na primeira cobrança. O sistema separa 30% do valor realmente pago para o repasse manual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => ledgerQuery.refetch()} disabled={ledgerQuery.isFetching}>
            <RefreshCw className="mr-2 size-4" /> Atualizar
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" /> Imprimir relatório
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <TicketPercent className="mr-2 size-4" /> Novo código
          </Button>
        </div>
      </div>

      <Alert className="print:hidden">
        <BadgeCheck className="size-4" />
        <AlertTitle>{ledger?.livemode ? 'Produção (Live)' : 'Ambiente de teste'}</AlertTitle>
        <AlertDescription>
          Produtos, preços, descontos e cobranças continuam oficiais na Stripe. Esta página apenas organiza conversões e Pix já realizados.
        </AlertDescription>
      </Alert>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Relatório do período</CardTitle>
            <CardDescription>Selecione um divulgador para registrar o repasse.</CardDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 print:hidden">
            <div className="space-y-1.5">
              <Label>Divulgador</Label>
              <Select value={affiliateId} onValueChange={setAffiliateId}>
                <SelectTrigger className="min-w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(ledger?.affiliates ?? []).map((affiliate) => (
                    <SelectItem key={affiliate.id} value={affiliate.id}>{affiliate.name} · {affiliate.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>De</Label><Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></div>
            <div className="space-y-1.5"><Label>Até</Label><Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Vendas válidas', String(totals.sales), Users],
              ['Receita confirmada', formatMoney(totals.paid), CircleDollarSign],
              ['Comissão liberada', formatMoney(totals.available), BadgeCheck],
              ['Em carência', formatMoney(totals.hold), RefreshCw],
              ['Reembolsos/disputas', String(totals.reversed), Ban],
            ].map(([label, value, Icon]) => (
              <div key={String(label)} className="rounded-xl border bg-muted/25 p-4">
                <Icon className="mb-3 size-4 text-primary" />
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label as string}</p>
                <p className="mt-1 text-xl font-bold">{value as string}</p>
              </div>
            ))}
          </div>

          {reversedAfterPayout.length > 0 && (
            <Alert variant="destructive" className="print:hidden">
              <Ban className="size-4" />
              <AlertTitle>Ajuste manual necessário</AlertTitle>
              <AlertDescription>
                {reversedAfterPayout.length} venda(s) foi(ram) reembolsada(s) ou contestada(s) depois do repasse,
                somando {formatMoney(reversedAfterPayoutAmount)} de comissão. Desconte esse valor no próximo Pix e
                registre a referência no comprovante.
              </AlertDescription>
            </Alert>
          )}

          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Aluno</TableHead><TableHead>Data</TableHead><TableHead>Plano</TableHead>
                  <TableHead>Pago</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredConversions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">Nenhuma conversão neste período.</TableCell></TableRow>
                  ) : filteredConversions.map((conversion) => (
                    <TableRow key={conversion.id}>
                      <TableCell><p className="font-medium">{conversion.user_name || 'Aluno'}</p><p className="text-xs text-muted-foreground">{conversion.user_email || 'Conta removida'}</p></TableCell>
                      <TableCell>{localDate(conversion.paid_at)}</TableCell>
                      <TableCell>{conversion.plan_code === 'annual' ? 'Anual' : 'Mensal'}</TableCell>
                      <TableCell>{formatMoney(conversion.paid_amount_cents, conversion.currency)}</TableCell>
                      <TableCell>{formatMoney(conversion.commission_amount_cents, conversion.currency)}</TableCell>
                      <TableCell><Badge variant={conversion.payout_status === 'eligible' ? 'default' : 'secondary'}>{statusLabel[conversion.payout_status]}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div><p className="font-semibold">Total disponível para Pix: {formatMoney(totals.available)}</p><p className="text-sm text-muted-foreground">Somente cobranças fora da carência, sem reembolso ou disputa.</p></div>
            <Button onClick={() => setPayoutOpen(true)} disabled={!selectedAffiliate || totals.available <= 0}>Registrar Pix deste período</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader><CardTitle>Divulgadores cadastrados</CardTitle><CardDescription>Desativar um código impede novos usos na Stripe; o histórico permanece.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(ledger?.affiliates ?? []).map((affiliate) => (
            <div key={affiliate.id} className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div><p className="font-semibold">{affiliate.name}</p><p className="font-mono text-sm text-primary">{affiliate.code}</p></div>
              <Switch
                checked={affiliate.active}
                disabled={setAffiliateActive.isPending}
                onCheckedChange={async (active) => {
                  try {
                    await setAffiliateActive.mutateAsync({ affiliateId: affiliate.id, active });
                    toast.success(active ? 'Código ativado.' : 'Código desativado.');
                  } catch (error) {
                    toastGate.notifyError(
                      error instanceof Error ? error.message : 'Não foi possível alterar o código.',
                      'ADMIN-AFFILIATE-STATUS',
                    );
                  }
                }}
              />
            </div>
          ))}
          {!ledgerQuery.isLoading && (ledger?.affiliates.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">Nenhum divulgador cadastrado.</p>}
        </CardContent>
      </Card>

      {ledgerQuery.isError && <Alert variant="destructive"><AlertTitle>Não foi possível carregar</AlertTitle><AlertDescription>{ledgerQuery.error.message}</AlertDescription></Alert>}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Novo código de divulgação</DialogTitle><DialogDescription>Será criado na Stripe Test ou Live conforme o ambiente atual. A regra é fixa: 20% de desconto e 30% de comissão na primeira cobrança.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2"><div className="space-y-2"><Label>Nome do divulgador</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: João Silva" /></div><div className="space-y-2"><Label>Código</Label><Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} placeholder="Ex.: JOAO20" maxLength={32} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Voltar</Button><Button onClick={submitAffiliate} disabled={createAffiliate.isPending}>{createAffiliate.isPending ? 'Criando...' : 'Criar na Stripe'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent><DialogHeader><DialogTitle>Registrar Pix para {selectedAffiliate?.name}</DialogTitle><DialogDescription>O sistema marcará como repassadas apenas as comissões liberadas entre {periodStart} e {periodEnd}. Valor atual: {formatMoney(totals.available)}.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-2"><Label>Referência opcional</Label><Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Ex.: Pix de agosto — comprovante 123" maxLength={160} /></div>
          <DialogFooter><Button variant="outline" onClick={() => setPayoutOpen(false)}>Voltar</Button><Button onClick={submitPayout} disabled={recordPayout.isPending}>{recordPayout.isPending ? 'Registrando...' : 'Confirmar repasse'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
