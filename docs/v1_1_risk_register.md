# Registro de Riscos (v1.1)

> **DATA:** 13/02/2026
> **STATUS:** MONITORAMENTO ATIVO

## 1. Riscos Operacionais

| Risco | Probabilidade | Impacto | Mitigação | Status |
|-------|---------------|---------|-----------|--------|
| **Sobrecarga de Admin** | Média | Alto | Filtros avançados + Canned Responses. | Mitigado |
| **Spam de Feedbacks** | Média | Médio | Rate Limit (5/h) + Captcha (v1.2 se necessário). | Monitorar |
| **Abuso Verbal** | Baixa | Alto (Moral) | Termos de uso + Botão "Reportar Usuário" (Admin). | Aceito |

## 2. Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação | Status |
|-------|---------------|---------|-----------|--------|
| **Regressão Visual** | Média | Médio | Testes E2E (Cypress) + Snapshots. | Mitigado |
| **Custo Supabase** | Baixa | Baixo | Monitorar uso de Realtime e Storage. | Aceito |
| **Segurança (XSS)** | Baixa | Crítico | Sanitização server-side + CSP. | Mitigado |

## 3. Plano de Contingência
- **Se o Admin travar por volume:**
  - Ativar flag `DISABLE_NEW_FEEDBACKS` (existente).
  - Executar script de arquivamento em massa (SQL).
- **Se houver ataque XSS:**
  - Rollback imediato da versão.
  - Bloqueio de IPs suspeitos via Cloudflare/Supabase.
