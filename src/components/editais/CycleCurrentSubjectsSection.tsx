import { BookOpen } from 'lucide-react';
import type { Subject } from '@/types';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';
import { isManualCycleOrigin } from '@/utils/editaisPagePresentation';

type CycleCurrentSubjectsSectionProps = {
    cycleConflict: CycleConflictState;
    subjects: Subject[];
};

export function CycleCurrentSubjectsSection({ cycleConflict, subjects }: CycleCurrentSubjectsSectionProps) {
    if (cycleConflict.step !== 'select' || cycleConflict.existingIds.length === 0) return null;

    return <div className="space-y-2"><div className="flex items-center justify-between px-1"><span className="text-[10px] font-black uppercase tracking-widest text-content-muted">ATUALMENTE NO CICLO</span><span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-500">{cycleConflict.existingIds.length} matérias</span></div><div className="space-y-3">{cycleConflict.currentOrigins.map((origin, index) => {
        const isManual = isManualCycleOrigin(origin);
        const editalId = !isManual && 'id' in origin ? origin.id : undefined;
        const originSubjects = subjects.filter(subject => {
            if (!cycleConflict.existingIds.includes(subject.id)) return false;
            if (isManual) return !cycleConflict.currentOrigins.some(item => !isManualCycleOrigin(item) && item.id === subject.edital_id);
            return subject.edital_id === editalId;
        });
        if (originSubjects.length === 0) return null;
        return <div key={`${editalId ?? 'manual'}-${index}`} className="rounded-xl border border-primary/20 bg-primary/10 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="h-4 w-1.5 rounded-full bg-primary" /><span className="text-[13px] font-black uppercase tracking-tight text-foreground">{origin.name}</span></div><span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">{originSubjects.length} matérias</span></div><div className="mt-4 flex flex-wrap gap-2">{originSubjects.map(subject => <div key={subject.id} className="group flex items-center gap-2 rounded-lg border border-primary/15 bg-background/45 px-3 py-1.5 transition-colors hover:border-primary/30 hover:bg-primary/10"><BookOpen size={10} className="text-primary" /><span className="truncate text-[10px] font-bold leading-none text-foreground/90">{subject.name}</span></div>)}</div></div>;
    })}</div></div>;
}
