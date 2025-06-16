
import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';

export const useNextSubjects = (subjects: Subject[], userCycle: UserCycle | null, userSettings: { subjects_per_day: number } | null) => {
  const nextSubjects = useMemo(() => {
    if (!userCycle) return [];
    
    console.log('🔄 useNextSubjects - Análise:', {
      ciclo_atual_length: userCycle.ciclo_atual?.length,
      disciplinas_do_dia_length: userCycle.disciplinas_do_dia?.length,
      total_subjects: subjects.length
    });
    
    // CORRIGIDO: Se ciclo_atual está vazio ou só tem matérias já estudadas, buscar todas as matérias disponíveis
    let availableSubjectIds: string[] = [];
    
    if (userCycle.ciclo_atual && userCycle.ciclo_atual.length > 0) {
      // Buscar no ciclo atual primeiro
      availableSubjectIds = userCycle.ciclo_atual.filter(id => {
        const subject = subjects.find(s => s.id === id);
        if (!subject || subject.status === 'Concluída' || !subject.topics || subject.topics.length === 0) {
          return false;
        }
        
        // Não incluir se já está nas disciplinas do dia
        if (userCycle.disciplinas_do_dia.includes(id)) {
          return false;
        }
        
        const hasUnreviewedTopics = subject.topics.some(t => t.review_count === 0);
        return hasUnreviewedTopics;
      });
    }
    
    // NOVO: Se não há matérias disponíveis no ciclo atual, buscar todas as matérias disponíveis
    if (availableSubjectIds.length === 0) {
      console.log('🔄 Ciclo atual vazio/completo, buscando todas as matérias disponíveis');
      
      availableSubjectIds = subjects
        .filter(subject => {
          if (subject.status === 'Concluída') return false;
          if (!subject.topics || subject.topics.length === 0) return false;
          if (userCycle.disciplinas_do_dia.includes(subject.id)) return false;
          return subject.topics.some(t => t.review_count === 0);
        })
        .sort((a, b) => (a.priority || 999) - (b.priority || 999))
        .map(s => s.id);
    }
    
    const selectedIds = availableSubjectIds.slice(0, userSettings?.subjects_per_day || 3);
    const nextSubjects = selectedIds
      .map(id => subjects.find(s => s.id === id))
      .filter(Boolean);
      
    console.log('🔄 useNextSubjects - Resultado:', {
      availableSubjectIds: availableSubjectIds.length,
      selectedIds: selectedIds.length,
      nextSubjects: nextSubjects.map(s => s.name)
    });
    
    return nextSubjects;
  }, [subjects, userCycle, userSettings]);

  return { nextSubjects };
};
