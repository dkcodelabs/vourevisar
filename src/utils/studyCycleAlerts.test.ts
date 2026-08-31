import { describe, expect, it } from 'vitest';
import { getStudyCycleAlerts } from './studyCycleAlerts';

const now = new Date('2026-06-03T12:00:00-03:00');

describe('studyCycleAlerts', () => {
  it('does not create strategic alerts when the base data is absent', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Português',
          topics: [
            { id: 'topic-1', name: 'Crase', completed: false, reviewCount: 0 },
          ],
        },
      ],
      hasCycleHistory: true,
      now,
    });

    expect(alerts).toEqual([]);
  });

  it('warns when a weighted subject has no started topics', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Direito Penal',
          exam_weight_percentage: 20,
          topics: [
            { id: 'topic-1', name: 'Crimes contra a pessoa', completed: false, reviewCount: 0 },
          ],
        },
      ],
      hasCycleHistory: true,
      now,
    });

    expect(alerts[0]).toEqual(expect.objectContaining({
      id: 'weighted-subject-unstarted:subject-1',
      severity: 'critical',
      title: 'Matéria importante parada',
      subjectId: 'subject-1',
      actionLabel: 'Iniciar matéria',
      actionType: 'start_subject',
    }));
    expect(alerts[0].topicId).toBeUndefined();
  });

  it('keeps the next weighted subjects in descending priority so the UI can preview them', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        { id: 'subject-20', name: 'Informática', exam_weight_percentage: 20, topics: [{ id: 'topic-20', name: 'Windows' }] },
        { id: 'subject-40', name: 'Legislação', exam_weight_percentage: 40, topics: [{ id: 'topic-40', name: 'Lei' }] },
        { id: 'subject-10', name: 'Português', exam_weight_percentage: 10, topics: [{ id: 'topic-10', name: 'Crase' }] },
      ],
      hasCycleHistory: true,
      now,
      maxAlerts: 5,
    });

    expect(alerts.filter(alert => alert.actionType === 'start_subject').map(alert => alert.subjectName)).toEqual([
      'Legislação',
      'Informática',
      'Português',
    ]);
  });

  it('does not prioritize an unstarted topic without explicit edital weight', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Informática',
          topics: [
            { id: 'topic-1', name: 'Segurança da informação', completed: false, reviewCount: 0 },
            { id: 'topic-2', name: 'Planilhas', completed: false, reviewCount: 1 },
            { id: 'topic-3', name: 'Direito constitucional', completed: false, reviewCount: 0 },
          ],
        },
      ],
      hasCycleHistory: true,
      now,
    });

    expect(alerts.some(alert => alert.topicId === 'topic-3')).toBe(false);
  });

  it('does not turn an exam date into an unsupported topic priority', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Português',
          topics: [
            { id: 'topic-1', name: 'Interpretação', completed: false, reviewCount: 0 },
          ],
        },
      ],
      editais: [
        { id: 'edital-1', name: 'Polícia Federal', exam_date: '2026-06-20' },
      ],
      hasCycleHistory: true,
      now,
    });

    expect(alerts.some(alert => alert.topicId === 'topic-1')).toBe(false);
  });

  it('creates a critical alert when the active cycle exam date is already past', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Português',
          topics: [
            { id: 'topic-1', name: 'Interpretação', completed: false, reviewCount: 1 },
          ],
        },
      ],
      cycleExamDate: '2026-06-01',
      hasCycleHistory: true,
      now,
    });

    expect(alerts[0]).toEqual(expect.objectContaining({
      id: 'cycle-exam-date-past',
      severity: 'critical',
      title: 'Data da prova vencida',
      message: 'A data do ciclo já passou. Atualize a prova para recalcular ritmo e prioridades.',
      evidence: 'Data atual do ciclo: 01/06/2026.',
      actionLabel: 'Atualizar data',
      actionType: 'edit_cycle_exam_date',
    }));
  });

  it('does not create a priority alert from incidence data alone', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Direito Constitucional',
          topics: [
            { id: 'topic-1', name: 'Direitos Fundamentais', completed: false, reviewCount: 0 },
          ],
        },
      ],
      hasCycleHistory: true,
      now,
    });

    expect(alerts.some(alert => alert.topicId === 'topic-1')).toBe(false);
  });

  it('creates an alert for an important topic started over 48h ago with zero reviews', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Direito Administrativo',
          exam_weight_percentage: 20,
          topics: [
            {
              id: 'topic-1',
              name: 'Atos Administrativos',
              completed: false,
              reviewCount: 0,
              first_studied_at: '2026-05-30T10:00:00-03:00', // 4 dias atrás do mock now (2026-06-03)
            },
          ],
        },
      ],
      hasCycleHistory: true,
      now,
    });

    expect(alerts).toContainEqual(expect.objectContaining({
      id: 'unreviewed-important-topic:topic-1',
      severity: 'warning',
      title: 'Tópico importante sem revisão',
      message: 'Atos Administrativos já teve 1º contato, mas ainda não foi revisado.',
      actionLabel: 'Ver revisões',
      actionType: 'open_reviews',
      topicId: 'topic-1',
    }));
  });
});
