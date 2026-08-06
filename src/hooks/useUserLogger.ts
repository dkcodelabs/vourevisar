import { useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { invokeUserRpc } from '@/services/userRpcService';

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

interface AuditLogResponse {
    status?: 'error' | 'skipped' | 'success';
    message?: string;
    reason?: string;
    log_id?: string;
}

interface LoggerSessionContext {
    user: User;
    accessToken?: string | null;
}

// Global lock to prevent race conditions across hook instances
const inFlightRequests = new Set<string>();

export const useUserLogger = () => {
    // In-memory lock for this specific hook instance (legacy safety)
    const sessionStartLock = useRef(false);

    const logEvent = useCallback(async (
        eventType: EventType,
        metadata: Record<string, unknown> = {},
        origin: string | null = 'web_app',
        sessionContext?: LoggerSessionContext
    ) => {
        let lockKey: string | null = null;
        try {
            const session = sessionContext?.accessToken
                ? { user: sessionContext.user, access_token: sessionContext.accessToken }
                : (await supabase.auth.getSession()).data.session;

            if (!session?.user) return;
            if (sessionContext && session.user.id !== sessionContext.user.id) return;

            const userId = session.user.id;
            const now = Date.now();

            // === DEDUPLICATION logic === 
            let resolvedLockKey = '';
            let releaseDelay = 0; // ms to keep lock after completion

            if (eventType === 'LOGIN_SUCCESS') {
                // Key: LOGIN_SUCCESS:<userId>:<requestId>
                // requestId MUST be passed in metadata for this to work effectively across calls
                const reqId = metadata.request_id || 'auto-gen';
                resolvedLockKey = `LOGIN_SUCCESS:${userId}:${reqId}`;
                releaseDelay = 5000; // Keep lock for 5s to prevent immediate re-login spam with same ID
            } else if (eventType === 'LOGOUT') {
                // Key: LOGOUT:<userId>:<5sec_bucket>
                // Bucket ensures only 1 logout attempt per 5 seconds is processed
                const bucket = Math.floor(now / 5000);
                resolvedLockKey = `LOGOUT:${userId}:${bucket}`;
                releaseDelay = 1000;
            } else if (eventType === 'SESSION_START') {
                // Key: SESSION_START:<userId>:<30min_bucket>
                const bucket = Math.floor(now / (30 * 60 * 1000));
                resolvedLockKey = `SESSION_START:${userId}:${bucket}`;
                releaseDelay = 1000;
            } else {
                // Generic lock
                resolvedLockKey = `${eventType}:${userId}:${now}`;
            }
            lockKey = resolvedLockKey;

            // Check Lock
            if (inFlightRequests.has(resolvedLockKey)) {
                return;
            }
            inFlightRequests.add(resolvedLockKey);

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
                dedupe_key: resolvedLockKey // Send lock key to backend for extra safety
            };

            // public.log_user_event(p_event_type, p_target_user_id, p_actor_user_id, p_origin, p_metadata, p_status)
            const data = await invokeUserRpc<AuditLogResponse | null>('log_user_event', {
                p_event_type: eventType,
                p_target_user_id: userId,
                p_actor_user_id: userId,
                p_origin: origin || 'web_app',
                p_metadata: finalMetadata,
                p_status: 'SUCCESS'
            }, session.access_token);

            const res = data as AuditLogResponse | null;
            if (res?.status === 'error') {
                // Check if it's a duplicate key error (safe to ignore as it means deduplication worked)
                if (!(res.message?.includes('duplicate key') || res.message?.includes('unique constraint'))) {
                    console.error(`[Audit] Failed to log ${eventType} (Backend Error):`, res.message);
                }
            }

            // Release lock after delay
            if (releaseDelay > 0) {
                setTimeout(() => {
                    inFlightRequests.delete(resolvedLockKey);
                }, releaseDelay);
            } else {
                inFlightRequests.delete(resolvedLockKey);
            }

        } catch (err) {
            // Audit is best-effort. A stale token during auth bootstrap must
            // never sign the user out or turn a successful login into a data
            // loading error.
            if (lockKey) inFlightRequests.delete(lockKey);
        }
    }, []);

    /**
     * Rate-limited session start logger.
     * Prevents spamming SESSION_START on every refresh.
     * Checks localStorage to see if we already logged this session recently.
     */
    const logSessionStart = useCallback(async (currentUser?: User | null) => {
        // Prevent concurrent calls in same instance
        if (sessionStartLock.current) return;
        sessionStartLock.current = true;

        try {
            if (!currentUser) {
                sessionStartLock.current = false;
                return;
            }

            const userId = currentUser.id;
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token || session.user.id !== currentUser.id) return;

            await logEvent('SESSION_START', {
                source: 'app_boot',
                url: window.location.href,
                referrer: document.referrer
            }, 'web_app', { user: currentUser, accessToken: session.access_token });
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
