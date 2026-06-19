import { describe, expect, it } from 'vitest';

import {
    editalHeaderBadgeTypography,
    editalHeaderExamBoardTypography,
    editalHeaderPositionTypography
} from '@/components/editais/editalHeaderTypography';

describe('EditalSubjectsModal header typography', () => {
    it('gives position and exam board the same deliberate spacing', () => {
        expect(editalHeaderPositionTypography).toBe(
            'text-[10px] font-bold uppercase tracking-[0.10em]'
        );
        expect(editalHeaderExamBoardTypography).toBe(
            'text-[10px] font-bold uppercase tracking-[0.10em]'
        );
    });

    it('uses the crisp typography from the reviews badge', () => {
        expect(editalHeaderBadgeTypography).toBe(
            'text-[10px] font-bold'
        );
    });
});
