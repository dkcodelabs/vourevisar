export type TopicProgressRow = {
  completed?: boolean | null;
  current_interval?: number | null;
  difficulty_level?: number | null;
  difficulty_set_at?: string | null;
  first_studied_at?: string | null;
  id?: string;
  is_marked_for_review?: boolean | null;
  last_reviewed_at?: string | null;
  last_session_duration?: number | null;
  marked_for_review_at?: string | null;
  memory_stability?: number | null;
  next_review?: string | null;
  notes?: unknown;
  retention_score?: number | null;
  review_count?: number | null;
  review_stage?: string | null;
  total_reviews?: number | null;
};

const toTime = (value?: string | null): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const earliestDate = (values: Array<string | null | undefined>) => {
  const valid = values
    .map(value => ({ value, time: toTime(value) }))
    .filter((item): item is { value: string; time: number } => typeof item.value === 'string' && item.time !== null);

  return valid.sort((a, b) => a.time - b.time)[0]?.value ?? null;
};

const latestDate = (values: Array<string | null | undefined>) => {
  const valid = values
    .map(value => ({ value, time: toTime(value) }))
    .filter((item): item is { value: string; time: number } => typeof item.value === 'string' && item.time !== null);

  return valid.sort((a, b) => b.time - a.time)[0]?.value ?? null;
};

const urgentNextReview = (topics: TopicProgressRow[], completed: boolean) => {
  if (completed) return null;

  const valid = topics
    .map(topic => ({ value: topic.next_review, time: toTime(topic.next_review) }))
    .filter((item): item is { value: string; time: number } => typeof item.value === 'string' && item.time !== null);

  return valid.sort((a, b) => a.time - b.time)[0]?.value ?? null;
};

const mostRecentTopic = (topics: TopicProgressRow[]) => (
  [...topics].sort((a, b) => (toTime(b.last_reviewed_at) ?? 0) - (toTime(a.last_reviewed_at) ?? 0))[0]
);

export function buildConsolidatedTopicProgress(topics: TopicProgressRow[]): TopicProgressRow | null {
  if (topics.length === 0) return null;

  const completed = topics.some(topic => topic.completed === true);
  const reviewCount = Math.max(...topics.map(topic => Number(topic.review_count || 0)));
  const totalReviews = Math.max(...topics.map(topic => Number(topic.total_reviews || 0)));
  const mostDifficult = topics
    .map(topic => topic.difficulty_level)
    .filter((value): value is number => typeof value === 'number')
    .sort((a, b) => b - a)[0] ?? null;
  const markedTopic = topics.find(topic => topic.is_marked_for_review === true);
  const representative = [...topics].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? -1 : 1;
    const reviewDiff = Number(b.review_count || 0) - Number(a.review_count || 0);
    if (reviewDiff !== 0) return reviewDiff;
    return (toTime(b.last_reviewed_at) ?? 0) - (toTime(a.last_reviewed_at) ?? 0);
  })[0];
  const latest = mostRecentTopic(topics);
  const lastSessionSource = latest?.last_session_duration != null ? latest : representative;

  return {
    completed,
    current_interval: representative.current_interval ?? null,
    difficulty_level: mostDifficult,
    difficulty_set_at: latestDate(topics.map(topic => topic.difficulty_set_at)),
    first_studied_at: earliestDate(topics.map(topic => topic.first_studied_at)),
    is_marked_for_review: topics.some(topic => topic.is_marked_for_review === true),
    last_reviewed_at: latestDate(topics.map(topic => topic.last_reviewed_at)),
    last_session_duration: lastSessionSource.last_session_duration ?? null,
    marked_for_review_at: markedTopic?.marked_for_review_at ?? latestDate(topics.map(topic => topic.marked_for_review_at)),
    memory_stability: representative.memory_stability ?? null,
    next_review: urgentNextReview(topics, completed),
    notes: representative.notes ?? null,
    retention_score: representative.retention_score ?? null,
    review_count: reviewCount,
    review_stage: completed ? 'Concluído' : representative.review_stage ?? null,
    total_reviews: Math.max(reviewCount, totalReviews),
  };
}
