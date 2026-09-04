import { useCallback, useEffect, useState } from 'react';

import { errorService } from '@/lib/errors/errorService';
import {
  deletePendingCycleMerge,
  fetchEditaisPageData,
  fetchPendingCycleMerges,
  fetchPublicEditaisData,
  savePendingCycleMerge,
} from '@/services/editaisPageService';
import { compareEditaisByCreatedOrder } from '@/utils/editalOrder';
import { rowToEdital, serializeJson, type PendingMergeDraft, type PublicEditalSource, type StudySessionSummary, type UserEdital } from '@/utils/editaisPagePresentation';

type UseEditaisCatalogDataInput = {
  isImportModalOpen: boolean;
  userId?: string;
};

export function useEditaisCatalogData({ isImportModalOpen, userId }: UseEditaisCatalogDataInput) {
  const [editais, setEditais] = useState<UserEdital[]>([]);
  const [studySessions, setStudySessions] = useState<StudySessionSummary[]>([]);
  const [loadingEditais, setLoadingEditais] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [publicEditais, setPublicEditais] = useState<PublicEditalSource[]>([]);
  const [publicEditaisLoaded, setPublicEditaisLoaded] = useState(false);
  const [pendingMerges, setPendingMerges] = useState<Record<string, PendingMergeDraft>>({});

  const fetchEditais = useCallback(async (options: { reportError?: boolean } = {}) => {
    if (!userId) return;
    try {
      const { editais: rows, sessions } = await fetchEditaisPageData(userId);
      setEditais(rows.map(rowToEdital).sort(compareEditaisByCreatedOrder));
      setStudySessions(sessions);
    } catch (error) {
      if (options.reportError === false) throw error;
      void errorService.report(error, { module: 'editais', action: 'fetch', userMessage: 'Erro ao carregar editais.' });
    } finally {
      setLoadingEditais(false);
      setDataLoaded(true);
    }
  }, [userId]);

  const fetchPublicEditais = useCallback(async () => {
    try {
      setPublicEditaisLoaded(false);
      const data = await fetchPublicEditaisData();
      if (data) setPublicEditais(data.map(row => ({ ...row, subjects: Array.isArray(row.subjects) ? row.subjects : [] })));
    } catch (error) {
      console.error('Error fetching public editais for sync check:', error);
    } finally {
      setPublicEditaisLoaded(true);
    }
  }, []);

  const loadPendingMerges = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchPendingCycleMerges(userId);
      const map: Record<string, PendingMergeDraft> = {};
      data?.forEach(item => {
        if (item.edital_id && item.state_data && typeof item.state_data === 'object' && !Array.isArray(item.state_data)) {
          map[item.edital_id] = { ...item.state_data as unknown as PendingMergeDraft, updatedAt: item.updated_at };
        }
      });
      setPendingMerges(map);
    } catch (error) {
      console.error('Erro ao carregar mesclagens pendentes:', error);
    }
  }, [userId]);

  const savePendingMerge = useCallback(async (editalId: string, state: PendingMergeDraft) => {
    if (!userId) return;
    try {
      const updatedAt = new Date().toISOString();
      const dataToSave = { ...state, updatedAt };
      await savePendingCycleMerge(userId, editalId, serializeJson(dataToSave), updatedAt);
      setPendingMerges(prev => ({ ...prev, [editalId]: dataToSave }));
    } catch (error) {
      console.error('Erro ao salvar mesclagem pendente:', error);
    }
  }, [userId]);

  const discardPendingMerge = useCallback(async (editalId: string | 'all') => {
    if (!userId) return;
    try {
      await deletePendingCycleMerge(userId, editalId);
      setPendingMerges(prev => {
        if (editalId === 'all') return {};
        const next = { ...prev };
        delete next[editalId];
        return next;
      });
    } catch (error) {
      console.error('Erro ao descartar mesclagem pendente:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void fetchEditais();
    void fetchPublicEditais();
    void loadPendingMerges();
  }, [fetchEditais, fetchPublicEditais, loadPendingMerges, userId]);

  useEffect(() => {
    const handleExternalUpdate = () => {
      void fetchEditais();
      void fetchPublicEditais();
    };
    window.addEventListener('subjectUpdated', handleExternalUpdate);
    return () => window.removeEventListener('subjectUpdated', handleExternalUpdate);
  }, [fetchEditais, fetchPublicEditais]);

  useEffect(() => {
    const refreshCatalogOnFocus = () => {
      if (document.visibilityState === 'visible' && !isImportModalOpen) void fetchPublicEditais();
    };
    const handleFocus = () => { if (!isImportModalOpen) void fetchPublicEditais(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', refreshCatalogOnFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', refreshCatalogOnFocus);
    };
  }, [fetchPublicEditais, isImportModalOpen]);

  return { dataLoaded, discardPendingMerge, editais, fetchEditais, fetchPublicEditais, loadingEditais, pendingMerges, publicEditais, publicEditaisLoaded, savePendingMerge, setEditais, setPendingMerges, setPublicEditais, studySessions };
}
