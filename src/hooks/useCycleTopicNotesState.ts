import { useCallback, useState } from 'react';

import type { Subject, Topic } from '@/types';

type SelectedTopicForNotes = {
  id: string;
  name: string;
  subjectName: string;
} | null;

type UseCycleTopicNotesStateInput = {
  verticalSubjectList: Array<{
    id: string;
    subject: Subject;
    topics: Topic[];
  }>;
};

export function useCycleTopicNotesState({
  verticalSubjectList,
}: UseCycleTopicNotesStateInput) {
  const [selectedTopicForNotes, setSelectedTopicForNotes] = useState<SelectedTopicForNotes>(null);

  const openQueueTopicNotes = useCallback((subject: Subject, topic: Topic) => {
    setSelectedTopicForNotes({
      id: topic.id,
      name: topic.name,
      subjectName: subject.name,
    });
  }, []);

  const openVerticalTopicNotes = useCallback((subjectId: string, topicId: string) => {
    const subject = verticalSubjectList.find(item => item.id === subjectId);
    const topic = subject?.topics.find(item => item.id === topicId);

    if (!subject || !topic) return;

    setSelectedTopicForNotes({
      id: topic.id,
      name: topic.name,
      subjectName: subject.subject.name,
    });
  }, [verticalSubjectList]);

  const closeTopicNotes = useCallback(() => {
    setSelectedTopicForNotes(null);
  }, []);

  return {
    closeTopicNotes,
    openQueueTopicNotes,
    openVerticalTopicNotes,
    selectedTopicForNotes,
  };
}
