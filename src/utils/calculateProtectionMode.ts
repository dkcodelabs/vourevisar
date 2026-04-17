import { RevisionItem, RevisionStatus } from '@/types/revision';

export type ProtectionMode = 'Alta' | 'Média' | 'Baixa';

export function calculateProtectionMode(topics: RevisionItem[]): ProtectionMode {
    if (!topics || topics.length === 0) {
        return 'Média'; // Padrão seguro para iniciar
    }

    let overdueCount = 0;
    let highDifficultyCount = 0;
    let totalAssessed = 0;
    let totalActive = 0; // Tópicos iniciados e não finalizados

    for (const topic of topics) {
        // Ignorar tópicos não iniciados ou concluídos no cálculo principal de urgência
        if (topic.status === RevisionStatus.UNSTARTED || topic.status === RevisionStatus.COMPLETED) {
            continue;
        }

        totalActive++;

        if (topic.status === RevisionStatus.OVERDUE) {
            overdueCount++;
        }

        // Tópicos avaliados com dificuldade 3 (Difícil) na nova escala
        if (topic.difficulty === 3) {
            highDifficultyCount++;
        }

        if (topic.difficulty > 0) {
            totalAssessed++;
        }
    }

    if (totalActive === 0) {
        return 'Média';
    }

    // Calcular percentuais
    const overdueRate = overdueCount / totalActive;
    const highDifficultyRate = totalAssessed > 0 ? (highDifficultyCount / totalAssessed) : 0;

    /**
     * MATRIZ DE PROTEÇÃO
     * 
     * ALTA PROTEÇÃO (Crescimento lento de intervalos, retenção prioritária)
     * - Volume representativo (>= 5 tópicos) e mais de 25% atrasados, OU
     * - Absoluto alto (> 3 atrasos quebram a inércia do aluno novato), OU
     * - Volume avaliado (>= 3 revisões avaliadas) e > 30% relatam "Dificuldade 3"
     */
    if (
        (overdueRate > 0.25 && totalActive >= 5) || 
        overdueCount > 3 || 
        (highDifficultyRate > 0.3 && totalAssessed >= 3)
    ) {
        return 'Alta';
    }

    /**
     * BAIXA PROTEÇÃO (Crescimento de intervalo acelerado, eficiência prioritária)
     * - Menos de 5% atrasado
     * - E menos de 10% avaliados como "Difícil" ou superior
     * - E volume suficiente para gerar confiança (> 5 ativos)
     */
    if (overdueRate < 0.05 && highDifficultyRate < 0.1 && totalActive > 5) {
        return 'Baixa';
    }

    // DEFAULT (Crescimento balanceado)
    return 'Média';
}
