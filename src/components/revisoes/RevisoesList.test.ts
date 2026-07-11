import { describe, expect, it } from 'vitest';

import { getReviewTopicRowClassName } from './reviewTopicRowClassName';

describe('getReviewTopicRowClassName', () => {
  it('keeps the active review topic background and still applies focus highlight', () => {
    const className = getReviewTopicRowClassName({
      isActive: true,
      isHighlighted: true,
    });

    expect(className).toContain('bg-primary/5');
    expect(className).toContain('highlight-blink');
    expect(className).toContain('z-10');
  });

  it('uses the quiet hover state when the row is not active or highlighted', () => {
    const className = getReviewTopicRowClassName({
      isActive: false,
      isHighlighted: false,
    });

    expect(className).toContain('hover:bg-accent/30');
    expect(className).not.toContain('highlight-blink');
  });
});
