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

    // 4. Lógica de Badge Inteligente (Anti-Spam)
    // Filtramos notificações que são duplicatas de feedbacks que já estão sendo contados
    const pureStudyNotifs = notifications.filter(n => {
        if (n.read) return false;
        // Se a notificação tem um feedback_id nos metadados ou no título/link
        // nós desconsideramos aqui para não contar em dobro com o unreadFeedbackIds
        const hasFeedbackRef = n.data?.feedback_id || n.action_url?.includes('feedback');
        return !hasFeedbackRef;
    });

    // Total Unread = Notificações de Estudo Puras + Feedbacks Únicos com Interação
    const totalUnreadCount = pureStudyNotifs.length + unreadFeedbackIds.size;

    const isLoading = notifsLoading || feedbacksLoading;

    return {
        totalUnreadCount,
        studyUnreadCount: pureStudyNotifs.length, // Apenas para exibição na aba
        feedbackUnreadCount: unreadFeedbackIds.size,
        isLoading,
        unreadFeedbackIds,
        markFeedbackAsRead
    };
};
