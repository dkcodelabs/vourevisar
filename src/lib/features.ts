/**
 * Feature Flags System
 *
 * Centraliza o controle de funcionalidades que podem ser ativadas/desativadas.
 * Permite override via localStorage para testes em produção.
 *
 * Como usar:
 * import { features } from '@/lib/features';
 * if (features.STUDENT_HUB) { ... }
 *
 * Para ativar em prod (console):
 * window.FEATURES.STUDENT_HUB = true
 */

const getFeatureFlag = (key: string, defaultValue: boolean): boolean => {
    if (typeof window === 'undefined') return defaultValue;

    // 1. Tenta override manual no localStorage
    const stored = window.localStorage.getItem(`FEATURE_${key}`);
    if (stored !== null) {
        return stored === 'true';
    }

    // 2. Retorna valor padrão (configurado por ambiente se necessário)
    return defaultValue;
};

export const features = {
    // Central do Aluno (Notificações + Feedback)
    // ATIVADO NA RELEASE v1.0 (13/02/2026)
    STUDENT_HUB: getFeatureFlag('STUDENT_HUB', true),
};

// Expor no window para debug/override fácil
if (typeof window !== 'undefined') {
    // @ts-expect-error Tipagem global intencional para compatibilidade
    window.FEATURES = {
        enable: (key: keyof typeof features) => {
            window.localStorage.setItem(`FEATURE_${key}`, 'true');
            window.location.reload();
        },
        disable: (key: keyof typeof features) => {
            window.localStorage.setItem(`FEATURE_${key}`, 'false');
            window.location.reload();
        },
        reset: (key: keyof typeof features) => {
            window.localStorage.removeItem(`FEATURE_${key}`);
            window.location.reload();
        },
    };
}
