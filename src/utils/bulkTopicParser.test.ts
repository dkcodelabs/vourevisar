import { describe, expect, it } from 'vitest';

import { parseBulkTopics, shouldAdvanceToBulkTopics } from '@/utils/bulkTopicParser';

describe('parseBulkTopics', () => {
    it('separates topics by semicolon and line break', () => {
        expect(parseBulkTopics?.('Teste A; Teste B\nTeste C')).toEqual([
            'Teste A',
            'Teste B',
            'Teste C'
        ]);
    });

    it('preserves commas and punctuation inside a topic', () => {
        expect(parseBulkTopics?.('Classes de palavras, morfologia e sintaxe; Crase')).toEqual([
            'Classes de palavras, morfologia e sintaxe',
            'Crase'
        ]);
    });

    it('ignores empty entries', () => {
        expect(parseBulkTopics?.('  Teste A ;;\n\n Teste B  ')).toEqual([
            'Teste A',
            'Teste B'
        ]);
    });

    it('returns no topics when the input only has separators', () => {
        expect(parseBulkTopics?.(' ;;\n\n ')).toEqual([]);
    });

    it('advances from the subject field with Enter or forward Tab', () => {
        expect(shouldAdvanceToBulkTopics?.('Enter', false)).toBe(true);
        expect(shouldAdvanceToBulkTopics?.('Tab', false)).toBe(true);
        expect(shouldAdvanceToBulkTopics?.('Tab', true)).toBe(false);
        expect(shouldAdvanceToBulkTopics?.('ArrowDown', false)).toBe(false);
    });
});
