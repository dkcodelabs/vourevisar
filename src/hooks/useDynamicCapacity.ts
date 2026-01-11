import { useMemo } from 'react';
import { startOfDay, format } from 'date-fns';

interface ReviewHistoryItem {
    reviewed_at: string;
    // outros campos se necessário
}

/**
 * useDynamicCapacity Hook
 * 
 * Calcula a "Capacidade Dinâmica" do usuário baseada em seu histórico de performance real.
 * 
 * CONCEITOS IMPORTANTES:
 * 1. CAPACIDADE (Este Hook): O quanto o usuário CONSEGUE fazer. 
 *    É um limite sustentável observado. Não é meta, é baliza.
 *    Baseado no percentil 60 dos últimos 7 dias ativos.
 * 
 * 2. BACKLOG (ReviewForecastCard): O que o usuário PRECISA fazer.
 *    É a dívida acumulada (Atrasadas + Hoje).
 * 
 * 3. FORECAST (ReviewForecastCard): O que o usuário DEVERIA fazer para limpar a dívida.
 *    É uma projeção matemática para zerar o backlog em X dias.
 * 
 * A regra de ouro é: 
 * - Se Backlog > Capacidade, o sistema sugere fazer a Capacidade (e não o Backlog inteiro).
 * - Isso evita ansiedade e burnout.
 */
export const useDynamicCapacity = (
    reviewData: ReviewHistoryItem[] = [],
    fallbackCapacity: number = 5 // Fallback padrão alterado para 5 conforme prompt de validação
): number => {
    // startOfDay garante estabilidade durante o dia. Só mudará quando o dia virar.
    const today = startOfDay(new Date());

    const capacity = useMemo(() => {
        if (!reviewData || reviewData.length === 0) return fallbackCapacity;

        // 1. Agrupar por data (YYYY-MM-DD)
        const countsByDate: Record<string, number> = {};

        reviewData.forEach(item => {
            if (!item.reviewed_at) return;
            const date = new Date(item.reviewed_at);
            const dateKey = format(date, 'yyyy-MM-dd');
            countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
        });

        const todayKey = format(today, 'yyyy-MM-dd');

        // 2. Filtrar dias válidos (DIAS ATIVOS)
        // Regra 1: Ignorar completamente o dia atual (hoje) para garantir estabilidade.
        // Regra 2: Dias Ativos são aqueles com contagem > 0.
        // Ordenar cronologicamente inverso (mais recente primeiro)
        const sortedActiveDaysCounts = Object.entries(countsByDate)
            .filter(([dateKey]) => dateKey !== todayKey) // Ignora hoje
            .sort((a, b) => b[0].localeCompare(a[0])) // Mais recentes primeiro
            .map(([_, count]) => count);

        // 3. Verificação de Dados Suficientes
        // Regra: Se houver menos de 3 dias ativos HISTÓRICOS, usar fallback.
        if (sortedActiveDaysCounts.length < 3) {
            return fallbackCapacity;
        }

        // 4. Selecionar Janela (Últimos 7 dias ATIVOS)
        // Não são 7 dias corridos, mas sim as últimas 7 vezes que o usuário estudou.
        const windowCounts = sortedActiveDaysCounts.slice(0, 7);

        // 5. Calcular Percentil 60
        // Ordenar os valores da janela (ASC) para cálculo de percentil
        const sortedWindowCounts = [...windowCounts].sort((a, b) => a - b);

        // Índice P60: index = ceil(N * 0.6) - 1
        // O Percentil 60 representa um valor que o usuário superou em 40% dos seus melhores dias na janela.
        const index = Math.ceil(sortedWindowCounts.length * 0.6) - 1;
        const p60 = sortedWindowCounts[Math.max(0, index)];

        // Garante que a capacidade nunca seja zero se o algoritmo falhar (embora activeDays > 0 garanta >=1)
        return Math.max(1, p60);

    }, [reviewData, fallbackCapacity, today]);

    return capacity;
};
