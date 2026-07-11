import { useState } from 'react';

import { toastGate } from '@/lib/errors/toastGate';
import { toast } from '@/lib/toast';
import type { Subject } from '@/types';

type SubjectOrigin = {
  name?: string | null;
  organ?: string | null;
};

type MergeInfo = {
  id: string;
  display_name: string;
  primary_subject_id: string;
  merged_subject_ids?: string[] | null;
};

type SelectedMergeOriginal = {
  subjectName: string;
  editalName: string;
  editalOrgan: string;
};

type UseSubjectMergeReversionInput = {
  originsMap: Map<string, SubjectOrigin[]>;
  revertSubjectMerge: (mergeId: string) => Promise<unknown>;
  subjects: Subject[];
};

export function useSubjectMergeReversion({
  originsMap,
  revertSubjectMerge,
  subjects,
}: UseSubjectMergeReversionInput) {
  const [isRevertModalOpen, setIsRevertModalOpen] = useState(false);
  const [selectedMergeId, setSelectedMergeId] = useState<string | null>(null);
  const [selectedMergeName, setSelectedMergeName] = useState('');
  const [selectedMergeOriginals, setSelectedMergeOriginals] = useState<SelectedMergeOriginal[]>([]);
  const [isReverting, setIsReverting] = useState(false);

  const handleOpenRevertSubjectMerge = (_subject: Subject, mergeInfo: MergeInfo) => {
    setSelectedMergeId(mergeInfo.id);
    setSelectedMergeName(mergeInfo.display_name);

    const originalIds = [
      mergeInfo.primary_subject_id,
      ...(mergeInfo.merged_subject_ids || []),
    ];

    const originals = originalIds.map((subjectId) => {
      const origins = originsMap.get(subjectId) || [];
      const firstOrigin = origins[0];
      const originalSubject = subjects.find((entry) => entry.id === subjectId);

      return {
        subjectName: originalSubject?.name || 'Matéria Desconhecida',
        editalName: firstOrigin?.name || 'Edital Desconhecido',
        editalOrgan: firstOrigin?.organ || '',
      };
    });

    setSelectedMergeOriginals(originals);
    setIsRevertModalOpen(true);
  };

  const handleRevertMergeConfirm = async () => {
    if (!selectedMergeId) return;

    setIsReverting(true);
    try {
      await revertSubjectMerge(selectedMergeId);
      toast.success('Mesclagem desfeita com sucesso');
      setIsRevertModalOpen(false);
    } catch (error: unknown) {
      console.error('Erro ao desfazer mesclagem:', error);
      toastGate.notifyError(
        'Erro ao desfazer mesclagem',
        error instanceof Error ? error.message : 'Erro desconhecido',
      );
    } finally {
      setIsReverting(false);
      setSelectedMergeId(null);
    }
  };

  const handleCloseRevertModal = () => {
    setIsRevertModalOpen(false);
    setSelectedMergeId(null);
    setSelectedMergeOriginals([]);
  };

  return {
    handleCloseRevertModal,
    handleOpenRevertSubjectMerge,
    handleRevertMergeConfirm,
    isRevertModalOpen,
    isReverting,
    selectedMergeName,
    selectedMergeOriginals,
  };
}
