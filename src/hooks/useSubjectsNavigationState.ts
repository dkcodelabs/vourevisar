import { useCallback, useEffect, useRef, useState } from 'react';

type ImportTab = 'ready' | 'ia' | 'manual';

type SubjectsLocationState = {
  openImportModal?: boolean;
  importTab?: ImportTab;
  focusSubjectId?: string;
  focusTopicId?: string;
} | null;

type UseSubjectsNavigationStateInput = {
  locationState: SubjectsLocationState;
};

export function useSubjectsNavigationState({
  locationState,
}: UseSubjectsNavigationStateInput) {
  const [isImportEditalModalOpen, setIsImportEditalModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<ImportTab>('ready');
  const [isCycleSearchOpen, setIsCycleSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeImportEditalModal = useCallback(() => setIsImportEditalModalOpen(false), []);
  const openCycleSearch = useCallback(() => setIsCycleSearchOpen(true), []);

  useEffect(() => {
    if (!locationState?.openImportModal) return;

    setIsImportEditalModalOpen(true);
    if (locationState.importTab) {
      setModalInitialTab(locationState.importTab);
    }

    window.history.replaceState({}, document.title);
  }, [locationState]);

  useEffect(() => {
    if (!isCycleSearchOpen || !inputRef.current) return;

    const timeoutId = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [isCycleSearchOpen]);

  return {
    closeImportEditalModal,
    inputRef,
    isCycleSearchOpen,
    isImportEditalModalOpen,
    modalInitialTab,
    openCycleSearch,
    setIsCycleSearchOpen,
    setIsImportEditalModalOpen,
  };
}
