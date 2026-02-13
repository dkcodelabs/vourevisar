import { supabase } from '@/integrations/supabase/client';
import { addHours, addDays, isPast } from 'date-fns';

/**
 * Coleta contexto técnico automaticamente ao criar feedback.
 * Não inclui dados sensíveis (tokens, emails, etc.).
 */
export function collectTechnicalContext(): Record<string, string | null> {
    const routePath = typeof window !== 'undefined' ? window.location.pathname : null;
    const featureArea = routePath ? deriveFeatureArea(routePath) : null;
    const sessionId = getSessionId();
    const appVersion = import.meta.env.VITE_APP_VERSION || null;

    return sanitize({
        route_path: routePath,
        feature_area: featureArea,
        session_id: sessionId,
        app_version: appVersion,
    });
}

/** Deriva a área funcional a partir do path */
function deriveFeatureArea(path: string): string {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'dashboard';
    if (segments[0] === 'admin') return `admin/${segments[1] || 'overview'}`;
    return segments[0];
}

/** Obtém session_id do localStorage (se disponível) */
function getSessionId(): string | null {
    try {
        const raw = localStorage.getItem('sb-ebghgbzvdiytxuxmnvvt-auth-token');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.access_token?.substring(0, 12) || null; // apenas prefix
    } catch {
        return null;
    }
}

/** Remove dados sensíveis do contexto */
function sanitize(ctx: Record<string, string | null>): Record<string, string | null> {
    const sensitivePatterns = [/token/i, /password/i, /secret/i, /key/i, /auth/i, /email/i];
    const result: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(ctx)) {
        if (!value) {
            result[key] = value;
            continue;
        }
        // Não incluir valores que pareçam ser tokens ou strings sensíveis
        const looksLikeToken = value.length > 64 && !value.includes(' ');
        const keyIsSensitive = sensitivePatterns.some((p) => p.test(key));
        result[key] = looksLikeToken || keyIsSensitive ? '[REDACTED]' : value;
    }
    return result;
}

/**
 * Obtém o email do usuário autenticado para preencher o campo actor_email.
 */
export async function getActorEmail(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data?.user?.email ?? null;
}

// ─── Status & Transitions Hardening ─────────────────────────

export type FeedbackStatus = 'nova' | 'planejada' | 'em_desenvolvimento' | 'concluida' | 'nao_planejada';
export type FeedbackType = 'melhoria' | 'nova_funcionalidade' | 'problema';

export const FEEDBACK_LABELS: Record<FeedbackStatus, string> = {
    nova: 'Nova',
    planejada: 'Planejada',
    em_desenvolvimento: 'Em Desenvolvimento',
    concluida: 'Concluída',
    nao_planejada: 'Não Planejada',
};

// Matriz de transições permitidas
// Admin tem superpoderes, mas evitamos fluxos ilógicos (ex: Concluída -> Nova)
const VALID_TRANSITIONS: Record<FeedbackStatus, FeedbackStatus[]> = {
    nova: ['planejada', 'nao_planejada', 'em_desenvolvimento', 'concluida'],
    planejada: ['em_desenvolvimento', 'nao_planejada', 'nova'],
    em_desenvolvimento: ['concluida', 'planejada', 'nova'],
    concluida: ['em_desenvolvimento', 'planejada'], // Reabrir
    nao_planejada: ['planejada', 'nova'], // Reconsiderar
};

/**
 * Valida se a transição de status é permitida.
 * @param current Status atual
 * @param next Próximo status desejado
 */
export function isValidTransition(current: FeedbackStatus, next: FeedbackStatus): boolean {
    if (current === next) return true;
    const allowed = VALID_TRANSITIONS[current] || [];
    return allowed.includes(next);
}

/**
 * Normaliza status legado para o novo padrão.
 */
export function normalizeFeedbackStatus(status: string): FeedbackStatus {
    const mapLegacy: Record<string, FeedbackStatus> = {
        'new': 'nova',
        'triaged': 'planejada',
        'in_progress': 'em_desenvolvimento',
        'resolved': 'concluida',
        'wont_fix': 'nao_planejada'
    };
    return (mapLegacy[status] || status) as FeedbackStatus;
}

/**
 * Garante que o rótulo seja sempre PT-BR e nunca vaze o enum.
 */
export function getFeedbackStatusLabel(status: string): string {
    const normalized = normalizeFeedbackStatus(status);
    return FEEDBACK_LABELS[normalized] || status;
}

// ─── SLA Logic ──────────────────────────────────────────────

export interface SLADueDates {
    sla_first_response_due_at: string; // ISO
    sla_resolution_due_at: string; // ISO
}

/**
 * Calcula os prazos de SLA baseados no tipo e data de criação.
 * Regra:
 * - 1ª Resposta: +24h (Todos)
 * - Resolução:
 *    - Problema: +3 dias
 *    - Melhoria: +7 dias
 *    - Nova Funcionalidade: +14 dias
 */
export function calculateSLADueDates(creationDate: Date | string, type: FeedbackType | string): SLADueDates {
    const baseDate = new Date(creationDate);

    // 1. First Response: +24h fixed
    const responseDue = addHours(baseDate, 24);

    // 2. Resolution: Dynamic by type
    let resolutionDays = 7; // Default (Melhoria)
    if (type === 'problema') resolutionDays = 3;
    if (type === 'nova_funcionalidade') resolutionDays = 14;

    const resolutionDue = addDays(baseDate, resolutionDays);

    return {
        sla_first_response_due_at: responseDue.toISOString(),
        sla_resolution_due_at: resolutionDue.toISOString()
    };
}

/**
 * Verifica se houve violação de SLA.
 */
export function checkSLABreach(
    dueAt: string | null,
    actualAt: string | null
): boolean {
    if (!dueAt) return false;
    // Se já foi atendido (actualAt), compara datas.
    if (actualAt) {
        return new Date(actualAt) > new Date(dueAt);
    }
    // Se não foi atendido, verifica se já estourou o prazo (now > dueAt).
    return isPast(new Date(dueAt));
}
