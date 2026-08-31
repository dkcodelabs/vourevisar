export type PracticeGenerationRates = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

const KNOWN_STANDARD_RATES: Record<string, PracticeGenerationRates> = {
  // Google Gemini Developer API standard paid tier, checked on 2026-08-29.
  // Keep explicit environment overrides available because provider prices change.
  "gemini-2.5-flash": {
    inputUsdPerMillion: 0.30,
    outputUsdPerMillion: 2.50,
  },
};

const normalizeModelId = (modelId: string) => modelId.replace(/^models\//, "");

export const getPracticeGenerationRates = (
  modelId: string,
  overrides?: Partial<PracticeGenerationRates>,
): PracticeGenerationRates | null => {
  const defaults = KNOWN_STANDARD_RATES[normalizeModelId(modelId)];
  const inputUsdPerMillion = overrides?.inputUsdPerMillion ?? defaults?.inputUsdPerMillion;
  const outputUsdPerMillion = overrides?.outputUsdPerMillion ?? defaults?.outputUsdPerMillion;

  if (
    inputUsdPerMillion === undefined ||
    outputUsdPerMillion === undefined ||
    !Number.isFinite(inputUsdPerMillion) ||
    !Number.isFinite(outputUsdPerMillion) ||
    inputUsdPerMillion < 0 ||
    outputUsdPerMillion < 0
  ) return null;

  return { inputUsdPerMillion, outputUsdPerMillion };
};

export const estimatePracticeGenerationCost = ({
  inputTokens,
  outputTokens,
  rates,
}: {
  inputTokens: number;
  outputTokens: number;
  rates: PracticeGenerationRates | null;
}) => {
  if (!rates || inputTokens + outputTokens <= 0) return null;

  const estimate = (
    inputTokens * rates.inputUsdPerMillion +
    outputTokens * rates.outputUsdPerMillion
  ) / 1_000_000;

  return Number(estimate.toFixed(6));
};
