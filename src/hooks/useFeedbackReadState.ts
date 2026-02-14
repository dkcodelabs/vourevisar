import { useState, useEffect, useCallback } from 'react';
import { UserFeedback } from './useUserFeedbacks';

const STORAGE_PREFIX = 'studenthub:feedback:lastRead:';

export const useFeedbackReadState = (feedbacks: UserFeedback[], userId?: string) => {
    const [unreadFeedbackIds, setUnreadFeedbackIds] = useState<Set<string>>(new Set());

    // Gera o fingerprint único para o estado atual do feedback
    const getFingerprint = useCallback((fb: UserFeedback) => {
        // O fingerprint muda se:
        // 1. Status mudar
        // 2. Houver nova resposta (admin_reply_at)
        // 3. Houver atualização genérica (updated_at)
        const timestamp = fb.admin_reply_at || fb.updated_at;
        return `${fb.id}:${fb.status}:${timestamp}`;
    }, []);

    // Verifica se o feedback deve ser considerado "não lido"
    const checkIsUnread = useCallback((fb: UserFeedback) => {
        if (!userId) return false;

        // Regra: Só é "unread" se tiver interação do admin
        // Interação = status diferente de 'nova' OU tem resposta
        const hasAdminInteraction = fb.status !== 'nova' || !!fb.admin_reply;

        if (!hasAdminInteraction) return false;

        const storageKey = `${STORAGE_PREFIX}${userId}:${fb.id}`;
        const lastReadFingerprint = localStorage.getItem(storageKey);
        const currentFingerprint = getFingerprint(fb);

        return lastReadFingerprint !== currentFingerprint;
    }, [userId, getFingerprint]);

    // Listen for global read events to sync instances (e.g. Panel -> Header Badge)
    useEffect(() => {
        const handleRead = (e: Event) => {
            const customEvent = e as CustomEvent;
            const feedbackId = customEvent.detail?.feedbackId;
            if (!feedbackId) return;

            setUnreadFeedbackIds((prev) => {
                if (prev.has(feedbackId)) {
                    const next = new Set(prev);
                    next.delete(feedbackId);
                    return next;
                }
                return prev;
            });
        };

        window.addEventListener('studenthub:feedback:read', handleRead);
        return () => window.removeEventListener('studenthub:feedback:read', handleRead);
    }, []);

    // Atualiza a lista de IDs não lidos quando os feedbacks ou user mudam
    useEffect(() => {
        if (!userId || !feedbacks.length) {
            setUnreadFeedbackIds(new Set());
            return;
        }

        const nextUnreadIds = new Set<string>();
        feedbacks.forEach(fb => {
            if (checkIsUnread(fb)) {
                nextUnreadIds.add(fb.id);
            }
        });

        // Evita update se não mudou (shallow compare size/content)
        setUnreadFeedbackIds(prev => {
            if (prev.size !== nextUnreadIds.size) return nextUnreadIds;
            for (const id of nextUnreadIds) if (!prev.has(id)) return nextUnreadIds;
            return prev;
        });

    }, [feedbacks, userId, checkIsUnread]);

    // Marca um feedback como lido (salva fingerprint atual)
    const markAsRead = useCallback((feedbackId: string) => {
        if (!userId) return;

        const feedback = feedbacks.find(fb => fb.id === feedbackId);
        // Se não achou na lista atual, tenta marcar mesmo assim se tivermos o ID
        // Mas precisamos do fingerprint... se não temos o feedback, não podemos gerar o fingerprint atualizado.
        // Assumindo que o componente que chama tem o feedback.
        if (!feedback) return;

        const currentFingerprint = getFingerprint(feedback);
        const storageKey = `${STORAGE_PREFIX}${userId}:${feedbackId}`;

        localStorage.setItem(storageKey, currentFingerprint);

        // Dispara evento para sincronizar outras instâncias (ex: Header Badge)
        window.dispatchEvent(new CustomEvent('studenthub:feedback:read', { detail: { feedbackId } }));

        // O listener acima vai pegar o evento e atualizar o estado local também,
        // mas para garantir responsividade imediata na própria instância, mantemos o set state direto ou confiamos no event loop.
        // Vamos confiar no event loop pois é microtask/sync em local, mas CustomEvent é síncrono no dispatch? 
        // dispatchEvent é síncrono. O listener vai rodar IMEDIATAMENTE.
        // Então não precisamos duplicar o setUnreadFeedbackIds aqui.
    }, [feedbacks, userId, getFingerprint]);

    return {
        unreadFeedbackIds,
        markAsRead,
        isUnread: (id: string) => unreadFeedbackIds.has(id)
    };
};
