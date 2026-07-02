// =====================================================
// HOOK PARA PERSISTÊNCIA DE RASCUNHOS NÃO SALVOS
// =====================================================
import { useState, useEffect, useCallback } from 'react';

interface DraftData {
  notes: string;
  difficulty?: string;
  subTopics?: unknown[];
  lastModified: number;
}

const DRAFT_STORAGE_PREFIX = 'draft_notes_';
const DRAFT_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 horas

export const useDraftPersistence = (topicId: string, subjectId: string) => {
  const draftKey = `${DRAFT_STORAGE_PREFIX}${subjectId}_${topicId}`;
  
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(null);

  // Verificar se existe draft ao montar
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const parsed: DraftData = JSON.parse(savedDraft);
        const now = Date.now();
        
        // Verificar se o draft não expirou
        if (now - parsed.lastModified < DRAFT_EXPIRY_TIME) {
          setDraftData(parsed);
          setHasDraft(true);
        } else {
          // Draft expirado, remover
          localStorage.removeItem(draftKey);
        }
      } catch (error) {
        console.error('Erro ao carregar draft:', error);
        localStorage.removeItem(draftKey);
      }
    }
  }, [draftKey]);

  // Salvar draft
  const saveDraft = useCallback((data: Omit<DraftData, 'lastModified'>) => {
    const draftToSave: DraftData = {
      ...data,
      lastModified: Date.now()
    };
    
    try {
      localStorage.setItem(draftKey, JSON.stringify(draftToSave));
      setDraftData(draftToSave);
      setHasDraft(true);
    } catch (error) {
      console.error('Erro ao salvar draft:', error);
    }
  }, [draftKey]);

  // Remover draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    setDraftData(null);
    setHasDraft(false);
  }, [draftKey]);

  // Auto-save com debounce
  const autoSaveDraft = useCallback((data: Omit<DraftData, 'lastModified'>) => {
    // Só salvar se há conteúdo significativo
    if (data.notes.trim() || (data.subTopics && data.subTopics.length > 0)) {
      saveDraft(data);
    }
  }, [saveDraft]);

  // Limpar drafts expirados (executar ocasionalmente)
  const cleanExpiredDrafts = useCallback(() => {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_STORAGE_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '');
          if (now - data.lastModified > DRAFT_EXPIRY_TIME) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, []);

  return {
    hasDraft,
    draftData,
    saveDraft,
    clearDraft,
    autoSaveDraft,
    cleanExpiredDrafts
  };
};