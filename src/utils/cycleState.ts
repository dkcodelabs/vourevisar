// Estado global simples para o ciclo
let globalCycleState: {
  studiedSubjects: Set<string>;
  cycleNumber: number;
} = {
  studiedSubjects: new Set(),
  cycleNumber: 1
};

export const getCycleState = () => globalCycleState;

export const updateStudiedSubjects = (subjectIds: string[]) => {
  globalCycleState.studiedSubjects = new Set(subjectIds);
};

export const addStudiedSubject = (subjectId: string) => {
  globalCycleState.studiedSubjects.add(subjectId);
};

export const resetCycle = (newCycleNumber: number) => {
  globalCycleState.studiedSubjects.clear();
  globalCycleState.cycleNumber = newCycleNumber;
};

export const isSubjectStudiedGlobal = (subjectId: string): boolean => {
  return globalCycleState.studiedSubjects.has(subjectId);
};