# Plano vivo: prática adaptativa, questões, flashcards e pontos cegos

> **Status:** Fase 1 de dados aplicada no Supabase; Edge Functions de sessão, revelação, tentativa e avaliação publicadas. `/treino` já consome sessões reais e não gera IA automaticamente. Próximo recorte: testes autenticados de isolamento/RLS e primeiro fluxo de preparo privado de material, sem cache global.
> **Data:** 2026-08-25
> **Superfícies:** nova página Treino (`/treino`) com execução em sobreposição, rota direta futura/fallback (`/pratica/:sessionId`) e integração leve em Revisões (`/revisoes`)
> **Stack:** React 18, TypeScript, TanStack Query, Tailwind/shadcn, Supabase PostgreSQL/RLS/Edge Functions, Vitest e Vercel

## 1. Decisão arquitetural

Questões e flashcards não serão duas features isoladas. Serão dois formatos dentro de um **motor de prática adaptativa**:

1. detectar aprendizagem insuficiente;
2. montar uma micro-sessão adequada ao tópico e à banca;
3. coletar resposta, tempo e autoavaliação;
4. devolver feedback explicável;
5. atualizar evidências de domínio sem corromper a agenda de revisão existente;
6. recomendar a próxima ação.

O MVP não tentará competir com bancos de milhares de questões. O diferencial será entregar **a prática certa para o tópico certo, no momento certo**, usando edital, histórico, sinais de aprendizagem e contexto disponível.

## 2. Correções necessárias no plano original

- **Ponto fraco** é desempenho baixo conhecido; **ponto cego** é errar acreditando que sabia. Ponto cego exige confiança, mas essa coleta foi adiada para não adicionar fricção ao MVP.
- Os pesos `+40`, `+60`, `+30` e o corte `>= 60` eram arbitrários. A heurística precisa ser explicável, versionada e calibrada com dados reais.
- Cache global por `banca + nome da matéria + nome do tópico` mistura leis, escopos e tópicos homônimos.
- TTL de 120–180 dias não torna conteúdo jurídico correto. Atualidade exige fonte, data e política por risco.
- `report_count >= 2` não pode excluir item automaticamente: é manipulável e não preserva motivo/auditoria.
- Resposta correta não deve ficar na mesma superfície lida pelo navegador antes da tentativa.
- `correct_answer text` e `options jsonb` sem contrato por tipo permitem estados inválidos.
- Flashcard usa revelação + autoavaliação, não acerto objetivo.
- Flip 3D como interação principal piora teclado, leitor de tela e reduced motion. Usar `Mostrar resposta`.
- Modal automático após revisão difícil interrompe o fluxo. A oferta deve ser inline, opcional e limitada.
- “Questão inédita” é promessa impossível de comprovar. Usar **questão autoral gerada para treino** e identificar IA.
- Fundamentação gerada apenas pelo nome do tópico não é confiável; explicação factual exige contexto-fonte.
- O gabarito devolvido pelo mesmo modelo é uma afirmação, não prova de correção. Não haverá segunda IA revisora no MVP, mas validações estruturais, reporte e quarentena são obrigatórios.

## 3. Evidência no repositório atual

- `supabase/functions/generate-questions/index.ts` gera questões por texto e regex; não persiste item nem garante schema estruturado.
- `public.question_attempts` já existe, mas usa matéria/tópico como texto e não conhece item, sessão, versão ou `topics.id`.
- `src/hooks/useQuestionEntryForm.tsx` cria uma linha artificial por questão informada, com enunciado e gabarito fictícios. Não são tentativas reais.
- `src/components/ImportadorQuestoes.tsx` extrai PDF, mas o botão de salvar apenas mostra sucesso.
- `src/lib/validation.ts` contém o contrato antigo de geração, aparentemente sem consumidor.
- `/cadernos` existe, mas não é uma superfície usada pelo usuário para esta frente. A nova funcionalidade terá página própria e não reaproveitará seu layout.
- `topic_review_history` já guarda dificuldade, intervalo, estabilidade, tendência, duração, edital e ciclo. É sinal de entrada; não deve ser reescrito por cada questão.
- Já existem perfis de banca em `supabase/functions/_shared/bank-profiles/`; a geração deve reutilizá-los.

## 4. Objetivos e não objetivos

### Objetivos do MVP

- Micro-sessão de 3–5 itens por tópico.
- Flashcard, múltipla escolha e certo/errado.
- Tentativas reais e autoavaliações sem dados fabricados.
- Feedback imediato após resposta.
- Fraqueza explicável a partir de erros e revisões; diagnóstico de ponto cego fica para fase posterior.
- Experiência responsiva e acessível.
- Custo e concorrência controlados no backend.
- Isolamento de usuário e privacidade das anotações.

### Fora do MVP

- Marketplace/banco público, ranking social e simulado longo.
- Dissertativa corrigida por IA.
- Atualização automática de lei sem fonte oficial.
- Alterar o calendário do tópico após uma única questão.
- Compartilhar conteúdo derivado de notas privadas.

## 5. Experiência central

### Ações visíveis no MVP

1. **Praticar agora:** abre 3 itens ainda não vistos do pacote existente do tópico, sem IA e sem configuração.
2. **Gerar novo treino:** cria um novo pacote para um único tópico somente quando o aluno pedir; uma chamada gera vários itens.
3. **Flashcards de hoje:** abre cartões vencidos na agenda individual.

`Resgate` pode existir como motivo interno de seleção depois de uma revisão difícil, mas não precisa virar modo, tela ou decisão adicional para o aluno.

Geração nunca acontece para uma matéria ou edital inteiro. Sessões amplas apenas combinam itens já existentes de vários tópicos.

### Questão

1. Exibir enunciado e opções sem gabarito.
2. Selecionar resposta.
3. Backend avalia e grava de forma idempotente.
4. Mostrar resultado, explicação e fonte/data quando houver.
5. Depois da explicação, oferecer avaliação discreta `Esta questão foi útil?` com joinha positivo/negativo e `Reportar problema` separado.

O joinha mede a qualidade percebida do item, não o desempenho do aluno. Ele não altera acerto, dificuldade do tópico nem agenda de revisão. No negativo, pedir um motivo rápido: `Resposta incorreta`, `Ambígua`, `Fora do tópico`, `Repetitiva`, `Fácil demais` ou `Explicação ruim`.

### Flashcard

1. Mostrar pergunta curta e tópico.
2. Ação explícita `Mostrar resposta`.
3. Autoavaliação: `Não lembrei`, `Lembrei com esforço`, `Lembrei`.
4. Persistir e calcular próxima data do item.

### Resumo

Mostrar itens, acertos, recordações, conceito a rever e próxima ação. Não mostrar “domínio” após três itens. Usar `Pouca evidência`, `Em observação`, `Precisa reforço`, `Consolidando`.

### Resumo-relâmpago do tópico

Cada pacote pode conter um `quick_recap` gerado na mesma chamada dos itens, sem custo de uma segunda geração:

- até 5 pontos essenciais;
- 2 confusões/armadilhas comuns;
- 1 regra de fechamento (`lembre disto na prova`);
- leitura-alvo de até 60 segundos;
- baseado no mesmo contexto do pacote.

Não mostrar antes de toda questão. Oferecer `Relembrar em 1 min` quando houver dificuldade recorrente, intervalo longo sem contato ou erros recentes; caso contrário, priorizar recuperação ativa com questões.

## 6. UI/UX e responsividade

A experiência deve parecer um **laboratório de memória compacto**, não landing page ou baralho infantil.

- Um item por vez; indicador discreto `2 de 5`.
- Área de toque mínima de 44 px e foco visível.
- Feedback por cor + ícone + texto.
- Explicação aberta quando houver erro.
- `prefers-reduced-motion` respeitado.
- Atalhos de teclado no desktop.
- Ação estável no rodapé mobile sem cobrir conteúdo.

```text
┌──────────────────────────────────────────┐
│ Crase · VUNESP                 2 de 5    │
│ [Enunciado com largura de leitura]       │
│ ( ) A ...   ( ) B ...   ( ) C ...       │
│                         [Confirmar]      │
└──────────────────────────────────────────┘
```

## 7. Modelo de domínio e invariantes

### Entidades

- `PracticeItem`: conteúdo seguro para apresentação.
- `PracticeItemAnswer`: gabarito, explicação e fontes em schema privado.
- `PracticePackage`: lote privado/versionado que agrupa itens e resumo-relâmpago.
- `PracticeSession`: conjunto ordenado entregue ao aluno.
- `PracticeAttempt`: evento imutável de resposta/autoavaliação.
- `FlashcardSchedule`: repetição individual por aluno/item.
- `TopicLearningSignal`: read model versionado por usuário/tópico.
- `PracticeItemFeedback`: avaliação privada de utilidade/qualidade, separada da tentativa.
- `PracticeItemReport`: reporte único, com motivo e moderação.
- `GenerationJob`: geração idempotente, custo e proveniência.

