import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collectTechnicalContext, getActorEmail } from '@/services/feedbackService';

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
export function useUserFeedbacks() {
    const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Fetch ─────────────────────────────────────────────────
    const fetchFeedbacks = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setFeedbacks([]);
                setIsLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('user_feedback_events')
                .select('id, protocol_code, type, title, description, status, admin_reply, admin_reply_at, admin_reason, created_at, updated_at')
                .eq('actor_user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (fetchError) throw fetchError;

            setFeedbacks((data ?? []) as unknown as UserFeedback[]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar feedbacks';
            setError(msg);
            console.error('[useUserFeedbacks] fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    // ── Submit ────────────────────────────────────────────────
    const submitFeedback = useCallback(async (input: SubmitFeedbackInput): Promise<{ protocol_code: string } | null> => {
        // Rate-limit
        const now = Date.now();
        if (now - lastSubmitTime < RATE_LIMIT_MS) {
            setError('Aguarde alguns segundos antes de enviar outro feedback.');
            return null;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const context = collectTechnicalContext();
            const actorEmail = await getActorEmail();

            // Gerar feedback_id no formato FBK-TIMESTAMP
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
            };

            const { data, error: insertError } = await supabase
                .from('user_feedback_events')
                .insert(payload as never)
                .select('protocol_code')
                .single();

            if (insertError) throw insertError;

            lastSubmitTime = Date.now();

            // Refresh list
            await fetchFeedbacks();

            return { protocol_code: (data as unknown as { protocol_code: string }).protocol_code };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao enviar feedback';
            setError(msg);
            console.error('[useUserFeedbacks] submit error:', err);
            return null;
        } finally {
            setIsSubmitting(false);
        }
    }, [fetchFeedbacks]);

    return {
        feedbacks,
        isLoading,
        isSubmitting,
        error,
        submitFeedback,
        refetch: fetchFeedbacks,
    };
}
