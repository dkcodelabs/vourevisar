import { describe, expect, it } from 'vitest';

import { getCycleLoadSubjectIds, type CycleConflictState } from './editaisPagePresentation';

const baseConflict: CycleConflictState = {
  isOpen: true,
  edital: {
    id: 'edital-1',
    name: 'Edital de teste',
    createdAt: '',
    updatedAt: '',
    isImported: false,
    subjectIds: ['subject-1', 'subject-2', 'subject-3'],
    activeSubjectIds: [],
  },
  existingIds: [],
  currentOrigins: [],
  step: 'select',
  action: 'replace',
};

describe('getCycleLoadSubjectIds', () => {
  it('keeps every edital subject selected when the student has not customized the selection', () => {
    expect(getCycleLoadSubjectIds(baseConflict)).toEqual(['subject-1', 'subject-2', 'subject-3']);
  });

  it('uses only the selected valid subjects and discards duplicated or foreign ids', () => {
    expect(getCycleLoadSubjectIds({ ...baseConflict, selectedSubjectIds: ['subject-2', 'foreign', 'subject-2'] })).toEqual(['subject-2']);
  });
});
