
import { Subject, Topic, StudyProgress, TopicNotes } from '@/types';
import { isToday, isBefore } from 'date-fns';

export const transformSubjectsData = (data: any[]): Subject[] => {
  if (!data) return [];

  return data.map(subject => ({
    id: subject.id,
    name: subject.name,
    status: subject.status,
    priority: subject.priority,
    color: subject.color,
    is_visible: subject.is_visible !== false, // default true
    edital_id: subject.edital_id,
    origin_id: subject.origin_id,
    exam_weight_points: subject.exam_weight_points ?? null,
    exam_weight_questions: subject.exam_weight_questions ?? null,
    exam_weight_percentage: subject.exam_weight_percentage ?? null,
    exam_weight_raw: subject.exam_weight_raw ?? null,
    topics: subject.topics ? subject.topics.map((topic: any) => transformTopicData(topic)) : []
  }));
};

export const transformTopicData = (topic: any): Topic => {
  // Transformar anotações do banco para o tipo TopicNotes
  const notes: TopicNotes | undefined = topic.notes ? topic.notes : undefined;

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
    difficulty_level: topic.difficulty_level,
    notes: notes,
    edital_id: topic.edital_id,
    origin_id: topic.origin_id,
    subtopics: Array.isArray(topic.subtopics) ? topic.subtopics : [],
    last_search_context: topic.last_search_context,
    next_review: topic.next_review,
    total_volume: topic.total_volume,
    memory_stability: topic.memory_stability,
    current_interval: topic.current_interval
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
