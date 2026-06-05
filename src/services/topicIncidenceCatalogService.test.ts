import { describe, expect, it } from 'vitest';
import {
  buildTopicIncidenceContextHash,
  normalizeIncidenceCatalogText,
} from './topicIncidenceCatalogService';

describe('topicIncidenceCatalogService', () => {
  it('normalizes topic and subject text for reuse across similar edital wording', () => {
    expect(normalizeIncidenceCatalogText('Noções de Língua Portuguesa: compreensão e interpretação.'))
      .toBe('lingua portuguesa compreensao interpretacao');
  });

  it('keeps context hash stable for accent and case variations', () => {
    const first = buildTopicIncidenceContextHash({
      subjectName: 'Língua Portuguesa',
      topicName: 'Compreensão e interpretação de textos',
      examBoard: 'FGV',
    });
    const second = buildTopicIncidenceContextHash({
      subjectName: 'lingua portuguesa',
      topicName: 'compreensao interpretacao de textos',
      examBoard: 'fgv',
    });

    expect(first).toBe(second);
  });
});
