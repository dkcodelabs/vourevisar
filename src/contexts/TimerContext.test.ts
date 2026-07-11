import { describe, expect, it } from 'vitest';

import { isExternalTopicCompletionUpdate } from './timerSync';

describe('isExternalTopicCompletionUpdate', () => {
  it('does not treat updates without previous review_count as external review progress', () => {
    expect(
      isExternalTopicCompletionUpdate(
        { completed: false, review_stage: 'Em Revisão', review_count: 1 },
        {},
      ),
    ).toBe(false);
  });

  it('treats a reliable review_count increase as external review progress', () => {
    expect(
      isExternalTopicCompletionUpdate(
        { completed: false, review_stage: 'Em Revisão', review_count: 2 },
        { review_count: 1 },
      ),
    ).toBe(true);
  });

  it('treats completed topics as external completion even without previous review_count', () => {
    expect(
      isExternalTopicCompletionUpdate(
        { completed: true, review_stage: 'Concluído', review_count: 4 },
        {},
      ),
    ).toBe(true);
  });
});
