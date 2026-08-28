import { useState } from 'react';
import { RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PracticeFeedbackReason } from '@/features/practice/types/practice';

const negativeReasons: Array<{ value: PracticeFeedbackReason; label: string }> = [
  { value: 'wrong_answer', label: 'Resposta incorreta' },
  { value: 'ambiguous', label: 'Ambígua' },
  { value: 'off_topic', label: 'Fora do tópico' },
  { value: 'repetitive', label: 'Repetitiva' },
  { value: 'too_easy', label: 'Fácil demais' },
  { value: 'bad_explanation', label: 'Explicação ruim' },
];

type PracticeItemRatingProps = {
  onRate?: (rating: 1 | -1, reason?: PracticeFeedbackReason) => Promise<unknown> | void;
};

export const PracticeItemRating = ({ onRate }: PracticeItemRatingProps) => {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [removedReason, setRemovedReason] = useState<PracticeFeedbackReason | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = async (nextRating: 1 | -1, reason?: PracticeFeedbackReason) => {
    setSaving(true);
    setError(null);
    try {
      const operation = reason ? onRate?.(nextRating, reason) : onRate?.(nextRating);
      if (operation instanceof Promise) await operation;
      return true;
    } catch {
      setError('Não foi possível registrar sua avaliação. Tente novamente.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePositive = async () => {
    setRating(1);
    setRemovedReason(null);
    if (!await persist(1)) setRating(null);
  };

  const handleNegative = () => {
    setRating(-1);
    setRemovedReason(null);
  };

  const handleReason = async (reason: PracticeFeedbackReason) => {
    if (await persist(-1, reason)) setRemovedReason(reason);
  };

  const handleUndo = async () => {
    if (!await persist(1)) return;
    setRating(null);
    setRemovedReason(null);
  };

  if (removedReason) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/35 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Questão removida dos seus próximos treinos</p>
          <p className="mt-0.5 text-xs text-content-muted">O histórico desta tentativa foi preservado.</p>
        </div>
        <Button type="button" variant="quiet" size="sm" onClick={handleUndo}>
          <RotateCcw className="h-4 w-4" />
          Desfazer
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Esta questão foi útil?</p>
        <div className="flex items-center gap-2" aria-label="Avaliar questão">
          <button
            type="button"
            aria-label="Questão útil"
            aria-pressed={rating === 1}
            onClick={() => void handlePositive()}
            disabled={saving}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
              rating === 1
                ? 'border-success/35 bg-success/10 text-success'
                : 'border-border bg-card text-content-muted hover:bg-secondary hover:text-foreground',
            )}
          >
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Questão não útil"
            aria-pressed={rating === -1}
            onClick={handleNegative}
            disabled={saving}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35',
              rating === -1
                ? 'border-destructive/35 bg-destructive/10 text-destructive'
                : 'border-border bg-card text-content-muted hover:bg-secondary hover:text-foreground',
            )}
          >
            <ThumbsDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {rating === 1 && (
        <p className="mt-3 text-xs font-medium text-success">Avaliação registrada. Isso ajuda a selecionar treinos melhores.</p>
      )}

      {rating === -1 && (
        <div className="mt-4" role="group" aria-label="Motivo da avaliação negativa">
          <p className="mb-2 text-xs font-medium text-content-muted">O que precisa melhorar?</p>
          <div className="flex flex-wrap gap-2">
            {negativeReasons.map((reason) => (
              <button
                key={reason.value}
                type="button"
                onClick={() => void handleReason(reason.value)}
                disabled={saving}
                className="min-h-10 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
              >
                {reason.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-xs font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
};
