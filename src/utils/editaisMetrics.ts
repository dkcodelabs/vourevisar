import type { Subject } from '@/types';
import type { StudySessionSummary, UserEdital } from '@/utils/editaisPagePresentation';

export function calculateEditalMetrics(edital: UserEdital, subjects: Subject[], studySessions: StudySessionSummary[]) {
  if (subjects.length === 0) return { totalTopics: 0, completedTopics: 0, totalStudyMinutes: 0, subjectsCount: 0 };
  const ids = Array.isArray(edital.subjectIds) ? edital.subjectIds : [];
  const uniqueSubjects = Array.from(new Map(subjects.filter(subject => ids.includes(subject.id)).map(subject => [subject.id, subject])).values());
  const totalTopics = uniqueSubjects.reduce((total, subject) => total + (subject.topics?.length || 0), 0);
  const completedTopics = uniqueSubjects.reduce((total, subject) => total + (subject.topics?.filter(topic => topic.completed).length || 0), 0);
  const completedSubjectsCount = uniqueSubjects.filter(subject => subject.topics?.length && subject.topics.every(topic => topic.completed)).length;
  const subjectIdSet = new Set(ids);
  const totalStudyMinutes = studySessions.reduce((total, session) => {
    const belongsToEdital = session.edital_id === edital.id || (!session.edital_id && Boolean(session.subject_id && subjectIdSet.has(session.subject_id)));
    const duration = Number(session.session_duration_minutes || 0);
    return belongsToEdital && Number.isFinite(duration) && duration > 0 ? total + duration : total;
  }, 0);
  return { totalTopics, completedTopics, totalStudyMinutes, subjectsCount: uniqueSubjects.length, completedSubjectsCount };
}