### Invariantes

- Sessão e tópico pertencem ao usuário autenticado.
- Tentativa pertence ao mesmo usuário e a item servido naquela sessão.
- Tentativas são append-only; correção invalida e cria evento novo.
- Questão tem gabarito estruturado; flashcard tem verso e autoavaliação.
- Resposta secreta nunca é concedida diretamente a `authenticated`.
- Nota privada nunca entra em cache global/log/telemetria.
- Joinha negativo oculta o item para aquele aluno, mas não apaga conteúdo nem tentativas.
- Reporte não apaga item; quarentena preserva auditoria.
- Sinal de prática não altera sozinho `topics.next_review`, `review_stage` ou histórico.

## 8. Modelagem PostgreSQL proposta

O schema é contrato, não migration pronta. Criar migration com `supabase migration new <nome>`.

### `public.practice_items`

- `id`, `package_id`, `item_type`, `prompt`, `options`;
- snapshots de banca/matéria/tópico;
- `scope_fingerprint`, `source_kind`, `source_hash`, `legal_as_of`;
- versões de conteúdo e perfil de banca;
- `status`: `draft`, `private_ready`, `global_ready`, `quarantined`, `retired`;
- `quality_score`, `expires_at`, timestamps.

Constraints por tipo validam `options`. Hash normalizado impede duplicata exata no mesmo escopo.

### `public.practice_packages`

- `id`, `user_id`, `topic_id`, `generation_job_id`;
- snapshots de matéria, edital, banca e versões de contexto;
- `source_hash`, `quick_recap jsonb`, `status`, timestamps;
- unique parcial para impedir dois pacotes ativos da mesma versão de contexto por usuário/tópico.

O pacote é a fronteira de ownership do conteúdo privado. `practice_items.package_id` pertence a ele; qualquer promoção global futura cria uma versão curada separada, sem remover a origem privada nem expor anotação.

### `private.practice_item_answers`

- `item_id` PK/FK;
- `answer_key jsonb`, `explanation`, `source_citations`;
- `validation_result`, modelo, versões de prompt/schema;
- verificação e timestamps.

Sem grants para `anon`/`authenticated`.

### `public.practice_sessions`

- `id`, `user_id`, `topic_id`, `cycle_id`;
- `mode`, `status`, `signal_snapshot`, `algorithm_version`;
- `started_at`, `completed_at`, `created_at`;
- `idempotency_key`; unique `(user_id, idempotency_key)`.

### `public.practice_session_items`

- `session_id`, `item_id`, `user_id`, `position`, `served_reason`;
- PK `(session_id, item_id)` e unique `(session_id, position)`.

`user_id` é denormalizado para RLS simples/indexável e deve ser validado no backend.

### `public.practice_attempts`

- `id`, `user_id`, `session_id`, `item_id`, `topic_id`;
- `attempt_kind`: `objective_answer` ou `flashcard_recall`;
- `answer_payload jsonb`;
- `result`: `correct`, `incorrect`, `skipped`, `recalled`, `effortful`, `forgotten`;
- `confidence smallint` nullable e reservado para evolução futura, `response_time_ms`, `mistake_tag`;
- `client_attempt_id`, `algorithm_version`, `invalidated_at`, `created_at`;
- unique `(user_id, client_attempt_id)`.

Frontend recebe só `select` das próprias tentativas. Inserção/avaliação é backend-only.

### `public.flashcard_schedules`

- PK `(user_id, item_id)`;
- `due_at`, `state jsonb`, `repetitions`, `lapses`, `last_rating`;
- `algorithm_version`, `updated_at`.

O algoritmo inicial deve ser puro, determinístico e testado. Não adicionar biblioteca sem auditar manutenção e persistência.

### `public.topic_learning_signals`

- PK `(user_id, topic_id)`;
- contagens por evidência;
- `accuracy_smoothed`, `recall_score`, `confidence_gap`;
- `weakness_score`, `blind_spot_count`, `evidence_level`;
- `score_version`, `last_practiced_at`, `updated_at`.

É reconstruível; eventos continuam como fonte de verdade.

### `public.practice_item_reports`

- usuário/item/motivo/detalhes/status/timestamps;
- motivo: `wrong_answer`, `outdated`, `ambiguous`, `bad_explanation`, `other`;
- índice único parcial impede report aberto duplicado por usuário/item.

### `public.practice_item_feedback`

- `user_id`, `item_id`, `rating smallint`, `reason`, `created_at`, `updated_at`;
- `rating` aceita apenas `1` ou `-1`;
- motivos negativos estruturados: `wrong_answer`, `ambiguous`, `off_topic`, `repetitive`, `too_easy`, `bad_explanation`, `other`;
- unique `(user_id, item_id)` permite trocar ou desfazer a avaliação sem criar contagem duplicada;
- avaliação negativa exclui o item da seleção das próximas sessões daquele usuário;
- conteúdo e tentativas permanecem preservados para auditoria e métricas.

No MVP privado, feedback negativo não exclui o item de outro usuário nem dispara exclusão física. Se existir cache global no futuro, contagens agregadas servirão apenas como sinal de quarentena/moderação, com proteção contra abuso.

### `private.practice_generation_jobs`

- solicitante, escopo, idempotência, status;
- modelo, versões, tokens/custo/latência;
- erro sanitizado e timestamps;
- unique constraint contra geração concorrente duplicada.

### Futuro opcional: `private.trusted_content_sources`

Catálogo de fontes oficiais gerenciado por admin. Não pertence ao schema mínimo do MVP:

- `id`, `label`, `canonical_url`, `official_domain`;
- `subject_scope`, `jurisdiction`, `source_type`;
- `is_active`, `created_by`, timestamps;
- URL HTTPS normalizada e única.

### Futuro opcional: `private.trusted_source_snapshots`

- `id`, `source_id`, `content_hash`;
- conteúdo extraído/sanitizado ou referência ao artefato seguro;
- `fetched_at`, `effective_at`, `http_etag`, `last_modified`;
- `status`, erro sanitizado e metadados de extração.

Itens gerados guardam vínculo com o snapshot utilizado. Mudança de hash não regenera pacotes automaticamente; novas gerações usam o snapshot atual e itens afetados podem ser marcados para revisão.

## 9. Índices e paginação

- Indexar todas as FKs.
- `practice_attempts (user_id, topic_id, created_at desc)`.
- `practice_attempts (user_id, item_id, created_at desc)`.
- `practice_items (scope_fingerprint, item_type, status, expires_at)`.
- `practice_packages (user_id, topic_id, created_at desc)`.
- `practice_sessions (user_id, created_at desc)`.
- `flashcard_schedules (user_id, due_at)` com índice parcial.
- `practice_item_feedback (user_id, rating, updated_at desc)`.
- `practice_item_feedback (item_id, rating)` para análise futura de qualidade.
- `practice_item_reports (item_id, status)`.
- Paginação por cursor `(created_at, id)`, nunca `offset` em histórico longo.

## 10. RLS, grants e segurança

Todas as tabelas expostas terão RLS e grants explícitos; não depender da autoexposição da Data API.

| Recurso | `authenticated` | Backend seguro |
|---|---|---|
| pacotes/itens | leitura dos próprios e dos itens servidos | cria/promove/modera |
| respostas privadas | nenhum | lê/escreve |
| sessões/itens da sessão | leitura das próprias | cria/fecha |
| tentativas | leitura das próprias | avalia/insere |
| agendas/sinais | leitura das próprias | atualiza |
| feedback de item | lê/cria/atualiza o próprio | agrega/modera |
| reports | leitura dos próprios | cria/modera |

Regras:

- policies com `to authenticated` e `(select auth.uid()) = user_id`;
- `user_id` lidera índice usado pela policy;
- `UPDATE` com `USING` + `WITH CHECK` quando existir;
- nenhum `service_role` no cliente;
- `security definer` só em schema privado, `search_path = ''`, auth explícita e grants revogados;
- ownership de tópico/ciclo/sessão validado no backend;
- testes negativos com dois usuários;
- verificar grants/Data API após migration para evitar `42501`.

## 11. Edge Functions

### `build-practice-session`

1. validar JWT/payload;
2. confirmar tópico e contexto do usuário;
3. verificar entitlement/cota no backend;
4. selecionar itens válidos sem repetição recente;
5. gerar apenas faltantes;
6. validar schema e semântica;
7. persistir item, resposta privada, sessão e ordem;
8. retornar somente conteúdo seguro.

```ts
type BuildPracticeSessionInput = {
  topicId: string;
  mode: 'quick' | 'rescue' | 'flashcards_due';
  itemTypes: Array<'flashcard' | 'multiple_choice' | 'true_false'>;
  quantity: 3 | 4 | 5;
  idempotencyKey: string;
};
```

Matéria, banca, edital, incidência e fonte são derivados no backend.

### `submit-practice-attempt`

