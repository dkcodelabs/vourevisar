# Plano: Redesenho do fluxo de adicionar edital

## Objetivo

Simplificar o fluxo de adicionar edital, separando claramente:

1. Como o aluno quer criar o edital: catálogo, IA ou manual.
2. Qual fonte a IA deve usar: PDF ou texto.
3. Quais informações opcionais o aluno quer fornecer para orientar a IA.

O redesenho deve preservar a extração atual, cotas, recuperação de rascunho, seleção de cargo, revisão e persistência. Esta frente altera hierarquia, navegação e apresentação; não deve reescrever contratos do Supabase sem necessidade comprovada.

## Problema atual

- A tela de IA mistura escolha do método, fonte do documento e metadados opcionais.
- Banca, órgão e cargo parecem um formulário manual obrigatório, embora sejam apenas pistas para a IA.
- PDF e textarea aparecem como opções concorrentes na mesma superfície, sem uma escolha explícita.
- `Importar com IA` é repetido no cabeçalho, banner e card informativo.
- O envio do documento, que deveria ser a ação principal, perde destaque.
- A cota de IA ocupa uma seção grande e compete com a tarefa principal.
- O fluxo manual termina em `Criar edital`, sem comunicar claramente que o próximo passo é adicionar matérias e tópicos.
- `ImportEditalModal.tsx` concentra milhares de linhas de UI, estados e handlers; adicionar mais condicionais diretamente nele aumentaria o risco de regressão.

## Decisão de produto

O modal terá um seletor de método persistente:

- `Catálogo`
- `PDF com IA`
- `Criar manualmente`

Quando o aluno vier de um card específico da tela anterior, o modal abre diretamente no método escolhido. O seletor continua visível para permitir troca consciente de método sem fechar o fluxo.

Ao abrir por uma ação genérica como `Adicionar edital`, mostrar primeiro a escolha do método.

## Fluxo com IA

### Etapa 1: fonte do edital

- [x] Mostrar `Anexar PDF` como ação principal e recomendada.
- [x] Informar de forma curta o limite aceito de PDF.
- [x] Oferecer `Colar texto` como alternativa secundária.
- [x] Não mostrar textarea e área de PDF simultaneamente.
- [x] Depois de selecionar uma fonte, exibir apenas o estado correspondente.
- [x] Permitir adicionar, trocar ou remover PDFs sem apagar silenciosamente o contexto opcional ou o cargo ja detectado.

### Etapa 2: contexto opcional

- [x] Criar disclosure fechado por padrão: `Já sabe a banca ou o cargo? Adicionar detalhes`.
- [x] Ao expandir, mostrar banca, órgão/concurso e cargo/área/ênfase.
- [x] Explicar que esses campos são pistas opcionais para melhorar a primeira leitura da IA.
- [x] Não chamar esse preenchimento de criação manual.
- [x] Manter labels reais e não depender apenas de placeholders.

### Etapa 3: análise e extração

- [x] Exibir progresso semântico: `Documento`, `Cargo` e `Revisão`.
- [x] Separar falha real de recuperação quando o edital aponta o conteúdo para outro documento.
- [x] Manter cancelamento seguro durante análise/extração, abortando as chamadas ativas da Edge Function com `AbortSignal`.
- [x] Preservar restauração de extração pendente.
- [ ] Não descartar rascunho ao trocar de método sem confirmação quando houver trabalho recuperável.

### Etapa 4: revisão

- [ ] Permitir revisar edital, cargo, matérias, tópicos e pesos encontrados.
- [ ] Manter estados honestos quando peso ou algum metadado não for encontrado.
- [x] Usar um único CTA primário por etapa, com rótulo específico para usar o anexo quando necessário.
- [x] Manter ação secundária clara para voltar e corrigir a fonte ou o cargo.

## Fluxo manual

- [ ] Mostrar somente o formulário manual, sem elementos ou linguagem de IA.
- [x] Campos obrigatórios: órgão/concurso, cargo e ano.
- [x] Campos opcionais: banca e data da prova.
- [ ] Validar cada campo próximo ao próprio input.
- [x] Trocar o CTA para `Criar edital e adicionar matérias`.
- [ ] Após criar, abrir diretamente o fluxo de cadastro de matérias e tópicos.
- [ ] Preservar os dados preenchidos ao voltar dentro do fluxo.

## Catálogo

- [ ] Manter busca e importação de editais oficiais como terceiro método.
- [ ] Manter alternativas para IA e manual quando a busca não retornar resultado.
- [x] Fazer a troca pelo mesmo seletor persistente, sem criar navegação paralela.
- [ ] Preservar aviso e recuperação de extração pendente quando aplicável.

## Hierarquia visual

- [x] Remover o card decorativo grande da esquerda na entrada da IA.
- [x] Remover o banner duplicado `Importador Inteligente de Editais com IA` da area principal de envio.
- [ ] Manter a cota em formato compacto no cabeçalho, por exemplo `3 realizadas · ilimitado`.
- [ ] Reduzir repetição de títulos e textos explicativos.
- [ ] Evitar corpo de texto com 9 ou 10 px; manter legibilidade real em desktop e mobile.
- [x] Ter apenas um CTA primário por etapa.
- [x] Usar superfícies, tokens, botões e ícones já existentes no projeto.
- [ ] Preservar dark e light mode com contraste suficiente.
- [ ] Usar transições curtas apenas para explicar mudança de etapa ou abertura de disclosure.

## Arquitetura esperada

