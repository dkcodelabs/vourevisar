export type StudySessionContactType =
  | 'first_contact'
  | 'review'
  | 'continuation'
  | 'mixed'
  | 'subject_session'
  | 'unclassified';

type GetTopicStudySessionContactTypeInput = {
  firstStudiedAt?: string | Date | null;
  previousReviewCount?: number | null;
};

export const getTopicStudySessionContactType = ({
  firstStudiedAt,
  previousReviewCount,
}: GetTopicStudySessionContactTypeInput): StudySessionContactType =>
  !firstStudiedAt || (previousReviewCount || 0) <= 0
    ? 'first_contact'
    : 'review';
