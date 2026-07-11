import type { ComponentProps } from 'react';

import { SubjectWeightControl } from '@/components/study-cycle/SubjectWeightControl';
import type { Subject } from '@/types';

type WeightDraft = {
  questions: string;
  points: string;
  percentage: string;
};

type CycleSubjectWeightRendererProps = {
  clearSavedWeight: () => void;
  editingWeightSubjectId: string | null;
  handleCancelWeightEdit: () => void;
  handleSaveSubjectWeightInline: (subjectId: string) => void;
  handleStartWeightEdit: (subject: Subject) => void;
  isSavingWeight: boolean;
  setWeightDraft: ComponentProps<typeof SubjectWeightControl>['onDraftChange'];
  subject: Subject;
  weightDraft: WeightDraft;
  weightSavedSubjectId: string | null;
};

export function CycleSubjectWeightRenderer({
  clearSavedWeight,
  editingWeightSubjectId,
  handleCancelWeightEdit,
  handleSaveSubjectWeightInline,
  handleStartWeightEdit,
  isSavingWeight,
  setWeightDraft,
  subject,
  weightDraft,
  weightSavedSubjectId,
}: CycleSubjectWeightRendererProps) {
  return (
    <SubjectWeightControl
      isEditing={editingWeightSubjectId === subject.id}
      isSaved={weightSavedSubjectId === subject.id}
      isSaving={isSavingWeight}
      onCancel={handleCancelWeightEdit}
      onClearSaved={clearSavedWeight}
      onDraftChange={setWeightDraft}
      onSave={handleSaveSubjectWeightInline}
      onStartEdit={handleStartWeightEdit}
      subject={subject}
      weightDraft={weightDraft}
    />
  );
}
