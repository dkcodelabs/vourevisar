import {
  estimatePracticeGenerationCost,
  getPracticeGenerationRates,
} from "./practiceGenerationCost.ts";

Deno.test("practice generation cost includes billable Gemini thinking output", () => {
  const rates = getPracticeGenerationRates("gemini-2.5-flash");
  const estimate = estimatePracticeGenerationCost({
    inputTokens: 1_000,
    outputTokens: 9_000,
    rates,
  });

  if (estimate !== 0.0228) {
    throw new Error(`Estimativa inesperada: ${estimate}`);
  }
});

Deno.test("practice generation cost supports explicit rates for another model", () => {
  const rates = getPracticeGenerationRates("future-model", {
    inputUsdPerMillion: 1,
    outputUsdPerMillion: 4,
  });
  const estimate = estimatePracticeGenerationCost({
    inputTokens: 500,
    outputTokens: 500,
    rates,
  });

  if (estimate !== 0.0025) {
    throw new Error(`Override de preço não aplicado: ${estimate}`);
  }
});

Deno.test("practice generation cost stays unknown without a model rate", () => {
  const estimate = estimatePracticeGenerationCost({
    inputTokens: 1_000,
    outputTokens: 1_000,
    rates: getPracticeGenerationRates("unknown-model"),
  });

  if (estimate !== null) {
    throw new Error("Modelo sem preço conhecido não pode produzir custo zero falso.");
  }
});
