import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DifficultyRating } from '@/components/ui/difficulty-rating';
import { motion } from 'framer-motion';
import { Trophy, Star, CheckCircle2, X } from 'lucide-react';

interface DifficultyRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (difficulty: number | null) => void;
  onConfirmReview?: (difficulty: number | null) => void;
  topicName: string;
  subjectName: string;
  initialDifficulty?: number | null;
  reviewStage?: string;
  reviewCount?: number;
  isCompleting?: boolean;
}

export const DifficultyRatingModal: React.FC<DifficultyRatingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onConfirmReview,
  topicName,
  subjectName,
  initialDifficulty = null,
  reviewStage,
  reviewCount,
  isCompleting = false
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [hasUserChanged, setHasUserChanged] = useState(false);

  // Definir dificuldade inicial quando o modal abrir
  React.useEffect(() => {
    if (isOpen) {
      setSelectedDifficulty(initialDifficulty);
      setHasUserChanged(false); // Resetar flag quando modal abre
    }
  }, [isOpen, initialDifficulty]);

  // Handler para mudança de dificuldade
  const handleDifficultyChange = (value: number) => {
    setSelectedDifficulty(value);
    setHasUserChanged(true); // Marcar que usuário fez uma mudança
  };





  const handleSubmit = () => {
    if (onConfirmReview) {
      // Novo fluxo: confirmar revisão + salvar dificuldade
      onConfirmReview(selectedDifficulty);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        {/* Botão de fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header com ícone inline */}
        <div className="text-center mb-6">
          {/* Título com ícone inline */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="p-2 rounded-full bg-green-100"
            >
              {initialDifficulty !== null ? (
                <Star className="h-6 w-6 text-yellow-500" />
              ) : (
                <Trophy className="h-6 w-6 text-green-600" />
              )}
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {reviewCount ? (
                reviewCount === 1 ? '1ª Revisão' :
                  reviewCount === 2 ? '2ª Revisão' :
                    reviewCount === 3 ? '3ª Revisão' :
                      reviewCount === 4 ? '4ª Revisão' :
                        isCompleting ? 'Tópico Concluído' : 'Revisar Tópico'
              ) : (
                initialDifficulty !== null ? 'Avaliar Dificuldade' : 'Tópico Concluído'
              )}
            </h2>
          </div>

          {/* Matéria e Tópico */}
          <div className="space-y-1">
            <div className="font-medium text-gray-900 text-base sm:text-lg">
              {subjectName}
            </div>
            <div className="text-sm text-gray-600">
              {topicName}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="space-y-4">
          {/* Seletor de dificuldade */}
          <div className="text-center">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
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
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 order-2 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700 order-1 sm:order-2"
            disabled={onConfirmReview && !selectedDifficulty}
          >
            {onConfirmReview ? 'Confirmar Revisão' : 'Salvar'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};