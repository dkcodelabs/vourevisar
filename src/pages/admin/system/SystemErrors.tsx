import React, { useEffect, useState, useMemo } from 'react';
import { acknowledgeAdminAlert, fetchAdminErrors, updateAdminErrorClassification, updateAdminErrorStatus } from '@/services/adminSystemErrorsService';
import { ErrorLogRecord, ErrorStatus, SLOMetrics, AlertEvent } from '@/lib/errors/types';
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
import { invokeAdminRpc } from '@/services/adminRpcService';
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
    Server,
    X,
    MapPin,
    User,
    Globe,
    ArrowLeft
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
    calculateSystemErrorUsageMetrics,
    formatSystemErrorDate,
    getSystemErrorPlaybook,
    getSystemErrorScopeClassName,
    getSystemErrorSeverityColor,
    getSystemErrorStatusLabel,
} from '@/utils/systemErrorsPresentation';
import { useSystemErrorsFilters } from '@/hooks/useSystemErrorsFilters';
import { useSystemErrorsSelection } from '@/hooks/useSystemErrorsSelection';
import { useSystemErrorsOperations } from '@/hooks/useSystemErrorsOperations';
import { SystemErrorDetailsDialog } from '@/components/admin/system/SystemErrorDetailsDialog';

export default function SystemErrors() {
    const navigate = useNavigate();
    const [errors, setErrors] = useState<ErrorLogRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const { activeFilters, clearFilters, filters, removeFilter, setFilters } = useSystemErrorsFilters();
    const [selectedError, setSelectedError] = useState<ErrorLogRecord | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const { selectedIds, setSelectedIds, toggleSelectAll, toggleSelectOne } = useSystemErrorsSelection(errors, filters);


    const usageMetrics = React.useMemo(() => calculateSystemErrorUsageMetrics(errors), [errors]);
    const getPlaybook = getSystemErrorPlaybook;

    const handleCleanupLogs = async () => {
        if (!window.confirm("Isso apagará logs com mais de 30 dias. Confirmar?")) return;

        try {
            const data = await invokeAdminRpc<number>('cleanup_error_logs', { p_days_retention: 30 });
            toast.success(`${data} logs antigos removidos.`);
            fetchErrors();
        } catch (err: unknown) {
            toastGate.notifyError("Erro ao limpar logs.", "SYS-CLEAN-ERR", { severity: 'medium', flowKey: 'sys-cleanup' });
            console.error(err);
        }
    };

    const fetchErrors = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAdminErrors(filters);
            setErrors(data);
        } catch (error) {
            toastGate.notifyError('Erro ao carregar logs de erro', 'SYS-FETCH-ERR', { severity: 'medium', flowKey: 'sys-fetch' });
            console.error(error);
        }
        setLoading(false);
    }, [filters]);

    const { activeAlerts, executeBatchAction, fetchOperationalData, sloMetrics } = useSystemErrorsOperations({
        clearSelection: () => setSelectedIds(new Set()),
        fetchErrors: () => { void fetchErrors(); },
        selectedIds,
    });

    useEffect(() => {
        fetchErrors();
        fetchOperationalData();
    }, [fetchErrors, fetchOperationalData]);

    const updateStatus = async (id: string, newStatus: ErrorStatus) => {
        let updated = false;
        try {
            await updateAdminErrorStatus([id], newStatus);
            updated = true;
        } catch {
            toastGate.notifyError('Erro ao atualizar status', 'SYS-UPDATE-ERR', { severity: 'low', flowKey: 'sys-update' });
        }
        if (updated) {
            toast.success(`Status atualizado para ${newStatus}`);
            fetchErrors();
            if (selectedError && selectedError.id === id) {
                setSelectedError({ ...selectedError, status: newStatus });
            }
        }
    };

    const getStatusBadge = (status: ErrorStatus) => {
        const label = getSystemErrorStatusLabel(status);
        if (status === 'new') return <Badge variant="destructive">{label}</Badge>;
        if (status === 'investigating') return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">{label}</Badge>;
        if (status === 'resolved') return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">{label}</Badge>;
        return <Badge variant="outline">{label}</Badge>;
    };

    if (loading) {
        return <div className="flex min-h-[55vh] items-center justify-center"><LoadingSpinner size="large" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="h-8 w-8 hover:bg-slate-100"
                    title="Voltar"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-500" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Erros do Sistema</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Monitore falhas técnicas e acompanhe a resolução de incidentes.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
                <Button onClick={fetchErrors} variant="outline" size="sm" className="gap-2">
                    <RefreshCw size={16} />
                    Atualizar
                </Button>
                <Button onClick={handleCleanupLogs} variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-700">
                    <Trash2 size={16} />
                    Limpar Antigos
                </Button>
            </div>

            {/* Active Filters Bar */}
            {(activeFilters.length > 0 || filters.search) && (
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-md border border-slate-100 mb-4">
                    <span className="text-xs font-semibold text-slate-500 uppercase mr-2">Filtros Ativos:</span>

                    {filters.search && (
                        <Badge variant="secondary" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 pl-2 pr-1 py-1 gap-1">
                            <Search className="w-3 h-3 text-slate-400" />
                            "{filters.search}"
                            <button onClick={() => setFilters(prev => ({ ...prev, search: '' }))} className="ml-1 hover:text-red-500 rounded-full p-0.5"><X size={12} /></button>
                        </Badge>
                    )}

                    {activeFilters.map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 pl-2 pr-1 py-1 gap-1 capitalize">
                            <span className="text-slate-400 text-[10px] uppercase mr-1">{key}:</span>
                            {value}
                            <button onClick={() => removeFilter(key)} className="ml-1 hover:text-red-500 rounded-full p-0.5"><X size={12} /></button>
                        </Badge>
                    ))}

                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto">
                        Limpar Todos
                    </Button>
                </div>
            )}

            {/* Alertas Ativos (Banner) */}
            {activeAlerts.length > 0 && (
                <div className="space-y-2">
                    {activeAlerts.map(alert => (
                        <div key={alert.id} className="bg-red-100 border-l-4 border-red-500 text-red-900 p-4 rounded shadow-sm flex justify-between items-center animate-pulse-slow">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <div>
                                    <p className="font-bold text-sm uppercase tracking-wide">
                                        {alert.alert_type === 'critical_spike' ? 'PICO CRÍTICO' : 
                                         alert.alert_type === 'high_error_rate' ? 'ALTA TAXA DE ERROS' :
                                         alert.alert_type === 'slo_violation' ? 'VIOLAÇÃO DE META (SLO)' :
                                         alert.alert_type.replace('_', ' ').toUpperCase()}
                                    </p>
                                    <p className="text-sm">{alert.message}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white/50 hover:bg-white border-red-200 text-red-800"
                                onClick={async () => {
                                    await acknowledgeAdminAlert(alert.id);
                                    fetchOperationalData();
                                    toast.success('Alerta reconhecido.');
                                }}
                            >
                                Reconhecer
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* SLO Dashboard */}
            {sloMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="p-3 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">META: CRÍTICO ({'<'}4h)</p>
                                <div className={`text-xl font-bold mt-0.5 ${sloMetrics.critical_within_4h_pct >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                                    {sloMetrics.critical_within_4h_pct}%
                                </div>
                                <p className="text-[9px] text-slate-400">Meta: 90%</p>
                            </div>
                            <Activity className={sloMetrics.critical_within_4h_pct >= 90 ? 'text-green-200' : 'text-red-200'} size={20} />
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="p-3 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">META: ALTO ({'<'}24h)</p>
                                <div className={`text-xl font-bold mt-0.5 ${sloMetrics.high_within_24h_pct >= 85 ? 'text-green-600' : 'text-red-600'}`}>
                                    {sloMetrics.high_within_24h_pct}%
                                </div>
                                <p className="text-[9px] text-slate-400">Meta: 85%</p>
                            </div>
                            <Clock className={sloMetrics.high_within_24h_pct >= 85 ? 'text-green-200' : 'text-red-200'} size={20} />
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="p-3 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">TAXA RECORRÊNCIA</p>
                                <div className={`text-xl font-bold mt-0.5 ${sloMetrics.recurrence_rate <= 15 ? 'text-green-600' : 'text-red-600'}`}>
                                    {sloMetrics.recurrence_rate}%
                                </div>
                                <p className="text-[9px] text-slate-400">Meta: {'<'}15%</p>
                            </div>
                            <RefreshCw className={sloMetrics.recurrence_rate <= 15 ? 'text-green-200' : 'text-red-200'} size={20} />
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Card className="bg-white border-l-4 border-l-red-500 shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Erros (24h)</p>
                                <div className="text-xl font-bold mt-2 text-slate-900">
                                    {errors.filter(e => new Date(e.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000).length}
                                </div>
                            </div>
                            <Activity className="text-red-500 w-4 h-4 opacity-70" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Alta Recorrência</p>
                                <div className="text-xl font-bold mt-2 text-slate-900">
                                    {usageMetrics.highRecurrenceCount}
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1">Repetidos {'>'} 5x</p>
                            </div>
                            <AlertTriangle className="text-orange-500 w-4 h-4 opacity-70" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-orange-500 shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Pendentes</p>
                                <div className="text-xl font-bold mt-2 text-slate-900">
                                    {errors.filter(e => ['new', 'investigating'].includes(e.status)).length}
                                </div>
                            </div>
                            <Clock className="text-orange-500 w-4 h-4 opacity-70" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-emerald-500 shadow-sm overflow-hidden">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">% Resolvidos</p>
                                <div className="text-xl font-bold mt-2 text-slate-900">
                                    {errors.length > 0
                                        ? Math.round((errors.filter(e => e.status === 'resolved').length / errors.length) * 100)
                                        : 0}%
                                </div>
                            </div>
                            <CheckCircle2 className="text-emerald-500 w-4 h-4 opacity-70" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm overflow-hidden col-span-2 md:col-span-1">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Módulo Crítico</p>
                                <div className="text-sm font-bold mt-2 text-slate-900 truncate max-w-[120px]" title={usageMetrics.topModule || 'Nenhum'}>
                                    {usageMetrics.topModule || '-'}
                                </div>
                            </div>
                            <BarChart2 className="text-blue-500 w-4 h-4 opacity-70" />
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
                                    <SelectItem value="production">Produção</SelectItem>
                                    <SelectItem value="staging">Homologação</SelectItem>
                                    <SelectItem value="development">Desenvolvimento</SelectItem>
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
                                    <SelectItem value="auth">Autenticação</SelectItem>
                                    <SelectItem value="database">Banco de Dados</SelectItem>
                                    <SelectItem value="network">Rede/Internet</SelectItem>
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
                                    <TableHead className="w-[120px]">Data/Hora</TableHead>
                                    <TableHead>Ambiente</TableHead>
                                    {/* <TableHead>Error ID</TableHead> Removed to save space */}
                                    <TableHead>Origem</TableHead>
                                    <TableHead>Módulo/Ação</TableHead>
                                    <TableHead>Contexto</TableHead>
                                    <TableHead>Mensagem Usuário</TableHead>
                                    <TableHead>Severidade</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {errors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="text-center py-8 text-slate-500">
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
                                                {formatSystemErrorDate(error.created_at)}
                                                <div className="text-[10px] text-slate-400">
                                                    {((new Date().getTime() - new Date(error.created_at).getTime()) / 60000).toFixed(0)} min atrás
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className={`w-fit text-[10px] ${error.environment === 'production' ? 'border-red-200 text-red-700 bg-red-50' :
                                                        error.environment === 'staging' ? 'border-yellow-200 text-yellow-700 bg-yellow-50' :
                                                            'text-muted-foreground border-slate-200 bg-slate-50'
                                                        }`}>
                                                        {error.environment === 'production' ? 'Produção' : 
                                                         error.environment === 'staging' ? 'Homologação' : 'Desenvol.'}
                                                    </Badge>
                                                    <span className="text-[10px] font-mono text-slate-400 truncate w-[60px]" title={error.error_id}>{error.error_id.substring(0, 6)}...</span>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-col max-w-[120px]">
                                                    {error.route_path ? (
                                                        <span className="text-xs font-medium truncate" title={error.route_path}>{error.route_path}</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    )}
                                                    {error.feature_area && <span className="text-[10px] text-slate-500">{error.feature_area}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="font-semibold">{error.module}</div>
                                                <div className="text-slate-500">{error.action}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {error.context_label ? (
                                                        <Badge variant="outline" className="text-[10px] bg-slate-50">{error.context_label}</Badge>
                                                    ) : (
                                                        <span className="text-xs text-slate-300">-</span>
                                                    )}
                                                    {error.actor_user_id && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                            <User size={10} />
                                                            <span title={error.actor_user_id}>User...{error.actor_user_id.substring(0, 4)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="truncate max-w-[200px]" title={error.user_message}>{error.user_message}</div>
                                                {error.occurrence_count > 1 && (
                                                    <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1 bg-orange-100 text-orange-700">
                                                        {error.occurrence_count}x
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                    <Badge className={`${getSystemErrorSeverityColor(error.severity)} text-white border-0 text-[10px] uppercase`}>
                                                    {error.severity === 'critical' ? 'Crítico' : 
                                                     error.severity === 'high' ? 'Alto' :
                                                     error.severity === 'medium' ? 'Médio' : 'Baixo'}
                                                </Badge>
                                                {error.recoverability === 'system_retryable' && (
                                                    <div className="text-[9px] text-center mt-0.5 text-slate-500">Auto-Retentativa</div>
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

            <SystemErrorDetailsDialog
                error={selectedError}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                formatDate={formatSystemErrorDate}
                severityColor={getSystemErrorSeverityColor}
                statusBadge={getStatusBadge}
                scopeClassName={getSystemErrorScopeClassName}
                getPlaybook={getPlaybook}
                onClassificationFeedback={async (correct) => {
                    if (!selectedError) return;
                    await updateAdminErrorClassification(selectedError.id, correct);
                    setSelectedError({ ...selectedError, classification_feedback: correct });
                    fetchErrors();
                    toast.success(`Feedback registrado: ${correct ? 'Correto' : 'Incorreto'}`);
                }}
                onStatusChange={(status) => {
                    if (!selectedError) return;
                    void updateStatus(selectedError.id, status);
                    if (status === 'resolved' || status === 'ignored') setIsDetailsOpen(false);
                }}
            />

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
