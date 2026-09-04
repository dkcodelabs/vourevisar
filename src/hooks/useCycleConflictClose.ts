import { useCallback } from 'react';
import { shouldBlockCycleConflictClose } from '@/utils/cycleConflictModalClose';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';

type Params = {
    cycleConflict: CycleConflictState;
    isAnalyzingTopics: boolean;
    isMerging: boolean;
    setCycleConflict: React.Dispatch<React.SetStateAction<CycleConflictState>>;
    setCycleNameDraft: (value: string) => void;
    setSelectedCycleNameSourceIds: (value: string[]) => void;
    setCycleExamDateDraft: (value: string) => void;
    setIsRecoveringMerge: (value: boolean) => void;
};

export function useCycleConflictClose({ cycleConflict, isAnalyzingTopics, isMerging, setCycleConflict, setCycleNameDraft, setSelectedCycleNameSourceIds, setCycleExamDateDraft, setIsRecoveringMerge }: Params) {
    return useCallback((source: 'button' | 'backdrop' = 'button') => {
        if (shouldBlockCycleConflictClose({ action: cycleConflict.action, isAnalyzingTopics, isMerging, source, step: cycleConflict.step })) return;
        setCycleConflict({ isOpen: false, edital: null, existingIds: [], currentOrigins: [], step: 'select', action: null, showIASuggestionsOnly: false });
        setCycleNameDraft('');
        setSelectedCycleNameSourceIds([]);
        setCycleExamDateDraft('');
        setIsRecoveringMerge(false);
    }, [cycleConflict.action, cycleConflict.step, isAnalyzingTopics, isMerging, setCycleConflict, setCycleExamDateDraft, setCycleNameDraft, setIsRecoveringMerge, setSelectedCycleNameSourceIds]);
}
