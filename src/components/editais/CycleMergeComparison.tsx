import {
    BookOpen,
    BriefcaseBusiness,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CornerDownRight,
    Layers3,
    Link2,
    Merge,
    Search,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
    addManualTopicEquivalence,
    buildCycleMergeComparison,
    removeManualTopicEquivalence,
    type CycleMergeComparisonSubject,
    type CycleMergeComparisonTopic,
} from '@/components/editais/cycleMergeComparisonModel';
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
    onUnificationMapChange?: (unificationMap: CycleUnificationMap) => void;
    onUnify: () => void;
}

type ManualSelection = {
    candidateTopicId?: string;
    subjectGroupId: string;
    topicId: string;
    topicName: string;
};

interface PreviewColumnProps {
    description: string;
    expanded: boolean;
    isUnifiedResult: boolean;
    manualCandidateTopics?: CycleMergeComparisonTopic[];
    manualCandidateQuery?: string;
    manualSelection?: ManualSelection | null;
    onCancelManualSelection?: () => void;
    onConfirmManualSelection?: (candidateTopicId: string) => void;
    onManualCandidateQueryChange?: (query: string) => void;
    onRemoveManualEquivalence?: (subjectGroupId: string, topicIds: string[]) => void;
    onStartManualSelection?: (subjectGroupId: string, topicId: string, topicName: string, candidateTopicId?: string) => void;
    sourceNameById: Map<string, string>;
    subjects: CycleMergeComparisonSubject[];
    title: string;
}

const normalizeSearchText = (value: string): string => (
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
);

const getSearchTokens = (value: string): string[] => (
    normalizeSearchText(value)
        .split(' ')
        .filter(token => token.length > 2)
);

const getTopicSimilarityScore = (baseName: string, candidateName: string): number => {
    const base = normalizeSearchText(baseName);
    const candidate = normalizeSearchText(candidateName);
    if (!base || !candidate) return 0;
    if (base === candidate) return 1;
    if (base.includes(candidate) || candidate.includes(base)) return 0.86;

    const baseTokens = new Set(getSearchTokens(base));
    const candidateTokens = new Set(getSearchTokens(candidate));
    if (baseTokens.size === 0 || candidateTokens.size === 0) return 0;

    const overlap = [...baseTokens].filter(token => candidateTokens.has(token)).length;
    return (2 * overlap) / (baseTokens.size + candidateTokens.size);
};

const rankManualCandidateTopics = (
    sourceTopicName: string,
    topics: CycleMergeComparisonTopic[],
): Array<CycleMergeComparisonTopic & { similarityScore: number }> => (
    topics
        .map(topic => ({
            ...topic,
            similarityScore: getTopicSimilarityScore(sourceTopicName, topic.name),
        }))
        .sort((a, b) => (
            b.similarityScore - a.similarityScore
            || a.name.localeCompare(b.name, 'pt-BR')
            || a.id.localeCompare(b.id)
        ))
);

