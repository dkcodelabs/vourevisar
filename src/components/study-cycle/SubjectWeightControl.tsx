import {
  Check,
  Gauge,
  Loader2,
  X,
} from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Subject } from '@/types';
import { getSubjectStrategicWeight } from '@/utils/studyCycleStrategic';

type WeightDraft = {
  questions: string;
  points: string;
  percentage: string;
};

type SubjectWeightControlProps = {
  isEditing: boolean;
  isSaving: boolean;
  isSaved: boolean;
  onCancel: () => void;
  onClearSaved: () => void;
  onDraftChange: (updater: (draft: WeightDraft) => WeightDraft) => void;
  onSave: (subjectId: string) => void;
  onStartEdit: (subject: Subject) => void;
  subject: Subject;
  weightDraft: WeightDraft;
};

const renderWeightTooltip = (
  content: ReactNode,
  trigger: ReactElement,
) => (
  <TooltipProvider delayDuration={120}>
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export function SubjectWeightControl({
  isEditing,
  isSaving,
  isSaved,
  onCancel,
  onClearSaved,
  onDraftChange,
  onSave,
  onStartEdit,
  subject,
  weightDraft,
}: SubjectWeightControlProps) {
  const strategicWeight = getSubjectStrategicWeight(subject);

  if (isSaved && !isEditing) {
    return (
      <div
        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-success/20 bg-success/10 px-2.5 py-1.5 text-success"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="app-type-caption inline-flex min-w-0 items-center gap-1.5 font-semibold">
          <Check size={12} strokeWidth={3} />
          Peso atualizado
        </span>
        <button
          type="button"
          onClick={onClearSaved}
          className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-success/70 transition-colors hover:bg-success/15 hover:text-success"
          aria-label="Fechar confirmação de peso"
        >
          <X size={11} />
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div
        className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3.25rem] items-end gap-1 rounded-lg border border-warning/25 bg-warning/10 px-1.5 py-1"
        onClick={(event) => event.stopPropagation()}
      >
        <label className="min-w-0">
          <span className="mb-0.5 block truncate text-[8px] font-semibold uppercase leading-none text-content-muted">
            Questões
          </span>
          <input
            value={weightDraft.questions}
            onChange={(event) => onDraftChange(prev => ({ ...prev, questions: event.target.value }))}
            placeholder="0"
            inputMode="decimal"
            aria-label="Quantidade de questões da matéria"
            className="app-field app-type-control h-6 w-full min-w-0 px-1.5 text-[10px] backdrop-blur placeholder:text-content-muted/60"
          />
        </label>
        <label className="min-w-0">
          <span className="mb-0.5 block truncate text-[8px] font-semibold uppercase leading-none text-content-muted">
            Pontos
          </span>
          <input
            value={weightDraft.points}
            onChange={(event) => onDraftChange(prev => ({ ...prev, points: event.target.value }))}
            placeholder="0"
            inputMode="decimal"
            aria-label="Quantidade de pontos da matéria"
            className="app-field app-type-control h-6 w-full min-w-0 px-1.5 text-[10px] backdrop-blur placeholder:text-content-muted/60"
          />
        </label>
        <div className="flex min-w-0 items-end justify-end gap-1">
          {renderWeightTooltip(
            'Salvar peso',
            <button
              type="button"
              onClick={() => onSave(subject.id)}
              disabled={isSaving}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-control-hover disabled:text-content-muted/70"
              aria-label="Salvar peso da matéria"
            >
              {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            </button>
          )}
          {renderWeightTooltip(
            'Cancelar',
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-input bg-control text-content-muted transition-colors hover:bg-control-hover hover:text-control-foreground disabled:text-content-muted/60"
              aria-label="Cancelar edição de peso"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return renderWeightTooltip(
    strategicWeight.hasWeight ? `${strategicWeight.label}. Clique para editar.` : 'Clique para informar o peso desta matéria.',
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onStartEdit(subject);
      }}
      className={`app-type-meta inline-flex items-center gap-1 transition-colors ${
        strategicWeight.hasWeight
          ? 'text-content-muted/70 hover:text-primary'
          : 'text-warning/80 hover:text-warning'
      }`}
      aria-label={strategicWeight.hasWeight ? 'Editar peso da matéria' : 'Informar peso da matéria'}
    >
      {strategicWeight.hasWeight ? (
        strategicWeight.label
      ) : (
        <>
          <Gauge size={11} strokeWidth={2.2} />
          <span className="sr-only">Sem peso informado</span>
        </>
      )}
    </button>
  );
}
