import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { errorService } from '@/lib/errors/errorService';
import type { Subject } from '@/types';
import {
  formatExamWeightInputValue,
  parseOptionalExamWeightNumber,
} from '@/utils/examWeight';

type WeightDraft = {
  questions: string;
  points: string;
  percentage: string;
};

type UseSubjectWeightEditorInput = {
  setLocalSubjects: Dispatch<SetStateAction<Subject[]>>;
  setSubjects: Dispatch<SetStateAction<Subject[]>>;
  userId?: string | null;
};

const emptyWeightDraft: WeightDraft = {
  questions: '',
  points: '',
  percentage: '',
};

export function useSubjectWeightEditor({
  setLocalSubjects,
  setSubjects,
  userId,
}: UseSubjectWeightEditorInput) {
  const [editingWeightSubjectId, setEditingWeightSubjectId] = useState<string | null>(null);
  const [weightDraft, setWeightDraft] = useState<WeightDraft>(emptyWeightDraft);
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [weightSavedSubjectId, setWeightSavedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!weightSavedSubjectId) return;

    const timeoutId = window.setTimeout(() => {
      setWeightSavedSubjectId(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [weightSavedSubjectId]);

  const handleStartWeightEdit = useCallback((subject: Subject) => {
    setWeightSavedSubjectId(null);
    setEditingWeightSubjectId(subject.id);
    setWeightDraft({
      questions: formatExamWeightInputValue(subject.exam_weight_questions),
      points: formatExamWeightInputValue(subject.exam_weight_points),
      percentage: formatExamWeightInputValue(subject.exam_weight_percentage),
    });
  }, []);

  const handleCancelWeightEdit = useCallback(() => {
    setEditingWeightSubjectId(null);
    setWeightDraft(emptyWeightDraft);
  }, []);

  const clearSavedWeight = useCallback(() => {
    setWeightSavedSubjectId(null);
  }, []);

  const handleSaveSubjectWeightInline = useCallback(async (subjectId: string) => {
    if (!userId) return;

    const examWeightQuestions = parseOptionalExamWeightNumber(weightDraft.questions);
    const examWeightPoints = parseOptionalExamWeightNumber(weightDraft.points);
    const examWeightPercentage = parseOptionalExamWeightNumber(weightDraft.percentage);
    const hasWeight = examWeightQuestions !== null || examWeightPoints !== null || examWeightPercentage !== null;
    const examWeightRaw = hasWeight ? 'Informado manualmente pelo aluno na página de ciclo' : null;

    setIsSavingWeight(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          exam_weight_questions: examWeightQuestions,
          exam_weight_points: examWeightPoints,
          exam_weight_percentage: examWeightPercentage,
          exam_weight_raw: examWeightRaw,
        } as unknown)
        .eq('id', subjectId)
        .eq('user_id', userId);

      if (error) throw error;

      const updateSubjectWeight = (subject: Subject) =>
        subject.id === subjectId
          ? {
              ...subject,
              exam_weight_questions: examWeightQuestions,
              exam_weight_points: examWeightPoints,
              exam_weight_percentage: examWeightPercentage,
              exam_weight_raw: examWeightRaw,
            }
          : subject;

      setSubjects(prev => prev.map(updateSubjectWeight));
      setLocalSubjects(prev => prev.map(updateSubjectWeight));
      handleCancelWeightEdit();
      setWeightSavedSubjectId(subjectId);
    } catch (error) {
      await errorService.report(error, {
        module: 'Subjects',
        action: 'handleSaveSubjectWeightInline',
        userMessage: 'Erro ao salvar peso da matéria.',
        severity: 'medium',
        scope: 'core',
        userId,
      });
    } finally {
      setIsSavingWeight(false);
    }
  }, [handleCancelWeightEdit, setLocalSubjects, setSubjects, userId, weightDraft.points, weightDraft.questions, weightDraft.percentage]);

  return {
    clearSavedWeight,
    editingWeightSubjectId,
    handleCancelWeightEdit,
    handleSaveSubjectWeightInline,
    handleStartWeightEdit,
    isSavingWeight,
    setWeightDraft,
    weightDraft,
    weightSavedSubjectId,
  };
}
