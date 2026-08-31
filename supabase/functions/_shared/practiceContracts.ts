import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const uuid = z.string().uuid();

export const practiceModeSchema = z.enum([
  "questions",
  "flashcards_due",
  "quick",
]);

const practiceFormatSchema = z.enum(["questions", "flashcards", "mixed"]);
const practiceOriginSchema = z.enum([
  "daily_recommendation",
  "manual",
  "post_study",
]);
const flashcardPurposeSchema = z.enum(["new", "review"]);

export const buildPracticeSessionSchema = z
  .object({
    mode: practiceModeSchema,
    topicId: uuid.optional(),
    subjectId: uuid.optional(),
    format: practiceFormatSchema.optional(),
    origin: practiceOriginSchema.default("manual"),
    flashcardPurpose: flashcardPurposeSchema.optional(),
    quantity: z.number().int().min(1).max(10),
    idempotencyKey: uuid,
  })
  .superRefine((value, context) => {
    if (value.topicId && value.subjectId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subjectId"],
        message: "Escolha uma matéria ou um tópico, não ambos.",
      });
    }

    if (value.mode === "flashcards_due" && value.format && value.format !== "flashcards") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["format"],
        message: "Flashcards pendentes usam formato de flashcards.",
      });
    }

    if (value.flashcardPurpose && value.mode !== "flashcards_due") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["flashcardPurpose"],
        message: "A finalidade do flashcard só pode ser usada na fila diária.",
      });
    }
  });

export const objectiveAnswerSchema = z.object({
  kind: z.literal("objective_answer"),
  optionId: z.string().trim().min(1).max(80).optional(),
  skipped: z.boolean().optional(),
});

export const flashcardRecallSchema = z.object({
  kind: z.literal("flashcard_recall"),
  rating: z.enum(["forgotten", "effortful", "recalled"]),
});

export const practiceAnswerSchema = z
  .discriminatedUnion("kind", [objectiveAnswerSchema, flashcardRecallSchema])
  .superRefine((value, context) => {
    if (
      value.kind === "objective_answer"
      && !value.optionId
      && value.skipped !== true
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["optionId"],
        message: "Selecione uma alternativa ou marque a questão como pulada.",
      });
    }
  });

export const submitPracticeAttemptSchema = z.object({
  sessionId: uuid,
  itemId: uuid,
  clientAttemptId: uuid,
  responseTimeMs: z.number().int().min(0).max(7_200_000).optional(),
  answer: practiceAnswerSchema,
});

export const revealPracticeItemSchema = z.object({
  sessionId: uuid,
  itemId: uuid,
});

export const practiceFeedbackSchema = z.object({
  itemId: uuid,
  sessionId: uuid,
  rating: z.union([z.literal(1), z.literal(-1)]),
  reason: z.enum([
    "wrong_answer",
    "ambiguous",
    "off_topic",
    "repetitive",
    "too_easy",
    "bad_explanation",
    "other",
  ]).optional(),
}).superRefine((value, context) => {
  if (value.rating === -1 && !value.reason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "O motivo é obrigatório para avaliação negativa.",
    });
  }

  if (value.rating === 1 && value.reason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "Avaliação positiva não recebe motivo negativo.",
    });
  }
});

export type BuildPracticeSessionInput = z.infer<typeof buildPracticeSessionSchema>;
export type SubmitPracticeAttemptInput = z.infer<typeof submitPracticeAttemptSchema>;
export type RevealPracticeItemInput = z.infer<typeof revealPracticeItemSchema>;
export type PracticeFeedbackInput = z.infer<typeof practiceFeedbackSchema>;
