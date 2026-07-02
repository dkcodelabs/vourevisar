import { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/lib/toast';
import { toastGate } from '@/lib/errors/toastGate';
import type { DifficultyLevel } from '@/types';

interface DifficultyRatingState {
  isModalOpen: boolean;
  topicId: string | null;
  topicName: string | null;
  subjectId: string | null;
  subjectName: string | null;
}

export const useDifficultyRating = () => {
  const { updateTopic } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [ratingState, setRatingState] = useState<DifficultyRatingState>({
    isModalOpen: false,
    topicId: null,
    topicName: null,
    subjectId: null,
    subjectName: null,
  });

  const showDifficultyModal = useCallback((
    topicId: string,
    topicName: string,
    subjectId: string,
    subjectName: string
  ) => {
    setRatingState({
      isModalOpen: true,
      topicId,
      topicName,
      subjectId,
      subjectName,
    });
  }, []);

  const closeDifficultyModal = useCallback(() => {
    setRatingState({
      isModalOpen: false,
      topicId: null,
      topicName: null,
      subjectId: null,
      subjectName: null,
    });
  }, []);

  const submitDifficultyRating = useCallback(async (difficulty: number | null) => {
    if (!ratingState.topicId || !ratingState.subjectId) return;

    setIsLoading(true);
    try {
      await updateTopic(ratingState.subjectId, ratingState.topicId, {
        difficulty_level: difficulty as DifficultyLevel | null,
      });

      if (difficulty) {
        const difficultyLabels = {
          1: 'Fácil',
          2: 'Médio',
          3: 'Difícil'
        };
        
        toast.success(`Dificuldade marcada como: ${difficultyLabels[difficulty as keyof typeof difficultyLabels]}`);
      } else {
        toast.info('Avaliação de dificuldade pulada');
      }
    } catch (error) {
      console.error('Erro ao salvar dificuldade:', error);
      toastGate.notifyError('Erro ao salvar avaliação de dificuldade', 'HOOKS-USEDIFFICULTYRATING-01', { severity: 'medium' });
    } finally {
      setIsLoading(false);
    }
  }, [ratingState, updateTopic]);

  const updateTopicDifficulty = useCallback(async (
    subjectId: string,
    topicId: string,
    difficulty: number | null
  ) => {
    setIsLoading(true);
    try {
      await updateTopic(subjectId, topicId, {
        difficulty_level: difficulty as DifficultyLevel | null,
      });

      if (difficulty) {
        const difficultyLabels = {
          1: 'Fácil',
          2: 'Médio',
          3: 'Difícil'
        };
        toast.success(`Dificuldade atualizada para ${difficultyLabels[difficulty as keyof typeof difficultyLabels]}!`);
      } else {
        toast.info('Avaliação de dificuldade removida');
      }
    } catch (error) {
      console.error('Erro ao atualizar dificuldade:', error);
      toastGate.notifyError('Erro ao atualizar dificuldade', 'HOOKS-USEDIFFICULTYRATING-02', { severity: 'medium' });
    } finally {
      setIsLoading(false);
    }
  }, [updateTopic]);

  return {
    ratingState,
    isLoading,
    showDifficultyModal,
    closeDifficultyModal,
    submitDifficultyRating,
    updateTopicDifficulty,
  };
};
