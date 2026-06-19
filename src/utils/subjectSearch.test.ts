import { describe, expect, it } from 'vitest';

import {
    filterSubjectsAccentInsensitive,
    resolveBulkSubjectName
} from '@/utils/subjectSearch';

describe('filterSubjectsAccentInsensitive', () => {
    const subjects = [
        { id: '1', name: 'Língua Portuguesa' },
        { id: '2', name: 'Noções de Administração' }
    ];

    it('matches subjects when the query omits accents', () => {
        expect(filterSubjectsAccentInsensitive?.(subjects, 'lingua portuguesa')).toEqual([
            subjects[0]
        ]);
        expect(filterSubjectsAccentInsensitive?.(subjects, 'nocoes')).toEqual([
            subjects[1]
        ]);
    });

    it('preserves the original subject name in suggestions', () => {
        const [suggestion] = filterSubjectsAccentInsensitive?.(subjects, 'lingua') || [];

        expect(suggestion?.name).toBe('Língua Portuguesa');
    });

    it('uses the real name when Enter or Tab has one matching suggestion', () => {
        expect(resolveBulkSubjectName?.([subjects[0]], -1, 'LINGUA PORTUGUESA'))
            .toBe('Língua Portuguesa');
    });

    it('uses the focused suggestion and avoids guessing between multiple matches', () => {
        expect(resolveBulkSubjectName?.(subjects, 1, 'NOCOES'))
            .toBe('Noções de Administração');
        expect(resolveBulkSubjectName?.(subjects, -1, 'NOVA'))
            .toBe('NOVA');
    });
});
