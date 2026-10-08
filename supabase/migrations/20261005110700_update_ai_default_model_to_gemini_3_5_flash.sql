-- Migration to update the default AI model to gemini-3.5-flash
UPDATE public.system_settings
SET value = jsonb_set(value, '{model}', '"gemini-3.5-flash"')
WHERE key = 'ai_edital_config'
  AND value->>'model' = 'gemini-2.5-flash';
