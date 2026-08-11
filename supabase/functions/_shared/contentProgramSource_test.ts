import {
  detectMissingContentProgramSource,
  hasSubstantiveContentProgramSection,
  MISSING_CONTENT_PROGRAM_CODE,
} from "./contentProgramSource.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("detecta anexo de conteúdo referenciado, mas ausente", () => {
  const source = `
O conteúdo programático consta no Anexo III deste edital.
ANEXO I - Cronograma
ANEXO II - Atribuições dos Cargos
ANEXO III - Conteúdo Programático
ANEXO IV - Requerimento de isenção
`;

  const result = detectMissingContentProgramSource(source, 0);

  assert(
    result?.code === MISSING_CONTENT_PROGRAM_CODE,
    "deveria retornar o código de documento ausente",
  );
  assert(
    result?.missingDocumentLabel === "Anexo III",
    "deveria identificar o Anexo III",
  );
});

Deno.test("não acusa ausência quando o anexo contém disciplinas", () => {
  const source = `
ANEXO III – CONTEÚDO PROGRAMÁTICO
LÍNGUA PORTUGUESA:
Leitura e interpretação de texto. Coerência e coesão.
MATEMÁTICA:
Operações e resolução de problemas.
`;

  assert(
    detectMissingContentProgramSource(source, 0) === null,
    "o anexo substantivo deve seguir para extração",
  );
});

Deno.test("aceita disciplinas numeradas sem dois-pontos no anexo IDCAP", () => {
  const source = `
ANEXO II – CONTEÚDO PROGRAMÁTICO
1. Língua Portuguesa
1. Compreensão e interpretação de textos. 2. Tipologia e gêneros textuais.
2. Matemática
1. Conjuntos numéricos. 2. Razão e proporção.
`;

  assert(
    hasSubstantiveContentProgramSection(source),
    "títulos numerados sem dois-pontos devem comprovar conteúdo",
  );
  assert(
    detectMissingContentProgramSource(source, 0) === null,
    "não deve dizer que o Anexo II presente está ausente",
  );
});

Deno.test("aceita disciplinas em caixa alta sem numeração e sem dois-pontos", () => {
  const source = `
ANEXO III – CONTEÚDO PROGRAMÁTICO
LÍNGUA PORTUGUESA
Compreensão e interpretação de texto. Tipologia e gêneros textuais. Marcas de textualidade e coesão.
RACIOCÍNIO LÓGICO-MATEMÁTICO
Solução de situações-problema envolvendo números racionais e porcentagem.
`;

  assert(
    hasSubstantiveContentProgramSection(source),
    "títulos em caixa alta devem comprovar conteúdo",
  );
});

Deno.test("aceita matéria comum a todos os cargos e tabela de área IDCAP", () => {
  const source = `
ANEXO III – CONTEÚDO PROGRAMÁTICO
1. LÍNGUA PORTUGUESA (COMUM A TODOS OS CARGOS):
1. Compreensão e interpretação de texto. 2. Tipologia e gêneros textuais.
5. CONHECIMENTOS ESPECÍFICOS (ÁREA FORMAÇÃO):
SERVIÇO SOCIAL
História do Serviço Social. Serviço social e a formação profissional.
`;

  assert(
    hasSubstantiveContentProgramSection(source),
    "blocos comuns e áreas de formação devem ser reconhecidos",
  );
});

Deno.test("lista final de anexos não simula conteúdo presente", () => {
  const source = `
Fazem parte deste edital os seus respectivos anexos:
ANEXO I - Cronograma
ANEXO II - Atribuições
ANEXO III - Conteúdo Programático
ANEXO IV - Requerimento
`;

  assert(
    !hasSubstantiveContentProgramSection(source),
    "a lista de anexos não contém matérias e tópicos",
  );
  assert(
    detectMissingContentProgramSource(source, 0)?.missingDocumentLabel ===
      "Anexo III",
    "deve orientar o Anexo III",
  );
});

Deno.test("identifica dinamicamente o Anexo II ausente", () => {
  const source =
    "O Conteúdo Programático, anexo deste Edital, será cobrado. ANEXO II - Conteúdo Programático";
  const result = detectMissingContentProgramSource(source, 0);

  assert(
    result?.missingDocumentLabel === "Anexo II",
    "não deve fixar o número III",
  );
});

Deno.test("explica quando o arquivo é somente uma retificação", () => {
  const source = `
1ª RETIFICAÇÃO do Edital de Abertura do Concurso Público nº 002/2026
1. ONDE SE LÊ:
2. LEIA-SE:
`;
  const result = detectMissingContentProgramSource(source, 0);

  assert(
    result?.code === MISSING_CONTENT_PROGRAM_CODE,
    "retificação sem programa deve ter diagnóstico próprio",
  );
  assert(
    result?.publicMessage.includes("retificação"),
    "a mensagem deve explicar o papel do documento",
  );
});

Deno.test("explica edital com quadro de prova, mas sem tópicos nem anexo identificado", () => {
  const source = `
A prova objetiva será elaborada com base no Conteúdo Programático deste Edital e será constituída conforme a seguir:
Disciplina | Número de questões | Pontos
Linguagens | 5 | 5
Matemática | 5 | 5
`;
  const result = detectMissingContentProgramSource(source, 0);

  assert(
    result?.code === MISSING_CONTENT_PROGRAM_CODE,
    "quadro sem tópicos deve ter diagnóstico honesto",
  );
  assert(
    result?.missingDocumentLabel === null,
    "não deve inventar número de anexo",
  );
});

Deno.test("não mascara falha genérica quando não há referência a outro documento", () => {
  const source = "Edital sem conteúdo programático e sem indicação de anexo.";
  assert(
    detectMissingContentProgramSource(source, 0) === null,
    "não deve inventar um documento ausente",
  );
});

Deno.test("não acusa ausência quando a IA já extraiu matérias", () => {
  const source = "O conteúdo programático consta no Anexo III deste edital.";
  assert(
    detectMissingContentProgramSource(source, 4) === null,
    "resultado extraído deve ser preservado",
  );
});
