import {
    BookOpen,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CornerDownRight,
    Layers3,
    Merge,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { buildCycleMergeComparison, type CycleMergeComparisonSubject } from '@/components/editais/cycleMergeComparisonModel';
import type { Subject } from '@/types';
import type { CycleUnificationMap } from '@/types/cycleMergeTypes';

interface CycleMergeComparisonProps {
    subjects: Subject[];
    unificationMap: CycleUnificationMap;
    editalName: string;
    position?: string;
    editalSources?: Array<{
        id: string;
        name: string;
        position?: string;
    }>;
    disabled?: boolean;
    onKeepIndividual: () => void;
    onUnify: () => void;
}

interface PreviewColumnProps {
    description: string;
    expanded: boolean;
    isUnifiedResult: boolean;
    subjects: CycleMergeComparisonSubject[];
    title: string;
}

function PreviewColumn({ description, expanded, isUnifiedResult, subjects, title }: PreviewColumnProps) {
    const Icon = isUnifiedResult ? Merge : Layers3;

    return (
        <section
            data-testid={isUnifiedResult ? 'unified-preview-column' : 'individual-preview-column'}
            className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-secondary/30"
        >
            <div className="flex items-start gap-2.5 border-b border-border/60 bg-gradient-to-r from-primary/10 via-secondary/45 to-secondary/20 px-3 py-3">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5 text-primary">
                    <Icon size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-[13px] font-black text-foreground">{title}</h3>
                    <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-content-muted">{description}</p>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 p-2 lg:max-h-[30rem] lg:overflow-y-auto">
                {subjects.map(subject => {
                    const subjectTestId = `${isUnifiedResult ? 'unified' : 'individual'}-subject-${subject.id}`;

                    return (
                    <div key={subject.id} data-testid={subjectTestId} className="overflow-hidden rounded-lg border border-border/60 bg-background/45">
                        <div
                            data-testid={isUnifiedResult && subject.isUnified ? `unified-subject-header-${subject.id}` : undefined}
                            className={subject.isUnified && isUnifiedResult
                                ? 'flex w-full min-w-0 items-center gap-2 border-b border-success/20 bg-success/[0.07] px-2.5 py-1.5 text-left'
                                : 'flex w-full min-w-0 items-center gap-2 px-2.5 py-1.5 text-left'}
                        >
                            <BookOpen
                                size={13}
                                aria-hidden="true"
                                className={subject.isUnified && isUnifiedResult ? 'shrink-0 text-success' : 'shrink-0 text-content-muted'}
                            />
                            <span className="truncate text-[11px] font-black uppercase tracking-[0.04em] text-foreground">
                                {subject.name}
                            </span>
                            {subject.isUnified && isUnifiedResult && (
                                <span className="ml-auto shrink-0 text-[9px] font-bold text-success/80">
                                    {subject.sourceCount} origens
                                </span>
                            )}
                        </div>

                        {expanded && <div data-testid={`${isUnifiedResult ? 'unified' : 'individual'}-topics-${subject.id}`} className="flex flex-col gap-0.5 px-2 pb-1.5 pl-4 pt-0.5">
                            {subject.topics.length > 0 ? subject.topics.map(topic => (
                                <div
                                    key={topic.id}
                                    data-testid={topic.isUnified && isUnifiedResult ? `unified-topic-${topic.id}` : undefined}
                                    className={topic.isUnified && isUnifiedResult
                                        ? 'flex min-w-0 items-center gap-1.5 px-2 py-0.5 text-content-muted'
                                        : 'flex min-w-0 items-center gap-1.5 px-2 py-0.5 text-content-muted'}
                                >
                                    <CornerDownRight size={10} aria-hidden="true" className="shrink-0 opacity-65" />
                                    <span className={topic.isUnified && isUnifiedResult
                                        ? 'truncate text-[9.5px] font-semibold leading-3 text-success'
                                        : 'truncate text-[9.5px] font-semibold leading-3'}
                                    >
                                        {topic.name}
                                    </span>
                                </div>
                            )) : (
                                <span className="px-2 py-1 text-[10px] italic text-content-muted/70">Sem tópicos cadastrados</span>
                            )}
                        </div>}
                    </div>
                    );
                })}
            </div>
        </section>
    );
}

export function CycleMergeComparison({
    subjects,
    unificationMap,
    editalName,
    position,
    editalSources,
    disabled = false,
    onKeepIndividual,
    onUnify,
}: CycleMergeComparisonProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const comparison = useMemo(
        () => buildCycleMergeComparison(subjects, unificationMap),
        [subjects, unificationMap],
    );
    const visibleSources = useMemo(() => {
        const byId = new Map<string, { id: string; name: string; position?: string }>();
        for (const source of editalSources || []) {
            if (!source.id || !source.name) continue;
            byId.set(source.id, source);
        }
        if (byId.size === 0) {
            byId.set('selected-edital', { id: 'selected-edital', name: editalName, position });
        }
        return [...byId.values()];
    }, [editalName, editalSources, position]);

    return (
        <div className="space-y-3 py-1">
            <div
                data-testid="cycle-merge-context-panel"
                className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-secondary/45 to-success/5 px-3 py-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04)]"
            >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-primary/80">
                            Editais carregados no ciclo
                        </span>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-content-muted">
                            {visibleSources.map(source => (
                                <span key={source.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/15 bg-background/45 px-2 py-1 shadow-sm">
                                    <span className="truncate text-foreground/85">{source.name}</span>
                                    {source.position && (
                                        <>
                                            <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-primary/35" />
                                            <BriefcaseBusiness size={10} aria-hidden="true" className="shrink-0 text-primary/80" />
                                            <span className="truncate">{source.position}</span>
                                        </>
                                    )}
                                </span>
                            ))}
                        </div>
                        <h2 className="mt-3 text-sm font-black text-foreground">Como você quer organizar o ciclo?</h2>
                        <p className="mt-1 text-[11px] font-medium text-content-muted">
                            Nos dois casos, todas as matérias e tópicos serão adicionados ao mesmo ciclo.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-content-muted lg:justify-end">
                        <div className="flex items-center gap-2 rounded-full border border-success/15 bg-success/10 px-2.5 py-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm border border-success/40 bg-success/20" aria-hidden="true" />
                            <span>A cor verde mostra apenas o que será unificado.</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(current => !current)}
                            aria-label={isExpanded ? 'Recolher matérias nas duas prévias' : 'Abrir matérias nas duas prévias'}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/10 px-2.5 text-[9px] font-black uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-primary/15"
                        >
                            {isExpanded ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
                            {isExpanded ? 'Recolher tudo' : 'Abrir tudo'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <PreviewColumn
                    title="Manter itens individuais"
                    description="Tudo fica junto no ciclo, mas nomes equivalentes continuam aparecendo como matérias e tópicos diferentes."
                    subjects={comparison.individualSubjects}
                    expanded={isExpanded}
                    isUnifiedResult={false}
                />
                <PreviewColumn
                    title="Unificar equivalentes"
                    description="Matérias e tópicos equivalentes aparecem uma única vez, preservando os dados de cada origem."
                    subjects={comparison.unifiedSubjects}
                    expanded={isExpanded}
                    isUnifiedResult
                />
            </div>

            <div
                data-testid="cycle-merge-actions"
                className="sticky bottom-0 z-20 -mx-1 grid grid-cols-2 gap-2 border-t border-border bg-modal/95 px-1 pb-1 pt-3 shadow-[0_-12px_24px_hsl(var(--modal)/0.92)] backdrop-blur-xl"
            >
                <button
                    type="button"
                    onClick={onKeepIndividual}
                    disabled={disabled}
                    aria-label="Manter materias e topicos individuais"
                    className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-2 text-[10px] font-black leading-tight text-primary shadow-sm shadow-primary/5 transition-all hover:border-primary/40 hover:bg-primary/15 hover:text-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-xs"
                >
                    <Layers3 size={16} aria-hidden="true" />
                    MANTER ITENS INDIVIDUAIS
                </button>
                <button
                    type="button"
                    onClick={onUnify}
                    disabled={disabled}
                    aria-label="Unificar materias e topicos equivalentes"
                    className="app-button-success flex min-h-12 items-center justify-center gap-1.5 px-2 text-[10px] font-black leading-tight disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:text-xs"
                >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    UNIFICAR EQUIVALENTES
                </button>
            </div>
        </div>
    );
}
