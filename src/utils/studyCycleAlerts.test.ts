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
      actionType: 'start_topic',
    }));
    expect(alerts[0].topicId).toBeUndefined();
  });

  it('points to a high-volume unstarted topic with real incidence data', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Informática',
          topics: [
            { id: 'topic-1', name: 'Segurança da informação', completed: false, reviewCount: 0, total_volume: 35 },
            { id: 'topic-2', name: 'Planilhas', completed: false, reviewCount: 1, total_volume: 50 },
          ],
        },
      ],
      hasCycleHistory: true,
      now,
    });

    expect(alerts).toContainEqual(expect.objectContaining({
      id: 'high-volume-topic-unstarted:topic-1',
      severity: 'warning',
      topicId: 'topic-1',
    }));
  });

  it('uses exam date only when there are relevant open topics', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [
        {
          id: 'subject-1',
          name: 'Português',
          topics: [
            { id: 'topic-1', name: 'Interpretação', completed: false, reviewCount: 0, total_volume: 12 },
          ],
        },
      ],
      editais: [
        { id: 'edital-1', name: 'Polícia Federal', exam_date: '2026-06-20' },
      ],
      hasCycleHistory: true,
      now,
    });

    expect(alerts).toContainEqual(expect.objectContaining({
      id: 'exam-near-open-relevant-topic:edital-1:topic-1',
      severity: 'critical',
    }));
  });

  it('does not turn missing cycle history into a strategic alert by itself', () => {
    const alerts = getStudyCycleAlerts({
      subjects: [],
      hasCycleHistory: false,
      now,
    });

    expect(alerts).toEqual([]);
  });
});
