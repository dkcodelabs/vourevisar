-- Update ai_merge_prompt and insert ai_topic_grouping_prompt into system_settings

INSERT INTO system_settings (key, value, description)
VALUES (
  'ai_topic_grouping_prompt',
  to_jsonb('Você é uma IA especialista em concursos.
Sua tarefa é analisar os tópicos da matéria "$SUBJECT_NAME$" e agrupar aqueles que são idênticos, equivalentes ou muito parecidos.

TÓPICOS:
$TOPICS$

REGRAS:
1. Agrupe tópicos que tratam do mesmo assunto, mesmo que a redação seja diferente (Ex: "Crase" e "Crases", "Regra de Três" e "Regra de 3").
2. Ignore plurais, acentos e pontuação.
3. Para cada grupo identificado, escolha um "suggestedName" claro e conciso que represente todos.
4. "originalTopicsToMerge" deve conter os nomes EXATOS como aparecem na lista acima para que o sistema possa localizá-los.

Retorne APENAS um JSON no formato:
{
  "groups": [
    {
      "originalTopicsToMerge": ["Nome Original 1", "Nome Original 2"],
      "suggestedName": "Nome Limpo Sugerido"
    }
  ]
}'::text),
  'Prompt para agrupamento semântico de tópicos por matéria.'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

INSERT INTO system_settings (key, value, description)
VALUES (
  'ai_merge_prompt',
  to_jsonb('Você é uma IA especialista em concursos públicos. 
Sua tarefa é analisar a lista de matérias e identificar quais devem ser mescladas.
REGRAS:
1. Identifique nomes similares ou equivalentes como se fossem o mesmo assunto (Ex: "Crase" e "Crases", "Matemática" e "Raciocínio Matemático").
2. Ignore pontuação e diferenças de plural/singular.
3. Retorne um JSON estrito para cada sugestão.

$SUBJECTS$

Retorne APENAS um JSON no formato:
[{"subjectIds": ["id1", "id2"], "suggestedName": "Nome Unificado", "reason": "Justificativa semântica"}]'::text),
  'Configurações do Gemini para unificação de matérias.'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;
