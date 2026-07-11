import { beforeEach, describe, expect, it, vi } from 'vitest';

import { focusCycleSubject } from './focusCycleSubject';

describe('focusCycleSubject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('expands, highlights, scrolls to the topic and replaces history when requested', () => {
    const setActiveTab = vi.fn();
    const setCycleExpandedSubjectIds = vi.fn();
    const setHighlightedSubjectId = vi.fn();
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    const scrollIntoView = vi.fn();
    const topicElement = document.createElement('div');
    topicElement.scrollIntoView = scrollIntoView;
    const subjectElement = document.createElement('div');

    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === '[data-topic-id="topic-1"]') {
        return topicElement;
      }

      if (selector === '[data-subject-id="subject-1"]') {
        return subjectElement;
      }

      return null;
    });

    focusCycleSubject({
      focusSubjectId: 'subject-1',
      focusTopicId: 'topic-1',
      replaceHistoryState: true,
      setActiveTab,
      setCycleExpandedSubjectIds,
      setHighlightedSubjectId,
    });

    expect(setActiveTab).toHaveBeenCalledWith('all');
    expect(setCycleExpandedSubjectIds).toHaveBeenCalledWith(['subject-1']);
    expect(setHighlightedSubjectId).toHaveBeenCalledWith('subject-1');

    vi.advanceTimersByTime(60);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(topicElement.classList.contains('highlight-blink')).toBe(true);
    expect(subjectElement.classList.contains('study-cycle-subject-focus')).toBe(true);
    expect(replaceState).toHaveBeenCalled();

    vi.advanceTimersByTime(1800);
    expect(setHighlightedSubjectId).toHaveBeenLastCalledWith(expect.any(Function));
    expect(topicElement.classList.contains('highlight-blink')).toBe(false);
    expect(subjectElement.classList.contains('study-cycle-subject-focus')).toBe(false);
  });

  it('scrolls to the subject without replacing history when topic id is absent', () => {
    const setCycleExpandedSubjectIds = vi.fn();
    const setHighlightedSubjectId = vi.fn();
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    const scrollIntoView = vi.fn();

    vi.spyOn(document, 'querySelector').mockImplementation((selector: string) => {
      if (selector === '[data-subject-id="subject-1"]') {
        return { scrollIntoView } as unknown as Element;
      }

      return null;
    });

    focusCycleSubject({
      focusSubjectId: 'subject-1',
      setCycleExpandedSubjectIds,
      setHighlightedSubjectId,
    });

    vi.advanceTimersByTime(60);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(replaceState).not.toHaveBeenCalled();
  });
});
