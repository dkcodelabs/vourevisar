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

        // Tópicos avaliados com dificuldade 4 (Difícil) ou 5 (Muito Difícil)
        if (topic.difficulty >= 4) {
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
     * - Mais de 25% dos tópicos ativos estão atrasados
     * - OU Mais de 30% das avaliações foram "Difícil" ou superiores
     */
    if (overdueRate > 0.25 || highDifficultyRate > 0.3) {
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
