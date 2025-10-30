import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DifficultyRating } from '@/components/ui/difficulty-rating';
import { motion } from 'framer-motion';
import { Trophy, Star, CheckCircle2, X } from 'lucide-react';

interface DifficultyRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (difficulty: number | null) => void;
  topicName: string;
  subjectName: string;
  initialDifficulty?: number | null;
}

export const DifficultyRatingModal: React.FC<DifficultyRatingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  topicName,
  subjectName,
  initialDifficulty = null
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  
  // Definir dificuldade inicial quando o modal abrir
  React.useEffect(() => {
    if (isOpen) {
      setSelectedDifficulty(initialDifficulty);
    }
  }, [isOpen, initialDifficulty]);
  

  


  const handleSubmit = () => {
    onSubmit(selectedDifficulty);
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
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-4 p-3 rounded-full bg-green-100 w-fit"
          >
            <Trophy className="h-8 w-8 text-green-600" />
          </motion.div>
          
          <h2 className="text-xl font-bold text-green-900 mb-2">
            Tópico Concluído! 🎉
          </h2>
          
          <div className="space-y-1">
            <div className="font-medium text-gray-900">
              {topicName}
            </div>
            <div className="text-sm text-gray-600">
              {subjectName}
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Como foi a dificuldade?
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Sua avaliação nos ajuda a personalizar suas próximas sessões
            </p>
          </div>

          <div className="flex justify-center">
            <DifficultyRating
              value={selectedDifficulty}
              onChange={setSelectedDifficulty}
              size="lg"
              showLabel={true}
            />
          </div>

          {selectedDifficulty && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center p-3 bg-blue-50 rounded-lg"
            >
              <CheckCircle2 className="h-5 w-5 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-blue-800">
                Perfeito! Isso nos ajuda a estimar melhor seus tempos de estudo.
              </p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 mt-6">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
          >
            {initialDifficulty ? 'Remover' : 'Pular'}
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700"
            disabled={!selectedDifficulty}
          >
            {initialDifficulty ? 'Atualizar' : (selectedDifficulty ? 'Confirmar' : 'Avaliar')}
          </Button>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">
            Você pode alterar esta avaliação depois nas configurações do tópico
          </p>
        </div>
      </motion.div>
    </div>
  );
};