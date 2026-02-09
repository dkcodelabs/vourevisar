import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EventType =
    | 'LOGIN'
    | 'SESSION_START'
    | 'LOGOUT'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET_SUCCESS'
    | 'EMAIL_CONFIRMED'
    | 'EMAIL_CHANGED'
    | 'MARKETING_CONSENT_GRANTED'
    | 'MARKETING_CONSENT_REVOKED'
    | 'ACCOUNT_DEACTIVATED'
    | 'ACCOUNT_REACTIVATED'
    | 'ROLE_CHANGED'
    | 'PROFILE_UPDATED';


export const useUserLogger = () => {

    const logEvent = useCallback(async (
        eventType: EventType,
        metadata: Record<string, any> = {},
        source: string | null = 'web_app'
    ) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return; // Silent fail if not auth

            // Collect environment info
            const userAgent = navigator.userAgent;
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const utcOffset = new Date().getTimezoneOffset() * -1; // In minutes

            // RPC call
            const { error } = await supabase.rpc('log_user_event', {
                p_event_type: eventType,
                p_source: source,
                p_metadata: metadata,
                p_tz: tz,
                p_utc_offset_minutes: utcOffset,
                p_user_agent: userAgent
            });

            if (error) {
                console.warn('Failed to log user event:', error);
            }
        } catch (err) {
            console.warn('Error in useUserLogger:', err);
        }
    }, []);

    /**
     * Rate-limited session start logger.
     * Prevents spamming SESSION_START on every refresh.
     * Checks sessionStorage to see if we already logged this session recently.
     */
    const logSessionStart = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const userId = session.user.id;
        const LAST_SESSION_LOG_KEY = `last_session_log_${userId}`;
        const THROTTLE_MS = 30 * 60 * 1000; // 30 minutes

        const lastLog = localStorage.getItem(LAST_SESSION_LOG_KEY);
        const now = Date.now();

        if (lastLog && (now - parseInt(lastLog) < THROTTLE_MS)) {
            return; // Too soon
        }

        await logEvent('SESSION_START');
        localStorage.setItem(LAST_SESSION_LOG_KEY, now.toString());
    }, [logEvent]);

    return { logEvent, logSessionStart };
};
