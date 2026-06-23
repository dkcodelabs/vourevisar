import { Difficulty } from '@/types/study-cycle';

export function mapDifficultyLevel(level?: number | string | null): Difficulty | null {
  if (typeof level === 'number') {
    switch (level) {
      case 1:
        return Difficulty.EASY;
      case 2:
        return Difficulty.MEDIUM;
      case 3:
        return Difficulty.HARD;
      default:
        return null;
    }
  }

  switch (level) {
    case 'easy':
      return Difficulty.EASY;
    case 'hard':
      return Difficulty.HARD;
    default:
      return null;
  }
}

export function mapDifficultyToNumericLevel(difficulty?: Difficulty | null): number | null {
  switch (difficulty) {
    case Difficulty.EASY:
      return 1;
    case Difficulty.MEDIUM:
      return 2;
    case Difficulty.HARD:
      return 3;
    default:
      return null;
  }
}
