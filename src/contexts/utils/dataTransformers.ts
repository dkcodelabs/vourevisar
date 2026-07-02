
import { Subject, Topic, StudyProgress, TopicNotes } from '@/types';
import type { Json, Tables } from '@/integrations/supabase/types';
import { isToday, isBefore } from 'date-fns';

type TopicRow = Partial<Tables<'topics'>> & Pick<Tables<'topics'>, 'id' | 'name'> & {
  origin_id?: string | null;
};
type SubjectWithTopicsRow = Partial<Tables<'subjects'>> & Pick<Tables<'subjects'>, 'id' | 'name' | 'status'> & {
  origin_id?: string | null;
  topics?: TopicRow[] | null;
};

export const transformSubjectsData = (data: SubjectWithTopicsRow[]): Subject[] => {
  if (!data) return [];

  return data.map(subject => ({
    id: subject.id,
    name: subject.name,
    status: subject.status as Subject['status'],
    priority: subject.priority,
    color: subject.color,
    is_visible: subject.is_visible !== false, // default true
    edital_id: subject.edital_id,
    origin_id: subject.origin_id,
    exam_weight_points: subject.exam_weight_points ?? null,
    exam_weight_questions: subject.exam_weight_questions ?? null,
    exam_weight_percentage: subject.exam_weight_percentage ?? null,
    exam_weight_raw: subject.exam_weight_raw ?? null,
    topics: subject.topics ? subject.topics.map(transformTopicData) : []
  }));
};

export const transformTopicData = (topic: TopicRow): Topic => {
  // Transformar anotações do banco para o tipo TopicNotes
  const notes = topic.notes && typeof topic.notes === 'object' && !Array.isArray(topic.notes)
    ? topic.notes as TopicNotes
    : undefined;

  return {
    id: topic.id,
    name: topic.name,
    completed: topic.completed || false,
    nextReview: topic.next_review ? new Date(topic.next_review) : undefined,
    reviewCount: topic.review_count || 0,
    reviewStage: topic.review_stage,
    lastReviewedAt: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined,
    firstStudiedAt: topic.first_studied_at ? new Date(topic.first_studied_at) : undefined,
    review_count: topic.review_count || 0,
    first_studied_at: topic.first_studied_at,
    last_reviewed_at: topic.last_reviewed_at,
    is_completed: topic.completed || false,
    difficulty_level: topic.difficulty_level as Topic['difficulty_level'],
    notes: notes,
    edital_id: topic.edital_id,
    origin_id: topic.origin_id,
    subtopics: Array.isArray(topic.subtopics) ? topic.subtopics as unknown as Topic['subtopics'] : [],
    last_search_context: topic.last_search_context,
    next_review: topic.next_review,
    total_volume: topic.total_volume,
    incidence_score: topic.incidence_score ?? null,
    incidence_level: topic.incidence_level as Topic['incidence_level'],
    incidence_context: topic.incidence_context as Record<string, unknown> | null,
    memory_stability: topic.memory_stability,
    current_interval: topic.current_interval,
    is_active: topic.is_active !== false,
    is_hidden: topic.is_hidden === true,
    position: topic.position ?? undefined,
    review_stage: topic.review_stage ?? null,
    last_used_query: topic.last_used_query,
    last_audit_log: topic.last_audit_log as Json | null
  };
};

export const calculateStudyProgress = (subjects: Subject[]): StudyProgress => {
  const totalSubjects = subjects.length;
  const completedSubjects = subjects.filter(s => s.status === 'Concluída').length;

  const allTopics = subjects.flatMap(s => s.topics || []);
  const totalTopics = allTopics.length;
  const completedTopics = allTopics.filter(t => t.completed).length;

  // Calcular tópicos por status de revisão
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let delayedTopics = 0;
  let todayTopics = 0;
  let futureTopics = 0;

  allTopics.forEach(topic => {
    // Só contar tópicos já iniciados (excluir Não Iniciados sem firstStudiedAt)
    const wasStudied = !!(topic.firstStudiedAt || topic.first_studied_at);
    if (topic.nextReview && !topic.completed && wasStudied) {
      const reviewDate = new Date(topic.nextReview);
      reviewDate.setHours(0, 0, 0, 0);

      if (isBefore(reviewDate, today)) {
        delayedTopics++;
      } else if (isToday(reviewDate)) {
        todayTopics++;
      } else {
        futureTopics++;
      }
    }
  });

  return {
    totalSubjects,
    completedSubjects,
    totalTopics,
    completedTopics,
    delayedTopics,
    todayTopics,
    futureTopics
  };
};
