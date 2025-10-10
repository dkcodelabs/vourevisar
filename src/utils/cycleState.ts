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
  console.log('🔄 updateStudiedSubjects:', { antes: Array.from(globalCycleState.studiedSubjects), depois: subjectIds });
  globalCycleState.studiedSubjects = new Set(subjectIds);
};

export const addStudiedSubject = (subjectId: string) => {
  console.log('➕ addStudiedSubject:', subjectId);
  globalCycleState.studiedSubjects.add(subjectId);
};

export const resetCycle = (newCycleNumber: number) => {
  console.log('🔄 resetCycle:', { 
    cicloAnterior: globalCycleState.cycleNumber, 
    novoCiclo: newCycleNumber,
    materiasAntes: Array.from(globalCycleState.studiedSubjects)
  });
  globalCycleState.studiedSubjects.clear();
  globalCycleState.cycleNumber = newCycleNumber;
  console.log('✅ resetCycle concluído:', { 
    cicloAtual: globalCycleState.cycleNumber,
    materiasDepois: Array.from(globalCycleState.studiedSubjects)
  });
};

export const isSubjectStudiedGlobal = (subjectId: string): boolean => {
  const result = globalCycleState.studiedSubjects.has(subjectId);
  // Log removido para evitar spam
  return result;
};