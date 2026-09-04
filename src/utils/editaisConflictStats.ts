import type { Subject } from '@/types';
import type { CycleConflictState } from '@/utils/editaisPagePresentation';

export function getEditaisConflictStats(cycleConflict: CycleConflictState, loadedEditalSubjects: Subject[], subjects: Subject[]) {
  const subjectIds = cycleConflict.edital?.subjectIds || [];
  const topics = subjectIds.reduce((total, id) => total + ((loadedEditalSubjects.find(subject => subject.id === id) || subjects.find(subject => subject.id === id))?.topics?.length || 0), 0);
  return { subjects: subjectIds.length, topics };
}
