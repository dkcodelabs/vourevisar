import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Subject } from '@/types';
import { errorService } from '@/lib/errors/errorService';
import { toast } from '@/lib/toast';
import { fetchUserEditalById } from '@/services/editaisPageService';
import { importEdital, type EditalImportExtraInfo } from '@/services/editalImportService';
import { rowToEdital, type UserEdital } from '@/utils/editaisPagePresentation';

export const useEditalImportCompletion = ({
  fetchEditais, isSaving, refreshData, setIsImportModalOpen, setIsSaving, setRecentlyImportedEditalId,
  setScrolledTo, setSubjectsModal, userId,
}: {
  fetchEditais: (options?: { reportError?: boolean }) => Promise<void>;
  isSaving: boolean;
  refreshData: () => Promise<unknown> | unknown;
  setIsImportModalOpen: Dispatch<SetStateAction<boolean>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setRecentlyImportedEditalId: Dispatch<SetStateAction<string | null>>;
  setScrolledTo: Dispatch<SetStateAction<boolean>>;
  setSubjectsModal: Dispatch<SetStateAction<{ isOpen: boolean; edital: UserEdital | null }>>;
  userId?: string;
}) => {
  const handleImportDone = useCallback(async (importedSubjects: Subject[], editalName?: string, isImported = false, sourceId?: string, extraInfo?: EditalImportExtraInfo, aiExtractionUsed = false) => {
    if (!userId) throw new Error('Usuário não autenticado para importar edital.');
    if (isSaving) throw new Error('Já existe uma importação de edital em andamento.');
    setIsSaving(true);
    try {
      const finalName = editalName?.trim() || 'Novo Edital';
      const { editalId, subjectIds } = await importEdital({ editalName: finalName, aiExtractionUsed, extraInfo, isImported, sourceId, subjects: importedSubjects, userId });
      setIsImportModalOpen(false); setRecentlyImportedEditalId(editalId); setScrolledTo(false);
      let finalEdital: UserEdital | null = null; let refreshFailed = false;
      try {
        if (!isImported) finalEdital = rowToEdital(await fetchUserEditalById(editalId, userId));
        await Promise.all([fetchEditais({ reportError: false }), refreshData()]);
      } catch (error) {
        refreshFailed = true;
        await errorService.report(error, { module: 'editais', action: 'refresh-after-import', severity: 'low', scope: 'core', userMessage: 'O edital foi salvo, mas a tela não conseguiu atualizar a lista.', showToast: false });
      }
      window.dispatchEvent(new CustomEvent('subjectUpdated')); window.dispatchEvent(new CustomEvent('topicUpdated'));
      if (!isImported && finalEdital) setSubjectsModal({ isOpen: true, edital: finalEdital });
      if (refreshFailed) toast.warning(`Edital "${finalName}" salvo. Atualize a página para carregar os dados mais recentes.`);
      else if (!isImported && finalEdital) toast.success(`Edital "${finalName}" criado! Agora adicione as matérias.`);
      else toast.success(`Edital "${finalName}" com ${subjectIds.length} matéria(s) importado com sucesso!`);
    } catch (error) {
      await errorService.report(error, { module: 'editais', action: 'import', userMessage: 'Erro ao importar edital.' });
      throw error;
    } finally { setIsSaving(false); }
  }, [fetchEditais, isSaving, refreshData, setIsImportModalOpen, setIsSaving, setRecentlyImportedEditalId, setScrolledTo, setSubjectsModal, userId]);
  return { handleImportDone };
};
