import type { Dispatch, SetStateAction } from 'react';

type FocusCycleSubjectInput = {
  focusSubjectId: string;
  focusTopicId?: string;
  replaceHistoryState?: boolean;
  setActiveTab?: (tab: 'all') => void;
  setCycleExpandedSubjectIds: (subjectIds: string[]) => void;
  setHighlightedSubjectId: Dispatch<SetStateAction<string | null>>;
};

const addHighlightClass = (element: Element | null, className: string) => {
  if (!element?.classList) return;
  element.classList.remove(className);
  void (element as HTMLElement).offsetWidth;
  element.classList.add(className);

  window.setTimeout(() => {
    element.classList.remove(className);
  }, 1800);
};

export function focusCycleSubject({
  focusSubjectId,
  focusTopicId,
  replaceHistoryState = false,
  setActiveTab,
  setCycleExpandedSubjectIds,
  setHighlightedSubjectId,
}: FocusCycleSubjectInput) {
  setActiveTab?.('all');
  setCycleExpandedSubjectIds([focusSubjectId]);
  setHighlightedSubjectId(focusSubjectId);

  const clearHighlightTimer = window.setTimeout(() => {
    setHighlightedSubjectId(current => current === focusSubjectId ? null : current);
  }, 1800);

  const scrollTimer = window.setTimeout(() => {
    const topicElement = focusTopicId
      ? document.querySelector(`[data-topic-id="${focusTopicId}"]`)
      : null;
    const subjectElement = document.querySelector(`[data-subject-id="${focusSubjectId}"]`);

    (topicElement || subjectElement)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    addHighlightClass(subjectElement, 'study-cycle-subject-focus');
    addHighlightClass(topicElement, 'highlight-blink');

    if (replaceHistoryState) {
      window.history.replaceState({}, document.title);
    }
  }, 60);

  return () => {
    window.clearTimeout(clearHighlightTimer);
    window.clearTimeout(scrollTimer);
  };
}
