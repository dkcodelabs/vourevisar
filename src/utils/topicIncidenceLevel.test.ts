import { describe, expect, it } from 'vitest';
import {
  getIncidenceLevelFromScore,
  getIncidenceLevelLabel,
} from '@/utils/topicIncidenceLevel';

describe('topicIncidenceLevel', () => {
  it.each([
    [1, 'low'],
    [2, 'low'],
    [3, 'medium'],
    [4, 'high'],
    [5, 'high'],
  ] as const)('converte o score %s para o nível %s', (score, level) => {
    expect(getIncidenceLevelFromScore(score)).toBe(level);
  });

  it.each([null, undefined, 0, 6, Number.NaN])(
    'não classifica score inválido: %s',
    score => {
      expect(getIncidenceLevelFromScore(score)).toBeNull();
    },
  );

  it.each([
    ['low', 'Cobrança baixa'],
    ['medium', 'Cobrança média'],
    ['high', 'Cobrança alta'],
  ] as const)('retorna o rótulo do nível %s', (level, label) => {
    expect(getIncidenceLevelLabel(level)).toBe(label);
  });

  it('não retorna rótulo para nível ausente ou inválido', () => {
    expect(getIncidenceLevelLabel(null)).toBeNull();
    expect(getIncidenceLevelLabel('invalid')).toBeNull();
  });
});
