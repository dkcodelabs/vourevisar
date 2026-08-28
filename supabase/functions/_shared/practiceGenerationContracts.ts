import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const uuid = z.string().uuid();
const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);

export const generatePracticePackageSchema = z.object({
  topicId: uuid,
  idempotencyKey: uuid,
  trigger: z.enum(["explicit", "replacement"]).default("explicit"),
}).strict();

const practiceOptionSchema = z.object({
  id: z.string().trim().regex(/^[a-z][a-z0-9_-]{0,31}$/),
  label: nonEmptyText(700),
}).strict();

const baseGeneratedItemSchema = z.object({
  learningObjective: nonEmptyText(280),
  prompt: nonEmptyText(2_400),
  explanation: nonEmptyText(2_400),
  trapExplanation: z.string().trim().max(1_200).optional(),
  depth: z.enum(["foundation", "application", "distinction", "integration"]),
  targetDifficulty: z.enum(["basic", "intermediate", "advanced"]),
}).strict();

const flashcardGeneratedItemSchema = baseGeneratedItemSchema.extend({
  itemType: z.literal("flashcard"),
  answer: z.object({ kind: z.literal("flashcard_answer") }).strict(),
  options: z.tuple([]),
}).strict();

const objectiveGeneratedItemSchema = baseGeneratedItemSchema.extend({
  itemType: z.enum(["multiple_choice", "true_false"]),
  answer: z.object({ correctOptionId: z.string().trim().min(1).max(32) })
    .strict(),
  options: z.array(practiceOptionSchema).min(2).max(6),
}).strict().superRefine((item, context) => {
  const optionIds = item.options.map((option) => option.id);
  if (new Set(optionIds).size !== optionIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["options"],
      message: "Alternativas repetidas.",
    });
  }

  if (!optionIds.includes(item.answer.correctOptionId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["answer", "correctOptionId"],
      message: "Gabarito fora das alternativas.",
    });
  }

  if (item.itemType === "true_false") {
    const normalizedIds = [...optionIds].sort().join(",");
    if (normalizedIds !== "certo,errado") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Certo/Errado exige as alternativas certo e errado.",
      });
    }
  }
});

export const generatedPracticeItemSchema = z.union([
  flashcardGeneratedItemSchema,
  objectiveGeneratedItemSchema,
]);

export const generatedPracticePackageSchema = z.object({
  quickRecap: z.object({
    title: nonEmptyText(140),
    summary: nonEmptyText(900),
    memoryKey: nonEmptyText(360),
  }).strict(),
  items: z.array(generatedPracticeItemSchema).length(10),
}).strict().superRefine((value, context) => {
  const prompts = value.items.map((item) =>
    item.prompt.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim()
  );
  if (new Set(prompts).size !== prompts.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["items"],
      message: "O lote contém enunciados duplicados.",
    });
  }
});

export type GeneratePracticePackageInput = z.infer<
  typeof generatePracticePackageSchema
>;
export type GeneratedPracticePackage = z.infer<
  typeof generatedPracticePackageSchema
>;