- validar JWT, ownership, item da sessão e idempotência;
- comparar com gabarito privado ou validar autoavaliação;
- gravar evento e atualizar agenda/read model na mesma operação lógica;
- retornar resultado, explicação e fontes somente depois da submissão/revelação.

### `report-practice-item`

Registra motivo/contexto. Reporte não apaga; risco pode mover item para `quarantined`.

### Cota atômica

O padrão atual `check_rate_limit` seguido de `log_api_usage` tem janela de concorrência. Consumir cota em uma única operação e distinguir cache, geração, falha e retry idempotente.

## 12. Geração, fontes e cache

### Hierarquia de fontes

1. contexto estrutural obrigatório: tópico, matéria, edital e banca;
2. trecho relevante das anotações, quando existir;
3. conhecimento geral do modelo dentro do escopo solicitado;
4. futuramente, fonte oficial curada e recuperada pelo backend.

Anotação é enriquecimento opcional, nunca requisito. O contexto estrutural já permite gerar. Fonte oficial só terá efeito quando existir busca/fetch real no backend; guardar um link sem consumi-lo seria placebo. Cache global vem depois.

### Pipeline

1. contexto mínimo sem dado pessoal;
2. contexto do tópico + anotação opcional;
3. perfil de banca versionado existente;
4. JSON estruturado por tipo;
5. validação de opções, resposta e campos;
6. exatamente uma resposta objetiva correta;
7. deduplicação por hash;
8. explicação confrontada com o contexto fornecido;
9. persistência de modelo/prompt/schema/perfil/data;
10. fallback honesto se não houver item confiável.

### Fingerprint

Incluir matéria/tópico normalizados, banca/perfil, tipo, dificuldade-alvo, hash da fonte, data jurídica e versões de prompt/schema.

- `user_notes`: privado, nunca global;
- `topic_only`: privado e não verificado;
- `edital`: só no mesmo escopo compatível;
- `trusted_reference`: candidato global após validação.

Não promover item ao cache global só porque foi gerado sem erro.

## 13. Motor de recomendação adaptativa

Sinais do MVP, normalizados em 0–1: dificuldade recente, atraso limitado, taxa de erro suavizada, incidência e volume/recência de evidência. Lacuna de confiança entra apenas numa evolução posterior.

```text
fraqueza = 100 × fator_de_evidência × (
  0,25 × dificuldade_recente +
  0,15 × atraso_normalizado +
  0,45 × taxa_de_erro_suavizada +
  0,15 × incidência
)
```

- `fator_de_evidência` reduz certeza com amostra pequena;
- mostrar dois motivos principais, não score cru;
- persistir `score_version`;
- calibrar pesos por erro futuro/retenção quando houver dados.

Classificação:

- `Pouca evidência`: sem diagnóstico forte;
- `Em observação`: sinais com amostra insuficiente;
- `Ponto fraco`: erro/dificuldade persistente;
- `Ponto cego`: não afirmar no MVP. Requer uma fase futura de confiança/calibração.

Cooldown deixa de ser 14 dias fixos. A oferta reaparece por agenda do item, nova evidência ou ausência prolongada de ação.

### Entradas já existentes

- atraso de revisão (`next_review` e dias vencidos);
- dificuldade atual e histórico recente de dificuldade;
- estabilidade/intervalo de memória quando confiáveis;
- peso da matéria no edital;
- incidência/cobrança do tópico;
- erros e acertos nas práticas;
- itens inéditos disponíveis e flashcards vencidos;
- recência do último contato;
- escopo real do ciclo/edital ativo.

### Saída

O motor puro retorna, sem chamar IA:

```ts
type TrainingRecommendation = {
  topicId: string;
  action: 'questions' | 'flashcards' | 'quick_recap_then_questions';
  reasons: string[];
  evidenceLevel: 'low' | 'medium' | 'high';
};
```

### Regras iniciais simples

- flashcards vencidos e suficientes → `flashcards`;
- dificuldade recorrente + longo período sem contato → `quick_recap_then_questions`;
- erros recentes no tópico → questões novas; resumo fica disponível após o erro;
- peso/incidência altos + nenhuma prática → questões de aplicação;
- revisão marcada como difícil hoje → oferecer 3 questões daquele tópico;
- sem evidência suficiente → não inventar prioridade; permitir escolher matéria/tópico.

A recomendação mostra no máximo dois motivos humanos, por exemplo `Revisão atrasada há 5 dias` e `Cobrança alta no edital`. Peso, atraso e dificuldade não disparam geração automática; apenas escolhem tópico e formato entre conteúdos existentes ou oferecem geração explícita se faltar material.

## 14. Relação com revisão e merges

- `topic_review_history`/`topics` continuam governando revisão do tópico.
- `practice_attempts` guarda evidência granular.
- `flashcard_schedules` governa só cartões individuais.
- Sinal agregado pode sugerir prática, não alterar agenda automaticamente.
- `topic_merges` deve impedir sessão/evidência duplicada para tópicos equivalentes.
- Arquivamento preserva histórico e oculta sugestões fora do ciclo ativo.

## 15. Frontend

### Rotas

- `/treino`: nova página principal, criada do zero para recomendação, seleção manual e histórico curto.
- `/revisoes`: oferta inline de resgate, sem modal forçado.
- `/pratica/:sessionId`: execução focada, lazy-loaded.
- Sem novo dashboard no MVP.

```text
src/features/practice/
  components/
    PracticeShell.tsx
    QuestionPrompt.tsx
    FlashcardPrompt.tsx
    AnswerFeedback.tsx
    PracticeItemRating.tsx
    PracticeSessionSummary.tsx
    PracticeEntryPoint.tsx
  hooks/
    useBuildPracticeSession.ts
    usePracticeSession.ts
    useSubmitPracticeAttempt.ts
    useSubmitPracticeItemFeedback.ts
    useDueFlashcards.ts
  services/practiceService.ts
  utils/
    practiceContracts.ts
    practicePresentation.ts
    flashcardScheduler.ts
  types/practice.ts
```

- TanStack Query para queries/mutations/retry/invalidação.
- Estado da resposta atual pode ser local.
- Componentes de apresentação não acessam Supabase.
- Sem optimistic update de correção; backend é autoridade.
- Prefetch só após intenção.
- Tipos discriminados por `item_type`.

## 16. Integrações

### Nova página `/treino`

Página criada do zero. Não reutilizar layout, blocos ou hierarquia de Cadernos.

```text
┌─────────────────────────────────────────────────────────┐
│ Treino inteligente                                      │
│ Pratique o que mais pode melhorar seu resultado agora   │
├─────────────────────────────────────────────────────────┤
│ MELHOR TREINO AGORA                                     │
│ Atos administrativos · Direito Administrativo           │
│ Revisão atrasada há 5 dias · Cobrança alta              │
│ [Responder 3 questões]  [Relembrar em 1 min]            │
├────────────────────────────┬────────────────────────────┤
│ Flashcards para hoje       │ Escolher outro tópico      │
│ 6 cartões vencidos         │ Matéria → Tópico           │
│ [Praticar]                 │ [Ver conteúdo disponível]  │
├────────────────────────────┴────────────────────────────┤
│ Atividade recente e tópicos que precisam de reforço     │
└─────────────────────────────────────────────────────────┘
```

Regras de UX:

- uma recomendação principal, não vários cards concorrendo;
- no máximo dois motivos para a recomendação;
- ação principal usa conteúdo existente; sem conteúdo, vira `Gerar treino para este tópico`;
- seleção manual `Matéria → Tópico` sempre disponível;
- `Gerar novo treino` aparece no detalhe do tópico escolhido, não no topo global;
- resumo-relâmpago é alternativa contextual, não etapa obrigatória;
- mobile empilha recomendação, flashcards e seleção sem dashboard pesado;
- adicionar item `Treino` à navegação principal; Cadernos permanece fora desta feature.

### Escopos amplos

- `Treinar matéria`: mistura itens existentes dos tópicos daquela matéria, priorizando inéditos e sinais de dificuldade.
- `Treinar edital`: fica fora do MVP; futuramente mistura itens existentes do ciclo ativo.
- Se uma matéria não tiver itens suficientes, não gerar para todos os tópicos. Mostrar os tópicos e permitir gerar para um deles.
- Ao entrar por uma superfície global, o aluno escolhe `Matéria → Tópico`; o edital é inferido pelo ciclo e pelo `topic_id`.

### Revisões

