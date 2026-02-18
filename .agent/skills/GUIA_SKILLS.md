# 🚀 Guia de Uso: Stitch Skills

Este guia explica como utilizar as habilidades do Stitch instaladas neste repositório. Use este documento como referência para saber o que pedir e como obter os melhores resultados.

---

## 🎨 1. design-md (Sistemas de Design)
**O que faz:** Analisa uma tela desenhada no Stitch e cria um arquivo `DESIGN.md` que serve como "fonte da verdade" visual.
**Quando usar:** Antes de gerar novas telas, para garantir que elas sigam o mesmo estilo.
**Como pedir:** 
- "Analise o projeto Stitch [Nome] e gere o `DESIGN.md` para o sistema de design."
- "Crie um documento de sistema de design baseado na minha tela inicial do Stitch."

## ✨ 2. enhance-prompt (Melhoria de Prompts)
**O que faz:** Transforma ideias simples em prompts estruturados e técnicos otimizados para o Stitch.
**Quando usar:** Quando você tem uma ideia vaga ou quer resultados de maior qualidade.
**Como pedir:**
- "Melhore este prompt para o Stitch: 'crie uma página de login simples'."
- "Otimize meu pedido de UI para uma dashboard financeira usando meu `DESIGN.md`."

## ⚛️ 3. react-components (Conversão para React)
**O que faz:** Transforma o design do Stitch em código React modular, limpo e tipado.
**Quando usar:** Quando o design estiver pronto e você quiser integrá-lo ao app real.
**Como pedir:**
- "Converta a tela [Nome] do Stitch para componentes React modulares."
- "Implemente a página de histórico do Stitch no meu projeto React seguindo as melhores práticas."

## 🎬 4. remotion (Vídeos de Walkthrough)
**O que faz:** Gera vídeos profissionais mostrando o fluxo das telas do seu projeto.
**Quando usar:** Para apresentações, demonstrações de progresso ou portfólio.
**Como pedir:**
- "Crie um vídeo de walkthrough das telas principais do meu projeto Stitch."
- "Gere uma apresentação em vídeo usando Remotion para as telas do meu app."

## 🧩 5. shadcn-ui (Integração de Componentes)
**O que faz:** Guia na instalação e customização de componentes shadcn/ui.
**Quando usar:** Ao construir a interface do app usando a biblioteca shadcn.
**Como pedir:**
- "Instale o componente de Tabela do shadcn e mostre como usá-lo."
- "Como eu customizo as cores do tema no meu arquivo `globals.css` do shadcn?"

## 🔄 6. stitch-loop (Loop de Construção Autônoma)
**O que faz:** Cria páginas de forma iterativa e autônoma usando um sistema de "bastão" (`next-prompt.md`).
**Quando usar:** Para construir um site inteiro página por página com pouca intervenção.
**Como pedir:**
- "Inicie o loop de construção do Stitch para o meu novo site."
- "Atualize o `next-prompt.md` e prepare a próxima iteração do site."

---

## 💡 Fluxo de Trabalho Recomendado (O "Pulo do Gato")

Para obter resultados profissionais e consistentes, siga esta ordem lógica:

### Passo 1: Capturar a "Alma" do Design (`design-md`)
Antes de criar qualquer coisa nova, eu preciso entender como seu app já se parece.
- **Por que:** O Stitch não "adivinha" suas cores e arredondamentos preferidos.
- **O que acontece:** Ao rodar o `design-md` em uma tela existente, eu crio o arquivo `DESIGN.md`. Ele contém os códigos hexadecimais exatos e as regras de espaçamento que seu app usa.

### Passo 2: Preparar o Pedido (`enhance-prompt`)
Agora que eu já sei o estilo (através do `DESIGN.md`), você me diz o que quer criar.
- **Por que:** Pedir apenas "uma página de perfil" gera algo genérico.
- **O que acontece:** Eu pego sua ideia simples + as regras do `DESIGN.md` e transformo em um **Prompt Estruturado**. Esse prompt diz ao Stitch: "Crie um Perfil, mas use a Cor Primária #1fb2a6 e os botões arredondados que definimos antes".

### Passo 3: Gerar e Converter
Com o prompt perfeito em mãos, pedimos ao Stitch para gerar a tela e, em seguida, usamos o `react-components` para transformar esse design em código pronto para o seu projeto.

> [!IMPORTANT]
> **Em resumo:** 
> 1. `design-md` extrai as regras.
> 2. `enhance-prompt` aplica as regras no seu novo pedido.
> 3. O resultado é uma tela nova que parece ter sido feita pelo mesmo designer da tela anterior!

---

## 💎 Componentes Aceternity UI (Efeitos Premium)

Agora que configurei os pré-requisitos, você pode me pedir para implementar qualquer componente da [Aceternity UI](https://ui.aceternity.com/components). Aqui estão os favoritos para transformar seu app:

### 🚀 Para a Home/Landing Page:
- **Background Beams:** Feixes de luz suaves que seguem o mouse.
- **Sparkles:** Efeito de "estrelas/partículas" brilhantes que dão vida ao fundo.
- **Meteors:** Meteoros animados que cruzam a tela suavemente.
- **Grid Backgrounds:** O fundo de grade/pontos clássico (já está configurado!).

### 📦 Para Cards e Listas:
- **Evervault Card:** Um card com efeito visual de revelação ao passar o mouse.
- **Background Gradient:** Bordas com gradientes animados.
- **Directional Aware Hover:** Imagens que "olham" para o mouse.

### 📝 Para Textos:
- **Text Generate Effect:** Texto que aparece de forma fluida e suave.
- **Typewriter Effect:** Efeito de digitação profissional.

> [!IMPORTANT]
> **Como pedir:**
> "Adicione o efeito de `Background Beams` no fundo da minha página de Login."
> "Gostaria de usar o `Evervault Card` para mostrar os tópicos das matérias."

---


