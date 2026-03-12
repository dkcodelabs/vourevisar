import { useMemo } from 'react';
import { useStudentHub } from '@/contexts/StudentHubContext';

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
// LEGACY ADAPTER: Agora consome o StudentHubContext para garantir sincronização global
export function useNotifications() {
    const {
        notifications,
        isLoading,
        error,
        refreshAll,
        markNotificationAsRead,
        markAllNotificationsAsRead
    } = useStudentHub();

    // Lista de Notificações Reais apenas
    const allNotifications = useMemo(() => {
        return notifications || [];
    }, [notifications]);

    // ── Unread count ──────────────────────────────────────────
    const unreadCount = useMemo(
        () => allNotifications.filter((n) => !n.read).length,
        [allNotifications]
    );

    return {
        notifications: allNotifications,
        unreadCount,
        isLoading,
        error,
        markAsRead: markNotificationAsRead,
        toggleRead: markNotificationAsRead, // Simplicidade: toggle agora é marcar como lida
        markAllRead: markAllNotificationsAsRead,
        refetch: refreshAll,
    };
}
