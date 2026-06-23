# Ilustração do estado vazio de Últimos lembretes

## Objetivo

Adicionar personalidade e orientação ao estado vazio do card `Últimos lembretes` no Painel sem transformar o bloco em decoração pesada ou competir com o formulário de criação.

## Direção aprovada

- Usar uma ilustração 3D compacta de um bloco de notas vazio com um lápis em repouso.
- Evitar checkbox, radio button, check ou qualquer forma que pareça um controle clicável.
- Usar azul como cor principal e âmbar apenas como acento no lápis.
- Gerar um único asset com fundo transparente, adequado às superfícies dos temas light e dark.
- Manter composição centralizada, bordas limpas e leitura boa em tamanho reduzido.
- Não incluir texto, marca, logotipo, sombra externa pesada ou cenário completo dentro da imagem.

## Comportamento no card

- Preservar o formulário de criação no topo do card.
- Exibir a ilustração somente quando não houver lembretes visíveis no estado atual.
- Usar o título `Sua lista está livre`.
- Usar o complemento `Adicione algo quando precisar.`.
- Manter o estado vazio compacto para não aumentar excessivamente a altura do card em desktop, tablet ou mobile.
- Preservar o comportamento atual de `Ver todos` e o histórico de lembretes.

## Integração

- Salvar o asset final em `public/images/dashboard/`.
- Referenciar o arquivo por caminho público no componente existente, sem adicionar carregamento assíncrono ou dependência nova.
- Fornecer fallback visual simples caso o asset não carregue.
- Não alterar regras de persistência, inclusão, conclusão ou listagem de lembretes.

## Verificação

- Conferir o asset final com transparência real e sem halo de recorte.
- Validar o estado vazio nos temas light e dark.
- Validar desktop, tablet e mobile.
- Confirmar que o formulário continua utilizável e que a imagem desaparece quando um lembrete é adicionado.
- Rodar lint focado, testes relacionados quando aplicáveis e build.

