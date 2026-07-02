import {
    ErrorCategory,
    ErrorRecoverability,
    ErrorReportInput,
    ErrorSeverity
} from './errorEvent.contract';
import { getConnectionErrorMessage, isConnectionError } from './networkError';

interface ClassificationResult {
    severity: ErrorSeverity;
    category: ErrorCategory;
    recoverability: ErrorRecoverability;
    isUserVisible: boolean;
    recommendedAction: string;
    userMessage?: string;
}

function getErrorDetails(error: unknown): { code?: string; status?: string | number; message?: string } {
    if (!error || typeof error !== 'object') return {};
    const candidate = error as Record<string, unknown>;
    return {
        code: typeof candidate.code === 'string' ? candidate.code : undefined,
        status: typeof candidate.status === 'string' || typeof candidate.status === 'number' ? candidate.status : undefined,
        message: typeof candidate.message === 'string' ? candidate.message : undefined,
    };
}

export function classifyError(input: ErrorReportInput): ClassificationResult {
    // 1. Extrair código e mensagem técnica para análise
    const error = input.originalError;
    const details = getErrorDetails(error);
    const code = input.errorCode || details.code || details.status?.toString() || 'UNKNOWN';
    const technicalMessage = (input.technicalMessage || details.message || '').toLowerCase();

    // 2. Default: Unknown / Medium / Non-retryable
    const result: ClassificationResult = {
        severity: input.severity || 'medium',
        category: input.category || 'unknown',
        recoverability: input.recoverability || 'non_retryable',
        isUserVisible: true,
        recommendedAction: 'Investigar ocorrência e logs detalhados.'
    };

    // 3. Regras de Classificação

    // Auth & Permission (401, 403, JWT, RLS)
    if (['401', '403', 'PGRST301', 'JWT_EXPIRED'].includes(code) || technicalMessage.includes('unauthorized') || technicalMessage.includes('permission denied')) {
        result.severity = 'high';
        result.category = 'auth';
        result.recoverability = 'user_retryable'; // Login again might fix it
        result.recommendedAction = 'Verificar sessão do usuário e permissões (RLS/Roles).';
        result.userMessage = 'Sessão expirada ou sem permissão. Tente fazer login novamente.';
    }

    // Validation (400, 422, Zod, Form)
    else if (['400', '422', '23505', '23503'].includes(code) || technicalMessage.includes('validation') || technicalMessage.includes('zod')) {
        result.severity = ['low', 'medium'].includes(input.severity || '') ? input.severity as ErrorSeverity : 'medium';
        result.category = 'validation';
        result.recoverability = 'user_retryable';
        result.recommendedAction = 'Verificar payload enviado pelo cliente. Reproduzir com dados mínimos.';
        if (!input.userMessage) result.userMessage = 'Verifique os dados informados e tente novamente.';
    }

    // Network & Timeout (503, 504, fetch failed, CORS aborted)
    else if (
        ['503', '504', '0'].includes(code) || 
        isConnectionError(error) ||
        technicalMessage.includes('fetch failed') || 
        technicalMessage.includes('network') || 
        technicalMessage.includes('timeout') ||
        technicalMessage.includes('cors') ||
        technicalMessage.includes('failed to fetch')
    ) {
        result.severity = 'medium'; // Baixado de high para medium se for conexao transient
        result.category = 'network';
        result.recoverability = 'system_retryable';
        result.recommendedAction = 'Verificar conectividade. Se persistir, validar configuração de CORS no Supabase.';
        if (!input.userMessage) result.userMessage = getConnectionErrorMessage(error);
    }

    // Database & System (500, PGRST*, Postgrest)
    else if (code.startsWith('5') || code.startsWith('PGRST') || technicalMessage.includes('database') || technicalMessage.includes('sql')) {
        result.severity = 'critical';
        result.category = 'database';
        result.recoverability = 'system_retryable';
        result.recommendedAction = 'Verificar saúde do banco de dados, locks e performance das queries.';
        if (!input.userMessage) result.userMessage = 'Erro interno no sistema. Nossa equipe já foi notificada.';
    }

    // Sobreescritas manuais do input têm precedência (se fornecidas explicitamente)
    if (input.category) result.category = input.category;
    if (input.recoverability) result.recoverability = input.recoverability;
    if (input.severity) result.severity = input.severity;

    return result;
}
