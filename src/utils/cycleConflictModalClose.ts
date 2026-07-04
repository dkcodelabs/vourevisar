type CycleConflictCloseStep = 'select' | 'preview' | 'topic-preview' | 'success';
type CycleConflictCloseAction = 'merge' | 'replace' | 'hybrid' | null;
type CycleConflictCloseSource = 'button' | 'backdrop';

interface CycleConflictCloseParams {
    action: CycleConflictCloseAction;
    isAnalyzingTopics: boolean;
    isMerging: boolean;
    source: CycleConflictCloseSource;
    step: CycleConflictCloseStep;
}

export const shouldBlockCycleConflictClose = ({
    action,
    isAnalyzingTopics,
    isMerging,
    source,
    step,
}: CycleConflictCloseParams): boolean => {
    if ((isMerging || isAnalyzingTopics) && step !== 'success') return true;

    return source === 'backdrop' && step === 'success' && action !== 'replace';
};
