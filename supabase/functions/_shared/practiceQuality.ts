export type PracticeQualityRating = 1 | -1;

export type PracticeQualityReason =
  | "wrong_answer"
  | "ambiguous"
  | "off_topic"
  | "repetitive"
  | "too_easy"
  | "bad_explanation"
  | "other";

// A private item reported as factually wrong is unsafe for its only owner and
// must leave future selection immediately. Other reports stay auditable and
// inform later curation; they are not proof of a factual error by themselves.
export const shouldQuarantinePrivateItem = (
  rating: PracticeQualityRating,
  reason?: PracticeQualityReason,
) => rating === -1 && reason === "wrong_answer";

export const shouldRestorePrivateItem = (rating: PracticeQualityRating) =>
  rating === 1;
