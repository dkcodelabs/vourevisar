export interface AiSettingsConfig {
  model: string;
  temperature: number;
  top_p: number;
  top_k: number;
  presence_penalty: number;
  max_tokens: number;
  analysis_prompt: string;
  extraction_prompt: string;
  system_prompt: string;
}

export function mergeAIConfig<T extends AiSettingsConfig>(defaults: T, value: unknown): T {
  return {
    ...defaults,
    ...(value && typeof value === 'object' ? value as Partial<T> : {}),
  };
}
