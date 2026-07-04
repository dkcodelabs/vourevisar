import { describe, expect, it } from 'vitest';

import { shouldBlockCycleConflictClose } from './cycleConflictModalClose';

describe('shouldBlockCycleConflictClose', () => {
    it('allows the close button after a composed cycle reaches success because defaults are already persisted', () => {
        expect(shouldBlockCycleConflictClose({
            action: 'merge',
            isAnalyzingTopics: false,
            isMerging: false,
            source: 'button',
            step: 'success',
        })).toBe(false);
    });

    it('keeps backdrop dismiss blocked on composed-cycle success to avoid accidental closure', () => {
        expect(shouldBlockCycleConflictClose({
            action: 'merge',
            isAnalyzingTopics: false,
            isMerging: false,
            source: 'backdrop',
            step: 'success',
        })).toBe(true);
    });

    it('blocks closing while a non-success cycle operation is still running', () => {
        expect(shouldBlockCycleConflictClose({
            action: 'merge',
            isAnalyzingTopics: false,
            isMerging: true,
            source: 'button',
            step: 'preview',
        })).toBe(true);
    });
});
