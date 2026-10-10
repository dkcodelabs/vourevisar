import { ChevronDown, Info, Loader2, Sparkles, CheckCircle2, ArrowLeft, Trash2 } from 'lucide-react';
import {
  formatExamWeightInputValue,
  getSubjectExamWeightLine,
  parseOptionalExamWeightNumber,
  type ExamWeightTotals,
} from '@/utils/examWeight';

export interface AiTopic {
  name: string;
  selected: boolean;
  position?: number;
}

export interface AiSubject {
  id: string;
  title: string;
  selected: boolean;
  topics: AiTopic[];
  expanded: boolean;
  knowledgeType?: string | null;
  weight?: {
    questions: number | null;
    points: number | null;
    percentage: number | null;
    rawText: string | null;
  };
}

export type BlockWeightInfo = {
  blockName?: string;
  totalQuestions?: number | null;
  totalPoints?: number | null;
  weightPerQuestion?: number | null;
};

type AiReviewStepProps = {
  origin: string;
  onOriginChange: (val: string) => void;
  position: string;
  onPositionChange: (val: string) => void;
  year: string;
  onYearChange: (val: string) => void;
  examDate: string;
  onExamDateChange: (val: string) => void;
  aiResult: AiSubject[];
  onAiResultChange: (newResult: AiSubject[]) => void;
  weightExtractionStatus: string;
  weightBlockInfo: BlockWeightInfo[];
  examWeightTotals: ExamWeightTotals;
  isSaving: boolean;
  onConfirmImport: () => Promise<void> | void;
  onBackToCargo?: () => void;
  inlineMode?: boolean;
  hasPendingDraft?: boolean;
  onDiscardPending?: () => void;
};

