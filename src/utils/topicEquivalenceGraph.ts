import type { CycleUnificationMap } from '@/types/cycleMergeTypes';
import type { TopicMerge } from '@/types/merges';

export interface TopicEquivalenceGroup {
  ids: string[];
  displayName?: string;
}

const unique = <T,>(items: T[]): T[] => [...new Set(items)];

const mergeOverlappingGroups = (groups: TopicEquivalenceGroup[]): TopicEquivalenceGroup[] => {
  const merged: TopicEquivalenceGroup[] = [];

  for (const group of groups) {
    const ids = unique(group.ids.filter(Boolean));
    if (ids.length < 2) continue;

    const overlappingIndexes = merged
      .map((existing, index) => existing.ids.some(id => ids.includes(id)) ? index : -1)
      .filter(index => index >= 0);

    if (overlappingIndexes.length === 0) {
      merged.push({ ...group, ids });
      continue;
    }

    const [firstIndex, ...restIndexes] = overlappingIndexes;
    const target = merged[firstIndex];
    target.ids = unique([...target.ids, ...ids]);
    target.displayName = target.displayName || group.displayName;

    restIndexes.reverse().forEach(index => {
      target.ids = unique([...target.ids, ...merged[index].ids]);
      target.displayName = target.displayName || merged[index].displayName;
      merged.splice(index, 1);
    });
  }

  return merged;
};

export function buildTopicEquivalenceGroups({
  unificationMap,
  topicMerges = [],
}: {
  unificationMap?: CycleUnificationMap | null;
  topicMerges?: Pick<TopicMerge, 'primary_topic_id' | 'merged_topic_ids' | 'display_name'>[];
}): TopicEquivalenceGroup[] {
  const mapGroups = (unificationMap?.unifiedSubjects || []).flatMap(subject =>
    (subject.topicMappings || [])
      .filter(mapping => mapping.originalTopicIds.length >= 2)
      .map(mapping => ({
        ids: mapping.originalTopicIds,
        displayName: mapping.displayName,
      })),
  );

  const physicalGroups = topicMerges
    .map(merge => ({
      ids: [merge.primary_topic_id, ...(merge.merged_topic_ids || [])],
      displayName: merge.display_name || undefined,
    }))
    .filter(group => group.ids.length >= 2);

  return mergeOverlappingGroups([...mapGroups, ...physicalGroups]);
}

export function getExplicitEquivalentTopicIds(
  topicId: string,
  groups: TopicEquivalenceGroup[],
): string[] {
  const group = groups.find(candidate => candidate.ids.includes(topicId));
  return group ? group.ids : [topicId];
}

export function getExplicitSiblingTopicIds(
  topicId: string,
  groups: TopicEquivalenceGroup[],
): string[] {
  return getExplicitEquivalentTopicIds(topicId, groups).filter(id => id !== topicId);
}
