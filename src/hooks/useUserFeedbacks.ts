import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collectTechnicalContext, getActorEmail, calculateSLADueDates } from '@/services/feedbackService';

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
    const fetchFeedbacks = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) setIsLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setFeedbacks([]);
                if (!options.silent) setIsLoading(false);
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
            const msg = err instanceof Error ? err.message : 'Erro ao carregar pedidos';
            setError(msg);
            console.error('[useUserFeedbacks] fetch error:', err);
        } finally {
            if (!options.silent) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    // ── Realtime Subscription ─────────────────────────────────
    useEffect(() => {
        let channel: any;

        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId) return;

            channel = supabase
                .channel(`feedbacks:changes:${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'user_feedback_events',
                        filter: `actor_user_id=eq.${userId}`
                    },
                    (payload) => {
                        console.log('[Realtime Feedback] Change received:', payload);
                        fetchFeedbacks({ silent: true });
                    }
                )
                .subscribe();
        };

        init();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchFeedbacks]);

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

            // 2. Rate-limit server-side check (5/hora)
            const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
            const { count, error: countError } = await supabase
                .from('user_feedback_events')
                .select('*', { count: 'exact', head: true })
                .eq('actor_user_id', user.id)
                .gte('created_at', oneHourAgo);

            if (countError) {
                console.error('[RateLimit] Check failed:', countError);
                // Fail open or closed? Fail open to not block user on system error, but log it.
            } else if (count !== null && count >= 5) {
                // Bloqueio de Segurança
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                if (window.analytics) window.analytics.sendEvent('feedback_rate_limited', { count });
                throw new Error('Você atingiu o limite de 5 envios por hora. Tente novamente mais tarde.');
            }

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
            await fetchFeedbacks();

            return { protocol_code: (data as unknown as { protocol_code: string }).protocol_code };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao enviar solicitação';
            setError(msg);
            // Se for erro de rate limit, não precisamos logar erro técnico
            if (!msg.includes('limite de 5 envios')) {
                console.error('[useUserFeedbacks] submit error:', err);
            }
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
