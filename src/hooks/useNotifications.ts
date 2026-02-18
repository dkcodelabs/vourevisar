import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ──────────────────────────────────────────────────
export type NotificationCategory = 'sistema' | 'estudo';
export type NotificationFilter = 'todas' | 'nao_lidas' | 'sistema' | 'estudo';

export interface UserNotification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    category: NotificationCategory;
    read: boolean;
    action_url: string | null;
    data: Record<string, unknown> | null;
    created_at: string;
}

// ─── Hook ───────────────────────────────────────────────────
export function useNotifications() {
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Fetch ─────────────────────────────────────────────────
    const fetchNotifications = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) setIsLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setNotifications([]);
                if (!options.silent) setIsLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);

            if (fetchError) throw fetchError;

            setNotifications((data ?? []) as unknown as UserNotification[]);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar notificações';
            setError(msg);
            console.error('[useNotifications] fetch error:', err);
        } finally {
            if (!options.silent) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ── Realtime Subscription ─────────────────────────────────
    useEffect(() => {
        let channel: any;

        const setupSubscription = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channel = supabase
                .channel(`notifications_realtime:${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'user_notifications',
                        filter: `user_id=eq.${user.id}`
                    },
                    () => {
                        fetchNotifications({ silent: true });
                    }
                )
                .subscribe();
        };

        setupSubscription();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [fetchNotifications]);

    // ── Unread count ──────────────────────────────────────────
    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.read).length,
        [notifications]
    );

    // ── Mark single as read ───────────────────────────────────
    const markAsRead = useCallback(async (id: string) => {
        // Otimista
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );

        const { error: updateError } = await supabase
            .from('user_notifications')
            .update({ read: true } as never)
            .eq('id', id);

        if (updateError) {
            console.error('[useNotifications] markAsRead error:', updateError);
            fetchNotifications(); // rollback
        }
    }, [fetchNotifications]);

    // ── Toggle read ───────────────────────────────────────────
    const toggleRead = useCallback(async (id: string) => {
        const target = notifications.find((n) => n.id === id);
        if (!target) return;

        const newRead = !target.read;
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: newRead } : n))
        );

        const { error: updateError } = await supabase
            .from('user_notifications')
            .update({ read: newRead } as never)
            .eq('id', id);

        if (updateError) {
            console.error('[useNotifications] toggleRead error:', updateError);
            fetchNotifications();
        }
    }, [notifications, fetchNotifications]);

    // ── Mark all as read ──────────────────────────────────────
    const markAllRead = useCallback(async () => {
        const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
        if (unreadIds.length === 0) return;

        // Otimista
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

        const { error: updateError } = await supabase
            .from('user_notifications')
            .update({ read: true } as never)
            .in('id', unreadIds);

        if (updateError) {
            console.error('[useNotifications] markAllRead error:', updateError);
            fetchNotifications();
        }
    }, [notifications, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        toggleRead,
        markAllRead,
        refetch: fetchNotifications,
    };
}
