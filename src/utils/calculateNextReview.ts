/**
 * Calcula a próxima data de revisão com base no algoritmo inteligente.
 * 
 * @description
 * SEM data_prova: Usa intervalo padrão do ciclo (Repetição Espaçada tradicional)
 * COM data_prova: Aplica ajuste de dificuldade + proteção da "Semana Zero"
 * 
 * Base Científica:
 * - Ebbinghaus (1885): Curva do Esquecimento
 * - Wozniak (1990): Algoritmo SM-2 (ajuste por dificuldade)
 * - Cepeda et al. (2006): Espaçamento Otimizado
 */

// Constantes do algoritmo
const MARGEM_SEMANA_ZERO = 7; // Dias antes da prova sem revisões

// Ajuste em dias baseado na dificuldade (1-5)
const AJUSTE_DIFICULDADE: Record<number, number> = {
    1: 2,   // Muito Fácil → +2 dias
    2: 1,   // Fácil → +1 dia
    3: 0,   // Normal → sem ajuste
    4: -1,  // Difícil → -1 dia
    5: -2,  // Muito Difícil → -2 dias
};

export interface CalculateNextReviewParams {
    /** Data atual (hoje) */
    today: Date;
    /** Intervalo base do ciclo em dias (1, 7, 15, 30, etc.) */
    intervalDays: number;
    /** Dificuldade marcada pelo aluno (1-5). Opcional - default 3 */
    difficulty?: number;
    /** Data da prova do usuário. NULL se não definida */
    examDate?: Date | null;
}

export interface CalculateNextReviewResult {
    /** Data calculada para a próxima revisão */
    nextReviewDate: Date;
    /** Se a data foi comprimida devido ao limite */
    wasCompressed: boolean;
    /** Motivo da compressão, se aplicável */
    compressionReason?: 'limit_exceeded' | 'limit_passed';
    /** Ajuste aplicado em dias (só quando tem data de prova) */
    adjustmentApplied: number;
}

/**
 * Calcula a próxima data de revisão
 */
export function calculateNextReview(params: CalculateNextReviewParams): CalculateNextReviewResult {
    const { today, intervalDays, difficulty = 3, examDate } = params;

    // Normalizar "hoje" para início do dia
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    // =====================================================
    // MODO PADRÃO: Sem data de prova = Repetição Espaçada simples
    // =====================================================
    if (!examDate) {
        const nextDate = new Date(todayStart);
        nextDate.setDate(nextDate.getDate() + intervalDays);

        return {
            nextReviewDate: nextDate,
            wasCompressed: false,
            adjustmentApplied: 0,
        };
    }

    // =====================================================
    // MODO PROVA: Com data de prova = Otimização inteligente
    // =====================================================

    // 1. Calcular o limite (Semana Zero)
    const examDateStart = new Date(examDate);
    examDateStart.setHours(0, 0, 0, 0);

    const limitDate = new Date(examDateStart);
    limitDate.setDate(limitDate.getDate() - MARGEM_SEMANA_ZERO);

    // 2. Obter ajuste por dificuldade
    const difficultyAdjust = AJUSTE_DIFICULDADE[difficulty] ?? 0;

    // 3. Calcular data tentativa
    let tentativeDate = new Date(todayStart);
    tentativeDate.setDate(tentativeDate.getDate() + intervalDays + difficultyAdjust);

    // 4. Garantir mínimo de 1 dia no futuro
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (tentativeDate <= todayStart) {
        tentativeDate = tomorrow;
    }

    // 5. Verificar se passou do limite
    let wasCompressed = false;
    let compressionReason: 'limit_exceeded' | 'limit_passed' | undefined;

    if (tentativeDate > limitDate) {
        wasCompressed = true;

        // Se o limite já passou ou é hoje, agenda pra amanhã
        if (limitDate <= todayStart) {
            tentativeDate = tomorrow;
            compressionReason = 'limit_passed';
        } else {
            // Força para o limite
            tentativeDate = limitDate;
            compressionReason = 'limit_exceeded';
        }
    }

    return {
        nextReviewDate: tentativeDate,
        wasCompressed,
        compressionReason,
        adjustmentApplied: difficultyAdjust,
    };
}

/**
 * Formata a data para ISO string (YYYY-MM-DD) para salvar no banco
 */
export function formatDateForDB(date: Date): string {
    return date.toISOString();
}

/**
 * Retorna uma descrição legível do resultado do cálculo
 * Útil para debugging e logs
 */
export function describeCalculation(result: CalculateNextReviewResult): string {
    const dateStr = result.nextReviewDate.toLocaleDateString('pt-BR');

    if (!result.wasCompressed) {
        if (result.adjustmentApplied !== 0) {
            const direction = result.adjustmentApplied > 0 ? 'adiada' : 'antecipada';
            return `Revisão ${direction} em ${Math.abs(result.adjustmentApplied)} dia(s) → ${dateStr}`;
        }
        return `Revisão agendada normalmente → ${dateStr}`;
    }

    if (result.compressionReason === 'limit_passed') {
        return `⚠️ Limite da prova já passou! Revisão urgente → ${dateStr}`;
    }

    return `📅 Revisão comprimida para o limite da Semana Zero → ${dateStr}`;
}
