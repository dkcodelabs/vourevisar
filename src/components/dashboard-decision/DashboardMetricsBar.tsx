import type { ComponentType } from 'react';
import { CalendarCheck2, Clock, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardCompactMetrics } from '@/types/dashboardDecision';

export interface DashboardMetricsBarProps {
  metrics: DashboardCompactMetrics;
  onNavigate?: (href: string) => void;
  className?: string;
}

const formatMinutesToHours = (totalMinutes: number): string => {
  if (!totalMinutes || totalMinutes <= 0) return '0h 00m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
};

const formatDailyAverage = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0m / dia';
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours === 0) return `${remMinutes}m / dia`;
  return `${hours}h ${remMinutes.toString().padStart(2, '0')}m / dia`;
};

interface MetricCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  iconBgClass: string;
  iconColorClass: string;
  glowClass?: string;
  onClick?: () => void;
}

const MetricCard = ({
  icon: Icon,
  label,
  value,
  detail,
  iconBgClass,
  iconColorClass,
  glowClass,
  onClick,
}: MetricCardProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={cn(
      'group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200 sm:p-4',
      // Modo Dia: Apple Minimal Unboxed
      'bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
      // Modo Noite: Grafite Moderno Unboxed
      'dark:bg-white/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.04] dark:hover:border-white/[0.12]',
      onClick && 'hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer',
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground truncate">
        {label}
      </span>
      <span
        className={cn(
          'grid size-7 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-110',
          iconBgClass,
          glowClass,
        )}
      >
        <Icon className={cn('size-3.5', iconColorClass)} />
      </span>
    </div>

    <div className="mt-2.5">
      <p className="text-lg font-black leading-none tracking-tight tabular-nums text-foreground sm:text-xl">
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">
        {detail}
      </p>
    </div>
  </button>
);

export const DashboardMetricsBar = ({
  metrics,
  onNavigate,
  className,
}: DashboardMetricsBarProps) => {
  const {
    totalStudyMinutes,
    dailyAverageMinutes,
    activeStudyDays,
    totalPracticeItems,
  } = metrics;

  return (
    <section
      aria-label="Métricas gerais de estudo"
      className={cn('grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3', className)}
    >
      <MetricCard
        icon={Clock}
        label="Tempo total"
        value={formatMinutesToHours(totalStudyMinutes)}
        detail="horas acumuladas"
        iconBgClass="border border-blue-500/25 bg-blue-500/10 dark:bg-blue-500/15"
        iconColorClass="text-blue-500 dark:text-blue-400"
        glowClass="shadow-[0_0_10px_rgba(59,130,246,0.2)]"
        onClick={() => onNavigate?.('/ciclo-estudos')}
      />

      <MetricCard
        icon={TrendingUp}
        label="Média diária"
        value={formatDailyAverage(dailyAverageMinutes)}
        detail="por dia ativo"
        iconBgClass="border border-purple-500/25 bg-purple-500/10 dark:bg-purple-500/15"
        iconColorClass="text-purple-500 dark:text-purple-400"
        glowClass="shadow-[0_0_10px_rgba(168,85,247,0.2)]"
        onClick={() => onNavigate?.('/estatisticas')}
      />

      <MetricCard
        icon={CalendarCheck2}
        label="Dias estudados"
        value={`${activeStudyDays} ${activeStudyDays === 1 ? 'dia' : 'dias'}`}
        detail="com atividade no ciclo"
        iconBgClass="border border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-500/15"
        iconColorClass="text-emerald-600 dark:text-[#b7fb45]"
        glowClass="shadow-[0_0_10px_rgba(16,185,129,0.2)]"
        onClick={() => onNavigate?.('/estatisticas')}
      />

      <MetricCard
        icon={Target}
        label="Total de questões"
        value={`${totalPracticeItems}`}
        detail="itens no módulo Treino"
        iconBgClass="border border-cyan-500/25 bg-cyan-500/10 dark:bg-cyan-500/15"
        iconColorClass="text-cyan-600 dark:text-cyan-400"
        glowClass="shadow-[0_0_10px_rgba(6,182,212,0.2)]"
        onClick={() => onNavigate?.('/treino')}
      />
    </section>
  );
};
