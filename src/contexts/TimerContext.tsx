/**
 * TimerContext — Fonte de verdade: Supabase (active_study_timers)
 * Fallback: localStorage (cache offline / inicialização rápida sem flicker)
 * Sincronização: Supabase Realtime → qualquer browser logado na mesma conta se atualiza
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';
import { useAuth } from './AuthContext';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ActiveTimer {
    topicId: string;
    startTime: number;        // epoch ms do início da sessão atual (0 se pausado)
    status: 'RUNNING' | 'PAUSED';
    accumulatedTime: number;  // ms acumulados antes da sessão atual
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

// ── Helpers ───────────────────────────────────────────────────────────────────

const LS_KEY = 'revisoes-active-timer';

function readFromLocalStorage(): ActiveTimer | null {
    try {
        const saved = localStorage.getItem(LS_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
}

function writeToLocalStorage(timer: ActiveTimer | null) {
    try {
        if (timer) {
            localStorage.setItem(LS_KEY, JSON.stringify(timer));
        } else {
            localStorage.removeItem(LS_KEY);
        }
    } catch { /* storage cheia ou bloqueada */ }
}

/** Converte uma linha do DB para o formato interno do contexto */
function dbRowToTimer(row: {
    topic_id: string | null;
    status: string;
    started_at: string | null;
    accumulated_ms: number;
}): ActiveTimer | null {
    if (!row.topic_id) return null;
    return {
        topicId: row.topic_id,
        status: row.status as 'RUNNING' | 'PAUSED',
        startTime: row.started_at ? new Date(row.started_at).getTime() : 0,
        accumulatedTime: row.accumulated_ms,
    };
}

