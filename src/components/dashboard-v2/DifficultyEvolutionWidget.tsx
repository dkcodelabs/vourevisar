/**
 * DifficultyEvolutionWidget — Widget macro do Dashboard que exibe a curva de evolução
 * de dificuldade agregada de todas as revisões do usuário no ciclo atual.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchDifficultyEvolution } from '@/services/difficultyEvolutionService';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp } from 'lucide-react';
import { TopicEvolutionChart } from '@/components/topics/TopicEvolutionChart';

interface DifficultyEvolutionWidgetProps {
  cycleId?: string;
}

export function DifficultyEvolutionWidget({ cycleId }: DifficultyEvolutionWidgetProps) {
  const { user } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['dashboard-difficulty-evolution', user?.id, cycleId],
    queryFn: async () => {
      if (!user) return [];
      return fetchDifficultyEvolution(user.id, cycleId);
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-card/60 border border-border/50 h-36" />
    );
  }

  if (entries.length < 2) return null;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-foreground">Evolução Geral da Dificuldade</span>
        <span className="text-xs text-muted-foreground ml-auto">{entries.length} revisões</span>
      </div>
      <TopicEvolutionChart history={entries} compact />
    </div>
  );
}
