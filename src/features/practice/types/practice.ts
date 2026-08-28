export type PracticeQuestionOption = {
  id: string;
  label: string;
};

export type PracticeQuestionPrototype = {
  id: string;
  subject: string;
  topic: string;
  bank: string;
  statement: string;
  options: PracticeQuestionOption[];
  correctOptionId: string;
  explanation: string;
  trap: string;
};

export type PracticeFeedbackReason =
  | 'wrong_answer'
  | 'ambiguous'
  | 'off_topic'
  | 'repetitive'
  | 'too_easy'
  | 'bad_explanation';

