---
name: vouRevisar
description: Sistema de revisão inteligente que transforma o edital em uma rotina clara, ativa e motivadora.
colors:
  primary: "hsl(215 100% 59%)"
  primary-foreground: "hsl(0 0% 100%)"
  info: "hsl(203 92% 56%)"
  strategy-violet: "hsl(271 76% 57%)"
  progress: "hsl(145 54% 36%)"
  warning: "hsl(31 91% 54%)"
  danger: "hsl(0 84.2% 60.2%)"
  background: "hsl(0 0% 98.4%)"
  surface: "hsl(0 0% 100%)"
  surface-raised: "hsl(210 27% 98%)"
  text: "hsl(222 47% 11%)"
  text-muted: "hsl(218 18% 48%)"
  border: "hsl(218 42% 91%)"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.08em"
rounded:
  control: "8px"
  button: "12px"
  card: "12px"
  modal: "16px"
  panel: "16px"
spacing:
  compact: "8px"
  control: "12px"
  content: "16px"
  card: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "0 16px"
    height: "40px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  input-default:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
---

# Design System: vouRevisar

## Overview

**Creative North Star: "Central de Progresso Energética"**

vouRevisar é uma interface de estudo que combina ordem calma com energia direcionada. A base visual é clara, estrutural e legível para sustentar sessões recorrentes de leitura e decisão; o impulso aparece quando o aluno avança, conclui, entra em foco ou recebe uma recomendação importante.

A energia nunca deve transformar a superfície inteira em espetáculo. Neon, brilho, gradientes de progresso e movimento servem como sinais de estado e recompensa — não como acabamento padrão de cards, formulários, navegação ou tabelas. A sensação é moderna, elegante, motivadora e orientada à ação real.

**Key Characteristics:**

- Superfícies sólidas e hierarquia por espaço, contraste e tipografia.
- Azul como comando visual; verde como confirmação de progresso.
- Energia concentrada em momentos de foco, transição, conclusão e conquista.
- Densidade compacta, organizada e escaneável para uso diário.

## Colors

A paleta é funcional: o azul conduz decisões, as cores semânticas explicam estado e os neutros deixam o conteúdo de estudo respirar.

### Primary

- **Azul de Direção:** token `primary`; conduz a ação prioritária, links e estados ativos.
- **Ciano de Movimento:** token `info`; estende gradientes de progresso e sinais de atividade sem competir com a ação principal.

### Secondary

- **Violeta de Estratégia:** token `strategy-violet`; reservado para IA, estratégia ou contexto de atividade selecionada.

### Tertiary

- **Verde de Conquista:** token `progress`; comunica conclusão, domínio e evolução confirmada. O lime mais luminoso pertence ao gesto da marca e não substitui o verde semântico em componentes.
- **Âmbar de Atenção:** token `warning`; comunica risco operacional ou pendência que exige leitura.
- **Vermelho de Risco:** token `danger`; exclusivo para erros, exclusões e ações destrutivas.

### Neutral

- **Papel de Trabalho:** tokens `background`, `surface` e `surface-raised`; compõem a base limpa em modo claro.
- **Tinta de Estudo:** token `text`; dá leitura forte a títulos e conteúdo decisivo.
- **Cinza de Contexto:** token `text-muted`; sustenta metadados e explicações secundárias.
- **Linha Estrutural:** token `border`; separa sem transformar a tela em uma grade pesada.

### Named Rules

**The One Priority Rule.** Em cada decisão, existe no máximo uma ação primária azul; ações secundárias permanecem neutras.

**The Earned Neon Rule.** Neon, brilho e gradiente só aparecem para progresso, foco, conclusão, marca em transição ou celebração. Nunca são o fundo permanente da interface.

## Typography

**Display Font:** Plus Jakarta Sans (com fallbacks de sistema)

**Body Font:** Plus Jakarta Sans (com fallbacks de sistema)

**Label/Mono Font:** Plus Jakarta Sans; ícones de Material ficam restritos aos seus componentes próprios.

**Character:** A tipografia é geométrica, compacta e direta. Pesos altos criam decisão e ritmo; texto de apoio permanece confortável para explicar a próxima ação sem competir com ela.

### Hierarchy

- **Display** (800, até 4.5rem, line-height 1): títulos de campanha e momentos públicos de alta ênfase.
- **Headline** (700–800, 1.875–2.25rem, line-height aproximado de 1.05): blocos de decisão e marcos de jornada.
- **Title** (600–800, 1.125rem, line-height 1): títulos de cards, seções e controles agrupados.
- **Body** (400–600, 1rem, line-height 1.5): instruções, contexto e conteúdo de estudo.
- **Label** (700, 0.75rem, tracking 0.08em): metadados e categorias; usar caixa alta somente quando a leitura continua curta e clara.

### Named Rules

**The Contained Type Rule.** Títulos grandes pertencem a transições, campanhas e decisões de alto impacto. No produto operacional, a hierarquia vem da ordem e do peso, não de tipografia superdimensionada.

## Layout

O layout é mobile-first e usa uma progressão de uma coluna em telas estreitas para grids estruturados em tablet e desktop. A escala recorrente é 8px, 12px, 16px, 24px e 32px; controles têm alvo mínimo de 40px e containers usam respiro lateral de 16px em mobile, 24px em tablet e 32px ou mais em desktop.

