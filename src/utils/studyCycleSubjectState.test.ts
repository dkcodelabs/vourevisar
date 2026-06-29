import { describe, expect, it } from 'vitest';
import {
  getStartedTopicCycleCta,
  getStudyCycleSubjectActionState,
} from './studyCycleSubjectState';

describe('studyCycleSubjectState', () => {
  it('lets manually closed subjects return to the queue even when every topic has first contact', () => {
    expect(getStudyCycleSubjectActionState({
      isCompletedInEdital: false,
      isFullyStartedInCycle: true,
      isManuallyStudiedInCycle: true,
    })).toEqual({ kind: 'return_to_queue', tooltip: 'Voltar matéria para a fila' });
  });

  it('keeps subjects closed when every active topic already had first contact', () => {
    expect(getStudyCycleSubjectActionState({
      isCompletedInEdital: false,
      isFullyStartedInCycle: true,
      isManuallyStudiedInCycle: false,
    })).toEqual({
      kind: 'locked_started',
      tooltip: 'Todos os tópicos ativos já tiveram primeiro contato. As pendências agora ficam em Revisões.',
    });
  });

  it('labels started topic navigation as review navigation', () => {
    expect(getStartedTopicCycleCta('Controle externo')).toEqual({
      tooltip: 'Ir para revisão do tópico',
      ariaLabel: 'Ir para revisão do tópico Controle externo',
      label: 'Ir para Revisão',
    });
  });
});
