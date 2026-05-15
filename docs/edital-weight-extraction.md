# Extração de peso do edital

## Objetivo

Capturar peso oficial por disciplina durante a importação com IA sem alterar o caminho crítico de extração de matérias e tópicos.

## Decisões

- A extração de peso é best effort: erro, timeout, JSON inválido ou ausência de peso não bloqueiam a importação.
- O ciclo de estudos não usa peso nesta etapa. A implementação só captura, permite revisão manual e persiste o dado.
- O peso só é aplicado quando existe evidência explícita por disciplina.
- Peso por bloco, pontuação geral ou critério de desempate não são distribuídos entre disciplinas.
- O aluno pode editar `questões`, `pontos` ou `%` na revisão antes de salvar.
- Os valores são salvos nos campos já existentes de `subjects`: `exam_weight_questions`, `exam_weight_points`, `exam_weight_percentage`, `exam_weight_raw`.

## Contrato da Edge Function

`supabase/functions/extract-edital/index.ts` aceita `mode: "extractWeights"` depois que a lista de disciplinas já foi extraída.

Entrada esperada:

```json
{
  "mode": "extractWeights",
  "subjects": [
    { "id": "ia-1", "title": "Língua Portuguesa", "knowledgeType": "Conhecimentos Básicos" }
  ]
}
```

Saída normalizada:

```json
{
  "status": "found | not_found | block_only | ambiguous",
  "subjects": [
    {
      "subjectId": "ia-1",
      "subjectName": "Língua Portuguesa",
      "questions": 10,
      "points": 20,
      "percentage": null,
      "rawText": "Língua Portuguesa: 10 questões, peso 2"
    }
  ],
  "blockWeights": [],
  "message": null
}
```

## Fluxo

1. Extrair matérias e tópicos como já acontece hoje.
2. Se a extração principal falhar, manter o erro atual.
3. Se a extração principal funcionar, chamar `extractWeights` com a lista de disciplinas.
4. Se `extractWeights` falhar, registrar `console.warn` e seguir sem peso.
5. Se retornar `found`, mesclar pesos por `subjectId`.
6. Abrir revisão com campos de peso editáveis.
7. Salvar os pesos nos campos atuais ao importar o edital.

## Validação mínima

- Edital com peso por disciplina deve preencher a disciplina correspondente.
- Edital com peso apenas por bloco deve retornar `block_only` e não preencher peso individual.
- Edital sem tabela de peso deve retornar `not_found` e continuar importando.

## Rollback

Reverter as alterações em:

- `supabase/functions/extract-edital/index.ts`
- `src/components/subjects/ImportEditalModal.tsx`
- `docs/edital-weight-extraction.md`

Após alterar a Edge Function em produção, redeploy necessário:

```bash
supabase functions deploy extract-edital
```
