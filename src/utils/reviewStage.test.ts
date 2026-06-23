import { describe, expect, it } from 'vitest';

import {
  getProgrammedReviewsCompleted,
  getReviewStage,
  isReviewProgramCompleted,
} from './reviewStage';

describe('getReviewStage', () => {
  it.each([
    [1, 'Primeiro Contato'],
    [2, 'Revisão 1'],
    [3, 'Revisão 2'],
    [4, 'Revisão 3'],
    [5, 'Concluído'],
    [8, 'Concluído'],
  ])('traduz %s contatos para %s', (contactCount, expected) => {
    expect(getReviewStage(contactCount)).toBe(expected);
  });

  it.each([
    [0, false, 0],
    [1, false, 0],
    [2, false, 1],
    [4, false, 3],
    [5, true, 4],
    [8, true, 4],
  ])('converte %s contatos em %s revisões concluídas', (contactCount, completed, expected) => {
    expect(getProgrammedReviewsCompleted(contactCount, completed)).toBe(expected);
  });

  it('não confunde boa estabilidade com programa concluído', () => {
    expect(isReviewProgramCompleted({
      completed: false,
      reviewStage: 'Revisão 3',
      learningStatus: 'Dominando',
    })).toBe(false);
    expect(isReviewProgramCompleted({ completed: true, reviewStage: 'Revisão 3' })).toBe(true);
    expect(isReviewProgramCompleted({ completed: false, reviewStage: 'Concluído' })).toBe(true);
  });
});
