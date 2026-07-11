import { useCallback } from 'react';

import type { Subject } from '@/types';
import type { StudyCycleAlert } from '@/utils/studyCycleAlerts';

type ExpandedSubjectListItem = {
  id: string;
  subject: Subject;
};

type UseCycleStrategicAlertActionsInput = {
  expandedSubjectList: ExpandedSubjectListItem[];
  focusSubject: (subjectId: string) => void;
  handleCycleTopicStudyAction: (topicId: string) => Promise<void> | void;
  handleStartWeightEdit: (subject: Subject) => void;
  navigate: (to: string) => void;
  openCycleExamDateEditor: () => void;
};

export function useCycleStrategicAlertActions({
  expandedSubjectList,
  focusSubject,
  handleCycleTopicStudyAction,
  handleStartWeightEdit,
  navigate,
  openCycleExamDateEditor,
}: UseCycleStrategicAlertActionsInput) {
  const handleStrategicAlertAction = useCallback((alert: StudyCycleAlert) => {
    if (alert.actionType === 'edit_cycle_exam_date') {
      openCycleExamDateEditor();
      return;
    }

    if (alert.actionType === 'open_edital') {
      navigate('/meus-editais');
      return;
    }

    if (alert.actionType === 'fill_weight' && alert.subjectId) {
      const subject = expandedSubjectList.find(item => item.subject.id === alert.subjectId)?.subject;
      if (subject) {
        handleStartWeightEdit(subject);
        focusSubject(alert.subjectId);
      }
      return;
    }

    if (alert.actionType === 'start_topic' && alert.topicId) {
      if (alert.subjectId) {
        focusSubject(alert.subjectId);
      }
      handleCycleTopicStudyAction(alert.topicId);
      return;
    }

    if ((alert.actionType === 'start_subject' || alert.actionType === 'review_cycle') && alert.subjectId) {
      focusSubject(alert.subjectId);
    }
  }, [
    expandedSubjectList,
    focusSubject,
    handleCycleTopicStudyAction,
    handleStartWeightEdit,
    navigate,
    openCycleExamDateEditor,
  ]);

  return {
    handleStrategicAlertAction,
  };
}
