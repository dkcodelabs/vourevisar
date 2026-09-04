import { useCallback } from 'react';
import { mergeService } from '@/services/mergeService';

export const useUnifiedSubjectNameSave = ({
  getSubjectMergeInfo,
  refreshData,
  refreshMergeData,
  userId,
}: {
  getSubjectMergeInfo: (subjectId: string) => { id: string } | undefined;
  refreshData: () => Promise<unknown> | unknown;
  refreshMergeData: () => Promise<unknown> | unknown;
  userId?: string;
}) => {
  const handleSaveUnifiedSubjectName = useCallback(async (subjectIds: string[], displayName: string) => {
    if (!userId) throw new Error('Sessão expirada. Entre novamente para salvar.');
    const merge = subjectIds.map(getSubjectMergeInfo).find(Boolean);
    if (!merge) throw new Error('Não encontrei a mesclagem desta matéria para salvar o nome.');
    await mergeService.updateSubjectMergeDisplayName(merge.id, userId, displayName);
    await refreshMergeData();
    await refreshData();
  }, [getSubjectMergeInfo, refreshData, refreshMergeData, userId]);

  return { handleSaveUnifiedSubjectName };
};