function PreviewColumn({
    description,
    expanded,
    isUnifiedResult,
    manualCandidateTopics = [],
    manualCandidateQuery = '',
    manualSelection,
    onCancelManualSelection,
    onConfirmManualSelection,
    onManualCandidateQueryChange,
    onRemoveManualEquivalence,
    onStartManualSelection,
    sourceNameById,
    subjects,
    title,
}: PreviewColumnProps) {
    const Icon = isUnifiedResult ? Merge : Layers3;
    const normalizedManualQuery = normalizeSearchText(manualCandidateQuery);
    const rankedManualCandidateTopics = manualSelection
        ? rankManualCandidateTopics(manualSelection.topicName, manualCandidateTopics)
        : [];
    const suggestedManualCandidateTopics = rankedManualCandidateTopics
        .filter(topic => topic.similarityScore >= 0.45)
        .slice(0, 8);
    const visibleManualCandidateTopics = normalizedManualQuery
        ? rankedManualCandidateTopics.filter(topic => normalizeSearchText(topic.name).includes(normalizedManualQuery))
        : suggestedManualCandidateTopics;
    const isShowingSuggestions = !normalizedManualQuery;

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
                    const sourceLabel = subject.sourceEditalIds
                        .map(sourceId => sourceNameById.get(sourceId))
                        .filter((name): name is string => Boolean(name))
                        .join(' + ') || 'Edital não identificado';

                    return (
                    <div key={subject.id} data-testid={subjectTestId} className="shrink-0 overflow-hidden rounded-lg border border-border/60 bg-background/45">
                        <div
                            data-testid={isUnifiedResult && subject.isUnified ? `unified-subject-header-${subject.id}` : undefined}
                            className={subject.isUnified && isUnifiedResult
                                ? 'flex w-full min-w-0 items-start gap-2 border-b border-success/20 bg-success/[0.07] px-2.5 py-1.5 text-left'
                                : 'flex w-full min-w-0 items-start gap-2 px-2.5 py-1.5 text-left'}
                        >
                            <BookOpen
                                size={13}
                                aria-hidden="true"
                                className={subject.isUnified && isUnifiedResult ? 'mt-0.5 shrink-0 text-success' : 'mt-0.5 shrink-0 text-content-muted'}
                            />
                            <div className="min-w-0 flex-1">
                                <span
                                    data-testid={`${isUnifiedResult ? 'unified' : 'individual'}-subject-edital-${subject.id}`}
                                    className="block break-words text-[8px] font-black uppercase leading-3 tracking-[0.1em] text-primary/75"
                                >
                                    {sourceLabel}
                                </span>
                                <div className="mt-0.5 flex min-w-0 items-start gap-2">
                                    <span className="min-w-0 flex-1 break-words text-[11px] font-black uppercase leading-4 tracking-[0.04em] text-foreground">
                                        {subject.name}
                                    </span>
                                    {subject.isUnified && isUnifiedResult && (
                                        <span className="shrink-0 pt-0.5 text-[9px] font-bold text-success/80">
                                            {subject.sourceCount} origens
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {expanded && <div data-testid={`${isUnifiedResult ? 'unified' : 'individual'}-topics-${subject.id}`} className="flex flex-col gap-0.5 px-2 pb-1.5 pl-4 pt-0.5">
                            {subject.topics.length > 0 ? subject.topics.map(topic => {
                                const topicIds = topic.id.split(':');
                                const isManual = topic.matchType === 'manual';
                                const isManualSelectionActive = manualSelection?.subjectGroupId === subject.id && manualSelection.topicId === topic.id;

                                return (
                                <div
                                    key={topic.id}
                                    data-testid={topic.isUnified && isUnifiedResult ? `unified-topic-${topic.id}` : undefined}
                                    className={topic.isUnified && isUnifiedResult
                                        ? 'flex min-w-0 flex-wrap items-center gap-1.5 px-2 py-0.5 text-content-muted'
                                        : 'flex min-w-0 flex-wrap items-center gap-1.5 px-2 py-0.5 text-content-muted'}
                                >
                                    <CornerDownRight size={10} aria-hidden="true" className="shrink-0 opacity-65" />
                                    <span className={topic.isUnified && isUnifiedResult
                                        ? 'min-w-0 flex-1 break-words text-[10px] font-semibold leading-4 text-success [text-wrap:pretty]'
                                        : 'min-w-0 flex-1 break-words text-[10px] font-semibold leading-4 text-foreground/75 [text-wrap:pretty]'}
                                    >
                                        {topic.name}
                                    </span>
                                    {isManual && isUnifiedResult && (
                                        <>
                                            <span className="rounded-full border border-success/20 bg-success/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-success">
                                                Manual
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => onRemoveManualEquivalence?.(subject.id, topicIds)}
                                                aria-label={`Desfazer equivalência manual de ${topic.name}`}
                                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-destructive/15 text-destructive transition-colors hover:bg-destructive/10"
                                            >
                                                <X size={11} aria-hidden="true" />
                                            </button>
                                        </>
                                    )}
                                    {!topic.isUnified && isUnifiedResult && onStartManualSelection && (
                                        <button
                                            type="button"
                                            onClick={() => onStartManualSelection(subject.id, topic.id, topic.name)}
                                            aria-label={`Escolher equivalente para ${topic.name}`}
                                            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-primary/15 bg-primary/5 px-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/10"
                                        >
                                            <Link2 size={10} aria-hidden="true" />
                                            Sugerir equivalente
                                        </button>
                                    )}
                                    {isManualSelectionActive && (
                                        <div className="basis-full rounded-lg border border-primary/20 bg-primary/5 p-2">
                                            <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black uppercase tracking-[0.08em] text-primary">
                                                        Escolha o tópico equivalente
                                                    </p>
                                                    <p className="mt-0.5 text-[9px] font-medium leading-snug text-content-muted">
                                                        Vamos mostrar primeiro os candidatos mais provaveis para <span className="font-bold text-foreground">{manualSelection.topicName}</span>.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={onCancelManualSelection}
                                                    className="self-start rounded-md px-2 py-1 text-[9px] font-bold text-content-muted transition-colors hover:bg-background/60 hover:text-foreground sm:self-auto"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>

                                            {manualCandidateTopics.length > 0 ? (
                                                <label className="mb-2 flex h-8 items-center gap-1.5 rounded-md border border-border bg-background/75 px-2 text-content-muted focus-within:border-primary/40 focus-within:text-primary">
                                                    <Search size={12} aria-hidden="true" className="shrink-0" />
                                                    <span className="sr-only">Pesquisar tópico equivalente</span>
                                                    <input
                                                        type="search"
                                                        aria-label="Pesquisar tópico equivalente"
                                                        value={manualCandidateQuery}
                                                        onChange={event => onManualCandidateQueryChange?.(event.target.value)}
                                                        placeholder="Pesquisar tópico equivalente"
                                                        className="min-w-0 flex-1 bg-transparent text-[10px] font-semibold text-foreground outline-none placeholder:text-content-muted/70"
                                                    />
                                                    <span className="shrink-0 text-[8px] font-bold tabular-nums text-content-muted">
                                                        {visibleManualCandidateTopics.length}/{manualCandidateTopics.length}
                                                    </span>
                                                </label>
                                            ) : null}

                                            {manualCandidateTopics.length > 0 && isShowingSuggestions && (
                                                <p className="mb-1 text-[9px] font-semibold text-content-muted">
                                                    {visibleManualCandidateTopics.length > 0
                                                        ? `${visibleManualCandidateTopics.length} sugestao${visibleManualCandidateTopics.length === 1 ? '' : 'es'} provavel${visibleManualCandidateTopics.length === 1 ? '' : 'is'} encontrada${visibleManualCandidateTopics.length === 1 ? '' : 's'}.`
                                                        : 'Nenhuma sugestao provavel. Use a busca para procurar em todos os topicos livres deste grupo.'}
                                                </p>
                                            )}

                                            <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                                                {manualCandidateTopics.length > 0 && visibleManualCandidateTopics.length > 0 ? visibleManualCandidateTopics.map(candidateTopic => (
                                                    <button
                                                        key={candidateTopic.id}
                                                        type="button"
                                                        onClick={() => onStartManualSelection?.(subject.id, topic.id, topic.name, candidateTopic.id)}
                                                        aria-label={`Selecionar ${candidateTopic.name} como equivalente`}
                                                        className={`flex w-full items-start justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-[10px] font-bold transition-colors ${
                                                            manualSelection?.candidateTopicId === candidateTopic.id
                                                                ? 'border-primary/40 bg-primary/15 text-primary'
                                                                : 'border-border bg-background/70 text-foreground hover:border-primary/30 hover:bg-primary/10'
                                                        }`}
                                                    >
                                                        <span className="min-w-0 break-words leading-snug">{candidateTopic.name}</span>
                                                        {isShowingSuggestions && (
                                                            <span className="shrink-0 rounded-full border border-primary/15 bg-primary/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-primary">
                                                                Sugestao
                                                            </span>
                                                        )}
                                                        {manualSelection?.candidateTopicId === candidateTopic.id && (
                                                            <CheckCircle2 size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                                                        )}
                                                    </button>
                                                )) : manualCandidateTopics.length > 0 ? (
                                                    <span className="block rounded-md border border-dashed border-border bg-background/50 px-2 py-2 text-[9px] font-medium text-content-muted">
                                                        {isShowingSuggestions
                                                            ? 'Nenhuma sugestao automatica segura para este topico. Pesquise pelo nome se quiser marcar manualmente.'
                                                            : 'Nenhum tópico encontrado com esse filtro.'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-medium text-content-muted">
                                                        Nao ha outro topico livre de edital diferente neste grupo.
                                                    </span>
                                                )}
                                            </div>
                                            {manualCandidateTopics.length > 0 && visibleManualCandidateTopics.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => onConfirmManualSelection?.(manualSelection?.candidateTopicId || visibleManualCandidateTopics[0].id)}
                                                    aria-label="Confirmar equivalência manual"
                                                    className="mt-2 inline-flex h-7 items-center rounded-md bg-primary px-2 text-[9px] font-black uppercase tracking-[0.08em] text-primary-foreground"
                                                >
                                                    Confirmar equivalencia
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                            }) : (
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
    onUnificationMapChange,
    onUnify,
}: CycleMergeComparisonProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [manualSelection, setManualSelection] = useState<ManualSelection | null>(null);
    const [manualCandidateQuery, setManualCandidateQuery] = useState('');
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
    const sourceNameById = useMemo(() => (
        new Map(visibleSources.map(source => [source.id, source.name]))
    ), [visibleSources]);
    const topicSourceIdById = useMemo(() => {
        const sourceByTopic = new Map<string, string | undefined>();
        for (const subject of subjects) {
            for (const topic of subject.topics || []) {
                sourceByTopic.set(topic.id, topic.edital_id || subject.edital_id || undefined);
            }
        }
        return sourceByTopic;
    }, [subjects]);
    const manualCandidateTopics = useMemo(() => {
        if (!manualSelection) return [];
        const selectedSubject = comparison.unifiedSubjects.find(subject => subject.id === manualSelection.subjectGroupId);
        if (!selectedSubject) return [];
        const selectedSourceId = topicSourceIdById.get(manualSelection.topicId);

        return selectedSubject.topics.filter(topic => {
            if (topic.id === manualSelection.topicId || topic.isUnified) return false;
            const sourceId = topicSourceIdById.get(topic.id);
            return Boolean(sourceId && selectedSourceId && sourceId !== selectedSourceId);
        });
    }, [comparison.unifiedSubjects, manualSelection, topicSourceIdById]);

    const handleConfirmManualSelection = (candidateTopicId: string) => {
        if (!manualSelection || !onUnificationMapChange) return;
        const nextMap = addManualTopicEquivalence(unificationMap, subjects, {
            subjectGroupId: manualSelection.subjectGroupId,
            topicIds: [manualSelection.topicId, candidateTopicId],
        });
        setManualSelection(null);
        setManualCandidateQuery('');
        if (nextMap !== unificationMap) onUnificationMapChange(nextMap);
    };

    const handleRemoveManualEquivalence = (subjectGroupId: string, topicIds: string[]) => {
        if (!onUnificationMapChange) return;
        const nextMap = removeManualTopicEquivalence(unificationMap, { subjectGroupId, topicIds });
        if (nextMap !== unificationMap) onUnificationMapChange(nextMap);
    };

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

            <div data-testid="cycle-merge-preview-grid" className="grid grid-cols-1 gap-3 pb-20 lg:grid-cols-2">
                <PreviewColumn
                    title="Manter itens individuais"
                    description="Tudo fica junto no ciclo, mas nomes equivalentes continuam aparecendo como matérias e tópicos diferentes."
                    subjects={comparison.individualSubjects}
                    expanded={isExpanded}
                    isUnifiedResult={false}
                    sourceNameById={sourceNameById}
                />
                <PreviewColumn
                    title="Unificar equivalentes"
                    description="Matérias e tópicos equivalentes aparecem uma única vez, preservando os dados de cada origem."
                    subjects={comparison.unifiedSubjects}
                    expanded={isExpanded}
                    isUnifiedResult
                    manualCandidateTopics={manualCandidateTopics}
                    manualCandidateQuery={manualCandidateQuery}
                    manualSelection={manualSelection}
                    onCancelManualSelection={() => {
                        setManualSelection(null);
                        setManualCandidateQuery('');
                    }}
                    onConfirmManualSelection={handleConfirmManualSelection}
                    onManualCandidateQueryChange={setManualCandidateQuery}
                    onRemoveManualEquivalence={handleRemoveManualEquivalence}
                    onStartManualSelection={onUnificationMapChange
                        ? (subjectGroupId, topicId, topicName, candidateTopicId) => {
                            setManualSelection({ subjectGroupId, topicId, topicName, candidateTopicId });
                            setManualCandidateQuery('');
                        }
                        : undefined}
                    sourceNameById={sourceNameById}
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
