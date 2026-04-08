import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EventType =
    | 'LOGIN' // Deprecated
    | 'LOGIN_SUCCESS'
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

// Global lock to prevent race conditions across hook instances
const inFlightRequests = new Set<string>();

export const useUserLogger = () => {
    // In-memory lock for this specific hook instance (legacy safety)
    const sessionStartLock = useRef(false);

    const logEvent = useCallback(async (
        eventType: EventType,
        metadata: Record<string, any> = {},
        origin: string | null = 'web_app'
    ) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            // Allow logging if session exists.
            if (!session?.user) return;

            const userId = session.user.id;
            const now = Date.now();

            // === DEDUPLICATION logic === 
            let lockKey = '';
            let releaseDelay = 0; // ms to keep lock after completion

            if (eventType === 'LOGIN_SUCCESS') {
                // Key: LOGIN_SUCCESS:<userId>:<requestId>
                // requestId MUST be passed in metadata for this to work effectively across calls
                const reqId = metadata.request_id || 'auto-gen';
                lockKey = `LOGIN_SUCCESS:${userId}:${reqId}`;
                releaseDelay = 5000; // Keep lock for 5s to prevent immediate re-login spam with same ID
            } else if (eventType === 'LOGOUT') {
                // Key: LOGOUT:<userId>:<5sec_bucket>
                // Bucket ensures only 1 logout attempt per 5 seconds is processed
                const bucket = Math.floor(now / 5000);
                lockKey = `LOGOUT:${userId}:${bucket}`;
                releaseDelay = 1000;
            } else if (eventType === 'SESSION_START') {
                // Key: SESSION_START:<userId>:<30min_bucket>
                const bucket = Math.floor(now / (30 * 60 * 1000));
                lockKey = `SESSION_START:${userId}:${bucket}`;
                releaseDelay = 1000;
            } else {
                // Generic lock
                lockKey = `${eventType}:${userId}:${now}`;
            }

            // Check Lock
            if (inFlightRequests.has(lockKey)) {
                console.log(`[Audit] Blocked duplicate ${eventType} (Client Lock): ${lockKey}`);
                return;
            }
            inFlightRequests.add(lockKey);

            // Collect environment info
            const userAgent = navigator.userAgent;
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const utcOffset = new Date().getTimezoneOffset() * -1; // In minutes

            // Ensure request_id exists
            const requestId = metadata.request_id || crypto.randomUUID();

            // Session fingerprint
            const sessionFingerprint = session.access_token
                ? session.access_token.substring(session.access_token.length - 8)
                : 'unknown';

            const finalMetadata = {
                ...metadata,
                request_id: requestId,
                session_fingerprint: sessionFingerprint,
                tz,
                utc_offset: utcOffset,
                user_agent: userAgent,
                dedupe_key: lockKey // Send lock key to backend for extra safety
            };

            // RPC call with NEW CANONICAL SIGNATURE
            // public.log_user_event(p_event_type, p_target_user_id, p_actor_user_id, p_origin, p_metadata, p_status)
            const { data, error } = await supabase.rpc('log_user_event', {
                p_event_type: eventType,
                p_target_user_id: userId,
                p_actor_user_id: userId,
                p_origin: origin || 'web_app',
                p_metadata: finalMetadata,
                p_status: 'SUCCESS'
            });

            if (error) {
                console.warn(`[Audit] Failed to log ${eventType} (RPC Error):`, error);
            } else {
                const res = data as any;
                if (res?.status === 'error') {
                    // Check if it's a duplicate key error (safe to ignore as it means deduplication worked)
                    if (res.message?.includes('duplicate key') || res.message?.includes('unique constraint')) {
                        console.log(`[Audit] ${eventType} ignored (Duplicate): Deduplication gate active.`);
                    } else {
                        console.error(`[Audit] Failed to log ${eventType} (Backend Error):`, res.message);
                    }
                } else if (res?.status === 'skipped') {
                    console.log(`[Audit] ${eventType} skipped: ${res.reason}`);
                } else {
                    console.log(`[Audit] Logging ${eventType}`, { requestId, logId: res.log_id });
                }
            }

            // Release lock after delay
            if (releaseDelay > 0) {
                setTimeout(() => {
                    inFlightRequests.delete(lockKey);
                }, releaseDelay);
            } else {
                inFlightRequests.delete(lockKey);
            }

        } catch (err) {
            console.warn('Error in useUserLogger:', err);
        }
    }, []);

    /**
     * Rate-limited session start logger.
     * Prevents spamming SESSION_START on every refresh.
     * Checks localStorage to see if we already logged this session recently.
     */
    const logSessionStart = useCallback(async () => {
        // Prevent concurrent calls in same instance
        if (sessionStartLock.current) return;
        sessionStartLock.current = true;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                sessionStartLock.current = false;
                return;
            }

            const userId = session.user.id;
            // New key format for the refactor
            const LAST_SESSION_LOG_KEY = `audit:last_session_start:${userId}`;
            const THROTTLE_MS = 30 * 60 * 1000; // 30 minutes

            const lastLog = localStorage.getItem(LAST_SESSION_LOG_KEY);
            const now = Date.now();
            const lastLogInt = parseInt(lastLog || '0');

            if (lastLog && !isNaN(lastLogInt) && (now - lastLogInt < THROTTLE_MS)) {
                // Client-side throttle
                // console.log('[Audit] SESSION_START throttled (client-side)');
                // Silenced to reduce noise
                sessionStartLock.current = false;
                return; // Too soon
            }

            // Attempt to log
            await logEvent('SESSION_START', {
                source: 'app_boot',
                url: window.location.href,
                referrer: document.referrer
            });
            // We set the timestamp optimistically.
            localStorage.setItem(LAST_SESSION_LOG_KEY, now.toString());

        } catch (e) {
            console.error('[Audit] Error in logSessionStart', e);
        } finally {
            // Release lock after a short delay
            setTimeout(() => {
                sessionStartLock.current = false;
            }, 1000);
        }
    }, [logEvent]);

    return { logEvent, logSessionStart };
};
