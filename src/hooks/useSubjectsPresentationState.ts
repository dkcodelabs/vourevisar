import { useEffect } from 'react';

import { useCycleTopicNotesState } from '@/hooks/useCycleTopicNotesState';
import { useCycleVerticalViewData } from '@/hooks/useCycleVerticalViewData';
import { useCycleViewMode } from '@/hooks/useCycleViewMode';
import { useStrategicDockVisibility } from '@/hooks/useStrategicDockVisibility';
import { useStudyCycleStrategicData } from '@/hooks/useStudyCycleStrategicData';

type SubjectsPresentationStateInput = {
  activeTab: 'all' | 'vertical';
  setVerticalExpandedSubjectIds: (subjectIds: string[]) => void;
  verticalView: Parameters<typeof useCycleVerticalViewData>[0];
  viewMode: Omit<Parameters<typeof useCycleViewMode>[0], 'verticalSubjectIds'>;
  strategicData: Parameters<typeof useStudyCycleStrategicData>[0];
  dockVisibility: Omit<Parameters<typeof useStrategicDockVisibility>[0], 'queueSuggestion' | 'strategicAlertsLength'>;
};

export function useSubjectsPresentationState({
  activeTab,
  setVerticalExpandedSubjectIds,
  verticalView,
  viewMode,
  strategicData,
  dockVisibility,
}: SubjectsPresentationStateInput) {
  const vertical = useCycleVerticalViewData(verticalView);
  const notes = useCycleTopicNotesState({ verticalSubjectList: vertical.verticalSubjectList });

  useEffect(() => {
    if (activeTab !== 'vertical') return;
    setVerticalExpandedSubjectIds(vertical.verticalSubjectList.map(item => item.id));
  }, [activeTab, setVerticalExpandedSubjectIds, vertical.verticalSubjectList]);

  const view = useCycleViewMode({
    ...viewMode,
    verticalSubjectIds: vertical.verticalSubjectList.map(item => item.id),
  });
  const strategic = useStudyCycleStrategicData(strategicData);
  const dock = useStrategicDockVisibility({
    ...dockVisibility,
    queueSuggestion: strategic.queueSuggestion,
    strategicAlertsLength: strategic.strategicAlerts.length,
  });

  return { ...dock, ...notes, ...strategic, ...vertical, ...view };
}