// ── Context ───────────────────────────────────────────────────────────────────

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
    // Inicialização rápida via localStorage para evitar flicker
    const [activeTimer, setActiveTimerState] = useState<ActiveTimer | null>(readFromLocalStorage);
    const { user } = useAuth();
    const userIdRef = useRef<string | null>(user?.id || null);
    const syncingRef = useRef(false); // evita loops de sync

    // Sincronizar userIdRef com o context de autenticação
    useEffect(() => {
        userIdRef.current = user?.id || null;
    }, [user?.id]);

    /** Atualiza estado local + localStorage (cache offline) */
    const applyTimer = useCallback((timer: ActiveTimer | null) => {
        setActiveTimerState(timer);
        writeToLocalStorage(timer);
    }, []);

    // ── Ciclo de Vida: Carga Inicial + Realtime ──────────────────────────────────
    useEffect(() => {
        if (!user?.id) {
            applyTimer(null);
            return;
        }

        let isCancelled = false;
        let channel: any = null;

        const initTimer = async () => {
            // 1. Carrega estado inicial do Supabase
            const { data, error } = await supabase
                .from('active_study_timers')
                .select('topic_id, status, started_at, accumulated_ms')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!error && !isCancelled) {
                const remoteTimer = data ? dbRowToTimer(data) : null;
                applyTimer(remoteTimer);
            }

            if (isCancelled) return;

            // 2. Configura canal Realtime para sincronização
            channel = supabase
                .channel(`timer_sync_${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'active_study_timers',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        if (syncingRef.current || isCancelled) return;

                        if (payload.eventType === 'DELETE') {
                            applyTimer(null);
                        } else {
                            const row = payload.new as any;
                            const remoteTimer = dbRowToTimer(row);
                            applyTimer(remoteTimer);
                        }
                    }
                )
                .subscribe();
        };

        initTimer();

        return () => {
            isCancelled = true;
            if (channel) {
                supabase.removeChannel(channel).catch(() => { });
            }
        };
    }, [user?.id, applyTimer]);

    // ── Listener de storage (sincronização entre abas do mesmo browser) ───────
    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key !== LS_KEY) return;
            const parsed = e.newValue ? JSON.parse(e.newValue) : null;
            setActiveTimerState(parsed); // apenas estado React, não escreve no storage de volta
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // ── Helper: persiste no Supabase sinalizando que é mudança local ──────────
    const persistToSupabase = useCallback(async (
        userId: string,
        timer: ActiveTimer | null
    ) => {
        syncingRef.current = true;
        try {
            if (!timer) {
                await supabase
                    .from('active_study_timers')
                    .delete()
                    .eq('user_id', userId);
            } else {
                await supabase
                    .from('active_study_timers')
                    .upsert({
                        user_id: userId,
                        topic_id: timer.topicId,
                        status: timer.status,
                        started_at: timer.startTime ? new Date(timer.startTime).toISOString() : null,
                        accumulated_ms: timer.accumulatedTime,
                    }, { onConflict: 'user_id' });
            }
        } catch (err) {
            console.error('[TimerContext] Erro ao persistir no Supabase:', err);
        } finally {
            // Limpa flag após um tick para absorver o evento Realtime que virá
            setTimeout(() => { syncingRef.current = false; }, 500);
        }
    }, []);

    // ── Ações públicas ────────────────────────────────────────────────────────

    const startTimer = useCallback((topicId: string) => {
        const userId = userIdRef.current;
        const newTimer: ActiveTimer = {
            topicId,
            startTime: Date.now(),
            status: 'RUNNING',
            accumulatedTime: 0,
        };
        applyTimer(newTimer);
        if (userId) persistToSupabase(userId, newTimer);
    }, [applyTimer, persistToSupabase]);

    const pauseTimer = useCallback(() => {
        const userId = userIdRef.current;
        setActiveTimerState(prev => {
            if (!prev || prev.status === 'PAUSED') return prev;
            const now = Date.now();
            const elapsed = now - prev.startTime;
            const paused: ActiveTimer = {
                ...prev,
                status: 'PAUSED',
                startTime: 0,
                accumulatedTime: prev.accumulatedTime + elapsed,
            };
            writeToLocalStorage(paused);
            if (userId) persistToSupabase(userId, paused);
            return paused;
        });
    }, [persistToSupabase]);

    const resumeTimer = useCallback(() => {
        const userId = userIdRef.current;
        setActiveTimerState(prev => {
            if (!prev || prev.status === 'RUNNING') return prev;
            const resumed: ActiveTimer = {
                ...prev,
                status: 'RUNNING',
                startTime: Date.now(),
            };
            writeToLocalStorage(resumed);
            if (userId) persistToSupabase(userId, resumed);
            return resumed;
        });
    }, [persistToSupabase]);

    const stopTimer = useCallback(() => {
        const userId = userIdRef.current;
        applyTimer(null);
        if (userId) persistToSupabase(userId, null);
    }, [applyTimer, persistToSupabase]);

    const resetTimer = stopTimer;

    // ── checkSync: verifica tópico no banco (conclusão externa) ──────────────
    const checkSync = useCallback(async () => {
        const timer = activeTimer;
        if (!timer) return;
        try {
            const { data: topic, error } = await supabase
                .from('topics')
                .select('name, subjects(name), completed, review_stage')
                .eq('id', timer.topicId)
                .single();

            if (error || !topic) return;
            const isCompleted = topic.completed || topic.review_stage === 'Concluído';
            if (isCompleted) {
                resetTimer();
                toast.info(`Tópico '${topic.name}' foi concluído em outra sessão.`);
            }
        } catch { /* silencioso */ }
    }, [activeTimer, resetTimer]);

    // ── refs para evitar duplo-toast em updates externos ─────────────────────
    const processedUpdateRef = useRef<string | null>(null);
    const setProcessedUpdate = useCallback((topicId: string) => {
        processedUpdateRef.current = topicId;
        setTimeout(() => {
            if (processedUpdateRef.current === topicId) processedUpdateRef.current = null;
        }, 5000);
    }, []);

    // ── Realtime: watch topic completion externa ───────────────────────────────
    useEffect(() => {
        if (!activeTimer?.topicId) return;
        const topicId = activeTimer.topicId;

        const channel = supabase
            .channel(`topic_watch_${topicId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'topics',
                filter: `id=eq.${topicId}`,
            }, (payload) => {
                const newTopic = payload.new as { id: string; completed: boolean; review_stage: string; review_count: number };
                const oldTopic = payload.old as { review_count: number };

                if (processedUpdateRef.current === newTopic.id) {
                    processedUpdateRef.current = null;
                    return;
                }

                const isCompletedNow = newTopic.completed || newTopic.review_stage === 'Concluído';
                const hasAdvanced = newTopic.review_count > (oldTopic?.review_count ?? -1);

                if (isCompletedNow || hasAdvanced) {
                    setActiveTimerState(null);
                    writeToLocalStorage(null);
                    const userId = userIdRef.current;
                    if (userId) persistToSupabase(userId, null);
                    toast.info('Revisão marcada em outra janela.', { duration: 6000 });
                    window.dispatchEvent(new CustomEvent('external-topic-completed', { detail: { topicId } }));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeTimer?.topicId, persistToSupabase]);

    return (
        <TimerContext.Provider value={{
            activeTimer,
            startTimer,
            pauseTimer,
            resumeTimer,
            stopTimer,
            resetTimer,
            checkSync,
            setProcessedUpdate,
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
