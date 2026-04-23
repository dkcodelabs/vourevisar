import React, { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCycleStatsData, SubjectCycleActivity } from '@/hooks/useCycleStatsData';
import {
  BarChart2,
  Target,
  CheckCircle2,
  Clock,
  Flame,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Trophy,
  ChevronRight,
  RotateCcw,
  Loader2,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}

// ─── Mini componentes ────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: 'cyan' | 'orange' | 'green' | 'purple';
}) {
  const colorMap = {
    cyan:   'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    purple: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-4 ${colorMap[color]}`}>
      <Icon size={18} className="opacity-80" />
      <span className="text-2xl font-black tabular-nums">{value}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70 text-center leading-tight">{label}</span>
    </div>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        {/* Track */}
        <circle cx="48" cy="48" r={r} fill="none" strokeWidth="8"
          className="stroke-white/10 dark:stroke-white/5" />
        {/* Progress */}
        <circle
          cx="48" cy="48" r={r} fill="none" strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-cyan-400 transition-all duration-700"
          style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.5))' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-black text-foreground tabular-nums">{percent}%</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-content-muted">Ciclo</span>
      </div>
    </div>
  );
}

function SubjectRow({
  activity,
  index,
  isLast,
}: {
  activity: SubjectCycleActivity;
  index: number;
  isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {/* Linha da sequência */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0
            ${activity.isHardSubject
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
            }`}
        >
          {index + 1}
        </div>
        {!isLast && <div className="w-px flex-1 mt-1 bg-white/5 dark:bg-white/5 min-h-[16px]" />}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 pb-3 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground truncate">
            {activity.subjectName}
          </span>
          <span className="text-[10px] font-medium text-content-muted shrink-0">
            {timeAgo(activity.lastActivityAt)}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Tópicos */}
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-content-muted">
            <BookOpen size={9} />
            {activity.topicsStudied} tópico{activity.topicsStudied !== 1 ? 's' : ''}
          </span>

          {/* Revisões */}
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-content-muted">
            <RotateCcw size={9} />
            {activity.totalReviews} revisão{activity.totalReviews !== 1 ? 'ões' : ''}
          </span>

          {/* Alerta de dificuldade */}
          {activity.isHardSubject && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5">
              <AlertTriangle size={8} />
              Alto nível
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface CycleStatsSheetProps {
  open: boolean;
  onClose: () => void;
}

export const CycleStatsSheet: React.FC<CycleStatsSheetProps> = ({ open, onClose }) => {
  const stats = useCycleStatsData(open);

  const motivationalMessage = useMemo(() => {
    if (stats.isLoading) return null;
    if (stats.progressPercent === 100) {
      return { emoji: '🏆', text: 'Ciclo completo! Você passou por todas as matérias.', sub: 'Incrível dedicação! Continue firme.', color: 'emerald' };
    }
    if (stats.progressPercent >= 75) {
      return { emoji: '🔥', text: 'Você está quase lá!', sub: `Faltam ${stats.remainingSubjects} matéria${stats.remainingSubjects > 1 ? 's' : ''} para fechar o ciclo.`, color: 'cyan' };
    }
    if (stats.progressPercent >= 40) {
      return { emoji: '💪', text: 'Bom ritmo! Mais da metade está feito.', sub: 'Mantenha a consistência diária.', color: 'cyan' };
    }
    if (stats.visitedSubjects === 0) {
      return { emoji: '🚀', text: `Ciclo ${stats.cycleNumber} começou!`, sub: 'Estude ao menos um tópico de cada matéria para completá-lo.', color: 'cyan' };
    }
    return { emoji: '📚', text: 'Continue estudando!', sub: `${stats.remainingSubjects} matéria${stats.remainingSubjects > 1 ? 's' : ''} aguardam sua visita neste ciclo.`, color: 'cyan' };
  }, [stats]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[440px] p-0 flex flex-col bg-card border-l border-border overflow-hidden"
      >
        {/* ── Header ── */}
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border/50 bg-card">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base font-black text-foreground">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                <BarChart2 size={15} className="text-cyan-400" />
              </div>
              Meu Ciclo de Estudos
            </SheetTitle>
          </div>

          {/* Ciclo + data */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-0.5">
              Ciclo #{stats.cycleNumber}
            </span>
            {stats.cycleStartDate && (
              <span className="text-xs text-content-muted">
                Desde {formatDate(stats.cycleStartDate)}
              </span>
            )}
          </div>
        </SheetHeader>

        {/* ── Body (scrollável) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Loading */}
          {stats.isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-content-muted">
              <Loader2 size={28} className="animate-spin text-primary" />
              <span className="text-sm">Carregando estatísticas...</span>
            </div>
          )}

          {/* Erro */}
          {!stats.isLoading && stats.error && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-content-muted">
              <AlertTriangle size={24} className="text-orange-400" />
              <span className="text-sm">{stats.error}</span>
            </div>
          )}

          {!stats.isLoading && !stats.error && (
            <>
              {/* ── Seção 1: Progresso Visual ── */}
              <section>
                <div className="flex items-center justify-between gap-4">
                  {/* Anel de progresso */}
                  <ProgressRing percent={stats.progressPercent} />

                  {/* Métricas rápidas */}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <StatPill icon={BookOpen}     value={stats.totalSubjects}   label="No Ciclo"   color="cyan" />
                    <StatPill icon={CheckCircle2} value={stats.visitedSubjects} label="Visitadas"  color="green" />
                    <StatPill icon={Clock}        value={stats.remainingSubjects} label="Faltam"   color="orange" />
                    <StatPill icon={Trophy}       value={stats.completedCycles} label="Ciclos OK"  color="purple" />
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-content-muted">Progresso do ciclo atual</span>
                    <span className="text-xs font-black text-foreground">
                      {stats.visitedSubjects}/{stats.totalSubjects} matérias
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 dark:bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-700"
                      style={{
                        width: `${stats.progressPercent}%`,
                        boxShadow: stats.progressPercent > 0 ? '0 0 10px rgba(34,211,238,0.4)' : 'none',
                      }}
                    />
                  </div>
                </div>
              </section>

              {/* Divisor */}
              <div className="border-t border-border/40" />

              {/* ── Seção 2: Última matéria estudada ── */}
              {stats.lastStudiedSubject && (
                <section>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-content-muted mb-3">
                    Última Matéria Estudada
                  </h3>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <Flame size={16} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {stats.lastStudiedSubject.subjectName}
                      </p>
                      <p className="text-xs text-content-muted">
                        {timeAgo(stats.lastStudiedSubject.lastActivityAt)} · {stats.lastStudiedSubject.topicsStudied} tópico{stats.lastStudiedSubject.topicsStudied !== 1 ? 's' : ''} tocado{stats.lastStudiedSubject.topicsStudied !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {stats.lastStudiedSubject.isHardSubject && (
                      <AlertTriangle size={14} className="text-orange-400 shrink-0" />
                    )}
                  </div>
                </section>
              )}

              {/* ── Seção 3: Sequência do ciclo ── */}
              {stats.subjectSequence.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-content-muted mb-3">
                    Sequência do Ciclo
                  </h3>
                  <div className="space-y-0">
                    {stats.subjectSequence.map((activity, idx) => (
                      <SubjectRow
                        key={activity.subjectId}
                        activity={activity}
                        index={idx}
                        isLast={idx === stats.subjectSequence.length - 1}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── Seção 4: Matérias com dificuldade ── */}
              {stats.hardSubjects.length > 0 && (
                <>
                  <div className="border-t border-border/40" />
                  <section>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-400/80 mb-3 flex items-center gap-1.5">
                      <AlertTriangle size={11} />
                      Atenção Necessária
                    </h3>
                    <div className="space-y-2">
                      {stats.hardSubjects.map(s => (
                        <div key={s.subjectId} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{s.subjectName}</p>
                            <p className="text-xs text-content-muted">
                              {s.hardReviews} de {s.totalReviews} revisões difíceis
                            </p>
                          </div>
                          <span className="text-[10px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5 shrink-0">
                            {Math.round((s.hardReviews / s.totalReviews) * 100)}% difícil
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* ── Seção 5: Histórico resumido ── */}
              <div className="border-t border-border/40" />
              <section>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-content-muted mb-3">
                  Histórico Geral
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-secondary/30 dark:bg-white/3 border border-border/40">
                    <TrendingUp size={14} className="text-violet-400 mb-1" />
                    <span className="text-xl font-black text-foreground tabular-nums">{stats.completedCycles}</span>
                    <span className="text-[10px] text-content-muted font-semibold uppercase tracking-wide leading-tight">
                      Ciclos concluídos
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-secondary/30 dark:bg-white/3 border border-border/40">
                    <Flame size={14} className={`mb-1 ${stats.streakDays > 0 ? 'text-orange-400' : 'text-content-muted'}`} />
                    <span className="text-xl font-black text-foreground tabular-nums">{stats.streakDays}</span>
                    <span className="text-[10px] text-content-muted font-semibold uppercase tracking-wide leading-tight">
                      Dias seguidos
                    </span>
                  </div>
                </div>
              </section>

              {/* ── Mensagem Motivacional ── */}
              {motivationalMessage && (
                <div className={`
                  flex items-start gap-3 p-4 rounded-2xl border
                  ${motivationalMessage.color === 'emerald'
                    ? 'bg-emerald-500/8 border-emerald-500/20'
                    : 'bg-cyan-500/8 border-cyan-500/20'
                  }
                `}>
                  <span className="text-2xl shrink-0 mt-0.5">{motivationalMessage.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-foreground">{motivationalMessage.text}</p>
                    <p className="text-xs text-content-muted mt-0.5">{motivationalMessage.sub}</p>
                  </div>
                </div>
              )}

              {/* Espaço de respiro no final */}
              <div className="h-2" />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
