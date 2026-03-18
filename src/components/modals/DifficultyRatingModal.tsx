
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DifficultyRating } from '@/components/ui/difficulty-rating';
import { motion } from 'framer-motion';
import { Trophy, Star, CheckCircle2, X, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DifficultyRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (difficulty: number | null) => void;
  onConfirmReview?: (difficulty: number | null, duration?: number) => void;
  onDiscard?: () => void;
  onResume?: () => void;
  topicName: string;
  subjectName: string;
  initialDifficulty?: number | null;
  reviewStage?: string;
  reviewCount?: number;
  isCompleting?: boolean;
  duration?: number;
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
  isCompleting = false,
  duration = 0
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [hasUserChanged, setHasUserChanged] = useState(false);
  const [editedDuration, setEditedDuration] = useState<string>('');

  // Definir dificuldade e duração inicial quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedDifficulty(initialDifficulty);
      setHasUserChanged(false); // Resetar flag quando modal abre
      setEditedDuration(String(Math.max(1, duration || 0))); // Garantir mínimo de 1 minuto
    }
  }, [isOpen, initialDifficulty, duration]);

  // Handler para mudança de dificuldade
  const handleDifficultyChange = (value: number) => {
    setSelectedDifficulty(value);
    setHasUserChanged(true); // Marcar que usuário fez uma mudança
  };

  const handleSubmit = () => {
    if (onConfirmReview) {
      // Novo fluxo: confirmar revisão + salvar dificuldade + duração
      // Parse duration to number, default to 1 if invalid
      const durationVal = parseInt(editedDuration) || 1;
      onConfirmReview(selectedDifficulty, durationVal);
    } else {
      // Fluxo antigo: apenas salvar dificuldade
      onSubmit(selectedDifficulty);
    }
    onClose();
    setSelectedDifficulty(null);
  };

  const handleSkip = () => {
    onSubmit(null);
    onClose();
    setSelectedDifficulty(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-border md:bg-white md:dark:bg-slate-900 md:dark:border-slate-800 md:light:bg-card md:light:border-border"
      >
        {/* Botão de fechar com tooltip */}
        <div className="absolute top-4 right-4 z-10 flex flex-col items-center group">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-accent text-content-muted hover:text-foreground transition-colors md:hover:bg-slate-100 md:dark:hover:bg-slate-800 md:light:hover:bg-accent md:light:text-content-muted md:light:hover:text-foreground"
            title="Fechar e manter pausa"
            aria-label="Fechar e manter pausa"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Tooltip CSS puro */}
          <div className="absolute top-full right-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-medium px-2 py-1 flex items-center gap-1 rounded shadow-lg before:content-[''] before:-top-1 before:right-3 before:absolute before:border-x-[4px] before:border-x-transparent before:border-b-[4px] before:border-b-slate-800 dark:before:border-b-slate-700">
            Fechar e manter pausa
          </div>
        </div>

        {/* Header com ícone inline */}
        <div className="text-center mb-6">
          {/* Título com ícone inline */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="p-2 rounded-full bg-emerald-500/10 md:bg-green-100 md:light:bg-emerald-500/10"
            >
              {initialDifficulty !== null ? (
                <Star className="h-6 w-6 text-yellow-500" />
              ) : (
                <Trophy className="h-6 w-6 text-emerald-600 md:text-green-600 md:light:text-emerald-600" />
              )}
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground md:text-gray-900 md:dark:text-slate-100 md:light:text-foreground">
              {reviewCount ? (
                reviewCount === 1 ? '1º Estudo' :
                  reviewCount === 2 ? '1ª Revisão' :
                    reviewCount === 3 ? '2ª Revisão' :
                      reviewCount === 4 ? '3ª Revisão' :
                        reviewCount === 5 ? '4ª Revisão' :
                          isCompleting ? 'Tópico Concluído' : 'Revisar Tópico'
              ) : (
                initialDifficulty !== null ? 'Avaliar Dificuldade' : 'Tópico Concluído'
              )}
            </h2>
          </div>

          {/* Matéria e Tópico */}
          <div className="space-y-1">
            <div className="font-medium text-foreground text-base sm:text-lg md:text-gray-900 md:dark:text-slate-200 md:light:text-foreground">
              {subjectName}
            </div>
            <div className="text-sm text-content-muted md:text-gray-600 md:dark:text-slate-400 md:light:text-content-muted">
              {topicName}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="space-y-4">

          {/* Input de Tempo Estudado (Se for fluxo de revisão) */}
          {onConfirmReview && (
            <div className="flex items-center justify-center mb-6">
              <div
                className="flex items-center gap-3 bg-card border border-border shadow-sm rounded-full px-5 py-2.5 hover:border-primary/30 hover:shadow-md transition-all cursor-text group md:bg-white md:dark:bg-slate-800 md:dark:border-slate-700 md:light:bg-card md:light:border-border"
                onClick={() => document.getElementById('duration-input')?.focus()}
              >
                <div className="p-1.5 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors md:bg-indigo-50 md:dark:bg-indigo-900/30 md:light:bg-primary/10">
                  <Clock size={16} className="text-primary md:text-indigo-600 md:dark:text-indigo-400 md:light:text-primary" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-medium text-content-muted md:text-slate-500 md:dark:text-slate-400 md:light:text-content-muted">Tempo:</span>
                  <Input
                    id="duration-input"
                    type="number"
                    min="1"
                    value={editedDuration}
                    onChange={(e) => {
                      // Allow empty string to let user clear input
                      setEditedDuration(e.target.value);
                    }}
                    className="w-14 h-auto text-center px-0 py-0 text-xl font-bold text-indigo-700 dark:text-indigo-300 bg-transparent border-none focus-visible:ring-0 p-0 m-0 [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">min</span>
                </div>
              </div>
            </div>
          )}

          {/* Seletor de dificuldade */}
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 md:text-gray-900 md:dark:text-slate-200 md:light:text-foreground">
              Como foi a dificuldade?
            </h3>
            <DifficultyRating
              value={selectedDifficulty}
              onChange={handleDifficultyChange}
              size="lg"
              showLabel={true}
            />
          </div>

          {/* Feedback condicional - só aparece quando usuário ALTERA ativamente */}
          {hasUserChanged && selectedDifficulty && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center p-3 bg-blue-50 rounded-lg"
            >
              <CheckCircle2 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-sm text-blue-800">
                Perfeito! Isso nos ajuda a personalizar suas próximas sessões.
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer - Botões */}
        <div className="flex flex-col gap-3 mt-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => onResume ? onResume() : onClose()}
              className="flex-1 order-2 sm:order-1 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition-all"
            >
              Voltar a Estudar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-500 order-1 sm:order-2 transition-all dark:bg-green-700 dark:hover:bg-green-600"
              disabled={onConfirmReview && !selectedDifficulty}
            >
              {onConfirmReview ? 'Confirmar Revisão' : 'Salvar'}
            </Button>
          </div>

          {/* Botão Descartar Sessão (Terceria Opção) */}
          {onDiscard && (
            <button
              onClick={onDiscard}
              className="text-xs text-red-500 hover:text-red-700 hover:underline mx-auto mt-1"
            >
              Descartar Sessão
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};