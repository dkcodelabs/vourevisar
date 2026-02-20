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

const MOCK_NOTIFICATIONS: UserNotification[] = [
    {
        id: 'mock-1',
        user_id: '123',
        type: 'estudo',
        title: 'Revisão vence hoje',
        message: 'Direito Civil expira em 2h',
        category: 'estudo',
        read: false,
        action_url: null,
        data: null,
        created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    },
    {
        id: 'mock-2',
        user_id: '123',
        type: 'progresso',
        title: 'Meta Semanal',
        message: '80% da meta atingida!',
        category: 'estudo',
        read: false,
        action_url: null,
        data: null,
        created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    },
    {
        id: 'mock-3',
        user_id: '123',
        type: 'sistema',
        title: 'Novo Material',
        message: 'Processo Penal atualizado.',
        category: 'sistema',
        read: true,
        action_url: null,
        data: null,
        created_at: new Date(Date.now() - 25 * 3600_000).toISOString(),
    },
    {
        id: 'mock-4',
        user_id: '123',
        type: 'alerta',
        title: 'Matéria com baixo rendimento',
        message: 'Seu rendimento em Raciocínio Lógico caiu 15% nesta semana.',
        category: 'estudo',
        read: true,
        action_url: null,
        data: null,
        created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
    },
    {
        id: 'mock-5',
        user_id: '123',
        type: 'progresso',
        title: 'Desempenho Excelente!',
        message: 'Você estudou 3 horas a mais esta semana em comparação com a semana passada.',
        category: 'estudo',
        read: true,
        action_url: null,
        data: null,
        created_at: new Date(Date.now() - 72 * 3600_000).toISOString(),
    },
    {
        id: 'mock-6',
        user_id: '123',
        type: 'alerta',
        title: 'Tópico Atrasado',
        message: 'O tópico de Direito Constitucional está 2 dias atrasado em relação ao cronograma.',
        category: 'estudo',
        read: false,
        action_url: null,
        data: null,
        created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    }
];


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

    // Misturando DB com Mocks
    const allNotifications = useMemo(() => {
        return [...MOCK_NOTIFICATIONS, ...notifications];
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
