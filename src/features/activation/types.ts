export type ActivationJourneyKind =
  | 'no_edital'
  | 'edital_without_content'
  | 'edital_selection_required'
  | 'cycle_not_loaded'
  | 'first_study_pending'
  | 'activated';

export interface ActivationEditalSummary {
  id: string;
  name: string;
  subjectCount: number;
}

export interface ActivationSnapshot {
  editais: ActivationEditalSummary[];
  hasActiveCycle: boolean;
  cycleName: string | null;
  cycleSubjectCount: number;
  hasFirstStudy: boolean;
}

export interface ActivationJourney {
  kind: ActivationJourneyKind;
  activeStep: 0 | 1 | 2 | 3;
  completedSteps: number;
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryHref: string;
  primaryState?: Record<string, unknown>;
  edital: ActivationEditalSummary | null;
  eligibleEditais?: ActivationEditalSummary[];
  cycleName: string | null;
}
