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
    case '1d':
    case '1 dia':
    case '24h':
      return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
    case '3d':
    case '3 dias':
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    case '7d':
    case '7 dias':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '15d':
    case '15 dias':
      return new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
    case '30 dias':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return now.toISOString();
  }
};
