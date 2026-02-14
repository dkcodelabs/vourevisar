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
