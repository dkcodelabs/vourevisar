
import { Subject } from '@/types';

export const checkAllStudiesCompleted = (subjects: Subject[]): boolean => {
  if (!subjects || subjects.length === 0) {
    return false;
  }

  // Verifica se TODAS as matérias estão concluídas E se todos os tópicos estão dominados
  const allSubjectsCompleted = subjects.every(subject => subject.status === 'Concluída');
  const allTopicsDominated = subjects.every(subject => 
    subject.topics.every(topic => topic.reviewStage === 'Concluído')
  );
  
  const allCompleted = allSubjectsCompleted && allTopicsDominated;
  
  console.log('Verificação de estudos completos:', {
    totalSubjects: subjects.length,
    completedSubjects: subjects.filter(s => s.status === 'Concluída').length,
    allSubjectsCompleted,
    allTopicsDominated,
    allCompleted
  });

  return allCompleted;
};

export const isTopicDominated = (topic: any): boolean => {
  return topic.reviewStage === 'Concluído';
};
