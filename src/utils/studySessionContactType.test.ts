import { describe, expect, it } from 'vitest';

import { getTopicStudySessionContactType } from './studySessionContactType';

describe('getTopicStudySessionContactType', () => {
  it('classifies a topic with no prior contact as first contact', () => {
    expect(getTopicStudySessionContactType({
      firstStudiedAt: null,
      previousReviewCount: 0,
    })).toBe('first_contact');
  });

  it('classifies a topic with prior contact as review', () => {
    expect(getTopicStudySessionContactType({
      firstStudiedAt: '2026-07-01T12:00:00.000Z',
      previousReviewCount: 1,
    })).toBe('review');
  });

  it('keeps inconsistent legacy data conservative when first contact is missing', () => {
    expect(getTopicStudySessionContactType({
      firstStudiedAt: null,
      previousReviewCount: 3,
    })).toBe('first_contact');
  });
});
