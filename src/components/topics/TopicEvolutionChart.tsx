import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryEntry {
  reviewed_at: string;
  difficulty_numeric: number | null;
  trend_label?: string | null;
}

interface TopicEvolutionChartProps {
  history: HistoryEntry[];
  /** Se true, mostra versão compacta (sem título e altura reduzida). Para uso no Dashboard. */
  compact?: boolean;
}

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Fácil',
  2: 'Médio',
  3: 'Difícil',
};

const CustomTooltip = ({ active, payload, label }: unknown) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value as number;
  return (
    <div className="bg-background/95 border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p
        className={`font-semibold ${
          value >= 3
            ? 'text-rose-500'
            : value === 2
            ? 'text-yellow-500'
            : 'text-emerald-500'
        }`}
      >
        {DIFFICULTY_LABEL[value] ?? `Nível ${value}`}
      </p>
    </div>
  );
};

export function TopicEvolutionChart({ history, compact = false }: TopicEvolutionChartProps) {
  const chartData = useMemo(() => {
    return history
      .filter((h) => h.difficulty_numeric != null)
      .map((h) => ({
        date: format(parseISO(h.reviewed_at), compact ? 'dd/MM' : "dd 'de' MMM", {
          locale: ptBR,
        }),
        difficulty: h.difficulty_numeric as number,
        trend: h.trend_label,
      }));
  }, [history, compact]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
        Sem histórico de revisões para exibir.
      </div>
    );
  }

  const height = compact ? 90 : 160;

  return (
    <div className="w-full">
      {!compact && (
        <p className="text-xs text-muted-foreground mb-2">
          Evolução da Dificuldade ao longo das revisões
        </p>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[1, 3]}
            ticks={[1, 2, 3]}
            tickFormatter={(v) => DIFFICULTY_LABEL[v] ?? v}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Linha de referência "Médio" */}
          <ReferenceLine
            y={2}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            strokeOpacity={0.4}
          />
          <Line
            type="monotone"
            dataKey="difficulty"
            stroke="url(#diffGradient)"
            strokeWidth={2.5}
            dot={(props: unknown) => {
              const { cx, cy, payload } = props;
              const color =
                payload.difficulty >= 3
                  ? '#f43f5e'
                  : payload.difficulty === 2
                  ? '#eab308'
                  : '#10b981';
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={color}
                  stroke="white"
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 6 }}
          />
          <defs>
            {/*
              Gradiente VERTICAL: a cor da linha reflete a posição no eixo Y (nível de dificuldade),
              NÃO a posição no tempo (eixo X).
              y1="0" = topo do gráfico = Difícil (3) → vermelho
              y=50%  = meio            = Médio (2)  → amarelo
              y1="1" = base do gráfico = Fácil (1)   → verde
            */}
            <linearGradient id="diffGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#f43f5e" />
              <stop offset="50%"  stopColor="#eab308" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
