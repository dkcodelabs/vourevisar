
import { Subject, type Topic } from '@/types';
import { markSubjectCompleted } from '@/services/subjectStatusService';

export const checkAllStudiesCompleted = (subjects: Subject[]): boolean => {
  console.log('🔍 checkAllStudiesCompleted chamado com:', {
    subjectsCount: subjects.length,
    subjects: subjects.map(s => ({ id: s.id, name: s.name, status: s.status }))
  });

  if (!subjects || subjects.length === 0) {
    console.log('🔍 checkAllStudiesCompleted: Nenhuma matéria encontrada');
    return false;
  }

  // CORRIGIDO: Verificação mais rigorosa para evitar false positives
  const allSubjectsCompleted = subjects.every(subject => {
    // Deve ter status 'Concluída' E todos os tópicos dominados
    const hasStatusCompleted = subject.status === 'Concluída';
    
    if (!subject.topics || subject.topics.length === 0) {
      console.log(`⚠️ Matéria "${subject.name}" sem tópicos - não pode estar concluída`);
      return false;
    }

    const allTopicsDominated = subject.topics.every(topic => isTopicDominated(topic));
    const isCompleted = hasStatusCompleted && allTopicsDominated;
    
    console.log(`📋 Matéria "${subject.name}":`, {
      status: subject.status,
      hasStatusCompleted,
      topicsCount: subject.topics.length,
      dominatedTopics: subject.topics.filter(isTopicDominated).length,
      allTopicsDominated,
      isCompleted
    });
    
    return isCompleted;
  });
  
  console.log('🔍 Resultado final da verificação:', {
    totalSubjects: subjects.length,
    allSubjectsCompleted,
    completedSubjects: subjects.filter(s => s.status === 'Concluída').length
  });

  return allSubjectsCompleted;
};

export const isTopicDominated = (topic: Topic): boolean => {
  // CORRIGIDO: Verificação mais rigorosa para tópicos dominados
  const isDominated = topic.reviewStage === 'Concluído' || (topic.reviewCount && topic.reviewCount >= 5);
  console.log(`🔍 Tópico "${topic.name}": reviewStage=${topic.reviewStage}, reviewCount=${topic.reviewCount}, isDominated=${isDominated}`);
  return isDominated;
};

export const calculateSubjectProgress = (subject: Subject): number => {
  if (!subject.topics || subject.topics.length === 0) return 0;
  
  const dominatedTopics = subject.topics.filter(isTopicDominated).length;
  return (dominatedTopics / subject.topics.length) * 100;
};

export const getHighProgressSubjects = (subjects: Subject[]): Subject[] => {
  return subjects.filter(subject => {
    if (subject.status === 'Concluída') return false;
    
    const progress = calculateSubjectProgress(subject);
    return progress > 75 && progress < 100;
  });
};

export const getFullyCompletedSubjects = (subjects: Subject[]): Subject[] => {
  return subjects.filter(subject => {
    return subject.status === 'Concluída' && 
           subject.topics && 
           subject.topics.length > 0 && 
           subject.topics.every(isTopicDominated);
  });
};

// NOVA: Função para verificar se há matérias realmente disponíveis para estudo
export const hasStudyableSubjects = (subjects: Subject[]): boolean => {
  return subjects.some(subject => 
    subject.status !== 'Concluída' && 
    subject.topics && 
    subject.topics.length > 0
  );
};

// Função de sincronização melhorada
export const syncSubjectStatus = async (subjects: Subject[]): Promise<void> => {
  console.log('🔄 Sincronizando status das matérias...');
  
  for (const subject of subjects) {
    if (subject.status !== 'Concluída' && subject.topics && subject.topics.length > 0) {
      const allTopicsDominated = subject.topics.every(isTopicDominated);
      
      if (allTopicsDominated) {
        console.log(`🔄 Atualizando status da matéria "${subject.name}" para Concluída`);
        
        try {
          await markSubjectCompleted(subject.id);
        } catch (error) {
          console.error('Erro na sincronização:', error);
        }
      }
    }
  }
};
