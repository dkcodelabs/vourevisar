
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DifficultyRating } from '@/components/ui/difficulty-rating';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Info, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DifficultyRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (difficulty: number | null) => void | Promise<void>;
  onConfirmReview?: (difficulty: number | null, duration?: number) => void | Promise<void>;
  onDiscard?: () => void;
  onResume?: () => void;
  topicName: string;
  subjectName: string;
  initialDifficulty?: number | null;
  reviewStage?: string;
  reviewCount?: number;
  isCompleting?: boolean;
  duration?: number;
  isSaving?: boolean;
  savingText?: string;
}

export const DifficultyRatingModal: React.FC<DifficultyRatingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onConfirmReview,
  onDiscard,
  onResume,
  topicName,
  subjectName,
  initialDifficulty = null,
  reviewStage,
  reviewCount,
  duration = 0,
  isSaving = false,
  savingText = 'Salvando...'
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [editedDuration, setEditedDuration] = useState<string>('');
  const durationInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedReviewCount = Math.max(0, reviewCount || 0);
  const isFirstContact = normalizedReviewCount <= 1;
  const reviewOrdinalBeingRecorded = Math.max(1, normalizedReviewCount - 1);
  const previousContactCount = Math.max(0, normalizedReviewCount - 1);
  const previousReviewCount = Math.max(0, previousContactCount - 1);
  const stageLabel = isFirstContact
    ? 'MARCANDO 1º CONTATO'
    : `MARCANDO ${reviewOrdinalBeingRecorded}ª REVISÃO`;
  const progressLabel = isFirstContact
    ? 'Nenhum contato registrado ainda.'
    : `Já registrado: ${previousContactCount === 1 ? '1º contato' : `${previousContactCount} contatos`} (${previousReviewCount} ${previousReviewCount === 1 ? 'revisão realizada' : 'revisões realizadas'}).`;
  const primaryActionLabel = onConfirmReview
    ? (isFirstContact ? 'Finalizar' : 'Confirmar')
    : 'Salvar';
  const noticeTitle = isFirstContact ? 'Primeiro contato detectado' : 'Revisão adaptativa';
  const noticeText = isFirstContact
    ? 'O sistema criará automaticamente as próximas revisões com base no seu desempenho de hoje.'
    : `Ao confirmar, esta será registrada como ${reviewOrdinalBeingRecorded}ª revisão do tópico.`;

  const focusDurationInput = () => {
    const input = durationInputRef.current;
    if (!input) return;
    input.focus();
    requestAnimationFrame(() => {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  };

  // Definir dificuldade e duração inicial quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedDifficulty(initialDifficulty);
      setEditedDuration(String(Math.max(1, duration || 0))); // Garantir mínimo de 1 minuto
    }
  }, [isOpen, initialDifficulty, duration]);

  // Handler para mudança de dificuldade
  const handleDifficultyChange = (value: number) => {
    setSelectedDifficulty(value);
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    try {
      if (onConfirmReview) {
        const durationVal = parseInt(editedDuration) || 1;
        await onConfirmReview(selectedDifficulty, durationVal);
      } else {
        await onSubmit(selectedDifficulty);
      }

      onClose();
      setSelectedDifficulty(null);
    } catch (error) {
      console.error('Erro ao salvar avaliação/revisão:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
      onClick={() => !isSaving && onClose()}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-card p-6 text-sm text-foreground shadow-2xl shadow-black/35 dark:bg-zinc-900"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/50 text-content-muted transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
          title="Fechar e manter pausa"
          aria-label="Fechar e manter pausa"
          disabled={isSaving}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 pr-12">
          <div className="mb-4 inline-flex h-6 items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
            {stageLabel}
          </div>
          <p className="mb-4 text-[11px] font-medium text-content-muted">
            {progressLabel}
          </p>

          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold leading-tight text-foreground">
              {subjectName || 'Matéria'}
            </h2>
            <div className="mt-1.5 flex min-w-0 items-center gap-2 pl-4 text-xs font-medium text-content-muted">
              <span className="h-1 w-1 shrink-0 rounded-full bg-content-muted/50" />
              <span className="truncate">{topicName || reviewStage || 'Tópico'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {onConfirmReview && (
            <div className="space-y-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                <span>Tempo de estudo</span>
              </div>
              <div
                className="flex h-11 cursor-text items-center gap-3 rounded-xl border border-border bg-secondary/35 px-3.5 transition-colors hover:bg-secondary/45 focus-within:border-border focus-within:bg-secondary/50"
                onClick={focusDurationInput}
              >
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                <div className="flex w-full items-center gap-1.5">
                  <Input
                    ref={durationInputRef}
                    id="duration-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={editedDuration}
                    onFocus={focusDurationInput}
                    onChange={(e) => {
                      setEditedDuration(e.target.value.replace(/\D/g, '').slice(0, 3));
                    }}
                    className="h-8 w-10 rounded-none border-0 bg-transparent p-0 text-left text-sm font-semibold text-foreground shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <span className="text-xs font-medium text-content-muted">minutos</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
              Nível de dificuldade
            </h3>
            <DifficultyRating
              value={selectedDifficulty}
              onChange={handleDifficultyChange}
              size="lg"
              showLabel={false}
              allowClear={false}
              className="[&>div]:max-w-none [&_button]:min-h-[72px] [&_button]:rounded-xl [&_button]:border-border [&_button]:bg-secondary/30 [&_button]:px-4 [&_button]:py-3 [&_button_span]:text-[11px] [&_button_span]:uppercase"
            />
          </div>

          <div className="flex gap-3 rounded-xl border border-border bg-secondary/25 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Info className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground">{noticeTitle}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-content-muted">{noticeText}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[0.9fr_1.25fr]">
            <Button
              variant="outline"
              onClick={() => onResume ? onResume() : onClose()}
              className="h-10 rounded-xl border-border bg-secondary/35 text-[11px] font-semibold uppercase tracking-[0.12em] text-content-muted hover:bg-secondary hover:text-foreground"
              disabled={isSaving}
            >
              Voltar
            </Button>
            <Button
              onClick={handleSubmit}
              className="h-10 rounded-xl bg-primary text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 disabled:bg-secondary disabled:text-content-muted disabled:shadow-none"
              disabled={!selectedDifficulty || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {savingText}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {primaryActionLabel}
                </>
              )}
            </Button>
          </div>

          {onDiscard && (
            <button
              onClick={onDiscard}
              className="mx-auto mt-1 text-xs font-medium text-rose-400 hover:text-rose-300 hover:underline"
              disabled={isSaving}
            >
              Descartar Sessão
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
