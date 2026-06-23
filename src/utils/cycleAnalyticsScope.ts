interface ScopeSubjectLike {
  id: string;
  topics?: Array<{ id: string | null | undefined }> | null;
}

export interface ActiveTopicScope {
  activeSubjectIds: string[];
  activeTopicIds: string[];
  hasScopedData: boolean;
  scopeKey: string;
}

const sortIds = (ids: string[]) => [...ids].sort((left, right) => left.localeCompare(right));

export function buildActiveTopicScope(subjects: ScopeSubjectLike[]): ActiveTopicScope {
  const activeSubjectIds = sortIds(
    Array.from(new Set(subjects.map((subject) => subject.id).filter((id): id is string => Boolean(id)))),
  );

  const activeTopicIds = sortIds(
    Array.from(
      new Set(
        subjects
          .flatMap((subject) => subject.topics ?? [])
          .map((topic) => topic.id)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  );

  return {
    activeSubjectIds,
    activeTopicIds,
    hasScopedData: activeTopicIds.length > 0,
    scopeKey: activeTopicIds.length > 0 ? activeTopicIds.join('|') : 'empty',
  };
}

export function filterHistoryRowsByActiveTopicIds<Row extends { topic_id: string | null }>(
  rows: Row[],
  activeTopicIds: string[],
): Row[] {
  if (activeTopicIds.length === 0) return [];
  const activeTopicIdSet = new Set(activeTopicIds);
  return rows.filter((row) => Boolean(row.topic_id) && activeTopicIdSet.has(row.topic_id as string));
}
