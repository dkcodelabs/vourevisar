import { BookOpen, ChevronUp, Eye } from 'lucide-react';
import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Subject } from '@/types';
import { getCycleLoadSubjectIds, sortTopicsByLeadingNumberWhenComplete, type CycleConflictState } from '@/utils/editaisPagePresentation';

type CycleNewEditalSectionProps = {
    cycleConflict: CycleConflictState;
    subjects: Subject[];
    loadedEditalSubjects: Subject[];
    progressChoiceCard: ReactNode;
    mergeProgressNoticeCard: ReactNode;
    onToggleDetailedPreview: () => void;
    onToggleSubjectSelection: () => void;
    onSelectAllSubjects: () => void;
    onToggleSelectedSubject: (subjectId: string) => void;
};

export function CycleNewEditalSection({
    cycleConflict, subjects, loadedEditalSubjects, progressChoiceCard, mergeProgressNoticeCard,
    onToggleDetailedPreview, onToggleSubjectSelection, onSelectAllSubjects, onToggleSelectedSubject,
}: CycleNewEditalSectionProps) {
    if (cycleConflict.step !== 'select' || !cycleConflict.edital) return null;

    const edital = cycleConflict.edital;
    const selectedSubjectIds = getCycleLoadSubjectIds(cycleConflict);
    const selectedSubjectIdSet = new Set(selectedSubjectIds);
    const isSelectingSubjects = cycleConflict.isSubjectSelectionOpen === true;
    const findSubject = (id: string) => loadedEditalSubjects.find(item => item.id === id) || subjects.find(item => item.id === id);

    return <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3 px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-content-muted">Novo edital selecionado</span>
            <button type="button" onClick={onToggleDetailedPreview} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-secondary/80 px-2.5 text-[9px] font-black uppercase tracking-wider text-content-muted transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary">
                {cycleConflict.showDetailedPreview ? <ChevronUp size={10} /> : <Eye size={10} />}
                {cycleConflict.showDetailedPreview ? 'Recolher' : 'Ver tópicos'}
            </button>
        </div>

        <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/45 p-4 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex items-center gap-2"><div className="h-4 w-1.5 rounded-full bg-success" /><span className="truncate text-sm font-black uppercase tracking-tight text-foreground">{edital.name}</span></div>

            <div className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="text-[11px] font-black text-foreground">{selectedSubjectIds.length} de {edital.subjectIds.length} matérias no ciclo</p><p className="mt-0.5 text-[10px] leading-relaxed text-content-muted">A recomendação é começar com todas para manter o edital completo. Se precisar adiar alguma, escolha abaixo sem apagar seu progresso.</p></div>
                <button type="button" onClick={onToggleSubjectSelection} className="h-9 shrink-0 rounded-lg border border-primary/25 bg-background/70 px-3 text-[10px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground">{isSelectingSubjects ? 'Concluir escolha' : 'Escolher matérias'}</button>
            </div>

            {isSelectingSubjects && <div className="space-y-2 rounded-xl border border-border/70 bg-background/35 p-3 dark:border-white/[0.06]">
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5"><p className="text-[10px] font-bold text-content-muted">Você pode adicionar as demais matérias mais tarde pelo mesmo edital.</p><button type="button" onClick={onSelectAllSubjects} disabled={selectedSubjectIds.length === edital.subjectIds.length} className="shrink-0 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary/75 disabled:cursor-not-allowed disabled:opacity-40">Selecionar todas</button></div>
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1 custom-scrollbar">{edital.subjectIds.map(id => {
                    const subject = findSubject(id);
                    if (!subject) return null;
                    const isSelected = selectedSubjectIdSet.has(id);
                    return <label key={id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/80"><Checkbox checked={isSelected} onCheckedChange={() => onToggleSelectedSubject(id)} aria-label={`Incluir ${subject.name} no ciclo`} /><span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-foreground">{subject.name}</span><span className="shrink-0 text-[9px] font-bold text-content-muted">{subject.topics?.length || 0} tópicos</span></label>;
                })}</div>
            </div>}

            {cycleConflict.showDetailedPreview ? <div className="space-y-3 px-1">{selectedSubjectIds.map(id => {
                const subject = findSubject(id);
                if (!subject) return null;
                return <div key={id} className="group space-y-2.5 rounded-xl border border-border/70 bg-background/40 p-3 transition-colors hover:border-success/25 hover:bg-success/[0.04] dark:border-white/[0.06] dark:bg-black/10"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><div className="h-3 w-1 shrink-0 rounded-full bg-success" /><span className="truncate text-xs font-black uppercase tracking-wider text-success">{subject.name}</span></div><span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-success/55">{subject.topics?.length || 0} tópicos</span></div><div className="grid grid-cols-1 gap-1.5 border-l border-border/70 pl-3 dark:border-white/[0.06]">{sortTopicsByLeadingNumberWhenComplete(subject.topics || []).map(topic => <div key={topic.id} className="flex items-center gap-2 text-[11px] text-content-muted/75"><div className="h-0.5 w-0.5 shrink-0 rounded-full bg-success/40" /><span className="truncate leading-none">{topic.name}</span></div>)}</div></div>;
            })}</div> : <div className="flex flex-wrap gap-2">{selectedSubjectIds.slice(0, 15).map(id => {
                const subject = findSubject(id);
                return subject ? <div key={id} className="flex min-w-0 items-center gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-1.5 dark:border-white/[0.06] dark:bg-black/10"><BookOpen size={10} className="shrink-0 text-success" /><span className="truncate text-[11px] font-bold leading-none text-success">{subject.name}</span></div> : null;
            })}{selectedSubjectIds.length > 15 && <div className="flex items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/40 px-4 py-2 dark:border-white/[0.06] dark:bg-black/10"><span className="text-[10px] font-black uppercase leading-none tracking-widest text-success/55">+{selectedSubjectIds.length - 15}</span></div>}</div>}

            {progressChoiceCard}
            {mergeProgressNoticeCard}
        </div>
    </div>;
}
