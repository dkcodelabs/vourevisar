import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from './useNotifications';
import { useUserFeedbacks } from './useUserFeedbacks';
import { useFeedbackReadState } from './useFeedbackReadState';
import { useAuth } from '@/contexts/AuthContext';

export const useStudentHubBadge = () => {
    const { user } = useAuth();

    // 1. Notificações de Estudo
    const {
        notifications,
        unreadCount: studyUnreadCount,
        isLoading: notifsLoading
    } = useNotifications();

    // 2. Feedbacks (Solicitações)
    const {
        feedbacks,
        isLoading: feedbacksLoading
    } = useUserFeedbacks();

    // 3. Estado de Leitura dos Feedbacks
    const {
        unreadFeedbackIds,
        markAsRead: markFeedbackAsRead
    } = useFeedbackReadState(feedbacks, user?.id);

    // 4. Sincronização Global via Realtime (WebSockets)
    const { refetch: refetchNotifs } = useNotifications();
    const { refetch: refetchFeedbacks } = useUserFeedbacks();

    useEffect(() => {
        if (!user?.id) return;

        // Criar canal de escuta exclusivo para este usuário
        // Usamos Realtime para evitar Polling constante (mais eficiente e instantâneo)
        const channel = supabase
            .channel(`student_hub_realtime:${user.id}`)
            // 1. Escutar notificações
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'user_notifications',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    refetchNotifs({ silent: true });
                }
            )
            // 2. Escutar atualizações de feedback
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_feedback_events',
                    filter: `actor_user_id=eq.${user.id}`
                },
                () => {
                    refetchFeedbacks({ silent: true });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Inscrito com sucesso na Central do Aluno');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, refetchNotifs, refetchFeedbacks]);

    // Total Unread = Estudo + Feedbacks Atualizados
    const totalUnreadCount = studyUnreadCount + unreadFeedbackIds.size;

    const isLoading = notifsLoading || feedbacksLoading;

    return {
        totalUnreadCount,
        studyUnreadCount,
        feedbackUnreadCount: unreadFeedbackIds.size,
        isLoading,
        unreadFeedbackIds,
        markFeedbackAsRead
    };
};
