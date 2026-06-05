import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Clock, Database, Loader2, Sparkles, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/services/gutCalculator';

type IncidenceStats = {
  totalTopics: number;
  withVolume: number;
  withoutVolume: number;
  fromCatalog: number;
  fromAi: number;
  withVolumeFromAi: number;
  skipped: number;
  noVolume: number;
  errors: number;
  pending: number;
  catalogRows: number;
  lastProcessedAt: string | null;
};

type IncidenceOperationalSummaryProps = {
  refreshTrigger?: number;
};

type IncidenceMapRow = {
  id: string;
  editalId: string;
  editalName: string;
  examBoard: string | null;
  status: string;
  totalTopics: number;
  withSignalCount: number;
  noSignalCount: number;
  catalogCount: number;
  aiCount: number;
  skippedCount: number;
  errorCount: number;
  pendingCount: number;
  lastProcessedAt: string | null;
  completedAt: string | null;
};

const emptyStats: IncidenceStats = {
  totalTopics: 0,
  withVolume: 0,
  withoutVolume: 0,
  fromCatalog: 0,
  fromAi: 0,
  withVolumeFromAi: 0,
  skipped: 0,
  noVolume: 0,
  errors: 0,
  pending: 0,
  catalogRows: 0,
  lastProcessedAt: null,
};

