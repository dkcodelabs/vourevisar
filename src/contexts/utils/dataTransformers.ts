
import { Subject, StudyProgress } from '@/types';

export const transformSubjectsData = (subjectsData: any[]): Subject[] => {
  return (subjectsData || []).map(subject => ({
    id: subject.id,
    name: subject.name,
    status: subject.status as 'Nova' | 'Em Estudo' | 'Concluída',
    priority: subject.priority || 0,
    color: subject.color || undefined,
    topics: (subject.topics || []).map(topic => ({
      id: topic.id,
      name: topic.name,
      completed: topic.completed || false,
      reviewCount: topic.review_count || 0,
      review_count: topic.review_count || 0,
      reviewStage: topic.review_stage as any,
      nextReview: topic.next_review ? new Date(topic.next_review) : undefined,
      lastReviewedAt: topic.last_reviewed_at ? new Date(topic.last_reviewed_at) : undefined,
    }))
  }));
};

export const calculateProgress = (subjects: Subject[]): StudyProgress => {
  const totalSubjects = subjects.length;
  const completedSubjects = subjects.filter(s => s.status === 'Concluída').length;
  const allTopics = subjects.flatMap(s => s.topics);
  const totalTopics = allTopics.length;
  const completedTopics = allTopics.filter(t => t.completed).length;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const delayedTopics = allTopics.filter(t => 
    t.nextReview && t.nextReview < now && !t.completed
  ).length;

  const todayTopics = allTopics.filter(t => 
    t.nextReview && t.nextReview >= today && t.nextReview < tomorrow && !t.completed
  ).length;

  const futureTopics = allTopics.filter(t => 
    t.nextReview && t.nextReview >= tomorrow && !t.completed
  ).length;

  return {
    totalSubjects,
    completedSubjects,
    totalTopics,
    completedTopics,
    delayedTopics,
    todayTopics,
    futureTopics,
  };
};

export const fixSubjectPriorities = async (subjects: Subject[], supabase: any) => {
  const priorities = subjects.map(s => s.priority);
  const hasNull = priorities.some(p => p === null || p === undefined);
  const hasDuplicate = new Set(priorities).size !== priorities.length;
  
  if (hasNull || hasDuplicate) {
    const fixedSubjects = subjects.map((s, idx) => ({ ...s, priority: idx + 1 }));
    await Promise.all(fixedSubjects.map(s =>
      supabase.from('subjects').update({ priority: s.priority }).eq('id', s.id)
    ));
    return fixedSubjects;
  }
  
  return subjects;
};
