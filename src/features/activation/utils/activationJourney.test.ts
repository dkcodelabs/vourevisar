import { describe, expect, it } from 'vitest';
import { getActivationJourney } from '@/features/activation/utils/activationJourney';
import type { ActivationSnapshot } from '@/features/activation/types';

const snapshot = (changes: Partial<ActivationSnapshot> = {}): ActivationSnapshot => ({
  editais: [],
  hasActiveCycle: false,
  cycleName: null,
  cycleSubjectCount: 0,
  hasFirstStudy: false,
  ...changes,
});

describe('getActivationJourney', () => {
  it('starts with the catalog when there is no edital', () => {
    const journey = getActivationJourney(snapshot());
    expect(journey.kind).toBe('no_edital');
    expect(journey.primaryState).toEqual({ openImportModal: true, importTab: 'ready' });
  });

  it('keeps an incomplete edital ahead of cycle creation', () => {
    const journey = getActivationJourney(snapshot({
      editais: [{ id: 'edital-1', name: 'TJ', subjectCount: 0 }],
    }));
    expect(journey.kind).toBe('edital_without_content');
    expect(journey.primaryState).toEqual({ openEditalId: 'edital-1' });
  });

  it('guides a ready edital to the cycle without selecting it automatically', () => {
    const journey = getActivationJourney(snapshot({
      editais: [{ id: 'edital-1', name: 'TJ', subjectCount: 6 }],
    }));
    expect(journey.kind).toBe('cycle_not_loaded');
    expect(journey.primaryHref).toContain('sourceId=edital-1');
  });

  it('requires an explicit choice when more than one edital can be loaded', () => {
    const journey = getActivationJourney(snapshot({
      editais: [
        { id: 'edital-1', name: 'TRT', subjectCount: 8 },
        { id: 'edital-2', name: 'TJ', subjectCount: 12 },
      ],
    }));

    expect(journey.kind).toBe('edital_selection_required');
    expect(journey.primaryHref).toBe('#editais-prontos');
    expect(journey.eligibleEditais).toHaveLength(2);
    expect(journey.edital).toBeNull();
  });

  it('sends an existing cycle to the first study', () => {
    const journey = getActivationJourney(snapshot({
      editais: [{ id: 'edital-1', name: 'TJ', subjectCount: 6 }],
      hasActiveCycle: true,
      cycleSubjectCount: 6,
      cycleName: 'TJ 2026',
    }));
    expect(journey.kind).toBe('first_study_pending');
    expect(journey.primaryHref).toBe('/ciclo-estudos');
  });

  it('graduates after the first real study', () => {
    const journey = getActivationJourney(snapshot({ hasFirstStudy: true }));
    expect(journey.kind).toBe('activated');
    expect(journey.primaryHref).toBe('/dashboard');
  });
});
