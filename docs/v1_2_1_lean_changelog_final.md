# Changelog Final v1.2.1-LEAN

## [1.2.1-LEAN] - 2026-02-13

### 🚀 Novidades (Escopo Aluno)
- **Central do Aluno Humanizada:** Substituição completa de terminologia técnica por linguagem amigável ("Meus Pedidos", "Sua Solicitação").
- **Fluxo de Status:** Padronização global dos status visíveis (Nova, Planejada, Em desenvolvimento, Concluída, Não planejada).
- **Notificações Inteligentes:** Sistema de notificações mapeia automaticamente status técnicos para labels humanizados.

### 🛠️ Melhorias Internas (Admin)
- **Normalização de Status:** Camada de serviço garante compatibilidade com registros legados.
- **Isolamento de Domínio:** Reforço na barreira de dados entre métricas de Admin (SLA/Analytics) e interface de Aluno.
- **Limpeza de Roadmaps:** Remoção de deploys parciais e planos obsoletos da v1.3.

### 🐞 Correções (Bugfixes)
- Ajustado bug onde o Hub do Aluno expunha o termo técnico `em_desenvolvimento` em notificações de sistema.
- Corrigido rótulo de acessibilidade "Carregando feedbacks" para "Carregando pedidos".
- Corrigida mensagem de sucesso ao enviar solicitação para alinhar com a nova nomenclatura.

### 🛡️ Governança Pós-Freeze - 2026-02-13
- **Decisão:** GO-MANTIDO (Freeze Aprovado).
- **Controle de Mudança:** Instituída política rigorosa contra deriva de escopo.
- **Operação:** Criado Checklist Semanal de Operação para triagem e integridade.
- **Semântica:** Formalizada a Política de Vocabulário de Produto (Aluno vs Admin).

---
*Release congelada. Nenhuma funcionalidade nova adicionada além do escopo de simplificação.*