- O principal ponto contextual de descoberta nasce em `Parar e avaliar`, já existente em `/revisoes`.
- Primeiro persistir tempo, dificuldade e histórico. Só após sucesso, o próprio `DifficultyRatingModal` muda para um estado curto `Revisão registrada`; não empilhar outro modal.
- Se já houver itens: CTA `Fixar com 3 questões · cerca de 2 min` inicia a sessão sem IA.
- Se não houver pacote: CTA `Gerar treino deste tópico` explica que criará questões e flashcards e só então chama a IA.
- Ação secundária sempre visível: `Agora não`; fechar nunca desfaz a revisão salva.
- Dificuldade alta destaca o convite e informa `Você marcou este tópico como difícil`.
- Dificuldade média/baixa mantém a opção mais discreta; prática imediata mede recuperação recente e não substitui a prática espaçada futura.
- No máximo uma oferta por revisão concluída. Não bloquear a revisão, não gerar automaticamente e não fazer prefetch de geração; apenas consultar metadados do pacote existente.
- O CTA leva diretamente a `/pratica/:sessionId` quando há itens. Quando precisa gerar, mantém contexto de tópico/matéria/banca e abre a sessão após a geração terminar.

### Dashboard

Não adicionar card no MVP. Depois de validar adoção, integrar ponto cego à fila de prioridade existente.

## 17. Métricas

### Produto

- início, conclusão, tempo, retorno em 7 dias;
- redução de erro no mesmo tópico em 7/14 dias;
- evolução de acerto por tópico;
- abandono por posição.

### Conteúdo

- joinhas positivos/negativos por 100 itens e por versão de geração;
- motivos de avaliação negativa e taxa de desfazer;
- taxa de itens ocultados que exigiram reposição;
- reports por 100 itens;
- quarentena/motivo;
- fonte/explicação ausente;
- desempenho anormal por item;
- estabilidade do gabarito.

### Operação

- sessões atendidas por cache;
- custo por sessão concluída;
- latência p50/p95;
- duplicatas evitadas;
- falha por modelo/schema/perfil.

Analytics não contém enunciado, resposta livre, anotação ou dado sensível.

## 18. Migração do legado

- [ ] Auditar linhas sintéticas de `question_attempts` e consumidores.
- [ ] Congelar `useQuestionEntryForm` como fonte de tentativa real.
- [ ] Decidir entre `legacy_question_entries` ou somente leitura temporária.
- [ ] Não migrar linhas sintéticas para `practice_attempts`.
- [ ] Substituir `generate-questions`; não expandir seu parser textual.
- [ ] Remover ou integrar de verdade `ImportadorQuestoes`.
- [ ] Gerar tipos Supabase só depois da migration aplicada.
- [ ] Atualizar purge/admin para novas tabelas na ordem correta das FKs.

## 19. Fases

### Fase 0 — decisões e prova de valor

- [x] Fechar D1–D6 da seção 22.
- [x] Definir fonte inicial e auditar legado. A geração começa pelo contexto
  estrutural e anotação opcional; `generate-questions` foi auditada e não
  será expandida porque aceita autoridade do cliente e depende de parser
  textual. A nova geração terá Edge Function e contrato estruturado próprios.
- [x] Definir contratos TypeScript/Zod. A requisição pública aceita apenas
  `topicId`, gatilho e chave idempotente; o contrato interno exige 10 itens
  estruturados, alternativas/gabarito consistentes e resumo rápido.
- [ ] Criar fixtures manuais de qualidade.
- [x] Protótipo navegável e responsivo de `/treino`, questão, flashcard dedicado, joinhas, resumo-relâmpago e pós-revisão implementado com fixtures e validado em desktop, tablet e mobile, nos temas claro e escuro.

**Gate:** jornada estática aprovada, acessível e sem banco irreversível.

### Fase 1 — dados e tentativa real

- [x] Criar migration, constraints, índices, grants e RLS. Aplicado no Supabase em 2026-08-27 como `20260827005249_create_practice_core.sql`; as nove tabelas públicas estão com RLS ativo e as RPCs internas só concedem execução a `service_role`.
- [x] Testar isolamento entre usuários. A suíte pgTAP agora cobre pacotes,
  itens, sessões, respostas privadas, feedback, agenda e o ledger de geração;
  30 testes passaram localmente em 2026-08-27.
- [ ] Implementar sessão/submissão idempotente sem IA.
- [ ] Implementar read model reconstruível.
- [ ] Cobrir purge, arquivamento e merges.

**Gate:** questão e flashcard completos com fixtures, persistência e RLS.

### Fase 2 — frontend vertical

- [ ] Criar feature modular e rota lazy.
- [ ] Criar `/treino` do zero e integrar o estado pós-revisão em `DifficultyRatingModal`.
- [ ] Implementar joinhas, ocultação privada, desfazer, report e resumo sem etapa extra de confiança.
- [ ] Tratar loading, retry, expiração, item inválido e offline.
- [ ] Validar teclado, leitor de tela, reduced motion e touch.

**Gate:** fluxo autenticado E2E com itens fixos em todos os breakpoints.

### Fase 3 — geração privada

- [ ] Structured Output + perfil de banca versionado.
- [ ] Cota atômica e jobs idempotentes.
- [ ] Lock contra geração duplicada.
- [ ] Validações sintáticas/semânticas.
- [ ] Proveniência completa e privacidade das notas.
- [ ] Fallback quando IA falhar.

**Gate:** geração privada auditável, custo mensurável e gabarito protegido.

### Fase 4 — sinais adaptativos

- [ ] Score puro/versionado e testes de borda.
- [ ] Separar evidência e fraqueza; pesquisar ponto cego com confiança em experimento posterior.
- [ ] Mostrar razões humanas.
- [ ] Evitar repetição recente.
- [ ] Medir resultado em 7/14 dias.

**Gate:** sinais reproduzíveis, explicáveis e sem afirmações maiores que a evidência.

### Fase 5 — cache global/curadoria

- [ ] Só iniciar após medir geração privada.
- [ ] Definir fontes elegíveis/fingerprint.
- [ ] Promoção, quarentena, aposentadoria e moderação.
- [ ] TTL por risco, não global.
- [ ] Painel operacional mínimo.

**Gate:** procedência/qualidade suficientes para compartilhamento.

### Fase 6 — evolução por dados

- [ ] Calibrar score por retenção/erro futuro.
- [ ] Avaliar scheduler mais sofisticado.
- [ ] Avaliar ponto cego no Dashboard.
- [ ] Avaliar importação com direitos/proveniência.
- [ ] Avaliar distratores baseados em erros anonimizados, após revisão de privacidade.
- [ ] Avaliar pesquisa web/fetch de fontes oficiais no backend; não assumir que o modelo da API navega sozinho.
- [ ] Se aprovado, criar catálogo admin, snapshots versionados, allowlist e proteção SSRF.

## 20. Testes

### Unitários

- seleção por modo; score/evidência; scheduler; contratos; fingerprint; feedback;
- joinha não altera tentativa/sinal de aprendizagem; item negativo não volta à seleção; desfazer restaura elegibilidade.

### Banco/RLS

- A não lê B; frontend não lê gabarito nem escreve tentativa;
- A não lê/altera feedback de B; ownership obrigatório; FK/cascade correto; índices cobrem policies/queries.

### Edge

- JWT, tópico alheio, concorrência/idempotência, cota, cache parcial;
- provedor falho, JSON inválido, resposta repetida e erro sanitizado.

### Frontend

- correto/incorreto/skipped; flashcard; retry sem duplicata;
- retomada de sessão; pouca evidência; teclado/acessibilidade;
- negativo oculta com `Desfazer`, não chama IA e não apaga histórico;
- revisão só mostra o próximo passo após persistência bem-sucedida e `Agora não` não reverte o salvamento.

### E2E

1. abrir tópico próprio;
2. iniciar treino;
3. receber item sem gabarito exposto;
4. responder e ver feedback;
5. concluir;
6. confirmar eventos reais/idempotentes;
7. confirmar sinal atualizado;
8. negar acesso a outro usuário;
9. avaliar negativamente, confirmar que o item sai das próximas sessões e desfazer;
10. concluir uma revisão, abrir o treino contextual e confirmar que a revisão já estava salva;
11. validar reload e mobile.

## 21. Verificação/entrega

- [ ] `git diff --check` completo: ainda bloqueado por dois problemas pré-existentes fora deste recorte (`CycleFirstContactFinishedPanel.test.tsx` e `ImportEditalModal.tsx`); o diff de prática não tem erros.
- [x] `npm run lint` (2026-08-27).
- [ ] `npm run typecheck`.
- [x] `npm run test:run` — 190 arquivos / 738 testes (2026-08-27).
- [x] `npm run build` (2026-08-27).
- [ ] Advisors Supabase e revisão de grants/RLS.
- [ ] Visual light/dark em desktop/tablet/mobile.
- [ ] Fluxo autenticado E2E; deploy não é prova funcional.
- [ ] Deploy explícito das Edge Functions:
  - `supabase functions deploy build-practice-session`;
  - `supabase functions deploy submit-practice-attempt`;
  - `supabase functions deploy report-practice-item`.

## 22. Decisões de produto

### D1. Fonte

**Decisão aprovada:** anotação não é obrigatória. A IA gera a partir de tópico, matéria, edital e banca; quando houver anotação, usa para personalizar. Pesquisa externa fica fora do MVP.

