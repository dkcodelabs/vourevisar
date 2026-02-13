/**
 * Analytics System (Lightweight)
 *
 * Sistema simples para rastrear eventos de produto.
 * - Em desenvolvimento: Loga no console com cores.
 * - Em produção: Placeholder (pode ser conectado a GA4/Mixpanel/Supabase futuramente).
 */

type EventName =
    | 'student_hub_opened'
    | 'student_tab_changed'
    | 'feedback_form_opened'
    | 'feedback_submitted'
    | 'feedback_submit_failed'
    | 'feedback_item_opened';

interface AnalyticsProperties {
    [key: string]: string | number | boolean | null | undefined;
}

export const analytics = {
    sendEvent: (name: EventName, properties?: AnalyticsProperties) => {
        // Adiciona timestamp e metadados comuns
        const payload = {
            event: name,
            timestamp: new Date().toISOString(),
            url: window.location.pathname,
            ...properties,
        };

        if (import.meta.env.DEV) {
            console.groupCollapsed(`%c[Analytics] ${name}`, 'color: #8b5cf6; font-weight: bold;');
            console.log(payload);
            console.groupEnd();
        } else {
            // TODO: Integrar com serviço real em produção
            // Por enquanto, falha silenciosamente ou envia para endpoint customizado
        }
    },
};
