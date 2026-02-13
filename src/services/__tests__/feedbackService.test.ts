import { describe, it, expect } from 'vitest';
import { isValidTransition, normalizeFeedbackStatus, getFeedbackStatusLabel, FeedbackStatus } from '../feedbackService';

describe('FeedbackService', () => {
    describe('normalizeFeedbackStatus', () => {
        it('should normalize legacy statuses', () => {
            expect(normalizeFeedbackStatus('new')).toBe('nova');
            expect(normalizeFeedbackStatus('triaged')).toBe('planejada');
            expect(normalizeFeedbackStatus('in_progress')).toBe('em_desenvolvimento');
            expect(normalizeFeedbackStatus('resolved')).toBe('concluida');
            expect(normalizeFeedbackStatus('wont_fix')).toBe('nao_planejada');
        });

        it('should return known statuses as is', () => {
            expect(normalizeFeedbackStatus('nova')).toBe('nova');
            expect(normalizeFeedbackStatus('planejada')).toBe('planejada');
        });

        it('should return unknown statuses as is (fallback)', () => {
            expect(normalizeFeedbackStatus('unknown_status')).toBe('unknown_status' as FeedbackStatus);
        });
    });

    describe('getFeedbackStatusLabel', () => {
        it('should return PT-BR labels', () => {
            expect(getFeedbackStatusLabel('nova')).toBe('Nova');
            expect(getFeedbackStatusLabel('new')).toBe('Nova');
            expect(getFeedbackStatusLabel('concluida')).toBe('Concluída');
        });
    });

    describe('isValidTransition', () => {
        it('should allow same status transition', () => {
            expect(isValidTransition('nova', 'nova')).toBe(true);
        });

        it('should allow valid transitions from Nova', () => {
            expect(isValidTransition('nova', 'planejada')).toBe(true);
            expect(isValidTransition('nova', 'nao_planejada')).toBe(true);
        });

        it('should deny invalid transitions (mock restrictions)', () => {
            // Nova -> ? (Nova allows almost everything in our permissive map, let's check Concluida -> Nova)
            // In our map: concluida: ['em_desenvolvimento', 'planejada']
            expect(isValidTransition('concluida', 'nova')).toBe(false);
            expect(isValidTransition('concluida', 'nao_planejada')).toBe(false);
        });

        it('should allow reopening concluded feedback', () => {
            expect(isValidTransition('concluida', 'em_desenvolvimento')).toBe(true);
        });
    });
});
