// Estado global simples para o ciclo
const globalCycleState: {
  studiedSubjects: Set<string>;
  cycleNumber: number;
} = {
  studiedSubjects: new Set(),
  cycleNumber: 1
};

export const getCycleState = () => globalCycleState;

export const updateStudiedSubjects = (subjectIds: string[]) => {
  // Log removido para otimização
  globalCycleState.studiedSubjects = new Set(subjectIds);
};

export const addStudiedSubject = (subjectId: string) => {
  // Log removido para otimização
  globalCycleState.studiedSubjects.add(subjectId);
};

export const resetCycle = (newCycleNumber: number) => {
  // Log removido para otimização
  globalCycleState.studiedSubjects.clear();
  globalCycleState.cycleNumber = newCycleNumber;
};

export const isSubjectStudiedGlobal = (subjectId: string): boolean => {
  const result = globalCycleState.studiedSubjects.has(subjectId);
  // Log removido para evitar spam
  return result;
};