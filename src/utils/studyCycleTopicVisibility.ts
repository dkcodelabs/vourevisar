export type StudyCycleTopicVisibility = {
  is_active?: boolean | null;
  is_hidden?: boolean | null;
};

export const isVisibleCycleTopic = (topic: StudyCycleTopicVisibility) =>
  topic.is_active !== false && topic.is_hidden !== true;

export const getVisibleCycleTopics = <T extends StudyCycleTopicVisibility>(topics: T[]) =>
  topics.filter(isVisibleCycleTopic);

export const getVisibleCycleTopicIds = <T extends { topics: Array<StudyCycleTopicVisibility & { id: string }> }>(
  subjects: T[],
) =>
  subjects.flatMap(subject =>
    getVisibleCycleTopics(subject.topics).map(topic => topic.id)
  );
