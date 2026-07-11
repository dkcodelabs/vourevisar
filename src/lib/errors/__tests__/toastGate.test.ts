
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toastGate } from '../toastGate';
import { toast } from '@/lib/toast';

// Mock dependencies
vi.mock('@/lib/toast', () => ({
    toast: {
        error: vi.fn(() => 'test-toast-id'),
        dismiss: vi.fn(),
        isActive: vi.fn(() => true), // Default to active for update logic
        update: vi.fn(),
    }
}));

describe('ToastGate Anti-Spam System', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        toastGate.resetForTesting();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should allow the first error toast', () => {
        toastGate.notifyError('First error', 'TEST-001', { severity: 'low' });
        expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it('should throttle identical flowKeys within 30 seconds', () => {
        // Set fixed time
        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 0));

        // First call
        toastGate.notifyError('Error A', 'TEST-FLOW-A', { severity: 'low', flowKey: 'flow-a' });
        expect(toast.error).toHaveBeenCalledTimes(1);

        // Second call immediately - should be blocked
        toastGate.notifyError('Error A', 'TEST-FLOW-A', { severity: 'low', flowKey: 'flow-a' });
        expect(toast.error).toHaveBeenCalledTimes(1);

        // Advance time by 31 seconds (Throttling is 30s)
        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 31));

        // Third call - should be allowed
        toastGate.notifyError('Error A', 'TEST-FLOW-A', { severity: 'low', flowKey: 'flow-a' });
        expect(toast.error).toHaveBeenCalledTimes(2);
    });

    it('should consolidate repeated errors in the same flow while the toast is active', () => {
        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 0));

        toastGate.notifyError('Erro de Conexão com Servidor', 'ERR-CON-0', {
            severity: 'medium',
            flowKey: 'connection-flow',
        });

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 1));
        toastGate.notifyError('Erro de Conexão com Servidor', 'ERR-CON-1', {
            severity: 'medium',
            flowKey: 'connection-flow',
        });

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.update).toHaveBeenCalledWith(
            'test-toast-id',
            expect.objectContaining({
                duration: 5000,
                render: expect.stringContaining('(+1 ocorrências similares)'),
                type: 'error',
            }),
        );
        expect(toast.update).toHaveBeenCalledWith(
            'test-toast-id',
            expect.objectContaining({
                render: expect.stringContaining('Último código: ERR-CON-1'),
            }),
        );
    });

    it('should respect max concurrency of 2', () => {
        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 0));

        // 1. Toast
        toastGate.notifyError('Toast 1', 'TEST-CONC-1', { severity: 'medium', flowKey: 'f1' });

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 1));
        // 2. Toast
        toastGate.notifyError('Toast 2', 'TEST-CONC-2', { severity: 'medium', flowKey: 'f2' });

        expect(toast.error).toHaveBeenCalledTimes(2);

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 2));
        // 3. Toast (Low) - Should be dropped if full and low priority
        toastGate.notifyError('Toast 3 (Low)', 'TEST-CONC-3', { severity: 'low', flowKey: 'f3' });

        // Should NOT increase called times if suppressed
        expect(toast.error).toHaveBeenCalledTimes(2);
    });

    it('should replace low severity with critical when full', () => {
        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 0));

        // Fill slots
        toastGate.notifyError('Low 1', 'LOW-1', { severity: 'low', flowKey: 'l1' });

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 1));
        toastGate.notifyError('Low 2', 'LOW-2', { severity: 'low', flowKey: 'l2' });

        expect(toast.error).toHaveBeenCalledTimes(2);

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 2));
        // Try Critical
        toastGate.notifyError('Critical', 'CRIT-1', { severity: 'critical', flowKey: 'c1' });

        // Expect dismiss to be called on one of the lows
        expect(toast.dismiss).toHaveBeenCalled();
        // Expect new error to be called
        expect(toast.error).toHaveBeenCalledTimes(3);
    });

    it('should drop low severity when full', () => {
        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 0));

        toastGate.notifyError('Low 1', 'LOW-DROP-1', { severity: 'low', flowKey: 'd1' });

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 1));
        toastGate.notifyError('Low 2', 'LOW-DROP-2', { severity: 'low', flowKey: 'd2' });

        expect(toast.error).toHaveBeenCalledTimes(2);

        vi.setSystemTime(new Date(2024, 1, 1, 10, 0, 2));
        // Try another Low
        toastGate.notifyError('Low 3', 'LOW-DROP-3', { severity: 'low', flowKey: 'd3' });

        // Should NOT dismiss (logic: if incoming < minScore, suppress. If == minScore, evict oldest? 
        // Implementation: if incoming >= minScore -> evict. Low (1) >= Low (1) -> should evict oldest!)

        // Wait, let's check code:
        // if (incomingScore >= minScore) { ... evict ... }
        // So Low SHOULD replace Low (rotating queue).

        // My previous logic: "If incoming is lower, suppress".
        // But here incoming (Low=1) == minScore (Low=1).
        // So it SHOULD evict oldest and show new one.

        expect(toast.dismiss).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledTimes(3);
    });
});
