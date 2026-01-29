import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

interface ActiveTimer {
    topicId: string;
    startTime: number;
    status: 'RUNNING' | 'PAUSED';
    accumulatedTime: number;
}

interface TimerContextType {
    activeTimer: ActiveTimer | null;
    startTimer: (topicId: string) => void;
    pauseTimer: () => void;
    resumeTimer: () => void;
    stopTimer: () => void;
    resetTimer: () => void;
    checkSync: () => Promise<void>;
    setProcessedUpdate: (topicId: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => {
        try {
            const saved = localStorage.getItem('revisoes-active-timer');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // Persist to localStorage
    useEffect(() => {
        if (activeTimer) {
            localStorage.setItem('revisoes-active-timer', JSON.stringify(activeTimer));
        } else {
            localStorage.removeItem('revisoes-active-timer');
        }
    }, [activeTimer]);

    const startTimer = (topicId: string) => {
        const newTimer: ActiveTimer = {
            topicId,
            startTime: Date.now(),
            status: 'RUNNING',
            accumulatedTime: 0
        };
        setActiveTimer(newTimer);
    };

    const pauseTimer = () => {
        if (!activeTimer || activeTimer.status === 'PAUSED') return;

        const now = Date.now();
        const elapsed = now - activeTimer.startTime;

        setActiveTimer({
            ...activeTimer,
            status: 'PAUSED',
            startTime: 0,
            accumulatedTime: activeTimer.accumulatedTime + elapsed
        });
    };

    const resumeTimer = () => {
        if (!activeTimer || activeTimer.status === 'RUNNING') return;

        setActiveTimer({
            ...activeTimer,
            status: 'RUNNING',
            startTime: Date.now()
        });
    };

    const stopTimer = () => {
        setActiveTimer(null);
    };

    const resetTimer = stopTimer;

    // Transparent Sync Logic
    const checkSync = useCallback(async () => {
        if (!activeTimer) return;

        try {
            // Check topic status silently
            const { data: topic, error } = await supabase
                .from('topics')
                .select('name, subjects(name), completed, review_stage, next_review')
                .eq('id', activeTimer.topicId)
                .single();

            if (error || !topic) return;

            // Check if Completed
            // Logic: If completed flag is true OR review_stage is 'Concluído' OR 
            // maybe checked if 'next_review' is in the future relative to today?
            // The user specifically asked: "SE o tópico estiver `COMPLETED` (concluído externamente)"
            // We'll check the 'completed' column and 'review_stage'.

            const isCompleted = topic.completed || topic.review_stage === 'Concluído';

            // Also consider if it was reviewed TODAY already (next_review > today)
            // But maybe user is reviewing it again? 
            // User prompt says: "SE o tópico estiver `COMPLETED` ... Feche o Modal ... Limpe o Timer"

            if (isCompleted) {
                resetTimer();
                // Close modal logic is handled by the consumer (Revisoes.tsx needs to use this context and listen)
                // OR we can trigger a custom event? 
                // We will dispatch a custom event that Revisoes.tsx can listen to if needed, 
                // OR simply reliance on state change (activeTimer becomes null).

                toast.info(
                    `Atualização: O tópico '${topic.name}' de '${(topic.subjects as any)?.name}' foi concluído em outra sessão.`
                );
            }

        } catch (err) {
            console.error('Silent sync error:', err);
        }
    }, [activeTimer, resetTimer]);

    // Listen for window focus (still useful for mobile/minimizing)
    useEffect(() => {
        const handleFocus = () => {
            // 1. Sync Timer State from LocalStorage (Catch "Resumed/Paused" elsewhere)
            try {
                const saved = localStorage.getItem('revisoes-active-timer');
                const parsed = saved ? JSON.parse(saved) : null;

                // If local state differs from storage, update it
                // We use JSON.stringify for quick comparison
                if (JSON.stringify(parsed) !== JSON.stringify(activeTimer)) {
                    setActiveTimer(parsed);
                    if (parsed && activeTimer?.status === 'PAUSED' && parsed.status === 'RUNNING') {
                        toast.info('Cronômetro sincronizado (Retomado em outra aba).');
                    }
                }
            } catch (e) {
                console.error('Error syncing storage on focus', e);
            }

            // 2. Sync Topic Status from Supabase (Catch "Completed" elsewhere)
            checkSync();
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [checkSync, activeTimer]);

    // Also listen for storage events (multi-tab immediate sync)
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'revisoes-active-timer') {
                if (!e.newValue) {
                    setActiveTimer(null);
                } else {
                    const newTimer = JSON.parse(e.newValue);
                    setActiveTimer(newTimer);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Ref to track updates made by this client to avoid double-toasting
    const processedUpdateRef = React.useRef<string | null>(null);

    const setProcessedUpdate = (topicId: string) => {
        console.log('🔒 [TimerContext] Registering self-update for:', topicId);
        processedUpdateRef.current = topicId;
        // Auto-clear after 5 seconds to be safe
        setTimeout(() => {
            if (processedUpdateRef.current === topicId) {
                processedUpdateRef.current = null;
            }
        }, 5000);
    };

    // REALTIME SUBSCRIPTION (Split-Screen Support)
    useEffect(() => {
        if (!activeTimer?.topicId) return;

        const topicId = activeTimer.topicId;
        console.log('🔌 [TimerContext] Subscribing to realtime updates for topic:', topicId);

        const channel = supabase
            .channel(`topic_watch_${topicId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'topics',
                    filter: `id=eq.${topicId}`
                },
                (payload) => {
                    const newTopic = payload.new as any;
                    const oldTopic = payload.old as any;

                    console.log('⚡ [TimerContext] Realtime update received:', newTopic);

                    // Check if THIS client triggered the update
                    if (processedUpdateRef.current === newTopic.id) {
                        console.log('✅ [TimerContext] Ignoring self-update.');
                        processedUpdateRef.current = null; // Clear flag
                        return;
                    }

                    // Check for Completion or Advancement
                    const isCompletedNow = newTopic.completed || newTopic.review_stage === 'Concluído';
                    const hasAdvanced = newTopic.review_count > (oldTopic?.review_count || -1);

                    if (isCompletedNow || hasAdvanced) {
                        console.log('🛑 [TimerContext] Detected external completion/advancement. Resetting timer.');

                        // Stop local timer
                        setActiveTimer(null);

                        // Notify user
                        // Mobile-Friendly: Short title + description style
                        toast.info(
                            "Revisão marcada em outra janela.",
                            { duration: 6000 }
                        );

                        // Broadcast event to force UI refresh/Modal close immediately
                        window.dispatchEvent(new CustomEvent('external-topic-completed', {
                            detail: { topicId }
                        }));
                    }
                }
            )
            .subscribe();

        return () => {
            console.log('🔌 [TimerContext] Unsubscribing from topic:', topicId);
            supabase.removeChannel(channel);
        };
    }, [activeTimer?.topicId]);

    return (
        <TimerContext.Provider value={{
            activeTimer,
            startTimer,
            pauseTimer,
            resumeTimer,
            stopTimer,
            resetTimer,
            checkSync,
            setProcessedUpdate
        }}>
            {children}
        </TimerContext.Provider>
    );
};

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (context === undefined) {
        throw new Error('useTimer must be used within a TimerProvider');
    }
    return context;
};
