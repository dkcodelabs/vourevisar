import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAiEditalExtraction } from './useAiEditalExtraction';

// Mock contexts and external services
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user-id' },
    }),
}));

const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
            }),
            delete: mockDelete,
        }),
    },
}));

vi.mock('@/services/userRpcService', () => ({
    invokeUserRpc: vi.fn().mockResolvedValue({
        limit: 10,
        usage: 2,
        remaining: 8,
        can_import: true,
        has_bypass: false,
    }),
}));

describe('useAiEditalExtraction - discardPendingExtractionData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('limpa completamente todos os campos de edital, cargo, banca e arquivos ao descartar rascunho', async () => {
        const { result } = renderHook(() => useAiEditalExtraction(true, 'ia'));

        // Simula campos preenchidos de uma extração anterior
        act(() => {
            result.current.setIaOrigin('OGMO/ES');
            result.current.setIaPosition('Trabalhador Portuário');
            result.current.setIaBanca('IDCAP');
            result.current.setIaYear('2022');
            result.current.setExamDate('2022-12-01');
            result.current.setInputText('Texto do edital antigo');
            result.current.setSelectedCargoId('cargo-antigo-1');
            result.current.setSelectedCargoName('Trabalhador Portuário');
            result.current.setShowOptionalContext(true);
            result.current.setIaErrorMessage('Algum erro antigo');
        });

        expect(result.current.iaOrigin).toBe('OGMO/ES');
        expect(result.current.iaPosition).toBe('Trabalhador Portuário');
        expect(result.current.iaBanca).toBe('IDCAP');
        expect(result.current.selectedCargoName).toBe('Trabalhador Portuário');

        // Executa o descarte
        await act(async () => {
            await result.current.discardPendingExtractionData();
        });

        // Todos os campos devem ter sido limpos
        expect(result.current.iaOrigin).toBe('');
        expect(result.current.iaPosition).toBe('');
        expect(result.current.iaBanca).toBe('');
        expect(result.current.iaYear).toBe('');
        expect(result.current.examDate).toBe('');
        expect(result.current.inputText).toBe('');
        expect(result.current.selectedCargoId).toBe('');
        expect(result.current.selectedCargoName).toBe('');
        expect(result.current.pdfFiles).toEqual([]);
        expect(result.current.showOptionalContext).toBe(false);
        expect(result.current.iaErrorMessage).toBe('');
        expect(result.current.iaStage).toBe('input');
        expect(result.current.pendingExtraction).toBeNull();
    });
});