const StatTile = ({
  label,
  value,
  detail,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  tone: string;
  icon: typeof Database;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-[11px] font-black uppercase tracking-wider text-content-muted">{label}</p>
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
        <Icon size={16} />
      </div>
    </div>
    <p className="text-2xl font-black text-foreground tabular-nums">{value.toLocaleString('pt-BR')}</p>
    <p className="mt-1 text-xs text-content-muted">{detail}</p>
  </div>
);

export function IncidenceOperationalSummary({ refreshTrigger = 0 }: IncidenceOperationalSummaryProps) {
  const [stats, setStats] = useState<IncidenceStats>(emptyStats);
  const [maps, setMaps] = useState<IncidenceMapRow[]>([]);
  const [mapsNotice, setMapsNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      const supabase = getSupabaseClient();
      setLoading(true);
      setError(null);

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const userId = userData.user?.id;
        if (!userId) throw new Error('Usuário não autenticado.');

        const topicCount = (configure: (query: any) => any = query => query) => {
          const baseQuery = (supabase as any)
            .from('topics')
            .select('id,subjects!inner(user_id)', { count: 'exact', head: true })
            .eq('subjects.user_id', userId)
            .neq('is_active', false);

          return configure(baseQuery);
        };

        const [
          totalResp,
          withVolumeResp,
          fromCatalogResp,
          fromAiResp,
          withVolumeFromAiResp,
          skippedResp,
          noVolumeResp,
          errorResp,
          pendingResp,
          catalogResp,
          lastProcessedResp,
        ] = await Promise.all([
          topicCount(),
          topicCount(query => query.gt('total_volume', 0)),
          topicCount(query => query.eq('incidence_source', 'catalog')),
          topicCount(query => query.eq('incidence_source', 'ai').not('status', 'in', '("error")')),
          topicCount(query => query.eq('incidence_source', 'ai').gt('total_volume', 0).not('status', 'in', '("error")')),
          topicCount(query => query.eq('is_skipped', true)),
          topicCount(query => query.eq('status', 'no_volume')),
          topicCount(query => query.eq('status', 'error')),
          topicCount(query => query
            .eq('is_skipped', false)
            .or('total_volume.is.null,total_volume.eq.0')
            .or('last_trend_check_at.is.null,status.eq.error')),
          (supabase as any).from('topic_incidence_catalog').select('id', { count: 'exact', head: true }),
          (supabase as any)
            .from('topics')
            .select('last_trend_check_at,subjects!inner(user_id)')
            .eq('subjects.user_id', userId)
            .not('last_trend_check_at', 'is', null)
            .order('last_trend_check_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const firstError = [
          totalResp.error,
          withVolumeResp.error,
          fromCatalogResp.error,
          fromAiResp.error,
          withVolumeFromAiResp.error,
          skippedResp.error,
          noVolumeResp.error,
          errorResp.error,
          pendingResp.error,
          catalogResp.error,
          lastProcessedResp.error,
        ].find(Boolean);

        if (firstError) throw firstError;

        const totalTopics = totalResp.count || 0;
        const withVolume = withVolumeResp.count || 0;

        const { data: mapRows, error: mapsError } = await (supabase as any)
          .from('edital_incidence_maps')
          .select(`
            id,
            edital_id,
            status,
            total_topics,
            with_signal_count,
            no_signal_count,
            catalog_count,
            ai_count,
            skipped_count,
            error_count,
            pending_count,
            last_processed_at,
            completed_at,
            user_editais(name, exam_board)
          `)
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(8);

        if (mapsError) {
          console.warn('Status dos mapas de cobrança indisponível:', mapsError);
          setMaps([]);
          setMapsNotice('Status por edital indisponível. A migration do mapa de cobrança pode estar pendente.');
        } else {
          setMapsNotice(null);
          setMaps((mapRows || []).map((row: any) => ({
            id: row.id,
            editalId: row.edital_id,
            editalName: row.user_editais?.name || 'Edital sem nome',
            examBoard: row.user_editais?.exam_board || null,
            status: row.status,
            totalTopics: row.total_topics || 0,
            withSignalCount: row.with_signal_count || 0,
            noSignalCount: row.no_signal_count || 0,
            catalogCount: row.catalog_count || 0,
            aiCount: row.ai_count || 0,
            skippedCount: row.skipped_count || 0,
            errorCount: row.error_count || 0,
            pendingCount: row.pending_count || 0,
            lastProcessedAt: row.last_processed_at || null,
            completedAt: row.completed_at || null,
          })));
        }

        setStats({
          totalTopics,
          withVolume,
          withoutVolume: Math.max(0, totalTopics - withVolume),
          fromCatalog: fromCatalogResp.count || 0,
          fromAi: fromAiResp.count || 0,
          withVolumeFromAi: withVolumeFromAiResp.count || 0,
          skipped: skippedResp.count || 0,
          noVolume: noVolumeResp.count || 0,
          errors: errorResp.count || 0,
          pending: pendingResp.count || 0,
          catalogRows: catalogResp.count || 0,
          lastProcessedAt: lastProcessedResp.data?.last_trend_check_at || null,
        });
      } catch (err) {
        console.error('Erro ao carregar resumo de incidência:', err);
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os contadores.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [refreshTrigger]);

  const coverage = useMemo(() => {
    if (stats.totalTopics === 0) return 0;
    return Math.round((stats.withVolume / stats.totalTopics) * 100);
  }, [stats.totalTopics, stats.withVolume]);

  const lastProcessedLabel = stats.lastProcessedAt
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(stats.lastProcessedAt))
    : 'Ainda não executado';

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return 'Sem data';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getMapStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      nao_iniciado: { label: 'Não iniciado', className: 'border-slate-300 text-slate-600 bg-slate-50' },
      em_fila: { label: 'Em fila', className: 'border-sky-300 text-sky-700 bg-sky-50' },
      processando: { label: 'Processando', className: 'border-blue-300 text-blue-700 bg-blue-50' },
      concluido: { label: 'Concluído', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
      concluido_parcial: { label: 'Parcial', className: 'border-amber-300 text-amber-700 bg-amber-50' },
      erro: { label: 'Erro', className: 'border-red-300 text-red-700 bg-red-50' },
    };
    const config = statusConfig[status] || statusConfig.nao_iniciado;

    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-5 text-content-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando painel operacional...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="flex items-center gap-3 p-5 text-red-600">
          <XCircle className="h-4 w-4" />
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/15 bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/25 text-primary">
                Painel real
              </Badge>
              <Badge variant="outline" className="border-sky-500/25 text-sky-500">
                {stats.catalogRows.toLocaleString('pt-BR')} registros no catálogo
              </Badge>
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground">Incidência dos tópicos</h2>
            <p className="mt-1 max-w-3xl text-sm text-content-muted">
              Controle de cobertura da base: o sistema reaproveita catálogo quando possível e usa IA apenas para o que ainda falta.
            </p>
          </div>
          <div className="grid min-w-[240px] gap-2 text-sm">
            <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-content-muted">Último processamento</p>
              <p className="mt-1 font-bold text-foreground">{lastProcessedLabel}</p>
            </div>
            <div className="rounded-xl border border-dashed border-border bg-background/25 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-content-muted">Próximo automático</p>
              <p className="mt-1 font-bold text-content-muted">Cron ainda não configurado</p>
            </div>
          </div>
          <div className="min-w-[180px] rounded-xl border border-primary/20 bg-primary/10 p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">Cobertura analisada</p>
            <p className="mt-1 text-3xl font-black text-foreground tabular-nums">{coverage}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-primary" style={{ width: `${coverage}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Tópicos ativos" value={stats.totalTopics} detail="Base que pode ser analisada." tone="bg-slate-500/10 text-slate-500" icon={Database} />
        <StatTile label="Com sinal" value={stats.withVolume} detail="Busca encontrou volume bruto maior que zero." tone="bg-emerald-500/10 text-emerald-500" icon={CheckCircle2} />
        <StatTile label="Sem sinal" value={stats.withoutVolume} detail="Ainda sem sinal bruto útil." tone="bg-amber-500/10 text-amber-500" icon={AlertTriangle} />
        <StatTile label="Aguardando" value={stats.pending} detail="Candidatos ao próximo processamento." tone="bg-sky-500/10 text-sky-500" icon={Clock} />
        <StatTile label="Via catálogo" value={stats.fromCatalog} detail="Preenchidos sem gastar IA." tone="bg-cyan-500/10 text-cyan-500" icon={Sparkles} />
        <StatTile label="Com sinal via busca" value={stats.withVolumeFromAi} detail="Gerados pelo motor de busca ou pela IA." tone="bg-violet-500/10 text-violet-500" icon={Bot} />
        <StatTile label="Busca sem sinal" value={stats.noVolume} detail="Busca rodou, mas não encontrou volume útil." tone="bg-orange-500/10 text-orange-500" icon={AlertTriangle} />
        <StatTile label="Análises por busca" value={stats.fromAi} detail="Total processado fora do catálogo, com ou sem sinal." tone="bg-fuchsia-500/10 text-fuchsia-500" icon={Bot} />
        <StatTile label="Pulados" value={stats.skipped} detail="Rejeitados como inválidos." tone="bg-stone-500/10 text-stone-500" icon={AlertTriangle} />
        <StatTile label="Com erro" value={stats.errors} detail="Precisam de nova tentativa." tone="bg-red-500/10 text-red-500" icon={XCircle} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Mapas por edital</h3>
            <p className="mt-1 text-xs text-content-muted">
              Controle operacional do processamento por edital. O aluno vê apenas o sinal no tópico.
            </p>
          </div>
          <Badge variant="outline" className="w-fit text-xs">
            {maps.length.toLocaleString('pt-BR')} mapa(s)
          </Badge>
        </div>

        {mapsNotice ? (
          <div className="rounded-lg border border-dashed border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-700">
            {mapsNotice}
          </div>
        ) : maps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/40 p-4 text-sm text-content-muted">
            Nenhum mapa de cobrança iniciado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[11px] uppercase tracking-wider text-content-muted">
                  <th className="py-2 pr-3 font-black">Edital</th>
                  <th className="px-3 py-2 font-black">Status</th>
                  <th className="px-3 py-2 font-black">Cobertura</th>
                  <th className="px-3 py-2 font-black">Origem</th>
                  <th className="px-3 py-2 font-black">Pendências</th>
                  <th className="py-2 pl-3 font-black text-right">Último processamento</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {maps.map((map) => {
                  const coverage = map.totalTopics > 0
                    ? Math.round((map.withSignalCount / map.totalTopics) * 100)
                    : 0;

                  return (
                    <tr key={map.id}>
                      <td className="py-3 pr-3 align-top">
                        <p className="font-bold text-foreground">{map.editalName}</p>
                        <p className="mt-0.5 text-xs text-content-muted">{map.examBoard || 'Sem banca informada'}</p>
                      </td>
                      <td className="px-3 py-3 align-top">{getMapStatusBadge(map.status)}</td>
                      <td className="px-3 py-3 align-top">
                        <p className="font-bold tabular-nums text-foreground">
                          {map.withSignalCount}/{map.totalTopics} com sinal
                        </p>
                        <div className="mt-2 h-1.5 min-w-[110px] overflow-hidden rounded-full bg-background">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${coverage}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-content-muted">
                        <p>Catálogo: <span className="font-bold text-foreground">{map.catalogCount}</span></p>
                        <p>IA: <span className="font-bold text-foreground">{map.aiCount}</span></p>
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-content-muted">
                        <p>Pendentes: <span className="font-bold text-foreground">{map.pendingCount}</span></p>
                        <p>Sem sinal: <span className="font-bold text-foreground">{map.noSignalCount}</span></p>
                        <p>Erros: <span className="font-bold text-red-600">{map.errorCount}</span></p>
                      </td>
                      <td className="py-3 pl-3 text-right align-top text-xs text-content-muted">
                        {formatShortDate(map.lastProcessedAt || map.completedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
