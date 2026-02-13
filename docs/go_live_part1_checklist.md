# Checklist de Go-Live — Parte 1/3: Pré-Ativação Técnica

> STATUS: **PASS** ✅
> DATA: 2026-02-13
> AMBIENTE: Produção (Pré-Deploy)

## 1. Feature Flag Hardening
| Item | Resultado | Evidência |
|------|-----------|-----------|
| **Valor Default OFF** | **PASS** | `src/lib/features.ts`: `import.meta.env.DEV || false` garante false em build de produção. |
| **Override por Console**| **PASS** | `window.FEATURES.enable/disable` implementados e expostos. |
| **Leitura Centralizada**| **PASS** | `features.STUDENT_HUB` é usado consistentemente em todo o app. |

## 2. Gate de Exibição
| Item | Resultado | Evidência |
|------|-----------|-----------|
| **AppLayout (Sino)** | **PASS** | Renderização condicional `{features.STUDENT_HUB && ...}` confirmada. |
| **HubPanel (Drawer)** | **PASS** | Renderização condicional `{features.STUDENT_HUB && ...}` confirmada. |
| **Erro JS (Console)** | **PASS** | Nenhuma referência a `undefined` ou quebra de hook em análise estática. |

## 3. Rollback de Emergência
| Item | Resultado | Procedimento |
|------|-----------|--------------|
| **Desativação Imediata**| **PASS** | Executar no console do navegador de qualquer usuário admin/afetado: `window.FEATURES.disable('STUDENT_HUB')` |
| **Persistência** | **PASS** | Valor salvo em `localStorage` sobrepõe qualquer config de build. |

## 4. Arquivos Envolvidos
Nenhum arquivo de código-fonte foi alterado nesta etapa (lógica existente confirmada como segura).
- `src/lib/features.ts` (Validado)
- `src/components/AppLayout.tsx` (Validado)

## 5. Próximos Passos (Parte 2/3)
1. Realizar deploy da versão v1.0.0 em produção.
2. Executar ativação piloto manual (vide Parte 2).
