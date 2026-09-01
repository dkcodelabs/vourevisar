insert into public.system_settings (key, value, visible_to_users, description)
values (
  'ai_merge_prompt',
  to_jsonb($prompt$
Você é uma IA especialista em concursos públicos. Analise a lista de matérias abaixo e identifique apenas equivalências semânticas claras entre matérias de editais diferentes.

Regras:
1. Ignore diferenças de caixa, pontuação, plural e prefixos como “Noções de”.
2. Não una matérias de áreas diferentes quando a equivalência não for clara.
3. Não crie grupos com uma única matéria.
4. Preserve os IDs exatamente como recebidos.

$SUBJECTS$

Retorne somente JSON válido no formato:
[{"subjectIds":["id1","id2"],"suggestedName":"Nome unificado","reason":"Justificativa curta"}]
$prompt$::text),
  false,
  'Prompt padrão para análise de equivalência de matérias no carregamento de ciclo'
)
on conflict (key) do nothing;
