/**
 * Calcula a próxima data de revisão com base num algoritmo de Repetição Espaçada (SRS), inspirado
 * no SM-2 e na curva original de Ebbinghaus, mas ajustado para os nossos perfis dinâmicos de aprendizado.
 */
import { ReviewProfile, REVIEW_PROFILES } from '../types/study';

const MARGEM_SEMANA_ZERO = 7; // Dias antes da prova em que blindamos o aluno

// Configuráveis para Status de Aprendizado (Podem ser calibrados conforme uso do motor)
export const SRS_THRESHOLDS = {
    STABILITY_LOW: 15,
    STABILITY_MID: 45,
    INTERVAL_LONG: 21, // Em dias
    MIN_CONSISTENCY: 4 // Número mínimo de revisões para ser considerado consistente
};

export type LearningStatus = 'Aprendendo' | 'Fixando' | 'Dominando';

export interface SRSMetrics {
    /** Estabilidade da memória (0 até infinito). Representa a força do traço de memória. */
    memoryStability: number;
    /** O intervalo que estava valendo antes da revisão de hoje (em dias). */
    currentInterval: number;
    /** Número de vezes que o tópico já foi revisado (0 para primeiro contato finalizado). */
    reviewCount: number;
}

export interface CalculateNextReviewParams {
    today: Date;
    /** O perfil escolhido pelo aluno (controla velocidade de expansão). */
    profile: ReviewProfile;
    metrics: SRSMetrics;
    /** Dificuldade marcada pelo aluno (1 = Difícil, 2 = Médio, 3 = Fácil). */
    difficulty?: number;
    examDate?: Date | null;
    /** Delta de tendência calculado a partir do histórico recente. Positivo = melhorando, negativo = piorando. */
    trendDelta?: number | null;
}

export interface CalculateNextReviewResult {
    nextReviewDate: Date;

    // Novas métricas de SRS calculadas que devem ser salvas no Topic
    newMemoryStability: number;
    newInterval: number;

    // Tratamento de prova mantido
    wasCompressed: boolean;
    compressionReason?: 'limit_exceeded' | 'limit_passed';
}

/**
 * Mapeamento do peso da resposta (Dificuldade).
 * No UI novo, 1 = Fácil, 2 = Médio, 3 = Difícil.
 */
const DIFFICULTY_MULTIPLIER: Record<number, number> = {
    1: 1.2,    // Muito Fácil: Estabilidade cresce +20% extra
    2: 1.0,    // Médio: Crescimento normal (100% do fator base)
    3: 0.6,    // Difícil: Estabilidade "punição" -40%
    4: 0.6,    // Fallback legado "Difícil"
    5: 0.4     // Fallback legado "Muito Difícil"
};

