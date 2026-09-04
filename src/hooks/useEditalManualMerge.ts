import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { UserEdital } from '@/utils/editaisPagePresentation';
import { toast } from '@/lib/toast';
import { createMergedEdital, deleteUserEditais } from '@/services/editaisPageService';

export const useEditalManualMerge = ({ clearPendingSuggestions, editais, fetchEditais, selectedIds, setIsMerging, setPendingSuggestions, setSelectedIds, userId }: {
  clearPendingSuggestions: (userId: string) => Promise<void>;
  editais: UserEdital[];
  fetchEditais: () => Promise<void>;
  selectedIds: Set<string>;
  setIsMerging: Dispatch<SetStateAction<boolean>>;
  setPendingSuggestions: Dispatch<SetStateAction<unknown[]>>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  userId?: string;
}) => {
  const handleMerge = useCallback(async () => {
    if (selectedIds.size < 2 || !userId) return;
    setIsMerging(true);
    const ids = Array.from(selectedIds);
    const selectedEditais = editais.filter(edital => ids.includes(edital.id));
    const mergedName = selectedEditais.map(edital => edital.name).join(' + ');
    const mergedSubjectIds = [...new Set(selectedEditais.flatMap(edital => edital.subjectIds))];
    try {
      await createMergedEdital(userId, mergedName, mergedSubjectIds, ids);
      await deleteUserEditais(userId, ids);
      await fetchEditais();
      setSelectedIds(new Set());
      toast.success('Editais mesclados com sucesso!');
      await clearPendingSuggestions(userId);
      setPendingSuggestions([]);
    } finally {
      setIsMerging(false);
    }
  }, [clearPendingSuggestions, editais, fetchEditais, selectedIds, setIsMerging, setPendingSuggestions, setSelectedIds, userId]);
  return { handleMerge };
};
