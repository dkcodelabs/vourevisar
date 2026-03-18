# 🤖 Guia de Capacidades da IA (VouRevisar)

Este documento descreve as ferramentas, agentes e habilidades que eu utilizo para desenvolver e manter o projeto de forma profissional e eficiente.

---

## 🛠️ Como eu trabalho (Automação)

Toda vez que você faz uma solicitação, eu realizo um **Roteamento Inteligente** automático:
1. **Análise de Domínio**: Identifico se a tarefa é de Frontend, Backend, Banco de Dados, IA, etc.
2. **Seleção de Agente**: Ativo a "persona" do agente especialista ideal.
3. **Carga de Skills**: Leio os arquivos de diretrizes (`SKILL.md`) específicos para garantir padrões de alta qualidade.
4. **Anúncio**: Eu sempre informarei qual expertise estou aplicando no início da resposta (ex: `🤖 Aplicando conhecimentos de @frontend-specialist...`).

---

## 🎭 Agentes Especialistas (`.agent/agents/`)

Estes são os perfis que eu assumo dependendo da sua necessidade:

- **`orchestrator`**: Coordena múltiplos agentes em tarefas complexas.
- **`frontend-specialist`**: Especialista em UI/UX, React, Tailwind e responsividade.
- **`backend-specialist`**: Focado em APIs, segurança e lógica de servidor.
- **`database-architect`**: Especialista em modelagem de dados e performance SQL.
- **`security-auditor`**: Analisa vulnerabilidades e garante a segurança do código.
- **`project-planner`**: Cria planos de implementação estruturados (Fase de Planning).
- **`debugger`**: Especialista em encontrar e corrigir causas raiz de erros.
- **`test-engineer`**: Garante a qualidade através de testes automatizados.
- **`seo-specialist`**: Otimiza o site para motores de busca e performance (Core Web Vitals).

---

## 🧠 Skills Técnicas (`.agent/skills/`)

As skills são meus manuais de boas práticas. Algumas das principais que aplicamos:

- **`clean-code`**: Código limpo, modular e sem excessos.
- **`brainstorming`**: Protocolo de perguntas estratégicas antes de codificar.
- **`frontend-design`**: Criação de interfaces "Premium" e estéticas.
- **`database-design`**: Estruturação eficiente de dados.
- **`performance-profiling`**: Análise de gargalos e otimização de velocidade.
- **`vulnerability-scanner`**: Regras de segurança OWASP 2025.
- **`systematic-debugging`**: Metodologia científica para correção de bugs.
- **`gemini-api-dev`**: (Crítico) Padrões para integração com as APIs de IA do Google.

---

## 📜 Scripts de Utilidade (`.agent/scripts/`)

Posso executar estes scripts Python para automatizar tarefas de QA:

- `auto_preview.py`: Inicia e gerencia o servidor de desenvolvimento.
- `checklist.py`: Realiza uma auditoria completa de segurança, lint, UX e SEO antes de deploys.
- `verify_all.py`: Executa uma bateria geral de testes e verificações de integridade.

---

## ⚡ Workflows / Comandos Slash (`.agent/workflows/`)

Você pode usar estes comandos para iniciar fluxos específicos:

- `/plan`: Cria um plano detalhado para uma nova funcionalidade (sem escrever código ainda).
- `/create`: Fluxo guiado para criar uma aplicação ou componente do zero.
- `/enhance`: Adicionar melhorias incrementais ao sistema existente.
- `/debug`: Investigação profunda de um problema relatado.
- `/test`: Geração e execução automática de testes para uma função/componente.
- `/ui-ux-pro-max`: Planejamento focado em design e experiência do usuário.

---

> [!TIP]
> Você pode me pedir especificamente: *"Use o agente @security-auditor para revisar este código"* ou *"Execute o checklist de UX para esta página"*.
