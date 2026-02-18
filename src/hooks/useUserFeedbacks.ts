import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collectTechnicalContext, getActorEmail, calculateSLADueDates } from '@/services/feedbackService';
import { useStudentHub } from '@/contexts/StudentHubContext';

// ─── Tipos ──────────────────────────────────────────────────
export type FeedbackType = 'melhoria' | 'nova_funcionalidade' | 'problema';
export type FeedbackStatus = 'nova' | 'planejada' | 'em_desenvolvimento' | 'concluida' | 'nao_planejada';

export interface UserFeedback {
    id: string;
    protocol_code: string;
    type: FeedbackType;
    title: string;
    description: string;
    status: FeedbackStatus;
    admin_reply: string | null;
    admin_reply_at: string | null;
    admin_reason: string | null;
    created_at: string;
    updated_at: string;
}

export interface SubmitFeedbackInput {
    type: FeedbackType;
    title: string;
    description: string;
}

// ─── Rate-limit ─────────────────────────────────────────────
const RATE_LIMIT_MS = 10_000; // 10 segundos
let lastSubmitTime = 0;

// ─── Hook ───────────────────────────────────────────────────
// LEGACY ADAPTER: Agora consome o StudentHubContext para garantir sincronização global
export function useUserFeedbacks() {
    const {
        feedbacks,
        isLoading,
        error: contextError,
        refreshAll
    } = useStudentHub();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Submit ────────────────────────────────────────────────
    const submitFeedback = useCallback(async (input: SubmitFeedbackInput): Promise<{ protocol_code: string } | null> => {
        // 1. Rate-limit local (Flood Protection - 10s)
        const now = Date.now();
        if (now - lastSubmitTime < RATE_LIMIT_MS) {
            setError('Por favor, aguarde alguns segundos antes de enviar novamente.');
            return null;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const context = collectTechnicalContext();
            const actorEmail = await getActorEmail();
            const feedbackId = `FBK-${Date.now()}`;

            const payload = {
                feedback_id: feedbackId,
                type: input.type,
                title: input.title.trim(),
                description: input.description.trim(),
                status: 'nova',
                impact: 'medium',
                actor_user_id: user.id,
                actor_email: actorEmail,
                route_path: context.route_path,
                feature_area: context.feature_area,
                session_id: context.session_id,
                metadata: { app_version: context.app_version },
                ...calculateSLADueDates(new Date().toISOString(), input.type),
            };

            const { data, error: insertError } = await supabase
                .from('user_feedback_events')
                .insert(payload as never)
                .select('protocol_code')
                .single();

            if (insertError) throw insertError;

            lastSubmitTime = Date.now();
            await refreshAll({ silent: true });

            return { protocol_code: (data as unknown as { protocol_code: string }).protocol_code };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao enviar solicitação';
            setError(msg);
            console.error('[useUserFeedbacks] submit error:', err);
            return null;
        } finally {
            setIsSubmitting(false);
        }
    }, [refreshAll]);

    return {
        feedbacks,
        isLoading,
        isSubmitting,
        error: error || contextError,
        submitFeedback,
        refetch: refreshAll,
    };
}