- [x] Não gerar resumo/questões automaticamente ao abrir `/treino`, concluir revisão ou iniciar sessão.
- [x] Separar `Gerar material de treino` de `Praticar`.
- [x] Persistir `source_hash` apenas para auditoria/deduplicação interna.
- [x] Alterar anotação não mostra aviso, não agenda regeneração e não invalida o pacote.
- [x] Não regenerar por calendário mensal ou TTL; isso multiplicaria custo sem provar benefício.
- [x] Disponibilizar `Gerar novo treino` como ação explícita quando o aluno quiser novidade/profundidade ou quando os itens inéditos acabarem.
- [x] Sem anotação, gerar normalmente pelo contexto estrutural.
- [x] Não criar campo de link sem mecanismo real de busca/fetch.
- [ ] Avaliar fontes oficiais depois de validar o valor e a qualidade do motor básico.

### D2. Posicionamento

**Decisão aprovada:** micro-sessões adaptativas com conteúdo rico e controlado, não banco aberto nem concorrente direto de plataforma de questões.

- [x] O diferencial é seleção contextual, explicação útil, armadilhas e adaptação ao histórico.
- [x] Qualidade tem prioridade sobre volume.
- [x] Definir o contrato editorial v1 do pacote: 10 itens, distribuição por tipo/profundidade/dificuldade e critérios da seção 23.8–23.9.

### D3. Confiabilidade/cache

**Decisão aprovada:** cache global adiado; medir qualidade privada antes de compartilhar itens entre usuários.

- [x] Cache privado reutiliza o próprio pacote do aluno sem nova chamada de IA.
- [x] Cache global futuro reutilizaria um item validado entre alunos com contexto equivalente, reduzindo custo e latência.
- [ ] Definir se a promoção global futura terá curadoria humana, validação automatizada reforçada ou ambas.

### D4. Monetização

**Decisão arquitetural:** responder/praticar itens já armazenados não consome IA e não deve consumir cota de geração. Criar ou atualizar um pacote chama a IA e consome uma unidade mensurável de geração.

- [x] Separar métricas `sessão praticada` e `pacote gerado`.
- [x] Retry idempotente não consome cota novamente.
- [ ] Medir tokens/custo/qualidade de pacotes reais antes de definir limites de trial, mensal e anual.

### D5. Diagnóstico e confiança

**Decisão recomendada:** retirar diagnóstico/confiança do MVP. O aluno recebe questão rápida, nova e comentada sem etapa adicional.

- [x] Não perguntar `Chutei`, `Em dúvida` ou `Tenho certeza` no treino rápido.
- [x] Calcular apenas sinais silenciosos de dificuldade com acertos, erros, repetição e histórico de revisão.
- [ ] Avaliar confiança como experimento futuro somente se houver benefício mensurável para recomendação e retenção.
- [ ] Não usar o termo `ponto cego` na UI antes de existir evidência que sustente essa afirmação.

### D6. Superfície principal

**Decisão aprovada:** criar nova página `/treino` do zero. Não aproveitar Cadernos para gerar ou executar questões/flashcards. A execução normal acontece na sobreposição de `/treino`, preservando o contexto e sem recarregamento; uma rota direta futura poderá reabrir a mesma sessão quando houver deep link.

- [x] `/treino` concentra recomendação personalizada, flashcards vencidos e escolha manual.
- [x] `/treino` abre questões, flashcards e pós-revisão na mesma sobreposição, sem navegação no fluxo normal.
- [x] Definir o fallback de deep link de sessão (`/pratica/:sessionId`) sem manter uma segunda experiência concorrente. Em 2026-08-29, a rota antiga passou a redirecionar para `/treino`; a execução canônica permanece na sobreposição autenticada até existir contrato seguro para hidratar uma sessão por ID.
- [x] Revisões apenas encaminha o tópico por CTA contextual.
- [x] O encerramento de `Parar e avaliar` é a descoberta contextual principal; `/treino` continua disponível na navegação.
- [x] Dashboard e Ciclo não recebem novos cards no MVP.

## 23. Fluxo de geração e custo

### 23.1 Gerar material de treino

1. O aluno abre um tópico e escolhe `Gerar material de treino`.
2. O backend deriva matéria, edital, banca e origens pelo `topic_id`; adiciona anotação quando existir.
3. Calcula `source_hash` e procura pacote privado compatível.
4. Se já existir, não chama IA e abre o material disponível.
5. Se não existir, gera um pacote estruturado, valida e persiste.
6. O pacote pode alimentar várias micro-sessões sem nova geração e prioriza itens ainda não vistos.

Gerar `quick_recap` junto do pacote, não em chamada separada. A riqueza principal continua nos itens: pergunta atômica, resposta, explicação, armadilha e contexto.

### 23.2 Praticar

1. O aluno inicia `Praticar agora` ou `Flashcards de hoje`.
2. O seletor monta 3–5 itens a partir do pacote privado e da agenda.
3. Nenhuma IA é chamada para itens existentes.
4. As respostas atualizam tentativas, agenda dos flashcards e sinais do tópico.
5. Itens podem ser reutilizados em sessões futuras com espaçamento e ordem diferentes.

### 23.3 Gerar novidade

- Alterar a anotação não dispara nada e não cria aviso recorrente.
- O pacote antigo continua utilizável e auditável.
- Quando houver menos de 3 itens ainda não vistos, a UI pode oferecer `Gerar novo treino`.
- Joinha negativo não chama IA imediatamente. O item sai do conjunto elegível do aluno e o sistema acumula a necessidade de reposição.
- Oferecer nova geração quando inéditos + elegíveis forem menos de 3, ou quando o aluno pedir explicitamente.
- A próxima geração recebe motivos estruturados e fingerprints dos itens rejeitados para evitar repetir o mesmo defeito; texto livre do aluno não entra diretamente no prompt.
- O aluno também pode pedir novo treino explicitamente quando quiser aprofundar.
- A nova geração cria outra versão e preserva itens/histórico anteriores.
- Nunca gerar automaticamente em background.

### 23.4 Unidade de custo

- **Sem custo novo de IA:** abrir `/treino`, iniciar sessão com pacote existente, responder, rever explicação armazenada e consultar histórico.
- **Com custo de IA:** clicar em `Gerar novo treino` ou pedir expansão explícita.
- Hipótese inicial: lote único com 10 itens — 4 flashcards e 6 questões no formato da banca — mais um `quick_recap`, todos produzidos na mesma chamada.

### 23.5 Regra de conteúdo rico

O lote não deve ser apenas paráfrase das anotações. O contrato editorial deve distribuir:

- recuperação direta de conceitos essenciais;
- aplicação em situação concreta;
- diferença entre conceitos confundíveis;
- armadilha compatível com a banca;
- explicação do erro, não só gabarito;
- profundidade limitada ao contexto/fonte disponível.

“Gerada agora” não significa “informação atualizada”. Sem integração com fonte confiável e datada, a UI não pode prometer atualização jurídica ou factual. Conteúdo novo pode aprofundar e aplicar a fonte fornecida, mas não inventar fatos externos.

### 23.6 Escopo de geração

- **Tópico:** única unidade de geração. Produz pacote coerente e profundo.
- **Matéria:** unidade de prática mista, usando pacotes já existentes; não gera conteúdo em massa.
- **Edital/ciclo:** unidade futura de seleção adaptativa; não gera conteúdo em massa.
- Entrada pelo tópico: nenhuma seleção adicional.
- Entrada global: selecionar matéria e tópico; edital/banca são inferidos.

### 23.7 Fontes oficiais e internet — fora do MVP

O modelo chamado hoje pelas Edge Functions não pesquisa a internet: recebe texto e retorna texto. Para um link oficial influenciar a questão, o backend precisa buscar e extrair o conteúdo ou usar uma API/modelo com ferramenta explícita de pesquisa.

Quando essa evolução for justificada:

1. Admin cadastra um link oficial e seu escopo.
2. Backend valida domínio/HTTPS e cria snapshot sanitizado com hash/data.
3. A fonte pode ser atualizada por requisição HTTP condicional sem usar IA.
4. A Edge Function recupera apenas trechos relevantes para o tópico.
5. O item guarda a versão da fonte utilizada.
6. Se a fonte mudar, novas gerações usam a versão nova; não há regeneração em massa.

Não aceitar URL arbitrária enviada pelo aluno diretamente à função de fetch. Cadastro e atualização são administrativos, com allowlist de domínios oficiais e proteção contra SSRF. Na UI do treino não é necessário um alerta repetitivo de “feito por IA”; quando houver fonte oficial, mostrar discretamente `Fonte: ... · consultada em ...` agrega confiança e rastreabilidade.

### 23.8 Contrato editorial do lote v1

Uma geração tenta produzir **10 itens em uma única chamada**:

- **4 flashcards:** conceito essencial, distinção importante, condição/exceção e aplicação curta;
- **6 questões objetivas:** o formato segue a banca;
  - banca de múltipla escolha: 6 questões com alternativas;
  - CEBRASPE ou perfil verdadeiro/falso: 6 itens certo/errado;
  - banca desconhecida/mista: 3 de cada.

