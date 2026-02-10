/**
 * CONTRATO DE EVENTO DE ERRO
 * 
 * Este arquivo define a estrutura canônica para eventos de erro no sistema.
 * Ele serve como a "source of truth" para o frontend e integrações.
 * 
 * NÃO ALTERE ESTE ARQUIVO SEM CONSENSO DO TIME DE ARQUITETURA.
 */

// 1. Tipos Básicos e Enums
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorScope = 'admin' | 'core';
export type ErrorStatus = 'new' | 'investigating' | 'resolved' | 'ignored';

// Novos Tipos de Taxonomia
export type ErrorCategory =
    | 'validation'
    | 'auth'
    | 'permission'
    | 'business_rule'
    | 'integration'
    | 'network'
    | 'database'
    | 'unknown';

export type ErrorRecoverability =
    | 'user_retryable'
    | 'system_retryable'
    | 'non_retryable';

// 2. Contrato do Payload de Erro (Estrutura Persistida/Normalizada)
// Segue snake_case para alinhar com o banco de dados (admin_error_events)
export interface ErrorEventPayload {
    error_id: string;
    scope: ErrorScope;
    module: string;
    action: string;
    severity: ErrorSeverity;
    user_message: string;
    technical_message: string; // Obrigatório no contrato final
    error_code?: string;
    http_status?: number;
    fingerprint?: string;
    actor_user_id?: string;
    actor_role?: string;
    target_user_id?: string;
    metadata: Record<string, unknown>; // Obrigatório, mesmo que vazio
    status: ErrorStatus; // Default 'new'
    first_seen_at?: string;
    last_seen_at?: string;
    occurrence_count?: number;
    created_at?: string;
    retryable?: boolean; // Mantido para compatibilidade (true se user_retryable)

    // Novos Campos Obrigatórios (Taxonomia)
    category: ErrorCategory; // Default 'unknown'
    recoverability: ErrorRecoverability; // Default 'non_retryable'
    is_user_visible: boolean; // Default true
    recommended_action?: string;
    fingerprint_version?: string; // Default 'v1'
    environment?: 'development' | 'staging' | 'production'; // Default 'production'

    // Novos Campos de Contexto (Phase 4.2-A)
    route_path?: string;
    feature_area?: string;
    actor_email?: string;
    target_email?: string;
    session_id?: string;
    request_id?: string;
    context_label?: string;
}

// 3. Contrato de Entrada do Serviço (Input do ErrorService.report)
// Permite campos opcionais e camelCase onde apropriado para DX
export interface ErrorReportInput {
    module: string;
    action: string;
    userMessage?: string; // Opcional, sistema pode gerar default
    technicalMessage?: string; // Opcional se passado o objeto error original
    errorCode?: string;
    severity?: ErrorSeverity; // Default: 'medium'
    scope?: ErrorScope; // Default: 'core'
    userId?: string;
    metadata?: Record<string, unknown>;
    showToast?: boolean; // Controle de UI
    originalError?: any; // O erro original para extração

    // Opcionais na entrada (o classificador irá preencher)
    category?: ErrorCategory;
    recoverability?: ErrorRecoverability;

    // Novos Campos Opcionais de Contexto
    routePath?: string;
    featureArea?: string;
    actorEmail?: string;
    targetUserId?: string;
    targetEmail?: string;
    sessionId?: string;
    requestId?: string;
    contextLabel?: string;
}

// 4. Validação Leve em Runtime
export interface ValidationResult {
    isValid: boolean;
    sanitizedInput: ErrorReportInput;
    errors: string[];
}

export function validateErrorPayload(input: ErrorReportInput): ValidationResult {
    const errors: string[] = [];
    const sanitizedInput = { ...input };

    // Default Scope
    if (!sanitizedInput.scope) {
        sanitizedInput.scope = 'core';
    }

    // Default Severity
    if (!sanitizedInput.severity) {
        sanitizedInput.severity = 'medium';
    }

    // Validação de Campos Obrigatórios
    if (!sanitizedInput.module) {
        errors.push('Campo "module" é obrigatório.');
        sanitizedInput.module = 'unknown_module';
    }

    if (!sanitizedInput.action) {
        errors.push('Campo "action" é obrigatório.');
        sanitizedInput.action = 'unknown_action';
    }

    // Validação de Enums
    const validSeverities: ErrorSeverity[] = ['low', 'medium', 'high', 'critical'];
    if (sanitizedInput.severity && !validSeverities.includes(sanitizedInput.severity)) {
        errors.push(`Severity inválida: ${sanitizedInput.severity}. Usando 'medium'.`);
        sanitizedInput.severity = 'medium';
    }

    const validScopes: ErrorScope[] = ['admin', 'core'];
    if (sanitizedInput.scope && !validScopes.includes(sanitizedInput.scope)) {
        errors.push(`Scope inválido: ${sanitizedInput.scope}. Usando 'core'.`);
        sanitizedInput.scope = 'core';
    }

    return {
        isValid: errors.length === 0,
        sanitizedInput,
        errors
    };
}
