import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { UserCycle } from '@/types';

type UseCycleExamDateDeepLinkInput<T extends UserCycle> = {
  isLoading: boolean;
  openEditor: () => void;
  userCycle: T | null;
};

/** Opens the existing cycle-date editor after navigation from a contextual CTA. */
export function useCycleExamDateDeepLink<T extends UserCycle>({
  isLoading,
  openEditor,
  userCycle,
}: UseCycleExamDateDeepLinkInput<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('action') !== 'edit-exam-date' || !userCycle || isLoading) return;

    openEditor();
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('action');
    setSearchParams(nextSearchParams, { replace: true });
  }, [isLoading, openEditor, searchParams, setSearchParams, userCycle]);
}