export function calculateNextReview(params: CalculateNextReviewParams): CalculateNextReviewResult {
    const { today, profile, metrics, difficulty = 2, examDate, trendDelta } = params;

    // Multiplicador de tendência: ajuste fino baseado na trajetória cognitiva recente
    let trendMultiplier = 1.0;
    if (trendDelta != null) {
        if (trendDelta <= -1.0) trendMultiplier = 0.9;      // Queda brusca → penalidade leve
        else if (trendDelta >= 1.0) trendMultiplier = 1.1;   // Melhora consistente → bônus leve
    }

    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const config = REVIEW_PROFILES[profile];

    // Extraindo dados para processamento
    const { memoryStability, currentInterval, reviewCount } = metrics;

    // Dificuldade informada, traduzida num multiplicador
    const diffMult = DIFFICULTY_MULTIPLIER[difficulty] || 1.0;

    let newInterval = 0;
    let newMemoryStability = memoryStability;

    // ==========================================
    // FASE 1: COLD START (PRIMEIRA REVISÃO DE TODAS)
    // Se o topic for novo (reviewCount == 0), a revisão VAI AGORA para sua primeira espaçada.
    // A regra dita que o primeiro salto é FIXO em 24h para proteger o primeiro esquecimento abrupto.
    // ==========================================
    if (reviewCount === 0 || currentInterval === 0) {
        newInterval = 1; // 24 horas fixas 
        // A estabilidade inicial brota aqui a partir do cfg do perfil ajustado se ele achou super fácil ou não.
        newMemoryStability = Math.max(0, config.initialStability * (diffMult >= 1 ? 1 : 0.8));
    }
    // ==========================================
    // FASE 2: WARM UP (Segunda/Terceira Revisão)
    // Para evitar que logo após 1 dia pule para 10 dias de uma vez no advanced,
    // colocamos um limite de que o intervalo inicial não pode bater o initialStability imediatamente.
    // ==========================================
    else if (reviewCount === 1) {
        // Saiu da revisão de "dia seguinte". 
        // Em vez de só pegar 1 * growth, damos o primeiro pontapé para os dias bases como 3, 5, 7.
        newMemoryStability = Math.max(0, memoryStability + (1.0 * diffMult * trendMultiplier)); // Cresce estabilidade c/ trend
        const fallbackStart = config.initialStability * diffMult;

        // Garante pelo menos 2 dias de intervalo, mas não mais que a estabilidade hard initial
        newInterval = Math.max(2, fallbackStart);
    }
    // ==========================================
    // FASE 3: MOTOR SRS PURO (Matéria Madura)
    // ==========================================
    else {
        // Se a pessoa errar muito, a estabilidade cai. Se acertar, sobe.
        // A taxa de subida é logarítmica ou atenuada levemente quanto mais alto ficar para não estourar (Ebbinghaus Flattening)
        const stabilityGain = config.baseGrowthFactor * diffMult * trendMultiplier;

        // Se cravou Difícil, punição não reduz para zero, mas corta o intervalo anterior
        if (difficulty >= 3) {
            newMemoryStability = Math.max(config.initialStability, memoryStability * diffMult);
            newInterval = Math.max(1, currentInterval * 0.5); // Cai o intervalo para a metade da última vez.
        } else {
            // Crescimento seguro de memória (c/ trend multiplier já incluso no stabilityGain)
            newMemoryStability = memoryStability + stabilityGain;

            // Intervalo = Estabilidade * (Ajuste). Na prática SRS, o intervalo atual se multiplica.
            let nextTentativeInterval = currentInterval * (config.baseGrowthFactor * diffMult);

            // Safety rule: Não pode crescer mais que ~2.5x o intervalo anterior (Soft Cap)
            const maxSafetyMultiplier = 2.5;
            if (nextTentativeInterval > currentInterval * maxSafetyMultiplier) {
                nextTentativeInterval = currentInterval * maxSafetyMultiplier;
            }

            newInterval = nextTentativeInterval;
        }
    }

    // Aplica o Hard Cap (Nunca passar de N dias definidos pelo Perfil, ex: 90 dias)
    if (newInterval > config.maxIntervalCap) {
        newInterval = config.maxIntervalCap;
    }

    // Arredonda para não gerar "2.445 dias"
    newInterval = Math.max(1, Math.round(newInterval));
    newMemoryStability = Math.max(0, Number(newMemoryStability.toFixed(2))); // Limpa o float e garante >= 0

    // 3. Calcular data tentativa base (Hoje + novo intervalo)
    let tentativeDate = new Date(todayStart);
    tentativeDate.setDate(tentativeDate.getDate() + newInterval);


    // =====================================================
    // TRATAMENTO DA PROVA (WEEK ZERO PROTECT)
    // =====================================================
    let wasCompressed = false;
    let compressionReason: 'limit_exceeded' | 'limit_passed' | undefined;

    if (examDate) {
        const examDateStart = new Date(examDate);
        examDateStart.setHours(0, 0, 0, 0);

        const limitDate = new Date(examDateStart);
        limitDate.setDate(limitDate.getDate() - MARGEM_SEMANA_ZERO);

        const tomorrow = new Date(todayStart);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (tentativeDate > limitDate) {
            wasCompressed = true;
            // Se o limite já passou, agenda pra amanhã correndo. Senão, esmaga no limite.
            if (limitDate <= todayStart) {
                tentativeDate = tomorrow;
                compressionReason = 'limit_passed';
            } else {
                tentativeDate = limitDate;
                compressionReason = 'limit_exceeded';
            }
        }
    }

    return {
        nextReviewDate: tentativeDate,
        newMemoryStability,
        newInterval,
        wasCompressed,
        compressionReason
    };
}

export function formatDateForDB(date: Date): string {
    return date.toISOString();
}

export function describeCalculation(result: CalculateNextReviewResult): string {
    const dateStr = result.nextReviewDate.toLocaleDateString('pt-BR');

    if (!result.wasCompressed) {
        return `Revisão SRS agendada p/ ${dateStr} (+${result.newInterval} dias). Estabilidade da Memória: ${result.newMemoryStability}`;
    }

    if (result.compressionReason === 'limit_passed') {
        return `⚠️ Limite da prova ignorou o SRS! Revisão de crise → ${dateStr}`;
    }

    return `📅 Revisão SRS comprimida pela Semana Zero → ${dateStr}`;
}
