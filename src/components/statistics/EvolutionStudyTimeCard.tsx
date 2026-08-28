import { Activity, Clock3, Flame } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CycleStatisticsTime } from '@/types/cycleStatistics';
import { formatStudyMinutes } from '@/utils/cycleStatistics';

type EvolutionStudyTimeCardProps = {
  time: CycleStatisticsTime;
};

export function EvolutionStudyTimeCard({ time }: EvolutionStudyTimeCardProps) {
  const comparisonLabel = time.isAllCycle
    ? 'Desde o início deste ciclo'
    : time.previousPeriodMinutes === 0
    ? 'Sem base no período anterior'
    : `${Math.abs(time.comparisonPercentage ?? 0)}% ${Number(time.comparisonPercentage) >= 0 ? 'a mais' : 'a menos'} que antes`;

  return (
    <section className="app-surface min-w-0 rounded-2xl p-4 sm:p-5" aria-labelledby="evolution-time-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="app-type-eyebrow text-primary">Seu tempo</p>
          <h2 id="evolution-time-title" className="mt-1 app-type-section-title app-title-section">
            Ritmo registrado
          </h2>
        </div>
        <div className="text-right">
          <strong className="block text-xl font-extrabold tracking-tight text-foreground">
            {formatStudyMinutes(time.totalMinutes)}
          </strong>
          <span className="app-type-caption text-content-muted">{comparisonLabel}</span>
        </div>
      </div>

      <div
        className="mt-5 h-48 w-full min-w-0"
        role="img"
        aria-label={time.isAllCycle
          ? 'Tempo diário registrado em todo o ciclo'
          : `Tempo diário registrado nos últimos ${time.periodDays} dias`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={time.daily} margin={{ top: 6, right: 2, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.55} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={time.periodDays > 30 ? Math.ceil(time.periodDays / 7) - 1 : time.periodDays === 30 ? 4 : time.periodDays === 14 ? 1 : 0}
              tick={{ fill: 'hsl(var(--content-muted))', fontSize: 9 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--content-muted))', fontSize: 9 }}
              width={34}
            />
            <RechartsTooltip
              cursor={{ fill: 'hsl(var(--primary) / 0.06)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl">
                    <p className="app-type-caption text-content-muted">{label}</p>
                    <p className="mt-0.5 app-type-card-title text-foreground">
                      {formatStudyMinutes(Number(payload[0].value ?? 0))}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[5, 5, 2, 2]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t app-hairline pt-4">
        <TimeFact icon={Activity} label="Dias ativos" value={`${time.activeDays}/${time.periodDays}`} />
        <TimeFact icon={Clock3} label="Média ativa" value={formatStudyMinutes(time.averagePerActiveDay)} />
        <TimeFact
          icon={Flame}
          label={time.isAllCycle ? 'Melhor sequência' : 'Sequência atual'}
          value={`${time.isAllCycle ? time.bestStreak : time.currentStreak}d`}
        />
      </div>
    </section>
  );
}

function TimeFact({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="min-w-0 text-center">
      <Icon className="mx-auto size-3.5 text-primary" aria-hidden="true" />
      <strong className="mt-1 block app-type-card-title text-foreground">{value}</strong>
      <span className="mt-0.5 block app-type-caption text-content-muted">{label}</span>
    </div>
  );
}
