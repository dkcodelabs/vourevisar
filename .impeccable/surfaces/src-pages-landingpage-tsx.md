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

**Central de Progresso, luz premium.** Fundo claro, superfícies organizadas e azul para ações decisivas. Verde/lime ficam restritos a progresso e marca. A primeira dobra une a promessa de próxima ação à janela demonstrativa do produto; a autenticação preserva a mesma direção com a sessão de estudo como contexto editorial, não como prova social.

## Restrições

- CTAs de teste encaminham ao registro; não inventar estados de cobrança, publicação ou backend.
- Motion é breve e estrutural; `useReducedMotion` e `motion-reduce` removem deslocamento, clip e transições decorativas.
- Manter leitura, controles e hierarquia íntegros em mobile; o painel fotográfico da autenticação pode recolher, mas não o formulário.
- Qualquer dado sintético deve manter rótulo explícito de demonstração.

## Decisões em aberto

- Nenhuma decisão visual pendente registrada nesta superfície.
