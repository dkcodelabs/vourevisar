import { supabase } from '@/integrations/supabase/client';
import { toastGate } from './toastGate';
import { toast } from '@/lib/toast';
import {
    ErrorReportInput,
    ErrorEventPayload,
    validateErrorPayload,
    ErrorSeverity,
    ErrorScope
} from './errorEvent.contract';
import { AppErrorNormalized } from './types';
import { getFriendlyMessage } from './errorMessageMap';
import { classifyError } from './classifier';

const MAX_METADATA_SIZE = 4096;

class ErrorService {
    private static instance: ErrorService;
    private lastErrorSignature: string | null = null;
    private lastErrorTime: number = 0;
    private readonly DEDUPE_WINDOW_MS = 5000; // 5 seconds dedupe window

    private constructor() { }

    public static getInstance(): ErrorService {
        if (!ErrorService.instance) {
            ErrorService.instance = new ErrorService();
        }
        return ErrorService.instance;
    }

    private isIgnorableError(error: any): boolean {
        // AbortController cancellations
        if (error?.name === 'AbortError') return true;
        if (error?.code === 20) return true; // DOMException: AbortError
        if (error?.message?.includes('The user aborted a request')) return true;
        return false;
    }

    /**
     * Normaliza qualquer erro para um formato padrão
     */
    private normalizeError(
        input: ErrorReportInput
    ): AppErrorNormalized {
        const error = input.originalError;
        const errorId = `ERR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        // Extração de dados do erro
        const code = input.errorCode || error?.code || error?.status?.toString() || 'UNKNOWN';
        const technicalMessage = input.technicalMessage || error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
        const userMessage = input.userMessage || getFriendlyMessage(technicalMessage, code);

        // Classificação Inteligente
        const classification = classifyError(input);

        // Sanitização básica de metadata
        const sanitizedMetadata = this.sanitizeMetadata({ ...input.metadata });

        return {
            errorId,
            module: input.module,
            action: input.action,
            userMessage: classification.userMessage || userMessage,
            technicalMessage: technicalMessage.substring(0, 1000), // Truncate se muito longo
            code,
            severity: classification.severity,
            retryable: ['503', '504', 'NetworkError'].includes(code) || technicalMessage.includes('fetch'),
            actorUserId: input.userId,
            metadata: sanitizedMetadata,
            createdAt: new Date().toISOString(),
            scope: input.scope || 'core',

            // Novos Campos de Taxonomia
            category: classification.category,
            recoverability: classification.recoverability,
            isUserVisible: classification.isUserVisible,
            recommendedAction: classification.recommendedAction,
            fingerprintVersion: 'v1',
            environment: import.meta.env.MODE === 'production' ? 'production' : 'development',

            // Novos Campos de Contexto (Phase 4.2-A)
            route_path: input.routePath || window.location.pathname,
            feature_area: input.featureArea || input.module, // Default to module if not specified
            actor_email: input.actorEmail,
            targetUserId: input.targetUserId,
            target_email: input.targetEmail,
            session_id: input.sessionId,
            request_id: input.requestId,
            context_label: input.contextLabel
        };
    }

    private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
        const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'bearer'];
        const sanitized: Record<string, any> = {};

        for (const [key, value] of Object.entries(metadata)) {
            if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                try {
                    sanitized[key] = JSON.parse(JSON.stringify(value, (k, v) => {
                        if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) return '[REDACTED]';
                        return v;
                    }));
                } catch {
                    sanitized[key] = '[Complex Object]';
                }
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    /**
     * Reporta um erro: Loga no console (dev), Persiste no Banco e Retorna objeto normalizado
     */
    public async report(
        error: any,
        context: Omit<ErrorReportInput, 'originalError'>
    ): Promise<AppErrorNormalized> {
        // Construir input completo
        const rawInput: ErrorReportInput = {
            ...context,
            originalError: error
        };

        // 0. Noise Control (Ignorar erros inúteis)
        if (this.isIgnorableError(error)) {
            console.debug('[ErrorService] Erro ignorado (Noise Control):', error);
            // Retorna um erro "dummy" normalizado para não quebrar quem espera retorno, 
            // mas com status 'ignored' se precisássemos logar, ou apenas não persiste.
            // Para manter contrato, vamos retornar normalizado mas NÃO persistir.
            const ignored = this.normalizeError(rawInput);
            return { ...ignored, isUserVisible: false };
        }

        // Validação Leve (Contract Enforcement)
        const validation = validateErrorPayload(rawInput);
        if (!validation.isValid) {
            console.warn('[ErrorService] Payload inválido corrigido:', validation.errors);
        }

        // Usar input sanitizado pela validação
        const input = validation.sanitizedInput;

        // 1. Normalizar
        const normalized = this.normalizeError(input);

        // 2. Log no Console (apenas Dev ou se crítico)
        if (import.meta.env.DEV) {
            console.group(`[ErrorService] ${input.module}/${input.action}`);
            console.error(error);
            console.log('Normalized:', normalized);
            console.groupEnd();
        }

        // 3. Persistir no Supabase com Deduplicação Client-Side Simples
        // Evita spam de erros idênticos (mesmo módulo, ação e msg técnica) em curto período
        const signature = `${normalized.module}|${normalized.action}|${normalized.code}|${normalized.technicalMessage.slice(0, 50)}`;
        const now = Date.now();

        if (this.lastErrorSignature === signature && (now - this.lastErrorTime) < this.DEDUPE_WINDOW_MS) {
            console.info('[ErrorService] Erro duplicado suprimido do banco de dados (Client-side throttle).');
        } else {
            this.lastErrorSignature = signature;
            this.lastErrorTime = now;

            this.persistError(normalized).catch(err => {
                console.warn('Falha ao persistir log de erro:', err);
            });
        }

        // 4. Feedback Visual (Toast) - Agora via ToastGate (Anti-Spam)
        if (input.showToast !== false) { // Default true
            const flowKey = normalized.module || 'general';

            toastGate.notifyError(normalized.userMessage, normalized.errorId, {
                severity: normalized.severity,
                flowKey: flowKey,
                actionLabel: normalized.retryable ? 'Tentar Novamente' : undefined,
                // onAction: ... (seria necessário passar o callback de retry, mas por enquanto notificacao visual)
            });

            if (normalized.retryable) {
                console.info('[ErrorService] Operação pode ser retentada pelo usuário');
            }
        }

        return normalized;
    }

    private normalizeTechnicalMessage(message: string): string {
        // Remove UUIDs (e.g., "123e4567-e89b-12d3-a456-426614174000")
        let clean = message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>');

        // Remove IDs numeric strings longer than 4 digits (e.g., "123456") to avoid hiding error codes but hiding DB IDs
        // Exception: Keep standard HTTP error codes if possible, but simplest is to mask long numbers
        clean = clean.replace(/\b\d{5,}\b/g, '<ID>');

        // Remove timestamps (ISO format partial match)
        clean = clean.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '<DATE>');

        return clean;
    }

    private generateFingerprint(error: AppErrorNormalized): string {
        // Fingerprint baseada em componentes estáticos do erro: componente, ação e código/mensagem técnica
        // Ignora errorId (que é aleatório) e metadata (que pode variar)
        const normalizedMsg = this.normalizeTechnicalMessage(error.technicalMessage);
        const parts = [
            error.module,
            error.action,
            error.code,
            normalizedMsg.slice(0, 100) // Primeiros 100 chars da msg normalizada
        ];
        return parts.join('|');
    }

    private async persistError(error: AppErrorNormalized): Promise<void> {
        const user = await supabase.auth.getUser();
        const actorId = error.actorUserId || user.data.user?.id;
        const fingerprint = this.generateFingerprint(error);

        // Mapear para o Payload do Contrato (Snake Case do Banco)
        const payload: ErrorEventPayload = {
            error_id: error.errorId,
            scope: error.scope,
            module: error.module,
            action: error.action,
            severity: error.severity,
            user_message: error.userMessage,
            technical_message: error.technicalMessage,
            error_code: error.code,
            retryable: error.retryable,
            actor_user_id: actorId,
            metadata: error.metadata || {},
            fingerprint: fingerprint,
            status: 'new',

            // Novos Campos de Taxonomia
            category: error.category,
            recoverability: error.recoverability,
            is_user_visible: error.isUserVisible,
            recommended_action: error.recommendedAction,
            fingerprint_version: error.fingerprintVersion,
            environment: error.environment,

            // Novos Campos de Contexto
            route_path: error.route_path,
            feature_area: error.feature_area,
            actor_email: error.actor_email || user.data.user?.email, // Fallback to current user email
            target_user_id: error.targetUserId,
            target_email: error.target_email,
            session_id: error.session_id,
            request_id: error.request_id,
            context_label: error.context_label
        };

        // Usar RPC para logar com deduplicação server-side
        const { error: dbError } = await supabase
            .rpc('log_admin_error', {
                p_error_id: payload.error_id,
                p_module: payload.module,
                p_action: payload.action,
                p_user_message: payload.user_message,
                p_technical_message: payload.technical_message,
                p_code: payload.error_code,
                p_severity: payload.severity,
                p_retryable: payload.retryable,
                p_actor_user_id: payload.actor_user_id,
                p_metadata: JSON.stringify(payload.metadata).length > MAX_METADATA_SIZE
                    ? JSON.parse(JSON.stringify({ ...payload.metadata, _truncated: 'Metadata exceeded limit', _original_size: JSON.stringify(payload.metadata).length }))
                    : payload.metadata,
                p_fingerprint: payload.fingerprint,
                p_scope: payload.scope,
                p_category: payload.category,
                p_recoverability: payload.recoverability,
                p_is_user_visible: payload.is_user_visible,
                p_recommended_action: payload.recommended_action,
                p_fingerprint_version: payload.fingerprint_version,
                p_environment: payload.environment,
                // Novos Parâmetros
                p_route_path: payload.route_path,
                p_feature_area: payload.feature_area,
                p_actor_email: payload.actor_email,
                p_target_user_id: payload.target_user_id,
                p_target_email: payload.target_email,
                p_session_id: payload.session_id,
                p_request_id: payload.request_id,
                p_context_label: payload.context_label
            });

        if (dbError) {
            console.error('Failed to log error to DB:', dbError);
        } else {
            // Trigger Alert Check (Fire and forget)
            // Only for critical/high or regularly? Let's check always for now to catch recurrence
            supabase.rpc('check_error_alerts').then(({ error }) => {
                if (error) console.error('Failed to check alerts:', error);
            });
        }
    }
}

export const errorService = ErrorService.getInstance();
