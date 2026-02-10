import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ErrorLogRecord, ErrorSeverity, ErrorStatus, SLOMetrics, AlertEvent } from '@/lib/errors/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    AlertCircle,
    Activity,
    BarChart2,
    CheckCircle2,
    Clock,
    Search,
    RefreshCw,
    Eye,
    XCircle,
    Filter,
    AlertTriangle,
    Trash2,
    Server
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from '@/lib/toast';

export default function SystemErrors() {
    const [errors, setErrors] = useState<ErrorLogRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        severity: 'all',
        scope: 'all',
        category: 'all',
        recoverability: 'all',
        search: '',
        environment: 'production',
    });
    const [selectedError, setSelectedError] = useState<ErrorLogRecord | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // SLO & Alert States
    // SLO & Alert States
    const [sloMetrics, setSloMetrics] = useState<SLOMetrics | null>(null);
    const [activeAlerts, setActiveAlerts] = useState<AlertEvent[]>([]);

    // Batch Actions State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setSelectedIds(new Set());
    }, [filters]);

    const toggleSelectAll = () => {
        if (selectedIds.size === errors.length && errors.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(errors.map(e => e.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const executeBatchAction = async (action: 'resolve' | 'investigate' | 'ignore') => {
        if (!window.confirm(`Aplicar ação "${action}" em ${selectedIds.size} itens?`)) return;

        let newStatus: ErrorStatus = 'new'; // default
        if (action === 'resolve') newStatus = 'resolved';
        if (action === 'investigate') newStatus = 'investigating';
        if (action === 'ignore') newStatus = 'ignored';

        const ids = Array.from(selectedIds);

        const { error } = await supabase
            .from('admin_error_events')
            .update({ status: newStatus })
            .in('id', ids);

        if (error) {
            toast.error("Falha na ação em lote.");
        } else {
            toast.success(`${ids.length} itens atualizados para ${newStatus}.`);
            setSelectedIds(new Set());
            fetchErrors();
        }
    };

    const fetchOperationalData = React.useCallback(async () => {
        // Fetch SLO Metrics
        const { data: sloData } = await supabase.rpc('calculate_slo_metrics', { p_days_window: 7 });
        if (sloData) setSloMetrics(sloData as unknown as SLOMetrics);

        // Fetch Active Alerts (check for new ones first)
        await supabase.rpc('check_error_alerts'); // Trigger check
        const { data: alertsData } = await supabase
            .from('admin_alert_events')
            .select('*')
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (alertsData) setActiveAlerts(alertsData as unknown as AlertEvent[]);
    }, []);

    // Derived Metrics
    const usageMetrics = React.useMemo(() => {
        if (errors.length === 0) return { topModule: null, mttr: null, criticalCount: 0, highRecurrenceCount: 0 };

        const moduleCounts: Record<string, number> = {};
        let totalResolutionTimeMinutes = 0;
        let resolvedCount = 0;
        let criticalCount = 0;
        let highRecurrenceCount = 0;

        errors.forEach(err => {
            moduleCounts[err.module] = (moduleCounts[err.module] || 0) + 1;

            if (err.severity === 'critical' && err.status !== 'resolved') {
                criticalCount++;
            }

            if (err.occurrence_count > 5 && err.status !== 'resolved') {
                highRecurrenceCount++;
            }

            if (err.status === 'resolved' && err.updated_at) {
                const diff = differenceInMinutes(new Date(err.updated_at), new Date(err.created_at));
                totalResolutionTimeMinutes += diff;
                resolvedCount++;
            }
        });

        const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const mttr = resolvedCount > 0 ? Math.round(totalResolutionTimeMinutes / resolvedCount) : 0;

        return { topModule, mttr, criticalCount, highRecurrenceCount };
    }, [errors]);

    const getPlaybook = (error: ErrorLogRecord) => {
        let title = 'Investigação Geral';
        let steps = ['Verificar logs detalhados', 'Tentar reproduzir o erro'];
        let color = 'bg-slate-50 border-slate-200 text-slate-700';

        switch (error.category) {
            case 'auth':
            case 'permission':
                title = 'Problema de Acesso / Segurança';
                steps = ['Verificar se o token de sessão é válido', 'Checar políticas RLS da tabela', 'Confirmar role do usuário'];
                color = 'bg-red-50 border-red-200 text-red-800';
                break;
            case 'validation':
                title = 'Erro de Validação de Dados';
                steps = ['Verificar payload enviado pelo cliente', 'Validar tipos e obrigatoriedade de campos', 'Reproduzir com JSON mínimo'];
                color = 'bg-orange-50 border-orange-200 text-orange-800';
                break;
            case 'network':
            case 'integration':
                title = 'Conectividade e Integração';
                steps = ['Testar conectividade com serviços externos', 'Verificar status do Supabase', 'Avaliar latência de rede'];
                color = 'bg-blue-50 border-blue-200 text-blue-800';
                break;
            case 'database':
                title = 'Integridade de Dados / SQL';
                steps = ['Verificar performance da query', 'Checar constraints e chaves estrangeiras', 'Analisar locks no banco'];
                color = 'bg-purple-50 border-purple-200 text-purple-800';
                break;
        }

        if (error.recommended_action) {
            steps.unshift(error.recommended_action);
        }

        return { title, steps, color };
    };

    const handleCleanupLogs = async () => {
        if (!window.confirm("Isso apagará logs com mais de 30 dias. Confirmar?")) return;

        try {
            const { data, error } = await supabase.rpc('cleanup_error_logs', { p_days_retention: 30 });
            if (error) throw error;
            toast.success(`${data} logs antigos removidos.`);
            fetchErrors();
        } catch (err) {
            toast.error("Erro ao limpar logs.");
            console.error(err);
        }
    };

    const fetchErrors = React.useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('admin_error_events')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Pagination in next phase

        if (filters.status !== 'all') {
            if (filters.status === 'active') {
                query = query.neq('status', 'resolved');
            } else {
                query = query.eq('status', filters.status);
            }
        }

        if (filters.severity !== 'all') {
            query = query.eq('severity', filters.severity);
        }

        if (filters.scope !== 'all') {
            query = query.eq('scope', filters.scope);
        }

        if (filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }

        if (filters.recoverability !== 'all') {
            query = query.eq('recoverability', filters.recoverability);
        }

        if (filters.search) {
            query = query.or(`error_id.ilike.%${filters.search}%,user_message.ilike.%${filters.search}%,technical_message.ilike.%${filters.search}%`);
        }

        if (filters.environment !== 'all') {
            query = query.eq('environment', filters.environment);
        }

        const { data, error } = await query;

        if (error) {
            toast.error('Erro ao carregar logs de erro');
            console.error(error);
        } else {
            setErrors(data as ErrorLogRecord[]);
        }
        setLoading(false);
    }, [filters]);

    useEffect(() => {
        fetchErrors();
        fetchOperationalData();
    }, [fetchErrors, fetchOperationalData]);

    const updateStatus = async (id: string, newStatus: ErrorStatus) => {
        const { error } = await supabase
            .from('admin_error_events')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            toast.error('Erro ao atualizar status');
        } else {
            toast.success(`Status atualizado para ${newStatus}`);
            fetchErrors();
            if (selectedError && selectedError.id === id) {
                setSelectedError({ ...selectedError, status: newStatus });
            }
        }
    };

    const getSeverityColor = (severity: ErrorSeverity) => {
        switch (severity) {
            case 'critical': return 'bg-red-500 hover:bg-red-600';
            case 'high': return 'bg-orange-500 hover:bg-orange-600';
            case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
            case 'low': return 'bg-blue-500 hover:bg-blue-600';
            default: return 'bg-gray-500';
        }
    };

    const getStatusBadge = (status: ErrorStatus) => {
        switch (status) {
            case 'new': return <Badge variant="destructive">Novo</Badge>;
            case 'investigating': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Investigando</Badge>;
            case 'resolved': return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Resolvido</Badge>;
            case 'ignored': return <Badge variant="outline">Ignorado</Badge>;
            default: return null;
        }
    };

    const getScopeBadge = (scope: string) => {
        switch (scope) {
            case 'admin': return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Admin</Badge>;
            case 'core': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Core</Badge>;
            default: return <Badge variant="outline">{scope}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Erros do Sistema</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Monitore falhas técnicas e acompanhe a resolução de incidentes.
                    </p>
                </div>
                <Button onClick={fetchErrors} variant="outline" size="sm" className="gap-2">
                    <RefreshCw size={16} />
                    Atualizar
                </Button>
                <Button onClick={handleCleanupLogs} variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-700">
                    <Trash2 size={16} />
                    Limpar Antigos
                </Button>
            </div>

            {/* Alertas Ativos (Banner) */}
            {activeAlerts.length > 0 && (
                <div className="space-y-2">
                    {activeAlerts.map(alert => (
                        <div key={alert.id} className="bg-red-100 border-l-4 border-red-500 text-red-900 p-4 rounded shadow-sm flex justify-between items-center animate-pulse-slow">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="font-bold text-sm uppercase tracking-wide">{alert.alert_type.replace('_', ' ')}</p>
                                    <p className="text-sm">{alert.message}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white/50 hover:bg-white border-red-200 text-red-800"
                                onClick={async () => {
                                    await supabase.from('admin_alert_events').update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() }).eq('id', alert.id);
                                    fetchOperationalData();
                                    toast.success('Alerta reconhecido.');
                                }}
                            >
                                Acknowledge
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* SLO Dashboard */}
            {sloMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="pt-4 pb-4 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SLO: CRITICAL ({'<'}4h)</p>
                                <div className={`text-2xl font-bold mt-1 ${sloMetrics.critical_within_4h_pct >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                                    {sloMetrics.critical_within_4h_pct}%
                                </div>
                                <p className="text-[10px] text-slate-400">Meta: 90%</p>
                            </div>
                            <Activity className={sloMetrics.critical_within_4h_pct >= 90 ? 'text-green-200' : 'text-red-200'} />
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="pt-4 pb-4 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SLO: HIGH ({'<'}24h)</p>
                                <div className={`text-2xl font-bold mt-1 ${sloMetrics.high_within_24h_pct >= 85 ? 'text-green-600' : 'text-red-600'}`}>
                                    {sloMetrics.high_within_24h_pct}%
                                </div>
                                <p className="text-[10px] text-slate-400">Meta: 85%</p>
                            </div>
                            <Clock className={sloMetrics.high_within_24h_pct >= 85 ? 'text-green-200' : 'text-red-200'} />
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                        <CardContent className="pt-4 pb-4 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TAXA DE RECORRÊNCIA</p>
                                <div className={`text-2xl font-bold mt-1 ${sloMetrics.recurrence_rate <= 15 ? 'text-green-600' : 'text-red-600'}`}>
                                    {sloMetrics.recurrence_rate}%
                                </div>
                                <p className="text-[10px] text-slate-400">Meta: {'<'}15%</p>
                            </div>
                            <RefreshCw className={sloMetrics.recurrence_rate <= 15 ? 'text-green-200' : 'text-red-200'} />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Métricas Principais */}
            {/* Alertas do Sistema */}
            {usageMetrics.criticalCount > 0 && (
                <div
                    onClick={() => {
                        setFilters(prev => ({ ...prev, severity: 'critical', status: 'all' }));
                    }}
                    className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-pulse-slow cursor-pointer hover:bg-red-100 transition-colors">
                    <AlertTriangle className="text-red-600 w-5 h-5 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-red-800">Atenção Necessária</h4>
                        <p className="text-sm text-red-700 mt-1">
                            Existem {usageMetrics.criticalCount} erros críticos recentes. Clique para filtrar.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-l-4 border-l-red-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Erros (24h)</p>
                                <div className="text-2xl font-bold mt-1 text-slate-900">
                                    {errors.filter(e => new Date(e.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000).length}
                                </div>
                            </div>
                            <Activity className="text-red-500 w-5 h-5 opacity-70" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Alta Recorrência</p>
                                <div className="text-2xl font-bold mt-1 text-slate-900">
                                    {usageMetrics.highRecurrenceCount}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">Erros repetidos &gt; 5x</p>
                            </div>
                            <AlertTriangle className="text-orange-500 w-5 h-5 opacity-70" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pendentes</p>
                                <div className="text-2xl font-bold mt-1 text-slate-900">
                                    {errors.filter(e => ['new', 'investigating'].includes(e.status)).length}
                                </div>
                            </div>
                            <Clock className="text-orange-500 w-5 h-5 opacity-70" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">% Resolvidos</p>
                                <div className="text-2xl font-bold mt-1 text-slate-900">
                                    {errors.length > 0
                                        ? Math.round((errors.filter(e => e.status === 'resolved').length / errors.length) * 100)
                                        : 0}%
                                </div>
                            </div>
                            <CheckCircle2 className="text-emerald-500 w-5 h-5 opacity-70" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Módulo Crítico</p>
                                <div className="text-lg font-bold mt-1 text-slate-900 truncate max-w-[150px]" title={usageMetrics.topModule || 'Nenhum'}>
                                    {usageMetrics.topModule || '-'}
                                </div>
                            </div>
                            <BarChart2 className="text-blue-500 w-5 h-5 opacity-70" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <CardTitle>Log de Incidentes</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                <Input
                                    placeholder="Buscar por ID ou mensagem..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="pl-9 w-full sm:w-[250px]"
                                />
                            </div>
                            <Select
                                value={filters.environment}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, environment: val }))}
                            >
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <Server size={14} />
                                        <SelectValue placeholder="Ambiente" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="production">Production</SelectItem>
                                    <SelectItem value="staging">Staging</SelectItem>
                                    <SelectItem value="development">Development</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.status}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} />
                                        <SelectValue placeholder="Status" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Status</SelectItem>
                                    <SelectItem value="new">Novos</SelectItem>
                                    <SelectItem value="investigating">Investigando</SelectItem>
                                    <SelectItem value="resolved">Resolvidos</SelectItem>
                                    <SelectItem value="ignored">Ignorados</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.severity}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, severity: val }))}
                            >
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} />
                                        <SelectValue placeholder="Severidade" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas Sever.</SelectItem>
                                    <SelectItem value="critical">Crítico</SelectItem>
                                    <SelectItem value="high">Alto</SelectItem>
                                    <SelectItem value="medium">Médio</SelectItem>
                                    <SelectItem value="low">Baixo</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.scope}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, scope: val }))}
                            >
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <Activity size={14} />
                                        <SelectValue placeholder="Escopo" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos Escopos</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="core">Core (Aluno)</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.category}
                                onValueChange={(val) => setFilters(prev => ({ ...prev, category: val }))}
                            >
                                <SelectTrigger className="w-full sm:w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} />
                                        <SelectValue placeholder="Categoria" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas Cat.</SelectItem>
                                    <SelectItem value="validation">Validação</SelectItem>
                                    <SelectItem value="auth">Auth/Perm</SelectItem>
                                    <SelectItem value="database">Banco</SelectItem>
                                    <SelectItem value="network">Rede</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px]">
                                        <Checkbox
                                            checked={errors.length > 0 && selectedIds.size === errors.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[140px]">Data/Hora</TableHead>
                                    <TableHead>Ambiente</TableHead>
                                    <TableHead>Error ID</TableHead>
                                    <TableHead>Ocorrências</TableHead>
                                    <TableHead>Ctg/Escopo</TableHead>
                                    <TableHead>Módulo/Ação</TableHead>
                                    <TableHead>Mensagem Usuário</TableHead>
                                    <TableHead>Severidade</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                            Carregando...
                                        </TableCell>
                                    </TableRow>
                                ) : errors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                            Nenhum erro encontrado com os filtros atuais.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    errors.map((error) => (
                                        <TableRow key={error.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.has(error.id)}
                                                    onCheckedChange={() => toggleSelectOne(error.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium text-xs">
                                                {formatDate(error.created_at)}
                                                <div className="text-[10px] text-slate-400">
                                                    {((new Date().getTime() - new Date(error.created_at).getTime()) / 60000).toFixed(0)} min atrás
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={
                                                    error.environment === 'production' ? 'border-red-200 text-red-700 bg-red-50' :
                                                        error.environment === 'staging' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                                                            'text-muted-foreground border-slate-200 bg-slate-50'
                                                }>
                                                    {error.environment || 'production'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{error.error_id}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 font-medium">
                                                    {error.occurrence_count > 1 && (
                                                        <Activity className="h-3 w-3 text-orange-500" />
                                                    )}
                                                    {error.occurrence_count}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{error.error_id}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {getScopeBadge(error.scope || 'admin')}
                                                    <span className="text-[10px] uppercase font-bold text-slate-500">{error.category || 'UNK'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="font-semibold">{error.module}</div>
                                                <div className="text-slate-500">{error.action}</div>
                                            </TableCell>
                                            <TableCell className="text-sm truncate max-w-[200px]" title={error.user_message}>
                                                {error.user_message}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getSeverityColor(error.severity)} text-white border-0`}>
                                                    {error.severity}
                                                </Badge>
                                                {error.recoverability === 'system_retryable' && (
                                                    <div className="text-[9px] text-center mt-0.5 text-slate-500">Retry Auto</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(error.status)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setSelectedError(error);
                                                        setIsDetailsOpen(true);
                                                    }}
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Detalhes do Erro
                            <Badge variant="outline" className="font-mono">{selectedError?.error_id}</Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Ocorrido em {selectedError ? formatDate(selectedError.created_at) : '-'}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedError && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Módulo</label>
                                    <p className="text-sm font-medium">{selectedError.module}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Escopo</label>
                                    <div>{getScopeBadge(selectedError.scope || 'admin')}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Ação</label>
                                    <p className="text-sm font-medium">{selectedError.action}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Severidade</label>
                                    <div>
                                        <Badge className={`${getSeverityColor(selectedError.severity)} text-white`}>
                                            {selectedError.severity}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Status Atual</label>
                                    <div className="flex gap-2">
                                        {getStatusBadge(selectedError.status)}
                                    </div>
                                </div>
                            </div>

                            {/* Auditoria de Classificação */}
                            <div className="bg-slate-50 p-3 rounded border border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-medium">Classificação Automática Correta?</span>
                                <div className="flex gap-2">
                                    <Button
                                        variant={selectedError.classification_feedback === true ? "default" : "outline"}
                                        size="sm"
                                        className={`h-7 px-2 ${selectedError.classification_feedback === true ? 'bg-green-600 text-white' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                                        onClick={async () => {
                                            await supabase.from('admin_error_events').update({ classification_feedback: true }).eq('id', selectedError.id);
                                            setSelectedError({ ...selectedError, classification_feedback: true });
                                            fetchErrors();
                                            toast.success('Feedback registrado: Correto');
                                        }}
                                    >
                                        <CheckCircle2 size={12} className="mr-1" /> Sim
                                    </Button>
                                    <Button
                                        variant={selectedError.classification_feedback === false ? "default" : "outline"}
                                        size="sm"
                                        className={`h-7 px-2 ${selectedError.classification_feedback === false ? 'bg-red-600 text-white' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
                                        onClick={async () => {
                                            await supabase.from('admin_error_events').update({ classification_feedback: false }).eq('id', selectedError.id);
                                            setSelectedError({ ...selectedError, classification_feedback: false });
                                            fetchErrors();
                                            toast.success('Feedback registrado: Incorreto');
                                        }}
                                    >
                                        <XCircle size={12} className="mr-1" /> Não
                                    </Button>
                                </div>
                            </div>

                            {/* Playbook Operacional */}
                            {(() => {
                                const playbook = getPlaybook(selectedError);
                                return (
                                    <div className={`p-4 rounded-md border ${playbook.color}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle2 size={16} />
                                            <h4 className="font-semibold text-sm uppercase tracking-wide">Playbook: {playbook.title}</h4>
                                        </div>
                                        <ul className="list-disc list-inside text-sm space-y-1 ml-1">
                                            {playbook.steps.map((step, i) => (
                                                <li key={i}>{step}</li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })()}

                            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800">
                                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Mensagem Técnica</label>
                                <code className="text-xs text-red-600 dark:text-red-400 break-words whitespace-pre-wrap font-mono">
                                    {selectedError.technical_message}
                                </code>
                            </div>

                            {selectedError.metadata && Object.keys(selectedError.metadata).length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Metadata</label>
                                    <pre className="bg-slate-950 text-slate-50 p-3 rounded text-xs overflow-auto max-h-[200px]">
                                        {JSON.stringify(selectedError.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}

                            <div className="pt-4 border-t flex justify-end gap-2">
                                {selectedError.status !== 'resolved' && (
                                    <Button
                                        onClick={() => {
                                            updateStatus(selectedError.id, 'resolved');
                                            setIsDetailsOpen(false);
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <CheckCircle2 size={16} className="mr-2" />
                                        Marcar como Resolvido
                                    </Button>
                                )}
                                {selectedError.status !== 'investigating' && selectedError.status !== 'resolved' && (
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            updateStatus(selectedError.id, 'investigating');
                                        }}
                                    >
                                        <Search size={16} className="mr-2" />
                                        Investigar
                                    </Button>
                                )}
                                {selectedError.status !== 'ignored' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            updateStatus(selectedError.id, 'ignored');
                                            setIsDetailsOpen(false);
                                        }}
                                    >
                                        Ignorar
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog >

            {/* Floating Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
                    <span className="text-sm font-medium">{selectedIds.size} selecionados</span>
                    <div className="h-4 w-px bg-slate-700" />
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300 hover:bg-slate-800"
                        onClick={() => executeBatchAction('resolve')}
                    >
                        <CheckCircle2 size={16} className="mr-2" /> Resolver
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-yellow-400 hover:text-yellow-300 hover:bg-slate-800"
                        onClick={() => executeBatchAction('investigate')}
                    >
                        <Search size={16} className="mr-2" /> Investigar
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-slate-300 hover:bg-slate-800"
                        onClick={() => executeBatchAction('ignore')}
                    >
                        Ignorar
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 text-slate-500 hover:text-white"
                        onClick={() => setSelectedIds(new Set())}
                    >
                        <XCircle size={16} />
                    </Button>
                </div>
            )}
        </div >
    );
}
