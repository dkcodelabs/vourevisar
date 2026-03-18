# SKILL: Asaas Integration (MCP)

Este manual define as diretrizes para utilizar as ferramentas fornecidas pelo servidor MCP do Asaas dentro deste projeto.

---

## 🚀 Visão Geral
O servidor MCP do Asaas permite que o assistente de IA interaja diretamente com a API do Asaas para automatizar fluxos financeiros.

**URL do Servidor:** `https://docs.asaas.com/mcp`

---

## 🛠️ Ferramentas Disponíveis
Ao ativar o servidor MCP do Asaas, o assistente pode:

1. **Gestão de Clientes (`customers`)**:
   - `listCustomers`: Listar clientes existentes.
   - `createCustomer`: Criar um novo cliente (obrigatório para cobranças).
   - `getCustomer`: Obter detalhes de um cliente específico.

2. **Cobranças e Assinaturas (`payments`, `subscriptions`)**:
   - `listSubscriptions`: Listar planos de assinatura ativos.
   - `createSubscription`: Iniciar uma nova assinatura recorrente.
   - `createPayment`: Criar uma cobrança única (Pix, Boleto, Cartão).

3. **Documentação**:
   - `getDocumentation`: Consultar detalhes técnicos sobre os endpoints.

---

## 🔐 Autenticação e Segurança
> [!IMPORTANT]
> Para executar chamadas de escrita (POST/PUT), é necessário fornecer o `access_token` do Asaas.

### Fluxo Recomendado:
1. O usuário fornece o token ou ele está configurado nas variáveis de ambiente.
2. O assistente utiliza o token via cabeçalhos de autorização se suportado pelo cliente MCP, ou solicita confirmação antes de ações críticas.
3. **Ambiente de Teste (Sandbox)**: Sempre verifique se o token é do ambiente de homologação (`sandbox.asaas.com`) ou produção (`www.asaas.com`).

---

## 📘 Exemplos de Uso no VouRevisar

### Cenário: Validar Assinatura do Usuário
- Se o Supabase indicar que um usuário não tem assinatura paga, o assistente pode consultar o Asaas pelo e-mail do usuário para verificar se há algum pagamento pendente ou processado recentemente.

### Cenário: Criar Link de Pagamento para Upgrade
- O assistente pode gerar uma cobrança e fornecer o código Pix ou o link do Boleto diretamente no chat.

---

## ⚠️ Regras de Ouro
1. **Nunca** exponha logs de API contendo tokens completos.
2. **Confirmação Obrigatória**: Sempre peça autorização do usuário antes de realizar cobranças reais.
3. **Sincronização**: Após uma alteração bem-sucedida no Asaas, lembre-se de atualizar os metadados correlacionados no Supabase (se necessário).
