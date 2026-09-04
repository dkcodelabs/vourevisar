import { differenceInMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ErrorLogRecord, ErrorSeverity, ErrorStatus } from '@/lib/errors/types';

export const calculateSystemErrorUsageMetrics = (errors: ErrorLogRecord[]) => {
    if (errors.length === 0) return { topModule: null, mttr: null, criticalCount: 0, highRecurrenceCount: 0 };

    const moduleCounts: Record<string, number> = {};
    let totalResolutionTimeMinutes = 0;
    let resolvedCount = 0;
    let criticalCount = 0;
    let highRecurrenceCount = 0;

    errors.forEach(error => {
        moduleCounts[error.module] = (moduleCounts[error.module] || 0) + 1;
        if (error.severity === 'critical' && error.status !== 'resolved') criticalCount++;
        if (error.occurrence_count > 5 && error.status !== 'resolved') highRecurrenceCount++;
        if (error.status === 'resolved' && error.updated_at) {
            totalResolutionTimeMinutes += differenceInMinutes(new Date(error.updated_at), new Date(error.created_at));
            resolvedCount++;
        }
    });

    const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const mttr = resolvedCount > 0 ? Math.round(totalResolutionTimeMinutes / resolvedCount) : 0;
    return { topModule, mttr, criticalCount, highRecurrenceCount };
};

export const getSystemErrorPlaybook = (error: ErrorLogRecord) => {
    let title = 'Investigação Geral';
    let steps = ['Verificar logs detalhados', 'Tentar reproduzir o erro'];
    let color = 'bg-slate-50 border-slate-200 text-slate-700';

    switch (error.category) {
        case 'auth':
        case 'permission':
            title = 'Problema de Autenticação / Segurança';
            steps = ['Verificar se o token de sessão é válido', 'Checar políticas RLS da tabela', 'Confirmar permissões (role) do usuário'];
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

    if (error.recommended_action) steps.unshift(error.recommended_action);
    return { title, steps, color };
};

export const getSystemErrorSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
        case 'critical': return 'bg-red-500 hover:bg-red-600';
        case 'high': return 'bg-orange-500 hover:bg-orange-600';
        case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
        case 'low': return 'bg-blue-500 hover:bg-blue-600';
        default: return 'bg-gray-500';
    }
};

export const getSystemErrorStatusLabel = (status: ErrorStatus) => ({
    new: 'Novo',
    investigating: 'Investigando',
    resolved: 'Resolvido',
    ignored: 'Ignorado',
}[status]);

export const getSystemErrorScopeClassName = (scope: string) => ({
    admin: 'bg-slate-100 text-slate-700 border-slate-200',
    core: 'bg-blue-50 text-blue-700 border-blue-200',
}[scope] || '');

export const formatSystemErrorDate = (dateString: string) => {
    try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
        return dateString;
    }
};
