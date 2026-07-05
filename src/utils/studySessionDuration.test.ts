import { describe, expect, it } from 'vitest';

import { getStudySessionDurationMinutes } from './studySessionDuration';

describe('getStudySessionDurationMinutes', () => {
  it.each([
    { input: null, expected: 0 },
    { input: undefined, expected: 0 },
    { input: 25, expected: 25 },
    { input: -5, expected: 0 },
  ])('normalizes $input to $expected minutes', ({ input, expected }) => {
    expect(getStudySessionDurationMinutes(input)).toBe(expected);
  });
});
