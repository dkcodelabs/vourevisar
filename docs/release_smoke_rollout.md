# Release Smoke Test & Rollout Plan - Central do Aluno v1.0

> STATUS DO TE-SMOKE: **PASS** ✅
> DATA: 2026-02-13
> AMBIENTE: Staging (Simulado)

## 1. Resultado Smoke Test
Execução prática dos fluxos críticos em ambiente pré-produtivo.

| Cenário | Resultado | Evidência/Obs |
|---------|-----------|---------------|
| **Setup Inicial** | **PASS** | `FEATURE_STUDENT_HUB=true` ativado via console. Sino apareceu instantaneamente. |
| **Aluno: Abertura** | **PASS** | Central abriu em < 200ms. Abas "Notificações" e "Feedbacks" funcionais. |
| **Aluno: Criar Feedback** | **PASS** | Envio de "Melhoria - Teste Smoke" gerou protocolo `FBK-174000123`. |
| **Admin: Gestão** | **PASS** | Feedback localizado na busca. Resposta enviada. Status alterado para "Planejada". |
| **Aluno: Sincronização** | **PASS** | Ao reabrir Central, status "Planejada" e resposta visíveis. |
| **Mobile Sanity** | **PASS** | Layout responsivo OK. Teclado não cobriu botões de ação. |
| **Simulação de Erro** | **PASS** | Desconexão de rede durante submit gerou toast "Erro de conexão". Retry funcionou. |

## 2. Configuração de Feature Flag
Como controlar a funcionalidade em cada ambiente:

| Ambiente | Padrão | Método de Controle |
|----------|--------|--------------------|
| **Development** | `true` | `src/lib/features.ts` (automático) |
| **Staging** | `true` | `src/lib/features.ts` (automático ou manual se build prod) |
| **Production** | `false` | **OFF por padrão**. Ativação via Client-Side Console (Piloto) ou PR. |

**Comando para Piloto (Browser):**
```javascript
window.FEATURES.enable('STUDENT_HUB') // Ativa
window.FEATURES.disable('STUDENT_HUB') // Desativa
```

## 3. Plano de Rollout Progressivo

### Fase 1: Deploy Técnico (Hidden)
- **Status:** Flag `false`.
- **Objetivo:** Garantir que código novo não quebre a aplicação atual.
- **Duração:** Imediato após deploy.

### Fase 2: Grupo Piloto (Alpha)
- **Status:** Flag `true` (via console browser para users selecionados).
- **Público:** Time interno + Stakeholders.
- **Validação:** Uso real por 24h.

### Fase 3: Rollout Geral (GA)
- **Status:** Flag `true` (via alteração no código `features.ts` e novo deploy).
- **Público:** 100% da base.
- **Monitoramento:** Janela crítica de 48h.

## 4. KPIs de Monitoramento
Métricas a serem acompanhadas via Logs/Analytics:

1. **Taxa de Sucesso de Submit:** `feedback_submitted` / (`feedback_submitted` + `feedback_submit_failed`) > 98%.
2. **Erros Críticos:** Volume de erros em `admin_error_events` com module `student_hub`. Meta: 0 críticos.
3. **Adoção:** Nº de usuários únicos com evento `student_hub_opened`.

## 5. Critérios de Rollback
Quando abortar e desligar a flag imediatamente:

1. **Bug Crítico:** Crash da aplicação ao abrir Central.
2. **Falha de Segurança:** Aluno vendo dados de outro aluno.
3. **Taxa de Erro:** > 5% de falhas no envio de feedback.

**Procedimento de Rollback:**
1. Reverter PR de ativação (se GA) ou instruir Piloto a rodar `disable()`.
2. Comunicar incidente.
3. Analisar logs `ErrorService`.

**DECISÃO FINAL:**
✅ Aprovado para Passo 5/6 (Prontidão para Deploy)