O conteúdo deve levar o aluno da decisão à execução: informação de próxima ação vem antes de análise, configurações ou contexto histórico. Em telas grandes, cards podem formar grids; em telas pequenas, a prioridade continua em uma sequência vertical sem controles apertados ou conteúdo oculto.

## Elevation & Depth

A profundidade é estrutural, não atmosférica. Superfícies em repouso usam fundo sólido, borda sutil e pouco ou nenhum shadow. Sombra suave, transparência e blur aparecem somente quando uma camada precisa se destacar — modais, painéis elevados, shell de cobrança, notificações ou estados de foco.

### Shadow Vocabulary

- **Surface Lift** (`0 18px 42px rgba(15, 23, 42, 0.055)`): painel elevado em modo claro.
- **Raised Surface** (`0 16px 42px rgba(15, 23, 42, 0.08)`): bloco com hierarquia acima do conteúdo-base.
- **Glass Overlay** (`inset 0 1px 0 rgb(255 255 255 / 0.1), 0 18px 45px rgba(15, 23, 42, 0.08)`): camada temporária com blur, nunca card genérico.
- **Focus Ring** (`0 0 0 2px hsl(var(--ring) / 0.28)`): foco de campo interativo.

### Named Rules

**The Structural Depth Rule.** Se uma sombra não explica estado, interação ou nível de conteúdo, ela não deve existir.

## Shapes

O sistema usa retângulos suavemente arredondados, com controles de 8px, botões e cards de 12px e modais/painéis de 16px. A geometria é firme e contemporânea: cantos acolhem, mas não transformam cada bloco em uma cápsula.

Bordas usam neutros de baixo contraste em modo claro e branco translúcido em modo escuro. Chips e pequenos estados podem ser mais arredondados quando isso ajuda a leitura de categoria, nunca como substituto para hierarquia.

## Components

### Buttons

- **Shape:** cantos suaves e firmes (12px), altura padrão de 40px e ícone de 16px quando necessário.
- **Primary:** preenchimento azul e texto branco; representa a única ação prioritária de um contexto.
- **Hover / Focus:** clareia levemente no hover; foco sempre visível com ring azul sem salto de layout.
- **Secondary / Ghost:** fundo neutro ou transparente, borda discreta e texto escuro; nunca disputam atenção com a ação primária.
- **Semantic actions:** sucesso, alerta e perigo usam suas cores somente quando o significado operacional exige isso.

### Cards / Containers

- **Corner Style:** card padrão com 12px; painéis maiores podem chegar a 16px.
- **Background:** superfície sólida; `surface-raised` para agrupamentos de segundo nível.
- **Shadow Strategy:** sombra baixa no estado normal; elevação maior apenas quando a camada realmente sobe.
- **Border:** borda de baixo contraste.
- **Internal Padding:** 24px em cards de leitura; 16px em blocos compactos.

### Inputs / Fields

- **Style:** fundo de controle elevado, borda neutra e cantos de 8px.
- **Focus:** borda azul translúcida e ring de 2px; o estado deve ser evidente sem depender de cor de texto.
- **Error / Disabled:** erros usam o token de perigo e mensagens explícitas; desabilitado reduz contraste e bloqueia interação sem parecer um campo com falha.

### Navigation

- **Style:** sidebar compacta e recolhível, com ícones Lucide de tamanho controlado e rótulos claros.
- **States:** item ativo ganha o azul e o agrupamento necessário; estados neutros permanecem silenciosos.
- **Mobile:** a navegação muda para painel próprio e não deve cobrir ou comprimir a tarefa em andamento.

### Progress & Focus Signals

- **Style:** progresso usa a passagem do azul para o ciano; sucesso usa verde.
- **Energy:** gradiente, brilho, pulso ou neon podem marcar uma meta atingida, uma sessão em foco ou uma animação de marca.
- **Restraint:** a energia deve sumir quando o evento termina, devolvendo a tela à sua base estrutural.

## Do's and Don'ts

### Do:

- **Do** manter a maioria das superfícies sólida, clara e estrutural; use vidro e blur quando eles indicarem camada ou estado.
- **Do** reservar o azul para a ação prioritária e o verde para progresso ou conclusão confirmada.
- **Do** usar energia visual em progressos, marcos, foco ativo e animações de marca com começo e fim claros.
- **Do** preservar informação escaneável, controles reconhecíveis e composição vertical segura em mobile.
- **Do** usar tokens semânticos e componentes existentes antes de criar uma variação visual local.

### Don't:

- **Don't** usar neon, glow ou gradientes como preenchimento padrão de cards, tabelas ou formulários.
- **Don't** criar múltiplos CTAs azuis de mesma prioridade no mesmo contexto.
- **Don't** substituir hierarquia por títulos enormes, cards em excesso ou textos em caixa alta por toda a tela.
- **Don't** usar sombra decorativa quando uma borda, espaçamento ou mudança de superfície já resolve a separação.
- **Don't** apresentar métricas, urgência ou prova social como fato sem dados reais que as sustentem.
