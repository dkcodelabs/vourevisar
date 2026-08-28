import {
  generatedPracticePackageSchema,
  generatePracticePackageSchema,
} from "./practiceGenerationContracts.ts";

const topicId = "11111111-1111-1111-1111-111111111111";
const requestId = "22222222-2222-2222-2222-222222222222";

const flashcard = (index: number) => ({
  itemType: "flashcard" as const,
  learningObjective: `Objetivo ${index}`,
  prompt: `Pergunta de flashcard ${index}?`,
  explanation: `Explicação do flashcard ${index}.`,
  depth: "foundation" as const,
  targetDifficulty: "basic" as const,
  answer: { kind: "flashcard_answer" as const },
  options: [] as [],
});

const trueFalse = (index: number) => ({
  itemType: "true_false" as const,
  learningObjective: `Objetivo ${index}`,
  prompt: `Afirmação objetiva ${index}.`,
  explanation: `Explicação da afirmação ${index}.`,
  depth: "application" as const,
  targetDifficulty: "intermediate" as const,
  answer: { correctOptionId: "certo" },
  options: [
    { id: "certo", label: "Certo" },
    { id: "errado", label: "Errado" },
  ],
});

Deno.test("generation request accepts only server-derivable identifiers", () => {
  const valid = generatePracticePackageSchema.safeParse({
    topicId,
    idempotencyKey: requestId,
  });
  if (!valid.success) throw valid.error;

  const forged = generatePracticePackageSchema.safeParse({
    topicId,
    idempotencyKey: requestId,
    subject: "Tentativa de substituir o contexto do servidor",
  });
  if (forged.success) {
    throw new Error(
      "Campos de autoridade do cliente não podem entrar na geração.",
    );
  }
});

Deno.test("generated package requires ten structurally valid items", () => {
  const result = generatedPracticePackageSchema.safeParse({
    quickRecap: {
      title: "Resumo rápido",
      summary: "Resumo suficiente para reativar o conteúdo.",
      memoryKey: "Regra de memória.",
    },
    items: Array.from({ length: 10 }, (_, index) => (
      index < 4 ? flashcard(index) : trueFalse(index)
    )),
  });

  if (!result.success) throw result.error;
});

Deno.test("objective answer cannot point outside its alternatives", () => {
  const result = generatedPracticePackageSchema.safeParse({
    quickRecap: { title: "Resumo", summary: "Resumo", memoryKey: "Chave" },
    items: Array.from({ length: 10 }, (_, index) => ({
      ...trueFalse(index),
      answer: { correctOptionId: index === 9 ? "inexistente" : "certo" },
    })),
  });

  if (result.success) {
    throw new Error("O gabarito precisa pertencer às alternativas.");
  }
});
