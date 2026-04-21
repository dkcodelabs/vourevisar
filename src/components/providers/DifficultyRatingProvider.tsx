import React, { createContext, useContext } from 'react';
import { useDifficultyRating } from '@/hooks/useDifficultyRating';
import { DifficultyRatingModal } from '@/components/modals/DifficultyRatingModal';

interface DifficultyRatingContextType {
  showDifficultyModal: (
    topicId: string,
    topicName: string,
    subjectId: string,
    subjectName: string
  ) => void;
  updateTopicDifficulty: (
    subjectId: string,
    topicId: string,
    difficulty: number | null
  ) => Promise<void>;
}

const DifficultyRatingContext = createContext<DifficultyRatingContextType | undefined>(undefined);

export const DifficultyRatingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    ratingState,
    isLoading,
    showDifficultyModal,
    closeDifficultyModal,
    submitDifficultyRating,
    updateTopicDifficulty,
  } = useDifficultyRating();

  return (
    <DifficultyRatingContext.Provider value={{ showDifficultyModal, updateTopicDifficulty }}>
      {children}
      
      <DifficultyRatingModal
        isOpen={ratingState.isModalOpen}
        onClose={closeDifficultyModal}
        onSubmit={submitDifficultyRating}
        isSaving={isLoading}
        topicName={ratingState.topicName || ''}
        subjectName={ratingState.subjectName || ''}
      />
    </DifficultyRatingContext.Provider>
  );
};

export const useDifficultyRatingContext = () => {
  const context = useContext(DifficultyRatingContext);
  if (context === undefined) {
    throw new Error('useDifficultyRatingContext deve ser usado dentro de um DifficultyRatingProvider');
  }
  return context;
};