/**
 * SubjectSparkline — Mini gráfico de tendência de dificuldade para o card de matéria.
 * Busca o histórico de revisões da matéria e renderiza uma linha compacta sem eixos.
 * Só aparece se houver >= 2 revisões com avaliação de dificuldade.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface SubjectSparklineProps {
  subjectId: string;
}

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Difícil',
  2: 'Médio',
  3: 'Fácil',
};

const SparkTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value as number;
  return (
    <div className="bg-background/95 border border-border rounded-lg px-2 py-1 shadow-lg text-[10px] whitespace-nowrap">
      <span className={
        v >= 3 ? 'text-emerald-500 font-semibold' :
        v === 2 ? 'text-yellow-500 font-semibold' :
                  'text-rose-500 font-semibold'
      }>
        {DIFFICULTY_LABEL[v] ?? `Nível ${v}`}
      </span>
    </div>
  );
};

export function SubjectSparkline({ subjectId }: SubjectSparklineProps) {
  const { user } = useAuth();

  const { data: points = [] } = useQuery({
    queryKey: ['subject-sparkline', subjectId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Buscar topic_ids da matéria primeiro
      const { data: topics } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', subjectId);

      if (!topics?.length) return [];

      const topicIds = topics.map(t => t.id);

      const { data, error } = await (supabase as any)
        .from('topic_review_history')
        .select('reviewed_at, difficulty_numeric')
        .in('topic_id', topicIds)
        .not('difficulty_numeric', 'is', null)
        .order('reviewed_at', { ascending: true });

      if (error || !data) return [];
      return data.map((d: any) => ({ v: d.difficulty_numeric as number }));
    },
    enabled: !!user && !!subjectId,
    staleTime: 1000 * 60 * 5, // 5min cache
  });

  // Só renderiza com histórico suficiente
  // Se não houver histórico, mostrar placeholder sutil
  if (points.length < 2) {
    return (
      <div className="hidden sm:flex flex-col items-center gap-0.5 opacity-20 filter grayscale" title="Aguardando dados de revisão">
        <ResponsiveContainer width={72} height={28}>
          <LineChart data={[{ v: 2 }, { v: 2 }]} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line
              type="monotone"
              dataKey="v"
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <span className="text-[8px] font-bold text-slate-400">Evoluindo...</span>
      </div>
    );
  }

  // Determinar tendência geral para a cor da linha
  const first = points[0].v;
  const last = points[points.length - 1].v;
  const lineColor = last > first ? '#10b981' : last < first ? '#f43f5e' : '#eab308';
  const trendLabel = last > first ? '↑ Melhorando' : last < first ? '↓ Piorando' : '→ Estável';

  return (
    <div
      className="hidden sm:flex flex-col items-center gap-0.5"
      title={`Evolução: ${trendLabel}`}
    >
      <ResponsiveContainer width={72} height={28}>
        <LineChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Tooltip content={<SparkTooltip />} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
      <span className={`text-[8px] font-bold tabular-nums ${
        last > first ? 'text-emerald-500' :
        last < first ? 'text-rose-500' : 'text-yellow-500'
      }`}>
        {trendLabel}
      </span>
    </div>
  );
}
