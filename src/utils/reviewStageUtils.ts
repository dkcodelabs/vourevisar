
export const getNextReviewStage = (currentStage: string): string => {
  const stages = ['24h', '7 dias', '30 dias', 'Concluído'];
  const currentIndex = stages.indexOf(currentStage);
  return currentIndex >= 0 && currentIndex < stages.length - 1 
    ? stages[currentIndex + 1] 
    : 'Concluído';
};

export const getNextReviewDate = (stage: string): string => {
  const now = new Date();
  switch (stage) {
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case '7 dias':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30 dias':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return now.toISOString();
  }
};
