import { describe, expect, it } from 'vitest';

import { formatRecoveredMergeTimestamp } from './recoveredMergeTimestamp';

describe('formatRecoveredMergeTimestamp', () => {
    it('formats a valid recovered merge timestamp for pt-BR', () => {
        expect(formatRecoveredMergeTimestamp('2026-07-04T14:30:00.000Z')).toContain('04/07/2026');
    });

    it('falls back to a human label when the timestamp is missing or invalid', () => {
        expect(formatRecoveredMergeTimestamp(null)).toBe('há pouco');
        expect(formatRecoveredMergeTimestamp(undefined)).toBe('há pouco');
        expect(formatRecoveredMergeTimestamp('not-a-date')).toBe('há pouco');
    });
});
