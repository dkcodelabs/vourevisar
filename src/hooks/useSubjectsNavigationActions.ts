import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorService } from '@/lib/errors/errorService';
import { focusCycleSubject } from '@/utils/focusCycleSubject';

export const useSubjectsNavigationActions = ({
  handleTopicStudyAction,
  setActiveTab,
  setCycleExpandedSubjectIds,
  setHighlightedSubjectId,
  userId,
}: {
  handleTopicStudyAction: (topicId: string) => Promise<unknown>;
  setActiveTab: (tab: 'all' | 'vertical') => void;
  setCycleExpandedSubjectIds: (ids: string[]) => void;
  setHighlightedSubjectId: (id: string | null) => void;
  userId?: string;
}) => {
  const navigate = useNavigate();

  const handleOpenImport = useCallback((tab: 'ready' | 'ia' | 'manual') => {
    navigate('/meus-editais', { state: { openImportModal: true, importTab: tab } });
  }, [navigate]);

  const handleCycleTopicStudyAction = useCallback(async (topicId: string) => {
    try {
      await handleTopicStudyAction(topicId);
    } catch (error) {
      await errorService.report(error, {
        module: 'Subjects', action: 'handleCycleTopicStudyAction',
        userMessage: 'Erro ao abrir sessão de estudo do tópico.', severity: 'medium', scope: 'core', userId,
      });
    }
  }, [handleTopicStudyAction, userId]);

  const focusSubjectFromStrategicAction = useCallback((subjectId: string) => {
    focusCycleSubject({ focusSubjectId: subjectId, setCycleExpandedSubjectIds, setHighlightedSubjectId });
    setActiveTab('all');
  }, [setActiveTab, setCycleExpandedSubjectIds, setHighlightedSubjectId]);

  return { focusSubjectFromStrategicAction, handleCycleTopicStudyAction, handleOpenImport };
};
