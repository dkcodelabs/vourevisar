import { useCallback } from 'react';

type UnloadConfirmState = {
  editalId: string | null;
  editalName?: string | null;
  isOpen: boolean;
};

type UseCycleUnloadConfirmationInput = {
  handleUnloadCycle: (editalId: string, editalName: string) => Promise<boolean>;
  setUnloadConfirm: React.Dispatch<React.SetStateAction<UnloadConfirmState>>;
  unloadConfirm: UnloadConfirmState;
};

export function useCycleUnloadConfirmation({
  handleUnloadCycle,
  setUnloadConfirm,
  unloadConfirm,
}: UseCycleUnloadConfirmationInput) {
  const handleUnloadConfirm = useCallback(async () => {
    if (!unloadConfirm.editalId) return;

    const removed = await handleUnloadCycle(
      unloadConfirm.editalId,
      unloadConfirm.editalName || '',
    );

    if (removed) {
      setUnloadConfirm((previous) => ({ ...previous, isOpen: false }));
    }
  }, [handleUnloadCycle, setUnloadConfirm, unloadConfirm.editalId, unloadConfirm.editalName]);

  const handleUnloadConfirmOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setUnloadConfirm((previous) => ({ ...previous, isOpen: false }));
    }
  }, [setUnloadConfirm]);

  return {
    handleUnloadConfirm,
    handleUnloadConfirmOpenChange,
  };
}
