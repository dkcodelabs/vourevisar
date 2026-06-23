import { describe, expect, it } from 'vitest';
import { mapDifficultyLevel, mapDifficultyToNumericLevel } from './topicDifficulty';
import { Difficulty } from '@/types/study-cycle';

describe('mapDifficultyLevel', () => {
  it('maps persisted numeric and string values', () => {
    expect(mapDifficultyLevel(1)).toBe(Difficulty.EASY);
    expect(mapDifficultyLevel(2)).toBe(Difficulty.MEDIUM);
    expect(mapDifficultyLevel(3)).toBe(Difficulty.HARD);
    expect(mapDifficultyLevel('easy')).toBe(Difficulty.EASY);
    expect(mapDifficultyLevel('hard')).toBe(Difficulty.HARD);
  });

  it('keeps missing or invalid values unclassified', () => {
    expect(mapDifficultyLevel(undefined)).toBeNull();
    expect(mapDifficultyLevel(null)).toBeNull();
    expect(mapDifficultyLevel('')).toBeNull();
    expect(mapDifficultyLevel(0)).toBeNull();
    expect(mapDifficultyLevel('medium')).toBeNull();
  });
});

describe('mapDifficultyToNumericLevel', () => {
  it('maps only known difficulties back to numeric levels', () => {
    expect(mapDifficultyToNumericLevel(Difficulty.EASY)).toBe(1);
    expect(mapDifficultyToNumericLevel(Difficulty.MEDIUM)).toBe(2);
    expect(mapDifficultyToNumericLevel(Difficulty.HARD)).toBe(3);
    expect(mapDifficultyToNumericLevel(null)).toBeNull();
  });
});
