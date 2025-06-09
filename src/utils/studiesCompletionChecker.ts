
import { Subject } from '@/types';

export const checkAllStudiesCompleted = (subjects: Subject[]): boolean => {
  console.log('🔍 checkAllStudiesCompleted chamado com:', {
    subjectsCount: subjects.length,
    subjects: subjects.map(s => ({ id: s.id, name: s.name, status: s.status }))
  });

  if (!subjects || subjects.length === 0) {
    console.log('🔍 checkAllStudiesCompleted: Nenhuma matéria encontrada');
    return false;
  }

  // Lógica melhorada: verifica tanto o status quanto os tópicos
  const allSubjectsCompleted = subjects.every(subject => {
    // Se já está marcada como concluída, está ok
    if (subject.status === 'Concluída') {
      return true;
    }

    // Se não tem tópicos, não pode estar concluída
    if (!subject.topics || subject.topics.length === 0) {
      return false;
    }

    // Se todos os tópicos estão dominados, considera como concluída
    return subject.topics.every(topic => isTopicDominated(topic));
  });
  
  console.log('🔍 Verificação de estudos completos:', {
    totalSubjects: subjects.length,
    subjectsStatus: subjects.map(s => ({ 
      name: s.name, 
      status: s.status,
      topicsCount: s.topics?.length || 0,
      dominatedTopics: s.topics?.filter(isTopicDominated).length || 0
    })),
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
  return subjects.filter(subject => {
    // Considera tanto status quanto tópicos dominados
    if (subject.status === 'Concluída') return true;
    
    if (!subject.topics || subject.topics.length === 0) return false;
    
    return subject.topics.every(isTopicDominated);
  });
};

// Nova função para sincronizar status das matérias
export const syncSubjectStatus = async (subjects: Subject[]): Promise<void> => {
  console.log('🔄 Sincronizando status das matérias...');
  
  // Esta função pode ser chamada periodicamente para manter consistência
  // Por enquanto, apenas log - a implementação real seria feita via AppContext
  subjects.forEach(subject => {
    if (subject.status !== 'Concluída' && subject.topics && subject.topics.length > 0) {
      const allTopicsDominated = subject.topics.every(isTopicDominated);
      if (allTopicsDominated) {
        console.log(`⚠️ Matéria "${subject.name}" deveria estar marcada como concluída`);
      }
    }
  });
};
