import { useEffect } from 'react';
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

    // 4. Sincronização Global Silenciosa (30s)
    const { refetch: refetchNotifs } = useNotifications();
    const { refetch: refetchFeedbacks } = useUserFeedbacks();

    useEffect(() => {
        if (!user) return;

        const interval = setInterval(() => {
            refetchNotifs({ silent: true });
            refetchFeedbacks({ silent: true });
        }, 30000); // 30 segundos é um balanço saudável entre real-time e performance

        return () => clearInterval(interval);
    }, [user, refetchNotifs, refetchFeedbacks]);

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
