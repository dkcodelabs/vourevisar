-- Update AI model from deprecated preview model to stable gemini-2.5-flash
UPDATE system_settings
SET value = jsonb_set(
  value,
  '{model}',
  '"gemini-2.5-flash"'
)
WHERE key = 'ai_edital_config'
AND value->>'model' = 'gemini-3.1-flash-lite-preview';
