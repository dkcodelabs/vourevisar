---
version: 1
slug: "src-pages-landingpage-tsx"
primary_target: "src/pages/LandingPage.tsx"
related_targets: ["src/pages/Login.tsx","src/pages/ConfirmEmail.tsx","src/pages/ResetPassword.tsx","src/components/marketing/AuthShell.tsx","src/components/marketing/LandingSections.tsx","src/components/marketing/MarketingPrimitives.tsx","src/components/marketing/ProductPreview.tsx","src/components/marketing/PublicSurface.tsx"]
---

## Superfície

- **Modo:** Persuade.
- **Escopo:** landing pública e entrada de autenticação para aquisição; não altera a experiência autenticada de estudo.

## Visitante e tarefa

Pessoa que prepara concursos e ainda precisa transformar edital, ciclo, treino e revisão em uma rotina executável. Deve compreender a proposta, enxergar uma demonstração honesta do produto e iniciar o teste por `/login?mode=register`.

## Conteúdo e prova

- Prévia usa componentes reais com dados explicitamente demonstrativos; não sugere que métricas ou tarefas pertencem ao visitante.
- A foto autoral é `public/images/marketing/study-session.jpg`; sua direção e proveniência estão em `docs/marketing-image-prompt.txt`.
- BrandLogo premium v4 é a marca oficial desta superfície.

## Direção e momento memorável

**Central de Progresso Noturna.** Campo verde-preto profundo, superfícies organizadas e azul para ações decisivas. Verde/lime ficam restritos a progresso, energia e marca. A primeira dobra une a promessa de próxima ação à janela demonstrativa do produto, acompanhada por sinais orbitais de ação e revisão; a autenticação preserva a mesma direção com a sessão de estudo como contexto editorial, não como prova social.

## Contrato da direção

- **Seed key:** `brief-pinned-reference-2026-09-11` — direção explicitamente fixada pela referência do fundador, sem rodada de conceitos.
- **THESIS:** o vouRevisar transforma preparação dispersa em uma próxima ação visível.
- **OWN-WORLD:** uma central noturna de progresso; fundo quase preto, profundidade verde e janelas claras do produto em funcionamento.
- **STORY:** reconhecer a dor de esquecer, enxergar a próxima ação, entender o ciclo conectado, conferir recursos e escolher começar.
- **FIRST VIEWPORT:** promessa, CTA, prévia real do produto e sinais de próxima ação/revisão convivem na primeira dobra em desktop e mobile.
- **FORM:** tipografia sans forte, azul como comando, lime como energia conquistada, bordas finas, luz difusa com origem e movimento orbital breve.

## Expressão construída

- **Campo e contraste:** a aquisição vive sobre `#070b09`, com faixas verde-pretas próximas (`#0a100d` e `#0b1510`) e divisórias brancas translúcidas. A prévia do produto, planos e garantias permanecem como ilhas claras; esse contraste prova o produto em funcionamento e impede que a campanha escura contamine a interface operacional.
- **Primeira dobra:** em desktop, promessa e ação ocupam a coluna esquerda, enquanto a janela clara do produto ocupa a direita, cercada pelos cartões de “Próxima ação definida” e “Revisão no momento certo”. Em mobile, a composição empilha sem remover esses sinais: os cartões ficam compactos e ancorados sobre a prévia, preservando o momento memorável.
- **Papéis de cor:** azul (`#2f80ff`) é CTA, link decisivo e foco; lime (`#70dc51`) é verbo de marca, progresso, confirmação e energia. O brilho verde tem origem localizada atrás do produto ou de uma ação e não vira preenchimento indiscriminado.
- **Ritmo da página:** navegação fixa, hero, faixa de capacidades, jornada conectada, recursos em composição bento, comparação, demonstração responsiva, preços em painel claro, dúvidas e fechamento formam uma sequência única da dor à decisão. A jornada mantém prévia sticky no desktop e prévia inline no mobile.
- **Profundidade e forma:** bordas finas, superfícies quase sólidas e sombras largas de baixa opacidade constroem profundidade. Cards usam cantos de 16px; a moldura principal do produto e o painel de preços usam 28px; blur fica restrito ao campo de luz e às camadas orbitais.
- **Movimento:** entrada única do hero, paralaxe curta da prévia, flutuação lenta e desencontrada dos cartões, revelações por scroll e barras de progresso dão vida ao sistema. Com preferência por movimento reduzido, deslocamento, clip, pulso e transformações decorativas são removidos.
- **Resposta mobile:** menu migra para `Sheet`, grids viram sequência vertical, a moldura de tablet desaparece abaixo de `sm`, a prévia de celular permanece e o CTA persistente respeita a safe area. Nenhum elemento essencial da promessa, da demonstração ou da conversão depende do layout desktop.

**Limite de sistema:** esta direção escura pertence às superfícies públicas de aquisição. O app autenticado continua obedecendo ao sistema global de superfícies estruturais claras descrito em `DESIGN.md`.

## Restrições

- CTAs de teste encaminham ao registro; não inventar estados de cobrança, publicação ou backend.
- Motion é breve e estrutural; `useReducedMotion` e `motion-reduce` removem deslocamento, clip e transições decorativas.
- Manter leitura, controles e hierarquia íntegros em mobile; o painel fotográfico da autenticação pode recolher, mas não o formulário.
- Qualquer dado sintético deve manter rótulo explícito de demonstração.

## Decisões em aberto

- Nenhuma decisão visual pendente registrada nesta superfície.
