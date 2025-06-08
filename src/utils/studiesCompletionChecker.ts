
import { Subject } from '@/types';

export const checkAllStudiesCompleted = (subjects: Subject[]): boolean => {
  if (!subjects || subjects.length === 0) {
    return false;
  }

  // Verifica se TODAS as matérias estão com status 'Concluída'
  const allSubjectsCompleted = subjects.every(subject => subject.status === 'Concluída');
  
  console.log('Verificação de estudos completos:', {
    totalSubjects: subjects.length,
    completedSubjects: subjects.filter(s => s.status === 'Concluída').length,
    allSubjectsCompleted
  });

  return allSubjectsCompleted;
};

export const isTopicDominated = (topic: any): boolean => {
  return topic.reviewStage === 'Concluído';
};

export const calculateSubjectProgress = (subject: Subject): number => {
  if (!subject.topics || subject.topics.length === 0) return 0;
  
  const dominatedTopics = subject.topics.filter(isTopicDominated).length;
  return (dominatedTopics / subject.topics.length) * 100;
};

export const getHighProgressSubjects = (subjects: Subject[]): Subject[] => {
  return subjects.filter(subject => {
    if (subject.status === 'Concluída') return false; // Não incluir matérias já concluídas
    
    const progress = calculateSubjectProgress(subject);
    return progress > 75 && progress < 100;
  });
};

export const getFullyCompletedSubjects = (subjects: Subject[]): Subject[] => {
  return subjects.filter(subject => subject.status === 'Concluída');
};