Não adicionar o novo fluxo como mais um bloco grande dentro de `ImportEditalModal.tsx`.

- [ ] Manter `ImportEditalModal` responsável por composição, abertura, fechamento e estado mínimo da jornada.
- [x] Extrair `ImportMethodSelector`.
- [x] Extrair `AiSourceStep`.
- [x] Extrair `AiOptionalContext`.
- [x] Extrair o progresso da jornada e a recuperação de documento complementar em componentes de apresentação.
- [ ] Extrair `AiProcessingStep` quando a separação reduzir acoplamento real.
- [ ] Extrair `AiCargoStep`.
- [ ] Extrair `AiReviewStep`.
- [ ] Extrair `ManualEditalForm`.
- [ ] Mover coordenação de estado e handlers de IA para hook próprio, preservando nomes explícitos para efeitos destrutivos.
- [ ] Reutilizar services existentes para importação e persistência; não espalhar novos acessos diretos ao Supabase em componentes visuais.
- [ ] Modelar os estados da jornada explicitamente: `method`, `source`, `analyzing`, `cargo`, `extracting` e `review`.

## Regras de troca de método

- [x] PDF ou texto da IA não pode contaminar o formulário manual.
- [x] Campos manuais não podem sobrescrever uma análise recuperada.
- [x] Trocar de método sem dados iniciados deve ser imediato.
- [x] Trocar de método com extração, PDF ou formulário preenchido preserva os estados separados; o descarte continua sendo uma acao explicita.
- [x] Bloquear a troca de método durante análise, seleção de cargo, extração e revisão; nesses estados mostrar progresso e retorno explícito.
- [ ] Catálogo e criação manual devem permanecer disponíveis quando a cota de IA acabar.
- [ ] O bloqueio de cota não deve dominar visualmente o modal inteiro.

## Responsividade e acessibilidade

- [ ] Validar em 375 px, 390 px, 768 px, 1024 px e desktop amplo.
- [ ] Não criar rolagem horizontal.
- [ ] Garantir alvos de toque com pelo menos 44 px.
- [ ] Garantir foco visível e ordem de teclado coerente.
- [ ] Associar labels aos inputs e anunciar estados selecionado, expandido e desabilitado.
- [ ] Manter CTA fixo apenas quando ele não cobrir conteúdo; reservar espaço inferior correspondente.
- [ ] Em mobile, usar uma coluna e priorizar fonte/ação antes de explicações secundárias.
- [ ] Respeitar `prefers-reduced-motion`.

## Testes e validação

- [ ] Testar abertura direta em catálogo, IA e manual pelas entradas atuais.
- [ ] Testar abertura genérica com escolha inicial de método.
- [ ] Testar troca entre catálogo, IA e manual sem dados iniciados.
- [ ] Testar confirmação/preservação ao trocar com dados iniciados.
- [x] Testar seleção visual de PDF principal/anexo, troca de fonte e limite de documentos; tamanho e tipo permanecem validados pelo handler existente.
- [x] Testar alternativa de colar texto.
- [x] Testar disclosure dos campos opcionais.
- [ ] Testar restauração e descarte de extração pendente.
- [ ] Testar limite de IA sem bloquear catálogo ou manual.
- [ ] Testar seleção de cargo e revisão da extração.
- [x] Testar o progresso semântico e a recuperação com confirmação do anexo adicionado.
- [ ] Validar em sessão autenticada o fluxo real `edital principal -> aviso de documento separado -> Anexo III -> revisão`, usando um dos pares IDCAP já analisados.
- [ ] Validar em sessão autenticada que consumir a última extração fecha a jornada sem reabrir o modal de limite.
- [ ] Testar criação manual e abertura imediata do cadastro de matérias.
- [x] Rodar testes focados com Vitest/Testing Library.
- [x] Rodar `npm run lint` e `npm run build`.
- [ ] Validar visualmente dark/light em desktop, tablet e mobile.

## Critérios de aceite

- [ ] O aluno entende a diferença entre catálogo, IA e criação manual antes de preencher dados.
- [ ] Na IA, a primeira decisão visível é enviar PDF ou colar texto.
- [ ] Banca, órgão e cargo ficam claramente identificados como contexto opcional.
- [ ] Cada etapa possui somente uma ação primária.
- [ ] O fluxo manual informa que matérias e tópicos serão adicionados depois.
- [ ] Trocas de método não provocam perda silenciosa de trabalho.
- [ ] Cota, recuperação, extração, seleção de cargo e revisão continuam funcionando.
- [ ] O modal fica menor em responsabilidade e não recebe outra expansão monolítica.

## Encerramento pós-importação

- [x] Fechar a jornada assim que a persistência do edital for confirmada, antes de recarregar cota e lista.
- [x] Não remontar o modal de IA após consumir a última extração disponível.
- [x] Permanecer em `Meus editais`, destacar e rolar até o edital recém-importado.
- [x] Remover o destaque transitório depois de alguns segundos, sem manter o card preso em estado especial.
- [x] Tratar falha de atualização pós-importação como recuperação de tela, sem informar falsamente que a persistência falhou ou incentivar duplicidade.
- [x] Manter a abertura do cadastro de matérias somente para a criação manual.

## Fora do escopo inicial

- Alterar limites comerciais da IA.
- Mudar o contrato da Edge Function `extract-edital` sem necessidade descoberta durante a implementação.
- Redesenhar a estrutura de matérias e tópicos depois da importação.
- Alterar regras de merge, ciclo ou histórico de revisão.
