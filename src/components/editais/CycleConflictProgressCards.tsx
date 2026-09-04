import type { Dispatch, SetStateAction } from 'react';
import { CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditalProgressSummary } from '@/utils/editalProgressSummary';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';

type CycleConflictProgressProps = {
    cycleConflict: CycleConflictState;
    setCycleConflict: Dispatch<SetStateAction<CycleConflictState>>;
};

const progressItems = (progressSummary: EditalProgressSummary) => [
    { label: 'Tópicos iniciados', value: `${progressSummary.startedTopics}/${progressSummary.topicCount}` },
    { label: 'Concluídos', value: progressSummary.completedTopics },
    { label: 'Em revisão', value: progressSummary.reviewingTopics },
    { label: 'Revisões agendadas', value: progressSummary.scheduledReviewTopics },
];

export const CycleConflictProgressChoice = ({ cycleConflict, setCycleConflict }: CycleConflictProgressProps) => {
    const progressSummary = cycleConflict.progressSummary;
    if (!progressSummary) return null;

    return (
        <div className="rounded-2xl border border-warning/25 bg-gradient-to-br from-warning/14 via-warning/8 to-background/65 p-3.5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]">
            <div className="flex flex-col gap-3.5">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/18 text-warning ring-1 ring-warning/30">
                        <Clock size={16} />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-warning">Progresso anterior encontrado</p>
                        <p className="mt-1 text-[11px] font-medium leading-relaxed text-content-muted">Este edital já tem histórico próprio. Escolha se esse histórico entra no novo ciclo ou se este edital será reiniciado.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {progressItems(progressSummary).map(item => (
                        <div key={item.label} className="rounded-xl border border-warning/15 bg-background/65 px-3 py-2 ring-1 ring-white/[0.03] dark:bg-modal/55">
                            <span className="block text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-content-muted">{item.label}</span>
                            <span className="mt-1 block text-base font-black leading-none text-foreground tabular-nums">{item.value}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => setCycleConflict(prev => ({ ...prev, progressMode: 'keep' }))} className={cn('group rounded-xl border p-3 text-left shadow-sm transition-all active:scale-[0.99]', cycleConflict.progressMode === 'keep' ? 'border-success/55 bg-success/16 text-success ring-1 ring-success/25' : 'border-success/25 bg-success/8 text-foreground hover:border-success/45 hover:bg-success/12')}>
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/12 text-success ring-1 ring-success/25 group-hover:bg-success/16"><CheckCircle2 size={14} /></span>Preservar histórico do edital</span>
                        <span className="mt-2 block text-[10px] font-medium leading-relaxed text-content-muted">{cycleConflict.existingIds.length > 0 ? 'Mantém revisões, agenda e tópicos já iniciados deste edital. O ciclo anterior será substituído por uma fila nova.' : 'Mantém revisões, agenda e tópicos já iniciados deste edital na sua nova fila de estudos.'}</span>
                    </button>

                    <button type="button" onClick={() => setCycleConflict(prev => ({ ...prev, progressMode: 'reset' }))} className={cn('group rounded-xl border p-3 text-left shadow-sm transition-all active:scale-[0.99]', cycleConflict.progressMode === 'reset' ? 'border-destructive/55 bg-destructive/16 text-destructive ring-1 ring-destructive/25' : 'border-destructive/25 bg-destructive/8 text-foreground hover:border-destructive/45 hover:bg-destructive/12')}>
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/12 text-destructive ring-1 ring-destructive/25 group-hover:bg-destructive/16"><RefreshCw size={14} /></span>Reiniciar este edital</span>
                        <span className="mt-2 block text-[10px] font-medium leading-relaxed text-content-muted">Limpa revisões, sessões e agenda deste edital antes de criar a nova fila.</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export const CycleConflictMergeProgressNotice = ({ cycleConflict }: CycleConflictProgressProps) => {
    const progressSummary = cycleConflict.progressSummary;
    if (!progressSummary) return null;

    return (
        <div className="rounded-2xl border border-success/20 bg-success/8 p-3.5 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success ring-1 ring-success/25"><CheckCircle2 size={15} /></span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-widest text-success">Histórico detectado</p>
                        <p className="mt-1 text-[11px] font-medium leading-relaxed text-content-muted">Ao mesclar, revisões, agenda e progresso deste edital serão preservados automaticamente.</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-[260px]">
                    {[
                        { label: 'Iniciados', value: `${progressSummary.startedTopics}/${progressSummary.topicCount}` },
                        { label: 'Em revisão', value: progressSummary.reviewingTopics },
                    ].map(item => (
                        <div key={item.label} className="rounded-xl border border-success/15 bg-background/60 px-3 py-2 dark:bg-modal/45">
                            <span className="block text-[8px] font-black uppercase tracking-[0.08em] text-content-muted">{item.label}</span>
                            <span className="mt-1 block text-sm font-black leading-none text-foreground tabular-nums">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