export function AiReviewStep({
  origin,
  onOriginChange,
  position,
  onPositionChange,
  year,
  onYearChange,
  examDate,
  onExamDateChange,
  aiResult,
  onAiResultChange,
  weightExtractionStatus,
  weightBlockInfo,
  examWeightTotals,
  isSaving,
  onConfirmImport,
  onBackToCargo,
  inlineMode = false,
  hasPendingDraft = false,
  onDiscardPending,
}: AiReviewStepProps) {
  const selectedSubjectsCount = aiResult.filter((s) => s.selected).length;
  const selectedTopicsCount = aiResult.reduce(
    (acc, s) => acc + (s.selected ? s.topics.filter((t) => t.selected).length : 0),
    0
  );

  const toggleAllExpanded = () => {
    const shouldExpand = aiResult.some((s) => !s.expanded);
    onAiResultChange(aiResult.map((s) => ({ ...s, expanded: shouldExpand })));
  };

  const handleToggleSubject = (index: number) => {
    const next = [...aiResult];
    const nextSelected = !next[index].selected;
    next[index] = {
      ...next[index],
      selected: nextSelected,
      topics: next[index].topics.map((t) => ({ ...t, selected: nextSelected })),
    };
    onAiResultChange(next);
  };

  const handleSubjectTitleChange = (index: number, title: string) => {
    const next = [...aiResult];
    next[index] = { ...next[index], title: title.toUpperCase() };
    onAiResultChange(next);
  };

  const handleToggleTopic = (sIndex: number, tIndex: number) => {
    const next = [...aiResult];
    const topics = [...next[sIndex].topics];
    topics[tIndex] = { ...topics[tIndex], selected: !topics[tIndex].selected };
    const hasAnySelected = topics.some((t) => t.selected);
    next[sIndex] = { ...next[sIndex], topics, selected: hasAnySelected };
    onAiResultChange(next);
  };

  const handleToggleExpand = (index: number) => {
    const next = [...aiResult];
    next[index] = { ...next[index], expanded: !next[index].expanded };
    onAiResultChange(next);
  };

  const handleWeightChange = (
    index: number,
    field: 'questions' | 'points',
    valStr: string
  ) => {
    const next = [...aiResult];
    const parsed = parseOptionalExamWeightNumber(valStr);
    next[index] = {
      ...next[index],
      weight: {
        ...(next[index].weight || {
          points: null,
          questions: null,
          percentage: null,
          rawText: null,
        }),
        [field]: parsed,
      },
    };
    onAiResultChange(next);
  };

  const getAiSubjectWeightAdapter = (subj: AiSubject) => ({
    id: subj.id,
    title: subj.title,
    exam_weight_questions: subj.weight?.questions ?? null,
    exam_weight_points: subj.weight?.points ?? null,
    exam_weight_percentage: subj.weight?.percentage ?? null,
    exam_weight_raw: subj.weight?.rawText ?? null,
  });

  return (
    <div className="space-y-4">
      {/* ── Metadados do Edital ── */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-content-main">
          Dados do edital
        </p>

        <div className="mt-3 rounded-xl border border-primary/15 bg-card/80 p-4 dark:bg-zinc-900/45">
          {weightExtractionStatus !== 'idle' &&
            (weightExtractionStatus !== 'found' || weightBlockInfo.length > 0) && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 dark:border-amber-400/20 dark:bg-amber-500/10">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
                  {weightExtractionStatus === 'block_only' || weightBlockInfo.length > 0
                    ? 'Peso identificado por bloco'
                    : 'Peso por matéria não identificado'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                  {weightExtractionStatus === 'block_only' || weightBlockInfo.length > 0
                    ? 'Quando o edital não divide o peso por disciplina, o sistema não distribui automaticamente. Você pode ajustar depois na edição do edital.'
                    : 'Você pode preencher manualmente agora ou ajustar depois na edição do edital.'}
                </p>
              </div>
            )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            {/* Coluna A: Concurso e Cargo */}
            <div className="space-y-3 md:col-span-9">
              <div className="space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-content-muted">
                  Concurso / Órgão
                </span>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => onOriginChange(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold uppercase text-foreground outline-none transition-colors focus:border-primary dark:border-white/10"
                />
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-content-muted">
                  Cargo
                </span>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => onPositionChange(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold uppercase text-foreground outline-none transition-colors focus:border-primary dark:border-white/10"
                />
              </div>
            </div>

            {/* Coluna B: Ano e Data da Prova (compactos e proporcionais) */}
            <div className="space-y-3 md:col-span-3 flex flex-col items-start">
              <div className="space-y-1 w-24 sm:w-28">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-content-muted">
                  Ano
                </span>
                <input
                  type="text"
                  value={year}
                  maxLength={4}
                  onChange={(e) => onYearChange(e.target.value.replace(/\D/g, ''))}
                  placeholder="AAAA"
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold text-center text-foreground outline-none transition-colors focus:border-primary dark:border-white/10"
                />
              </div>
              <div className="space-y-1 w-36 sm:w-40">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-content-muted">
                  Data da Prova
                </span>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => onExamDateChange(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground outline-none transition-colors focus:border-primary dark:border-white/10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Matérias e Tópicos ── */}
      <div className="rounded-2xl border border-border bg-card p-4 dark:border-white/10 dark:bg-zinc-900/40 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-content-main">
              Matérias e tópicos extraídos
            </p>
            <p className="text-xs text-content-muted">
              {selectedSubjectsCount} matéria(s) e {selectedTopicsCount} tópico(s) selecionados.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleAllExpanded}
            className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
          >
            {aiResult.some((s) => !s.expanded) ? 'Expandir tudo' : 'Recolher tudo'}
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {aiResult.map((subj, sIdx) => (
            <div
              key={subj.id}
              className="overflow-hidden rounded-xl border border-border bg-secondary/35 text-content-main transition-colors hover:border-primary/40 dark:border-white/10"
            >
              <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={subj.selected}
                    onChange={() => handleToggleSubject(sIdx)}
                    className="h-4 w-4 shrink-0 rounded border-primary/30 accent-primary"
                    aria-label={`Selecionar matéria ${subj.title}`}
                  />
                  <input
                    type="text"
                    value={subj.title}
                    onChange={(e) => handleSubjectTitleChange(sIdx, e.target.value)}
                    className="w-full border-none bg-transparent text-xs font-bold uppercase text-foreground outline-none transition-colors focus:text-primary"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {subj.knowledgeType && (
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                        subj.knowledgeType.toLowerCase().includes('básic') ||
                        subj.knowledgeType.toLowerCase().includes('basic')
                          ? 'border-sky-500/20 bg-sky-500/10 text-sky-400'
                          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {subj.knowledgeType}
                    </span>
                  )}
                  <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-content-muted dark:border-white/5 dark:bg-zinc-800">
                    {subj.topics.length} tópicos
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(sIdx)}
                    aria-label={`Expandir matéria ${subj.title}`}
                    className="p-1 text-content-muted transition-colors hover:text-foreground"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        subj.expanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {subj.expanded && (
                <div className="border-t border-border bg-background/50 p-3.5 dark:border-white/5 dark:bg-zinc-950/20">
                  {/* Peso */}
                  <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-xs dark:border-white/5">
                    <span className="font-bold text-foreground">Peso da prova:</span>
                    <label className="flex items-center gap-1">
                      <span className="text-[10px] text-content-muted">Questões:</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatExamWeightInputValue(subj.weight?.questions)}
                        onChange={(e) => handleWeightChange(sIdx, 'questions', e.target.value)}
                        className="h-6 w-12 rounded border border-border bg-background px-1.5 text-center text-xs font-bold text-foreground outline-none focus:border-primary dark:border-white/10"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="text-[10px] text-content-muted">Pontos:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatExamWeightInputValue(subj.weight?.points)}
                        onChange={(e) => handleWeightChange(sIdx, 'points', e.target.value)}
                        className="h-6 w-12 rounded border border-border bg-background px-1.5 text-center text-xs font-bold text-foreground outline-none focus:border-primary dark:border-white/10"
                      />
                    </label>
                    {getSubjectExamWeightLine(
                      getAiSubjectWeightAdapter(subj),
                      examWeightTotals,
                      { derivePercentageFromQuestions: false, derivePercentageFromPoints: false }
                    ) && (
                      <span className="text-[11px] font-semibold text-emerald-400">
                        {getSubjectExamWeightLine(
                          getAiSubjectWeightAdapter(subj),
                          examWeightTotals,
                          { derivePercentageFromQuestions: false, derivePercentageFromPoints: false }
                        )}
                      </span>
                    )}
                  </div>

                  {/* Tópicos */}
                  <div className="space-y-1.5">
                    {subj.topics.map((topic, tIdx) => (
                      <label
                        key={tIdx}
                        className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-secondary/40"
                      >
                        <input
                          type="checkbox"
                          checked={topic.selected}
                          onChange={() => handleToggleTopic(sIdx, tIdx)}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded accent-primary"
                        />
                        <span className="flex-1 text-xs leading-relaxed text-foreground">
                          {topic.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Rodapé Fixo de Confirmação ── */}
      <div
        className={`flex flex-col gap-3 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between z-20 ${
          inlineMode
            ? 'sticky bottom-4 rounded-2xl border border-border bg-card dark:border-white/10 dark:bg-zinc-900/90 shadow-2xl shadow-black/20'
            : 'sticky bottom-0 -mx-5 -mb-5 px-6 py-3.5 bg-white/95 dark:bg-[#18181A]/95 border-t border-border/70 dark:border-white/10 shadow-lg'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {hasPendingDraft && onDiscardPending && (
            <button
              type="button"
              onClick={onDiscardPending}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 rounded-xl transition-colors disabled:opacity-40"
            >
              <Trash2 size={13} aria-hidden="true" />
              Descartar rascunho
            </button>
          )}
          <div className="text-xs text-content-muted">
            Importando <strong className="text-foreground">{selectedSubjectsCount} matérias</strong> e{' '}
            <strong className="text-foreground">{selectedTopicsCount} tópicos</strong>.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onBackToCargo && (
            <button
              type="button"
              onClick={onBackToCargo}
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-4 text-xs font-bold text-foreground transition-all hover:bg-secondary hover:text-foreground dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Voltar ao cargo
            </button>
          )}
          <button
            type="button"
            onClick={onConfirmImport}
            disabled={selectedSubjectsCount === 0 || isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Salvando edital...
              </>
            ) : (
              <>
                <Sparkles size={16} aria-hidden="true" />
                Importar edital
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
