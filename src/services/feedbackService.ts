import { supabase } from '@/integrations/supabase/client';

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
