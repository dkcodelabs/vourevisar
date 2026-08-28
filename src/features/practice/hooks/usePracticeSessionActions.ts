import { useMutation } from '@tanstack/react-query';

import {
  buildPracticeSession,
  generatePracticePackage,
  ratePracticeItem,
  revealPracticeItem,
  submitPracticeAttempt,
} from '@/features/practice/services/practiceService';

export const usePracticeSessionActions = () => ({
  buildSession: useMutation({ mutationFn: buildPracticeSession }),
  generatePackage: useMutation({ mutationFn: generatePracticePackage }),
  revealItem: useMutation({
    mutationFn: ({ sessionId, itemId }: { sessionId: string; itemId: string }) =>
      revealPracticeItem(sessionId, itemId),
  }),
  submitAttempt: useMutation({ mutationFn: submitPracticeAttempt }),
  rateItem: useMutation({ mutationFn: ratePracticeItem }),
});