Distribuição de profundidade no lote inteiro:

- 3 itens de fundamento;
- 4 itens de aplicação;
- 2 itens de armadilha/distinção;
- 1 item integrador mais profundo.

Distribuição de dificuldade-alvo:

- 2 básicos;
- 5 intermediários;
- 3 avançados.

Cada item deve conter:

- objetivo de aprendizagem interno;
- enunciado autossuficiente;
- resposta estruturada;
- explicação curta do porquê;
- explicação do erro/armadilha quando aplicável;
- tipo, profundidade e dificuldade;
- vínculo com tópico, matéria, edital, banca e versões de geração.

O pacote também contém um `quick_recap` de até 60 segundos, fora da contagem dos 10 itens.

### 23.9 Rejeição e recuperação de lote ruim

Validação local, sem segundo modelo revisor por padrão.

Rejeições objetivas em código:

- schema válido e exatamente 10 candidatos;
- resposta objetiva pertence às alternativas ou é `certo/errado` válido;
- múltipla escolha tem exatamente uma resposta correta;
- alternativas não são vazias, repetidas ou obviamente equivalentes;
- enunciado não entrega o gabarito;
- explicação existe;
- texto está em português e dentro dos limites de tamanho;
- não duplica item do lote ou histórico recente por normalização/similaridade local;
- formato respeita o perfil da banca.

Sinais de qualidade, usados para rejeitar ou reduzir o score quando detectáveis:

- baixa relação lexical/semântica com o tópico e contexto enviados;
- explicação que não menciona a regra necessária para chegar ao gabarito;
- linguagem metalinguística (`como IA`, `conforme solicitado`, `não tenho certeza`);
- questão dependente de texto, imagem ou alternativa que não foi fornecida;
- alternativas com tamanhos/padrões que entregam visualmente a resposta.

Sem fonte externa, o código não consegue provar sozinho correção factual. O MVP limita custo com uma única IA geradora, validação estrutural forte, contexto bem definido, reportes e quarentena; não adiciona uma segunda IA revisora.

Aceite:

- 10 válidos: salvar pacote completo;
- 8–9 válidos: fazer uma tentativa corretiva apenas para os substitutos; se falhar, salvar os válidos;
- menos de 8: fazer no máximo uma tentativa corretiva pedindo apenas substitutos;
- menos de 8 após correção: não salvar pacote parcial e não declarar sucesso;
- reportes posteriores podem colocar item em quarentena sem apagar tentativas antigas.

### 23.10 Feedback de qualidade e destino do item

- Joinha positivo registra utilidade percebida e pode favorecer itens privados na seleção futura, sem provar correção factual.
- Joinha negativo abre motivos rápidos e remove imediatamente o item das próximas sessões daquele aluno.
- Mostrar toast `Questão removida dos seus treinos · Desfazer`; desfazer restaura elegibilidade.
- `Resposta incorreta` também cria/eleva um reporte severo. Item privado pode ir imediatamente para `quarantined`; item global futuro é ocultado para quem reportou, mas só entra em quarentena global após regra antiabuso/validação.
- Demais motivos não apagam nem regeneram isoladamente; orientam o próximo lote de substituição.
- Nunca fazer hard delete a partir de um único clique. Histórico, custo, versão do prompt e tentativa precisam continuar auditáveis.
- Uma futura reutilização global exigirá regra própria de moderação; feedback bruto de um aluno não pode remover conteúdo de todos.

## 24. Próximo passo

- [x] Validar o contrato editorial de 10 itens com fixtures representativas de
  CEBRASPE (Certo/Errado) e banca convencional (múltipla escolha). Os testes
  cobrem distribuição, alternativas e gabarito; isso não substitui a futura
  avaliação humana de uma geração real.
- [x] Prototipar o estado `Revisão registrada` com CTA contextual e o feedback por joinhas com desfazer.
- [x] Prototipar a nova página `/treino` e a execução de questão em `/pratica/:sessionId` do zero.
- [ ] Concluir Fase 0: o protótipo responsivo está pronto; ainda faltam aprovar conteúdo/copy, fechar D1–D6 e validar fixtures editoriais de bancas diferentes.
- [x] Criar migration e Edge Functions sem IA, depois de fechar o contrato mínimo de sessão, tentativa e feedback.

## 25. Débitos técnicos críticos

- `question_attempts` atual não representa tentativa confiável.
- Parser de `generate-questions` é frágil.
- Rate limit atual não é atômico.
- Não há fonte verificável para fundamentação jurídica atualizada.
- Revisão é sensível a merges/histórico; acoplamento direto causará regressão.
- Cache global sem proveniência transforma economia em desinformação compartilhada.

## 26. Estado do protótipo navegável

Implementado em 2026-08-25 e iterado em 2026-08-26, deliberadamente sem banco ou chamada de IA:

- `/treino`: recomendação visual, seleção pesquisável `Matéria → Tópico` e acesso aos flashcards; nomes extensos no seletor truncam e preservam o texto integral no título nativo; labels estão associados aos comboboxes e o cabeçalho quebra com segurança em telas estreitas;
- `/treino`: após a `Sessão recomendada`, dois cartões equivalentes resumem flashcards vencidos e questões disponíveis; ambos usam CTA neutro compartilhado e métricas demonstrativas;
- `/treino`: cartões de prática e o CTA de seleção manual têm largura natural; métricas usam ícones semânticos, ocupam melhor o centro vertical e controles de ação mantêm ao menos 40 px de altura;
- `PracticeSessionDialog`: questões e flashcards usam a mesma sobreposição; abrir, concluir ou fechar não navega para fora de `/treino` e preserva o ponto da página;
- `PracticeSessionDialog`: protótipo agora percorre 3 questões ou 6 flashcards com avanço explícito, pergunta mantida no flashcard revelado e resumo final;
- `PracticeSessionDialog`: flashcards usam modal focado no cartão, sem lateral analítica; frente/verso são identificados dentro das faces e o estado fechado inteiro é clicável para revelar;
- `PracticeSessionDialog`: o modal de flashcards mantém altura estável, reserva rolagem apenas para a área de estudo e mantém a autoavaliação acessível em rodapé sticky; o encerramento mostra uma distribuição curta da sessão;
- `PracticeSessionDialog`: cartão de flashcard usa superfície neutra/primária; verde, âmbar e vermelho ficam reservados às escolhas `Lembrei`, `Com esforço` e `Não lembrei`;
- `PracticeSessionDialog`: hierarquia compactada na frente do cartão, com pergunta um grau menor, menos padding lateral e hover semântico alinhado à cor de cada autoavaliação;
- `PracticeSessionDialog`: flashcard passou a reservar duas faces de altura equivalente (frente/verso), com revelação no próprio cartão e rodapé de autoavaliação sempre acessível;
- `PracticeSessionDialog`: alternativas de questões foram compactadas e centralizadas; `Certo` usa a semântica verde e `Errado` a vermelha, inclusive no hover;
- `PracticeSessionDialog`: `Chave de memória` segue a linguagem de `Armadilha da banca`, com ícone de lâmpada âmbar, superfície neutra e tipografia de apoio consistente;
- `PracticeSessionDialog`: cartão usa borda pontilhada tanto fechado quanto revelado, preservando a identidade visual; a sombra só reforça a affordance enquanto ainda há ação de revelar;
- `PracticeSessionDialog`: o flashcard fechado usa superfície neutra e borda pontilhada; azul identifica apenas os rótulos `Frente`/`Verso` e o foco/ação, sem colorir a resposta;
- `/treino`: `Regra de prova` aparece como insight contextual com ícone de lâmpada e tratamento visual alinhado à `Chave de memória`; `Conteúdo demonstrativo` foi removido da recomendação;
- `/pratica/prototipo` e `/pratica/flashcards-prototipo`: rotas de fallback/deep link do protótipo, não o fluxo normal iniciado pela tela de treino;
- `/treino?preview=review-complete`: estado pós-revisão abre a sobreposição de convite e continua diretamente para a mesma sobreposição de questões;
- item `Treino` adicionado à navegação principal;
- as rotas de protótipo isoladas continuam com fixtures para referência visual; a rota normal `/treino` não as usa e consulta matérias/tópicos do aluno, abrindo apenas sessões devolvidas pelas Edge Functions;
- validação visual realizada em 1920×1080, 1280×720 e 375×812, sem overflow horizontal; ainda manter a aprovação visual final do usuário como gate;
- teste unitário cobre avaliação positiva, negativa, motivo, ocultação e desfazer.

Pendências antes de conectar dados reais:

- [ ] validar conteúdo/copy com o usuário e ajustar o protótipo;
- [x] criar tela dedicada de flashcard;
- [x] criar resumo final da sessão no protótipo, sem declarar métricas persistidas;
- [x] validar desktop, 768×900, mobile e temas claro/escuro;
- [ ] aprovar hierarquia, escala tipográfica e paleta da home: a tentativa de neutralizar a tela foi revertida porque apagou a identidade visual e a legibilidade de flashcard;
- [x] aplicar escala-base desktop de 90% (`14.4px`) sem `zoom`, preservando mobile em `16px`;
- [ ] auditar densidade dos componentes que usam valores em `px` e ajustar controles/typografia que não acompanham a escala-base;
- [x] unificar questões, flashcards e pós-revisão em sobreposição sem navegação do fluxo normal;
- [x] desenhar e implementar estados sem pacote, preparando, falha e retry; `needs_material` informa que o sistema não gera conteúdo automaticamente;
- [x] implementar migration/RLS/Edge Functions de sessão, revelação, tentativa e avaliação; publicado no Supabase em 2026-08-27. A rota normal substituiu fixtures por hooks TanStack Query e mutations para Edge Functions.
- [x] conectar a geração privada ao fluxo normal: `/treino` expõe apenas o CTA
  explícito `Gerar material`; ele deriva o tópico selecionado, aguarda a
  Function e abre a mesma sobreposição de questões quando o pacote estiver
  pronto. Nenhum acesso à tela, revisão ou sessão dispara IA automaticamente.
- [x] Trocar os resumos estáticos da home por uma visão autenticada de prática:
  tópico recomendado por revisão/dificuldade, material efetivamente pronto,
  flashcards realmente vencidos e geração em andamento. Não prometer treino
  antes de consultar esses estados. `get-practice-overview` autentica o aluno,
  deriva tudo no servidor e a home só oferece a ação compatível com o estado.
- [x] Corrigir a hierarquia da home: o card superior só pode recomendar uma
  prática já pronta (flashcards vencidos ou questões existentes). A criação do
  primeiro lote deve ser uma ferramenta separada, contextual e explicada; ela
  não pode aparecer como a ação normal de revisão. Implementado na home local:
  práticas sem material ficam fora da recomendação e a criação passou para a
  ferramenta contextual de aprofundamento.
- [x] Registrar o estágio seguro da falha de geração (`provider`, `validação`
  ou `persistência`) antes de fazer qualquer nova tentativa paga. O ledger
  agora distingue o ponto da quebra. Em 2026-08-27, o diagnóstico real revelou
  e corrigiu a falta de `INSERT` da Function no cofre privado de respostas; a
  persistência atômica também foi verificada em transação com rollback.

## 27. Contrato pendente após concluir um microtreino

- [x] Contrato de UX aprovado: sessão de questões tem 3 itens sequenciais, indicador `1 de 3`, `2 de 3`, `3 de 3`, feedback após cada resposta, `Próxima questão` nos dois primeiros e `Ver resultado` no último.
- [x] Contrato de encerramento aprovado: o resultado mostra acertos, erros e tópicos para reforço; oferece `Fechar` e `Fazer outro treino`.
- [x] Ao concluir os 3 itens, persistir `PracticeSession` e `PracticeAttempt` antes de alterar qualquer recomendação visual; a interface só mostra correção/encerramento após a resposta da Edge Function.
- [ ] Mostrar um resumo breve do resultado e manter o cartão atual somente quando a evidência exigir reforço; caso contrário, substituir pela próxima prioridade real da fila.
- [ ] Definir regra de reforço: erro/dificuldade mantém o tópico com uma próxima ação curta; acerto consistente reduz a prioridade sem alterar diretamente o histórico de revisão espaçada.
- [x] Centralizar `Certo` e `Errado` dentro das respectivas caixas, preservando área de toque acessível e feedback por cor + texto + ícone.
- [x] Persistir avaliação de utilidade com `user_id`, `session_id`, `item_id`, `rating`, `reason` e `created_at`; o negativo oculta o item para o aluno, sem apagar tentativa ou conteúdo. `rate-practice-item` foi publicado e o UI só confirma após a mutation.
- [ ] Usar os motivos negativos para filtragem, ajuste de dificuldade, prevenção de repetição e orientação de regeneração; não tratá-los como prova isolada de erro factual.
- [ ] Não simular atualização do cartão enquanto o protótipo não tiver esses dados persistidos e a regra de priorização testada.
- [x] Aprovar estrutura visual do flashcard: modal estável e focado no cartão; frente/verso identificados fora do cartão, pergunta e resposta juntas após revelar, com autoavaliação no rodapé e `Próximo cartão`/`Ver resultado` explícitos.

## 28. Gate técnico para iniciar a implementação real

- [x] Confirmar que o fluxo visual aprovado é o protótipo em sobreposição de `/treino`, sem navegação no uso normal.
- [x] Definir e testar contratos Zod de criação de sessão, tentativa e avaliação; a função nunca recebe `user_id`, matéria, banca ou gabarito como autoridade.
- [x] Criar novas tabelas de prática; não reutilizar `question_attempts`, que expõe gabarito e não é append-only.
- [x] Separar gabarito, explicação e fontes em schema privado sem grants a `anon` ou `authenticated`.
- [x] Implementar seleção e submissão idempotentes com itens de fixture, antes da geração por IA. As funções ainda não geram conteúdo e retornam `needs_material` quando não há itens elegíveis.
- [x] Implementar e validar localmente `build-practice-session`: seleção de itens seguros, reuso por idempotência, ocultação privada e retorno honesto quando não há material.
- [x] Implementar e validar localmente `reveal-practice-item` e `submit-practice-attempt`: explicação só após tentativa, verso do flashcard só para item servido, tentativa idempotente e agenda individual atualizada sem alterar revisões.
- [x] Reconciliar o histórico local/remoto e aplicar migrations/funções. Em 2026-08-27, os três nomes locais de migrations Stripe foram alinhados às versões já aplicadas no remoto após comparação de SQL; em seguida, foram aplicadas `20260825200500_sync_cycle_name_on_archive.sql` e `20260827005249_create_practice_core.sql`, e publicadas `build-practice-session`, `reveal-practice-item`, `submit-practice-attempt` e `rate-practice-item`. CORS foi validado para o domínio oficial e bloqueou origem de preview.
- [x] Conectar a rota normal `/treino`: queries TanStack Query leem somente matérias/tópicos próprios; mutations chamam as Edge Functions, não passam `user_id`/gabarito e o modal não abre com conteúdo inventado.
- [x] Cobrir ownership, RLS, duplicidade de tentativa, ocultação privada e agenda de flashcard com testes. A suíte pgTAP em `supabase/tests/practice_rls.test.sql` passou 22/22 em schema remoto isolado após a migration `20260827101500_harden_practice_privileges.sql`, publicada em 2026-08-27. O bootstrap do repositório principal ainda é uma pendência independente por ausência da migration-base original.
- [x] Integrar a Edge Function de geração privada. A fundação em
  `20260827164331_create_practice_generation_runs.sql` reserva custo por
  tópico/chave idempotente; a migration
  `20260827173522_complete_practice_generation_atomically.sql` persiste o
  lote validado e seu ledger em uma transação. A Function
  `generate-practice-package` foi publicada no Supabase em 2026-08-27 com
  JWT obrigatório, contexto derivado do `topicId`, chamada Gemini estruturada,
  nota privada fora do ledger/log e validação editorial antes da persistência.
  O schema local recriou do zero, a suíte pgTAP passou 32/32 e o lint remoto
  não apontou erro. A Function é acionada apenas pelo CTA explícito do frontend;
  não houve geração nem custo real durante a validação técnica.
- [x] Corrigir a chamada HTTP das rotinas internas de geração: `private` não é
  schema da Data API; wrappers mínimos em `public` são executáveis somente por
  `service_role` e delegam a `private`. Migration publicada em 2026-08-27;
  teste remoto confirmou `authenticated = false` e `service_role = true` para
  a reserva.
- [x] Validar uma geração real após a correção de RPC: o clique explícito deve
  criar um lote privado, abrir as questões e registrar custo/resultado no
  ledger. Em 2026-08-27, foram aceitos 10 itens (4 flashcards e 6 questões),
  com 13.896 tokens registrados; a sessão abriu, corrigiu uma resposta e
  avançou para a questão seguinte. O flashcard real também revelou frente e
  verso sem classificação da agenda. A schema estruturada do Gemini foi
  reduzida para evitar o limite de estados e normalizada no servidor antes do
  Zod.
- [x] Tornar inequívoca a fronteira entre o lote privado e a micro-sessão: a
  home agora separa `Agora para você` de `Treino livre`; abrir/revelar/responder
  apenas usa itens privados persistidos. A geração só aparece em aprofundamento
  explícito, com confirmação e sem abrir um treino silenciosamente.
- [x] Exigir confirmação contextual antes de criar o primeiro ou um novo lote
  privado com IA; após concluir, a consulta é revalidada e o material passa a
  estar disponível para uma sessão, sem prometer nova geração em cada clique.
