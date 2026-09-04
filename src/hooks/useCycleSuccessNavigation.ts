import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorService } from '@/lib/errors/errorService';
import { updateCycleDetails } from '@/services/editaisPageService';
import { sanitizeExamDate, type CycleConflictState } from '@/utils/editaisPagePresentation';

export const useCycleSuccessNavigation = ({
  action, cycleConflict, cycleNameCandidates, cycleNameDraft, cycleExamDateDraft, setCycleConflict,
  setCycleExamDateDraft, setCycleNameDraft, setIsOpeningCycle, setSelectedCycleNameSourceIds, userId,
}: {
  action: CycleConflictState['action'];
  cycleConflict: CycleConflictState;
  cycleNameCandidates: string[];
  cycleNameDraft: string;
  cycleExamDateDraft: string;
  setCycleConflict: Dispatch<SetStateAction<CycleConflictState>>;
  setCycleExamDateDraft: Dispatch<SetStateAction<string>>;
  setCycleNameDraft: Dispatch<SetStateAction<string>>;
  setIsOpeningCycle: Dispatch<SetStateAction<boolean>>;
  setSelectedCycleNameSourceIds: Dispatch<SetStateAction<string[]>>;
  userId?: string;
}) => {
  const navigate = useNavigate();
  const handleGoToCycleAfterSuccess = useCallback(async () => {
    if (!userId) return;
    setIsOpeningCycle(true);
    const resetConflict = () => setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null, showIASuggestionsOnly: false });
    if (action === 'replace') {
      resetConflict(); setCycleNameDraft(''); setSelectedCycleNameSourceIds([]); setCycleExamDateDraft('');
      navigate('/ciclo-estudos'); setIsOpeningCycle(false); return;
    }
    const name = cycleNameDraft.trim() || cycleNameCandidates[0] || cycleConflict.edital?.name || 'Ciclo de estudos';
    const examDate = sanitizeExamDate(cycleExamDateDraft) || null;
    try {
      await updateCycleDetails(userId, name, examDate);
      resetConflict(); setCycleNameDraft(''); setSelectedCycleNameSourceIds([]); setCycleExamDateDraft('');
      navigate('/ciclo-estudos');
    } catch (error) {
      await errorService.report(error, { module: 'cycle', action: 'rename_after_merge', userMessage: 'Não foi possível salvar o nome do ciclo.' });
    } finally { setIsOpeningCycle(false); }
  }, [action, cycleConflict.edital?.name, cycleExamDateDraft, cycleNameCandidates, cycleNameDraft, navigate, setCycleConflict, setCycleExamDateDraft, setCycleNameDraft, setIsOpeningCycle, setSelectedCycleNameSourceIds, userId]);
  return { handleGoToCycleAfterSuccess };
};
