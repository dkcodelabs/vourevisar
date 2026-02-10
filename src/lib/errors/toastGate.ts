import { toast } from '@/lib/toast';
import { ErrorSeverity } from './errorEvent.contract';

interface ToastGateOptions {
    fingerprint?: string;
    flowKey?: string;
    severity?: ErrorSeverity;
    actionLabel?: string;
    onAction?: () => void;
}

interface ActiveToastState {
    toastId: string | number;
    count: number;
    firstSeen: number;
    lastSeen: number;
    severity: ErrorSeverity;
    message: string;
    flowKey: string;
}

const MAX_CONCURRENT_TOASTS = 2; // Strict limit: max 2 error toasts visible
const CONSOLIDATION_WINDOW_MS = 10000; // 10s to group errors in same flow
const THROTTLE_WINDOW_MS = 30000; // 30s to ignore exact same error

class ToastGate {
    private static instance: ToastGate;
    private activeToasts: Map<string, ActiveToastState> = new Map(); // Key -> State
    private recentFingerprints: Map<string, number> = new Map(); // Fingerprint -> Timestamp

    private constructor() { }

    public static getInstance(): ToastGate {
        if (!ToastGate.instance) {
            ToastGate.instance = new ToastGate();
        }
        return ToastGate.instance;
    }

    /**
     * Central entry point for all error notifications.
     * Enforces anti-spam rules, concurrency limits, and consolidation.
     */
    public notifyError(message: string, errorId: string, options: ToastGateOptions = {}) {
        const now = Date.now();
        const severity = options.severity || 'medium';
        const flowKey = options.flowKey || 'default';
        const fingerprint = options.fingerprint || `${flowKey}|${message}`;

        // 1. Throttle Check (Dedupe identical errors)
        if (this.recentFingerprints.has(fingerprint)) {
            const lastSeen = this.recentFingerprints.get(fingerprint)!;
            if (now - lastSeen < THROTTLE_WINDOW_MS) {
                console.debug('[ToastGate] Error suppressed (Throttle):', fingerprint);
                return; // Silently ignore
            }
        }
        this.recentFingerprints.set(fingerprint, now);

        // 2. Consolidation Check (Group by Flow)
        // Check if there is an ACTIVE toast for this flowKey
        const existingToastKey = this.findActiveToastKey(flowKey);

        if (existingToastKey) {
            const state = this.activeToasts.get(existingToastKey)!;

            // If within consolidation window, just update the counter
            // Or if it's the specific same toast ID still active
            if (toast.isActive(state.toastId) && (now - state.firstSeen < CONSOLIDATION_WINDOW_MS)) {
                this.updateToast(existingToastKey, state, message, errorId);
                return;
            } else {
                // Toast expired or window passed, remove from tracking to allow new one
                this.activeToasts.delete(existingToastKey);
            }
        }

        // 3. Concurrency Check (Max Limit)
        this.enforceConcurrencyLimit(severity);

        // 4. Emit New Toast
        this.emitToast(message, errorId, severity, flowKey);
    }

    private findActiveToastKey(flowKey: string): string | undefined {
        for (const [key, state] of this.activeToasts.entries()) {
            if (state.flowKey === flowKey) {
                return key;
            }
        }
        return undefined;
    }

    private updateToast(key: string, state: ActiveToastState, newMessage: string, latestErrorId: string) {
        state.count++;
        state.lastSeen = Date.now();

        const consolidatedMessage = `${state.message}\n\n(+${state.count - 1} ocorrências similares)\nÚltimo código: ${latestErrorId}`;

        toast.update(state.toastId, {
            render: consolidatedMessage,
            type: 'error',
            autoClose: 5000 // Reset timer
        });

        console.debug('[ToastGate] Toast updated (Consolidation):', state.toastId, state.count);
    }

    private enforceConcurrencyLimit(incomingSeverity: ErrorSeverity) {
        // Clean up tracking of inactive toasts first
        for (const [key, state] of this.activeToasts.entries()) {
            if (!toast.isActive(state.toastId)) {
                this.activeToasts.delete(key);
            }
        }

        if (this.activeToasts.size < MAX_CONCURRENT_TOASTS) return;

        // If full, decide who to evict
        // Priority: Critical > High > Medium > Low
        // If incoming is higher/equal to lowest active, evict lowest active.

        const severityScore = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };

        // Find candidate to evict (lowest severity, then oldest)
        let evictKey: string | null = null;
        let minScore = 999;
        let oldestTime = Date.now();

        for (const [key, state] of this.activeToasts.entries()) {
            const score = severityScore[state.severity] || 1;
            if (score < minScore) {
                minScore = score;
                oldestTime = state.firstSeen;
                evictKey = key;
            } else if (score === minScore && state.firstSeen < oldestTime) {
                oldestTime = state.firstSeen;
                evictKey = key;
            }
        }

        const incomingScore = severityScore[incomingSeverity] || 1;

        if (evictKey && incomingScore >= minScore) {
            const state = this.activeToasts.get(evictKey)!;
            toast.dismiss(state.toastId);
            this.activeToasts.delete(evictKey);
            console.debug('[ToastGate] Toast evicted for higher priority:', state.toastId);
        } else {
            // Incoming is lower priority than all displayed, suppression happens implicitly? 
            // Logic says: if we can't evict, we shouldn't show.
            // But wait, if we are here, we are about to emit. 
            // If we didn't evict, we effectively overflow. 
            // To strictly enforce max 2, we MUST evict someone or NOT emit.
            // If incomig < minScore, we should NOT emit.
            if (incomingScore < minScore) {
                // Throwing an error here would stop execution, but notifyError is void.
                // We should just return and not emit. But how to signal? 
                // It's better to just evict the oldest regardless of priority if equal, 
                // but if strictly lower, maybe suppress?
                // Let's stick to "Evict oldest" strategy if simple, 
                // but user asked "Toast with higher severity replaces...".
                // So if incoming is LOWER, it gets suppressed.
                console.debug('[ToastGate] Incoming error suppressed (Low Priority & Full)', incomingSeverity);
                throw new Error('ToastGate: Suppressed'); // Internal check to skip emit
            }
        }
    }

    private emitToast(message: string, errorId: string, severity: ErrorSeverity, flowKey: string) {
        // Double check limit (in case eviction failed or raced)
        if (this.activeToasts.size >= MAX_CONCURRENT_TOASTS) {
            // Fallback: Force evict oldest
            const oldest = this.activeToasts.keys().next().value;
            if (oldest) {
                toast.dismiss(this.activeToasts.get(oldest)!.toastId);
                this.activeToasts.delete(oldest);
            }
        }

        const fullMessage = `${message}\n\nCódigo: ${errorId}`;
        const key = `${flowKey}-${Date.now()}`;

        // Use a persistent ID if possible? No, let toast generate it.
        // Actually, we can't easily get the ID back from toast.error if we need it synchronously for the map?
        // react-toastify returns id synchronously.

        const toastId = toast.error(fullMessage, {
            autoClose: severity === 'critical' ? false : 6000, // Critical stays until dismissed
            onClose: () => {
                this.activeToasts.delete(key);
            }
        });

        this.activeToasts.set(key, {
            toastId,
            count: 1,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            severity,
            message,
            flowKey
        });

        console.debug('[ToastGate] Toast emitted:', toastId, flowKey);
    }
}

export const toastGate = ToastGate.getInstance();
