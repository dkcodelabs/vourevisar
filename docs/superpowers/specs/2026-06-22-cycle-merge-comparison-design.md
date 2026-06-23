# Comparacao Visual de Mesclagem do Ciclo

## Problema

O modal atual mistura nomes de operacao (`Processar topicos`) com nomes de navegacao (`Finalizar direto`) e nao mostra com clareza os dois resultados possiveis. A seta superior tambem executa a analise de topicos sem explicitar essa decisao.

## Decisao de produto

Os dois caminhos adicionam todas as materias e topicos ao mesmo ciclo.

- `Manter itens individuais`: materias e topicos equivalentes continuam como entradas distintas dentro do ciclo unico.
- `Unificar equivalentes`: materias e topicos equivalentes viram uma estrutura visual unica, preservando os registros e historicos de origem.

## Interface

- Desktop: duas pre-visualizacoes lado a lado.
- Mobile e tablet: as mesmas duas pre-visualizacoes empilhadas, sem esconder o resultado.
- O caminho sem unificacao usa superficie neutra.
- O caminho com unificacao usa fundo e borda de sucesso apenas nos itens afetados.
- Nao usar badges `Unificada` ou `Mesclado`; uma legenda curta e um icone explicam a cor sem depender somente dela.
- A seta superior nao avanca na etapa de escolha. A decisao ocorre somente pelos CTAs explicitos.

## Comportamento

- Ao abrir a comparacao, o sistema calcula materias e topicos equivalentes para conseguir mostrar o resultado real.
- `Manter itens individuais` carrega a uniao dos IDs no ciclo sem criar `subject_merges` ou `topic_merges`.
- `Unificar equivalentes` salva o mapa calculado e as mesclagens correspondentes.
- Substituir o ciclo continua fora deste recorte.

## Verificacao

- Teste do modelo de comparacao com nomes duplicados e topicos equivalentes.
- Teste do componente para textos, legenda, cores semanticas e os dois CTAs.
- Lint focado, testes focados, build e validacao visual desktop/mobile no navegador.

