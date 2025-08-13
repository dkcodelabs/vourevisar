
import { useMemo } from 'react';
import { Subject, UserCycle } from '@/types';

export interface SubjectWithStatus {
  subject: Subject;
  status: 'available' | 'in-review' | 'completed' | 'no-topics' | 'unavailable';
  statusLabel: string;
  priority: number;
}

export const useNextSubjects = (subjects: Subject[], userCycle: UserCycle | null, userSettings: { subjects_per_day: number } | null) => {
  const { nextSubjects, subjectsByStatus } = useMemo(() => {
    if (!userCycle) return { nextSubjects: [], subjectsByStatus: { available: [], 'in-review': [], completed: [], 'no-topics': [], unavailable: [] } };

    console.log('🔄 useNextSubjects - Análise completa:', {
      ciclo_atual_length: userCycle.ciclo_atual?.length,
      disciplinas_do_dia_length: userCycle.disciplinas_do_dia?.length,
      total_subjects: subjects.length
    });

    // Função para classificar status da matéria
    const classifySubject = (subject: Subject): SubjectWithStatus['status'] => {
      // Verificar se já está concluída
      if (subject.status === 'Concluída') {
        return 'completed';
      }

      // Verificar se não tem tópicos
      if (!subject.topics || subject.topics.length === 0) {
        return 'no-topics';
      }

      // Verificar se todos os tópicos estão em revisão (review_count > 0)
      const allTopicsInReview = subject.topics.every(t => {
        const reviewCount = t.reviewCount || t.review_count || 0;
        return reviewCount > 0;
      });
      if (allTopicsInReview) {
        return 'in-review';
      }

      // Verificar se tem tópicos disponíveis para estudo inicial
      const hasUnreviewedTopics = subject.topics.some(t => {
        const reviewCount = t.reviewCount || t.review_count || 0;
        return reviewCount === 0;
      });
      if (hasUnreviewedTopics) {
        return 'available';
      }

      return 'unavailable';
    };

    // Buscar TODAS as matérias do ciclo atual e globais
    let allSubjectsWithStatus: SubjectWithStatus[] = [];

    // Primeiro, matérias do ciclo atual
    if (userCycle.ciclo_atual && userCycle.ciclo_atual.length > 0) {
      const cycleSubjects = userCycle.ciclo_atual
        .map(id => subjects.find(s => s.id === id))
        .filter(Boolean)
        .map(subject => ({
          subject,
          status: classifySubject(subject),
          statusLabel: getStatusLabel(classifySubject(subject)),
          priority: subject.priority || 999
        }));

      allSubjectsWithStatus = [...cycleSubjects];
    }

    // Depois, matérias fora do ciclo atual (ordenadas por prioridade)
    const subjectsNotInCycle = subjects
      .filter(subject => !userCycle.ciclo_atual?.includes(subject.id))
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
      .map(subject => ({
        subject,
        status: classifySubject(subject),
        statusLabel: getStatusLabel(classifySubject(subject)),
        priority: subject.priority || 999
      }));

    allSubjectsWithStatus = [...allSubjectsWithStatus, ...subjectsNotInCycle];

    // CORREÇÃO: Filtrar próximas matérias excluindo as que estão nas disciplinas do dia
    // E também excluindo matérias que estão "in-review" (todos tópicos em revisão)
    const nextSubjects = allSubjectsWithStatus.filter(
      item => !userCycle.disciplinas_do_dia?.includes(item.subject.id) &&
        item.status === 'available' // Apenas matérias disponíveis (com tópicos não estudados)
    );

    // Agrupar por status (excluindo matérias que estão nas disciplinas do dia)
    const subjectsByStatus = {
      available: allSubjectsWithStatus.filter(item =>
        item.status === 'available' && !userCycle.disciplinas_do_dia?.includes(item.subject.id)
      ),
      'in-review': allSubjectsWithStatus.filter(item =>
        item.status === 'in-review' && !userCycle.disciplinas_do_dia?.includes(item.subject.id)
      ),
      completed: allSubjectsWithStatus.filter(item =>
        item.status === 'completed' && !userCycle.disciplinas_do_dia?.includes(item.subject.id)
      ),
      'no-topics': allSubjectsWithStatus.filter(item =>
        item.status === 'no-topics' && !userCycle.disciplinas_do_dia?.includes(item.subject.id)
      ),
      unavailable: allSubjectsWithStatus.filter(item =>
        item.status === 'unavailable' && !userCycle.disciplinas_do_dia?.includes(item.subject.id)
      )
    };

    console.log('🔄 useNextSubjects - Classificação por status:', {
      available: subjectsByStatus.available.length,
      'in-review': subjectsByStatus['in-review'].length,
      completed: subjectsByStatus.completed.length,
      'no-topics': subjectsByStatus['no-topics'].length,
      unavailable: subjectsByStatus.unavailable.length,
      nextSubjectsAfterFilter: nextSubjects.length
    });

    return { nextSubjects, subjectsByStatus };
  }, [subjects, userCycle, userSettings]);

  return { nextSubjects, subjectsByStatus };
};

function getStatusLabel(status: SubjectWithStatus['status']): string {
  switch (status) {
    case 'available':
      return 'Disponível para estudo';
    case 'in-review':
      return 'Em revisão';
    case 'completed':
      return 'Concluída';
    case 'no-topics':
      return 'Sem tópicos';
    case 'unavailable':
      return 'Indisponível';
    default:
      return 'Status desconhecido';
  }
}
