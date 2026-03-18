import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserNotification } from '@/hooks/useNotifications';
import { UserFeedback } from '@/hooks/useUserFeedbacks';

interface StudentHubContextType {
    notifications: UserNotification[];
    feedbacks: UserFeedback[];
    isLoading: boolean;
    error: string | null;
    refreshAll: (options?: { silent?: boolean }) => Promise<void>;
    markNotificationAsRead: (id: string) => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;
}

const StudentHubContext = createContext<StudentHubContextType | undefined>(undefined);

export const StudentHubProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── Fetchers ──────────────────────────────────────────────
    const fetchNotifications = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!user?.id) return;
        if (!options.silent) setIsLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(100);
            if (fetchError) throw fetchError;
            setNotifications(data as unknown as UserNotification[]);
        } catch (err) {
            console.error('[StudentHubContext] Error fetching notifications:', err);
        } finally {
            if (!options.silent) setIsLoading(false);
        }
    }, [user?.id]);

    const fetchFeedbacks = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!user?.id) return;
        try {
            const { data, error: fetchError } = await supabase
                .from('user_feedback_events')
                .select('id, protocol_code, type, title, description, status, admin_reply, admin_reply_at, admin_reason, created_at, updated_at')
                .eq('actor_user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (fetchError) throw fetchError;
            setFeedbacks(data as unknown as UserFeedback[]);
        } catch (err) {
            console.error('[StudentHubContext] Error fetching feedbacks:', err);
        }
    }, [user?.id]);

    const refreshAll = useCallback(async (options: { silent?: boolean } = {}) => {
        await Promise.all([
            fetchNotifications(options),
            fetchFeedbacks(options)
        ]);
    }, [fetchNotifications, fetchFeedbacks]);

    // ── Initial Load ──────────────────────────────────────────
    useEffect(() => {
        if (user?.id) {
            refreshAll();
        } else {
            setNotifications([]);
            setFeedbacks([]);
            setIsLoading(false);
        }
    }, [user?.id, refreshAll]);

    // ── Realtime Native Subscriptions (Singleton) ───────────────
    useEffect(() => {
        if (!user?.id) return;

        // Silencioso

        const channel = supabase
            .channel(`student_hub_global:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    console.log('[StudentHubContext] Realtime Notif change:', payload);
                    fetchNotifications({ silent: true });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_feedback_events', filter: `actor_user_id=eq.${user.id}` },
                (payload) => {
                    console.log('[StudentHubContext] Realtime Feedback change:', payload);
                    fetchFeedbacks({ silent: true });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') { /* Silencioso */ }
            });

        return () => {
            // Silencioso
            if (channel) supabase.removeChannel(channel).catch(() => { });
        };
    }, [user?.id, fetchNotifications, fetchFeedbacks]);

    // ── Actions ───────────────────────────────────────────────
    const markNotificationAsRead = useCallback(async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        const { error } = await supabase.from('user_notifications').update({ read: true } as never).eq('id', id);
        if (error) {
            console.error('Error marking as read:', error);
            fetchNotifications({ silent: true });
        }
    }, [fetchNotifications]);

    const markAllNotificationsAsRead = useCallback(async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        const { error } = await supabase.from('user_notifications').update({ read: true } as never).in('id', unreadIds);
        if (error) {
            console.error('Error marking all as read:', error);
            fetchNotifications({ silent: true });
        }
    }, [notifications, fetchNotifications]);

    const value = useMemo(() => ({
        notifications,
        feedbacks,
        isLoading,
        error,
        refreshAll,
        markNotificationAsRead,
        markAllNotificationsAsRead
    }), [notifications, feedbacks, isLoading, error, refreshAll, markNotificationAsRead, markAllNotificationsAsRead]);

    return <StudentHubContext.Provider value={value}>{children}</StudentHubContext.Provider>;
};

export const useStudentHub = () => {
    const context = useContext(StudentHubContext);
    if (context === undefined) {
        throw new Error('useStudentHub deve ser usado dentro de um StudentHubProvider');
    }
    return context;
};
