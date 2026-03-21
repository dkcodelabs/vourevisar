-- Update AI model from gemini-2.5-flash to gemini-1.5-pro
-- gemini-1.5-pro is more robust for PDF extraction (no thinking tokens, higher output capacity)
UPDATE system_settings
SET value = jsonb_set(
  value,
  '{model}',
  '"gemini-1.5-pro"'
)
WHERE key = 'ai_edital_config'
AND value->>'model' = 'gemini-2.5-flash';

-- Also update max_tokens to 16384 if not already set
UPDATE system_settings
SET value = jsonb_set(
  value,
  '{max_tokens}',
  '16384'
)
WHERE key = 'ai_edital_config'
AND (value->>'max_tokens')::int < 16384;