- [x] Ajustar múltipla escolha para alternativa vertical, com leitura e
  seleção no padrão de prova, preservando estados certo/errado e navegação por
  teclado.
- [x] Manter o verso fora do payload inicial do flashcard e explicar na UI que
  `Revelar resposta` busca apenas o conteúdo já persistido, sem acionar IA.
  Validado em 2026-08-29 no fluxo autenticado: a frente abriu sem o verso, o
  clique exibiu `Abrindo resposta salva…` e a UI passou a informar
  explicitamente `Busca o verso já salvo. Não usa IA.`
- [x] Diferenciar falhas do provedor no ledger e na UI sem vazar prompt, nota
  privada ou segredo: classificar credencial/modelo, limite, indisponibilidade
  e timeout antes de considerar a geração validada ponta a ponta. Publicado em
  2026-08-27; a próxima tentativa real registrará o código seguro no ledger.
- [x] Implementar uma única tentativa corretiva para resposta estruturalmente
  inválida. O segundo prompt recebe apenas as falhas de validação, tokens das
  duas tentativas ficam no ledger e nova falha rejeita todo o lote.
- [x] Aplicar quarentena privada mínima: `Resposta incorreta` retira o item
  privado das sessões futuras e abre reporte auditável; `Desfazer` restaura a
  elegibilidade. Ambiguidade, repetição, facilidade e explicação ruim seguem
  como sinais de curadoria, não como prova isolada de erro factual.
- [ ] Definir a regra baseada em evidência para usar os demais motivos
  negativos na dificuldade, prevenção de repetição e geração de substituição;
  não automatizar essa inferência antes de haver amostra de qualidade.

## 29. Fila diária, treino livre e pós-estudo (implementação em 2026-08-28)

- [x] Tornar a geração de material visível e acionável: após uma geração pronta,
  mostrar o resumo privado do tópico e permitir abrir questões ou flashcards;
  enquanto outro lote estiver preparando, manter o estado explícito e
  revalidá-lo. A home também deve listar, por tópico do ciclo ativo, os
  materiais privados salvos e seus flashcards vencidos, sem criar uma nova rota.
  Implementado, testado e publicado em 2026-08-28. Validado no navegador
  autenticado em 2026-08-29: `Preparando material` apareceu no mobile com
  `Decidir depois`; o lote concluiu como `Material pronto para praticar`, foi
  incorporado à biblioteca e permaneceu legível em 375x812 e 1440x900.
- [x] Refinar a hierarquia visual do material: separar matéria de tópico nos
  diálogos, remover o card interno da biblioteca, permitir decidir depois
  durante o preparo e limitar o azul à ação prioritária de cada contexto.
  Implementado e validado por testes, lint e build em 2026-08-28; checagem
  visual autenticada concluída em 2026-08-29 em mobile e desktop, sem overflow
  horizontal e sem erro no console.
- [x] Remover a duplicidade de entrada em treino livre: o estado em dia apenas confirma a situação; o card de treino livre concentra a prática com material pronto e a criação explícita de material com IA. Validado em 2026-08-28 em desktop/mobile, sem overflow ou erro de console.
- [x] Tornar o estado da recomendação diária imediatamente reconhecível: celebrar prática em dia e diferenciar visualmente flashcards vencidos de questões prioritárias, preservando texto acessível, contagem e ações existentes. Validado em 2026-08-28 na home `/treino`, desktop/mobile e dark mode, sem overflow ou erro de console.
- [x] Separar a home em uma fila diária singular (`Agora para você`) e um
  construtor modal de `Treino livre`; matéria/tópico não ficam mais como filtros
  persistentes na página.
- [x] Priorizar no read model: flashcards vencidos, revisão atrasada/hoje,
  falhas recentes, dificuldade registrada e peso/incidência, sempre usando
  conteúdo privado já pronto.
- [x] Permitir sessão manual de 3, 5 ou 10 itens por objetivo, matéria ou
  tópico, com formatos questões, flashcards ou misto. Flashcards iniciados por
  treino livre ou pós-estudo registram tentativa sem alterar `due_at`; somente
  a fila diária de flashcards reprograma a agenda individual.
- [x] Exibir pós-estudo contextual na própria tela de revisões depois de
  primeiro contato ou dificuldade alta. Primeiro contato prioriza flashcards;
  dificuldade alta prioriza questões; sem material, a preparação com IA é
  opcional e confirmada.
- [x] Cobrir os contratos Zod, seleção e a home com testes focados; lint e
  build passam localmente. A suíte pgTAP local passou 38/38 em 2026-08-28,
  incluindo a separação entre a fila diária (reprograma o cartão) e treino
  livre/pós-estudo (registra a tentativa sem alterar `due_at`).
- [x] Aplicar `20260828124037_practice_manual_flashcard_schedule.sql` e publicar
  `get-practice-overview`, `build-practice-session` e
  `submit-practice-attempt` no projeto remoto em 2026-08-28.
- [x] Restringir treino ao escopo efetivo do ciclo ativo: recomendação, treino
  livre, início de sessão e geração com IA agora usam somente a interseção entre
  `ciclo_atual` e as matérias ativas dos editais carregados. Sem edital no
  ciclo, a tela usa o estado vazio canônico e o histórico privado não é exibido
  como estudo atual. Publicado em `get-practice-overview`,
  `build-practice-session` e `generate-practice-package` em 2026-08-28.
- [x] Validar, no navegador autenticado, o fluxo completo: iniciar uma sessão
  diária e confirmar que um flashcard altera `due_at`; iniciar treino livre ou
  pós-estudo e confirmar que o mesmo evento não altera a agenda individual.
  Em 2026-08-29, a tentativa diária no mesmo cartão reduziu a fila de 9 para 8;
  a tentativa manual seguinte registrou o evento e manteve a fila em 8. O
  recorte confirma o efeito do `rescheduleFlashcards` exposto pelo read model,
  sem alterar revisão de tópico, ciclo ou edital.
- [ ] Validar, no navegador autenticado, a troca de escopo: sem edital no ciclo
  a página não pode sugerir, listar nem iniciar prática; ao carregar outro
  edital, deve mostrar exclusivamente suas matérias e tópicos.
  O contrato automatizado A → B e a invalidação do overview por eventos de
  revisão/ciclo/merge passaram em 2026-08-29. A mutação autenticada do ciclo real
  permanece pendente para não substituir ou descarregar o edital do usuário
  apenas para QA.
- [x] Estabelecer a primeira baseline de produção para qualidade e custo antes de
  definir limites de plano, cache global ou moderação compartilhada. Em
  2026-08-29, cinco lotes somaram 30.738 tokens e custo estimado de US$ 0,072814;
  todos concluíram, sem rejeição ou reporte, mas houve somente uma avaliação.
  O custo, antes nulo, foi corrigido e retrocalculado incluindo raciocínio.
- [ ] Reavaliar qualidade, custo e adoção antes de qualquer limite ou integração
  no Painel quando a amostra atingir: 20 usuários iniciantes, 50 sessões com
  tentativa, 30 conclusões, 10 usuários recorrentes e 20 avaliações de itens.
- [x] Melhorar início, conclusão e coleta editorial dentro do Treino: progresso
  acessível, ações de saída explícitas, troca correta para outro treino e
  feedback textual também para flashcards. Validado no fluxo autenticado em
  desktop e `375x812` em 2026-08-29.

## Backlog de segurança fora do recorte de prática

- [ ] Tratar os avisos pré-existentes do Supabase Advisor: em 2026-08-29,
  `admin_purge_user`, `get_my_auth_methods`, `get_stripe_billing_overview`,
  `get_subscription_info` e `get_user_ai_limits` continuam como
  `SECURITY DEFINER` executáveis por `authenticated`; revisar o corpo e os
  consumidores antes de revogar ou trocar o modo de segurança. O Advisor também
  indica proteção contra senhas vazadas desabilitada. Os avisos informativos de
  RLS sem policy em tabelas privadas/service-role-only não autorizam criar policy
  de cliente por reflexo. Nenhum desses avisos foi introduzido pela prática.

## Bloqueio de ambiente local descoberto em 2026-08-27

- [x] Recuperar a migration-base do projeto sem usar `supabase db reset --linked` e sem incluir dados de produção em seed. A cadeia histórica foi preservada em `supabase/migrations_legacy/`; uma baseline reproduzível de `public,private` está em `supabase/migrations/`, e o histórico remoto foi alinhado em 2026-08-27. O plano detalhado e o checkpoint estão em `docs/supabase-migration-baseline-recovery-plan.md`.
- [x] Executar no repositório principal: em 2026-08-27, `supabase start` e `supabase db reset --local` concluíram com a baseline, e `supabase test db --local supabase/tests/practice_rls.test.sql` passou 22/22. O ambiente anterior ocupava a porta padrão e foi parado para esta validação; se for necessário rodar dois ambientes locais simultâneos, configurar um segundo conjunto explícito de portas antes de iniciá-lo.
