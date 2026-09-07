import type { Subject } from '@/types';
import { getCycleLoadSubjectIds, type CycleConflictState } from '@/utils/editaisPagePresentation';

export function getEditaisConflictStats(cycleConflict: CycleConflictState, loadedEditalSubjects: Subject[], subjects: Subject[]) {
  const subjectIds = getCycleLoadSubjectIds(cycleConflict);
  const topics = subjectIds.reduce((total, id) => total + ((loadedEditalSubjects.find(subject => subject.id === id) || subjects.find(subject => subject.id === id))?.topics?.length || 0), 0);
  return { subjects: subjectIds.length, topics };
}
