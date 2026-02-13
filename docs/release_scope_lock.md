# Release Scope Lock - Central do Aluno v1.0

> ESTADO: **FROZEN** (Congelado)
> DATA: 2026-02-13

## 1. Definição de Escopo Permissivo

A partir desta data, NENHUMA nova funcionalidade será aceita nesta release. Todas as alterações de código devem se enquadrar estritamente nestas categorias:

### ✅ IN SCOPE (Permitido)
- **Bugfix Crítico:** Erro que impede o uso da feature ou crasha a aplicação.
- **Segurança:** Correção de vulnerabilidade ou vazamento de dados.
- **Permissão:** Ajuste em RLS ou visibilidade indevida de dados.
- **Texto/Tradução:** Correção de erro ortográfico ou de concordância em PT-BR.
- **Ajuste Fino Visual:** Correção de alinhamento/padding que quebre layout (pixel perfect não é prioritário se funcional).

### 🚫 OUT OF SCOPE (Proibido)
- Novas telas ou modais.
- Novos campos no banco de dados.
- Refatoração de código que funciona ("melhoria técnica").
- Mudança de bibliotecas/dependências.
- Alteração de regras de negócio aprovadas (ex: mudar fluxo de status).

## 2. Regra de Ouro
**"Se funciona e não quebra, não mexe."**

Qualquer exceção deve ser aprovada explicitamente pelo Tech Lead/PO com justificativa de impacto no negócio.
